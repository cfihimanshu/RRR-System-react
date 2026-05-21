require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Case = mongoose.model('Case', new mongoose.Schema({}, { strict: false }));
  
  const cases = await Case.find({
    $or: [
      { assignedTo: /meghna/i },
      { initiatedBy: /meghna/i }
    ]
  }).lean();
  
  console.log(`Found ${cases.length} cases for Meghna:`);
  cases.forEach(c => {
    console.log(`CaseId: ${c.caseId}, assignedTo: "${c.assignedTo}", initiatedBy: "${c.initiatedBy}", currentStatus: "${c.currentStatus}"`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
