const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('LeaveRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.STRING },
  userName: { type: DataTypes.STRING },
  startDate: { type: DataTypes.STRING },
  endDate: { type: DataTypes.STRING },
  reason: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Pending Review" },
  type: { type: DataTypes.STRING },
  appliedOn: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'leave_requests', timestamps: true });