const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Case = sequelize.define('Case', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  createdDate: DataTypes.STRING,
  companyName: DataTypes.STRING,
  caseTitle: DataTypes.STRING,
  priority: {
    type: DataTypes.ENUM("Critical", "High", "Medium", "Low"),
    allowNull: true
  },
  sourceOfComplaint: DataTypes.STRING,
  typeOfComplaint: DataTypes.STRING,
  brandName: DataTypes.STRING,
  serviceMode: {
    type: DataTypes.STRING,
    defaultValue: "Single Service"
  },
  // MySQL/MariaDB JSON type for nested arrays (servicesSold)
  servicesSold: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('servicesSold');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return []; }
      }
      return rawValue || [];
    }
  },
  engagementNote: DataTypes.TEXT,
  clientName: DataTypes.STRING,
  clientMobile: DataTypes.STRING,
  clientEmail: DataTypes.STRING,
  linkedBy: DataTypes.STRING,
  state: { type: DataTypes.STRING, defaultValue: "" },
  city: { type: DataTypes.STRING, defaultValue: "" },
  pincode: { type: DataTypes.STRING, defaultValue: "" },
  totalAmtPaid: DataTypes.FLOAT,
  mouSigned: DataTypes.STRING,
  totalMouValue: DataTypes.FLOAT,
  amtInDispute: DataTypes.FLOAT,
  dateOfLastPayment: DataTypes.STRING,
  smRisk: DataTypes.STRING,
  complaint: DataTypes.TEXT,
  policeThreat: DataTypes.STRING,
  caseSummary: DataTypes.TEXT,
  clientAllegation: DataTypes.TEXT,
  proofCallRec: DataTypes.STRING,
  proofWaChat: DataTypes.STRING,
  proofVideoCall: DataTypes.STRING,
  proofFundingEmail: DataTypes.STRING,
  initiatedBy: DataTypes.STRING,
  accountable: DataTypes.STRING,
  legalOfficer: DataTypes.STRING,
  accounts: DataTypes.STRING,
  caseCreatedSource: { type: DataTypes.STRING, defaultValue: "Form" },
  currentStatus: { type: DataTypes.STRING, defaultValue: "New" },
  lastUpdateDate: DataTypes.STRING,
  nextActionDate: DataTypes.STRING,
  dueDate: DataTypes.STRING,
  cyberAckNumbers: DataTypes.STRING,
  firNumber: DataTypes.STRING,
  firFileLink: DataTypes.STRING,
  grievanceNumber: DataTypes.STRING,
  caseStudyGeneratedAt: DataTypes.STRING,
  assignedTo: DataTypes.STRING,
  progressPercentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  compliancePending: { type: DataTypes.BOOLEAN, defaultValue: false },
  isArchived: { type: DataTypes.BOOLEAN, defaultValue: false },
  refundedAmount: DataTypes.FLOAT,
  savedAmount: DataTypes.FLOAT,
  lienMarkedOn: DataTypes.STRING,
  lienBank: DataTypes.STRING,
  refundStatus: DataTypes.STRING,
  // Nested object mapping
  bankAccountDetails: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const rawValue = this.getDataValue('bankAccountDetails');
      if (typeof rawValue === 'string') {
        try { return JSON.parse(rawValue); } catch (e) { return {}; }
      }
      return rawValue || {};
    }
  },
  keyPendingIssue: DataTypes.TEXT,
  recommendedNextSteps: DataTypes.TEXT
}, {
  tableName: 'cases',
  timestamps: true,
  indexes: [
    { fields: ['assignedTo'] },
    { fields: ['initiatedBy'] },
    { fields: ['currentStatus'] },
    { fields: ['priority'] },
    { fields: ['nextActionDate'] },
    { fields: ['companyName'] },
    { fields: ['clientMobile'] },
    { fields: ['typeOfComplaint'] },
    { fields: ['sourceOfComplaint'] }
  ]
});

module.exports = Case;
