const { MongoClient } = require('mongodb');
const { sequelize } = require('./config/sequelize');

const Case = require('./sql_models/Case');
const Communication = require('./sql_models/Communication');
const Timeline = require('./sql_models/Timeline');
const Task = require('./sql_models/Task');
const Report = require('./sql_models/Report');
const Refund = require('./sql_models/Refund');
const Progress = require('./sql_models/Progress');

const MONGO_URI = 'mongodb+srv://himanshu_db_backup:dBstoreBKup@cluster0.9k2c6yw.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    
    // Sync schemas
    await sequelize.sync({ alter: true });
    
    // We will truncate tables to avoid duplicate entries or conflicts
    await Case.destroy({ truncate: true });
    await Communication.destroy({ truncate: true });
    await Timeline.destroy({ truncate: true });
    await Task.destroy({ truncate: true });
    await Report.destroy({ truncate: true });
    await Refund.destroy({ truncate: true });
    await Progress.destroy({ truncate: true });

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();

    // Migrate Cases
    console.log('Migrating Cases...');
    const cases = await db.collection('cases').find({}).toArray();
    const caseRecords = cases.map(d => {
      delete d._id;
      return {
        ...d,
        servicesSold: Array.isArray(d.servicesSold) ? d.servicesSold : [],
        bankAccountDetails: typeof d.bankAccountDetails === 'object' ? d.bankAccountDetails : {},
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < caseRecords.length; i += 500) {
      await Case.bulkCreate(caseRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Cases: ${caseRecords.length}`);

    // Migrate Communications
    console.log('Migrating Communications...');
    const comms = await db.collection('communications').find({}).toArray();
    const commRecords = comms.map(d => {
      delete d._id;
      return {
        ...d,
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < commRecords.length; i += 500) {
      await Communication.bulkCreate(commRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Communications: ${commRecords.length}`);

    // Migrate Timelines
    console.log('Migrating Timelines...');
    const timelines = await db.collection('timelines').find({}).toArray();
    const timelineRecords = timelines.map(d => {
      delete d._id;
      return {
        ...d,
        id: String(d.id || Date.now() + Math.random()),
        metadata: d.metadata || {},
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < timelineRecords.length; i += 500) {
      await Timeline.bulkCreate(timelineRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Timelines: ${timelineRecords.length}`);

    // Migrate Tasks
    console.log('Migrating Tasks...');
    const tasks = await db.collection('tasks').find({}).toArray();
    const taskRecords = tasks.map(d => {
      delete d._id;
      return {
        ...d,
        history: Array.isArray(d.history) ? d.history : [],
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < taskRecords.length; i += 500) {
      await Task.bulkCreate(taskRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Tasks: ${taskRecords.length}`);

    // Migrate Reports
    console.log('Migrating Reports...');
    const reports = await db.collection('reports').find({}).toArray();
    const reportRecords = reports.map(d => {
      delete d._id;
      return {
        type: d.type || 'EOD',
        userName: d.userName || '',
        userEmail: d.userEmail || '',
        userId: String(d.userId || ''),
        date: d.date || new Date().toISOString(),
        status: d.status || 'Submitted',
        data: d,
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < reportRecords.length; i += 500) {
      await Report.bulkCreate(reportRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Reports: ${reportRecords.length}`);

    // Migrate Refunds
    console.log('Migrating Refunds...');
    const refunds = await db.collection('refunds').find({}).toArray();
    const refundRecords = refunds.map(d => {
      delete d._id;
      return {
        ...d,
        installments: Array.isArray(d.installments) ? d.installments : [],
        requests: Array.isArray(d.requests) ? d.requests : [],
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < refundRecords.length; i += 500) {
      await Refund.bulkCreate(refundRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Refunds: ${refundRecords.length}`);

    // Migrate Progresses
    console.log('Migrating Progress...');
    const progresses = await db.collection('progresses').find({}).toArray();
    const progressRecords = progresses.map(d => {
      delete d._id;
      return {
        ...d,
        updates: Array.isArray(d.updates) ? d.updates : [],
        createdAt: d.createdAt || new Date(),
        updatedAt: d.updatedAt || new Date()
      };
    });
    for (let i = 0; i < progressRecords.length; i += 500) {
      await Progress.bulkCreate(progressRecords.slice(i, i + 500), { logging: false, validate: false });
    }
    console.log(`✅ Progress: ${progressRecords.length}`);

    console.log(`\n🎉 Grand Migration Complete!`);
    await client.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
