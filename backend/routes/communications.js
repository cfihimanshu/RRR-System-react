const express = require('express');
const Communication = require('../models/Communication');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    
    // Security: Non-admins only see what they logged OR what is in their assigned cases
    if (req.user.role !== 'Admin') {
      const myIds = [req.user.fullName, req.user.email].filter(Boolean);
      query.loggedBy = { $in: myIds };
    }

    const docs = await Communication.find(query).sort({ dateTime: -1 });
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

module.exports = router;
