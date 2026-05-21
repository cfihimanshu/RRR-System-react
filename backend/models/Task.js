const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true },
  title: { type: String, required: true },
  priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
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

taskSchema.index({ assignee: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ caseId: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
