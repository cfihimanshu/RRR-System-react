const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { verifyToken } = require('../middleware/auth');
const Case = require('../models/Case');
const History = require('../models/History');
const Communication = require('../models/Communication');
const Progress = require('../models/Progress');
const Document = require('../models/Document');

const router = express.Router();

/**
 * Gemini AI client
 */
const getGeminiModel = () => {
  const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

  if (!key) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in backend .env');
  }

  const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1200,
      responseMimeType: 'application/json',
    },
  });
};

const extractJsonObject = (text) => {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    const jsonMatch = text.match(/\{[\s\S]*\}/m);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return null;
    }
  }
};

const formatDate = (value) => {
  if (!value) return '';

  try {
    return new Date(value).toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

const summarizeEntries = (entries, prefix) => {
  if (!entries || entries.length === 0) return `${prefix}: none.`;

  return `${prefix}:\n` + entries.map((entry, idx) => {
    const summary =
      entry.summary ||
      entry.remarks ||
      entry.description ||
      entry.message ||
      entry.title ||
      '';

    const date =
      formatDate(entry.createdAt) ||
      formatDate(entry.timestamp) ||
      formatDate(entry.dateTime) ||
      formatDate(entry.uploadDate);

    return `${idx + 1}. ${date ? `${date} - ` : ''}${summary || 'No details available'}`;
  }).join('\n');
};

const buildCaseContext = (caseData, history, comms, progressLogs, documents) => {
  const lines = [
    `Case ID: ${caseData.caseId || 'N/A'}`,
    `Client: ${caseData.clientName || 'N/A'}`,
    `Company: ${caseData.companyName || 'N/A'}`,
    `Complaint Type: ${caseData.typeOfComplaint || 'N/A'}`,
    `Priority: ${caseData.priority || 'Medium'}`,
    `Current Status: ${caseData.currentStatus || caseData.status || 'N/A'}`,
    `Source: ${caseData.sourceOfComplaint || caseData.source || 'N/A'}`,
    `Total Amount Paid: ₹${caseData.totalAmtPaid || caseData.amountPaid || '0'}`,
    `Total MOU Value: ₹${caseData.totalMouValue || caseData.mouValue || '0'}`,
    `Amount in Dispute: ₹${caseData.amtInDispute || caseData.disputeAmount || '0'}`,
    `MOU Signed: ${caseData.mouSigned || 'No'}`,
    `Risk Flags: Social Media ${caseData.smRisk || 'None'}, Consumer Complaint Filed ${caseData.consumerComplaintFiled || 'No'}, Police/Cyber Threat ${caseData.policeThreat || 'None'}`,
    `Proofs: Call Recording ${caseData.proofCallRec || 'No'}, WhatsApp Chat ${caseData.proofWaChat || 'No'}, Video Call ${caseData.proofVideoCall || 'No'}, Funding Email ${caseData.proofFundingEmail || 'No'}`,
    `Key Pending Issue: ${caseData.keyPendingIssue || 'None'}`,
    `Recommended Next Steps: ${caseData.recommendedNextSteps || 'None'}`,
    `Case Summary: ${caseData.caseSummary || caseData.summary || 'None'}`,
    `Client Allegation: ${caseData.clientAllegation || 'None'}`,
    `Assigned To: ${caseData.assignedTo || caseData.initiatedBy || 'Unassigned'}`,
    `Accountable: ${caseData.accountable || 'N/A'}`,
    `Legal Officer: ${caseData.legalOfficer || 'N/A'}`,
    `Accounts: ${caseData.accounts || 'N/A'}`,
    `Documents Uploaded: ${documents.length}`,
    `History Entries: ${history.length}`,
    `Communications: ${comms.length}`,
    `Progress Updates: ${progressLogs.length}`,
    '',
    summarizeEntries(history.slice(-10), 'Recent history'),
    '',
    summarizeEntries(comms.slice(-10), 'Recent communications'),
    '',
    summarizeEntries(progressLogs.slice(-10), 'Recent progress updates'),
    '',
    summarizeEntries(documents.slice(-10), 'Recent documents'),
  ];

  return lines.join('\n');
};

const sendGeminiPrompt = async (prompt) => {
  const model = getGeminiModel();

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  return text || '';
};

router.post('/case-insights', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.body;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'caseId is required',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in backend .env',
      });
    }

    const caseData = await Case.findOne({ caseId });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
      });
    }

    const [historyEntries, comms, progressDoc, documents] = await Promise.all([
      History.find({ caseId }).sort({ timestamp: 1 }).limit(20),
      Communication.find({ caseId }).sort({ dateTime: -1 }).limit(20),
      Progress.findOne({ caseId }).lean(),
      Document.find({ caseId }).sort({ uploadDate: -1 }).limit(20),
    ]);
    const progressLogs = progressDoc ? (progressDoc.updates || []) : [];
    // Sort updates by createdAt descending, limited to 20
    progressLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedProgressLogs = progressLogs.slice(0, 20);

    const caseContext = buildCaseContext(
      caseData,
      historyEntries,
      comms,
      limitedProgressLogs,
      documents
    );

    const prompt = `
You are an expert legal and operational case analyst.

Analyze the case details and return ONLY valid JSON.

Required JSON format:
{
  "Summary": "Short case summary in simple professional English.",
  "RiskAnalysis": "Key legal, operational, payment, reputational and evidence-related risks.",
  "NextSteps": "Clear practical next steps for the internal team.",
  "AgreementGuidance": "Guidance for MOU, settlement, refund, installment or closure agreement.",
  "DraftEmail": "Professional email draft to client/counterparty.",
  "ResolutionPath": "Recommended resolution path with practical action plan."
}

Rules:
- Do not write markdown.
- Do not add text outside JSON.
- Keep response professional.
- Do not claim guaranteed legal outcome.
- Use the available case facts only.

Case context:
${caseContext}
`;

    const text = await sendGeminiPrompt(prompt);
    const parsed = extractJsonObject(text);

    if (parsed) {
      return res.status(200).json({
        success: true,
        insights: {
          Summary: parsed.Summary || '',
          RiskAnalysis: parsed.RiskAnalysis || '',
          NextSteps: parsed.NextSteps || '',
          AgreementGuidance: parsed.AgreementGuidance || '',
          DraftEmail: parsed.DraftEmail || '',
          ResolutionPath: parsed.ResolutionPath || '',
        },
        raw: text,
      });
    }

    return res.status(200).json({
      success: true,
      insights: {
        Summary: text,
        RiskAnalysis: '',
        NextSteps: '',
        AgreementGuidance: '',
        DraftEmail: '',
        ResolutionPath: '',
      },
      raw: text,
    });

  } catch (error) {
    console.error('AI case insights error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'AI case insights failed',
    });
  }
});

