const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Case = require('./models/Case');
  const Progress = require('./models/Progress');
  
  // mock req, res for the route logic
  const progressDocs = await Progress.find({ caseId: 'RRR-SF-2026-0069' }).sort({ createdAt: -1 });
  
  let logs = [];
  for (const doc of progressDocs) {
    if (doc.updates && doc.updates.length > 0) {
      logs.push(...doc.updates);
    } else if (doc.summary) {
      logs.push({
        _id: doc._id,
        stage: doc.stage,
        percentage: doc.percentage,
        summary: doc.summary,
        nextAction: doc.nextAction,
        blockers: doc.blockers,
        followUpDate: doc.followUpDate,
        escalateTo: doc.escalateTo,
        updatedBy: doc.updatedBy,
        createdAt: doc.createdAt || doc.updatedAt || new Date()
      });
    }
  }
  
  const uniqueLogsMap = new Map();
  for (const log of logs) {
    const logObj = log.toObject ? log.toObject() : log;
    const stageKey = logObj.stage || 'no-stage';
    const summaryText = logObj.summary ? logObj.summary.trim() : 'no-summary';
    const summaryKey = `${stageKey}-${summaryText}`;
    uniqueLogsMap.set(summaryKey, logObj);
  }
  
  logs = Array.from(uniqueLogsMap.values());
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  console.log('Total Logs:', logs.length);
  logs.forEach(l => {
    console.log(`- ${l.createdAt}: [${l.stage}] ${l.summary.substring(0, 30)}...`);
  });
  
  process.exit(0);
}).catch(console.error);
