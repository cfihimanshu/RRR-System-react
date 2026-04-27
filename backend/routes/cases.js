const express = require('express');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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

// --- BULK ADMIN ROUTES (Must be before standard routes to avoid overlap) ---
router.delete('/bulk/delete-all', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    await Case.deleteMany({});
    res.json({ message: 'All cases deleted successfully' });
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

// --- STANDARD ROUTES ---
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    
    // Logic: Admin sees all. Others see only their assigned or initiated cases.
    if (req.user.role !== 'Admin') {
      const userName = req.user.fullName?.trim();
      const nameRegex = new RegExp(`^\\s*${userName}\\s*$`, 'i');
      
      query = {
        $or: [
          { assignedTo: { $regex: nameRegex } },
          { initiatedBy: { $regex: nameRegex } }
        ]
      };
    }

    const cases = await Case.find(query).sort({ createdAt: -1 });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { sendEmail } = require('../utils/mailer');
const User = require('../models/User');

router.post('/', verifyToken, roleGuard(['Admin', 'Operations', 'Staff']), async (req, res) => {
  try {
    const allCases = await Case.find({}, 'caseId');
    const caseId = generateCaseId(req.body.brandName, req.body.companyName, allCases);
    const newCase = new Case({ 
      ...req.body, 
      caseId,
      createdDate: req.body.createdDate || new Date().toISOString(),
      lastUpdateDate: new Date().toISOString(),
      initiatedBy: req.body.initiatedBy || req.user.fullName
    });
    await newCase.save();

    // Critical Case Alert to Admin
    const criticalTypes = ['Cyber Complaint', 'FIR', 'Legal Notice', 'Consumer Complaint'];
    if (criticalTypes.includes(req.body.typeOfComplaint)) {
      try {
        const admins = await User.find({ role: 'Admin' });
        const emails = admins.map(u => u.email).join(',');
        if (emails) {
          const subject = `🚨 CRITICAL CASE ALERT: ${req.body.typeOfComplaint}`;
          const html = `
            <div style="font-family: sans-serif; border: 2px solid #ea4335; border-radius: 12px; padding: 25px; max-width: 600px;">
              <h2 style="color: #ea4335; margin-top: 0;">Critical Case Notification</h2>
              <p>A new high-priority complaint has been registered in the system.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Case ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #1a73e8;">${caseId}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><span style="background: #fce8e6; color: #ea4335; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${req.body.typeOfComplaint}</span></td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Client:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.clientName}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.companyName}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Mobile:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.clientMobile}</td></tr>
                <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${req.body.priority || 'High'}</td></tr>
              </table>

              <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-style: italic; color: #555;">
                <strong>Summary:</strong><br>${req.body.caseSummary || 'No summary provided.'}
              </div>

              <div style="margin-top: 25px; text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background: #1a73e8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Case in Dashboard</a>
              </div>
            </div>
          `;
          sendEmail(emails, subject, '', html).catch(err => console.error('Admin Alert Error:', err));
        }
      } catch (err) { console.error('Admin Alert Error:', err); }
    }

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Case Created',
      description: `Created new case: ${caseId}`,
      caseId: caseId
    });

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

    res.json({ message: `Successfully assigned ${caseIds.length} cases.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:caseId', verifyToken, roleGuard(['Admin', 'Operations', 'Staff']), async (req, res) => {
  try {
    const caseId = req.params.caseId;
    
    const existingCase = await Case.findOne({ caseId });
    if (!existingCase) return res.status(404).json({ error: 'Case not found' });

    // Ownership check: Admin and Operations can update anything. 
    // Staff/Others can only update if assigned to them.
    const canUpdate = req.user.role === 'Admin' || req.user.role === 'Operations' || existingCase.assignedTo === req.user.fullName;
    
    if (!canUpdate) {
      return res.status(403).json({ error: 'You do not have permission to update this case' });
    }

    const isAssigning = req.body.assignedTo && req.body.assignedTo !== existingCase.assignedTo;

    const updated = await Case.findOneAndUpdate(
      { caseId }, 
      { ...req.body, lastUpdateDate: new Date().toISOString() }, 
      { new: true }
    );

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
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color: #1a73e8; font-weight: bold;">Login to Dashboard</a> to view details.</p>
            </div>
          `;
          sendEmail(assignee.email, sub, '', html).catch(err => console.error('Assignee Email Error:', err));
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
        }
      } catch (err) { console.error('Edit Notification Error:', err); }
    }

    if (req.body.currentStatus) {
      await AuditLog.create({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: req.user.email,
        role: req.user.role,
        category: 'Case Status Changed',
        description: `Case ${req.params.caseId} status updated to ${req.body.currentStatus}`,
        caseId: req.params.caseId
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:caseId', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    await Case.findOneAndDelete({ caseId: req.params.caseId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', verifyToken, roleGuard(['Admin', 'Operations']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const workbook = xlsx.readFile(req.file.path);
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
        state: getVal(['state', 'region', 'location', 'city', 'address']),
        totalAmtPaid: getVal(['amountpaid', 'paid', 'totalpaid', 'received', 'payment']),
        mouSigned: getVal(['mousigned', 'mou', 'contract', 'agreement']) || 'No',
        totalMouValue: getVal(['mouvalue', 'totalmou', 'value', 'contractvalue']),
        amtInDispute: getVal(['disputeamount', 'dispute', 'conflictamount', 'amountindispute']),
        caseSummary: getVal(['summary', 'description', 'caseinfo', 'narrative', 'details']),
        clientAllegation: getVal(['allegation', 'clientallegation', 'claims']),
        initiatedBy: getVal(['initiatedby', 'salesperson', 'createdby', 'initiator']),
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
        assignedTo: getVal(['assignedto', 'owner', 'assignee', 'handler']),
        createdDate: getVal(['createddate', 'date', 'creationdate'], true) || new Date().toISOString()
      });
    });

    let allCases = await Case.find({}, 'caseId');
    const finalCases = [];

    for (let row of results) {
      row.caseId = generateCaseId(row.brandName, row.companyName, allCases);
      allCases.push({ caseId: row.caseId });
      finalCases.push(row);
    }

    await Case.insertMany(finalCases);

    const timelineEntries = finalCases.map(c => ({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: c.caseId,
      eventDate: new Date().toISOString(),
      source: 'System',
      eventType: 'Case Created',
      summary: 'Imported: Bulk Import via File'
    }));
    await Timeline.insertMany(timelineEntries);

    fs.unlinkSync(req.file.path);
    res.status(201).json({ message: `Successfully imported ${finalCases.length} cases.` });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.generateCaseId = generateCaseId;
