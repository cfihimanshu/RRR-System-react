const { MongoClient } = require('mongodb');
const { sequelize } = require('./config/sequelize');
const SampleData = require('./sql_models/SampleData');

const MONGO_URI = 'mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    
    // Force recreate table with exact columns
    await SampleData.sync({ force: true }); 

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(); 
    const sampleCollection = db.collection('sampledatas');

    const docs = await sampleCollection.find({}).toArray();
    console.log(`Found ${docs.length} documents in MongoDB sampledatas.`);

    const records = docs.map(d => {
      // Map to exact columns
      return {
        date: String(d.date || ''),
        companyName: String(d.companyName || ''),
        contactPerson: String(d.contactPerson || ''),
        contact: String(d.contact || ''),
        emailId: String(d.emailId || ''),
        service: String(d.service || ''),
        bde: String(d.bde || ''),
        totalAmountWithGst: String(d.totalAmountWithGst || d.totalAmtWithGst || ''),
        amtWithoutGst: String(d.amtWithoutGst || ''),
        workStatus: String(d.workStatus || ''),
        department: String(d.department || ''),
        mouStatus: String(d.mouStatus || ''),
        remarks: String(d.remarks || ''),
        mouSignedAmount: String(d.mouSignedAmount || ''),
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });

    console.log('Bulk inserting into MySQL...');
    await SampleData.bulkCreate(records, { logging: false });

    console.log(`\n🎉 Flat SampleData Migration Complete!`);
    console.log(`✅ Successfully migrated: ${records.length}`);

    await client.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
