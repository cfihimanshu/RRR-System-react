const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, default: "User" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Operations", "Staff", "Reviewer", "Accountant"], required: true },
  schemaVersion: { type: Number, default: 2 }
});

module.exports = mongoose.model('User', userSchema);
