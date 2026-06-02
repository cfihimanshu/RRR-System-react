const express = require('express');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const Timeline = require('../models/Timeline');
const Task = require('../models/Task');
const Communication = require('../models/Communication');
const Action = require('../models/Action');
const Refund = require('../models/Refund');
const Document = require('../models/Document');
const History = require('../models/History');
const Progress = require('../models/Progress');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { createNotification } = require('../utils/notificationHelper');
const { sendEmail } = require('../utils/mailer');
const User = require('../models/User');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Filter existing cases to find max serial for THIS brand and THIS year
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
    Timeline.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    Task.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    Communication.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    Action.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    Refund.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    Document.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    History.updateMany({ caseId: oldId }, { $set: { caseId: newId } }),
    AuditLog.updateMany({ caseId: oldId }, { $set: { caseId: newId } })
  ]);
}

async function createDocumentIfNotExists({ caseId, docType, fileLink, sourceForm, uploadedBy }) {
  if (!caseId || !docType || !fileLink) return null;

  const existing = await Document.findOne({ caseId, docType, fileLink });
  if (existing) return existing;

  const existingCount = await Document.countDocuments({ caseId });
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
    metadata: {
      docType: docType,
      fileLink: fileLink,
      sourceForm: sourceForm
    }
  });

  return document;
}

const escapeRegex = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildNameRegex = (text) => {
  const safe = escapeRegex(text).trim();
  if (!safe) return null;
  return new RegExp(`^(${safe})`, 'i');
};

