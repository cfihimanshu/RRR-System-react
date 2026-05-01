const express = require('express');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    if (req.query.status) query.status = req.query.status;
    
    // Privacy Logic: Only Admins, Reviewers, and Accountants see all.
    // Others only see their own requested refunds.
    if (!['Admin', 'Reviewer', 'Accountant'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }

    const docs = await Refund.find(query).sort({ timestamp: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, roleGuard(['Admin', 'Operations', 'Staff']), async (req, res) => {
  console.log("Incoming Refund Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { 
      caseId, 
      amount, 
      summary, 
      bankName, 
      accHolder, 
      ifsc, 
      accNum, 
      branch, 
      accType, 
      requestedByName, 
      installments 
    } = req.body;

    const doc = new Refund({
      caseId,
      amount: String(amount),
      summary,
      bankName,
      accHolder,
      ifsc,
      accNum,
      branch,
      accType,
      requestedBy: req.user.email,
      requestedByName: requestedByName || req.user.fullName || "",
      installments: Array.isArray(installments) ? installments.map(inst => ({
        amount: String(inst.amount),
        dueDate: inst.dueDate,
        status: inst.status || 'Pending'
      })) : [],
      status: "Pending Review",
      lastStatusAtMs: Date.now(),
      timestamp: new Date().toISOString()
    });

    await doc.save();
    console.log("Refund Saved Successfully:", doc._id);

    // Notify Reviewers and Admins
    try {
      const staffToNotify = await User.find({ role: { $in: ['Reviewer', 'Admin'] } });
      const emails = staffToNotify.map(u => u.email).join(',');
      if (emails) {
        sendEmail(emails, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${doc.amount} has been submitted by ${doc.requestedBy} and is pending review.`).catch(e => console.error('Refund Notification Error:', e));
      }
    } catch (e) { console.error('Refund Notification Error:', e); }
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Submitted',
      description: `Submitted refund request for case ${doc.caseId}. Sent to Reviewer.`,
      caseId: doc.caseId
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const currentRefund = await Refund.findById(req.params.id);
    if (!currentRefund) return res.status(404).json({ error: "Refund not found" });

    let newStatus = req.body.status;
    
    // Workflow Security: You can add role-based enforcement here if needed.
    // For now, we trust the explicit status from the authorized consoles.

    const doc = await Refund.findByIdAndUpdate(req.params.id, {
      ...req.body,
      status: newStatus,
      lastStatusAtMs: Date.now()
    }, { new: true });

    // Workflow Notifications
    try {
      if (doc.status === 'Pending Admin Approval') {
        const admins = await User.find({ role: 'Admin' });
        const emails = admins.map(u => u.email).join(',');
        if (emails) sendEmail(emails, `Refund Approval Required: ${doc.caseId}`, `Reviewer has approved a refund for ₹${doc.amount}. Final Admin approval is pending.`).catch(e => console.error('Refund Admin Alert Error:', e));
      } else if (doc.status === 'Pending Payment') {
        const accountants = await User.find({ role: 'Accountant' });
        const emails = accountants.map(u => u.email).join(',');
        if (emails) sendEmail(emails, `New Payment Task: ${doc.caseId}`, `Admin has approved a refund for ₹${doc.amount}. Please process the payment.`).catch(e => console.error('Refund Payment Alert Error:', e));
      } else if (doc.status === 'Paid' || doc.status === 'Rejected') {
        sendEmail(doc.requestedBy, `Refund Request Update: ${doc.caseId}`, `Your refund request for ₹${doc.amount} has been ${doc.status}. ${doc.remark ? `\nRemark: ${doc.remark}` : ''}`).catch(e => console.error('Refund Requester Alert Error:', e));
      }
    } catch (e) { console.error('Refund Update Notification Error:', e); }
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Updated',
      description: `Refund status updated to ${doc.status} for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
