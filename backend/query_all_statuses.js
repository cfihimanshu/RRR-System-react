require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Case = mongoose.model('Case', new mongoose.Schema({}, { strict: false }));
  
  const users = ['Divya', 'Sumit', 'Meghna'];
  for (const u of users) {
    const cases = await Case.find({ assignedTo: new RegExp(u, 'i') }).lean();
    console.log(`\nUser: ${u} (${cases.length} cases)`);
    const statusCounts = {};
    cases.forEach(c => {
      statusCounts[c.currentStatus] = (statusCounts[c.currentStatus] || 0) + 1;
    });
    console.log(statusCounts);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
