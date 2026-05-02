require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://cfi247.com',
  'https://www.cfi247.com',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
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
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      bufferTimeoutMS: 30000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
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
app.use('/api/progress', require('./routes/progress'));
app.use('/api/case-study', require('./routes/caseStudy'));

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    const User = require('./models/User');
    let query = {};

    // Get the most up-to-date user info if fullName is missing from token
    let userName = req.user.fullName;
    if (!userName) {
      const dbUser = await User.findById(req.user.id);
      userName = dbUser?.fullName || dbUser?.name;
    }
    userName = userName?.trim();

    // Ownership check for non-admins (Assigned or Initiated)
    if (req.user.role !== 'Admin') {
      const dbUser = await User.findById(req.user.id);
      const possibleNames = [
        req.user.fullName,
        dbUser?.fullName,
        dbUser?.name,
        req.user.email
      ].filter(Boolean);

      const regexName = possibleNames.length > 0 ? possibleNames[0] : 'UNKNOWN_USER_FALLBACK';

      query = {
        $or: [
          { assignedTo: { $in: possibleNames } },
          { initiatedBy: { $in: possibleNames } },
          { assignedTo: { $regex: regexName, $options: 'i' } },
          { initiatedBy: { $regex: regexName, $options: 'i' } }
        ]
      };
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

const startServer = async () => {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initScheduler(); // Start background automations
  });
};

startServer();