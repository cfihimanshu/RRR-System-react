const mongoose = require('mongoose');
require('dotenv').config();
const Case = require('./models/Case');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const dbUser = await User.findOne({ email: /divya/i });
    if (!dbUser) {
      console.log('User not found');
      process.exit(1);
    }
    
    const possibleNames = [
      dbUser?.fullName,
      dbUser?.name,
      dbUser?.email
    ].filter(Boolean);
    
    const query = {
      $or: [
        { assignedTo: { $in: possibleNames } },
        { initiatedBy: { $in: possibleNames } },
        { assignedTo: { $regex: possibleNames[0], $options: 'i' } },
        { initiatedBy: { $regex: possibleNames[0], $options: 'i' } }
      ]
    };
    
    const totalCases = await Case.countDocuments(query);
    const recentCases = await Case.find(query).sort({ createdAt: -1 }).limit(10);
    
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('totalCases:', totalCases);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
