const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://developer-team:AItest2025@cluster0.h077o.mongodb.net/rrr_data?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Case = require('./models/Case');
  const cases = await Case.find({ $or: [{ assignedTo: /divya/i }, { initiatedBy: /divya/i }] }).lean();
  console.log('Total Cases for Divya:', cases.length);
  const closed = cases.filter(c => ['Settled', 'settled', 'Settlement', 'settlement', 'Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed'].includes(c.currentStatus));
  console.log('Closed cases:', closed.length);
  console.log('All statuses for Divya:', [...new Set(cases.map(c => c.currentStatus))]);
  mongoose.disconnect();
});
