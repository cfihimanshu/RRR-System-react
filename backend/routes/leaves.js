const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
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

    const leave = new LeaveRequest(payload);
    await leave.save();

    res.status(201).json(leave);
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
    const list = await LeaveRequest.find(query).sort({ timestamp: -1 });
    res.json(list);
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

    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
