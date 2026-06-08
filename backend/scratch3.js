const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Case = require('./models/Case');
  const Progress = require('./models/Progress');
  const Timeline = require('./models/Timeline');
  
  const caseId = 'RRR-SF-2026-0081';
  
  const progressDocs = await Progress.find({ caseId }).sort({ createdAt: -1 });
  
  let logs = [];
  
  // 1. Fetch Timeline events
  const timelineProgressEvents = await Timeline.find({
    caseId: caseId,
    eventType: 'Progress Update'
  }).lean();

  for (const tEvent of timelineProgressEvents) {
    logs.push({
      _id: tEvent._id,
      stage: tEvent.metadata?.stage,
      percentage: tEvent.metadata?.percentage,
      summary: tEvent.details,
      nextAction: tEvent.metadata?.nextAction,
      blockers: tEvent.metadata?.blockers,
      followUpDate: tEvent.metadata?.followUpDate,
      escalateTo: tEvent.metadata?.escalateTo,
      attachment: tEvent.metadata?.attachment,
      updatedBy: tEvent.source,
      createdAt: tEvent.eventDate || tEvent.createdAt,
      _fromTimeline: true
    });
  }
  
  // 2. Fetch Progress events
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
    console.log(`- ${l.createdAt}: [${l.stage}] ${l.summary.substring(0, 50)}... (From Timeline? ${!!l._fromTimeline})`);
  });
  
  process.exit(0);
}).catch(console.error);
