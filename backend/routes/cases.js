const express = require('express');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Case = require('../sql_models/Case');
const AuditLog = require('../sql_models/AuditLog');
const Timeline = require('../sql_models/Timeline');
const Task = require('../sql_models/Task');
const Communication = require('../sql_models/Communication');
const Action = require('../sql_models/Action');
const Refund = require('../sql_models/Refund');
const Document = require('../sql_models/Document');
const History = require('../sql_models/History');
const Progress = require('../sql_models/Progress');
const User = require('../sql_models/User');

const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { createNotification } = require('../utils/notificationHelper');
const { sendEmail } = require('../utils/mailer');

async function sendAssignmentEmail(assignedTo, caseIdsArray, assignerName) {
  if (!assignedTo || !assignedTo.trim() || !caseIdsArray || caseIdsArray.length === 0) return;
  try {
    const assigneeUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: assignedTo },
          { fullName: assignedTo }
        ]
      }
    });

    let emails = [];
    let assigneeName = 'Team Member';
    
    if (assigneeUser && assigneeUser.email) {
      emails.push(assigneeUser.email);
      assigneeName = assigneeUser.fullName || 'Team Member';
    }

    // Always notify Operation Head and Operation Review about the assignment
    const managementUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['Operation Head', 'Operation Review'] }
      }
    });

    managementUsers.forEach(u => {
      if (u.email && !emails.includes(u.email)) {
        emails.push(u.email);
      }
    });

    if (emails.length > 0) {
      const subject = caseIdsArray.length === 1 
        ? `🔔 New Case Assigned: ${caseIdsArray[0]} to ${assigneeName}` 
        : `🔔 ${caseIdsArray.length} New Cases Assigned to ${assigneeName}`;
      const caseListHtml = caseIdsArray.map(id => `<li><strong>${id}</strong></li>`).join('');
      const html = `
        <div style="font-family: sans-serif; padding: 24px; border: 2px solid #10b981; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #059669; margin-top: 0; font-size: 18px;">New Case Assignment</h2>
          <p style="color: #374151;">Hello Team,</p>
          <p style="color: #374151;"><strong>${assignerName}</strong> has assigned the following case(s) to <strong>${assigneeName}</strong> for review and action:</p>
          <ul style="color: #374151;">
            ${caseListHtml}
          </ul>
          <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
            <p style="color: #b91c1c; margin: 0; font-weight: bold;">🚨 URGENT ACTION REQUIRED</p>
            <p style="color: #991b1b; margin: 4px 0 0 0;">Work on this case must be initiated within <strong>30 minutes</strong> of this assignment.</p>
          </div>
          <p style="color: #374151;">Please login to the system to check the <strong>My Cases</strong> dashboard.</p>
          <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/my-cases" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin-top: 12px;">Go to My Cases</a>
        </div>
      `;
      await sendEmail(emails.join(','), subject, '', html);
    }
  } catch (err) {
    console.error('Error sending assignment email:', err);
  }
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
}

function generateCaseId(brandName, companyName, existingCases) {
  const year = new Date().getFullYear();
  const bName = (brandName || '').trim();
  const cName = (companyName || '').trim();
  const nameToUse = (bName || cName || 'XX').toLowerCase().replace(/[^a-z0-9\s]/g, "");

  let code;
  if (nameToUse.includes("startup flora") || nameToUse.includes("startupflora")) {
    code = "SF";
  } else {
    const words = nameToUse.toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      code = (words[0][0] + words[1][0]);
    } else if (words.length === 1 && words[0].length >= 2) {
      code = words[0].substring(0, 2);
    } else if (words.length === 1) {
      code = words[0].padEnd(2, "X");
    }
  }

  code = code.toUpperCase();

  const existing = existingCases
    .filter(c => {
      const p = (c.caseId || "").split("-");
      return p[0] === "RRR" && p[1] === code && p[2] == year;
    })
    .map(c => {
      const p = (c.caseId || "").split("-");
      return parseInt(p[3]) || 0;
    });

  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `RRR-${code}-${year}-${String(next).padStart(4, "0")}`;
}

