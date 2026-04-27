const mongoose = require('mongoose');

const sampleDataSchema = new mongoose.Schema({
  date: String,
  companyName: String,
  contactPerson: String,
  contact: String,
  emailId: String,
  service: String,
  bde: String,
  totalAmountWithGst: String,
  amtWithoutGst: String,
  workStatus: String,
  department: String,
  mouStatus: String,
  remarks: String,
  mouSignedAmount: String
});

module.exports = mongoose.model('SampleData', sampleDataSchema);
