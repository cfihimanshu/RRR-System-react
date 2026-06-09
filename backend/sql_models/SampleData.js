const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('SampleData', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  date: { type: DataTypes.STRING },
  companyName: { type: DataTypes.STRING },
  contactPerson: { type: DataTypes.STRING },
  contact: { type: DataTypes.STRING },
  emailId: { type: DataTypes.STRING },
  service: { type: DataTypes.STRING },
  bde: { type: DataTypes.STRING },
  totalAmountWithGst: { type: DataTypes.STRING },
  amtWithoutGst: { type: DataTypes.STRING },
  workStatus: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING },
  mouStatus: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT },
  mouSignedAmount: { type: DataTypes.STRING }
}, { tableName: 'sample_data', timestamps: true });