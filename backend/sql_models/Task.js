const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Task', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  taskId: { type: DataTypes.STRING, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT },
  priority: { type: DataTypes.ENUM('Critical', 'High', 'Medium', 'Low'), defaultValue: 'Medium' },
  assignee: { type: DataTypes.STRING, allowNull: false },
  dueDate: { type: DataTypes.STRING },
  caseId: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('To Do', 'In Progress', 'Completed', 'Done'), defaultValue: 'To Do' },
  createdBy: { type: DataTypes.STRING },
  source: { type: DataTypes.STRING, defaultValue: 'Manual' }
}, { tableName: 'tasks', timestamps: true });