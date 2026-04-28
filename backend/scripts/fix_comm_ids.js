require('dotenv').config();
const mongoose = require('mongoose');
const Communication = require('../models/Communication');

async function fixCommIds() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Fix all existing COMM- prefixed IDs to COM-
  const comms = await Communication.find({ commId: { $regex: /^COMM-/ } });
  
  let fixed = 0;
  for (const comm of comms) {
    const newId = comm.commId.replace('COMM-', 'COM-');
    await Communication.updateOne({ _id: comm._id }, { $set: { commId: newId } });
    console.log(`Fixed: ${comm.commId} -> ${newId}`);
    fixed++;
  }
  
  console.log(`\nTotal fixed: ${fixed} records`);
  
  // Show all current comms
  const all = await Communication.find().sort({ _id: -1 }).limit(5);
  console.log('\nLatest communications:');
  all.forEach(c => console.log(`  commId: ${c.commId} | caseId: ${c.caseId}`));
  
  await mongoose.disconnect();
}

fixCommIds().catch(console.error);
