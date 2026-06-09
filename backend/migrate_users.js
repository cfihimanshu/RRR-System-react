require('dotenv').config();
const { MongoClient } = require('mongodb');
const { sequelize } = require('./config/sequelize');
const User = require('./sql_models/User');

const MONGO_URI = "mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0";

async function migrateUsers() {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    await sequelize.sync(); 

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(); 
    const usersCollection = db.collection('users');

    const mongoUsers = await usersCollection.find({}).toArray();
    console.log(`Found ${mongoUsers.length} users in MongoDB.`);

    let successCount = 0;
    let errorCount = 0;

    for (const mu of mongoUsers) {
      try {
        const userData = {
          fullName: mu.fullName || mu.name || 'User',
          email: mu.email,
          password: mu.password,
          role: mu.role || 'Staff',
          canAccessRecords: mu.canAccessRecords || false,
          schemaVersion: mu.schemaVersion || 2,
          monthlyTarget: mu.monthlyTarget || 500000,
          bypassEodCheck: mu.bypassEodCheck || false,
          sodAccessGrantedAt: mu.sodAccessGrantedAt || "",
          lastSeen: mu.lastSeen || new Date(),
          passwordVersion: mu.passwordVersion || 0,
          department: mu.department || "",
          designation: mu.designation || "",
          empId: mu.empId || "",
          manager: mu.manager || "",
          contact: mu.contact || "",
          lastLoginAlertDate: mu.lastLoginAlertDate || "",
          resetOTP: mu.resetOTP || "",
          resetOTPExpires: mu.resetOTPExpires || null,
          createdAt: mu.createdAt || new Date(),
          updatedAt: mu.updatedAt || new Date()
        };

        const [user, created] = await User.findOrCreate({
          where: { email: userData.email },
          defaults: userData
        });

        if (!created) {
          await user.update(userData);
        }

        successCount++;
      } catch (err) {
        console.error(`Failed to migrate user ${mu.email}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 User Migration Complete!`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    await client.close();
    await sequelize.close();
  } catch (err) {
    console.error("Migration fatal error:", err);
  }
}

migrateUsers();
