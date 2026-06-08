const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Progress = require('./models/Progress');
  const doc = await Progress.findOne({ caseId: 'RRR-SF-2026-0069', stage: 'Settlement' }).lean();
  console.log(JSON.stringify(doc.updates, null, 2));
  process.exit(0);
}).catch(console.error);
