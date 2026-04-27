const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: String,
  timestamp: String,
  user: String,
  role: String,
  category: String,
  description: String,
  caseId: String
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
