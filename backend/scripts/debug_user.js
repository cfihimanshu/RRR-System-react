require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');
    
    const email = `test_${Date.now()}@test.com`;
    const newUser = new User({
      email,
      password: 'password123',
      role: 'Staff',
      fullName: 'Test User Name'
    });
    
    const saved = await newUser.save();
    console.log('Saved User:', saved);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

test();
