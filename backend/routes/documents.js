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

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { id } = req.params;
    const oldDoc = await Document.findById(id);
    if (!oldDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updatedDoc = await Document.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    // Sync timeline
    try {
      const Timeline = require('../models/Timeline');
      const timelineEvent = await Timeline.findOne({
        caseId: oldDoc.caseId,
        eventType: 'Document Upload',
        'metadata.fileLink': oldDoc.fileLink
      });

      if (timelineEvent) {
        timelineEvent.summary = `Document Updated: ${updatedDoc.docType}`;
        timelineEvent.details = `File: ${updatedDoc.fileLink?.split('/').pop() || updatedDoc.fileSummary || 'Unnamed'}. Remarks: ${updatedDoc.remarks || 'None'}`;
        timelineEvent.metadata = {
          ...timelineEvent.metadata,
          docType: updatedDoc.docType,
          fileSummary: updatedDoc.fileSummary,
          fileLink: updatedDoc.fileLink,
          remarks: updatedDoc.remarks
        };
        await timelineEvent.save();
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on document update:', timelineErr);
    }

    // Add Audit Log
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Document Updated',
      description: `Updated document (${updatedDoc.docType}) for case ${updatedDoc.caseId}`,
      caseId: updatedDoc.caseId
    });

    res.json(updatedDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