async function buildCaseQuery(req) {
  let query = {};

  if (
    (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'SuperAdmin') &&
    req.query.isLegalDashboard === 'true'
  ) {
    const User = require('../models/User');
    const legalUsers = await User.find({ role: 'Legal' }).lean();
    const legalNames = legalUsers.map(u => (u.fullName || u.name || '').trim()).filter(Boolean);
    if (legalNames.length > 0) {
      const regexStr = legalNames.map(n => `^\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).join('|');
      query = { assignedTo: new RegExp(regexStr, 'i') };
    } else {
      query = { assignedTo: '__non_existent_user__' };
    }
  } else if (
    req.user.role !== 'Admin' &&
    req.user.role !== 'Reviewer' &&
    req.user.role !== 'Super Admin' &&
    req.user.role !== 'SuperAdmin' &&
    !['operation admin', 'operation admin'].includes(req.user.role?.toLowerCase().trim())
  ) {
    const User = require('../models/User');
    const dbUser = await User.findById(req.user.id).lean();
    const userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    const userEmail = (dbUser?.email || req.user.email || '').trim();
    const nameRegex = buildNameRegex(userName);
    const emailRegex = buildNameRegex(userEmail);
    const ownerRegex = nameRegex || emailRegex ? [nameRegex, emailRegex].filter(Boolean) : null;

    if (ownerRegex) {
      query = {
        $or: [
          { assignedTo: { $in: ownerRegex } },
          {
            $and: [
              {
                $or: [
                  { assignedTo: { $regex: /^\s*$/ } },
                  { assignedTo: { $exists: false } },
                  { assignedTo: null }
                ]
              },
              { initiatedBy: { $in: ownerRegex } }
            ]
          }
        ]
      };
    }
  } else if (req.query.userFilter) {
    const filterRegex = buildNameRegex(req.query.userFilter);
    if (filterRegex) {
      query = {
        $or: [
          { assignedTo: filterRegex },
          {
            $and: [
              {
                $or: [
                  { assignedTo: { $regex: /^\s*$/ } },
                  { assignedTo: { $exists: false } },
                  { assignedTo: null }
                ]
              },
              { initiatedBy: filterRegex }
            ]
          }
        ]
      };
    }
  }

  if (req.query.hasDemand === 'true') {
    const commsWithDemand = await Communication.find({
      $or: [
        { demandAmount: { $gt: 0 } },
        { refundDemanded: { $regex: /[1-9]/ } }
      ]
    }).distinct('caseId');
    query.caseId = { $in: commsWithDemand };
  }

  return query;
}

// --- BULK ADMIN ROUTES (Must be before standard routes to avoid overlap) ---
router.delete('/bulk/delete-all', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    await Case.deleteMany({});
    await Timeline.deleteMany({});
    res.json({ message: 'All cases and timelines deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk/sync-ids', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const allCases = await Case.find();
    let updatedCount = 0;

    // Sort by createdAt to maintain original sequence
    allCases.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const processedCases = [];
    for (const c of allCases) {
      const currentId = c.caseId || c.get('caseid');
      const correctId = generateCaseId(c.brandName, c.companyName, processedCases);

      if (currentId !== correctId) {
        await updateRelatedModels(currentId, correctId);
        c.caseId = correctId;
        if (c.get('caseid')) c.set('caseid', undefined);
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

router.post('/trigger-due-alerts', verifyToken, roleGuard(['Admin', 'Super Admin', 'SuperAdmin', 'Operations']), async (req, res) => {
  try {
    const { runDueCaseAlerts } = require('../utils/scheduler');
    await runDueCaseAlerts();
    res.json({ message: 'Realtime due case alerts triggered and emails sent successfully!' });
  } catch (error) {
    console.error('Trigger due alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- STANDARD ROUTES ---
router.get('/count', verifyToken, async (req, res) => {
  try {
    const query = await buildCaseQuery(req);
    const total = Object.keys(query).length === 0
      ? await Case.estimatedDocumentCount()
      : await Case.countDocuments(query);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', verifyToken, async (req, res) => {
  try {
    let query = await buildCaseQuery(req);
    if (req.query.search) {
      const search = escapeRegex(req.query.search);
      const searchRegex = new RegExp(search, 'i');
      const searchQuery = {
        $or: [
          { caseId: searchRegex },
          { companyName: searchRegex },
          { clientName: searchRegex }
        ]
      };
      query = Object.keys(query).length === 0 ? searchQuery : { $and: [query, searchQuery] };
    }

    const limit = Math.min(parseInt(req.query.limit) || 1000, 2000);
    const cases = await Case.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('caseId companyName clientName initiatedBy assignedTo currentStatus importDocumentLink firFileLink typeOfComplaint createdAt dueDate caseSummary')
      .lean();

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

    const total = Object.keys(query).length === 0
      ? await Case.estimatedDocumentCount()
      : await Case.countDocuments(query);

    const cases = await Case.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      cases,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-dates', verifyToken, async (req, res) => {
  try {
    const dates = await Case.distinct('createdDate');
    const formattedDates = dates
      .filter(d => d)
      .map(d => {
        try {
          const date = new Date(d);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().split('T')[0];
        } catch (e) {
          return null;
        }
      })
      .filter(d => d);

    res.json([...new Set(formattedDates)]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-states', verifyToken, async (req, res) => {
  try {
    const states = await Case.distinct('state');
    const cleanStates = states
      .filter(s => s && String(s).trim() !== '')
      .map(s => String(s).trim());
    res.json([...new Set(cleanStates)].sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-duplicate', verifyToken, async (req, res) => {
  try {
    const { companyName } = req.query;
    if (!companyName) return res.json({ exists: false });
    
    const escapedName = escapeRegExp(companyName.trim());
    const existing = await Case.findOne({ 
      companyName: { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' } 
    }).lean();
    
    res.json({ exists: !!existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get('/search-client', verifyToken, async (req, res) => {
  try {
    const { name, mobile } = req.query;
    if (!name && !mobile) return res.json([]);
    
    let query = { $or: [] };
    
    if (name) query.$or.push({ clientName: { $regex: new RegExp(name.trim(), 'i') } });
    if (mobile) query.$or.push({ clientMobile: { $regex: new RegExp(mobile.trim(), 'i') } });
    
    const cases = await Case.find(query, 'caseId companyName clientName clientMobile').limit(10).lean();
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:caseId — Get a single case by its custom caseId
router.get('/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ caseId }).lean();
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, roleGuard(['Admin', 'Operations', 'Staff', 'Operation Admin', 'operation admin']), async (req, res) => {
  try {
    const clientMobile = req.body.clientMobile?.trim();
    const clientName = req.body.clientName?.trim();
    const companyName = req.body.companyName?.trim();
    const typeOfComplaint = req.body.typeOfComplaint;

    // Duplicate Check - Strict match on Company Name only
    const escapedName = escapeRegExp(companyName.trim());
    const existingCase = await Case.findOne({ 
      companyName: { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' } 
    });
    if (existingCase) {
      return res.status(400).json({
        error: `Company name already exists! A case with this company name was already registered with Case ID: ${existingCase.caseId}.`,
        existingCase: existingCase
      });
    }

    const allCases = await Case.find({}, 'caseId');
    const caseId = generateCaseId(req.body.brandName, req.body.companyName, allCases);

    // Auto-assign to initiator if provided
    const forbiddenNames = ['staff', 'system'];
    let initiatedBy = forbiddenNames.includes(req.body.initiatedBy?.toLowerCase()) ? "" : (req.body.initiatedBy || "");
    let assignedTo = forbiddenNames.includes(req.body.assignedTo?.toLowerCase()) ? "" : (req.body.assignedTo || "");

    // If we have an assignee, the case is no longer 'Unassigned' -> Set to Assigned
    let currentStatus = req.body.currentStatus || 'Case Logged';
    let progressPercentage = req.body.progressPercentage || 0;

    const isAssigned = assignedTo && assignedTo.trim() !== '';
    if (isAssigned && (currentStatus === 'New' || currentStatus === 'Case Logged')) {
      currentStatus = 'Assigned';
      progressPercentage = 25;
    }

    const newCase = new Case({
      ...req.body,
      caseId,
      assignedTo,
      initiatedBy,
      currentStatus,
      progressPercentage,
      createdDate: req.body.createdDate || new Date().toISOString(),
      lastUpdateDate: new Date().toISOString()
    });
    await newCase.save();

    const uploader = req.user.fullName || req.user.email || 'System';
    if (['FIR', 'Criminal Complaint/FIR'].includes(req.body.typeOfComplaint) && req.body.firFileLink) {
      await createDocumentIfNotExists({
        caseId,
        docType: 'FIR Document',
        fileLink: req.body.firFileLink,
        sourceForm: 'New Case',
        uploadedBy: uploader
      });
    }
    if (['Legal Notice', 'Cyber Complaint', '1930 Cyber Complaint', 'Consumer Complaint'].includes(req.body.typeOfComplaint) && req.body.importDocumentLink) {
      await createDocumentIfNotExists({
        caseId,
        docType: req.body.typeOfComplaint,
        fileLink: req.body.importDocumentLink,
        sourceForm: 'New Case',
        uploadedBy: uploader
      });
    }

    // Send New Case Alert Email to Admin (for ALL cases)
    try {
      const admins = await User.find({ role: 'Admin' });
      const emails = admins.map(u => u.email).join(',');
      if (emails) {
        const criticalTypes = ['Cyber Complaint', 'FIR', 'Legal Notice', 'Consumer Complaint'];
        const isCritical = criticalTypes.includes(req.body.typeOfComplaint);
        const borderColor = isCritical ? '#ea4335' : '#1a73e8';
        const headerColor = isCritical ? '#ea4335' : '#1a73e8';
        const headerText = isCritical ? '🚨 Critical Case Created' : '📋 New Case Created';
        const subject = isCritical
          ? `🚨 CRITICAL CASE: ${caseId} — ${req.body.typeOfComplaint}`
          : `📋 New Case Created: ${caseId}`;

        const html = `
          <div style="font-family: sans-serif; border: 2px solid ${borderColor}; border-radius: 12px; padding: 25px; max-width: 600px;">
            <h2 style="color: ${headerColor}; margin-top: 0;">${headerText}</h2>
            <p>A new case has been registered in the RRR System.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Case ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #1a73e8; font-weight: bold;">${caseId}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><span style="background: ${isCritical ? '#fce8e6' : '#e8f0fe'}; color: ${headerColor}; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${req.body.typeOfComplaint}</span></td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.companyName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Client:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.clientName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Mobile:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.clientMobile || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.priority || 'Medium'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Created By:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.initiatedBy || req.user.fullName}</td></tr>
            </table>

            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-style: italic; color: #555;">
              <strong>Summary:</strong><br>${req.body.caseSummary || 'No summary provided.'}
            </div>

            <div style="margin-top: 25px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}" style="background: #1a73e8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Case in Dashboard</a>
            </div>
          </div>
        `;
        sendEmail(emails, subject, '', html).catch(err => console.error('Admin Case Alert Error:', err));
        createNotification('Admin', isCritical ? '🚨 Critical Case Created' : '📋 New Case Created', `A new case ${caseId} (${req.body.typeOfComplaint}) has been registered by ${req.body.initiatedBy || req.user.fullName}.`, isCritical ? 'Critical' : 'Case', `/case-master?search=${caseId}`);
      }
    } catch (err) { console.error('Admin Case Alert Error:', err); }

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Case Created',
      description: `Created new case: ${caseId}`,
      caseId: caseId
    });

    // Auto-generate Task for the user who initiated the case if explicitly assigned
    const initiatedUser = req.body.initiatedBy || "";
    if (initiatedUser) {
      try {
        const existingTaskCount = await Task.countDocuments({ caseId: caseId });
        const autoTask = new Task({
          taskId: `TSK-${caseId}-${String(existingTaskCount + 1).padStart(3, '0')}`,
          title: 'Make call on this case',
          details: `Auto-generated task for new case ${caseId}. Please make an initial call regarding this case.`,
          priority: req.body.priority || 'Medium',
          assignee: initiatedUser,
          dueDate: new Date().toISOString().split('T')[0], // Today's date
          caseId: caseId,
          status: 'To Do',
          createdBy: req.user.email,
          source: 'Auto (Case Generation)'
        });
        await autoTask.save();
      } catch (err) {
        console.error('Error auto-generating task:', err);
      }
    }

    // Create initial timeline entry
    const timelineEntry = new Timeline({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Case Created',
      summary: 'Manual Case Creation'
    });
    await timelineEntry.save();

    // Create initial Progress log to show in the Progress Timeline
    try {
      const initialLog = {
        stage: req.body.currentStatus || 'Case Logged',
        percentage: 0,
        summary: 'Case initiated and added to the register.',
        nextAction: req.body.nextActionPlanned || '',
        updatedBy: req.user.fullName || req.user.email
      };
      await Progress.create({
        caseId: caseId,
        ...initialLog,
        checklist: [
          { id: 1, label: 'Initial contact made', completed: false },
          { id: 2, label: 'Documents received ', completed: false },
          { id: 3, label: 'MOU draft prepared', completed: false },
          { id: 4, label: 'Signed MOU received', completed: false },
          { id: 5, label: 'Final settlement agreed', completed: false },
          { id: 6, label: 'Case closed', completed: false }
        ],
        updates: [initialLog]
      });
    } catch (err) {
      console.error('Error creating initial progress log:', err);
    }

    if (global.clearStatsCache) global.clearStatsCache();
    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/bulk-assign', verifyToken, roleGuard(['Admin', 'Operations']), async (req, res) => {
  try {
    const { caseIds, assignedTo } = req.body;
    if (!caseIds || !caseIds.length || !assignedTo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await Case.updateMany(
      { caseId: { $in: caseIds } },
      {
        $set: {
          assignedTo,
          lastUpdateDate: new Date().toISOString()
        }
      }
    );

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Bulk Assignment',
      description: `Bulk assigned ${caseIds.length} cases to ${assignedTo}`,
      caseId: 'Multiple'
    });

    if (global.clearStatsCache) global.clearStatsCache();
    res.json({ message: `Successfully assigned ${caseIds.length} cases.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:caseId', verifyToken, roleGuard(['Admin', 'Operations', 'Staff', 'Operation Admin', 'operation admin']), async (req, res) => {
  try {
    const caseId = req.params.caseId;

    const existingCase = await Case.findOne({ caseId });
    if (!existingCase) return res.status(404).json({ error: 'Case not found' });

    // Ownership check: Admin and Operations can update anything. 
    // Staff/Others can only update if assigned to them.
    const assignedName = (existingCase.assignedTo || '').trim().toLowerCase();
    const myName = (req.user.fullName || req.user.name || '').trim().toLowerCase();
    const myEmail = (req.user.email || '').trim().toLowerCase();
    const canUpdate = req.user.role === 'Admin' || 
                      req.user.role === 'Operations' || 
                      (assignedName !== '' && (assignedName === myName || assignedName === myEmail));

    if (!canUpdate) {
      return res.status(403).json({ error: 'You do not have permission to update this case' });
    }

    if (existingCase.currentStatus === 'Closure') {
      req.body.currentStatus = 'Closure';
      req.body.progressPercentage = 100;
    }

    const isAssigning = req.body.assignedTo && req.body.assignedTo !== existingCase.assignedTo;
    const isInitiating = req.body.initiatedBy && req.body.initiatedBy !== existingCase.initiatedBy;
    // Only auto-upgrade to "Assigned" if there is an assignee AND we are not explicitly requesting a further advanced stage.
    const requestedStatus = req.body.currentStatus;
    const isNewOrLogged = !requestedStatus || requestedStatus === 'New' || requestedStatus === 'Case Logged';

    const hasAssignee = req.body.assignedTo && req.body.assignedTo.trim() !== '';

    if (hasAssignee && (!existingCase.currentStatus || existingCase.currentStatus === 'New' || existingCase.currentStatus === 'Case Logged') && isNewOrLogged) {
      req.body.currentStatus = 'Assigned';
      req.body.progressPercentage = 25;
    }

    // Strip immutable/system fields from update payload to prevent MongoDB errors
    const { _id, __v, caseId: bodyCaseId, createdAt, updatedAt, ...updateData } = req.body;

    const updated = await Case.findOneAndUpdate(
      { caseId },
      { ...updateData, lastUpdateDate: new Date().toISOString() },
      { returnDocument: 'after' }
    );

    // Update Progress stage if status changed
    if (req.body.currentStatus && req.body.currentStatus !== existingCase.currentStatus) {
      const Progress = require('../models/Progress');
      try {
        const existingProgress = await Progress.findOne({ caseId });
        if (existingProgress) {
          const updateLog = {
            stage: req.body.currentStatus,
            percentage: req.body.progressPercentage || existingProgress.percentage,
            summary: `Case status changed to ${req.body.currentStatus}.`,
            updatedBy: req.user.fullName || req.user.email || 'System'
          };
          existingProgress.stage = req.body.currentStatus;
          existingProgress.percentage = req.body.progressPercentage || existingProgress.percentage;
          existingProgress.updates.push(updateLog);
          await existingProgress.save();
        }
      } catch (err) {
        console.error('Failed to update Progress stage:', err);
      }
    }

    const uploader = req.user.fullName || req.user.email || 'System';
    const updatedType = req.body.typeOfComplaint || existingCase.typeOfComplaint;
    const firFileLink = req.body.firFileLink ?? existingCase.firFileLink;
    const importDocumentLink = req.body.importDocumentLink ?? existingCase.importDocumentLink;

    if (['FIR', 'Criminal Complaint/FIR'].includes(updatedType) && firFileLink) {
      await createDocumentIfNotExists({
        caseId,
        docType: 'FIR Document',
        fileLink: firFileLink,
        sourceForm: 'Case Update',
        uploadedBy: uploader
      });
    }
    if (['Legal Notice', 'Cyber Complaint', '1930 Cyber Complaint', 'Consumer Complaint'].includes(updatedType) && importDocumentLink) {
      await createDocumentIfNotExists({
        caseId,
        docType: updatedType,
        fileLink: importDocumentLink,
        sourceForm: 'Case Update',
        uploadedBy: uploader
      });
    }

    // Assignment Notifications
    if (isAssigning) {
      console.log('Assignment change detected for case:', caseId, 'New Assignee Name:', req.body.assignedTo);
      try {
        // Search user ignoring any leading/trailing spaces in DB and case-insensitive
        const assignee = await User.findOne({
          fullName: { $regex: new RegExp(`^\\s*${req.body.assignedTo.trim()}\\s*$`, 'i') }
        });

        const admins = await User.find({ role: 'Admin' });
        const adminEmails = admins.map(u => u.email).join(',');

        // 1. Notify Assignee
        if (assignee && assignee.email) {
          console.log('Assignee found! Sending mail to:', assignee.email);
          const sub = `📋 New Case Assigned: ${caseId}`;
          const html = `
            <div style="font-family: sans-serif; border: 1px solid #1a73e8; border-radius: 10px; padding: 20px;">
              <h3 style="color: #1a73e8;">New Assignment</h3>
              <p>Hello <strong>${assignee.fullName}</strong>,</p>
              <p>A case has been assigned to you for management.</p>
              <div style="background: #f1f3f4; padding: 12px; border-radius: 6px; margin: 15px 0;">
                <strong>Case ID:</strong> ${caseId}<br>
                <strong>Client:</strong> ${updated.clientName}<br>
                <strong>Type:</strong> ${updated.typeOfComplaint}
              </div>
              <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}" style="color: #1a73e8; font-weight: bold;">Login to Dashboard</a> to view details.</p>
            </div>
          `;
          sendEmail(assignee.email, sub, '', html).catch(err => console.error('Assignee Email Error:', err));
          createNotification(assignee.email, 'New Case Assigned', `Case ${caseId} has been assigned to you by ${req.user.fullName}.`, 'Assignment', `/case-master?search=${caseId}`);
        } else {
          console.warn('Assignee NOT found in database for name:', req.body.assignedTo);
        }

        // 2. Notify Admin
        if (adminEmails) {
          const sub = `👤 Case Assignment Update: ${caseId}`;
          const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h3 style="color: #333;">Case Assignment Notification</h3>
              <p>Case <strong>${caseId}</strong> has been assigned to <strong>${req.body.assignedTo}</strong> by ${req.user.fullName}.</p>
              <p><strong>Client:</strong> ${updated.clientName}</p>
              <p><strong>Status:</strong> ${updated.currentStatus}</p>
            </div>
          `;
          sendEmail(adminEmails, sub, '', html).catch(err => console.error('Admin Assignment Alert Error:', err));
          createNotification('Admin', 'Case Assignment Update', `Case ${caseId} has been assigned to ${req.body.assignedTo} by ${req.user.fullName}.`, 'Assignment', `/case-master?search=${caseId}`);
        }

        // Auto-create/update a Progress Log for the assignment if we auto-updated the status
        if (req.body.currentStatus === 'Assigned') {
          const Progress = require('../models/Progress');
          const assignmentLog = {
            stage: 'Assigned',
            percentage: 25,
            summary: `Case assigned to ${req.body.assignedTo} for initial analysis and review.`,
            nextAction: req.body.nextActionPlanned || updated.nextActionPlanned || '',
            updatedBy: req.user.fullName || req.user.email || 'System'
          };
          const existingProgress = await Progress.findOne({ caseId });
          if (existingProgress) {
            existingProgress.stage = 'Assigned';
            existingProgress.percentage = 25;
            existingProgress.summary = assignmentLog.summary;
            existingProgress.nextAction = assignmentLog.nextAction;
            existingProgress.updatedBy = assignmentLog.updatedBy;
            existingProgress.updates.push(assignmentLog);
            await existingProgress.save();
          } else {
            await Progress.create({
              caseId: caseId,
              ...assignmentLog,
              checklist: [
                { id: 1, label: 'Initial contact made', completed: false },
                { id: 2, label: 'Documents received', completed: false },
                { id: 3, label: 'MOU draft prepared', completed: false },
                { id: 4, label: 'Signed MOU received', completed: false },
                { id: 5, label: 'Final settlement agreed', completed: false },
                { id: 6, label: 'Case closed', completed: false }
              ],
              updates: [assignmentLog]
            });
          }
        }
      } catch (err) { console.error('Assignment Notification Error:', err); }
    } else {
      // General Edit Notification to Admin (if not just assignment)
      try {
        const admins = await User.find({ role: 'Admin' });
        const adminEmails = admins.map(u => u.email).join(',');
        if (adminEmails) {
          const sub = `✏️ Case Updated: ${caseId}`;
          const html = `
            <div style="font-family: sans-serif; padding: 15px; border: 1px solid #ffc107; border-radius: 8px;">
              <h3 style="color: #856404;">Case Edit Notification</h3>
              <p>Case <strong>${caseId}</strong> was updated by <strong>${req.user.fullName}</strong> (${req.user.role}).</p>
              <p><strong>Client:</strong> ${updated.clientName}</p>
              <p><strong>Current Status:</strong> ${updated.currentStatus}</p>
              <p style="font-size: 11px; color: #666; margin-top: 10px;">Check Audit Logs for specific field changes.</p>
            </div>
          `;
          await sendEmail(adminEmails, sub, '', html);
          createNotification('Admin', 'Case Updated', `Case ${caseId} was updated by ${req.user.fullName}. Status: ${updated.currentStatus}`, 'Update', `/case-master?search=${caseId}`);
        }
      } catch (err) { console.error('Edit Notification Error:', err); }
    }

    // Track all field changes
    const changedFields = Object.keys(updateData).filter(key => {
      // Skip complex objects/arrays for simple string comparison
      if (typeof updateData[key] === 'object') return false;

      const oldVal = String(existingCase[key] ?? '').trim();
      const newVal = String(updateData[key] ?? '').trim();
      return oldVal !== newVal;
    });

    changedFields.forEach(async (field) => {
      let fieldLabel = field;
      let oldVal = existingCase[field];
      let newVal = updateData[field];

      // Map field names to display labels
      const fieldLabelMap = {
        'currentStatus': 'Status',
        'priority': 'Priority',
        'assignedTo': 'Assignee',
        'initiatedBy': 'Initiated By',
        'typeOfComplaint': 'Complaint Type',
        'clientName': 'Client Name',
        'clientMobile': 'Client Mobile',
        'clientEmail': 'Client Email',
        'state': 'State',
        'totalAmtPaid': 'Amount Paid',
        'totalMouValue': 'MOU Value',
        'amtInDispute': 'Dispute Amount',
        'caseSummary': 'Case Summary',
        'clientAllegation': 'Allegation',
        'progressPercentage': 'Progress %',
        'brandName': 'Brand Name',
        'companyName': 'Company Name',
        'engagementNote': 'Engagement Note',
        'recommendedNextSteps': 'Next Steps',
        'keyPendingIssue': 'Pending Issue',
        'firNumber': 'FIR Number',
        'firFileLink': 'FIR Document',
        'grievanceNumber': 'Grievance No',
        'proofCallRec': 'Call Recording Proof',
        'proofWaChat': 'WhatsApp Proof',
        'mouSigned': 'MOU Signed'
      };

      fieldLabel = fieldLabelMap[field] || field;

      // Create timeline entry with before/after
      await new Timeline({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        caseId: req.params.caseId,
        eventDate: new Date().toISOString(),
        source: req.user.fullName || req.user.email || 'System',
        eventType: 'Case Updated',
        summary: `${fieldLabel} changed: ${oldVal || 'N/A'} → ${newVal || 'N/A'}`,
        fieldChanged: fieldLabel,
        oldValue: oldVal,
        newValue: newVal
      }).save();
    });

    // Also create audit log
    if (req.body.currentStatus) {
      await AuditLog.create({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: req.user.email,
        role: req.user.role,
        category: 'Case Status Changed',
        description: `Case ${req.params.caseId} status updated from ${existingCase.currentStatus} to ${req.body.currentStatus}`,
        caseId: req.params.caseId
      });
    }

    // If no specific fields changed, log general update
    if (changedFields.length === 0) {
      await new Timeline({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        caseId: req.params.caseId,
        eventDate: new Date().toISOString(),
        source: req.user.fullName || req.user.email || 'System',
        eventType: 'Case Updated',
        summary: 'Case information modified'
      }).save();
    }

    if (global.clearStatsCache) global.clearStatsCache();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:caseId', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { caseId } = req.params;

    // Fetch the case first to have details for the email
    const deletedCase = await Case.findOneAndDelete({ caseId });
    if (!deletedCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    await Timeline.deleteMany({ caseId });

    // Send email to Admin
    try {
      const admins = await User.find({ role: 'Admin' });
      const adminEmails = admins.map(u => u.email).join(',');
      if (adminEmails) {
        const sub = `🚨 CRITICAL: Case Deleted - ${caseId}`;
        const html = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dc3545; border-radius: 10px;">
            <h3 style="color: #dc3545;">Case Deletion Notification</h3>
            <p>Case <strong>${caseId}</strong> was permanently deleted by <strong>${req.user.fullName || req.user.email}</strong>.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
              <h4 style="margin-top: 0; color: #333;">Deleted Case Details:</h4>
              <p style="margin: 5px 0;"><strong>Client/Company:</strong> ${deletedCase.clientName || 'N/A'} ${deletedCase.companyName ? `(${deletedCase.companyName})` : ''}</p>
              <p style="margin: 5px 0;"><strong>Type of Complaint:</strong> ${deletedCase.typeOfComplaint || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Last Status:</strong> ${deletedCase.currentStatus || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Total Amount Paid:</strong> ₹${deletedCase.totalAmtPaid || '0'}</p>
            </div>
            <p style="font-size: 11px; color: #666; margin-top: 20px;">This action cannot be undone. This is an automated security alert.</p>
          </div>
        `;
        sendEmail(adminEmails, sub, '', html).catch(err => console.error('Admin Delete Alert Error:', err));
      }
    } catch (err) { console.error('Delete Notification Error:', err); }

    if (global.clearStatsCache) global.clearStatsCache();
    res.json({ message: 'Case and associated timeline deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', verifyToken, roleGuard(['Admin', 'Operations']), upload.single('file'), async (req, res) => {
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
        companyName: getVal(['companyname', 'company', 'firm', 'business', 'legalname', 'organization']),
        brandName: getVal(['brandname', 'brand', 'tradingname', 'startup']),
        typeOfComplaint: getVal(['typeofcomplaint', 'type', 'complaintcategory', 'category', 'complainttype']),
        sourceOfComplaint: getVal(['sourceofcomplaint', 'source', 'origin', 'leadsource']),
        priority: getVal(['priority', 'urgency', 'importance']) || 'Medium',
        clientName: getVal(['clientname', 'client', 'customername', 'name', 'person', 'contactperson']),
        clientMobile: getVal(['mobile', 'contact', 'phone', 'mobilenumber', 'whatsapp', 'tel']),
        clientEmail: getVal(['email', 'emailid', 'mail', 'emailaddress']),
        state: getVal(['state', 'region']),
        city: getVal(['city', 'town', 'district']),
        pincode: getVal(['pincode', 'postalcode', 'zip', 'zipcode', 'pin']),
        totalAmtPaid: getVal(['amountpaid', 'paid', 'totalpaid', 'received', 'payment']),
        mouSigned: getVal(['mousigned', 'mou', 'contract', 'agreement']) || 'No',
        totalMouValue: getVal(['mouvalue', 'totalmou', 'value', 'contractvalue']),
        amtInDispute: getVal(['disputeamount', 'dispute', 'conflictamount', 'amountindispute']),
        dateOfLastPayment: getVal(['dateoflastpayment', 'lastpaymentdate', 'paymentdate', 'lastpayment'], true),
        caseSummary: getVal(['summary', 'description', 'caseinfo', 'narrative', 'details']),
        clientAllegation: getVal(['allegation', 'clientallegation', 'claims']),
        initiatedBy: ['staff'].includes(getVal(['initiatedby', 'salesperson', 'createdby', 'initiator'])?.toLowerCase()) ? '' : getVal(['initiatedby', 'salesperson', 'createdby', 'initiator']),
        servicesSold: getVal(['services', 'product', 'service', 'servicename']) ? [{
          serviceName: getVal(['services', 'product', 'service', 'servicename']),
          serviceAmount: getVal(['serviceamount', 'price', 'cost']),
          signedMouAmount: getVal(['signedmouamount', 'mouamount']),
          workStatus: getVal(['workstatus', 'status', 'stage']) || 'Not Initiated',
          bda: getVal(['bda', 'salesagent', 'representative']),
          department: getVal(['department', 'dept']) || 'Operations'
        }] : [],
        engagementNote: getVal(['engagementnote', 'notes', 'comments', 'engagement']),
        nextActionDate: getVal(['nextactiondate', 'nextfollowup', 'followup'], true),
        assignedTo: ['staff'].includes(getVal(['assignedto', 'owner', 'assignee', 'handler'])?.toLowerCase()) ? '' : getVal(['assignedto', 'owner', 'assignee', 'handler']),
        createdDate: getVal(['createddate', 'date', 'creationdate'], true) || new Date().toISOString()
      });
    });

    let allCases = await Case.find({}, 'caseId');
    const existingCasesInDb = await Case.find({}, 'clientMobile clientName companyName typeOfComplaint');
    const finalCases = [];
    let skippedCount = 0;

    for (let row of results) {
      const cMobile = row.clientMobile?.trim();
      const cName = row.clientName?.trim();
      const compName = row.companyName?.trim();
      const complaintType = row.typeOfComplaint;

      const isDuplicate = existingCasesInDb.some(ex => {
        const exCompName = ex.companyName?.trim().toLowerCase();
        const rowCompName = compName?.toLowerCase();
        const exClientName = ex.clientName?.trim().toLowerCase();
        const rowClientName = cName?.toLowerCase();
        return (cMobile && ex.clientMobile === cMobile && exCompName === rowCompName) ||
          (exClientName === rowClientName && exCompName === rowCompName && ex.typeOfComplaint === complaintType);
      }) || finalCases.some(ex => {
        const exCompName = ex.companyName?.trim().toLowerCase();
        const rowCompName = compName?.toLowerCase();
        const exClientName = ex.clientName?.trim().toLowerCase();
        const rowClientName = cName?.toLowerCase();
        return (cMobile && ex.clientMobile === cMobile && exCompName === rowCompName) ||
          (exClientName === rowClientName && exCompName === rowCompName && ex.typeOfComplaint === complaintType);
      });

      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      row.caseId = generateCaseId(row.brandName, row.companyName, allCases);

      // Sync assignment and status during import (only upgrade if there is an explicit assignedTo)
      if (row.assignedTo && row.assignedTo.trim() !== '' && (!row.currentStatus || row.currentStatus === 'New' || row.currentStatus === 'Case Logged')) {
        row.currentStatus = 'Assigned';
        row.progressPercentage = 25;
      }

      allCases.push({ caseId: row.caseId });
      finalCases.push(row);
    }

    if (finalCases.length > 0) {
      await Case.insertMany(finalCases);
    }

    // Create timeline entries only if they don't already exist for these caseIds
    const timelineEntries = [];
    for (const c of finalCases) {
      const exists = await Timeline.findOne({ caseId: c.caseId, eventType: 'Case Created' });
      if (!exists) {
        timelineEntries.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          caseId: c.caseId,
          eventDate: new Date(c.createdDate || new Date()).toISOString(),
          source: req.user.fullName || req.user.email || 'System',
          eventType: 'Case Created',
          summary: 'Imported: Bulk Import via File'
        });
      }
    }

    if (timelineEntries.length > 0) {
      await Timeline.insertMany(timelineEntries);
    }

    if (global.clearStatsCache) global.clearStatsCache();
    res.json({
      message: `Import completed: ${finalCases.length} cases imported, ${skippedCount} duplicates skipped.`,
      imported: finalCases.length,
      skipped: skippedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.generateCaseId = generateCaseId;
