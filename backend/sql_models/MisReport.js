const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('MisReport', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  period: { type: DataTypes.STRING, allowNull: false },
  totalActiveCases: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalActiveCasesAmount: { type: DataTypes.DOUBLE, defaultValue: 0 },
  pendingOverdueCases: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingOverdueCasesAmount: { type: DataTypes.DOUBLE, defaultValue: 0 },
  totalAmountAtRisk: { type: DataTypes.DOUBLE, defaultValue: 0 },
  casesAssignedToday: { type: DataTypes.INTEGER, defaultValue: 0 },
  specialistPerformance: { type: DataTypes.JSON }
}, { tableName: 'mis_reports', timestamps: true });
