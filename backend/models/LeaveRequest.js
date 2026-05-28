const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  reqId: String,
  leaveType: String,
  startDate: String,
  endDate: String,
  reason: String,
  emergencyContact: String,
  requestedBy: String,
  requestedByName: String,
  status: { type: String, default: "Pending Review" },
  timestamp: String
});

leaveRequestSchema.index({ requestedBy: 1 });
leaveRequestSchema.index({ status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
