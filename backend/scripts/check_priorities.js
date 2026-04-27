const mongoose = require('mongoose');
require('dotenv').config();

const checkCounts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Case = require('./backend/models/Case');
    const counts = await Case.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    console.log('Priority Counts:', counts);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkCounts();
