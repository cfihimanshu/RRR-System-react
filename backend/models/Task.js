const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true },
  title: { type: String, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  assignee: { type: String, required: true },
  dueDate: String,
  caseId: String,
  details: String,
  status: { type: String, enum: ['To Do', 'In Progress', 'Completed', 'Done'], default: 'To Do' },
  reminderDateTime: String,
  notes: String,
  source: { type: String, default: 'Manual' },
  createdBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
