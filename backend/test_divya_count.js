const mongoose = require('mongoose');
require('dotenv').config();
const Case = require('./models/Case');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const cases = await Case.find({});
    let count = 0;
    cases.forEach(c => {
      const assigned = (c.assignedTo || '').toLowerCase();
      const initiated = (c.initiatedBy || '').toLowerCase();
      if (assigned.includes('divya') || initiated.includes('divya')) {
        count++;
      }
    });
    console.log('Actual Divya count in code loop:', count);
  } finally {
    process.exit(0);
  }
});
