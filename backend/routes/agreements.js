const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

router.post('/generate', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    
    // Path to the template
    const templatePath = path.resolve(__dirname, '../templates/agreement_template.docx');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template file not found at ' + templatePath });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    });

    // Render the document using the data passed from frontend
    doc.render(data);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // We will generate a PDF natively using MS Word via PowerShell
    // Use the system's temp directory which is writable on Vercel (/tmp)
    const tempDir = os.tmpdir();
    
    const tempDocxPath = path.join(tempDir, `agreement_${timestamp}.docx`);
    const tempPdfPath = path.join(tempDir, `agreement_${timestamp}.pdf`);

    // Save the Docx to disk
    fs.writeFileSync(tempDocxPath, buf);

    // PowerShell script to control MS Word and SaveAs PDF (wdFormatPDF = 17)
    // We use strict quoting for file paths
    const psScript = `
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $word.DisplayAlerts = 'wdAlertsNone'
      $doc = $word.Documents.Open('${tempDocxPath}')
      $doc.SaveAs('${tempPdfPath}', 17)
      $doc.Close()
      $word.Quit()
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    `.trim().replace(/\n/g, '; ');

    try {
      // PDF conversion only works on Windows with MS Word installed
      if (process.platform === 'win32') {
        // Execute the PowerShell script synchronously
        execSync(`powershell -Command "${psScript}"`, { stdio: 'ignore', timeout: 30000 });
      } else {
        console.warn('PDF conversion skipped: PowerShell/Word not available on this platform.');
      }
      
      // Check if PDF was successfully created
      if (fs.existsSync(tempPdfPath)) {
        const pdfBuf = fs.readFileSync(tempPdfPath);
        
        // Return the PDF
        res.set({
          'Content-Disposition': 'attachment; filename="Agreement.pdf"',
          'Content-Type': 'application/pdf',
        });
        res.send(pdfBuf);
      } else {
        throw new Error("PDF file was not created by Word.");
      }
    } catch (conversionError) {
      console.error('PDF Conversion failed:', conversionError);
      
      // Fallback: Return the original DOCX if PDF fails
      res.set({
        'Content-Disposition': 'attachment; filename="Agreement.docx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      res.send(buf);
    } finally {
      // Cleanup Temp Files
      try {
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      } catch (cleanupErr) {
        console.error('Error cleaning up temp files:', cleanupErr);
      }
    }

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
