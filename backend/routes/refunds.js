const express = require('express');
const { Op } = require('sequelize');
const Refund = require('../sql_models/Refund');
const Case = require('../sql_models/Case');
const AuditLog = require('../sql_models/AuditLog');
const Timeline = require('../sql_models/Timeline');
const User = require('../sql_models/User');
const Progress = require('../sql_models/Progress');
const { sendEmail } = require('../utils/mailer');
const { createNotification } = require('../utils/notificationHelper');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant', 'Operations', 'Operation Review', 'Operation Head', 'Legal', 'Advocate', 'Operation Admin', 'operation admin'].includes(req.user.role) && !req.query.caseId) {
      query.requestedBy = req.user.email;
    }

    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const docs = await Refund.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    let flatDocs = [];
    for (const d of docs) {
      const doc = d.toJSON();
      let changedDb = false;

      // Check and update overdue installments in root
      let parsedInstallments = doc.installments;
      if (typeof parsedInstallments === 'string') {
        try { parsedInstallments = JSON.parse(parsedInstallments); } catch (e) { parsedInstallments = []; }
      }
      let installments = Array.isArray(parsedInstallments) ? parsedInstallments : [];
      installments.forEach(inst => {
        if (inst.status !== 'Paid' && inst.status !== 'Due' && inst.dueDate && inst.dueDate < todayStr) {
          inst.status = 'Due';
          changedDb = true;
        }
      });
      if (changedDb) d.installments = installments;

      // Check and update overdue installments in requests
      let parsedRequests = doc.requests;
      if (typeof parsedRequests === 'string') {
        try { parsedRequests = JSON.parse(parsedRequests); } catch (e) { parsedRequests = []; }
      }
      let requests = Array.isArray(parsedRequests) ? parsedRequests : [];
      requests.forEach(reqItem => {
        let reqInsts = Array.isArray(reqItem.installments) ? reqItem.installments : [];
        reqInsts.forEach(inst => {
          if (inst.status !== 'Paid' && inst.status !== 'Due' && inst.dueDate && inst.dueDate < todayStr) {
            inst.status = 'Due';
            changedDb = true;
          }
        });
        reqItem.installments = reqInsts;
      });
      if (changedDb) d.requests = requests;

      if (changedDb) {
        d.changed('installments', true);
        d.changed('requests', true);
        await d.save();
        // Update local doc for flat mapping
        doc.installments = d.installments;
        doc.requests = d.requests;
      }

      let finalRequests = doc.requests;
      if (typeof finalRequests === 'string') {
        try { finalRequests = JSON.parse(finalRequests); } catch (e) { finalRequests = []; }
      }
      if (finalRequests && Array.isArray(finalRequests) && finalRequests.length > 0) {
        finalRequests.forEach((reqItem, index) => {
          flatDocs.push({
            ...doc,
            _id: `${doc.id}_req_${index}`,
            parentRefundId: doc.id,
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
            bdaName: reqItem.bdaName || doc.bdaName || '',
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
        doc._id = doc.id;
        flatDocs.push(doc);
      }
    }

    if (req.query.status) {
      flatDocs = flatDocs.filter(d => d.status === req.query.status);
    }

    const caseIds = [...new Set(flatDocs.map(d => d.caseId).filter(Boolean))];
    const matchingCases = caseIds.length
      ? await Case.findAll({ where: { caseId: { [Op.in]: caseIds } }, attributes: ['caseId', 'companyName'] })
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

router.post('/', verifyToken, roleGuard(['Admin', 'Operations', 'Staff', 'Operation Review', 'Operation Head', 'Operation Admin', 'operation admin']), async (req, res) => {
  try {
    const { 
      caseId, amount, summary, bankName, accHolder, ifsc, 
      accNum, branch, accType, requestedByName, installments, documentLink, bdaName
    } = req.body;

    const existingRefund = await Refund.findOne({ where: { caseId } });

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
      bdaName: bdaName || "",
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
      let currentRequests = Array.isArray(existingRefund.requests) ? existingRefund.requests : [];
      if (currentRequests.length === 0) {
        currentRequests = [{
          reqId: existingRefund.reqId || `REQ-LEGACY-${existingRefund.id}`,
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
          bdaName: existingRefund.bdaName || "",
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
      currentRequests.push(newReqItem);
      
      existingRefund.requests = currentRequests;
      existingRefund.amount = String(amount);
      existingRefund.summary = summary;
      existingRefund.status = "Pending Review";
      existingRefund.timestamp = new Date().toISOString();
      existingRefund.installments = newReqItem.installments;
      existingRefund.requestedByName = newReqItem.requestedByName;
      existingRefund.requestedBy = newReqItem.requestedBy;
      existingRefund.bdaName = newReqItem.bdaName;
      existingRefund.documentLink = newReqItem.documentLink;
      existingRefund.bankName = bankName;
      existingRefund.accHolder = accHolder;
      existingRefund.ifsc = ifsc;
      existingRefund.accNum = accNum;
      existingRefund.branch = branch;
      existingRefund.accType = accType;

      existingRefund.changed('requests', true);
      existingRefund.changed('installments', true);
      await existingRefund.save();
      doc = existingRefund;
    } else {
      doc = await Refund.create({
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
        bdaName: bdaName || "",
        installments: newReqItem.installments,
        status: "Pending Review",
        lastStatusAtMs: Date.now(),
        timestamp: new Date().toISOString(),
        requests: [newReqItem]
      });
    }

    try {
      const caseDoc = await Case.findOne({ where: { caseId: doc.caseId } });
      if (caseDoc) {
        const existingProgress = await Progress.findOne({ where: { caseId: doc.caseId } });
        let reqListRaw = doc.requests;
        if (typeof reqListRaw === 'string') {
          try { reqListRaw = JSON.parse(reqListRaw); } catch (e) { reqListRaw = []; }
        }
        const reqList = Array.isArray(reqListRaw) && reqListRaw.length > 0 ? reqListRaw : [doc];

        let totalPaidAmount = 0;
        reqList.forEach(r => {
          if (r.status?.toLowerCase() === 'paid') {
            totalPaidAmount += Number(r.amount) || 0;
          } else if (Array.isArray(r.installments) && r.installments.length > 0) {
            r.installments.forEach(inst => {
              if (inst.status?.toLowerCase() === 'paid') {
                totalPaidAmount += Number(inst.amount) || 0;
              }
            });
          }
        });

        let mappedRefundStatus = 'Pending';
        const hasPending = reqList.some(r => {
          const s = r.status?.toLowerCase() || '';
          return ['pending review', 'pending admin approval', 'pending payment', 'pending'].includes(s);
        });
        const allPaid = reqList.every(r => {
          const s = r.status?.toLowerCase() || '';
          if (s === 'paid') return true;
          if (Array.isArray(r.installments) && r.installments.length > 0) {
            return r.installments.every(inst => inst.status?.toLowerCase() === 'paid');
          }
          return r.transactionId && r.paymentDate;
        });

        if (hasPending) mappedRefundStatus = 'Pending';
        else if (allPaid) mappedRefundStatus = 'Paid';

        caseDoc.refundStatus = mappedRefundStatus;

        if (mappedRefundStatus === 'Paid') {
          caseDoc.refundedAmount = totalPaidAmount;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - totalPaidAmount);
        } else {
          caseDoc.refundedAmount = existingProgress ? (existingProgress.refundedAmount || 0) : 0;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - caseDoc.refundedAmount);
        }

        doc.refundedAmount = caseDoc.refundedAmount;
        doc.savedAmount = caseDoc.savedAmount;
        await doc.save();
        await caseDoc.save();
      }
    } catch (e) {
      console.error('Error syncing case/refund on creation:', e);
    }

    try {
      const staffToNotify = ['Reviewer', 'Admin'];
      const users = await User.findAll({ where: { role: { [Op.in]: staffToNotify } } });
      const emails = users.map(u => u.email).join(',');
      if (emails) {
        sendEmail(emails, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${amount} has been submitted by ${req.user.email} and is pending review.`).catch(e => console.error(e));
        createNotification(staffToNotify, `New Refund Request: ${doc.caseId}`, `A new refund request for ₹${amount} has been submitted by ${newReqItem.requestedByName} and is pending review.`, 'Refund', `/case-master?search=${doc.caseId}`);
      }
    } catch (e) {}
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Submitted',
      description: `Submitted refund request for case ${doc.caseId}. Sent to Reviewer.`,
      caseId: doc.caseId
    });

    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Request',
      summary: `Submitted refund request for ₹${amount}`
    });

    const matchingCase = await Case.findOne({ where: { caseId: doc.caseId }, attributes: ['companyName'] });
    const responseObj = {
      ...doc.toJSON(),
      _id: existingRefund ? `${doc.id}_req_${doc.requests.length - 1}` : `${doc.id}_req_0`,
      parentRefundId: doc.id,
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

    const currentRefund = await Refund.findByPk(refundId);
    if (!currentRefund) return res.status(404).json({ error: "Refund not found" });

    let newStatus = req.body.status;
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    if (requestIndex !== null) {
      let parsedRequests = currentRefund.requests;
      if (typeof parsedRequests === 'string') {
        try { parsedRequests = JSON.parse(parsedRequests); } catch (e) { parsedRequests = []; }
      }
      let requests = Array.isArray(parsedRequests) ? parsedRequests : [];
      if (requests.length <= requestIndex) {
        return res.status(400).json({ error: "Invalid request index" });
      }
      
      const reqItem = requests[requestIndex];
      Object.assign(reqItem, req.body);
      if (newStatus) reqItem.status = newStatus;
      
      if (Array.isArray(reqItem.installments) && reqItem.installments.length > 0) {
        reqItem.installments.forEach(inst => {
          if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
            inst.status = 'Due';
          }
        });
      }

      if (requestIndex === requests.length - 1) {
        Object.assign(currentRefund, req.body);
        if (newStatus) currentRefund.status = newStatus;
        if (Array.isArray(currentRefund.installments) && currentRefund.installments.length > 0) {
          currentRefund.installments.forEach(inst => {
            if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
              inst.status = 'Due';
            }
          });
        }
      }
      currentRefund.requests = requests;
      currentRefund.changed('requests', true);
      currentRefund.changed('installments', true);
    } else {
      Object.assign(currentRefund, req.body);
      if (newStatus) currentRefund.status = newStatus;
      if (Array.isArray(currentRefund.installments) && currentRefund.installments.length > 0) {
        currentRefund.installments.forEach(inst => {
          if (inst.status !== 'Paid' && inst.dueDate && inst.dueDate < todayStr) {
            inst.status = 'Due';
          }
        });
      }
      currentRefund.changed('installments', true);
    }

    currentRefund.lastStatusAtMs = Date.now();
    const doc = await currentRefund.save();

    try {
      const caseDoc = await Case.findOne({ where: { caseId: doc.caseId } });
      if (caseDoc) {
        let mappedRefundStatus = '';
        
        let reqListRaw = doc.requests;
        if (typeof reqListRaw === 'string') {
          try { reqListRaw = JSON.parse(reqListRaw); } catch (e) { reqListRaw = []; }
        }
        const reqList = Array.isArray(reqListRaw) && reqListRaw.length > 0 ? reqListRaw : [doc];
        
        const hasPending = reqList.some(r => {
          const s = r.status?.toLowerCase() || '';
          return ['pending review', 'pending admin approval', 'pending payment', 'pending'].includes(s);
        });
        const allPaid = reqList.every(r => {
          const s = r.status?.toLowerCase() || '';
          if (s === 'paid') return true;
          if (Array.isArray(r.installments) && r.installments.length > 0) {
            return r.installments.every(inst => inst.status?.toLowerCase() === 'paid');
          }
          return r.transactionId && r.paymentDate;
        });

        if (hasPending) mappedRefundStatus = 'Pending';
        else if (allPaid) mappedRefundStatus = 'Paid';

        caseDoc.refundStatus = mappedRefundStatus;

        let totalPaidAmount = 0;
        reqList.forEach(r => {
          if (r.status?.toLowerCase() === 'paid') {
            totalPaidAmount += Number(r.amount) || 0;
          } else if (Array.isArray(r.installments) && r.installments.length > 0) {
            r.installments.forEach(inst => {
              if (inst.status?.toLowerCase() === 'paid') {
                totalPaidAmount += Number(inst.amount) || 0;
              }
            });
          }
        });

        const existingProgress = await Progress.findOne({ where: { caseId: doc.caseId } });

        if (mappedRefundStatus === 'Paid') {
          caseDoc.refundedAmount = totalPaidAmount;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - totalPaidAmount);
        } else {
          caseDoc.refundedAmount = existingProgress ? (existingProgress.refundedAmount || 0) : 0;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - caseDoc.refundedAmount);
        }

        doc.refundedAmount = caseDoc.refundedAmount;
        doc.savedAmount = caseDoc.savedAmount;
        await doc.save();

        await caseDoc.save();

        // Sync with progresses table
        try {
          if (existingProgress) {
            existingProgress.refundedAmount = caseDoc.refundedAmount;
            existingProgress.savedAmount = caseDoc.savedAmount;
            
            let rawUpdates = existingProgress.updates;
            if (typeof rawUpdates === 'string') {
              try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
            }
            if (typeof rawUpdates === 'string') {
              try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
            }
            const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
            if (updates.length > 0) {
              const latestIndex = updates.length - 1;
              updates[latestIndex].refundedAmount = caseDoc.refundedAmount;
              updates[latestIndex].savedAmount = caseDoc.savedAmount;
              existingProgress.updates = updates;
            }
            await existingProgress.save();
          }
        } catch (progressErr) {
          console.error('Failed to sync progress on refund update:', progressErr);
        }
      }
    } catch (caseErr) {}

    const activeReq = requestIndex !== null ? doc.requests[requestIndex] : doc;
    try {
      if (activeReq.status === 'Pending Admin Approval') {
        const admins = await User.findAll({ where: { role: 'Admin' } });
        const emails = admins.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `Refund Approval Required: ${doc.caseId}`, `Reviewer has approved a refund for ₹${activeReq.amount}. Final Admin approval is pending.`).catch(e => console.error(e));
          createNotification('Admin', 'Refund Approval Required', `Reviewer has approved a refund for ₹${activeReq.amount} on case ${doc.caseId}.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (activeReq.status === 'Pending Payment') {
        const accountants = await User.findAll({ where: { role: 'Accountant' } });
        const emails = accountants.map(u => u.email).join(',');
        if (emails) {
          sendEmail(emails, `New Payment Task: ${doc.caseId}`, `Admin has approved a refund for ₹${activeReq.amount}. Please process the payment.`).catch(e => console.error(e));
          createNotification('Accountant', 'New Payment Task', `Admin approved a refund for ₹${activeReq.amount} on case ${doc.caseId}. Please process payment.`, 'Refund', `/case-master?search=${doc.caseId}`);
        }
      } else if (activeReq.status === 'Paid' || activeReq.status === 'Rejected') {
        let emailBody = `Your refund request for ₹${activeReq.amount} has been ${activeReq.status}.`;
        if (activeReq.status === 'Rejected' && activeReq.reviewerRemark) {
          emailBody += `\\nReason for Rejection: ${activeReq.reviewerRemark}`;
        }
        sendEmail(activeReq.requestedBy || doc.requestedBy, `Refund Request Update: ${doc.caseId}`, emailBody).catch(e => console.error(e));

        let notifBody = `Your refund request for ₹${activeReq.amount} on case ${doc.caseId} has been ${activeReq.status}.`;
        createNotification(activeReq.requestedBy || doc.requestedBy, `Refund ${activeReq.status}`, notifBody, 'Refund', `/case-master?search=${doc.caseId}`);
      }
    } catch (e) {}
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Updated',
      description: `Refund status updated to ${activeReq.status} for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Update',
      summary: `Refund status updated to ${activeReq.status}`
    });

    const matchingCase = await Case.findOne({ where: { caseId: doc.caseId }, attributes: ['companyName'] });
    const responseObj = {
      ...doc.toJSON(),
      _id: requestIndex !== null ? `${doc.id}_req_${requestIndex}` : doc.id,
      parentRefundId: doc.id,
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

router.delete('/:id', verifyToken, roleGuard(['Admin', 'Super Admin', 'SuperAdmin']), async (req, res) => {
  try {
    let refundId = req.params.id;
    let requestIndex = null;
    if (refundId.includes('_req_')) {
      const parts = refundId.split('_req_');
      refundId = parts[0];
      requestIndex = parseInt(parts[1], 10);
    }

    const doc = await Refund.findByPk(refundId);
    if (!doc) {
      return res.status(404).json({ error: "Refund not found" });
    }

    let deletedAmount = doc.amount;
    let parsedRequestsDelete = doc.requests;
    if (typeof parsedRequestsDelete === 'string') {
      try { parsedRequestsDelete = JSON.parse(parsedRequestsDelete); } catch (e) { parsedRequestsDelete = []; }
    }
    let requests = Array.isArray(parsedRequestsDelete) ? parsedRequestsDelete : [];
    if (requestIndex !== null && requests[requestIndex]) {
      deletedAmount = requests[requestIndex].amount;
    }

    if (requestIndex !== null) {
      if (requests.length > requestIndex) {
        requests.splice(requestIndex, 1);
        
        if (requests.length === 0) {
          await doc.destroy();
        } else {
          const lastReq = requests[requests.length - 1];
          doc.amount = lastReq.amount;
          doc.summary = lastReq.summary;
          doc.status = lastReq.status;
          doc.timestamp = lastReq.timestamp;
          doc.installments = lastReq.installments;
          doc.requestedByName = lastReq.requestedByName;
          doc.requestedBy = lastReq.requestedBy;
          doc.documentLink = lastReq.documentLink;
          doc.bankName = lastReq.bankName;
          doc.accHolder = lastReq.accHolder;
          doc.ifsc = lastReq.ifsc;
          doc.accNum = lastReq.accNum;
          doc.branch = lastReq.branch;
          doc.accType = lastReq.accType;
          doc.requests = requests;
          doc.changed('requests', true);
          doc.changed('installments', true);
          await doc.save();
        }
      } else {
        return res.status(400).json({ error: "Invalid request index" });
      }
    } else {
      await doc.destroy();
    }

    const remaining = await Refund.findOne({ where: { caseId: doc.caseId } });
    const caseDoc = await Case.findOne({ where: { caseId: doc.caseId } });
    if (caseDoc) {
      if (!remaining) {
        caseDoc.refundStatus = '';
        caseDoc.refundedAmount = 0;
      } else {
        let mappedRefundStatus = '';
        let remReqListRaw = remaining.requests;
        if (typeof remReqListRaw === 'string') {
          try { remReqListRaw = JSON.parse(remReqListRaw); } catch (e) { remReqListRaw = []; }
        }
        const reqList = Array.isArray(remReqListRaw) && remReqListRaw.length > 0 ? remReqListRaw : [remaining];
        
        const hasPending = reqList.some(r => {
          const s = r.status?.toLowerCase() || '';
          return ['pending review', 'pending admin approval', 'pending payment', 'pending'].includes(s);
        });
        const allPaid = reqList.every(r => {
          const s = r.status?.toLowerCase() || '';
          if (s === 'paid') return true;
          if (Array.isArray(r.installments) && r.installments.length > 0) {
            return r.installments.every(inst => inst.status?.toLowerCase() === 'paid');
          }
          return r.transactionId && r.paymentDate;
        });

        if (hasPending) mappedRefundStatus = 'Pending';
        else if (allPaid) mappedRefundStatus = 'Paid';
        caseDoc.refundStatus = mappedRefundStatus;

        let totalPaidAmount = 0;
        reqList.forEach(r => {
          if (r.status?.toLowerCase() === 'paid') {
            totalPaidAmount += Number(r.amount) || 0;
          } else if (Array.isArray(r.installments) && r.installments.length > 0) {
            r.installments.forEach(inst => {
              if (inst.status?.toLowerCase() === 'paid') {
                totalPaidAmount += Number(inst.amount) || 0;
              }
            });
          }
        });

        const existingProgress = await Progress.findOne({ where: { caseId: doc.caseId } });

        if (mappedRefundStatus === 'Paid') {
          caseDoc.refundedAmount = totalPaidAmount;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - totalPaidAmount);
        } else {
          caseDoc.refundedAmount = existingProgress ? (existingProgress.refundedAmount || 0) : 0;
          caseDoc.savedAmount = Math.max(0, (caseDoc.totalAmtPaid || 0) - caseDoc.refundedAmount);
        }

        if (remaining) {
          remaining.refundedAmount = caseDoc.refundedAmount;
          remaining.savedAmount = caseDoc.savedAmount;
          await remaining.save();
        }
      }
      await caseDoc.save();

      // Sync with progresses table
      try {
        if (existingProgress) {
          existingProgress.refundedAmount = caseDoc.refundedAmount;
          existingProgress.savedAmount = caseDoc.savedAmount;
          
          let rawUpdates = existingProgress.updates;
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
          }
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
          }
          const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
          if (updates.length > 0) {
            const latestIndex = updates.length - 1;
            updates[latestIndex].refundedAmount = caseDoc.refundedAmount;
            updates[latestIndex].savedAmount = caseDoc.savedAmount;
            existingProgress.updates = updates;
          }
          await existingProgress.save();
        }
      } catch (progressErr) {
        console.error('Failed to sync progress on refund delete:', progressErr);
      }
    }

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Refund Deleted',
      description: `Deleted refund request for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Refund Deleted',
      summary: `Deleted refund request of ₹${Number(deletedAmount || 0).toLocaleString('en-IN')} for Case ${doc.caseId}`
    });

    if (global.clearStatsCache) global.clearStatsCache();
    res.json({ success: true, message: "Refund deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
