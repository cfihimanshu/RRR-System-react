require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const logs = await AuditLog.find({ description: /user@gmail.com/ }).sort({ _id: -1 });
    console.log('Logs for user@gmail.com:', logs);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

test();
