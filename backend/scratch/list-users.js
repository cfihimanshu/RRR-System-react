const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function listUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'fullName email role');
    console.log('Current Users in DB:');
    users.forEach(u => {
        console.log(`- Name: "${u.fullName}", Email: "${u.email}", Role: "${u.role}"`);
    });
    process.exit();
}

listUsers();
