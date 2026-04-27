const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const docs = await AuditLog.find().sort({ timestamp: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
