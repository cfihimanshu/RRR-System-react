const express = require('express');
const History = require('../models/History');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.caseId ? { caseId: req.query.caseId } : {};
    const docs = await History.find(query).sort({ timestamp: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const doc = new History(req.body);
    await doc.save();
    
    const timeline = new Timeline({
        id: Date.now().toString(),
        caseId: doc.caseId,
        eventDate: doc.eventDate,
        source: req.user.fullName || req.user.email || 'System',
        eventType: doc.histType,
        summary: doc.summary
    });
    await timeline.save();

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
