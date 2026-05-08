const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to fetch Google Docs as HTML
const fetchGoogleDocsAsHtml = async (docId) => {
  return new Promise((resolve, reject) => {
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
    
    console.log(`[GOOGLE_DOCS] Fetching: ${exportUrl}`);

    const handleRequest = (url) => {
      https.get(url, { timeout: 10000 }, (response) => {
        const { statusCode } = response;

        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          return handleRequest(response.headers.location);
        }

        if (statusCode !== 200) {
          return reject(new Error(`Failed to fetch Google Doc. Status: ${statusCode}`));
        }

        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          if (data.includes('goog-signin') || data.includes('ServiceLogin')) {
            return reject(new Error('Document is not public. Please share as "Anyone with the link can view".'));
          }
          resolve(data);
        });
      }).on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });
    };

    handleRequest(exportUrl);
  });
};

const getHtmlTemplate = () => {
  try {
    const templatePath = path.join(__dirname, '../templates/agreement_template.html');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    }
  } catch (error) {}
  return `<html><body><h1>Agreement</h1><p>{{ClientName}}</p></body></html>`;
};

router.post('/generate', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const templateId = data.templateId || '1Xlkl7KkF0YgYM1ZDu-FusPi_nY4IT5Hr68SbCOPB3bA';

    console.log(`[AGREEMENT] Generating using Google Doc: ${templateId}`);

    let docHtml = '';
    let fetchError = null;
    try {
      docHtml = await fetchGoogleDocsAsHtml(templateId);
      // Strip everything outside <body>
      const bodyMatch = docHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) docHtml = bodyMatch[1];
    } catch (error) {
      console.error(`[AGREEMENT] Google Docs Error: ${error.message}`);
      fetchError = error.message;
      docHtml = `<div style="color: red; padding: 20px; border: 1px solid red;">
                  <strong>Failed to fetch Google Doc:</strong> ${fetchError}<br/>
                  Please ensure the document is shared as "Anyone with the link can view".
                </div>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 0;
            color: #1a1a1a;
          }
          .page-container {
            width: 100%;
            padding: 1.5cm 2cm;
            box-sizing: border-box;
            background: white;
          }
          /* Letterhead Header - Table based for stability */
          .header-table {
            width: 100%;
            margin-bottom: 0.5cm;
            border-bottom: 2pt solid #2b5797;
            padding-bottom: 10pt;
          }
          .logo-cell {
            width: 70px;
            vertical-align: top;
          }
          .logo-symbol {
            width: 55px;
            height: 55px;
            background: #2b5797;
            color: white;
            text-align: center;
            line-height: 55px;
            font-size: 36px;
            font-weight: bold;
            border-radius: 4px;
            display: inline-block;
          }
          .company-cell {
            vertical-align: top;
            padding-left: 15px;
          }
          .company-name {
            font-size: 26px;
            font-weight: 800;
            color: #2b5797;
            line-height: 1;
            margin-bottom: 2pt;
          }
          .company-subtitle {
            font-size: 10px;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            margin-bottom: 5pt;
          }
          .header-info {
            font-size: 9pt;
            color: #333;
            line-height: 1.3;
          }
          .contact-cell {
            vertical-align: top;
            text-align: right;
            font-size: 9pt;
            color: #2b5797;
            line-height: 1.5;
            width: 200px;
          }
          /* Title Bar */
          .title-bar {
            background: #2b5797;
            color: white;
            text-align: center;
            padding: 10px;
            font-weight: bold;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 20pt 0 30pt 0;
            width: 100%;
          }
          /* Agreement Body */
          .agreement-text {
            font-size: 12pt;
            line-height: 1.6;
            text-align: justify;
            color: #000;
          }
          .footer-line {
            position: fixed;
            bottom: 1cm;
            left: 2cm;
            right: 2cm;
            height: 4pt;
            background: #2b5797;
          }
          p { margin: 0 0 12pt 0; }
        </style>
      </head>
      <body>
        <div class="page-container">
          <table class="header-table">
            <tr>
              <td class="logo-cell">
                <div class="logo-symbol">A</div>
              </td>
              <td class="company-cell">
                <div class="company-name">ACOLYTE</div>
                <div class="company-subtitle">Acolyte Technologies Pvt. Ltd.</div>
                <div class="header-info">
                  <b>Acolyte Technologies Private Limited</b><br/>
                  7th Floor, Galaxy Avenue, Tonk Road, Bapu Nagar, Jaipur - 302015<br/>
                  CIN: U80903RJ2021PTC074781
                </div>
              </td>
              <td class="contact-cell">
                info@acolyte.co.in<br/>
                +91 92516 46173<br/>
                www.acolyte.co.in
              </td>
            </tr>
          </table>

          <div class="title-bar">
            SETTLEMENT AGREEMENT
          </div>

          <div class="agreement-text">
            ${docHtml}
          </div>

          <div class="footer-line"></div>
        </div>
      </body>
      </html>
    `;

    // Replace all placeholders
    const replacements = {
      '{{Date}}': data.Date || '_________________',
      '{{FirstPartyCompany}}': data.FirstPartyCompany || 'Startupflora',
      '{{ClientName}}': data.ClientName || '_________________',
      '{{Address}}': data.Address || '_________________',
      '{{Pincode}}': data.Pincode || '_______',
      '{{Amount}}': data.Amount || '0',
      '{{AmountInWords}}': data.AmountInWords || 'Zero only',
      '{{One (1)}}': `${data.InstallmentCountWords || 'One'} (${data.InstallmentCountNumber || '1'})`,
      '{{InstallmentDetails}}': (data.InstallmentDetails || '').replace(/\n/g, '<br/>'),
      '{{FirstPartyName}}': data.FirstPartyName || 'Authorized Signatory',
      '{{SecondCompany}}': data.SecondCompany || '_________________',
      '{{SecondPartyName}}': data.SecondPartyName || data.ClientName || '_________________'
    };

    let processedHtml = htmlContent;
    for (const [key, value] of Object.entries(replacements)) {
      processedHtml = processedHtml.split(key).join(value || '');
    }

    const options = {
      format: 'A4',
      border: { top: '0', right: '0', bottom: '0', left: '0' },
      type: 'pdf',
      timeout: 60000,
      quality: '100'
    };

    pdf.create(processedHtml, options).toBuffer((err, buffer) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.set({
        'Content-Disposition': 'attachment; filename="Agreement.pdf"',
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length
      });
      res.send(buffer);
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
