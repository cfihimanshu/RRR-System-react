const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const SampleData = require('../models/SampleData');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { emailId: { $regex: search, $options: 'i' } },
          { bde: { $regex: search, $options: 'i' } },
          { contactPerson: { $regex: search, $options: 'i' } },
          { contact: { $regex: search, $options: 'i' } },
          { service: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const docs = await SampleData.find(query).sort({ _id: -1 }).limit(1000);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const xlsx = require('xlsx');

router.post('/import', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { cellDates: true });

    const results = data.map(row => {
      // Helper to find key case-insensitively and trimmed
      const getVal = (possibleKeys, isDateField = false) => {
        const foundKey = Object.keys(row).find(k => 
          possibleKeys.includes(k.trim().toLowerCase())
        );
        if (!foundKey) return '';
        const val = row[foundKey];
        
        // Only treat as date if explicitly marked as a date field column
        if (isDateField) {
          if (val instanceof Date) {
            return val.toLocaleDateString('en-IN');
          }
          if (typeof val === 'number') {
            // Convert Excel serial date to DD/MM/YYYY
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toLocaleDateString('en-IN');
          }
        }
        
        return String(val || '');
      };

      return {
        date: getVal(['date'], true),
        companyName: getVal(['company name', 'company']),
        contactPerson: getVal(['contact person', 'person']),
        contact: getVal(['contact']),
        emailId: getVal(['e-mail id', 'email id', 'email']),
        service: getVal(['service']),
        bde: getVal(['bde']),
        totalAmountWithGst: getVal(['total amount (with gst)', 'total amount', 'total']),
        amtWithoutGst: getVal(['amt. without gst', 'amt without gst', 'net amount', 'net']),
        workStatus: getVal(['work status', 'status']),
        department: getVal(['department', 'dept']),
        mouStatus: getVal(['mou status', 'mou']),
        remarks: getVal(['remarks']),
        mouSignedAmount: getVal(['mou signed amount', 'mou amount'])
      };
    });

    await SampleData.insertMany(results);
    fs.unlinkSync(req.file.path); // remove temp file
    res.status(201).json({ message: `Successfully imported ${results.length} records.` });
  } catch (error) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore unlink error
      }
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
