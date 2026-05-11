const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to your service account key file
const KEYFILE_PATH = path.join(__dirname, '../google-credentials.json');

router.post('/generate', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const templateId = data.templateId || '1Xlkl7KkF0YgYM1ZDu-FusPi_nY4IT5Hr68SbCOPB3bA';

    console.log(`[AGREEMENT] Generating using Google Docs API. Template: ${templateId}`);

    // Check if credentials file exists
    if (!fs.existsSync(KEYFILE_PATH)) {
      return res.status(500).json({ 
        error: 'Google credentials file missing. Please place "google-credentials.json" in the backend folder.' 
      });
    }

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive'
      ],
    });

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // 0. Cleanup ALL files in service account drive to free up quota
    try {
      console.log('[AGREEMENT] Cleaning up service account drive...');
      
      // Empty trash first to free up space from previous deletes
      try {
        await drive.files.emptyTrash();
        console.log('[AGREEMENT] Trash emptied.');
      } catch (e) {
        console.warn(`[AGREEMENT] Empty trash failed: ${e.message}`);
      }

      const listResponse = await drive.files.list({
        spaces: 'drive',
        fields: 'files(id, name)',
      });
      const files = listResponse.data.files;
      if (files && files.length > 0) {
        console.log(`[AGREEMENT] Found ${files.length} files to delete.`);
        for (const file of files) {
          await drive.files.delete({ fileId: file.id });
          console.log(`[AGREEMENT] Deleted ${file.name}`);
        }
      }
    } catch (cleanupError) {
      console.error(`[AGREEMENT] Cleanup failed: ${cleanupError.message}`);
      // Continue anyway
    }

    // 1. Make a copy of the template document
    console.log('[AGREEMENT] Creating a copy of the template...');
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: `Temp_Agreement_${Date.now()}`,
      },
    });
    const copyId = copyResponse.data.id;
    console.log(`[AGREEMENT] Copy created with ID: ${copyId}`);

    // 2. Replace text in the copy
    console.log('[AGREEMENT] Replacing text in the copy...');
    
    // Prepare requests for batchUpdate
    const requests = [
      { replaceAllText: { containsText: { text: '{{Date}}', matchCase: true }, replaceText: data.Date || '_________________' } },
      { replaceAllText: { containsText: { text: '{{FirstPartyCompany}}', matchCase: true }, replaceText: data.FirstPartyCompany || 'Startupflora' } },
      { replaceAllText: { containsText: { text: '{{ClientName}}', matchCase: true }, replaceText: data.ClientName || '_________________' } },
      { replaceAllText: { containsText: { text: '{{Address}}', matchCase: true }, replaceText: data.Address || '_________________' } },
      { replaceAllText: { containsText: { text: '{{Pincode}}', matchCase: true }, replaceText: data.Pincode || '_______' } },
      { replaceAllText: { containsText: { text: '{{Amount}}', matchCase: true }, replaceText: data.Amount || '0' } },
      { replaceAllText: { containsText: { text: '{{AmountInWords}}', matchCase: true }, replaceText: data.AmountInWords || 'Zero only' } },
      { replaceAllText: { containsText: { text: '{{One (1)}}', matchCase: true }, replaceText: `${data.InstallmentCountWords || 'One'} (${data.InstallmentCountNumber || '1'})` } },
      { replaceAllText: { containsText: { text: '{{InstallmentDetails}}', matchCase: true }, replaceText: data.InstallmentDetails || '' } },
      { replaceAllText: { containsText: { text: '{{FirstPartyName}}', matchCase: true }, replaceText: data.FirstPartyName || 'Authorized Signatory' } },
      { replaceAllText: { containsText: { text: '{{SecondCompany}}', matchCase: true }, replaceText: data.SecondCompany || '_________________' } },
      { replaceAllText: { containsText: { text: '{{SecondPartyName}}', matchCase: true }, replaceText: data.SecondPartyName || data.ClientName || '_________________' } }
    ];

    await docs.documents.batchUpdate({
      documentId: copyId,
      requestBody: {
        requests: requests,
      },
    });
    console.log('[AGREEMENT] Text replaced successfully.');

    // 3. Export the copy as PDF
    console.log('[AGREEMENT] Exporting copy as PDF...');
    const pdfResponse = await drive.files.export({
      fileId: copyId,
      mimeType: 'application/pdf',
    }, { responseType: 'arraybuffer' });

    const buffer = Buffer.from(pdfResponse.data);
    console.log('[AGREEMENT] PDF exported successfully.');

    // 4. Delete the temporary copy
    console.log('[AGREEMENT] Deleting temporary copy...');
    await drive.files.delete({
      fileId: copyId,
    });
    console.log('[AGREEMENT] Temporary copy deleted.');

    // Send the PDF back to client
    res.set({
      'Content-Disposition': 'attachment; filename="Agreement.pdf"',
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length
    });
    res.send(buffer);

  } catch (error) {
    console.error(`[AGREEMENT] Error: ${error.message}`);
    
    // Log error to a file for debugging
    try {
      const logDir = path.join(__dirname, '../scratch');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
      fs.appendFileSync(
        path.join(logDir, 'agreement_error.log'),
        `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n\n`
      );
    } catch (e) {
      console.error('Failed to write to log file:', e.message);
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
