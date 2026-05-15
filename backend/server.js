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
    // console.log(`[CORS] Incoming Origin: "${origin}"`);

    if (!origin) {
      // console.log('[CORS] No origin (likely same-origin request) - allowing');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      // console.log(`[CORS] ✓ Origin "${origin}" is allowed`);
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
    // console.log(`[CORS] ✓ Preflight OPTIONS request from "${origin}" - responding 200`);
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
      maxPoolSize: process.env.VERCEL ? 1 : 10,
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

// --- SECURITY: Global Response Encryption ---
const { encryptData } = require('./utils/cryptoUtils');

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    // Don't encrypt error messages (for easier debugging of auth/validation)
    if (data && (data.error || data.message === 'Unauthorized' || data.message === 'No token provided')) {
      return originalJson.call(this, data);
    }

    // Encrypt the payload
    const encrypted = encryptData(data);
    // We wrap it in an object so frontend knows it's an encrypted payload
    return originalJson.call(this, { _enc: encrypted });
  };
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
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    res.json({ status: "success", message: "Database connected successfully", readyState: mongoose.connection.readyState });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed", error: err.message });
  }
});

// One-time migration: rename old FIR types to Criminal Complaint/FIR
app.get('/api/admin/migrate-fir-types', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    const result = await Case.updateMany(
      { typeOfComplaint: { $in: ['Criminal FIR', 'FIR'] } },
      { $set: { typeOfComplaint: 'Criminal Complaint/FIR' } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    const User = require('./models/User');
    const Task = require('./models/Task');
    const Communication = require('./models/Communication');
    const Refund = require('./models/Refund');
    const Timeline = require('./models/Timeline');

    const { teamFilter, userFilter, startDate, endDate } = req.query;
    let teamDateQuery = {};
    let commDateQuery = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end day
      teamDateQuery = { createdAt: { $gte: start, $lte: end } };
      commDateQuery = { dateTime: { $gte: start.toISOString(), $lte: end.toISOString() } };
    } else if (teamFilter === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      teamDateQuery = { createdAt: { $gte: d } };
      commDateQuery = { dateTime: { $gte: d.toISOString() } };
    } else if (teamFilter === '1month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      teamDateQuery = { createdAt: { $gte: d } };
      commDateQuery = { dateTime: { $gte: d.toISOString() } };
    } else if (teamFilter === '3months') {
      const d = new Date();
      d.setDate(1); // Set to first day of current month
      const end = new Date(d);
      d.setMonth(d.getMonth() - 3);
      const start = d;
      teamDateQuery = { createdAt: { $gte: start, $lt: end } };
      commDateQuery = { dateTime: { $gte: start.toISOString(), $lt: end.toISOString() } };
    }

    let query = { ...teamDateQuery };

    // Always fetch the latest user record from DB (so name is always fresh)
    const dbUser = await User.findById(req.user.id).lean();
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    
    const bypassEodCheck = dbUser?.bypassEodCheck || false;
    let isEodMissed = false;
    
    if (req.user.role !== 'Admin') {
      const Report = require('./models/Report');
      const todayStr = new Date().toISOString().split('T')[0];
      
      const lastSod = await Report.findOne({ userEmail: req.user.email, type: 'SOD', date: { $lt: todayStr } }).sort({ date: -1 }).lean();
      
      if (lastSod) {
        const lastEod = await Report.findOne({ userEmail: req.user.email, type: 'EOD', date: lastSod.date }).lean();
        if (!lastEod) {
          isEodMissed = true;
        }
      }
    }

    // Non-admin: total cases = Assigned to me OR (Unassigned AND Initiated by me)
    // Non-admin: Isolated data view
    if (req.user.role !== 'Admin') {
      const esc = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = { $regex: new RegExp(`^\\s*${esc}\\s*$`, 'i') };

      // Case query: Cases assigned to me OR initiated by me
      query = {
        ...query,
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
    } else if (userFilter) {
      const esc = userFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = { $regex: new RegExp(`^\\s*${esc}\\s*$`, 'i') };
      query = {
        ...query,
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

    const getMetrics = async (matchQuery) => {
      const result = await Case.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
      ]);
      return result.length > 0 ? result[0] : { count: 0, amount: 0 };
    };

    const completedStatuses = ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution'];
    const [
      totalCases,
      linkedByCount,
      openCases,
      settledMetrics,
      closedMetrics,
      highMetrics,
      mediumMetrics,
      lowMetrics
    ] = await Promise.all([
      Case.countDocuments(query),
      Case.countDocuments({ ...query, linkedBy: { $exists: true, $ne: '' } }),
      Case.countDocuments({ ...query, currentStatus: { $nin: completedStatuses } }),
      getMetrics({ ...query, currentStatus: { $in: ['Settled', 'Settlement', 'Resolution'] } }),
      getMetrics({ ...query, currentStatus: { $in: ['Closed', 'Closure'] } }),
      getMetrics({ ...query, priority: 'High' }),
      getMetrics({ ...query, priority: 'Medium' }),
      getMetrics({ ...query, priority: 'Low' })
    ]);

    const settledCases = settledMetrics.count;
    const settledAmount = settledMetrics.amount;
    const closedCases = closedMetrics.count;
    const closedAmount = closedMetrics.amount;
    const highPriority = highMetrics.count;
    const highPriorityAmount = highMetrics.amount;
    const mediumPriority = mediumMetrics.count;
    const mediumPriorityAmount = mediumMetrics.amount;
    const lowPriority = lowMetrics.count;
    const lowPriorityAmount = lowMetrics.amount;

    // Financial Metric: Sum of totalAmtPaid across all cases
    const totalAmtPaidResult = await Case.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
    ]);
    const totalAmountPaid = totalAmtPaidResult.length > 0 ? totalAmtPaidResult[0].total : 0;

    const unassignedCount = await Case.countDocuments({
      ...query,
      $and: [
        { $or: [{ initiatedBy: { $regex: /^\s*$/ } }, { initiatedBy: { $exists: false } }, { initiatedBy: null }] },
        { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] }
      ]
    });

    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const dateStrIST = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${dateStrIST}T00:00:00+05:30`);

    let timelineQuery = {};
    const [myCaseIds, casesCreatedToday] = await Promise.all([
      req.user.role !== 'Admin' ? Case.find(query).distinct('caseId') : Promise.resolve([]),
      Case.countDocuments({ ...query, createdAt: { $gte: startOfToday } })
    ]);

    if (req.user.role !== 'Admin') {
      timelineQuery = { caseId: { $in: myCaseIds } };
    }

    const [
      documentsUploadedToday,
      communicationsToday,
      totalCommunications,
      progressUpdatesToday
    ] = await Promise.all([
      Timeline.countDocuments({
        ...timelineQuery,
        eventType: { $in: ['Document Upload', 'Document Uploaded'] },
        createdAt: { $gte: startOfToday }
      }),
      Timeline.countDocuments({
        ...timelineQuery,
        eventType: { $in: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] },
        createdAt: { $gte: startOfToday }
      }),
      Timeline.countDocuments({
        ...timelineQuery,
        eventType: { $in: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] }
      }),
      Timeline.countDocuments({
        ...timelineQuery,
        eventType: { $in: ['Progress Update', 'Status Update'] },
        createdAt: { $gte: startOfToday }
      })
    ]);

    const pendingTasksCount = await Task.countDocuments({
      ...(req.user.role !== 'Admin' ? { assignee: userName } : {}),
      status: { $ne: 'Completed' }
    });

    const today = new Date().toISOString().split('T')[0];
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dueSoonDate = twoDaysFromNow.toISOString().split('T')[0];

    const refundQuery = {
      ...(req.user.role !== 'Admin' ? { requestedBy: req.user.email } : {}),
      status: 'Approved'
    };

    const [overdueActions, dueSoonActions, refundsPaid, allRefunds, overdueCasesCount] = await Promise.all([
      Case.find({ ...query, nextActionDate: { $lt: today }, currentStatus: { $ne: 'Closed' } }).limit(50).lean(),
      Case.find({ ...query, nextActionDate: { $gte: today, $lte: dueSoonDate }, currentStatus: { $ne: 'Closed' } }).limit(50).lean(),
      Refund.find({ ...(req.user.role !== 'Admin' ? { requestedBy: req.user.email } : {}), status: 'Paid' }).lean(),
      Refund.find(refundQuery).lean(),
      Case.countDocuments({ ...query, nextActionDate: { $lt: today }, currentStatus: { $ne: 'Closed' } })
    ]);

    const totalRefundAmount = refundsPaid.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    const provisions = {
      today: { count: 0, amount: 0 },
      thisWeek: { count: 0, amount: 0 },
      thisMonth: { count: 0, amount: 0 },
      next6Months: { count: 0, amount: 0 }
    };

    const now = new Date();
    const startOfTodayForRefunds = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfTodayForRefunds = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const endOfThisWeekForRefunds = new Date(startOfTodayForRefunds);
    endOfThisWeekForRefunds.setDate(endOfThisWeekForRefunds.getDate() + 7);
    
    const endOfThisMonthForRefunds = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const endOf6MonthsForRefunds = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate(), 23, 59, 59, 999);

    allRefunds.forEach(r => {
      if (r.installments && r.installments.length > 0) {
        r.installments.forEach(inst => {
          if (inst.status === 'Pending' && inst.dueDate) {
            const dueDate = new Date(inst.dueDate);
            const amt = Number(inst.amount) || 0;
            
            if (dueDate >= startOfTodayForRefunds && dueDate <= endOfTodayForRefunds) {
              provisions.today.count++;
              provisions.today.amount += amt;
            }
            if (dueDate >= startOfTodayForRefunds && dueDate <= endOfThisWeekForRefunds) {
              provisions.thisWeek.count++;
              provisions.thisWeek.amount += amt;
            }
            if (dueDate >= startOfTodayForRefunds && dueDate <= endOfThisMonthForRefunds) {
              provisions.thisMonth.count++;
              provisions.thisMonth.amount += amt;
            }
            if (dueDate >= startOfTodayForRefunds && dueDate <= endOf6MonthsForRefunds) {
              provisions.next6Months.count++;
              provisions.next6Months.amount += amt;
            }
          }
        });
      } else {
        const amt = Number(r.amount) || 0;
        const date = r.paymentDate ? new Date(r.paymentDate) : (r.timestamp ? new Date(r.timestamp) : now);
        
        if (date >= startOfTodayForRefunds && date <= endOfTodayForRefunds) {
          provisions.today.count++;
          provisions.today.amount += amt;
        }
        if (date >= startOfTodayForRefunds && date <= endOfThisWeekForRefunds) {
          provisions.thisWeek.count++;
          provisions.thisWeek.amount += amt;
        }
        if (date >= startOfTodayForRefunds && date <= endOfThisMonthForRefunds) {
          provisions.thisMonth.count++;
          provisions.thisMonth.amount += amt;
        }
        if (date >= startOfTodayForRefunds && date <= endOf6MonthsForRefunds) {
          provisions.next6Months.count++;
          provisions.next6Months.amount += amt;
        }
      }
    });

    // Financial Metrics Isolation: Show data for all communications related to cases the staff member OWNS
    let commQuery = {};
    if (req.user.role !== 'Admin') {
      commQuery = { caseId: { $in: myCaseIds } };
    }

    const [commsForSum, recentCases, highPriorityCases] = await Promise.all([
      Communication.find(commQuery).lean(),
      Case.find(query).sort({ createdAt: -1 }).limit(10).lean(),
      Case.find({ ...query, priority: 'High', currentStatus: { $nin: ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution'] } }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Group by caseId to avoid double-counting demand/saved amounts from multiple logs of the same case
    const caseMetrics = {};
    commsForSum.forEach(c => {
      const caseId = c.caseId || 'unlinked';
      if (!caseMetrics[caseId]) {
        caseMetrics[caseId] = { demand: 0, saved: 0 };
      }

      const demandVal = Number(c.refundDemanded) || Number(c.demandAmount) || 0;
      const savedVal = Number(c.amountSaved) || 0;

      // Update with the maximum value found for this case
      if (demandVal > caseMetrics[caseId].demand) caseMetrics[caseId].demand = demandVal;
      if (savedVal > caseMetrics[caseId].saved) caseMetrics[caseId].saved = savedVal;
    });

    const totalDemandAmount = Object.values(caseMetrics).reduce((sum, m) => sum + m.demand, 0);
    const totalAmountSaved = Object.values(caseMetrics).reduce((sum, m) => sum + m.saved, 0);

    // Fetch Dynamic Case Type Wise Data
    const caseTypeAggregation = await Case.aggregate([
      { $match: query },
      { $group: { _id: '$typeOfComplaint', count: { $sum: 1 }, totalAmount: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } },
      { $sort: { count: -1 } }
    ]);
    const caseTypeWiseData = caseTypeAggregation.map(item => ({ caseType: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));

    // ── Threat Trends (Last 30 Days) ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const threatTrendAggregation = await Case.aggregate([
      { $match: { ...query, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$typeOfComplaint"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Reshape data for Recharts
    const threatTrendData = [];
    const dateMap = {};

    // Get all unique case types found in this period
    const foundTypes = new Set();
    threatTrendAggregation.forEach(item => {
      if (item._id.type) foundTypes.add(item._id.type);
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      
      dateMap[dayStr] = { date: label };
      // Initialize all found types with 0
      foundTypes.forEach(type => {
        dateMap[dayStr][type] = 0;
      });
    }

    threatTrendAggregation.forEach(item => {
      const date = item._id.date;
      const type = item._id.type;
      const count = item.count;
      
      if (dateMap[date] && type) {
        dateMap[date][type] = count;
      }
    });

    const threatTrendDataArray = Object.values(dateMap);

    // Sort types by total count in this period
    const typeTotals = {};
    threatTrendAggregation.forEach(item => {
      const type = item._id.type || 'Unknown';
      typeTotals[type] = (typeTotals[type] || 0) + item.count;
    });

    const sortedTypes = Object.keys(typeTotals).sort((a, b) => typeTotals[b] - typeTotals[a]);

    // Fetch Dynamic Source of Complaint Data
    const sourceAggregation = await Case.aggregate([
      { $match: query },
      { $group: { _id: '$sourceOfComplaint', count: { $sum: 1 }, totalAmount: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } },
      { $sort: { count: -1 } }
    ]);
    const sourceWiseData = sourceAggregation.map(item => ({ source: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));

    // ── Team Performance (Admin Only) ──
    let teamPerformance = [];
    if (req.user.role === 'Admin') {
      const allUsers = await User.find({ role: { $regex: /^operations$/i } }).lean();

      const casePipeline = [];
      if (Object.keys(teamDateQuery).length > 0) {
        casePipeline.push({ $match: teamDateQuery });
      }
      casePipeline.push({
        $addFields: {
          calculatedUser: {
            $cond: {
              if: { $eq: [{ $trim: { input: { $ifNull: ["$assignedTo", ""] } } }, ""] },
              then: "$initiatedBy",
              else: "$assignedTo"
            }
          }
        }
      });
      casePipeline.push({
        $group: {
          _id: "$calculatedUser",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $not: [{ $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution']] }] }, 1, 0] } },
          settled: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution']] }, 1, 0] } },
          overdue: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $lt: ["$nextActionDate", today] }, 
                    { $not: [{ $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution']] }] }
                  ] 
                }, 
                1, 
                0
              ] 
            } 
          }
        }
      });
      const caseCounts = await Case.aggregate(casePipeline);

      const taskPipeline = [{ $match: { status: { $ne: 'Completed' } } }];
      if (Object.keys(teamDateQuery).length > 0) {
        taskPipeline.push({ $match: teamDateQuery });
      }
      taskPipeline.push({ $group: { _id: "$assignee", count: { $sum: 1 } } });
      const taskCounts = await Task.aggregate(taskPipeline);

      const commPipeline = [];
      if (Object.keys(commDateQuery).length > 0) {
        commPipeline.push({ $match: commDateQuery });
      }
      commPipeline.push({ $group: { _id: "$loggedBy", totalSaved: { $sum: { $convert: { input: "$amountSaved", to: "double", onError: 0, onNull: 0 } } } } });
      const savedAmounts = await Communication.aggregate(commPipeline);

      teamPerformance = allUsers.map(u => {
        const uName = (u.fullName || u.name || '').trim();
        const stats = caseCounts.find(c => c._id && c._id.trim().toLowerCase() === uName.toLowerCase()) || { total: 0, pending: 0, settled: 0, overdue: 0 };
        const tasks = taskCounts.find(t => t._id && t._id.trim().toLowerCase() === uName.toLowerCase()) || { count: 0 };
        const saved = savedAmounts.find(s => (s._id && s._id.trim().toLowerCase() === uName.toLowerCase()) || (s._id && s._id.trim().toLowerCase() === u.email.toLowerCase())) || { totalSaved: 0 };

        const parts = uName.split(' ').filter(Boolean);
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'U');
        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

        return { id: u._id, name: uName, email: u.email, role: u.role, initials, color: colors[uName.length % colors.length], assigned: stats.total, pending: stats.overdue || 0, settled: stats.settled, pendingTasks: tasks.count, totalSaved: saved.totalSaved };
      }).sort((a, b) => b.assigned - a.assigned);
    }

    // ── Trend Data (7 Days) ──
    const trendData = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendAggregation = await Case.aggregate([
      { $match: { ...query, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          newCases: { $sum: 1 },
          highPriority: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayData = trendAggregation.find(t => t._id === dayStr) || { newCases: 0, highPriority: 0 };

      trendData.push({
        date: label,
        newCases: dayData.newCases,
        closedCases: 0,
        highPriority: dayData.highPriority
      });
    }

    // ── Threat Matrix Analysis ──
    const threatAnalysis = caseTypeWiseData.slice(0, 5).map(item => ({
      type: item.caseType,
      count: item.count,
      amount: item.totalAmount || 0
    }));

    // ── Collection Potential (Non-settled demand) ──
    const collectionPotentialQuery = { ...query, currentStatus: { $nin: completedStatuses } };
    const potentialComms = await Communication.find(collectionPotentialQuery).lean();
    const collectionPotential = potentialComms.reduce((sum, c) => sum + (Number(c.demandAmount) || Number(c.refundDemanded) || 0), 0);

    // ── Live Escalations (High priority updated recently) ──
    const fortyEightHrsAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const liveEscalations = await Case.countDocuments({
      ...query,
      priority: 'High',
      updatedAt: { $gte: fortyEightHrsAgo },
      currentStatus: { $nin: completedStatuses }
    });

    // ── System Violations ──
    const violations = {
      sodNotSubmitted: 0,
      eodNotSubmitted: 0,
      noUpdate48Hrs: await Case.countDocuments({ ...query, updatedAt: { $lt: fortyEightHrsAgo }, currentStatus: { $nin: completedStatuses } }),
      slaBreached: await Case.countDocuments({ ...query, priority: 'High', nextActionDate: { $lt: today }, currentStatus: { $nin: completedStatuses } })
    };

    // ── Amount at Risk & Pending Approvals ──
    const amountAtRisk = totalDemandAmount;
    
    const RefundModel = require('./models/Refund');
    const pendingApprovalsResult = await RefundModel.aggregate([
      { $match: { status: 'Pending Admin Approval' } },
      { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$amount', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
    ]);
    const pendingApprovals = pendingApprovalsResult.length > 0 ? pendingApprovalsResult[0].total : 0;

    // ── Time Bound Actions ──
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];
    
    const tomorrowObj = new Date();
    tomorrowObj.setDate(todayObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
    
    const dayAfterTomorrowObj = new Date();
    dayAfterTomorrowObj.setDate(todayObj.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrowObj.toISOString().split('T')[0];

    // Using startOfToday defined earlier for timezone consistency

    const targetUserStr = String(userFilter || userName || '');
    const esc = targetUserStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^\\s*${esc}\\s*$`, 'i');
    const taskUserQuery = (req.user.role !== 'Admin' || userFilter) ? {
      $or: [
        { assignee: nameRegex },
        { createdBy: req.user.email }
      ]
    } : {};
    
    // Removed hardcoded debug file writing

    const timeBoundActions = {
      dueToday: await Task.countDocuments({
        ...taskUserQuery,
        status: { $nin: ['Completed', 'Done'] },
        $or: [
          { dueDate: today },
          { 
            dueDate: { $in: [null, ""] },
            createdAt: { $gte: startOfToday }
          }
        ]
      }),
      dueWithin24h: await Task.countDocuments({
        ...taskUserQuery,
        status: { $nin: ['Completed', 'Done'] },
        dueDate: tomorrowStr
      }),
      dueWithin48h: await Task.countDocuments({
        ...taskUserQuery,
        status: { $nin: ['Completed', 'Done'] },
        dueDate: dayAfterTomorrowStr
      }),
      overdue: await Task.countDocuments({
        ...taskUserQuery,
        status: { $nin: ['Completed', 'Done'] },
        reminderDateTime: { $lt: new Date().toISOString(), $ne: '' }
      }),
      actionTakenToday: await Task.countDocuments({
        ...taskUserQuery,
        status: 'Completed',
        updatedAt: { $gte: startOfToday }
      })
    };

    // ── Compliance Rate & Detailed Team Stats ──
    if (req.user.role === 'Admin') {
      const Report = require('./models/Report');
      const reportsToday = await Report.find({
        createdAt: { $gte: startOfToday }
      }).lean();

      const fortyEightHrsAgo = new Date();
      fortyEightHrsAgo.setHours(fortyEightHrsAgo.getHours() - 48);
      const reportsLast48Hrs = await Report.find({
        createdAt: { $gte: fortyEightHrsAgo }
      }).lean();

      // Simple compliance calculation: percentage of active users who submitted SOD today
      const allNonAdmins = await User.find({ role: { $ne: 'Admin' } }).lean();
      const missingSodUsers = [];
      const missingEodUsers = [];
      const missingNoUpdateUsers = [];

      await Promise.all(allNonAdmins.map(async (user) => {
        const hasSod = reportsToday.some(r => r.type === 'SOD' && (r.userEmail === user.email || r.userName === user.fullName));
        const hasReport48h = reportsLast48Hrs.some(r => r.userEmail === user.email || r.userName === user.fullName);

        if (!hasSod) missingSodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
        if (!hasReport48h) missingNoUpdateUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });

        // Check for missed EOD on last active day
        const lastSod = await Report.findOne({ userEmail: user.email, type: 'SOD', date: { $lt: dateStrIST } }).sort({ date: -1 }).lean();
        if (lastSod) {
          const lastEod = await Report.findOne({ userEmail: user.email, type: 'EOD', date: lastSod.date }).lean();
          if (!lastEod) {
            missingEodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
          }
        }
      }));

      const complianceRate = allNonAdmins.length > 0 ? Math.round(((allNonAdmins.length - missingSodUsers.length) / allNonAdmins.length) * 100) : 100;

      const d = new Date();
      let dateStr = '';
      let reportQuery = {};
      
      if (teamFilter === '7days') {
        d.setDate(d.getDate() - 7);
        dateStr = d.toISOString().split('T')[0];
        reportQuery = { date: { $gte: dateStr } };
      } else if (teamFilter === '1month') {
        d.setMonth(d.getMonth() - 1);
        dateStr = d.toISOString().split('T')[0];
        reportQuery = { date: { $gte: dateStr } };
      } else if (teamFilter === '3months') {
        d.setDate(1); // First day of current month
        const endStr = d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() - 3);
        const startStr = d.toISOString().split('T')[0];
        reportQuery = { date: { $gte: startStr, $lt: endStr } };
      } else if (startDate && endDate) {
        dateStr = startDate.split('T')[0];
        reportQuery = { date: { $gte: dateStr } };
      } else {
        d.setDate(d.getDate() - 7); // Default to 7 days
        dateStr = d.toISOString().split('T')[0];
        reportQuery = { date: { $gte: dateStr } };
      }
      
      const reportsForDuration = await require('./models/Report').find(reportQuery);

      const parseDuration = (durationStr) => {
        if (!durationStr) return 0;
        const hoursMatch = durationStr.match(/(\d+)\s*h/);
        const minsMatch = durationStr.match(/(\d+)\s*m/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
        return hours * 60 + mins;
      };

      const parseTimeString = (timeStr) => {
        if (!timeStr) return null;
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (!match) return null;
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3].toLowerCase();
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
      };

      const formatDuration = (startTime, endTime) => {
        const start = parseTimeString(startTime);
        const end = parseTimeString(endTime);
        if (!start || !end) return '';
        let diff = (end - start) / 1000 / 60;
        if (diff < 0) diff += 24 * 60;
        const hours = Math.floor(diff / 60);
        const minutes = Math.round(diff % 60);
        return `${hours}h ${minutes}m`;
      };

      teamPerformance = teamPerformance.map(staff => {
        const staffReports = reportsForDuration.filter(r => (r.userName === staff.name || r.userEmail === staff.email));
        
        // Group by date
        const groups = {};
        staffReports.forEach(r => {
          const key = r.date || 'unknown';
          if (!groups[key]) groups[key] = { sod: null, eod: null };
          if (r.type === 'SOD') groups[key].sod = r;
          if (r.type === 'EOD') groups[key].eod = r;
        });

        let totalMins = 0;
        let count = 0;

        Object.values(groups).forEach(group => {
          const checkInTime = group.sod?.checkInTime || group.eod?.checkInTime || '';
          const checkOutTime = group.eod?.checkOutTime || group.sod?.checkOutTime || '';
          
          let durationStr = group.eod?.workDuration;
          if (!durationStr || durationStr === 'Calculating...') {
            if (checkInTime && checkOutTime) {
              durationStr = formatDuration(checkInTime, checkOutTime);
            } else if (checkInTime && group.sod?.date === new Date().toISOString().split('T')[0]) {
              // Fallback for today's ongoing work (using current time as end time)
              const now = new Date();
              const nowStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              durationStr = formatDuration(checkInTime, nowStr);
            }
          }

          if (durationStr && durationStr !== 'Calculating...') {
            totalMins += parseDuration(durationStr);
            count++;
          }
        });

        let responseTime = 'N/A';
        if (count > 0) {
          const avgMins = Math.round(totalMins / count);
          responseTime = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
        }

        const sodReport = reportsToday.find(r => r.type === 'SOD' && (r.userName === staff.name || r.userEmail === staff.email));

        return {
          ...staff,
          isOnline: !!sodReport,
          responseTime: responseTime
        };
      });

      // Removed hardcoded debug file writing

      violations.sodNotSubmitted = missingSodUsers.length;
      violations.eodNotSubmitted = missingEodUsers.length;
      violations.noUpdate48Hrs = missingNoUpdateUsers.length;
      violations.missingSodUsers = missingSodUsers;
      violations.missingEodUsers = missingEodUsers;
      violations.missingNoUpdateUsers = missingNoUpdateUsers;

      // ── Active Users Tracking ──
      const AuditLog = require('./models/AuditLog');
      const startOfTodayStr = startOfToday.toISOString();
      const logsToday = await AuditLog.find({
        timestamp: { $gte: startOfTodayStr }
      }).sort({ timestamp: 1 }).lean();

      const userLogs = {};
      logsToday.forEach(log => {
        const email = (log.user || '').toLowerCase();
        if (!userLogs[email]) {
          userLogs[email] = [];
        }
        userLogs[email].push(log);
      });

      const sixHrsAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      // Fetch absolute last log for all users to determine status
      const lastLogs = await AuditLog.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$user", lastLog: { $first: "$$ROOT" } } }
      ]);
      const lastLogMap = {};
      lastLogs.forEach(l => {
        lastLogMap[(l._id || '').toLowerCase()] = l.lastLog;
      });

      // Fetch last login for all users
      const lastLogins = await AuditLog.aggregate([
        { $match: { category: 'Login' } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$user", lastLogin: { $first: "$timestamp" } } }
      ]);
      const lastLoginMap = {};
      lastLogins.forEach(l => {
        lastLoginMap[(l._id || '').toLowerCase()] = l.lastLogin;
      });

      // Fetch last logout for all users
      const lastLogouts = await AuditLog.aggregate([
        { $match: { category: 'Logout' } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$user", lastLogout: { $first: "$timestamp" } } }
      ]);
      const lastLogoutMap = {};
      lastLogouts.forEach(l => {
        lastLogoutMap[(l._id || '').toLowerCase()] = l.lastLogout;
      });

      const activeUsers = allNonAdmins.map(u => {
        const userEmailKey = (u.email || '').toLowerCase();
        const logs = userLogs[userEmailKey] || [];
        const lastLog = logs[logs.length - 1];

        return {
          name: u.fullName || u.email,
          email: u.email,
          role: u.role,
          status: (() => {
            const userLastLog = lastLogMap[userEmailKey];
            if (userLastLog) {
              const isLogout = userLastLog.category === 'Logout';
              const isRecent = userLastLog.timestamp >= sixHrsAgo;
              if (!isLogout && isRecent) return 'Active';
            }
            return 'Inactive';
          })(),
          loginTime: lastLoginMap[userEmailKey] || null,
          logoutTime: lastLogoutMap[userEmailKey] || null,
          lastActiveTime: lastLog ? lastLog.timestamp : null
        };
      });

      res.json({
        threatTrendData: threatTrendDataArray,
        linkedByCount,
        threatTrendTypes: sortedTypes,
        totalCases,
        openCases,
        settledCases,
        settledAmount,
        closedCases,
        closedAmount,
        casesCreatedToday,
        documentsUploadedToday,
        communicationsToday,
        totalCommunications,
        progressUpdatesToday,
        pendingTasksCount,
        highPriority,
        highPriorityAmount,
        mediumPriority,
        mediumPriorityAmount,
        lowPriority,
        lowPriorityAmount,
        overdueActions,
        dueSoonActions,
        recentCases,
        highPriorityCases,
        teamPerformance,
        totalRefundAmount,
        totalAmountSaved,
        totalDemandAmount,
        caseTypeWiseData,
        sourceWiseData,
        unassignedCount,
        trendData,
        threatAnalysis,
        collectionPotential,
        totalAmountPaid,
        liveEscalations,
        complianceRate,
        violations,
        timeBoundActions,
        activeUsers,
        amountAtRisk,
        pendingApprovals,
        provisions,
        overdue: timeBoundActions.overdue,
        isEodMissed,
        bypassEodCheck
      });
    } else {
      // Non-Admin response
      res.json({
        threatTrendData: threatTrendDataArray,
        threatTrendTypes: sortedTypes,
        totalCases,
        openCases,
        settledCases,
        settledAmount,
        closedCases,
        closedAmount,
        casesCreatedToday,
        documentsUploadedToday,
        communicationsToday,
        totalCommunications,
        progressUpdatesToday,
        pendingTasksCount,
        highPriority,
        highPriorityAmount,
        mediumPriority,
        mediumPriorityAmount,
        lowPriority,
        lowPriorityAmount,
        overdueActions,
        dueSoonActions,
        recentCases,
        totalRefundAmount,
        totalAmountSaved,
        totalDemandAmount,
        caseTypeWiseData,
        sourceWiseData,
        unassignedCount,
        totalAmountPaid,
        trendData,
        provisions,
        overdue: timeBoundActions.overdue,
        isEodMissed,
        bypassEodCheck,
        timeBoundActions
      });
    }
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    // Removed hardcoded error file writing
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