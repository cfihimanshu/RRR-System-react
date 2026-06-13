const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');

const Progress = require('../sql_models/Progress');
const Case = require('../sql_models/Case');
const Timeline = require('../sql_models/Timeline');
const User = require('../sql_models/User');
const Document = require('../sql_models/Document');
const { createNotification } = require('../utils/notificationHelper');
const { sendEmail } = require('../utils/mailer');
const { verifyToken } = require('../middleware/auth');

// Helper to generate a unique ID for sub-items in JSON arrays
const generateId = () => Date.now().toString() + Math.random().toString(36).substring(7);

// Get progress logs for a case
router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) return res.status(400).json({ error: 'caseId is required' });

    let progressDocs = await Progress.findAll({ 
      where: { caseId }, 
      order: [['createdAt', 'DESC']] 
    });
    
    let progressDoc = progressDocs.length > 0 ? progressDocs[0] : null;

    if (!progressDoc) {
      try {
        const targetCase = await Case.findOne({ where: { caseId } });
        if (targetCase) {
          const initialLog = {
            _id: generateId(),
            stage: targetCase.currentStatus || 'Case Logged',
            percentage: targetCase.progressPercentage || 0,
            summary: `Case Registered: ${targetCase.typeOfComplaint} setup complete.`,
            nextAction: targetCase.nextActionPlanned || '',
            updatedBy: targetCase.initiatedBy || 'System',
            createdAt: new Date().toISOString()
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

    const timelineProgressEvents = await Timeline.findAll({
      where: { caseId, eventType: 'Progress Update' }
    });

    timelineProgressEvents.sort((a, b) => new Date(a.eventDate || a.createdAt) - new Date(b.eventDate || b.createdAt));

    for (const tEvent of timelineProgressEvents) {
      const metadata = tEvent.metadata || {};
      logs.push({
        _id: tEvent.id,
        stage: metadata.stage,
        percentage: metadata.percentage,
        summary: tEvent.details,
        nextAction: metadata.nextAction,
        blockers: metadata.blockers,
        followUpDate: metadata.followUpDate,
        escalateTo: metadata.escalateTo,
        attachment: metadata.attachment,
        updatedBy: tEvent.source,
        createdAt: tEvent.eventDate || tEvent.createdAt
      });
    }
    
    for (const doc of progressDocs) {
      let rawUpdates = doc.updates;
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
      if (updates.length > 0) {
        logs.push(...updates);
      } else if (doc.summary) {
        logs.push({
          _id: doc.id,
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
          createdAt: (doc.followUpDate ? new Date(doc.followUpDate).toISOString() : null) || doc.createdAt || doc.updatedAt || new Date()
        });
      }
    }

    const uniqueLogsMap = new Map();
    for (const log of logs) {
      if (!log.summary && !log.stage && !log.nextAction) continue; // Filter out empty timeline events
      
      const stageKey = log.stage || 'no-stage';
      const summaryText = log.summary ? log.summary.trim() : 'no-summary';
      const summaryKey = `${stageKey}-${summaryText}`;
      uniqueLogsMap.set(summaryKey, log);
    }
    
    logs = Array.from(uniqueLogsMap.values());
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const targetCase = await Case.findOne({ where: { caseId } });

    const enrichedLogs = await Promise.all(logs.map(async (log, idx) => {
      if (!log.nextAction) {
        const dateToUse = log.createdAt || log.uploadDate;
        if (dateToUse) {
          const dateObj = new Date(dateToUse);
          const start = new Date(dateObj.getTime() - 300000);
          const end = new Date(dateObj.getTime() + 300000);
          
          const timelineEvent = await Timeline.findOne({
            where: {
              caseId,
              createdAt: { [Op.between]: [start, end] }
            }
          });
          
          if (timelineEvent && timelineEvent.metadata) {
            log.nextAction = timelineEvent.metadata.nextAction || timelineEvent.metadata.recommendedNextSteps;
          }
        }
        
        if (!log.nextAction && targetCase) {
          if (idx === 0) {
            log.nextAction = targetCase.recommendedNextSteps;
          }
        }
      }
      return log;
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
    const { caseId, stage, percentage, summary, nextAction, blockers, followUpDate, escalateTo, updatedBy, checklist, refundedAmount, savedAmount, attachment, compliancePending } = req.body;

    const newLog = {
      _id: generateId(),
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
      createdAt: followUpDate ? new Date(followUpDate).toISOString() : new Date().toISOString()
    };

    let progressDoc = await Progress.findOne({ where: { caseId } });
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
      try {
        progressDoc = await Progress.create({
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
      } catch (err) {
        // Handle race conditions conceptually
        progressDoc = await Progress.findOne({ where: { caseId } });
        if (!progressDoc) throw err;
      }
    } else {
      let rawUpdates = progressDoc.updates;
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      let currentUpdates = Array.isArray(rawUpdates) ? rawUpdates : [];
      
      // Archive existing legacy root state if this is the first update
      if (currentUpdates.length === 0 && progressDoc.summary) {
        currentUpdates.push({
          _id: generateId(),
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
          createdAt: progressDoc.followUpDate ? new Date(progressDoc.followUpDate).toISOString() : (progressDoc.createdAt || progressDoc.updatedAt || new Date().toISOString())
        });
      }

      // Now apply new state to the root doc
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

      currentUpdates.push(newLog);
      progressDoc.updates = currentUpdates;
      await progressDoc.save();
    }

    if (attachment) {
      const existingCount = await Document.count({ where: { caseId } });
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

    const updateFields = { hasBeenWorkedOn: true };
    if (stage) {
      updateFields.currentStatus = stage;
      if (stage === 'Closure') {
        updateFields.refundedAmount = refundedAmount;
        updateFields.savedAmount = savedAmount;
        if (compliancePending !== undefined) {
          updateFields.compliancePending = compliancePending;
        }
      }

      // Notify Admin on key stage changes
      const notifyStages = ['Analysis', 'Negotiation', 'Closure'];
      const isComplianceDue = stage === 'Closure' && compliancePending === true;
      
      if (notifyStages.includes(stage) || isComplianceDue) {
        try {
          const targetCase = await Case.findOne({ where: { caseId } });
          const admins = await User.findAll({ where: { role: 'Admin' } });
          const adminEmails = admins.map(u => u.email).filter(Boolean).join(',');

          if (adminEmails && targetCase) {
            let stageLabel = stage;
            let bgColor = '#2563eb';
            let borderColor = '#1d4ed8';

            if (stage === 'Analysis') { bgColor = '#7c3aed'; borderColor = '#6d28d9'; }
            else if (stage === 'Negotiation') { bgColor = '#d97706'; borderColor = '#b45309'; }
            else if (stage === 'Closure' && compliancePending) { stageLabel = 'Closure (Compliance Due)'; bgColor = '#ea580c'; borderColor = '#c2410c'; }
            else if (stage === 'Closure') { bgColor = '#16a34a'; borderColor = '#15803d'; }

            const subject = `📋 Case Stage Updated: ${stageLabel} — ${caseId}`;
            const html = `
              <div style="font-family: sans-serif; padding: 24px; border: 2px solid ${borderColor}; border-radius: 12px; max-width: 600px;">
                <h2 style="color: ${bgColor}; margin-top: 0; font-size: 18px;">Case Progress Notification</h2>
                <p style="color: #374151;">Hello Admin,</p>
                <p style="color: #374151;">Case <strong>${caseId}</strong> has been updated to stage <strong style="color: ${bgColor};">${stageLabel}</strong> by <strong>${req.user.fullName || req.user.email}</strong>.</p>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 6px 0; color: #374151;"><strong>Company:</strong> ${targetCase.companyName || 'N/A'}</p>
                  <p style="margin: 6px 0; color: #374151;"><strong>Client:</strong> ${targetCase.clientName || 'N/A'}</p>
                  <p style="margin: 6px 0; color: #374151;"><strong>Stage:</strong> <span style="color: ${bgColor}; font-weight: bold;">${stageLabel}</span></p>
                  <p style="margin: 6px 0; color: #374151;"><strong>Summary:</strong> ${summary || 'N/A'}</p>
                  ${stage === 'Closure' ? `
                  <p style="margin: 6px 0; color: #374151;"><strong>Refunded Amount:</strong> ₹${refundedAmount || 0}</p>
                  <p style="margin: 6px 0; color: #374151;"><strong>Saved Amount:</strong> ₹${savedAmount || 0}</p>
                  ` : ''}
                  ${compliancePending ? `<p style="margin: 6px 0; color: #ea580c; font-weight: bold;">⚠️ Compliance Due — action required.</p>` : ''}
                </div>
                <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseId}" style="display: inline-block; background: ${bgColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Case</a>
              </div>
            `;
            sendEmail(adminEmails, subject, '', html).catch(console.error);
          }
        } catch (err) {
          console.error('Error sending stage notification email:', err);
        }
      }
    }
    if (percentage !== undefined) updateFields.progressPercentage = percentage;

    if (Object.keys(updateFields).length > 0) {
      await Case.update(updateFields, { where: { caseId } });
    }

    const timelineEvent = await Timeline.create({
      id: generateId(),
      caseId,
      eventDate: followUpDate ? new Date(followUpDate).toISOString() : new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Progress Update',
      summary: `Progress Updated: ${summary} (${stage || 'N/A'})`,
      details: summary,
      metadata: {
        stage, percentage, nextAction, blockers, followUpDate, escalateTo, attachment
      }
    });

    if (escalateTo) {
      try {
        const assignee = await User.findOne({
          where: { fullName: { [Op.like]: `%${escalateTo.trim()}%` } }
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

    const savedLog = Array.isArray(progressDoc.updates) ? progressDoc.updates[progressDoc.updates.length - 1] : newLog;
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
    const progressDoc = await Progress.findOne({ where: { caseId } });

    let rawUpdates = progressDoc ? progressDoc.updates : [];
    if (typeof rawUpdates === 'string') {
      try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
    }
    if (typeof rawUpdates === 'string') {
      try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
    }
    let updates = Array.isArray(rawUpdates) ? rawUpdates : [];
    const updateIndex = updates.findIndex(u => String(u._id) === String(logId));
    const { stage, percentage, summary, nextAction, blockers, followUpDate, escalateTo, refundedAmount, savedAmount, attachment, compliancePending } = req.body;

    if (updateIndex === -1) {
      // Fallback 1: Legacy root progress doc
      if (progressDoc && String(progressDoc.id) === String(logId)) {
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
        await progressDoc.save();
        return res.json({ message: 'Legacy progress updated', id: logId });
      }
      
      // Fallback 2: Timeline event only
      const timelineEvent = await Timeline.findOne({ where: { id: logId, caseId } });
      if (timelineEvent && timelineEvent.eventType === 'Progress Update') {
        if (summary !== undefined) {
          timelineEvent.summary = `Progress Updated: ${summary} (${stage || timelineEvent.metadata?.stage || 'N/A'})`;
          timelineEvent.details = summary;
        }
        timelineEvent.metadata = {
          ...(timelineEvent.metadata || {}),
          ...(stage !== undefined && { stage }),
          ...(percentage !== undefined && { percentage }),
          ...(nextAction !== undefined && { nextAction }),
          ...(blockers !== undefined && { blockers }),
          ...(followUpDate !== undefined && { followUpDate }),
          ...(escalateTo !== undefined && { escalateTo }),
          ...(attachment !== undefined && { attachment })
        };
        if (followUpDate) {
          timelineEvent.eventDate = new Date(followUpDate).toISOString();
        }
        await timelineEvent.save();
        return res.json({ message: 'Timeline progress updated', id: logId });
      }
      
      return res.status(404).json({ error: 'Progress log entry not found' });
    }

    const oldLog = updates[updateIndex];
    
    if (stage !== undefined) updates[updateIndex].stage = stage;
    if (percentage !== undefined) updates[updateIndex].percentage = percentage;
    if (summary !== undefined) updates[updateIndex].summary = summary;
    if (nextAction !== undefined) updates[updateIndex].nextAction = nextAction;
    if (blockers !== undefined) updates[updateIndex].blockers = blockers;
    if (followUpDate !== undefined) {
      updates[updateIndex].followUpDate = followUpDate;
      if (followUpDate) updates[updateIndex].createdAt = new Date(followUpDate).toISOString();
    }
    if (escalateTo !== undefined) updates[updateIndex].escalateTo = escalateTo;
    if (refundedAmount !== undefined) updates[updateIndex].refundedAmount = refundedAmount;
    if (savedAmount !== undefined) updates[updateIndex].savedAmount = savedAmount;
    if (attachment !== undefined) updates[updateIndex].attachment = attachment;
    
    const isLatest = updateIndex === updates.length - 1;
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

      const caseUpdateFields = {};
      if (stage !== undefined) {
        caseUpdateFields.currentStatus = stage;
        if (stage === 'Closure') {
          if (refundedAmount !== undefined) caseUpdateFields.refundedAmount = refundedAmount;
          if (savedAmount !== undefined) caseUpdateFields.savedAmount = savedAmount;
          if (compliancePending !== undefined) caseUpdateFields.compliancePending = compliancePending;
          
          
          // Notify Admin on Closure
          try {
            const targetCase = await Case.findOne({ where: { caseId } });
            const admins = await User.findAll({ where: { role: 'Admin' } });
            const adminEmails = admins.map(u => u.email).filter(Boolean).join(',');
            
            if (adminEmails && targetCase && targetCase.currentStatus !== 'Closure') {
              const subject = `✅ Case Closed: ${caseId}`;
              const html = `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #16a34a; border-radius: 10px; max-width: 600px;">
                  <h2 style="color: #16a34a; margin-top: 0;">Case Closure Notification</h2>
                  <p>Hello Admin,</p>
                  <p>Case <strong>${caseId}</strong> (${targetCase.companyName || 'N/A'}) has been marked as <strong>Closure</strong> by ${req.user.fullName || req.user.email}.</p>
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Summary:</strong> ${summary || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Refunded Amount:</strong> ₹${refundedAmount !== undefined ? refundedAmount : 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Saved Amount:</strong> ₹${savedAmount !== undefined ? savedAmount : 'N/A'}</p>
                  </div>
                  <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseId}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Case</a></p>
                </div>
              `;
              sendEmail(adminEmails, subject, '', html).catch(console.error);
            }
          } catch (err) {
            console.error('Error sending closure email:', err);
          }
        }
      }
      if (percentage !== undefined) caseUpdateFields.progressPercentage = percentage;
      if (escalateTo) caseUpdateFields.assignedTo = escalateTo;

      if (Object.keys(caseUpdateFields).length > 0) {
        await Case.update(caseUpdateFields, { where: { caseId } });
      }
    }

    progressDoc.updates = updates;
    await progressDoc.save();

    try {
      const timelineEvent = await Timeline.findOne({
        where: {
          caseId,
          eventType: 'Progress Update',
          summary: `Progress Updated: ${oldLog.summary} (${oldLog.stage || 'N/A'})`
        }
      });

      if (timelineEvent) {
        const updatedLog = updates[updateIndex];
        timelineEvent.summary = `Progress Updated: ${updatedLog.summary} (${updatedLog.stage || 'N/A'})`;
        timelineEvent.details = updatedLog.summary;
        timelineEvent.metadata = {
          ...(timelineEvent.metadata || {}),
          stage: updatedLog.stage,
          percentage: updatedLog.percentage,
          nextAction: updatedLog.nextAction,
          blockers: updatedLog.blockers,
          followUpDate: updatedLog.followUpDate,
          escalateTo: updatedLog.escalateTo,
          attachment: updatedLog.attachment
        };
        if (updatedLog.followUpDate) {
          timelineEvent.eventDate = new Date(updatedLog.followUpDate).toISOString();
        }
        await timelineEvent.save();
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on progress update:', timelineErr);
    }

    res.json(updates[updateIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
