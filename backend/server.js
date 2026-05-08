require('dotenv').config();
const dns = require('dns');
// Only override DNS servers locally, as it breaks AWS Lambda/Vercel internal telemetry and DNS
if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Set these in your host environment or deployment settings before starting the server.');
  process.exit(1);
}

const allowedOrigins = [
  'https://cfi247.com',
  'https://www.cfi247.com',
  'https://rrr-system-react-l8cr.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
].filter(Boolean);

console.log('✓ Allowed Origins for CORS:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`[CORS] Incoming Origin: "${origin}"`);

    if (!origin) {
      console.log('[CORS] No origin (likely same-origin request) - allowing');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✓ Origin "${origin}" is allowed`);
      return callback(null, true);
    }

    console.warn(`[CORS] ✗ Origin "${origin}" NOT in whitelist`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin || 'no-origin';
  const method = req.method;

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') {
    console.log(`[CORS] ✓ Preflight OPTIONS request from "${origin}" - responding 200`);
    return res.sendStatus(200);
  }

  next();
});

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
    throw err; // Throw instead of exiting
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('[DB] Connecting to database on Vercel...');
        await connectToDatabase();
      }
    } catch (err) {
      return res.status(500).json({ error: "Database connection failed on Vercel", details: err.message });
    }
  }
  next();
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
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/case-study', require('./routes/caseStudy'));

app.get('/api/test-db', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ status: "success", message: "Database connected successfully", readyState: mongoose.connection.readyState });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed", error: err.message });
  }
});

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    const User = require('./models/User');
    let query = {};

    // Always fetch the latest user record from DB (so name is always fresh)
    const dbUser = await User.findById(req.user.id).lean();
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();

    // Non-admin: total cases = Assigned to me OR (Unassigned AND Initiated by me)
    if (req.user.role !== 'Admin') {
      const esc = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = { $regex: new RegExp(`^\\s*${esc}\\s*$`, 'i') };
      query = {
        $or: [
          { assignedTo: nameRegex },
          {
            $and: [
              { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] },
              { initiatedBy: nameRegex }
            ]
          }
        ]
      };
    }

    const totalCases = await Case.countDocuments(query);

    const openCases = await Case.countDocuments({ ...query, currentStatus: { $ne: 'Closed' } });
    const settledCases = await Case.countDocuments({ ...query, currentStatus: { $in: ['Settled', 'Closed', 'Settlement', 'Closure'] } });
    const highPriority = await Case.countDocuments({ ...query, priority: 'High', currentStatus: { $nin: ['Closed', 'Closure'] } });
    const mediumPriority = await Case.countDocuments({ ...query, priority: 'Medium', currentStatus: { $nin: ['Closed', 'Closure'] } });
    const lowPriority = await Case.countDocuments({ ...query, priority: 'Low', currentStatus: { $nin: ['Closed', 'Closure'] } });

    // Unassigned Cases (Both Initiated By and Assigned To are blank)
    const unassignedCount = await Case.countDocuments({
      ...query,
      $and: [
        { $or: [{ initiatedBy: { $regex: /^\s*$/ } }, { initiatedBy: { $exists: false } }, { initiatedBy: null }] },
        { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] }
      ]
    });

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

    let teamPerformance = [];
    if (req.user.role === 'Admin') {
      const allUsers = await User.find({ role: 'Operations' }).lean();
      teamPerformance = await Promise.all(allUsers.map(async (u) => {
        const uName = (u.fullName || u.name || '').trim();
        if (!uName) return null;

        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const esc = escapeRegExp(uName);
        const nameRegex = { $regex: new RegExp(`^\\s*${esc}\\s*$`, 'i') };
        const ownerFilter = {
          $or: [
            { assignedTo: nameRegex },
            {
              $and: [
                { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] },
                { initiatedBy: nameRegex }
              ]
            }
          ]
        };

        // Total cases (assigned or unassigned-initiated)
        const assigned = await Case.countDocuments(ownerFilter);

        // Pending cases (not Closed)
        const pending = await Case.countDocuments({ ...ownerFilter, currentStatus: { $ne: 'Closed' } });

        // Closed Today
        const closedToday = await Case.countDocuments({
          ...ownerFilter,
          currentStatus: 'Closed',
          lastUpdateDate: { $regex: new RegExp(`^${today}`) }
        });

        // Generate initials
        const parts = uName.split(' ').filter(Boolean);
        const initials = parts.length > 1
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'U');

        // Generate a pseudo-random color based on name length
        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];
        const color = colors[uName.length % colors.length];

        return {
          id: u._id,
          name: uName,
          role: u.role,
          initials,
          color,
          assigned,
          pending,
          closedToday
        };
      }));

      teamPerformance = teamPerformance.filter(Boolean).sort((a, b) => b.assigned - a.assigned);
    }

    const recentCases = await Case.find(query).sort({ createdAt: -1 }).limit(10);

    // Fetch Dynamic Case Type Wise Data (Aggregated from DB)
    const caseTypeAggregation = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$typeOfComplaint',
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $convert: {
                input: { $ifNull: ['$totalAmtPaid', '0'] },
                to: 'double',
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const caseTypeWiseData = caseTypeAggregation.map(item => ({
      caseType: item._id || 'Unknown',
      count: item.count,
      totalAmount: item.totalAmount || 0
    }));

    // Fetch Dynamic Source of Complaint Data (Aggregated from DB)
    const sourceAggregation = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sourceOfComplaint',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const sourceWiseData = sourceAggregation.map(item => ({
      source: item._id || 'Unknown',
      count: item.count
    }));

    // Fetch 7-day Trend Data
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      const startOfDay = new Date(new Date(d).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(d).setHours(23, 59, 59, 999));

      // New cases created on this day
      const newCasesCount = await Case.countDocuments({
        ...query,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Closed cases on this day
      const closedCasesCount = await Case.countDocuments({
        ...query,
        currentStatus: { $in: ['Settled', 'Closed'] },
        lastUpdateDate: { $regex: new RegExp(`^${dayStr}`) }
      });

      // High Priority cases created on this day
      const highPriorityCount = await Case.countDocuments({
        ...query,
        priority: 'High',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      trendData.push({
        date: label,
        newCases: newCasesCount,
        closedCases: closedCasesCount,
        highPriority: highPriorityCount
      });
    }

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
      teamPerformance,
      totalRefundAmount,
      caseTypeWiseData,
      sourceWiseData,
      unassignedCount,
      trendData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
const { initScheduler } = require('./utils/scheduler');

const startServer = async () => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error("Startup DB error (non-fatal for Vercel):", err.message);
  }
  
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      initScheduler(); // Start background automations
    });
  }
};

startServer();

// Export app for Vercel Serverless Functions
module.exports = app;