const express = require('express');
const LegalRequest = require('../sql_models/LegalRequest');
const LegalProcess = require('../sql_models/LegalProcess');
const Timeline = require('../sql_models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Create new legal request
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Legal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only Legal and Admin users can submit draft requests.' });
    }
    const payload = req.body;
    payload.requestedBy = req.user.email;
    payload.requestedByName = req.user.fullName || req.user.name || "";
    payload.status = 'Pending';

    const reqDoc = await LegalRequest.create(payload);

    // Create log in legal_processes
    await LegalProcess.create({
      caseId: reqDoc.caseId,
      stage: 'Draft',
      summary: `DRAFT_JSON:${JSON.stringify({
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: 'Pending',
        remark: reqDoc.remark || ''
      })}`,
      submittedBy: req.user.fullName || req.user.email
    });

    // Create log in timelines (History DB)
    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: reqDoc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Progress Update',
      summary: `Legal Notice: Draft Request — Doc: ${reqDoc.documentName || ''}, Status: Pending`,
      details: reqDoc.remark || '',
      metadata: {
        stage: 'Draft Request',
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: 'Pending',
        remark: reqDoc.remark || ''
      }
    });

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

    // Create log in legal_processes
    await LegalProcess.create({
      caseId: reqDoc.caseId,
      stage: status === 'Approved' ? 'Draft Approved' : 'Draft Rejected',
      summary: `DRAFT_STATUS_JSON:${JSON.stringify({
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: status,
        rejectRemark: rejectRemark || ''
      })}`,
      submittedBy: req.user.fullName || req.user.email
    });

    // Create log in timelines (History DB)
    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: reqDoc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Progress Update',
      summary: `Legal Notice: Draft Status Update — Doc: ${reqDoc.documentName || ''}, Status: ${status}`,
      details: rejectRemark || '',
      metadata: {
        stage: status === 'Approved' ? 'Draft Approved' : 'Draft Rejected',
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: status,
        rejectRemark: rejectRemark || ''
      }
    });

    const data = reqDoc.toJSON();
    data._id = data.id;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update legal request details
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Legal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only Legal and Admin users can edit draft requests.' });
    }
    const { id } = req.params;
    const reqDoc = await LegalRequest.findByPk(id);
    if (!reqDoc) {
      return res.status(404).json({ error: 'Legal request not found' });
    }

    const { documentName, fileLink, remark } = req.body;

    await reqDoc.update({
      documentName: documentName !== undefined ? documentName : reqDoc.documentName,
      fileLink: fileLink !== undefined ? fileLink : reqDoc.fileLink,
      remark: remark !== undefined ? remark : reqDoc.remark
    });

    // Update the corresponding legal_processes log (Draft status/info)
    const lpRecord = await LegalProcess.findOne({
      where: {
        caseId: reqDoc.caseId,
        stage: 'Draft'
      }
    });
    if (lpRecord) {
      await lpRecord.update({
        summary: `DRAFT_JSON:${JSON.stringify({
          documentName: reqDoc.documentName,
          fileLink: reqDoc.fileLink || '',
          status: reqDoc.status,
          remark: reqDoc.remark || ''
        })}`
      });
    }

    const data = reqDoc.toJSON();
    data._id = data.id;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
