const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

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

module.exports = router;
