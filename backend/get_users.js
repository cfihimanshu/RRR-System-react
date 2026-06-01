const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');
  
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const users = await usersCol.find({}).toArray();
  console.log('Users count:', users.length);
  users.forEach(u => {
    console.log(`User: email="${u.email}", role="${u.role}", status="${u.status}"`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
