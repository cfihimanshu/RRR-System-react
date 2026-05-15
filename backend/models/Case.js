const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: { type: String, unique: true },
  createdDate: String,
  companyName: String,
  caseTitle: String,
  priority: { type: String, enum: ["High","Medium","Low"] },
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
  state: String,
  city: String,
  pincode: String,
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


module.exports = mongoose.model('Case', caseSchema);
