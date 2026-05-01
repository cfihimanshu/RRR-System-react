const express = require('express');
const Action = require('../models/Action');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.caseId ? { caseId: req.query.caseId } : {};
    const docs = await Action.find(query).sort({ dateTime: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const doc = new Action(req.body);
    await doc.save();
    
    const timeline = new Timeline({
        id: Date.now().toString(),
        caseId: doc.caseId,
        eventDate: doc.dateTime,
        source: req.user.fullName || 'Action',
        eventType: doc.actionType,
        summary: doc.remarks || doc.summary
    });
    await timeline.save();

    // Send Email Alert if Next Action Date is set
    if (doc.nextActionDate) {
      try {
        const { sendEmail } = require('../utils/mailer');
        const formattedDate = new Date(doc.nextActionDate).toLocaleString('en-IN', {
          dateStyle: 'full',
          timeStyle: 'short'
        });
        
        const subject = `🔔 Next Action Reminder: ${doc.caseId}`;
        const html = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #1a73e8;">Next Action Set</h2>
            <p>You have scheduled a next action for case <strong>${doc.caseId}</strong>.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Action Required:</strong> ${doc.nextAction || 'Follow up'}</p>
              <p><strong>Scheduled For:</strong> ${formattedDate}</p>
            </div>
            <p style="color: #666; font-size: 12px;">This is an automated reminder from RRR System.</p>
          </div>
        `;
        
        await sendEmail(req.user.email, subject, '', html);
      } catch (err) {
        console.error('Action Email Alert Error:', err);
      }
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
