const express = require('express');
const History = require('../sql_models/History');
const Timeline = require('../sql_models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.caseId ? { caseId: req.query.caseId } : {};
    const docs = await History.findAll({
      where: query,
      order: [['timestamp', 'DESC']]
    });
    const formatted = docs.map(d => {
      const data = d.toJSON();
      data._id = data.id;
      return data;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const doc = await History.create(req.body);
    
    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: doc.eventDate,
      source: req.user.fullName || req.user.email || 'System',
      eventType: doc.histType,
      summary: doc.summary
    });

    const data = doc.toJSON();
    data._id = data.id;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
