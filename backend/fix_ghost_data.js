const { Sequelize, Op } = require('sequelize');
const env = require('dotenv').config({path: './.env'}).parsed;
const { sequelize } = require('./config/sequelize');

const Progress = require('./sql_models/Progress');
const Timeline = require('./sql_models/Timeline');
const Communication = require('./sql_models/Communication');
const Task = require('./sql_models/Task');
const Document = require('./sql_models/Document');
const History = require('./sql_models/History');

async function run() {
  const caseId = 'RRR-SF-2026-0135';
  const cutoffDate = new Date('2026-06-11T00:00:00.000Z');

  try {
    // 1. Delete ghost Timeline entries
    const tDel = await Timeline.destroy({
      where: {
        caseId,
        createdAt: { [Op.lt]: cutoffDate }
      }
    });
    console.log(`Deleted ${tDel} old Timeline entries`);

    // 2. Fix Progress document
    const progressDoc = await Progress.findOne({ where: { caseId } });
    if (progressDoc) {
      let rawUpdates = progressDoc.updates;
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      if (typeof rawUpdates === 'string') {
        try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
      }
      const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
      
      const filteredUpdates = updates.filter(u => new Date(u.createdAt) >= cutoffDate);
      
      if (filteredUpdates.length !== updates.length) {
        progressDoc.updates = filteredUpdates;
        await progressDoc.save();
        console.log(`Removed ${updates.length - filteredUpdates.length} ghost entries from Progress`);
      }
    }

    // 3. Delete ghost Communications
    const cDel = await Communication.destroy({
      where: { caseId, createdAt: { [Op.lt]: cutoffDate } }
    });
    console.log(`Deleted ${cDel} ghost Communication entries`);

    // 4. Delete ghost Documents
    const dDel = await Document.destroy({
      where: { caseId, createdAt: { [Op.lt]: cutoffDate } }
    });
    console.log(`Deleted ${dDel} ghost Document entries`);

  } catch (err) {
    console.error('Error fixing ghost data:', err);
  } finally {
    process.exit(0);
  }
}
run();
