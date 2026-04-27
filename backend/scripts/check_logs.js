require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const logs = await AuditLog.find({ category: 'User Management' }).sort({ _id: -1 }).limit(1);
    console.log('Last User Management Log:', logs[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

test();
