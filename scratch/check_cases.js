const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Case = require('../backend/models/Case');
  const cases = await Case.find({}).limit(10);
  console.log('Cases:', cases.map(c => c.caseId));
  process.exit();
}
check();
