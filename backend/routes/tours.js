const express = require('express');
const { Sequelize, Op } = require('sequelize');
const TourRequest = require('../sql_models/TourRequest');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/departments', verifyToken, async (req, res) => {
  try {
    const User = require('../sql_models/User');
    const roles = await User.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('role')), 'role']],
      where: {
        role: { [Op.notIn]: ['Admin', 'Super Admin', 'SuperAdmin'] }
      }
    });
    
    const roleNames = roles.map(r => r.role).filter(r => r && r.trim() !== '');
    res.json(roleNames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    payload.requestedBy = req.user.email;
    payload.requestedByName = req.user.fullName || req.user.name || "";
    const year = new Date().getFullYear();
    let nextNum = await TourRequest.count() + 1;
    let newReqId = `TR-${year}-${String(nextNum).padStart(4, '0')}`;
    
    let exists = await TourRequest.findOne({ where: { reqId: newReqId } });
    while (exists) {
      nextNum++;
      newReqId = `TR-${year}-${String(nextNum).padStart(4, '0')}`;
      exists = await TourRequest.findOne({ where: { reqId: newReqId } });
    }
    
    payload.reqId = newReqId;
    payload.timestamp = new Date().toISOString();
    payload.status = 'Pending Review';

    if (payload.destinationFrom || payload.destinationTo) {
      payload.destination = `${payload.destinationFrom || ''} to ${payload.destinationTo || ''}`;
    }

    const tour = await TourRequest.create(payload);

    const doc = tour.toJSON();
    doc._id = doc.id;

    if (doc.destination && doc.destination.includes(' to ')) {
      const parts = doc.destination.split(' to ');
      doc.destinationFrom = parts[0] || '';
      doc.destinationTo = parts[1] || '';
    } else {
      doc.destinationFrom = '';
      doc.destinationTo = doc.destination || '';
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }
    const list = await TourRequest.findAll({
      where: query,
      order: [['timestamp', 'DESC']]
    });
    const formatted = list.map(l => {
      const d = l.toJSON();
      d._id = d.id;
      if (d.destination && d.destination.includes(' to ')) {
        const parts = d.destination.split(' to ');
        d.destinationFrom = parts[0] || '';
        d.destinationTo = parts[1] || '';
      } else {
        d.destinationFrom = '';
        d.destinationTo = d.destination || '';
      }
      return d;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const tour = await TourRequest.findByPk(req.params.id);
    if (!tour) return res.status(404).json({ error: 'Tour request not found' });

    await tour.update({ status });

    let destinationTo = '';
    if (tour.destination && tour.destination.includes(' to ')) {
      destinationTo = tour.destination.split(' to ')[1] || '';
    } else {
      destinationTo = tour.destination || '';
    }

    const { sendEmail } = require('../utils/mailer');
    if (status === 'Approved') {
      try {
        const textContent = `Dear ${tour.requestedByName},\n\nYour Travel Request ${tour.reqId} to ${destinationTo} has been APPROVED.\n\nDetails:\nTravel Dates: ${tour.startDate} to ${tour.endDate}\nMode of Travel: ${tour.travellingBy}\nTotal Estimated Amount: ₹${tour.totalTravelAmount}\n\nBest Regards,\nTravel Desk`;
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #10b981;">Travel Request Approved</h2>
            <p>Dear <strong>${tour.requestedByName}</strong>,</p>
            <p>Your Travel Request <strong>${tour.reqId}</strong> to <strong>${destinationTo}</strong> has been <strong>APPROVED</strong>.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Travel Request ID</td><td style="padding: 8px 0;">${tour.reqId}</td></tr>
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Travel Dates</td><td style="padding: 8px 0;">${tour.startDate} to ${tour.endDate}</td></tr>
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Mode of Travel</td><td style="padding: 8px 0;">${tour.travellingBy}</td></tr>
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Total Estimated Cost</td><td style="padding: 8px 0;">₹${tour.totalTravelAmount}</td></tr>
            </table>
            <p style="margin-top: 25px; font-size: 12px; color: #888;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        `;
        if (tour.requestedBy) {
          await sendEmail(tour.requestedBy, `Travel Request ${tour.reqId} Approved`, textContent, htmlContent);
        }
        if (req.user.email && req.user.email !== tour.requestedBy) {
          await sendEmail(req.user.email, `Approved Travel Request Notification: ${tour.reqId}`, textContent, htmlContent);
        }
      } catch (mailErr) {
        console.error('[MAIL] Failed to send approval mail:', mailErr);
      }
    } else if (status === 'Rejected') {
      try {
        const textContent = `Dear ${tour.requestedByName},\n\nYour Travel Request ${tour.reqId} to ${destinationTo} has been REJECTED.\n\nYou can log in to the Travel Management Portal, view this request at the bottom, modify the details, and re-submit it.\n\nBest Regards,\nTravel Desk`;
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #ef4444;">Travel Request Rejected</h2>
            <p>Dear <strong>${tour.requestedByName}</strong>,</p>
            <p>Your Travel Request <strong>${tour.reqId}</strong> to <strong>${destinationTo}</strong> has been <strong>REJECTED</strong>.</p>
            <p>You can edit and re-submit this request in your Travel Management Portal dashboard.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Travel Request ID</td><td style="padding: 8px 0;">${tour.reqId}</td></tr>
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Destination</td><td style="padding: 8px 0;">${destinationTo}</td></tr>
            </table>
            <p style="margin-top: 25px; font-size: 12px; color: #888;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        `;
        if (tour.requestedBy) {
          await sendEmail(tour.requestedBy, `Travel Request ${tour.reqId} Rejected`, textContent, htmlContent);
        }
      } catch (mailErr) {
        console.error('[MAIL] Failed to send rejection mail:', mailErr);
      }
    }

    const doc = tour.toJSON();
    doc._id = doc.id;
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/reimbursement/:reqId', verifyToken, async (req, res) => {
  try {
    const { reqId } = req.params;
    const updateFields = req.body;
    
    const tour = await TourRequest.findOne({ where: { reqId } });
    if (!tour) {
      return res.status(404).json({ error: 'Tour request not found' });
    }
    
    if (updateFields.destinationFrom || updateFields.destinationTo) {
      updateFields.destination = `${updateFields.destinationFrom || ''} to ${updateFields.destinationTo || ''}`;
    }

    await tour.update(updateFields);
    
    const doc = tour.toJSON();
    doc._id = doc.id;

    if (doc.destination && doc.destination.includes(' to ')) {
      const parts = doc.destination.split(' to ');
      doc.destinationFrom = parts[0] || '';
      doc.destinationTo = parts[1] || '';
    } else {
      doc.destinationFrom = '';
      doc.destinationTo = doc.destination || '';
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    payload.status = 'Pending Review';
    payload.timestamp = new Date().toISOString();

    const tour = await TourRequest.findByPk(req.params.id);
    if (!tour) return res.status(404).json({ error: 'Tour request not found' });
    
    if (payload.destinationFrom || payload.destinationTo) {
      payload.destination = `${payload.destinationFrom || ''} to ${payload.destinationTo || ''}`;
    }

    await tour.update(payload);
    
    const doc = tour.toJSON();
    doc._id = doc.id;

    if (doc.destination && doc.destination.includes(' to ')) {
      const parts = doc.destination.split(' to ');
      doc.destinationFrom = parts[0] || '';
      doc.destinationTo = parts[1] || '';
    } else {
      doc.destinationFrom = '';
      doc.destinationTo = doc.destination || '';
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
