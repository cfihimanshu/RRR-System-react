const express = require('express');
const LegalRequest = require('../sql_models/LegalRequest');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Create new legal request
router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    payload.requestedBy = req.user.email;
    payload.requestedByName = req.user.fullName || req.user.name || "";
    payload.status = 'Pending';

    const reqDoc = await LegalRequest.create(payload);

    const data = reqDoc.toJSON();
    data._id = data.id;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get legal requests
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }
    const list = await LegalRequest.findAll({
      where: query,
      order: [['createdAt', 'DESC']]
    });
    const formatted = list.map(l => {
      const data = l.toJSON();
      data._id = data.id;
      return data;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update legal request status (Approve/Reject)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    const { status, rejectRemark } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const reqDoc = await LegalRequest.findByPk(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ error: 'Legal request not found' });
    }
    
    const updateData = { status };
    if (rejectRemark !== undefined) {
      updateData.rejectRemark = rejectRemark;
    }
    await reqDoc.update(updateData);

    const data = reqDoc.toJSON();
    data._id = data.id;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
