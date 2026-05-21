const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Agreement = require('../models/Agreement');

// POST /api/agreements/generate - Generate PDF and save record
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return res.status(500).json({
        error: 'Google Apps Script URL is not configured in backend .env'
      });
    }

    console.log(`[AGREEMENT] Calling Google Apps Script Web App for PDF generation...`);
    
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.error(`[AGREEMENT] Apps Script Error: ${result.error}`);
      return res.status(500).json({ error: result.error });
    }

    if (!result.pdf) {
      console.error(`[AGREEMENT] PDF data missing from Apps Script response`);
      return res.status(500).json({ error: 'PDF data missing from Apps Script response' });
    }

    // Save agreement record in DB
    try {
      await Agreement.create({
        generatedBy: req.user.email,
        generatedByName: req.user.fullName || req.user.name || '',
        clientName: data.ClientName || '',
        firstPartyCompany: data.FirstPartyCompany || '',
        secondCompany: data.SecondCompany || '',
        settlementAmount: Number((data.Amount || '0').toString().replace(/,/g, '')) || 0,
        amountInWords: data.AmountInWords || '',
        date: data.Date || '',
        installments: data.Installments || [],
      });
    } catch (saveErr) {
      console.error('[AGREEMENT] Failed to save agreement record:', saveErr.message);
      // Don't fail the PDF response even if DB save fails
    }

    const buffer = Buffer.from(result.pdf, 'base64');
    console.log('[AGREEMENT] PDF generated successfully via Apps Script.');

    res.set({
      'Content-Disposition': 'attachment; filename="Agreement.pdf"',
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length
    });
    res.send(buffer);

  } catch (error) {
    console.error(`[AGREEMENT] Route Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agreements - Get agreements for logged-in user (Admin sees all)
router.get('/', verifyToken, async (req, res) => {
  try {
    const isAdmin = ['Admin', 'Reviewer'].includes(req.user.role);
    const query = isAdmin ? {} : { generatedBy: req.user.email };
    const agreements = await Agreement.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(agreements);
  } catch (error) {
    console.error('[AGREEMENT] GET Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/agreements/:id - Delete an agreement record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    // Only allow deletion by the creator or Admin
    const isAdmin = ['Admin', 'Reviewer'].includes(req.user.role);
    if (!isAdmin && agreement.generatedBy !== req.user.email) {
      return res.status(403).json({ error: 'Not authorized to delete this agreement' });
    }

    await Agreement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Agreement deleted' });
  } catch (error) {
    console.error('[AGREEMENT] DELETE Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
