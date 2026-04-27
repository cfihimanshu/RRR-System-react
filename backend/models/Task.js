const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  assignee: { type: String, required: true }, // Full Name or Email of the assigned user
  dueDate: String,
  caseId: String,
  details: String,
  status: { type: String, enum: ['To Do', 'In Progress', 'Completed'], default: 'To Do' },
  createdBy: String, // Email of the user who created it
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
