const express = require('express');
const LeaveRequest = require('../sql_models/LeaveRequest');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Create new leave request
router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    payload.requestedBy = req.user.email;
    payload.requestedByName = req.user.fullName || req.user.name || "";
    payload.reqId = 'LEAVE_' + Date.now();
    payload.timestamp = new Date().toISOString();
    payload.status = 'Pending Review';

    const leave = await LeaveRequest.create(payload);

    const data = leave.toJSON();
    data._id = data.id;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leave requests
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }
    const list = await LeaveRequest.findAll({
      where: query,
      order: [['timestamp', 'DESC']]
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

// Update leave request status (Approve/Reject)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending Review'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    await leave.update({ status });

    const data = leave.toJSON();
    data._id = data.id;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