async function updateRelatedModels(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;

  await Promise.all([
    Timeline.update({ caseId: newId }, { where: { caseId: oldId } }),
    Task.update({ caseId: newId }, { where: { caseId: oldId } }),
    Communication.update({ caseId: newId }, { where: { caseId: oldId } }),
    Action.update({ caseId: newId }, { where: { caseId: oldId } }),
    Refund.update({ caseId: newId }, { where: { caseId: oldId } }),
    Document.update({ caseId: newId }, { where: { caseId: oldId } }),
    History.update({ caseId: newId }, { where: { caseId: oldId } }),
    AuditLog.update({ caseId: newId }, { where: { caseId: oldId } }),
    Progress.update({ caseId: newId }, { where: { caseId: oldId } })
  ]);
}

async function createDocumentIfNotExists({ caseId, docType, fileLink, sourceForm, uploadedBy }) {
  if (!caseId || !docType || !fileLink) return null;

  const existing = await Document.findOne({ where: { caseId, docType, fileLink } });
  if (existing) return existing;

  const existingCount = await Document.count({ where: { caseId } });
  const docId = `DOC-${caseId}-${String(existingCount + 1).padStart(3, '0')}`;
  const document = await Document.create({
    caseId,
    docId,
    uploadDate: new Date().toISOString(),
    sourceForm: sourceForm || 'New Case',
    docType,
    fileLink,
    uploadedBy: uploadedBy || 'System'
  });

  await AuditLog.create({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user: uploadedBy || 'System',
    role: 'System',
    category: 'Document Indexed',
    description: `Indexed ${docType} for case ${caseId}`,
    caseId: caseId
  });

  await Timeline.create({
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    caseId: caseId,
    eventDate: new Date().toISOString(),
    source: uploadedBy || 'System',
    eventType: 'Document Upload',
    summary: `Document Uploaded: ${docType}`,
    details: `File: ${fileLink?.split('/').pop() || 'Unnamed'}. Source: ${sourceForm || 'New Case'}`,
    metadata: { docType, fileLink, sourceForm }
  });

  return document;
}

const buildNameLike = (text) => {
  const safe = (text || '').trim();
  if (!safe) return null;
  return safe + '%'; // prefix match for SQL LIKE
};

async function buildCaseQuery(req) {
  let query = {};

  if (req.user?.role?.toLowerCase().trim() === 'operation head') {
    query = { sourceOfComplaint: { [Op.like]: '%odoo%' } };
  } else if (
    (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'SuperAdmin') &&
    req.query.isLegalDashboard === 'true'
  ) {
    const legalUsers = await User.findAll({ where: { role: 'Legal' } });
    const legalNames = legalUsers.map(u => (u.fullName || u.name || '').trim()).filter(Boolean);
    if (legalNames.length > 0) {
      query = { assignedTo: { [Op.in]: legalNames } };
    } else {
      query = { assignedTo: '__non_existent_user__' };
    }
  } else if (
    req.user.role !== 'Admin' &&
    req.user.role !== 'Reviewer' &&
    req.user.role !== 'Super Admin' &&
    req.user.role !== 'SuperAdmin' &&
    !['operation admin'].includes(req.user.role?.toLowerCase().trim())
  ) {
    const dbUser = await User.findByPk(req.user.id);
    const userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    const userEmail = (dbUser?.email || req.user.email || '').trim();
    
    query = {
      [Op.or]: [
        { assignedTo: userName },
        { assignedTo: userEmail },
        {
          [Op.and]: [
            { [Op.or]: [{ assignedTo: '' }, { assignedTo: null }] },
            { [Op.or]: [{ initiatedBy: userName }, { initiatedBy: userEmail }] }
          ]
        }
      ]
    };
  } else if (req.query.userFilter) {
    const filter = req.query.userFilter.trim();
    if (filter) {
      query = {
        [Op.or]: [
          { assignedTo: { [Op.like]: filter + '%' } },
          {
            [Op.and]: [
              { [Op.or]: [{ assignedTo: '' }, { assignedTo: null }] },
              { initiatedBy: { [Op.like]: filter + '%' } }
            ]
          }
        ]
      };
    }
  }

  if (req.query.hasDemand === 'true') {
    const commsWithDemand = await Communication.findAll({
      where: { [Op.or]: [{ demandAmount: { [Op.gt]: 0 } }] },
      attributes: ['caseId'],
      group: ['caseId']
    });
    query.caseId = { [Op.in]: commsWithDemand.map(c => c.caseId) };
  }

  if (req.query.isArchived === 'true') {
    query.isArchived = true;
  } else if (req.query.isArchived === 'false') {
    query.isArchived = { [Op.not]: true };
  }

  return query;
}

