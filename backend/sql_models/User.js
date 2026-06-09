const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "User"
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM(
      "Admin", "Operations", "Staff", "Reviewer", "Accountant", 
      "Legal", "Super Admin", "SuperAdmin", "Operation Admin", 
      "Operation Review", "Operation Head"
    ),
    allowNull: false
  },
  canAccessRecords: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  schemaVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 2
  },
  monthlyTarget: {
    type: DataTypes.INTEGER,
    defaultValue: 500000
  },
  bypassEodCheck: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sodAccessGrantedAt: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  passwordVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  designation: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  empId: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  manager: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  contact: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  lastLoginAlertDate: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  resetOTP: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
  resetOTPExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true // adds createdAt and updatedAt
});

module.exports = User;
