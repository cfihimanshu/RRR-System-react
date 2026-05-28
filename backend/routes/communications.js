const express = require('express');
const Communication = require('../models/Communication');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    
    // Security: Non-admins only see what they logged when fetching all, 
    // but if fetching for a specific case, show all communications.
    if (req.user.role !== 'Admin' && !req.query.caseId) {
      const myIds = [req.user.fullName, req.user.email].filter(Boolean);
      query.loggedBy = { $in: myIds };
    }

    const docs = await Communication.find(query).sort({ dateTime: -1 }).lean();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const existingCount = await Communication.countDocuments({ caseId: req.body.caseId });
    const commId = `COM-${req.body.mode || 'NA'}-${req.body.caseId}-${String(existingCount + 1).padStart(3, '0')}`;
    const doc = new Communication({ ...req.body, commId });
    await doc.save();
    
    const timeline = new Timeline({
        id: Date.now().toString(),
        caseId: doc.caseId,
        eventDate: doc.dateTime,
        source: req.user.fullName || req.user.email || 'System',
        eventType: doc.mode,
        summary: doc.summary,
        details: `${doc.mode} ${doc.direction} with ${doc.fromTo}. Summary: ${doc.summary}`,
        metadata: {
          direction: doc.direction,
          fromTo: doc.fromTo,
          exactDemand: doc.exactDemand,
          legalThreat: doc.legalThreat,
          smMentioned: doc.smMentioned
        }
    });
    await timeline.save();

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { id } = req.params;
    const oldComm = await Communication.findById(id);
    if (!oldComm) {
      return res.status(404).json({ error: 'Communication log not found' });
    }

    const updatedComm = await Communication.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    // Sync Timeline entry
    try {
      const timelineEvent = await Timeline.findOne({
        caseId: oldComm.caseId,
        eventType: oldComm.mode,
        summary: oldComm.summary
      });
      if (timelineEvent) {
        timelineEvent.eventType = updatedComm.mode;
        timelineEvent.summary = updatedComm.summary;
        timelineEvent.eventDate = updatedComm.dateTime;
        timelineEvent.details = `${updatedComm.mode} ${updatedComm.direction} with ${updatedComm.fromTo || 'Client'}. Summary: ${updatedComm.summary}`;
        timelineEvent.metadata = {
          ...timelineEvent.metadata,
          direction: updatedComm.direction,
          fromTo: updatedComm.fromTo,
          exactDemand: updatedComm.exactDemand,
          legalThreat: updatedComm.legalThreat,
          smMentioned: updatedComm.smMentioned
        };
        await timelineEvent.save();
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on communication update:', timelineErr);
    }

    res.json(updatedComm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
