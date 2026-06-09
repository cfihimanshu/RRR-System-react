const { MongoClient } = require('mongodb');
const { sequelize } = require('./config/sequelize');
const SampleData = require('./sql_models/SampleData');

const MONGO_URI = 'mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    await sequelize.sync(); 

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(); 
    const sampleCollection = db.collection('sampledatas');

    const docs = await sampleCollection.find({}).toArray();
    console.log(`Found ${docs.length} documents in MongoDB sampledatas.`);

    let successCount = 0;
    let errorCount = 0;

    for (const d of docs) {
      try {
        const _id = d._id.toString();
        delete d._id;
        
        await SampleData.create({
          data: d,
          createdAt: d.createdAt || new Date(),
          updatedAt: d.updatedAt || new Date()
        });
        successCount++;
      } catch (err) {
        console.error(`Error migrating document:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 SampleData Migration Complete!`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    await client.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
