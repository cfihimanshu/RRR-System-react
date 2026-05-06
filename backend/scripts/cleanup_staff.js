const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Define Schema
const caseSchema = new mongoose.Schema({
  caseId: String,
  assignedTo: String,
  initiatedBy: String
}, { strict: false });

const Case = mongoose.model('Case', caseSchema);

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Step 1: Clean assignedTo
    const res1 = await Case.updateMany(
      { assignedTo: { $regex: /^staff$/i } },
      { $set: { assignedTo: "" } }
    );
    console.log(`Cleaned up assignedTo: ${res1.modifiedCount} cases.`);

    // Step 2: Clean initiatedBy
    const res2 = await Case.updateMany(
      { initiatedBy: { $regex: /^staff$/i } },
      { $set: { initiatedBy: "" } }
    );
    console.log(`Cleaned up initiatedBy: ${res2.modifiedCount} cases.`);

    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
