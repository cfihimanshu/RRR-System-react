const express = require('express');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.caseId ? { caseId: req.query.caseId } : {};
    const docs = await Document.find(query).sort({ uploadDate: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const existingCount = await Document.countDocuments({ caseId: req.body.caseId });
    const docId = `DOC-${req.body.caseId}-${String(existingCount + 1).padStart(3, '0')}`;
    const doc = new Document({ ...req.body, docId });
    await doc.save();
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Document Uploaded',
      description: `Uploaded document for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    const Timeline = require('../models/Timeline');
    await Timeline.create({
      id: Date.now().toString(),
      caseId: doc.caseId,
      eventDate: new Date().toISOString(),
      source: req.user.fullName || req.user.email || 'System',
      eventType: 'Document Upload',
      summary: `Document Uploaded: ${doc.docType}`,
      details: `File: ${doc.fileLink?.split('/').pop() || doc.fileSummary || 'Unnamed'}. Remarks: ${doc.remarks || 'None'}`,
      metadata: {
        docType: doc.docType,
        fileSummary: doc.fileSummary,
        fileLink: doc.fileLink,
        remarks: doc.remarks
      }
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
