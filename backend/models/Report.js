const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['SOD', 'EOD'], required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true }, // YYYY-MM-DD
  
  // SOD Fields
  checkInTime: String,
  plannedTasks: String,
  priorityArea: String,
  myTasksToday: Array,
  
  // EOD Fields
  checkOutTime: String,
  workDuration: String,
  completionStatus: String,
  workSummary: String,
  progressScore: Number,
  moodEnergy: String,
  
  status: { type: String, default: 'Submitted' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
