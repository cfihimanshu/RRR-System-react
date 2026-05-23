const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Case = require('../models/Case');
const Timeline = require('../models/Timeline');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');
const { verifyToken } = require('../middleware/auth');

// Get progress logs for a case
router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) return res.status(400).json({ error: 'caseId is required' });

    let progressDoc = await Progress.findOne({ caseId });

    // If no logs exist, create an initial one automatically
    if (!progressDoc) {
      try {
        const targetCase = await Case.findOne({ caseId });
        if (targetCase) {
          const initialLog = {
            stage: targetCase.currentStatus || 'Case Logged',
            percentage: targetCase.progressPercentage || 0,
            summary: `Case Registered: ${targetCase.typeOfComplaint} setup complete.`,
            nextAction: targetCase.nextActionPlanned || '',
            updatedBy: targetCase.initiatedBy || 'System'
          };
          progressDoc = await Progress.create({
            caseId,
            ...initialLog,
            checklist: [
              { id: 1, label: 'Initial contact made', completed: false },
              { id: 2, label: 'Documents received ', completed: false },
              { id: 3, label: 'MOU draft prepared', completed: false },
              { id: 4, label: 'Signed MOU received', completed: false },
              { id: 5, label: 'Final settlement agreed', completed: false },
              { id: 6, label: 'Case closed', completed: false }
            ],
            updates: [initialLog]
          });
        }
      } catch (err) {
        console.error('Error auto-initializing progress:', err);
      }
    }

    const logs = progressDoc ? (progressDoc.updates || []) : [];
    // Sort updates by createdAt descending
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const targetCase = await Case.findOne({ caseId }).lean();

    // Enrich logs with nextAction from Timeline if missing (for older logs)
    const enrichedLogs = await Promise.all(logs.map(async (log, idx) => {
      const logObj = log.toObject ? log.toObject() : log;
      if (!logObj.nextAction) {
        // Try to find matching timeline event with a larger window (5 mins)
        const timelineEvent = await Timeline.findOne({
          caseId: caseId,
          $or: [
            { 'metadata.nextAction': { $exists: true, $ne: '' } },
            { 'metadata.recommendedNextSteps': { $exists: true, $ne: '' } }
          ],
          createdAt: { 
            $gte: new Date(new Date(log.createdAt).getTime() - 300000), 
            $lte: new Date(new Date(log.createdAt).getTime() + 300000) 
          }
        }).lean();
        
        if (timelineEvent && timelineEvent.metadata) {
          logObj.nextAction = timelineEvent.metadata.nextAction || timelineEvent.metadata.recommendedNextSteps;
        }
        
        // Fallback for latest log or initial logs
        if (!logObj.nextAction && targetCase) {
          if (idx === 0) {
            logObj.nextAction = targetCase.recommendedNextSteps;
          }
        }
      }
      return logObj;
    }));

    res.json({
      logs: enrichedLogs,
      checklist: progressDoc ? progressDoc.checklist : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new progress update
router.post('/', verifyToken, async (req, res) => {
  try {
    const { caseId, stage, percentage, summary, nextAction, blockers, followUpDate, escalateTo, updatedBy, checklist, refundedAmount, savedAmount, attachment } = req.body;

    const newLog = {
      stage,
      percentage,
      summary,
      nextAction,
      blockers,
      followUpDate,
      escalateTo,
      updatedBy,
      refundedAmount,
      savedAmount,
      attachment,
      createdAt: new Date()
    };

    let progressDoc = await Progress.findOne({ caseId });
    if (progressDoc && stage) {
      const stages = ['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'];
      const currentStage = progressDoc.stage || 'Case Logged';
      const currentIndex = stages.indexOf(currentStage);
      const newIndex = stages.indexOf(stage);

      if (newIndex >= 0 && currentIndex >= 0 && newIndex < currentIndex) {
        return res.status(400).json({ error: `Cannot downgrade case stage from '${currentStage}' to '${stage}'` });
      }
    }

    if (!progressDoc) {
      progressDoc = new Progress({
        caseId,
        stage,
        percentage,
        summary,
        nextAction,
        blockers,
        followUpDate,
        escalateTo,
        updatedBy,
        checklist,
        refundedAmount,
        savedAmount,
        attachment,
        updates: [newLog]
      });
    } else {
      progressDoc.stage = stage || progressDoc.stage;
      progressDoc.percentage = percentage !== undefined ? percentage : progressDoc.percentage;
      progressDoc.summary = summary || progressDoc.summary;
      progressDoc.nextAction = nextAction || progressDoc.nextAction;
      progressDoc.blockers = blockers || progressDoc.blockers;
      progressDoc.followUpDate = followUpDate || progressDoc.followUpDate;
      progressDoc.escalateTo = escalateTo || progressDoc.escalateTo;
      progressDoc.refundedAmount = refundedAmount !== undefined ? refundedAmount : progressDoc.refundedAmount;
      progressDoc.savedAmount = savedAmount !== undefined ? savedAmount : progressDoc.savedAmount;
      progressDoc.attachment = attachment || progressDoc.attachment;
      progressDoc.updatedBy = updatedBy || progressDoc.updatedBy;
      if (checklist) {
        progressDoc.checklist = checklist;
      }
      progressDoc.updates.push(newLog);
    }

    await progressDoc.save();

    // Create Document record if attachment is provided
    if (attachment) {
      const Document = require('../models/Document');
      const existingCount = await Document.countDocuments({ caseId });
      const docId = `DOC-${caseId}-${String(existingCount + 1).padStart(3, '0')}`;
      await Document.create({
        caseId,
        docId,
        uploadDate: new Date().toISOString(),
        sourceForm: 'Progress Update',
        docType: 'Progress Update Attachment',
        fileLink: attachment,
        uploadedBy: updatedBy || 'System'
      });
    }

    // Update the Case status and percentage if provided
    const updateFields = {};
    if (stage) {
      updateFields.currentStatus = stage;
      if (stage === 'Closure') {
        updateFields.refundedAmount = refundedAmount;
        updateFields.savedAmount = savedAmount;
      }
    }
    if (percentage !== undefined) updateFields.progressPercentage = percentage;

    if (Object.keys(updateFields).length > 0) {
      await Case.findOneAndUpdate({ caseId }, updateFields);
    }

    // Add to Timeline
    const timelineEvent = new Timeline({
      caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Progress Update',
      summary: `Progress Updated: ${summary} (${stage || 'N/A'})`,
      details: summary,
      metadata: {
        stage,
        percentage,
        nextAction,
        blockers,
        followUpDate,
        escalateTo,
        attachment
      }
    });
    await timelineEvent.save();

    // Trigger Notification if case was forwarded
    if (escalateTo) {
      try {
        const assignee = await User.findOne({
          fullName: { $regex: new RegExp(`^\\s*${escalateTo.trim()}\\s*$`, 'i') }
        });
        if (assignee && assignee.email) {
          createNotification(
            assignee.email, 
            'Case Forwarded', 
            `Case ${caseId} has been forwarded to you during a Progress Update by ${req.user.fullName || 'System'}.`, 
            'Assignment', 
            `/case-master?search=${caseId}`
          );
        }
      } catch (err) {
        console.error('Failed to notify assignee on progress update:', err);
      }
    }

    const savedLog = progressDoc.updates[progressDoc.updates.length - 1];
    res.status(201).json(savedLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
