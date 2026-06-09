const express = require('express');
const AuditLog = require('../sql_models/AuditLog');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const total = await AuditLog.count();
    const docs = await AuditLog.findAll({
      order: [['timestamp', 'DESC']],
      offset: skip,
      limit: limit
    });

    const formatted = docs.map(d => {
      const data = d.toJSON();
      data._id = data.id;
      return data;
    });

    res.json({
      logs: formatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
