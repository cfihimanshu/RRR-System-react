const express = require('express');
const LegalRequest = require('../sql_models/LegalRequest');
const LegalProcess = require('../sql_models/LegalProcess');
const Timeline = require('../sql_models/Timeline');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationHelper');
const { sendEmail } = require('../utils/mailer');
const { Op } = require('sequelize');
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
    payload.status = req.user.role === 'Legal' ? 'Pending BD Head' : 'Pending';

    const reqDoc = await LegalRequest.create(payload);

    // Create log in legal_processes
    await LegalProcess.create({
      caseId: reqDoc.caseId,
      stage: 'Draft',
      summary: `DRAFT_JSON:${JSON.stringify({
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: payload.status,
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
      summary: `Legal Notice: Draft Request — Doc: ${reqDoc.documentName || ''}, Status: ${payload.status}`,
      details: reqDoc.remark || '',
      metadata: {
        stage: 'Draft Request',
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: payload.status,
        remark: reqDoc.remark || ''
      }
    });

    // Send email to appropriate recipient (BD Head or Admins) for approval/review request
    try {
      const recipientRole = payload.status === 'Pending BD Head' ? 'BD Head' : 'Admin';
      const targetUsers = await User.findAll({
        where: {
          role: recipientRole === 'BD Head' ? 'BD Head' : { [Op.in]: ['Admin', 'Super Admin', 'SuperAdmin'] }
        }
      });
      const recipientEmails = targetUsers.map(u => u.email).filter(Boolean);
      if (recipientEmails.length > 0) {
        const subject = recipientRole === 'BD Head' 
          ? `New Legal Notice Draft Review Request - Case #${reqDoc.caseId}` 
          : `New Legal Notice Draft Approval Request - Case #${reqDoc.caseId}`;
        const text = `Hello ${recipientRole},

A new legal notice draft has been submitted and is pending your ${recipientRole === 'BD Head' ? 'review/recommendation' : 'approval'}.

Details:
- Case ID: ${reqDoc.caseId}
- Document Name: ${reqDoc.documentName}
- Requested By: ${reqDoc.requestedByName} (${reqDoc.requestedBy})
- Remark: ${reqDoc.remark || 'N/A'}
- File Link: ${reqDoc.fileLink || 'N/A'}

Please log in to the RRR System to review this request.`;

        const html = `<p>Hello ${recipientRole},</p>
<p>A new legal notice draft has been submitted and is pending your <strong>${recipientRole === 'BD Head' ? 'review/recommendation' : 'approval'}</strong>.</p>
<h3>Details:</h3>
<ul>
  <li><strong>Case ID:</strong> ${reqDoc.caseId}</li>
  <li><strong>Document Name:</strong> ${reqDoc.documentName}</li>
  <li><strong>Requested By:</strong> ${reqDoc.requestedByName} (${reqDoc.requestedBy})</li>
  <li><strong>Remark:</strong> ${reqDoc.remark || 'N/A'}</li>
  <li><strong>File Link:</strong> <a href="${reqDoc.fileLink || '#'}">${reqDoc.fileLink || 'N/A'}</a></li>
</ul>
<p>Please log in to the RRR System to review this request.</p>`;

        await sendEmail(recipientEmails.join(','), subject, text, html);
      }
    } catch (err) {
      console.error('Error sending draft request email:', err);
    }

    // Send notifications to appropriate roles
    try {
      await createNotification(
        payload.status === 'Pending BD Head' ? ['BD Head', 'Legal'] : ['Admin', 'Legal'],
        payload.status === 'Pending BD Head' ? 'New Draft Review Request' : 'New Draft Approval Request',
        `New draft request for Case ${reqDoc.caseId} submitted by ${reqDoc.requestedByName}`,
        'Legal',
        `/case-master?search=${reqDoc.caseId}`
      );
    } catch (err) {
      console.error('Error creating draft request notification:', err);
    }

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
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'BD Head'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const { status, rejectRemark, remark } = req.body;
    if (!['Approved', 'Rejected', 'Pending', 'Pending BD Head'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const reqDoc = await LegalRequest.findByPk(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ error: 'Legal request not found' });
    }

    if (req.user.role === 'BD Head') {
      if (reqDoc.status !== 'Pending BD Head') {
        return res.status(400).json({ error: 'BD Head can only forward requests pending BD Head approval.' });
      }
      if (status !== 'Pending' && status !== 'Rejected') {
        return res.status(400).json({ error: 'BD Head can only forward to Admin or Reject.' });
      }
    }
    
    const updateData = { status };
    if (rejectRemark !== undefined) {
      updateData.rejectRemark = rejectRemark;
    }
    if (req.user.role === 'BD Head' && remark !== undefined) {
      updateData.remark = remark;
    }
    await reqDoc.update(updateData);

    // Create log in legal_processes
    await LegalProcess.create({
      caseId: reqDoc.caseId,
      stage: status === 'Approved' ? 'Draft Approved' : status === 'Rejected' ? 'Draft Rejected' : 'Draft Recommended',
      summary: `DRAFT_STATUS_JSON:${JSON.stringify({
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: status,
        rejectRemark: rejectRemark || '',
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
      summary: `Legal Notice: Draft Status Update — Doc: ${reqDoc.documentName || ''}, Status: ${status === 'Pending' ? 'Recommended by BD Head' : status}`,
      details: rejectRemark || reqDoc.remark || '',
      metadata: {
        stage: status === 'Approved' ? 'Draft Approved' : status === 'Rejected' ? 'Draft Rejected' : 'Draft Recommended',
        documentName: reqDoc.documentName,
        fileLink: reqDoc.fileLink || '',
        status: status,
        rejectRemark: rejectRemark || '',
        remark: reqDoc.remark || ''
      }
    });

    // Send email notifications
    if (status === 'Pending') {
      try {
        const admins = await User.findAll({
          where: { role: { [Op.in]: ['Admin', 'Super Admin', 'SuperAdmin'] } }
        });
        const adminEmails = admins.map(u => u.email).filter(Boolean);
        if (adminEmails.length > 0) {
          const subject = `BD Head Forwarded Legal Notice Draft - Case #${reqDoc.caseId}`;
          const text = `Hello Admin,

A legal notice draft has been reviewed by the BD Head and forwarded to you for final approval.

Details:
- Case ID: ${reqDoc.caseId}
- Document Name: ${reqDoc.documentName}
- Requested By: ${reqDoc.requestedByName} (${reqDoc.requestedBy})
- BD Head Recommendation / Remark: ${reqDoc.remark || 'N/A'}
- File Link: ${reqDoc.fileLink || 'N/A'}

Please log in to review and approve/reject this request.`;

          const html = `<p>Hello Admin,</p>
<p>A legal notice draft has been reviewed by the BD Head and forwarded to you for final approval.</p>
<h3>Details:</h3>
<ul>
  <li><strong>Case ID:</strong> ${reqDoc.caseId}</li>
  <li><strong>Document Name:</strong> ${reqDoc.documentName}</li>
  <li><strong>Requested By:</strong> ${reqDoc.requestedByName} (${reqDoc.requestedBy})</li>
  <li><strong>BD Head Recommendation:</strong> ${reqDoc.remark || 'N/A'}</li>
  <li><strong>File Link:</strong> <a href="${reqDoc.fileLink || '#'}">${reqDoc.fileLink || 'N/A'}</a></li>
</ul>
<p>Please log in to review and approve/reject this request.</p>`;

          await sendEmail(adminEmails.join(','), subject, text, html);
        }
      } catch (err) {
        console.error('Error sending forwarded draft email to admins:', err);
      }
      
      try {
        await createNotification(
          ['Admin'],
          'Forwarded Draft Approval Request',
          `BD Head forwarded draft approval request for Case ${reqDoc.caseId}`,
          'Legal',
          `/case-master?search=${reqDoc.caseId}`
        );
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    } else {
      if (reqDoc.requestedBy) {
        try {
          const subject = `Legal Notice Draft Status Update - Case #${reqDoc.caseId} [${status}]`;
          const text = `Hello ${reqDoc.requestedByName || 'Legal User'},

Your legal notice draft submission has been ${status.toLowerCase()} by the Admin.

Details:
- Case ID: ${reqDoc.caseId}
- Document Name: ${reqDoc.documentName}
- Status: ${status}
${status === 'Rejected' ? `- Rejection Remark: ${rejectRemark || 'N/A'}` : ''}
- Action By: ${req.user.fullName || req.user.email}

Please log in to the RRR System to view details.`;

          const html = `<p>Hello ${reqDoc.requestedByName || 'Legal User'},</p>
<p>Your legal notice draft submission has been <strong>${status.toLowerCase()}</strong> by the Admin.</p>
<h3>Details:</h3>
<ul>
  <li><strong>Case ID:</strong> ${reqDoc.caseId}</li>
  <li><strong>Document Name:</strong> ${reqDoc.documentName}</li>
  <li><strong>Status:</strong> ${status}</li>
  ${status === 'Rejected' ? `<li><strong>Rejection Remark:</strong> ${rejectRemark || 'N/A'}</li>` : ''}
  <li><strong>Action By:</strong> ${req.user.fullName || req.user.email}</li>
</ul>
<p>Please log in to the RRR System to view details.</p>`;

          await sendEmail(reqDoc.requestedBy, subject, text, html);
        } catch (err) {
          console.error('Error sending draft status update email to requestor:', err);
        }
      }

      try {
        await createNotification(
          ['Admin', 'Legal'],
          `Draft Status Updated: ${status}`,
          `Legal notice draft for Case ${reqDoc.caseId} has been ${status.toLowerCase()}`,
          'Legal',
          `/case-master?search=${reqDoc.caseId}`
        );
      } catch (err) {
        console.error('Error creating draft status update notification:', err);
      }
    }

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
