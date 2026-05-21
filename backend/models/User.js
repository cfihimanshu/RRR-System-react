const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, default: "User" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Operations", "Staff", "Reviewer", "Accountant", "Legal"], required: true },
  canAccessRecords: { type: Boolean, default: false },
  schemaVersion: { type: Number, default: 2 },
  bypassEodCheck: { type: Boolean, default: false },
  sodAccessGrantedAt: { type: String, default: "" },
  lastSeen: { type: Date, default: Date.now },
  passwordVersion: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
