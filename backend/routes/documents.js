const express = require('express');
const { Op } = require('sequelize');
const Document = require('../sql_models/Document');
const AuditLog = require('../sql_models/AuditLog');
const Timeline = require('../sql_models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.caseId ? { caseId: req.query.caseId } : {};
    const docs = await Document.findAll({
      where: query,
      order: [['uploadDate', 'DESC']]
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const existingCount = await Document.count({ where: { caseId: req.body.caseId } });
    const docId = `DOC-${req.body.caseId}-${String(existingCount + 1).padStart(3, '0')}`;
    const uploader = req.user.fullName || req.user.email || 'System';
    
    const doc = await Document.create({ ...req.body, docId, uploadedBy: uploader });
    
    await AuditLog.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'Document Uploaded',
      description: `Uploaded document for case ${doc.caseId}`,
      caseId: doc.caseId
    });

    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
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
    const oldDoc = await Document.findByPk(id);
    if (!oldDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await oldDoc.update(req.body);
    const updatedDoc = oldDoc;

    try {
      // Need to use JSON extract for MySQL or just a broad search since metadata is JSON
      // In Sequelize querying exact JSON matches in where clause can be tricky
      // So we will fetch first by eventType and caseId and filter in JS if needed
      const timelineEvents = await Timeline.findAll({
        where: {
          caseId: oldDoc.caseId,
          eventType: 'Document Upload'
        }
      });
      
      const timelineEvent = timelineEvents.find(t => t.metadata && t.metadata.fileLink === oldDoc.fileLink);

      if (timelineEvent) {
        await timelineEvent.update({
          summary: `Document Updated: ${updatedDoc.docType}`,
          details: `File: ${updatedDoc.fileLink?.split('/').pop() || updatedDoc.fileSummary || 'Unnamed'}. Remarks: ${updatedDoc.remarks || 'None'}`,
          metadata: {
            ...(timelineEvent.metadata || {}),
            docType: updatedDoc.docType,
            fileSummary: updatedDoc.fileSummary,
            fileLink: updatedDoc.fileLink,
            remarks: updatedDoc.remarks
          }
        });
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on document update:', timelineErr);
    }

    await AuditLog.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
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
