const mongoose = require('mongoose');
require('dotenv').config();
const Case = require('./models/Case');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const total = await Case.countDocuments({});
    console.log('Total cases in DB:', total);
  } finally {
    process.exit(0);
  }
});