router.delete('/bulk/delete-all', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    await Case.destroy({ where: {}, truncate: true });
    await Timeline.destroy({ where: {}, truncate: true });
    res.json({ message: 'All cases and timelines deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk/sync-ids', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const allCases = await Case.findAll({ order: [['createdAt', 'ASC']] });
    let updatedCount = 0;
    const processedCases = [];
    
    for (const c of allCases) {
      const currentId = c.caseId;
      const correctId = generateCaseId(c.brandName, c.companyName, processedCases);

      if (currentId !== correctId) {
        await updateRelatedModels(currentId, correctId);
        c.caseId = correctId;
        await c.save();
        updatedCount++;
      }
      processedCases.push(c);
    }
    res.json({ message: `Successfully synchronized ${updatedCount} case IDs.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trigger-due-alerts', verifyToken, roleGuard(['Admin', 'Super Admin', 'SuperAdmin', 'Operations', 'Operation Review', 'Operation Head']), async (req, res) => {
  try {
    const { runDueCaseAlerts } = require('../utils/scheduler');
    await runDueCaseAlerts();
    res.json({ message: 'Realtime due case alerts triggered and emails sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/count', verifyToken, async (req, res) => {
  try {
    const query = await buildCaseQuery(req);
    const total = await Case.count({ where: query });
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', verifyToken, async (req, res) => {
  try {
    let query = await buildCaseQuery(req);
    if (req.query.search) {
      const searchRegex = '%' + req.query.search + '%';
      const searchQuery = {
        [Op.or]: [
          { caseId: { [Op.like]: searchRegex } },
          { companyName: { [Op.like]: searchRegex } },
          { clientName: { [Op.like]: searchRegex } }
        ]
      };
      query = Object.keys(query).length === 0 ? searchQuery : { [Op.and]: [query, searchQuery] };
    }

    const limit = Math.min(parseInt(req.query.limit) || 1000, 2000);
    const cases = await Case.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      limit: limit,
      attributes: ['caseId', 'companyName', 'clientName', 'initiatedBy', 'assignedTo', 'currentStatus', 'firFileLink', 'typeOfComplaint', 'createdAt', 'dueDate', 'caseSummary']
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = await buildCaseQuery(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const total = await Case.count({ where: query });
    
    let archivedCount = 0;
    if (req.query.isArchived === 'false') {
      const archivedQuery = { ...query, isArchived: true };
      archivedCount = await Case.count({ where: archivedQuery });
    }

    const cases = await Case.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit
    });

    res.json({
      cases,
      total,
      archivedCount,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-dates', verifyToken, async (req, res) => {
  try {
    const records = await Case.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('createdDate')), 'createdDate']],
      raw: true
    });
    const formattedDates = records.map(r => {
      try {
        const date = new Date(r.createdDate);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
      } catch (e) { return null; }
    }).filter(Boolean);
    res.json([...new Set(formattedDates)]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-states', verifyToken, async (req, res) => {
  try {
    const records = await Case.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('state')), 'state']],
      raw: true
    });
    const cleanStates = records.map(r => String(r.state).trim()).filter(Boolean);
    res.json([...new Set(cleanStates)].sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-duplicate', verifyToken, async (req, res) => {
  try {
    const { companyName } = req.query;
    if (!companyName) return res.json({ exists: false });

    const existing = await Case.findOne({
      where: { companyName: { [Op.like]: companyName.trim() } }
    });
    res.json({ exists: !!existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search-client', verifyToken, async (req, res) => {
  try {
    const { name, mobile } = req.query;
    if (!name && !mobile) return res.json([]);

    let orConditions = [];
    if (name) orConditions.push({ clientName: name.trim() });
    if (mobile) orConditions.push({ clientMobile: mobile.trim() });

    const cases = await Case.findAll({
      where: { [Op.or]: orConditions },
      attributes: ['caseId', 'companyName', 'clientName', 'clientMobile'],
      limit: 10
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:caseId', verifyToken, async (req, res) => {
  try {
    const caseData = await Case.findOne({ where: { caseId: req.params.caseId } });
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, roleGuard(['Admin', 'Operations', 'Staff', 'Operation Admin', 'operation admin', 'Operation Review', 'Operation Head']), async (req, res) => {
  try {
    const companyName = req.body.companyName?.trim();
    
    const existingCase = await Case.findOne({
      where: { companyName: { [Op.like]: companyName } }
    });
    if (existingCase) {
      return res.status(400).json({
        error: `Company name already exists! Case ID: ${existingCase.caseId}.`,
        existingCase
      });
    }

    const year = new Date().getFullYear();
    const relevantCases = await Case.findAll({
      where: { caseId: { [Op.like]: `RRR-%-${year}-%` } },
      attributes: ['caseId']
    });
    const caseId = generateCaseId(req.body.brandName, req.body.companyName, relevantCases);

    const forbiddenNames = ['staff', 'system'];
    let initiatedBy = forbiddenNames.includes(req.body.initiatedBy?.toLowerCase()) ? "" : (req.body.initiatedBy || "");
    let assignedTo = forbiddenNames.includes(req.body.assignedTo?.toLowerCase()) ? "" : (req.body.assignedTo || "");

    let currentStatus = req.body.currentStatus || 'Case Logged';
    let progressPercentage = req.body.progressPercentage || 0;

    const isAssigned = assignedTo && assignedTo.trim() !== '';
    if (isAssigned && (currentStatus === 'New' || currentStatus === 'Case Logged')) {
      currentStatus = 'Assigned';
      progressPercentage = 25;
    }

    const newCase = await Case.create({
      ...req.body,
      caseId,
      assignedTo,
      initiatedBy,
      currentStatus,
      progressPercentage,
      createdDate: req.body.createdDate || new Date().toISOString(),
      lastUpdateDate: new Date().toISOString(),
      assignedAt: isAssigned ? new Date().toISOString() : null,
      hasBeenWorkedOn: false,
      lastReminderSentAt: null
    });

    if (isAssigned) {
      const assignerName = req.user.fullName || req.user.email || 'System';
      sendAssignmentEmail(assignedTo, [caseId], assignerName);
    }

    const uploader = req.user.fullName || req.user.email || 'System';
    if (['FIR', 'Criminal Complaint/FIR'].includes(req.body.typeOfComplaint) && req.body.firFileLink) {
      await createDocumentIfNotExists({
        caseId, docType: 'FIR Document', fileLink: req.body.firFileLink, sourceForm: 'New Case', uploadedBy: uploader
      });
    }

    if (['Legal Notice', '1930 Cyber Complaint', 'Consumer Complaint'].includes(req.body.typeOfComplaint) && req.body.importDocumentLink) {
      await createDocumentIfNotExists({
        caseId, docType: `${req.body.typeOfComplaint} Proof`, fileLink: req.body.importDocumentLink, sourceForm: 'New Case', uploadedBy: uploader
      });
    }
    
    try {
      const admins = await User.findAll({ where: { role: 'Admin' } });
      const emails = admins.map(u => u.email).join(',');
      if (emails) {
        const isCritical = ['Cyber Complaint', 'FIR', 'Legal Notice', 'Consumer Complaint'].includes(req.body.typeOfComplaint);
        const subject = isCritical ? `🚨 CRITICAL CASE: ${caseId} — ${req.body.typeOfComplaint}` : `📋 New Case Created: ${caseId}`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f4f7fa;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
              <div style="background-color: ${isCritical ? '#d93025' : '#1a73e8'}; padding: 25px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 24px;">New Case Registration</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Case ID: ${caseId}</p>
              </div>
              <div style="padding: 30px;">
                <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Case Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 40%;"><strong>Type of Complaint:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;"><strong>${req.body.typeOfComplaint || 'N/A'}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Client Name:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;">${req.body.clientName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Company / Brand:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;">${req.body.companyName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Amount in Dispute:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #d93025; font-weight: bold;">₹${Number(req.body.amtInDispute || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Total Amount Paid:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;">₹${Number(req.body.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </table>
                
                <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Contact Information</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 40%;"><strong>Mobile Number:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;">${req.body.mobileNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Email ID:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #333;">${req.body.emailId || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Initiated By:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #1a73e8; font-weight: bold;">${req.user.fullName || req.user.email || 'System'}</td>
                  </tr>
                </table>
                
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://crm.cfi247.com/case-master?search=${caseId}" style="display: inline-block; background-color: ${isCritical ? '#d93025' : '#1a73e8'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full Case in CRM</a>
                </div>
              </div>
              <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                This is an automated notification from RRR System.
              </div>
            </div>
          </div>
        `;
        sendEmail(emails, subject, '', html).catch(e => console.error(e));
        createNotification('Admin', 'New Case Created', `A new case ${caseId} has been registered.`, 'Case', `/case-master?search=${caseId}`);
      }
    } catch (err) {}

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Case Created',
      description: `Created new case: ${caseId}`,
      caseId: caseId
    });

    if (initiatedBy) {
      const taskCount = await Task.count({ where: { caseId } });
      await Task.create({
        taskId: `TSK-${caseId}-${String(taskCount + 1).padStart(3, '0')}`,
        title: 'Make call on this case',
        details: 'Auto-generated task.',
        assignee: initiatedBy,
        dueDate: new Date().toISOString().split('T')[0],
        caseId,
        status: 'To Do',
        createdBy: req.user.email
      });
    }

    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || 'System',
      eventType: 'Case Created',
      summary: 'Manual Case Creation'
    });

    const initialLog = {
      stage: currentStatus,
      percentage: 0,
      summary: 'Case initiated.',
      nextAction: req.body.nextActionPlanned || '',
      updatedBy: req.user.fullName
    };
    await Progress.create({
      caseId,
      ...initialLog,
      updates: [initialLog]
    });

    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/bulk-assign', verifyToken, roleGuard(['Admin', 'Operations', 'Operation Review', 'Operation Head']), async (req, res) => {
  try {
    const { caseIds, assignedTo } = req.body;
    const isAssigned = assignedTo && assignedTo.trim() !== '';
    await Case.update(
      { 
        assignedTo, 
        lastUpdateDate: new Date().toISOString(),
        assignedAt: isAssigned ? new Date().toISOString() : null,
        hasBeenWorkedOn: false,
        lastReminderSentAt: null
      },
      { where: { caseId: { [Op.in]: caseIds } } }
    );
    
    if (isAssigned) {
      const assignerName = req.user.fullName || req.user.email || 'System';
      sendAssignmentEmail(assignedTo, caseIds, assignerName);
    }
    
    res.json({ message: `Successfully assigned ${caseIds.length} cases.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:caseId', verifyToken, roleGuard(['Admin', 'Operations', 'Staff', 'Operation Admin', 'operation admin', 'Operation Review', 'Operation Head']), async (req, res) => {
  try {
    const caseId = req.params.caseId;
    const existingCase = await Case.findOne({ where: { caseId } });
    if (!existingCase) return res.status(404).json({ error: 'Case not found' });

    if (existingCase.currentStatus === 'Closure') {
      req.body.currentStatus = 'Closure';
      req.body.progressPercentage = 100;
    }

    const hasAssignee = req.body.assignedTo && req.body.assignedTo.trim() !== '';
    if (hasAssignee && (!existingCase.currentStatus || existingCase.currentStatus === 'New' || existingCase.currentStatus === 'Case Logged')) {
      req.body.currentStatus = 'Assigned';
      req.body.progressPercentage = 25;
    }

    if (req.body.assignedTo !== undefined && req.body.assignedTo !== existingCase.assignedTo) {
      req.body.assignedAt = hasAssignee ? new Date().toISOString() : null;
      req.body.hasBeenWorkedOn = false;
      req.body.lastReminderSentAt = null;
    }

    const { id, createdAt, updatedAt, caseId: ignoreId, ...updateData } = req.body;
    await Case.update({ ...updateData, lastUpdateDate: new Date().toISOString() }, { where: { caseId } });
    const updated = await Case.findOne({ where: { caseId } });

    if (req.body.currentStatus && req.body.currentStatus !== existingCase.currentStatus) {
      const existingProgress = await Progress.findOne({ where: { caseId } });
      if (existingProgress) {
        const updateLog = {
          stage: req.body.currentStatus,
          percentage: req.body.progressPercentage || existingProgress.percentage,
          summary: `Case status changed to ${req.body.currentStatus}.`,
          updatedBy: req.user.fullName || 'System'
        };
        const currentUpdates = Array.isArray(existingProgress.updates) ? existingProgress.updates : [];
        await Progress.update({
          stage: req.body.currentStatus,
          percentage: req.body.progressPercentage || existingProgress.percentage,
          updates: [...currentUpdates, updateLog]
        }, { where: { caseId } });
      }
    }

    if (req.body.assignedTo !== undefined && req.body.assignedTo !== existingCase.assignedTo && hasAssignee) {
      const assignerName = req.user.fullName || req.user.email || 'System';
      sendAssignmentEmail(req.body.assignedTo, [caseId], assignerName);
    }

    // Notify Admin on case edit
    try {
      const admins = await User.findAll({ where: { role: 'Admin' } });
      const adminEmails = admins.map(u => u.email).filter(Boolean).join(',');

      if (adminEmails) {
        const editorName = req.user.fullName || req.user.email || 'System';
        const subject = `✏️ Case Details Updated: ${caseId}`;
        const html = `
          <div style="font-family: sans-serif; padding: 24px; border: 2px solid #3b82f6; border-radius: 12px; max-width: 600px;">
            <h2 style="color: #2563eb; margin-top: 0; font-size: 18px;">Case Details Updated</h2>
            <p style="color: #374151;">Hello Admin,</p>
            <p style="color: #374151;">The details for Case <strong>${caseId}</strong> have been edited and updated by <strong>${editorName}</strong>.</p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 6px 0; color: #374151;"><strong>Company:</strong> ${updated.companyName || 'N/A'}</p>
              <p style="margin: 6px 0; color: #374151;"><strong>Client:</strong> ${updated.clientName || 'N/A'}</p>
              <p style="margin: 6px 0; color: #374151;"><strong>Status:</strong> ${updated.currentStatus || 'N/A'}</p>
            </div>
            <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Updated Case</a>
          </div>
        `;
        sendEmail(adminEmails, subject, '', html).catch(console.error);
      }
    } catch (err) {
      console.error('Error sending case edit notification:', err);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:caseId', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const deletedCase = await Case.findOne({ where: { caseId } });
    if (!deletedCase) return res.status(404).json({ error: 'Case not found' });

    await Promise.all([
      Case.destroy({ where: { caseId } }),
      Timeline.destroy({ where: { caseId } }),
      Task.destroy({ where: { caseId } }),
      Communication.destroy({ where: { caseId } }),
      Action.destroy({ where: { caseId } }),
      Refund.destroy({ where: { caseId } }),
      Document.destroy({ where: { caseId } }),
      History.destroy({ where: { caseId } }),
      AuditLog.destroy({ where: { caseId } }),
      Progress.destroy({ where: { caseId } })
    ]);
    
    res.json({ message: 'Case and all associated records deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY ENDPOINT TO FIX GHOST DATA ON LIVE SERVER
router.get('/fix-ghost/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const targetCase = await Case.findOne({ where: { caseId } });
    if (!targetCase) return res.status(404).json({ error: 'Case not found' });
    
    const cutoffDate = targetCase.createdAt || targetCase.createdDate;
    if (!cutoffDate) return res.status(400).json({ error: 'No creation date found to use as cutoff.' });

    const tDel = await Timeline.destroy({ where: { caseId, createdAt: { [Op.lt]: cutoffDate } } });
    const cDel = await Communication.destroy({ where: { caseId, createdAt: { [Op.lt]: cutoffDate } } });
    const dDel = await Document.destroy({ where: { caseId, createdAt: { [Op.lt]: cutoffDate } } });

    const progressDoc = await Progress.findOne({ where: { caseId } });
    let removedProgress = 0;
    if (progressDoc) {
      let rawUpdates = progressDoc.updates;
      if (typeof rawUpdates === 'string') { try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {} }
      if (typeof rawUpdates === 'string') { try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {} }
      const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
      
      const filteredUpdates = updates.filter(u => new Date(u.createdAt) >= new Date(cutoffDate));
      if (filteredUpdates.length !== updates.length) {
        removedProgress = updates.length - filteredUpdates.length;
        progressDoc.updates = filteredUpdates;
        await progressDoc.save();
      }
    }

    res.json({ 
      message: 'Ghost data cleaned successfully', 
      deletedTimelines: tDel, 
      deletedCommunications: cDel, 
      deletedDocuments: dDel,
      removedProgressEntries: removedProgress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', verifyToken, roleGuard(['Admin', 'Operations', 'Operation Review', 'Operation Head']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { cellDates: true });

    const results = [];
    data.forEach(row => {
      const keys = Object.keys(row);
      const getVal = (terms, isDate = false) => {
        const key = keys.find(k => {
          const normalized = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return terms.some(t => normalized === t || normalized.includes(t));
        });
        if (!key) return '';
        const val = row[key];
        if (isDate && val instanceof Date) return val.toISOString();
        if (isDate && typeof val === 'number') return new Date((val - 25569) * 86400 * 1000).toISOString();
        return String(val || '');
      };

      results.push({
        companyName: getVal(['companyname', 'company', 'firm']),
        brandName: getVal(['brandname', 'brand']),
        typeOfComplaint: getVal(['typeofcomplaint', 'type']),
        sourceOfComplaint: getVal(['sourceofcomplaint', 'source']),
        priority: getVal(['priority', 'urgency']) || 'Medium',
        clientName: getVal(['clientname', 'client', 'name']),
        clientMobile: getVal(['mobile', 'contact', 'phone']),
        clientEmail: getVal(['email', 'mail']),
        state: getVal(['state', 'region']),
        city: getVal(['city', 'town']),
        pincode: getVal(['pincode', 'postalcode', 'zip']),
        totalAmtPaid: parseFloat(getVal(['amountpaid', 'paid'])) || 0,
        mouSigned: getVal(['mousigned', 'mou']) || 'No',
        totalMouValue: parseFloat(getVal(['mouvalue', 'totalmou'])) || 0,
        amtInDispute: parseFloat(getVal(['disputeamount', 'dispute'])) || 0,
        dateOfLastPayment: getVal(['dateoflastpayment', 'paymentdate'], true),
        caseSummary: getVal(['summary', 'description']),
        clientAllegation: getVal(['allegation', 'claims']),
        initiatedBy: getVal(['initiatedby', 'createdby']),
        servicesSold: getVal(['services', 'product']) ? [{
          serviceName: getVal(['services', 'product']),
          serviceAmount: getVal(['serviceamount', 'price']),
          signedMouAmount: getVal(['signedmouamount', 'mouamount']),
          workStatus: getVal(['workstatus', 'status']) || 'Not Initiated',
          bda: getVal(['bda', 'salesagent']),
          department: getVal(['department', 'dept']) || 'Operations'
        }] : [],
        engagementNote: getVal(['engagementnote', 'notes']),
        nextActionDate: getVal(['nextactiondate', 'followup'], true),
        assignedTo: getVal(['assignedto', 'owner']),
        createdDate: getVal(['createddate', 'date'], true) || new Date().toISOString()
      });
    });

    const year = new Date().getFullYear();
    let allCases = await Case.findAll({
      where: { caseId: { [Op.like]: `RRR-%-${year}-%` } },
      attributes: ['caseId']
    });
    const finalCases = [];
    
    for (let row of results) {
      if (!row.companyName) continue;
      row.caseId = generateCaseId(row.brandName, row.companyName, allCases);
      if (row.assignedTo && row.assignedTo !== '') {
        row.currentStatus = 'Assigned';
        row.progressPercentage = 25;
        row.assignedAt = new Date().toISOString();
        row.hasBeenWorkedOn = false;
        row.lastReminderSentAt = null;
      }
      allCases.push({ caseId: row.caseId });
      finalCases.push(row);
    }

    if (finalCases.length > 0) {
      await Case.bulkCreate(finalCases);
    }

    const timelineEntries = finalCases.map(c => ({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: c.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || 'System',
      eventType: 'Case Created',
      summary: 'Imported: Bulk Import'
    }));

    if (timelineEntries.length > 0) {
      await Timeline.bulkCreate(timelineEntries);
    }

    res.json({
      message: `Import completed: ${finalCases.length} cases imported.`,
      imported: finalCases.length,
      skipped: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.generateCaseId = generateCaseId;
