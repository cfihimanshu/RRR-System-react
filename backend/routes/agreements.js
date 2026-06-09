const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Agreement = require('../sql_models/Agreement');

// POST /api/agreements/generate - Generate PDF and save record
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    let pdfBase64 = data.pdfBase64;

    if (!pdfBase64) {
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

      const rawText = await response.text();

      if (!response.ok || rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
        const match = rawText.match(/monospace[^>]*>([^<]+)/);
        const scriptError = match ? match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : `HTTP ${response.status}`;
        console.error(`[AGREEMENT] Apps Script returned HTML error page: ${scriptError}`);
        return res.status(500).json({ error: `Google Apps Script Error: ${scriptError}` });
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseErr) {
        console.error(`[AGREEMENT] Failed to parse Apps Script response as JSON: ${rawText.substring(0, 200)}`);
        return res.status(500).json({ error: 'Apps Script returned an unexpected response. Check the script for errors.' });
      }

      if (result.error) {
        console.error(`[AGREEMENT] Apps Script Error: ${result.error}`);
        return res.status(500).json({ error: result.error });
      }

      if (!result.pdf) {
        console.error(`[AGREEMENT] PDF data missing from Apps Script response`);
        return res.status(500).json({ error: 'PDF data missing from Apps Script response' });
      }

      pdfBase64 = result.pdf;
    }

    // Save agreement record in DB
    let agreementId;
    try {
      const doc = await Agreement.create({
        generatedBy: req.user.email,
        generatedByName: req.user.fullName || req.user.name || '',
        clientName: data.ClientName || '',
        firstPartyCompany: data.FirstPartyCompany || '',
        secondCompany: data.SecondCompany || '',
        settlementAmount: Number((data.Amount || '0').toString().replace(/,/g, '')) || 0,
        amountInWords: data.AmountInWords || '',
        date: data.Date || '',
        installments: data.Installments || [],
        address: data.Address || '',
        pincode: data.Pincode || '',
        firstPartySignatory: data.FirstPartyName || '',
        secondPartySignatory: data.SecondPartyName || '',
        templateId: data.templateId || '',
        pdfBase64: pdfBase64
      });
      agreementId = doc.id;
      // Update with correct URL using the auto-generated ID
      await doc.update({ pdfUrl: `/api/agreements/download/${agreementId}` });
    } catch (saveErr) {
      console.error('[AGREEMENT] Failed to save agreement record:', saveErr.message);
      return res.status(500).json({ error: 'Failed to save agreement record' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');
    console.log('[AGREEMENT] PDF saved and served successfully.');

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
    const isAdmin = ['Admin', 'Reviewer', 'Super Admin', 'SuperAdmin'].includes(req.user.role);
    const query = isAdmin ? {} : { generatedBy: req.user.email };
    const agreements = await Agreement.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    const formatted = agreements.map(a => {
      const j = a.toJSON();
      j._id = j.id;
      return j;
    });
    res.json(formatted);
  } catch (error) {
    console.error('[AGREEMENT] GET Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/agreements/:id - Delete an agreement record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const agreement = await Agreement.findByPk(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const isAdmin = ['Admin', 'Reviewer', 'Super Admin', 'SuperAdmin'].includes(req.user.role);
    if (!isAdmin && agreement.generatedBy !== req.user.email) {
      return res.status(403).json({ error: 'Not authorized to delete this agreement' });
    }

    await agreement.destroy();
    res.json({ success: true, message: 'Agreement deleted' });
  } catch (error) {
    console.error('[AGREEMENT] DELETE Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agreements/download/:id - Stream stored PDF
router.get('/download/:id', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const queryToken = req.query.token;
    const token = (authHeader ? authHeader.split(' ').pop() : null) || queryToken;

    if (!token) {
      return res.status(403).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const agreement = await Agreement.findByPk(req.params.id);
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    const isAdmin = ['Admin', 'Reviewer', 'Super Admin', 'SuperAdmin'].includes(decoded.role);
    if (!isAdmin && agreement.generatedBy !== decoded.email) {
      return res.status(403).json({ error: 'Not authorized to view this agreement' });
    }

    if (!agreement.pdfBase64) {
      return res.status(404).json({ error: 'PDF data not found for this agreement' });
    }

    const buffer = Buffer.from(agreement.pdfBase64, 'base64');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${agreement.clientName.replace(/\\s+/g, '_')}_Agreement.pdf"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (error) {
    console.error('[AGREEMENT] Download Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
