const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  docId: { type: DataTypes.STRING },
  caseId: { type: DataTypes.STRING },
  docType: { type: DataTypes.STRING },
  fileLink: { type: DataTypes.STRING },
  uploadDate: { type: DataTypes.STRING },
  uploadedBy: { type: DataTypes.STRING },
  sourceForm: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT }
}, { tableName: 'documents', timestamps: true });