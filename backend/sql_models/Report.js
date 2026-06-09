const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.ENUM('SOD', 'EOD'), allowNull: false },
  userName: { type: DataTypes.STRING, allowNull: false },
  userEmail: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING },
  date: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Submitted' },
  data: { type: DataTypes.JSON, defaultValue: {} }
}, { tableName: 'reports', timestamps: true });