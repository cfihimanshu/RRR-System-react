const express = require('express');
const LegalProcess = require('../sql_models/LegalProcess');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Create new legal process submission
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Legal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only Legal and Admin users can submit legal process stages.' });
    }
    const {
      caseId,
      stage,
      mouDocChecked,
      invoicesChecked,
      paymentReceiptChecked,
      caseStudyDocChecked,
      summary
    } = req.body;

    if (!caseId || !stage) {
      return res.status(400).json({ error: 'caseId and stage are required' });
    }

    const newRecord = await LegalProcess.create({
      caseId,
      stage,
      mouDocChecked: !!mouDocChecked,
      invoicesChecked: !!invoicesChecked,
      paymentReceiptChecked: !!paymentReceiptChecked,
      caseStudyDocChecked: !!caseStudyDocChecked,
      summary: summary || '',
      submittedBy: req.user.fullName || req.user.email
    });

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get legal process entries for a case
router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) {
      return res.status(400).json({ error: 'caseId is required' });
    }

    const records = await LegalProcess.findAll({
      where: { caseId },
      order: [['createdAt', 'DESC']]
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update legal process entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Legal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only Legal and Admin users can update legal process stages.' });
    }
    const { id } = req.params;
    const record = await LegalProcess.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const {
      mouDocChecked,
      invoicesChecked,
      paymentReceiptChecked,
      caseStudyDocChecked,
      summary
    } = req.body;

    await record.update({
      mouDocChecked: mouDocChecked !== undefined ? !!mouDocChecked : record.mouDocChecked,
      invoicesChecked: invoicesChecked !== undefined ? !!invoicesChecked : record.invoicesChecked,
      paymentReceiptChecked: paymentReceiptChecked !== undefined ? !!paymentReceiptChecked : record.paymentReceiptChecked,
      caseStudyDocChecked: caseStudyDocChecked !== undefined ? !!caseStudyDocChecked : record.caseStudyDocChecked,
      summary: summary !== undefined ? summary : record.summary,
      submittedBy: req.user.fullName || req.user.email
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete legal process entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await LegalProcess.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    await record.destroy();
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
