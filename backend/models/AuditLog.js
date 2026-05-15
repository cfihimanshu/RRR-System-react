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

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ user: 1, category: 1, timestamp: -1 });


module.exports = mongoose.model('AuditLog', auditLogSchema);
