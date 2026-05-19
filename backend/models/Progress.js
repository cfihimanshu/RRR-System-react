const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  stage: String,
  percentage: Number,
  summary: { type: String, required: true },
  nextAction: String,
  blockers: String,
  followUpDate: String,
  escalateTo: String,
  refundedAmount: Number,
  savedAmount: Number,
  attachment: String,
  updatedBy: String,
  checklist: [
    {
      id: Number,
      label: String,
      completed: Boolean
    }
  ],
  updates: [
    {
      stage: String,
      percentage: Number,
      summary: String,
      nextAction: String,
      blockers: String,
      followUpDate: String,
      escalateTo: String,
      refundedAmount: Number,
      savedAmount: Number,
      attachment: String,
      updatedBy: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