router.post('/agreement-draft', verifyToken, async (req, res) => {
  try {
    const {
      date,
      firstPartyCompany,
      clientName,
      address,
      pincode,
      settlementAmount,
      amountInWords,
      firstPartySignatory,
      secondCompany,
      secondPartySignatory,
      installments = [],
      caseSummary = '',
      clientAllegation = '',
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in backend .env',
      });
    }

    const installmentText = installments.length > 0
      ? installments
          .map((inst, idx) => {
            return `Installment ${idx + 1}: ₹${inst.amount || '0'} on ${inst.date || 'TBD'}`;
          })
          .join('\n')
      : `Single settlement amount: ₹${settlementAmount || '0'}`;

    const prompt = `
You are an expert legal document assistant.

Based on the agreement input, return ONLY valid JSON.

Required JSON format:
{
  "AgreementGuidance": "Practical guidance for preparing the settlement/agreement.",
  "DraftEmail": "Professional email draft to send with agreement or settlement proposal."
}

Rules:
- Do not write markdown.
- Do not add text outside JSON.
- Keep tone professional and dispute-resolution focused.
- Do not claim guaranteed legal outcome.

Agreement input:
Date: ${date || 'N/A'}
First Party Company: ${firstPartyCompany || 'N/A'}
Client Name: ${clientName || 'N/A'}
Address: ${address || 'N/A'}
Pincode: ${pincode || 'N/A'}
Settlement Amount: ₹${settlementAmount || '0'}
Amount In Words: ${amountInWords || 'N/A'}
First Party Signatory: ${firstPartySignatory || 'N/A'}
Second Company: ${secondCompany || 'N/A'}
Second Party Signatory: ${secondPartySignatory || 'N/A'}
Installment Plan:
${installmentText}
Case Summary: ${caseSummary || 'N/A'}
Client Allegation: ${clientAllegation || 'N/A'}
`;

    const text = await sendGeminiPrompt(prompt);
    const parsed = extractJsonObject(text);

    if (parsed) {
      return res.status(200).json({
        success: true,
        draft: {
          AgreementGuidance: parsed.AgreementGuidance || '',
          DraftEmail: parsed.DraftEmail || '',
        },
        raw: text,
      });
    }

    return res.status(200).json({
      success: true,
      draft: {
        AgreementGuidance: text,
        DraftEmail: '',
      },
      raw: text,
    });

  } catch (error) {
    console.error('AI agreement draft error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'AI agreement draft failed',
    });
  }
});

module.exports = router;