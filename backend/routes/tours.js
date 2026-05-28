const express = require('express');
const TourRequest = require('../models/TourRequest');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get list of unique departments mapped to user roles
router.get('/departments', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const roles = await User.distinct('role', {
      role: { $nin: ['Admin', 'Super Admin', 'SuperAdmin'] }
    });
    const filtered = roles.filter(r => r && r.trim() !== '');
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new tour request
router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    payload.requestedBy = req.user.email;
    payload.requestedByName = req.user.fullName || req.user.name || "";
    const year = new Date().getFullYear();
    let nextNum = await TourRequest.countDocuments() + 1;
    let newReqId = `TR-${year}-${String(nextNum).padStart(4, '0')}`;
    let exists = await TourRequest.findOne({ reqId: newReqId });
    while (exists) {
      nextNum++;
      newReqId = `TR-${year}-${String(nextNum).padStart(4, '0')}`;
      exists = await TourRequest.findOne({ reqId: newReqId });
    }
    payload.reqId = newReqId;
    payload.timestamp = new Date().toISOString();
    payload.status = 'Pending Review';

    const tour = new TourRequest(payload);
    await tour.save();

    res.status(201).json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tour requests
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      query.requestedBy = req.user.email;
    }
    const list = await TourRequest.find(query).sort({ timestamp: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tour request status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const tour = await TourRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!tour) return res.status(404).json({ error: 'Tour request not found' });

    // Send emails on status change
    const { sendEmail } = require('../utils/mailer');
    if (status === 'Approved') {
      try {
        console.log(`[MAIL] Attempting to send approval emails for Tour ${tour.reqId}. User: ${tour.requestedBy}, Admin: ${req.user.email}`);
        const textContent = `Dear ${tour.requestedByName},\n\nYour Travel Request ${tour.reqId} to ${tour.destinationTo} has been APPROVED.\n\nDetails:\nTravel Dates: ${tour.startDate} to ${tour.endDate}\nMode of Travel: ${tour.travellingBy}\nTotal Estimated Amount: ₹${tour.totalTravelAmount}\n\nBest Regards,\nTravel Desk`;
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #10b981;">Travel Request Approved</h2>
            <p>Dear <strong>${tour.requestedByName}</strong>,</p>
            <p>Your Travel Request <strong>${tour.reqId}</strong> to <strong>${tour.destinationTo}</strong> has been <strong>APPROVED</strong>.</p>
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
          console.log(`[MAIL] Sending approval mail to requesting user: ${tour.requestedBy}`);
          await sendEmail(tour.requestedBy, `Travel Request ${tour.reqId} Approved`, textContent, htmlContent);
        }
        if (req.user.email && req.user.email !== tour.requestedBy) {
          console.log(`[MAIL] Sending approval notification to admin: ${req.user.email}`);
          await sendEmail(req.user.email, `Approved Travel Request Notification: ${tour.reqId}`, textContent, htmlContent);
        }
        console.log(`[MAIL] Approval emails sent successfully for Tour ${tour.reqId}`);
      } catch (mailErr) {
        console.error('[MAIL] Failed to send approval mail:', mailErr);
      }
    } else if (status === 'Rejected') {
      try {
        console.log(`[MAIL] Attempting to send rejection email for Tour ${tour.reqId} to User: ${tour.requestedBy}`);
        const textContent = `Dear ${tour.requestedByName},\n\nYour Travel Request ${tour.reqId} to ${tour.destinationTo} has been REJECTED.\n\nYou can log in to the Travel Management Portal, view this request at the bottom, modify the details, and re-submit it.\n\nBest Regards,\nTravel Desk`;
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #ef4444;">Travel Request Rejected</h2>
            <p>Dear <strong>${tour.requestedByName}</strong>,</p>
            <p>Your Travel Request <strong>${tour.reqId}</strong> to <strong>${tour.destinationTo}</strong> has been <strong>REJECTED</strong>.</p>
            <p>You can edit and re-submit this request in your Travel Management Portal dashboard.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Travel Request ID</td><td style="padding: 8px 0;">${tour.reqId}</td></tr>
              <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px 0; font-weight: bold;">Destination</td><td style="padding: 8px 0;">${tour.destinationTo}</td></tr>
            </table>
            <p style="margin-top: 25px; font-size: 12px; color: #888;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        `;
        if (tour.requestedBy) {
          console.log(`[MAIL] Sending rejection mail to user: ${tour.requestedBy}`);
          await sendEmail(tour.requestedBy, `Travel Request ${tour.reqId} Rejected`, textContent, htmlContent);
        }
        console.log(`[MAIL] Rejection email sent successfully for Tour ${tour.reqId}`);
      } catch (mailErr) {
        console.error('[MAIL] Failed to send rejection mail:', mailErr);
      }
    }

    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit reimbursement for a tour request by its reqId
router.put('/reimbursement/:reqId', verifyToken, async (req, res) => {
  try {
    const { reqId } = req.params;
    const updateFields = req.body;
    
    const updatedTour = await TourRequest.findOneAndUpdate(
      { reqId },
      { $set: updateFields },
      { new: true }
    );
    
    if (!updatedTour) {
      return res.status(404).json({ error: 'Tour request not found' });
    }
    
    res.json(updatedTour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update travel request details (edit & resubmit)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    // Set status back to 'Pending Review' so the approval cycle runs again
    payload.status = 'Pending Review';
    payload.timestamp = new Date().toISOString();

    const tour = await TourRequest.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true }
    );
    if (!tour) return res.status(404).json({ error: 'Tour request not found' });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
