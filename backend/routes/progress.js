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

    let progressDocs = await Progress.find({ caseId }).sort({ createdAt: -1 });
    let progressDoc = progressDocs.length > 0 ? progressDocs[0] : null;

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
          progressDocs = [progressDoc];
        }
      } catch (err) {
        console.error('Error auto-initializing progress:', err);
      }
    }

    let logs = [];
    
    // Combine ALL documents (both legacy top-level and new updates arrays)
    for (const doc of progressDocs) {
      if (doc.updates && doc.updates.length > 0) {
        logs.push(...doc.updates);
      } 
      
      // Also add top-level legacy fields if summary exists
      if (doc.summary) {
        logs.push({
          _id: doc._id,
          stage: doc.stage,
          percentage: doc.percentage,
          summary: doc.summary,
          nextAction: doc.nextAction,
          blockers: doc.blockers,
          followUpDate: doc.followUpDate,
          escalateTo: doc.escalateTo,
          refundedAmount: doc.refundedAmount,
          savedAmount: doc.savedAmount,
          attachment: doc.attachment,
          updatedBy: doc.updatedBy,
          createdAt: doc.createdAt || doc.updatedAt || new Date()
        });
      }
    }

    // Deduplicate logs based on time (down to the minute) and summary text
    const uniqueLogsMap = new Map();
    for (const log of logs) {
      const logObj = log.toObject ? log.toObject() : log;
      const dateToUse = logObj.createdAt || logObj.uploadDate;
      const timeStr = dateToUse ? new Date(dateToUse).toISOString().substring(0, 16) : 'unknown-time';
      const summaryPrefix = logObj.summary ? logObj.summary.trim().substring(0, 30) : '';
      const key = `${timeStr}-${summaryPrefix}`;
      
      if (!uniqueLogsMap.has(key)) {
        uniqueLogsMap.set(key, logObj);
      }
    }
    
    logs = Array.from(uniqueLogsMap.values());

    // Sort updates by createdAt descending
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const targetCase = await Case.findOne({ caseId }).lean();

    // Enrich logs with nextAction from Timeline if missing (for older logs)
    const enrichedLogs = await Promise.all(logs.map(async (log, idx) => {
      const logObj = log.toObject ? log.toObject() : log;
      if (!logObj.nextAction) {
        // Try to find matching timeline event with a larger window (5 mins)
        const dateToUse = log.createdAt || log.uploadDate;
        if (dateToUse) {
          const timelineEvent = await Timeline.findOne({
            caseId: caseId,
            $or: [
              { 'metadata.nextAction': { $exists: true, $ne: '' } },
              { 'metadata.recommendedNextSteps': { $exists: true, $ne: '' } }
            ],
            createdAt: { 
              $gte: new Date(new Date(dateToUse).getTime() - 300000), 
              $lte: new Date(new Date(dateToUse).getTime() + 300000) 
            }
          }).lean();
          
          if (timelineEvent && timelineEvent.metadata) {
            logObj.nextAction = timelineEvent.metadata.nextAction || timelineEvent.metadata.recommendedNextSteps;
          }
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

    let progressDoc = await Progress.findOne({ caseId }).sort({ createdAt: -1 });
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

      if (!progressDoc.updates || progressDoc.updates.length === 0) {
        if (progressDoc.summary) {
          progressDoc.updates = [{
            stage: progressDoc.stage,
            percentage: progressDoc.percentage,
            summary: progressDoc.summary,
            nextAction: progressDoc.nextAction,
            blockers: progressDoc.blockers,
            followUpDate: progressDoc.followUpDate,
            escalateTo: progressDoc.escalateTo,
            refundedAmount: progressDoc.refundedAmount,
            savedAmount: progressDoc.savedAmount,
            attachment: progressDoc.attachment,
            updatedBy: progressDoc.updatedBy,
            createdAt: progressDoc.createdAt || progressDoc.updatedAt || new Date()
          }];
        } else {
          progressDoc.updates = [];
        }
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

    if (global.clearStatsCache) global.clearStatsCache();
    const savedLog = progressDoc.updates[progressDoc.updates.length - 1];
    res.status(201).json(savedLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:caseId/update/:logId', verifyToken, async (req, res) => {
  try {
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { caseId, logId } = req.params;
    const progressDoc = await Progress.findOne({ caseId });
    if (!progressDoc) {
      return res.status(404).json({ error: 'Progress document not found' });
    }

    // Find the specific update inside updates array
    const updateIndex = progressDoc.updates.findIndex(u => u._id.toString() === logId);
    if (updateIndex === -1) {
      return res.status(404).json({ error: 'Progress log entry not found' });
    }

    const oldLog = progressDoc.updates[updateIndex];

    // Update fields
    const { stage, percentage, summary, nextAction, blockers, followUpDate, escalateTo, refundedAmount, savedAmount, attachment } = req.body;
    
    if (stage !== undefined) progressDoc.updates[updateIndex].stage = stage;
    if (percentage !== undefined) progressDoc.updates[updateIndex].percentage = percentage;
    if (summary !== undefined) progressDoc.updates[updateIndex].summary = summary;
    if (nextAction !== undefined) progressDoc.updates[updateIndex].nextAction = nextAction;
    if (blockers !== undefined) progressDoc.updates[updateIndex].blockers = blockers;
    if (followUpDate !== undefined) progressDoc.updates[updateIndex].followUpDate = followUpDate;
    if (escalateTo !== undefined) progressDoc.updates[updateIndex].escalateTo = escalateTo;
    if (refundedAmount !== undefined) progressDoc.updates[updateIndex].refundedAmount = refundedAmount;
    if (savedAmount !== undefined) progressDoc.updates[updateIndex].savedAmount = savedAmount;
    if (attachment !== undefined) progressDoc.updates[updateIndex].attachment = attachment;
    
    // If we are editing the latest update, we should also update the top-level progressDoc fields and the Case document
    const isLatest = updateIndex === progressDoc.updates.length - 1;
    if (isLatest) {
      if (stage !== undefined) progressDoc.stage = stage;
      if (percentage !== undefined) progressDoc.percentage = percentage;
      if (summary !== undefined) progressDoc.summary = summary;
      if (nextAction !== undefined) progressDoc.nextAction = nextAction;
      if (blockers !== undefined) progressDoc.blockers = blockers;
      if (followUpDate !== undefined) progressDoc.followUpDate = followUpDate;
      if (escalateTo !== undefined) progressDoc.escalateTo = escalateTo;
      if (refundedAmount !== undefined) progressDoc.refundedAmount = refundedAmount;
      if (savedAmount !== undefined) progressDoc.savedAmount = savedAmount;
      if (attachment !== undefined) progressDoc.attachment = attachment;

      // Update case
      const caseUpdateFields = {};
      if (stage !== undefined) {
        caseUpdateFields.currentStatus = stage;
        if (stage === 'Closure') {
          if (refundedAmount !== undefined) caseUpdateFields.refundedAmount = refundedAmount;
          if (savedAmount !== undefined) caseUpdateFields.savedAmount = savedAmount;
        }
      }
      if (percentage !== undefined) caseUpdateFields.progressPercentage = percentage;
      if (escalateTo) caseUpdateFields.assignedTo = escalateTo;

      if (Object.keys(caseUpdateFields).length > 0) {
        await Case.findOneAndUpdate({ caseId }, caseUpdateFields);
      }
    }

    await progressDoc.save();

    // Sync timeline event
    try {
      const timelineEvent = await Timeline.findOne({
        caseId,
        eventType: 'Progress Update',
        summary: `Progress Updated: ${oldLog.summary} (${oldLog.stage || 'N/A'})`
      });

      if (timelineEvent) {
        const updatedLog = progressDoc.updates[updateIndex];
        timelineEvent.summary = `Progress Updated: ${updatedLog.summary} (${updatedLog.stage || 'N/A'})`;
        timelineEvent.details = updatedLog.summary;
        timelineEvent.metadata = {
          ...timelineEvent.metadata,
          stage: updatedLog.stage,
          percentage: updatedLog.percentage,
          nextAction: updatedLog.nextAction,
          blockers: updatedLog.blockers,
          followUpDate: updatedLog.followUpDate,
          escalateTo: updatedLog.escalateTo,
          attachment: updatedLog.attachment
        };
        await timelineEvent.save();
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on progress update:', timelineErr);
    }

    if (global.clearStatsCache) global.clearStatsCache();

    res.json(progressDoc.updates[updateIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
