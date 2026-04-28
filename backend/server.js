require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds instead of waiting forever
  bufferTimeoutMS: 30000, // Increase buffer timeout to 30 seconds
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('DATABASE CONNECTION ERROR:', err.message);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/history', require('./routes/history'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/timeline', require('./routes/timeline'));
app.use('/api/refunds', require('./routes/refunds'));
app.use('/api/auditLogs', require('./routes/auditLogs'));
app.use('/api/sampleData', require('./routes/sampleData'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/agreements', require('./routes/agreements'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    let query = {};
    
    // Ownership check for non-admins
    if (req.user.role !== 'Admin') {
      query.assignedTo = req.user.fullName;
    }

    const totalCases = await Case.countDocuments(query);
    const openCases = await Case.countDocuments({ ...query, currentStatus: { $ne: 'Closed' } });
    const settledCases = await Case.countDocuments({ ...query, currentStatus: 'Settled' });
    const highPriority = await Case.countDocuments({ ...query, priority: 'High', currentStatus: { $ne: 'Closed' } });
    const mediumPriority = await Case.countDocuments({ ...query, priority: 'Medium', currentStatus: { $ne: 'Closed' } });
    const lowPriority = await Case.countDocuments({ ...query, priority: 'Low', currentStatus: { $ne: 'Closed' } });
    
    const today = new Date().toISOString().split('T')[0];
    const overdueActions = await Case.find({ ...query, nextActionDate: { $lt: today }, currentStatus: { $ne: 'Closed' } });
    
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dueSoonDate = twoDaysFromNow.toISOString().split('T')[0];
    const dueSoonActions = await Case.find({ ...query, nextActionDate: { $gte: today, $lte: dueSoonDate }, currentStatus: { $ne: 'Closed' } });
    
    const Refund = require('./models/Refund');
    let refundQuery = { status: 'Paid' };
    if (req.user.role !== 'Admin') {
      refundQuery.requestedBy = req.user.email;
    }
    const refundsForSum = await Refund.find(refundQuery);
    const totalRefundAmount = refundsForSum.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    const recentCases = await Case.find(query).sort({ createdAt: -1 }).limit(10);
    
    res.json({ 
      totalCases, 
      openCases, 
      settledCases, 
      highPriority, 
      mediumPriority, 
      lowPriority, 
      overdueActions, 
      dueSoonActions, 
      recentCases,
      totalRefundAmount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
const { initScheduler } = require('./utils/scheduler');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initScheduler(); // Start background automations
});
