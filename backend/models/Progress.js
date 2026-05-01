const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  stage: String,
  percentage: Number,
  summary: { type: String, required: true },
  nextAction: String,
  blockers: String,
  followUpDate: String,
  escalateTo: String,
  updatedBy: String,
  checklist: [
    {
      id: Number,
      label: String,
      completed: Boolean
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
