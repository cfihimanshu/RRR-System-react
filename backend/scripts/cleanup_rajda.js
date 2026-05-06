const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Define Schema
const userSchema = new mongoose.Schema({
  fullName: String,
  role: String
}, { strict: false });

const caseSchema = new mongoose.Schema({
  caseId: String,
  assignedTo: String,
  initiatedBy: String
}, { strict: false });

const User = mongoose.model('User', userSchema);
const Case = mongoose.model('Case', caseSchema);

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Update Rajda Mansuri's role to 'Staff'
    const userRes = await User.updateMany(
      { fullName: { $regex: /Rajda Mansuri/i } },
      { $set: { role: 'Staff' } }
    );
    console.log(`Updated role for ${userRes.modifiedCount} user(s) named Rajda Mansuri to 'Staff'.`);

    // 2. Clean up cases assigned to her or initiated by her
    const res1 = await Case.updateMany(
      { assignedTo: { $regex: /Rajda Mansuri/i } },
      { $set: { assignedTo: "" } }
    );
    console.log(`Cleaned up assignedTo: ${res1.modifiedCount} cases for Rajda Mansuri.`);

    const res2 = await Case.updateMany(
      { initiatedBy: { $regex: /Rajda Mansuri/i } },
      { $set: { initiatedBy: "" } }
    );
    console.log(`Cleaned up initiatedBy: ${res2.modifiedCount} cases for Rajda Mansuri.`);

    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
