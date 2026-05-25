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
    if (!['Admin', 'Reviewer', 'Accountant', 'Operations'].includes(req.user.role) && !req.query.caseId) {
      query.requestedBy = req.user.email;
    }

    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    // Bulk-mark overdue installments in root
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

    // Bulk-mark overdue installments in nested requests
    await Refund.updateMany(
      {
        ...query,
        'requests.installments': {
          $elemMatch: {
            status: { $nin: ['Paid', 'Due'] },
            dueDate: { $lt: todayStr, $exists: true, $ne: '' }
          }
        }
      },
      { $set: { 'requests.$[].installments.$[inst].status': 'Due' } },
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
      .lean();

    // Flatten nested requests arrays
    let flatDocs = [];
    docs.forEach(doc => {
      if (doc.requests && doc.requests.length > 0) {
        doc.requests.forEach((reqItem, index) => {
          flatDocs.push({
            ...doc,
            _id: `${doc._id}_req_${index}`,
            parentRefundId: doc._id,
            requestIndex: index,
            reqId: reqItem.reqId,
            amount: reqItem.amount,
            summary: reqItem.summary,
            bankName: reqItem.bankName,
            accHolder: reqItem.accHolder,
            ifsc: reqItem.ifsc,
            accNum: reqItem.accNum,
            branch: reqItem.branch,
            accType: reqItem.accType,
            requestedBy: reqItem.requestedBy,
            requestedByName: reqItem.requestedByName,
            documentLink: reqItem.documentLink,
            status: reqItem.status,
            reviewerRemark: reqItem.reviewerRemark,
            reviewedBy: reqItem.reviewedBy,
            approvedBy: reqItem.approvedBy,
            approvedAt: reqItem.approvedAt,
            transactionId: reqItem.transactionId,
            paymentDate: reqItem.paymentDate,
            paymentProof: reqItem.paymentProof,
            paidBy: reqItem.paidBy,
            installments: reqItem.installments,
            timestamp: reqItem.timestamp,
            requests: undefined
          });
        });
      } else {
        flatDocs.push(doc);
      }
    });

    if (req.query.status) {
      flatDocs = flatDocs.filter(d => d.status === req.query.status);
    }

    const caseIds = [...new Set(flatDocs.map(d => d.caseId).filter(Boolean))];
    const matchingCases = caseIds.length
      ? await Case.find({ caseId: { $in: caseIds } }, 'caseId companyName').lean()
      : [];
    const caseMap = {};
    matchingCases.forEach(c => {
      caseMap[c.caseId] = c.companyName;
    });

    const populatedDocs = flatDocs.map(doc => ({
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

    const existingRefund = await Refund.findOne({ caseId });

    const newReqItem = {
      reqId: req.body.reqId || `REQ-${Date.now()}`,
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
      documentLink,
      installments: Array.isArray(installments) ? installments.map(inst => ({
        amount: String(inst.amount),
        dueDate: inst.dueDate,
        status: inst.status || 'Pending'
      })) : [],
      status: "Pending Review",
      timestamp: new Date().toISOString()
    };

    let doc;
    if (existingRefund) {
      if (!existingRefund.requests || existingRefund.requests.length === 0) {
        existingRefund.requests = [{
          reqId: existingRefund.reqId || `REQ-LEGACY-${existingRefund._id}`,
          amount: existingRefund.amount,
          summary: existingRefund.summary,
          bankName: existingRefund.bankName,
          accHolder: existingRefund.accHolder,
          ifsc: existingRefund.ifsc,
          accNum: existingRefund.accNum,
          branch: existingRefund.branch,
          accType: existingRefund.accType,
          requestedBy: existingRefund.requestedBy,
          requestedByName: existingRefund.requestedByName,
          documentLink: existingRefund.documentLink,
          installments: existingRefund.installments,
          status: existingRefund.status,
          reviewerRemark: existingRefund.reviewerRemark,
          reviewedBy: existingRefund.reviewedBy,
          approvedBy: existingRefund.approvedBy,
          approvedAt: existingRefund.approvedAt,
          transactionId: existingRefund.transactionId,
          paymentDate: existingRefund.paymentDate,
          paymentProof: existingRefund.paymentProof,
          paidBy: existingRefund.paidBy,
          timestamp: existingRefund.timestamp || new Date().toISOString()
        }];
      }
      existingRefund.requests.push(newReqItem);
      
      // Update top-level root fields for backwards compatibility
      existingRefund.amount = String(amount);
      existingRefund.summary = summary;
      existingRefund.status = "Pending Review";
      existingRefund.timestamp = new Date().toISOString();
      existingRefund.installments = newReqItem.installments;
      existingRefund.requestedByName = newReqItem.requestedByName;
      existingRefund.requestedBy = newReqItem.requestedBy;
      existingRefund.documentLink = newReqItem.documentLink;
      existingRefund.bankName = bankName;
      existingRefund.accHolder = accHolder;
      existingRefund.ifsc = ifsc;
      existingRefund.accNum = accNum;
      existingRefund.branch = branch;
      existingRefund.accType = accType;

      await existingRefund.save();
      doc = existingRefund;
    } else {
      doc = new Refund({
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
        installments: newReqItem.installments,
        status: "Pending Review",
        lastStatusAtMs: Date.now(),
        timestamp: new Date().toISOString(),
        requests: [newReqItem]
      });
      await doc.save();
    }

    console.log("Refund Saved Successfully:", doc._id);

    try {
      await Case.findOneAndUpdate({ caseId: doc.caseId }, { refundStatus: 'Pending' });
      console.log(`Synced Case ${doc.caseId} refundStatus to Pending upon creation`);
    } catch (e) {
      console.error('Failed to sync case refundStatus on creation:', e);
    }

    try {
      const staffToNotify = ['Reviewer', 'Admin'];
      const users = await User.find({ role: { $in: staffToNotify } });
      const emails = users.map(u => u.email).join(',');
      if (emails) {
        sendEmail(emails, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${amount} has been submitted by ${req.user.email} and is pending review.`).catch(e => console.error('Refund Notification Error:', e));
        createNotification(staffToNotify, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${amount} has been submitted by ${newReqItem.requestedByName} and is pending review.`, 'Refund', `/case-master?search=${doc.caseId}`);
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

    await new Timeline({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Request',
      summary: `Submitted refund request for ₹${amount}`
    }).save();

    const matchingCase = await Case.findOne({ caseId: doc.caseId }, 'companyName');
    const responseObj = {
      ...doc.toObject(),
      _id: existingRefund ? `${doc._id}_req_${doc.requests.length - 1}` : `${doc._id}_req_0`,
      parentRefundId: doc._id,
      requestIndex: existingRefund ? doc.requests.length - 1 : 0,
      companyName: matchingCase ? matchingCase.companyName : '',
      requests: undefined
    };
    if (global.clearStatsCache) global.clearStatsCache();
    res.status(201).json(responseObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    let refundId = req.params.id;
    let requestIndex = null;
    if (refundId.includes('_req_')) {
      const parts = refundId.split('_req_');
      refundId = parts[0];
      requestIndex = parseInt(parts[1], 10);
    }

    const currentRefund = await Refund.findById(refundId);
    if (!currentRefund) return res.status(404).json({ error: "Refund not found" });

    let newStatus = req.body.status;
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    if (requestIndex !== null) {
      if (!currentRefund.requests || currentRefund.requests.length <= requestIndex) {
        return res.status(400).json({ error: "Invalid request index" });
      }
      
      const reqItem = currentRefund.requests[requestIndex];
      Object.assign(reqItem, req.body);
      if (newStatus) {
        reqItem.status = newStatus;
      }
      
      if (reqItem.installments && reqItem.installments.length > 0) {
        reqItem.installments.forEach(inst => {
          if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
            inst.status = 'Due';
          }
        });
      }

      if (requestIndex === currentRefund.requests.length - 1) {
        Object.assign(currentRefund, req.body);
        if (newStatus) {
          currentRefund.status = newStatus;
        }
        if (currentRefund.installments && currentRefund.installments.length > 0) {
          currentRefund.installments.forEach(inst => {
            if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
              inst.status = 'Due';
            }
          });
        }
      }
    } else {
      Object.assign(currentRefund, req.body);
      if (newStatus) {
        currentRefund.status = newStatus;
      }
      if (currentRefund.installments && currentRefund.installments.length > 0) {
        currentRefund.installments.forEach(inst => {
          if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
            inst.status = 'Due';
          }
        });
      }
    }

    currentRefund.lastStatusAtMs = Date.now();
    const doc = await currentRefund.save();

    try {
      const caseDoc = await Case.findOne({ caseId: doc.caseId });
      if (caseDoc) {
        let mappedRefundStatus = '';
        const reqList = doc.requests && doc.requests.length > 0 ? doc.requests : [doc];
        
        const hasPending = reqList.some(r => ['Pending Review', 'Pending Admin Approval', 'Pending Payment', 'Pending'].includes(r.status));
        const allPaid = reqList.every(r => {
          if (r.status === 'Paid') return true;
          if (r.installments && r.installments.length > 0) {
            return r.installments.every(inst => inst.status === 'Paid');
          }
          return r.transactionId && r.paymentDate;
        });

        if (hasPending) {
          mappedRefundStatus = 'Pending';
        } else if (allPaid) {
          mappedRefundStatus = 'Paid';
        }

        caseDoc.refundStatus = mappedRefundStatus;
        await caseDoc.save();
        console.log(`Synced Case ${doc.caseId} refundStatus to: ${mappedRefundStatus}`);
      }
    } catch (caseErr) {
      console.error(`Failed to sync refundStatus to Case: ${caseErr.message}`);
    }

    const activeReq = requestIndex !== null ? doc.requests[requestIndex] : doc;
    try {
      if (activeReq.status === 'Pending Admin Approval') {
        const admins = await User.find({ role: 'Admin' });
        const emails = admins.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `Refund Approval Required: ${doc.caseId}`, `Reviewer has approved a refund for ₹${activeReq.amount}. Final Admin approval is pending.`).catch(e => console.error('Refund Admin Alert Error:', e));
          createNotification('Admin', 'Refund Approval Required', `Reviewer has approved a refund for ₹${activeReq.amount} on case ${doc.caseId}.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (activeReq.status === 'Pending Payment') {
        const accountants = await User.find({ role: 'Accountant' });
        const emails = accountants.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `New Payment Task: ${doc.caseId}`, `Admin has approved a refund for ₹${activeReq.amount}. Please process the payment.`).catch(e => console.error('Refund Payment Alert Error:', e));
          createNotification('Accountant', 'New Payment Task', `Admin approved a refund for ₹${activeReq.amount} on case ${doc.caseId}. Please process payment.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (activeReq.status === 'Paid' || activeReq.status === 'Rejected') {
        let emailBody = `Your refund request for ₹${activeReq.amount} has been ${activeReq.status}.`;
        if (activeReq.status === 'Rejected' && activeReq.reviewerRemark) {
          emailBody += `\nReason for Rejection: ${activeReq.reviewerRemark}`;
        } else if (activeReq.remark) {
          emailBody += `\nRemark: ${activeReq.remark}`;
        }
        sendEmail(activeReq.requestedBy || doc.requestedBy, `Refund Request Update: ${doc.caseId}`, emailBody).catch(e => console.error('Refund Requester Alert Error:', e));

        let notifBody = `Your refund request for ₹${activeReq.amount} on case ${doc.caseId} has been ${activeReq.status}.`;
        if (activeReq.status === 'Rejected' && activeReq.reviewerRemark) {
          notifBody += ` Reason: ${activeReq.reviewerRemark}`;
        }
        createNotification(activeReq.requestedBy || doc.requestedBy, `Refund ${activeReq.status}`, notifBody, 'Refund', `/case-master?search=${doc.caseId}`);
      }
    } catch (e) { console.error('Refund Update Notification Error:', e); }
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Updated',
      description: `Refund status updated to ${activeReq.status} for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    await new Timeline({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Update',
      summary: `Refund status updated to ${activeReq.status}`
    }).save();

    const matchingCase = await Case.findOne({ caseId: doc.caseId }, 'companyName');
    const responseObj = {
      ...doc.toObject(),
      _id: requestIndex !== null ? `${doc._id}_req_${requestIndex}` : doc._id,
      parentRefundId: doc._id,
      requestIndex: requestIndex,
      reqId: activeReq.reqId,
      amount: activeReq.amount,
      summary: activeReq.summary,
      bankName: activeReq.bankName,
      accHolder: activeReq.accHolder,
      ifsc: activeReq.ifsc,
      accNum: activeReq.accNum,
      branch: activeReq.branch,
      accType: activeReq.accType,
      requestedBy: activeReq.requestedBy,
      requestedByName: activeReq.requestedByName,
      documentLink: activeReq.documentLink,
      status: activeReq.status,
      reviewerRemark: activeReq.reviewerRemark,
      reviewedBy: activeReq.reviewedBy,
      approvedBy: activeReq.approvedBy,
      approvedAt: activeReq.approvedAt,
      transactionId: activeReq.transactionId,
      paymentDate: activeReq.paymentDate,
      paymentProof: activeReq.paymentProof,
      paidBy: activeReq.paidBy,
      installments: activeReq.installments,
      timestamp: activeReq.timestamp,
      companyName: matchingCase ? matchingCase.companyName : '',
      requests: undefined
    };
    if (global.clearStatsCache) global.clearStatsCache();
    res.json(responseObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
