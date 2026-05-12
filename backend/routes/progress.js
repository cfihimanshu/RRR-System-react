const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Case = require('../models/Case');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');

// Get progress logs for a case
router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) return res.status(400).json({ error: 'caseId is required' });

    let logs = await Progress.find({ caseId }).sort({ createdAt: -1 });

    // If no logs exist, create an initial one automatically
    if (logs.length === 0) {
      try {
        const targetCase = await Case.findOne({ caseId });
        if (targetCase) {
          await Progress.create({
            caseId,
            stage: targetCase.currentStatus || 'Case Logged',
            percentage: targetCase.progressPercentage || 0,
            summary: `Case Registered: ${targetCase.typeOfComplaint} setup complete.`,
            updatedBy: targetCase.initiatedBy || 'System',
            checklist: [
              { id: 1, label: 'Initial contact made', completed: false },
              { id: 2, label: 'Documents received ', completed: false },
              { id: 3, label: 'MOU draft prepared', completed: false },
              { id: 4, label: 'Signed MOU received', completed: false },
              { id: 5, label: 'Final settlement agreed', completed: false },
              { id: 6, label: 'Case closed', completed: false }
            ]
          });
          // Re-fetch to get the one with createdAt timestamp
          logs = await Progress.find({ caseId }).sort({ createdAt: -1 });
        }
      } catch (err) {
        console.error('Error auto-initializing progress:', err);
      }
    }

    const latestLog = logs[0];

    res.json({
      logs,
      checklist: latestLog ? latestLog.checklist : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new progress update
router.post('/', verifyToken, async (req, res) => {
  try {
    const { caseId, stage, percentage, summary, nextAction, blockers, followUpDate, escalateTo, updatedBy, checklist, refundedAmount, savedAmount, attachment } = req.body;

    const newLog = new Progress({
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
      attachment
    });

    await newLog.save();

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
      if (stage === 'Closure') {
        updateFields.currentStatus = 'Settled';
        updateFields.refundedAmount = refundedAmount;
        updateFields.savedAmount = savedAmount;
      } else {
        updateFields.currentStatus = stage;
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

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
