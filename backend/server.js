require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://www.cfi247.com',
  'https://cfi247.com',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      bufferTimeoutMS: 30000,
      keepAlive: true,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      retryWrites: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('DATABASE CONNECTION ERROR:', err);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
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

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  if (err instanceof Error && err.message.startsWith('Origin not allowed by CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const { initScheduler } = require('./utils/scheduler');

const startServer = async () => {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initScheduler(); // Start background automations
  });
};

startServer();
