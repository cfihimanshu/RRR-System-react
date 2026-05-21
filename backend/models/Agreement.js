const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  generatedBy: { type: String, required: true },       // user email
  generatedByName: { type: String, default: '' },      // user full name
  clientName: { type: String, required: true },
  firstPartyCompany: { type: String, default: '' },
  secondCompany: { type: String, default: '' },
  settlementAmount: { type: Number, default: 0 },
  amountInWords: { type: String, default: '' },
  date: { type: String, default: '' },
  installments: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agreement', AgreementSchema);
