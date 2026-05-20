const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: { type: String, unique: true },
  createdDate: String,
  companyName: String,
  caseTitle: String,
  priority: { type: String, enum: ["Critical","High","Medium","Low"] },
  sourceOfComplaint: String,
  typeOfComplaint: String,
  brandName: String,
  serviceMode: { type: String, default: "Single Service" },
  servicesSold: [],
  engagementNote: String,
  clientName: String,
  clientMobile: String,
  clientEmail: String,
  linkedBy: String,
  state: { type: String, default: "" },
  city: { type: String, default: "" },
  pincode: { type: String, default: "" },
  totalAmtPaid: Number,
  mouSigned: String,
  totalMouValue: Number,
  amtInDispute: Number,
  dateOfLastPayment: String,
  smRisk: String,
  complaint: String,
  policeThreat: String,
  caseSummary: String,
  clientAllegation: String,
  proofCallRec: String,
  proofWaChat: String,
  proofVideoCall: String,
  proofFundingEmail: String,
  initiatedBy: String,
  accountable: String,
  legalOfficer: String,
  accounts: String,
  caseCreatedSource: { type: String, default: "Form" },
  currentStatus: { type: String, default: "New" },
  lastUpdateDate: String,
  nextActionDate: String,
  cyberAckNumbers: String,
  firNumber: String,
  firFileLink: String,
  grievanceNumber: String,
  caseStudyGeneratedAt: String,
  assignedTo: String,
  progressPercentage: { type: Number, default: 0 },
  refundedAmount: Number,
  savedAmount: Number,
  // Case Study Template Fields
  lienMarkedOn: String,
  lienBank: String,
  refundStatus: String,
  bankAccountDetails: {
    acc1No: String,
    acc1Ifsc: String,
    acc2No: String,
    acc2Ifsc: String
  },
  keyPendingIssue: String,
  recommendedNextSteps: String
}, { timestamps: true });

caseSchema.index({ createdAt: -1 });
caseSchema.index({ assignedTo: 1 });
caseSchema.index({ initiatedBy: 1 });
caseSchema.index({ currentStatus: 1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ nextActionDate: 1 });
caseSchema.index({ companyName: 1 });
caseSchema.index({ clientMobile: 1 });
caseSchema.index({ typeOfComplaint: 1 });
caseSchema.index({ sourceOfComplaint: 1 });

// Compound indexes for dashboard performance optimizations
caseSchema.index({ assignedTo: 1, currentStatus: 1 });
caseSchema.index({ assignedTo: 1, currentStatus: 1, nextActionDate: 1 });
caseSchema.index({ currentStatus: 1, nextActionDate: 1 });
caseSchema.index({ typeOfComplaint: 1, updatedAt: -1 });

module.exports = mongoose.model('Case', caseSchema);
