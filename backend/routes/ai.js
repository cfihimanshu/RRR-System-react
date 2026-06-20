const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { verifyToken } = require('../middleware/auth');
const Case = require('../sql_models/Case');
const History = require('../sql_models/History');
const Communication = require('../sql_models/Communication');
const Progress = require('../sql_models/Progress');
const Document = require('../sql_models/Document');

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
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });
};

const getPlainGeminiModel = () => {
  const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';

  if (!key) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in backend .env');
  }

  const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.4,
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

const parseTextSections = (text) => {
  const sections = {
    Summary: '',
    RiskAnalysis: '',
    NextSteps: '',
    AgreementGuidance: '',
    DraftEmail: '',
    ResolutionPath: ''
  };

  const regexes = {
    Summary: /\[SUMMARY\]([\s\S]*?)(?=\[(?:RISK_ANALYSIS|NEXT_STEPS|AGREEMENT_GUIDANCE|DRAFT_EMAIL|RESOLUTION_PATH)\]|$)/i,
    RiskAnalysis: /\[RISK_ANALYSIS\]([\s\S]*?)(?=\[(?:SUMMARY|NEXT_STEPS|AGREEMENT_GUIDANCE|DRAFT_EMAIL|RESOLUTION_PATH)\]|$)/i,
    NextSteps: /\[NEXT_STEPS\]([\s\S]*?)(?=\[(?:SUMMARY|RISK_ANALYSIS|AGREEMENT_GUIDANCE|DRAFT_EMAIL|RESOLUTION_PATH)\]|$)/i,
    AgreementGuidance: /\[AGREEMENT_GUIDANCE\]([\s\S]*?)(?=\[(?:SUMMARY|RISK_ANALYSIS|NEXT_STEPS|DRAFT_EMAIL|RESOLUTION_PATH)\]|$)/i,
    DraftEmail: /\[DRAFT_EMAIL\]([\s\S]*?)(?=\[(?:SUMMARY|RISK_ANALYSIS|NEXT_STEPS|AGREEMENT_GUIDANCE|RESOLUTION_PATH)\]|$)/i,
    ResolutionPath: /\[RESOLUTION_PATH\]([\s\S]*?)(?=\[(?:SUMMARY|RISK_ANALYSIS|NEXT_STEPS|AGREEMENT_GUIDANCE|DRAFT_EMAIL)\]|$)/i,
  };

  for (const [key, regex] of Object.entries(regexes)) {
    const match = text.match(regex);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  // Fallback if no sections matched
  if (!Object.values(sections).some(v => v)) {
    sections.Summary = text;
  }

  return sections;
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

  return `${prefix}:\\n` + entries.map((entry, idx) => {
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
  }).join('\\n');
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

  return lines.join('\\n');
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

    const caseDataDoc = await Case.findOne({ where: { caseId } });

    if (!caseDataDoc) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
      });
    }
    const caseData = caseDataDoc.toJSON();

    const [historyEntriesDocs, commsDocs, progressDoc, documentsDocs] = await Promise.all([
      History.findAll({ where: { caseId }, order: [['createdAt', 'ASC']], limit: 20 }),
      Communication.findAll({ where: { caseId }, order: [['dateTime', 'DESC']], limit: 20 }),
      Progress.findOne({ where: { caseId } }),
      Document.findAll({ where: { caseId }, order: [['uploadDate', 'DESC']], limit: 20 }),
    ]);

    const historyEntries = historyEntriesDocs.map(d => d.toJSON());
    const comms = commsDocs.map(d => d.toJSON());
    const documents = documentsDocs.map(d => d.toJSON());
    const progressLogs = progressDoc && Array.isArray(progressDoc.updates) ? progressDoc.updates : [];
    
    // Sort updates by createdAt descending, limited to 20
    progressLogs.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
    const limitedProgressLogs = progressLogs.slice(0, 20);

    const caseContext = buildCaseContext(
      caseData,
      historyEntries,
      comms,
      limitedProgressLogs,
      documents
    );

    const prompt = `
You are an expert legal and operational case strategist.

Based on the case facts, history, communications and progress below, write a detailed and professional strategy report. 
Organize your response using these exact section headers:

[SUMMARY]
Write a concise executive summary of the case, the dispute, and the current status.

[RISK_ANALYSIS]
Analyze key risks (legal risk, cyber threat, financial exposure, or reputational risks) in detail. Use bullet points or numbers.

[NEXT_STEPS]
Provide clear, practical, numbered next steps for the internal operations and legal teams.

[RESOLUTION_PATH]
Outline the recommended path to resolution (e.g., settlement plan, full refund, revised terms, or court posture).

[AGREEMENT_GUIDANCE]
Suggest terms to include in the MOU, settlement, or closure agreement to protect the organization.

[DRAFT_EMAIL]
Write a professional, ready-to-send email draft to the client or counterparty to defuse the situation and propose the next steps.

Rules:
- Be clear, practical, and highly professional.
- Start each section with its corresponding tag (e.g. [SUMMARY]).
- Do NOT use markdown code blocks like \`\`\` around the tags.
- Feel free to use standard line breaks and paragraphs inside the sections.

Case context:
${caseContext}
`;

    const model = getPlainGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = parseTextSections(text);

    return res.status(200).json({
      success: true,
      insights: parsed,
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

router.post('/generate-summary', verifyToken, async (req, res) => {
  try {
    const { caseId, customPrompt, tempCaseData, targetField = 'caseSummary' } = req.body;

    if (!caseId && !tempCaseData) {
      return res.status(400).json({ success: false, error: 'caseId or tempCaseData is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini API key is not configured.' });
    }

    let caseData = tempCaseData;
    let historyEntries = [];
    let comms = [];
    let limitedProgressLogs = [];
    let documents = [];

    if (caseId) {
      const caseDataDoc = await Case.findOne({ where: { caseId } });
      if (!caseDataDoc) return res.status(404).json({ success: false, error: 'Case not found' });
      caseData = caseDataDoc.toJSON();

      const [historyData, commsData, progressDoc, docsData] = await Promise.all([
        History.findAll({ where: { caseId }, order: [['createdAt', 'ASC']], limit: 20 }),
        Communication.findAll({ where: { caseId }, order: [['dateTime', 'DESC']], limit: 20 }),
        Progress.findOne({ where: { caseId } }),
        Document.findAll({ where: { caseId }, order: [['uploadDate', 'DESC']], limit: 20 }),
      ]);
      
      historyEntries = historyData.map(d => d.toJSON());
      comms = commsData.map(d => d.toJSON());
      documents = docsData.map(d => d.toJSON());

      const progressLogs = progressDoc && Array.isArray(progressDoc.updates) ? progressDoc.updates : [];
      progressLogs.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
      limitedProgressLogs = progressLogs.slice(0, 20);
    }

    const caseContext = buildCaseContext(
      caseData,
      historyEntries,
      comms,
      limitedProgressLogs,
      documents
    );

    const prompt = `
You are an expert legal and operational case analyst.
${targetField === 'clientAllegation' 
  ? `Your task is to write a highly professional, concise, and accurate summary of the "Client's Dispute / Main Allegation" based on the provided case data.`
  : `Your task is to write a highly professional, concise, and accurate "Case Summary" based on the provided case data.`
}
The text should be ready to be pasted directly into a plain text official case narrative field.
Do not include greetings, sign-offs, or conversational text. Just provide the summary text.
IMPORTANT: Do NOT use any Markdown formatting. Do not use asterisks (**) for bolding, or hashes (#) for headers. Use plain text only, with standard line breaks for paragraphs.

${customPrompt ? `The user has provided a specific instruction for this summary: "${customPrompt}"` : ''}

Case context:
${caseContext}
`;

    const model = getGeminiModel();
    // For this we just need plain text, not JSON
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
    const simpleModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.5,
      },
    });

    const result = await simpleModel.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({
      success: true,
      summary: text.trim()
    });

  } catch (error) {
    console.error('AI generate summary error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'AI generate summary failed',
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
          .join('\\n')
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