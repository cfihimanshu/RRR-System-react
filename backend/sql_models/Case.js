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
  totalAmtPaid: {
    type: DataTypes.DOUBLE,
    get() {
      const services = this.getDataValue('servicesSold');
      const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
      if (Array.isArray(parsedServices) && parsedServices.length > 0) {
        return parsedServices.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0);
      }
      return this.getDataValue('totalAmtPaid') || 0;
    }
  },
  mouSigned: DataTypes.STRING,
  totalMouValue: {
    type: DataTypes.DOUBLE,
    get() {
      const services = this.getDataValue('servicesSold');
      const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
      if (Array.isArray(parsedServices) && parsedServices.length > 0) {
        return parsedServices.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0);
      }
      return this.getDataValue('totalMouValue') || 0;
    }
  },
  amtInDispute: {
    type: DataTypes.DOUBLE,
    get() {
      const services = this.getDataValue('servicesSold');
      const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
      if (Array.isArray(parsedServices) && parsedServices.length > 0) {
        const paid = parsedServices.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0);
        const mou = parsedServices.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0);
        return Math.max(0, paid - mou);
      }
      return this.getDataValue('amtInDispute') || 0;
    }
  },
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
  acknowledgmentNumber: DataTypes.STRING,
  firNumber: DataTypes.STRING,
  firFileLink: DataTypes.STRING,
  importDocumentLink: DataTypes.STRING,
  bda: DataTypes.STRING,
  grievanceNumber: DataTypes.STRING,
  caseStudyGeneratedAt: DataTypes.STRING,
  assignedTo: DataTypes.STRING,
  progressPercentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  compliancePending: { type: DataTypes.BOOLEAN, defaultValue: false },
  isArchived: { type: DataTypes.BOOLEAN, defaultValue: false },
  assignedAt: { type: DataTypes.DATE, allowNull: true },
  hasBeenWorkedOn: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastReminderSentAt: { type: DataTypes.DATE, allowNull: true },
  refundedAmount: DataTypes.DOUBLE,
  savedAmount: DataTypes.DOUBLE,
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
