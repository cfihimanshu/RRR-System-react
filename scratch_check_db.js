const mongoose = require('mongoose');
const Progress = require('./models/Progress');
const Case = require('./models/Case');

async function check() {
  await mongoose.connect('mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0');
  const targetId = 'RRR-SF-2026-0028';
  console.log('Checking Case:', targetId);
  const logs = await Progress.find({ caseId: targetId });
  console.log('Progress Logs count:', logs.length);
  console.log(JSON.stringify(logs, null, 2));
  
  const c = await Case.findOne({ caseId: targetId });
  console.log('Case Data:', JSON.stringify(c, null, 2));
  process.exit();
}

check();
