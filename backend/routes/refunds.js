const express = require('express');
const Refund = require('../models/Refund');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const Timeline = require('../models/Timeline');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const { createNotification } = require('../utils/notificationHelper');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    if (req.query.status) query.status = req.query.status;

    if (!['Admin', 'Reviewer', 'Accountant'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }

    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    // Bulk-mark overdue installments (one query instead of N saves per request)
    await Refund.updateMany(
      {
        ...query,
        installments: {
          $elemMatch: {
            status: { $nin: ['Paid', 'Due'] },
            dueDate: { $lt: todayStr, $exists: true, $ne: '' }
          }
        }
      },
      { $set: { 'installments.$[inst].status': 'Due' } },
      {
        arrayFilters: [
          {
            'inst.status': { $nin: ['Paid', 'Due'] },
            'inst.dueDate': { $lt: todayStr, $exists: true, $ne: '' }
          }
        ]
      }
    );

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const docs = await Refund.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('reqId caseId amount requestedBy requestedByName summary status installments timestamp paymentDate transactionId reviewerRemark')
      .lean();

    const caseIds = [...new Set(docs.map(d => d.caseId).filter(Boolean))];
    const matchingCases = caseIds.length
      ? await Case.find({ caseId: { $in: caseIds } }, 'caseId companyName').lean()
      : [];
    const caseMap = {};
    matchingCases.forEach(c => {
      caseMap[c.caseId] = c.companyName;
    });

    const populatedDocs = docs.map(doc => ({
      ...doc,
      companyName: caseMap[doc.caseId] || ''
    }));

    res.set('Cache-Control', 'private, max-age=30');
    res.json(populatedDocs);
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
      installments,
      documentLink
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
      documentLink,
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

    // Sync Case refundStatus to 'Pending' in MongoDB on creation of refund request
    try {
      await Case.findOneAndUpdate({ caseId: doc.caseId }, { refundStatus: 'Pending' });
      console.log(`Synced Case ${doc.caseId} refundStatus to Pending upon creation`);
    } catch (e) {
      console.error('Failed to sync case refundStatus on creation:', e);
    }

    // Notify Reviewers and Admins
    try {
      const staffToNotify = ['Reviewer', 'Admin'];
      const users = await User.find({ role: { $in: staffToNotify } });
      const emails = users.map(u => u.email).join(',');
      if (emails) {
        sendEmail(emails, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${doc.amount} has been submitted by ${doc.requestedBy} and is pending review.`).catch(e => console.error('Refund Notification Error:', e));
        
        // Add Notification
        createNotification(staffToNotify, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${doc.amount} has been submitted by ${doc.requestedByName} and is pending review.`, 'Refund', `/case-master?search=${doc.caseId}`);
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

    // Add to Timeline
    await new Timeline({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Request',
      summary: `Submitted refund request for ₹${doc.amount}`
    }).save();

    const matchingCase = await Case.findOne({ caseId: doc.caseId }, 'companyName');
    const docObj = doc.toObject();
    docObj.companyName = matchingCase ? matchingCase.companyName : '';
    res.status(201).json(docObj);
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

    Object.assign(currentRefund, req.body);
    if (newStatus) {
      currentRefund.status = newStatus;
    }
    
    // Auto-update any installments whose due date has passed and are not paid
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];
    if (currentRefund.installments && currentRefund.installments.length > 0) {
      currentRefund.installments.forEach(inst => {
        if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
          inst.status = 'Due';
        }
      });
    }

    currentRefund.lastStatusAtMs = Date.now();
    const doc = await currentRefund.save();

    // Dynamically sync refundStatus to the Case document in MongoDB!
    try {
      const caseDoc = await Case.findOne({ caseId: doc.caseId });
      if (caseDoc) {
        let mappedRefundStatus = 'Pending';
        if (doc.status === 'Paid') {
          mappedRefundStatus = 'Paid';
        } else if (doc.status === 'Rejected') {
          mappedRefundStatus = '';
        } else {
          // If there are installments, check if all are paid
          if (doc.installments && doc.installments.length > 0) {
            const allPaid = doc.installments.every(inst => inst.status === 'Paid');
            if (allPaid) {
              mappedRefundStatus = 'Paid';
            }
          } else {
            // Single payment payout check: if they supplied transaction UTR and payment date
            if (doc.transactionId && doc.paymentDate) {
              mappedRefundStatus = 'Paid';
            }
          }
        }

        caseDoc.refundStatus = mappedRefundStatus;
        await caseDoc.save();
        console.log(`Synced Case ${doc.caseId} refundStatus to: ${mappedRefundStatus}`);
      }
    } catch (caseErr) {
      console.error(`Failed to sync refundStatus to Case: ${caseErr.message}`);
    }

    // Workflow Notifications
    try {
      if (doc.status === 'Pending Admin Approval') {
        const admins = await User.find({ role: 'Admin' });
        const emails = admins.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `Refund Approval Required: ${doc.caseId}`, `Reviewer has approved a refund for ₹${doc.amount}. Final Admin approval is pending.`).catch(e => console.error('Refund Admin Alert Error:', e));
          createNotification('Admin', 'Refund Approval Required', `Reviewer has approved a refund for ₹${doc.amount} on case ${doc.caseId}.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (doc.status === 'Pending Payment') {
        const accountants = await User.find({ role: 'Accountant' });
        const emails = accountants.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `New Payment Task: ${doc.caseId}`, `Admin has approved a refund for ₹${doc.amount}. Please process the payment.`).catch(e => console.error('Refund Payment Alert Error:', e));
          createNotification('Accountant', 'New Payment Task', `Admin approved a refund for ₹${doc.amount} on case ${doc.caseId}. Please process payment.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (doc.status === 'Paid' || doc.status === 'Rejected') {
        let emailBody = `Your refund request for ₹${doc.amount} has been ${doc.status}.`;
        if (doc.status === 'Rejected' && doc.reviewerRemark) {
          emailBody += `\nReason for Rejection: ${doc.reviewerRemark}`;
        } else if (doc.remark) {
          emailBody += `\nRemark: ${doc.remark}`;
        }
        sendEmail(doc.requestedBy, `Refund Request Update: ${doc.caseId}`, emailBody).catch(e => console.error('Refund Requester Alert Error:', e));

        let notifBody = `Your refund request for ₹${doc.amount} on case ${doc.caseId} has been ${doc.status}.`;
        if (doc.status === 'Rejected' && doc.reviewerRemark) {
          notifBody += ` Reason: ${doc.reviewerRemark}`;
        }
        createNotification(doc.requestedBy, `Refund ${doc.status}`, notifBody, 'Refund', `/case-master?search=${doc.caseId}`);
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

    // Add to Timeline
    await new Timeline({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Update',
      summary: `Refund status updated to ${doc.status}`
    }).save();

    const matchingCase = await Case.findOne({ caseId: doc.caseId }, 'companyName');
    const docObj = doc.toObject();
    docObj.companyName = matchingCase ? matchingCase.companyName : '';
    res.json(docObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
