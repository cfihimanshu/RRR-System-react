const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  recipient: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'Info' },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  link: { type: DataTypes.STRING },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'notifications', timestamps: true });