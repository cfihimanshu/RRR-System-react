const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docId: String,
  caseId: String,
  uploadDate: String,
  sourceForm: String,
  docType: String,
  fileSummary: String,
  fileLink: String,
  uploadedBy: String,
  remarks: String
});

module.exports = mongoose.model('Document', documentSchema);
