const express = require('express');
const router = express.Router();
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const Case = require('../models/Case');
const Timeline = require('../models/Timeline');
const Document = require('../models/Document');
const { verifyToken } = require('../middleware/auth');

router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.body;
    const caseData = await Case.findOne({ caseId });
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const timeline = await Timeline.find({ caseId }).sort({ eventDate: 1, createdAt: 1 });
    const docs = await Document.find({ caseId });

    let html = fs.readFileSync(path.join(__dirname, '../templates/case_study_template.html'), 'utf8');

    // Calculate totals
    const totalPaid = caseData.servicesSold?.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0) || 0;
    const totalMou = caseData.servicesSold?.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0) || 0;
    const breakdown = caseData.servicesSold?.map(s => `Rs. ${Number(s.serviceAmount || 0).toLocaleString('en-IN')}`).join(' + ') + ` = Rs. ${totalPaid.toLocaleString('en-IN')}`;

    // Prepare dynamic sections for Services
    const serviceSections = caseData.servicesSold?.map((s, i) => `
      <table key="${i}">
        <tr><td class="label-cell">Service Engaged</td><td class="value-cell bold">${s.serviceName}</td></tr>
        <tr><td class="label-cell">Service Status</td><td class="value-cell"><span class="badge ${s.workStatus === 'Completed' ? 'badge-green' : 'badge-orange'}">${s.workStatus}</span></td></tr>
        <tr><td class="label-cell">MOU Signed</td><td class="value-cell">${caseData.mouSigned || 'No'}</td></tr>
        <tr><td class="label-cell">MOU Signed Amount</td><td class="value-cell">${s.signedMouAmount ? `Rs. ${Number(s.signedMouAmount).toLocaleString('en-IN')}/-` : 'NA'}</td></tr>
        <tr><td class="label-cell">Business Development Associate</td><td class="value-cell">${s.bda || '-'}</td></tr>
        <tr><td class="label-cell">Amount Paid</td><td class="value-cell bold">Rs. ${Number(s.serviceAmount || 0).toLocaleString('en-IN')}/-</td></tr>
      </table>
    `).join('') || '<p>No services recorded</p>';

    const timelineItems = timeline.map(t => `
      <div class="timeline-item">
        <div class="timeline-date">${new Date(t.eventDate || t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="timeline-content">
          <div class="bold" style="color: #111827; margin-bottom: 2px;">${t.summary}</div>
          <div style="font-size: 9px; color: #9ca3af;">Logged by: ${t.source || 'System'}</div>
        </div>
      </div>
    `).join('') || '<div class="timeline-item">No events recorded</div>';

    // Replacement map
    const replacements = {
      '{{caseId}}': caseData.caseId || 'N/A',
      '{{companyName}}': caseData.companyName || caseData.clientName || 'N/A',
      '{{clientName}}': caseData.clientName || 'N/A',
      '{{clientMobile}}': caseData.clientMobile || 'N/A',
      '{{clientEmail}}': caseData.clientEmail || 'N/A',
      '{{grievanceNumber}}': caseData.cyberAckNumbers || caseData.grievanceNumber || 'N/A',
      '{{clientSince}}': caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A',
      '{{complaintType}}': caseData.typeOfComplaint || 'Case Analysis',
      '{{datePrepared}}': new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{totalPaid}}': totalPaid.toLocaleString('en-IN'),
      '{{breakdown}}': breakdown,
      '{{totalMouText}}': totalMou > 0 ? `Rs. ${totalMou.toLocaleString('en-IN')}/-` : 'NA (No MOU signed)',
      '{{refundStatus}}': caseData.refundStatus || 'Analysis Pending',
      '{{lienDetails}}': caseData.lienMarkedOn || 'No Active Lien Recorded',
      '{{lienBank}}': caseData.lienBank || 'N/A',
      '{{acc1No}}': caseData.bankAccountDetails?.acc1No || '—',
      '{{acc1Ifsc}}': caseData.bankAccountDetails?.acc1Ifsc || '—',
      '{{acc2No}}': caseData.bankAccountDetails?.acc2No || '—',
      '{{acc2Ifsc}}': caseData.bankAccountDetails?.acc2Ifsc || '—',
      '{{caseSummary}}': caseData.caseSummary || 'No case summary available.',
      '{{clientAllegation}}': caseData.clientAllegation || 'No specific allegations recorded.',
      '{{keyPendingIssue}}': caseData.keyPendingIssue || 'No critical pending issues recorded.',
      '{{recommendedNextSteps}}': caseData.recommendedNextSteps || '1. Continue standard follow-up.\n2. Monitor for further escalations.',
      '{{serviceSections}}': serviceSections,
      '{{timelineItems}}': timelineItems
    };

    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
      html = html.split(key).join(value);
    }

    const options = {
      format: 'A4',
      border: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      timeout: 60000
    };

    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF Generation Error:', err);
        return res.status(500).json({ error: 'Failed to generate PDF' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=CaseStudy_${caseId}.pdf`);
      res.send(buffer);
    });

  } catch (err) {
    console.error('Route Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
