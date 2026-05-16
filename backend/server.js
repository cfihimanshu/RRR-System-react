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
    const Report = require('./models/Report');

    const { teamFilter, userFilter, startDate, endDate, perfStartDate, perfEndDate } = req.query;
    let teamDateQuery = {};
    let commDateQuery = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      teamDateQuery = { createdAt: { $gte: start, $lte: end } };
    } else if (teamFilter === '7days') {
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - 7);
      teamDateQuery = { createdAt: { $gte: d } };
    } else if (teamFilter === '1month') {
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setMonth(d.getMonth() - 1);
      teamDateQuery = { createdAt: { $gte: d } };
    } else if (teamFilter === '3months') {
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(1);
      const end = new Date(d);
      d.setMonth(d.getMonth() - 3);
      teamDateQuery = { createdAt: { $gte: d, $lt: end } };
    }

    // Ownership filter logic
    const dbUser = await User.findById(req.user.id).lean();
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    let userEmail = (dbUser?.email || req.user.email || '').trim();
    let userId = req.user.id;
    
    // Ultra-flexible regex: match any part of name, email, or ID
    // We filter out very short common words but keep significant ones
    const firstName = userName.split(/\s+/)[0];
    const parts = [userName, userEmail, userId];
    if (firstName && firstName.length >= 3) {
      parts.push(firstName);
    }
    const filteredParts = parts.filter(p => p && p.trim().length > 0);
    const uniqueParts = [...new Set(filteredParts.map(p => p.toLowerCase()))];
    const escapedParts = uniqueParts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    const myNameRegex = { $regex: new RegExp(escapedParts.join('|'), 'i') };

    let ownershipQuery = {};
    let activeNameRegex = myNameRegex;

    if (req.user.role !== 'Admin') {
      ownershipQuery = {
        $or: [
          { assignedTo: myNameRegex },
          {
            $and: [
              { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] },
              { initiatedBy: myNameRegex }
            ]
          }
        ]
      };
    } else if (userFilter) {
      const filterEsc = userFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      activeNameRegex = { $regex: new RegExp(`^\\s*${filterEsc}\\s*$`, 'i') };
      ownershipQuery = {
        $or: [
          { assignedTo: activeNameRegex },
          {
            $and: [
              { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] },
              { initiatedBy: activeNameRegex }
            ]
          }
        ]
      };
    }

    let baseQuery = { ...ownershipQuery };
    let query = { ...teamDateQuery, ...ownershipQuery };
    const nameRegex = activeNameRegex; 

    const bypassEodCheck = dbUser?.bypassEodCheck || false;
    let isEodMissed = false;
    
    if (req.user.role !== 'Admin') {
      const Report = require('./models/Report');
      const nowForIST = new Date();
      const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
      const todayStr = istTime.toISOString().split('T')[0];
      
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
    // Removed redundant query re-definitions

    
    const completedStatuses = ['Settled', 'settled', 'Settlement', 'settlement', 'Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed'];
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const dateStrIST = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${dateStrIST}T00:00:00+05:30`);
    const fortyEightHrsAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dueSoonDate = twoDaysFromNow.toISOString().split('T')[0];
    
    const tomorrowObj = new Date();
    tomorrowObj.setDate(nowForIST.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
    const dayAfterTomorrowObj = new Date();
    dayAfterTomorrowObj.setDate(nowForIST.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrowObj.toISOString().split('T')[0];

    const refundQuery = {
      ...(req.user.role !== 'Admin' ? { requestedBy: req.user.email } : {}),
      status: 'Approved'
    };

    const targetUserStr = String(userFilter || userName || '');
    const escUser = targetUserStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userQueryRegex = new RegExp(escUser, 'i');
    const taskUserQuery = (req.user.role !== 'Admin' || userFilter) ? {
      $or: [
        { assignee: userQueryRegex },
        { createdBy: req.user.email }
      ]
    } : {};


    let myCaseIds = [];
    if (req.user.role !== 'Admin') {
      myCaseIds = await Case.distinct('caseId', query);
    }
    const timelineQuery = req.user.role !== 'Admin' ? { caseId: { $in: myCaseIds } } : {};


    const [caseMetricsFacet, timelineMetrics, refundMetrics, taskMetrics] = await Promise.all([
      Case.aggregate([
        { $match: baseQuery },
        {
          $facet: {
            basic: [
              { $group: { 
                _id: null, 
                totalCases: { $sum: 1 },
                totalAmountPaid: { $sum: { $ifNull: ['$totalAmtPaid', 0] } },
                openCases: { $sum: { $cond: [{ $not: [{ $in: ["$currentStatus", completedStatuses] }] }, 1, 0] } },
                settledCount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'settled', 'Settlement', 'settlement']] }, 1, 0] } },
                settledAmount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'settled', 'Settlement', 'settlement']] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                closedCount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed']] }, 1, 0] } },
                closedAmount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed']] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                criticalPriority: { $sum: { $cond: [{ $eq: ["$priority", "Critical"] }, 1, 0] } },
                criticalPriorityAmount: { $sum: { $cond: [{ $eq: ["$priority", "Critical"] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                highPriority: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] } },
                highPriorityAmount: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                mediumPriority: { $sum: { $cond: [{ $eq: ["$priority", "Medium"] }, 1, 0] } },
                mediumPriorityAmount: { $sum: { $cond: [{ $eq: ["$priority", "Medium"] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                lowPriority: { $sum: { $cond: [{ $eq: ["$priority", "Low"] }, 1, 0] } },
                lowPriorityAmount: { $sum: { $cond: [{ $eq: ["$priority", "Low"] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                linkedByCount: { $sum: { $cond: [{ $and: [{ $gt: ["$linkedBy", null] }, { $ne: ["$linkedBy", ""] }] }, 1, 0] } },
                createdToday: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
                liveEscalations: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $gte: ["$updatedAt", fortyEightHrsAgo] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }] }, 1, 0] } },
                noUpdate48Hrs: { $sum: { $cond: [{ $and: [{ $lt: ["$updatedAt", fortyEightHrsAgo] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }] }, 1, 0] } },
                slaBreached: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $lt: ["$nextActionDate", today] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }] }, 1, 0] } }
              }}
            ],
            unassigned: [
              { $match: {
                $and: [
                  { $or: [{ initiatedBy: { $regex: /^\s*$/ } }, { initiatedBy: { $exists: false } }, { initiatedBy: null }] },
                  { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] }
                ]
              }},
              { $count: "count" }
            ],
            caseTypeWise: [
              { $group: { _id: '$typeOfComplaint', count: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$totalAmtPaid', 0] } } } },
              { $sort: { count: -1 } }
            ],
            sourceWise: [
              { $group: { _id: '$sourceOfComplaint', count: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$totalAmtPaid', 0] } } } },
              { $sort: { count: -1 } }
            ],
            trendData: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                newCases: { $sum: 1 },
                highPriority: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] } }
              }},
              { $sort: { _id: 1 } }
            ],
            overdueActions: [
              { $match: { nextActionDate: { $lt: today }, currentStatus: { $ne: 'Closed' } } },
              { $sort: { nextActionDate: 1 } },
              { $limit: 10 }
            ],
            dueSoonActions: [
              { $match: { nextActionDate: { $gte: today, $lte: dueSoonDate }, currentStatus: { $ne: 'Closed' } } },
              { $sort: { nextActionDate: 1 } },
              { $limit: 10 }
            ],
            recentCases: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 }
            ],
            highPriorityCases: [
              { $match: { priority: 'High', currentStatus: { $nin: completedStatuses } } },
              { $sort: { createdAt: -1 } },
              { $limit: 10 }
            ],
            threatTrends: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              { $group: {
                _id: {
                  date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  type: "$typeOfComplaint"
                },
                count: { $sum: 1 }
              }},
              { $sort: { "_id.date": 1 } }
            ]
          }
        }
      ]),
      Timeline.aggregate([
        { $match: { ...timelineQuery, source: nameRegex } },
        {
          $facet: {
            docsToday: [
              { $match: { eventType: { $in: ['Document Upload', 'Document Uploaded'] }, createdAt: { $gte: startOfToday } } },
              { $count: "count" }
            ],
            commsToday: [
              { $match: { eventType: { $in: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] }, createdAt: { $gte: startOfToday } } },
              { $count: "count" }
            ],
            totalComms: [
              { $match: { eventType: { $in: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] } } },
              { $count: "count" }
            ],
            progressToday: [
              { $match: { eventType: { $in: ['Progress Update', 'Status Update'] }, createdAt: { $gte: startOfToday } } },
              { $count: "count" }
            ]
          }
        }
      ]),
      (async () => {
        const [refundsPaid, allRefunds, pendingApprovalsResult] = await Promise.all([
          Refund.find({ ...(req.user.role !== 'Admin' ? { requestedBy: req.user.email } : {}), status: 'Paid' }).lean(),
          Refund.find(refundQuery).lean(),
          Refund.aggregate([
            { $match: { status: 'Pending Admin Approval' } },
            { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$amount', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
          ])
        ]);
        return { refundsPaid, allRefunds, pendingApprovalsResult };
      })(),
      (async () => {
        const sodReport = await Report.findOne({ userEmail: req.user.email, type: 'SOD', date: dateStrIST });
        const sodTasksCount = sodReport ? (sodReport.myTasksToday?.length || 0) : 0;

        const [pendingTasksCount, dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday] = await Promise.all([
          Task.countDocuments({
            ...(req.user.role !== 'Admin' ? { assignee: userName } : {}),
            status: { $ne: 'Completed' }
          }),
          (async () => {
            const manualCount = await Task.countDocuments({
              ...taskUserQuery,
              status: { $nin: ['Completed', 'Done'] },
              createdAt: { $gte: startOfToday }
            });
            return manualCount + sodTasksCount;
          })(),
          Task.countDocuments({
            ...taskUserQuery,
            status: { $nin: ['Completed', 'Done'] },
            dueDate: tomorrowStr
          }),
          Task.countDocuments({
            ...taskUserQuery,
            status: { $nin: ['Completed', 'Done'] },
            dueDate: dayAfterTomorrowStr
          }),
          Task.countDocuments({
            ...taskUserQuery,
            status: { $nin: ['Completed', 'Done'] },
            reminderDateTime: { $lt: new Date().toISOString(), $ne: '' }
          }),
          Task.countDocuments({
            ...taskUserQuery,
            status: 'Completed',
            updatedAt: { $gte: startOfToday }
          }),
          (async () => {
            const manualCount = await Task.countDocuments({
              ...taskUserQuery,
              createdAt: { $gte: startOfToday }
            });
            return manualCount + sodTasksCount;
          })(),
          Task.countDocuments({
            ...taskUserQuery,
            createdAt: { $gte: startOfToday },
            status: { $in: ['Completed', 'Done'] }
          })
        ]);
        return { pendingTasksCount, dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday };
      })()
    ]);

    const facet = caseMetricsFacet[0] || {};
    const b = facet.basic?.[0] || {};
    
    const totalCases = b.totalCases || 0;
    const totalAmountPaid = b.totalAmountPaid || 0;
    const openCases = b.openCases || 0;
    const settledCases = b.settledCount || 0;
    const settledAmount = b.settledAmount || 0;
    const closedCases = b.closedCount || 0;
    const closedAmount = b.closedAmount || 0;
    const criticalPriority = b.criticalPriority || 0;
    const criticalPriorityAmount = b.criticalPriorityAmount || 0;
    const highPriority = b.highPriority || 0;
    const highPriorityAmount = b.highPriorityAmount || 0;
    const mediumPriority = b.mediumPriority || 0;
    const mediumPriorityAmount = b.mediumPriorityAmount || 0;
    const lowPriority = b.lowPriority || 0;
    const lowPriorityAmount = b.lowPriorityAmount || 0;
    const linkedByCount = b.linkedByCount || 0;
    const casesCreatedToday = b.createdToday || 0;
    const liveEscalations = b.liveEscalations || 0;
    const unassignedCount = facet.unassigned?.[0]?.count || 0;

    const documentsUploadedToday = timelineMetrics[0]?.docsToday?.[0]?.count || 0;
    const communicationsToday = timelineMetrics[0]?.commsToday?.[0]?.count || 0;
    const totalCommunications = timelineMetrics[0]?.totalComms?.[0]?.count || 0;
    const progressUpdatesToday = timelineMetrics[0]?.progressToday?.[0]?.count || 0;

    const { refundsPaid, allRefunds, pendingApprovalsResult } = refundMetrics;
    const totalRefundAmount = refundsPaid.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const pendingApprovals = pendingApprovalsResult.length > 0 ? pendingApprovalsResult[0].total : 0;

    const { pendingTasksCount, dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday } = taskMetrics;
    const timeBoundActions = { dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday };

    const totalCriticalCases = await Case.countDocuments({ ...query, priority: 'High' });
    const closedCriticalCases = await Case.countDocuments({ ...query, priority: 'High', currentStatus: { $in: ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution'] } });

    const yesterday = new Date(istTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayEod = await Report.findOne({ userEmail: req.user.email, type: 'EOD', date: yesterdayStr }).lean();
    const yesterdayEodFilled = yesterdayEod ? 1 : 0;

    const todaySod = await Report.findOne({ userEmail: req.user.email, type: 'SOD', date: dateStrIST }).lean();
    const todayEod = await Report.findOne({ userEmail: req.user.email, type: 'EOD', date: dateStrIST }).lean();
    const lastTimeline = await Timeline.findOne({ source: nameRegex, createdAt: { $gte: startOfToday } }).sort({ createdAt: -1 }).lean();

    const perfDateRange = perfStartDate && perfEndDate ? {
      $gte: new Date(`${perfStartDate}T00:00:00`), 
      $lte: new Date(`${perfEndDate}T23:59:59.999`) 
    } : null;

    const statusRegex = /Settled|Settlement|Closed|Closure|Resolution|Resolved|Done|Complete/i;

    const overdueActions = facet.overdueActions || [];
    const dueSoonActions = facet.dueSoonActions || [];
    const recentCases = facet.recentCases || [];
    const highPriorityCases = facet.highPriorityCases || [];
    const caseTypeWiseData = (facet.caseTypeWise || []).map(item => ({ caseType: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));
    const sourceWiseData = (facet.sourceWise || []).map(item => ({ source: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));    // Performance Evaluation logic
    const perfCaseIds = await Case.distinct('caseId', ownershipQuery);

    const myPerformance = {
      totalCommunications: 0,
      casesResolved: 0,
      naCases: 0,
      overdueCases: await Case.countDocuments({
        ...ownershipQuery,
        currentStatus: { $not: { $regex: /Settled|Closed|Closure|Resolution|Resolved|Done|Complete|NA/i } },
        $or: [
          { nextActionDate: { $lt: dateStrIST } }, 
          { nextActionDate: { $lt: new Date().toISOString().split('T')[0] } }
        ]
      })
    };

    if (perfDateRange) {
      myPerformance.totalCommunications = await Communication.countDocuments({
        loggedBy: activeNameRegex,
        createdAt: perfDateRange
      });

      myPerformance.casesResolved = await Case.countDocuments({
        ...ownershipQuery,
        currentStatus: { $in: completedStatuses },
        updatedAt: perfDateRange
      });

      myPerformance.naCases = await Case.countDocuments({
        ...ownershipQuery,
        typeOfComplaint: { $regex: /NA Non Agreement/i },
        updatedAt: perfDateRange
      });
    } else {
      // Default (all time)
      myPerformance.totalCommunications = await Communication.countDocuments({
        loggedBy: activeNameRegex
      });
      myPerformance.casesResolved = await Case.countDocuments({
        ...ownershipQuery,
        currentStatus: { $in: completedStatuses }
      });
      myPerformance.naCases = await Case.countDocuments({
        ...ownershipQuery,
        typeOfComplaint: { $regex: /NA Non Agreement/i }
      });
    }    // Reshape threatTrends
    const threatTrendAggregation = facet.threatTrends || [];
    const foundTypes = new Set();
    threatTrendAggregation.forEach(item => { if (item._id.type) foundTypes.add(item._id.type); });

    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      dateMap[dayStr] = { date: label };
      foundTypes.forEach(type => { dateMap[dayStr][type] = 0; });
    }
    threatTrendAggregation.forEach(item => {
      if (dateMap[item._id.date] && item._id.type) dateMap[item._id.date][item._id.type] = item.count;
    });
    const threatTrendDataArray = Object.values(dateMap);
    const typeTotals = {};
    threatTrendAggregation.forEach(item => {
      const type = item._id.type || 'Unknown';
      typeTotals[type] = (typeTotals[type] || 0) + item.count;
    });
    const sortedTypes = Object.keys(typeTotals).sort((a, b) => typeTotals[b] - typeTotals[a]);

    // Reshape trendData
    const trendAggregation = facet.trendData || [];
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayData = trendAggregation.find(t => t._id === dayStr) || { newCases: 0, highPriority: 0 };
      trendData.push({ date: label, newCases: dayData.newCases, closedCases: 0, highPriority: dayData.highPriority });
    }

    const threatAnalysis = caseTypeWiseData.slice(0, 5).map(item => ({ type: item.caseType, count: item.count, amount: item.totalAmount || 0 }));
    const violations = {
      sodNotSubmitted: 0,
      eodNotSubmitted: 0,
      noUpdate48Hrs: b.noUpdate48Hrs || 0,
      slaBreached: b.slaBreached || 0
    };

    const provisions = { today: { count: 0, amount: 0 }, thisWeek: { count: 0, amount: 0 }, thisMonth: { count: 0, amount: 0 }, next6Months: { count: 0, amount: 0 } };
    const nowForRefunds = new Date();
    const startOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate());
    const endOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate(), 23, 59, 59, 999);
    const endOfThisWeekForRefunds = new Date(startOfTodayForRefunds);
    endOfThisWeekForRefunds.setDate(endOfThisWeekForRefunds.getDate() + 7);
    const endOfThisMonthForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 1, 0, 23, 59, 59, 999);
    const endOf6MonthsForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 6, nowForRefunds.getDate(), 23, 59, 59, 999);

    allRefunds.forEach(r => {
      const installments = r.installments && r.installments.length > 0 ? r.installments : [{ status: 'Pending', dueDate: r.paymentDate || r.timestamp, amount: r.amount }];
      installments.forEach(inst => {
        if (inst.status === 'Pending' && inst.dueDate) {
          const dueDate = new Date(inst.dueDate);
          const amt = Number(inst.amount) || 0;
          if (dueDate >= startOfTodayForRefunds && dueDate <= endOfTodayForRefunds) { provisions.today.count++; provisions.today.amount += amt; }
          if (dueDate >= startOfTodayForRefunds && dueDate <= endOfThisWeekForRefunds) { provisions.thisWeek.count++; provisions.thisWeek.amount += amt; }
          if (dueDate >= startOfTodayForRefunds && dueDate <= endOfThisMonthForRefunds) { provisions.thisMonth.count++; provisions.thisMonth.amount += amt; }
          if (dueDate >= startOfTodayForRefunds && dueDate <= endOf6MonthsForRefunds) { provisions.next6Months.count++; provisions.next6Months.amount += amt; }
        }
      });
    });

    // Collection Potential and Total Demand/Saved
    let commQuery = {};
    if (req.user.role !== 'Admin') commQuery = { caseId: { $in: myCaseIds } };
    const commsForSum = await Communication.find(commQuery).select('caseId refundDemanded demandAmount amountSaved').lean();
    const caseMetrics = {};
    let collectionPotential = 0;
    commsForSum.forEach(c => {
      const caseId = c.caseId || 'unlinked';
      if (!caseMetrics[caseId]) caseMetrics[caseId] = { demand: 0, saved: 0 };
      const demandVal = Number(c.refundDemanded) || Number(c.demandAmount) || 0;
      const savedVal = Number(c.amountSaved) || 0;
      if (demandVal > caseMetrics[caseId].demand) caseMetrics[caseId].demand = demandVal;
      if (savedVal > caseMetrics[caseId].saved) caseMetrics[caseId].saved = savedVal;
    });
    const totalDemandAmount = Object.values(caseMetrics).reduce((sum, m) => sum + m.demand, 0);
    const totalAmountSaved = Object.values(caseMetrics).reduce((sum, m) => sum + m.saved, 0);
    const amountAtRisk = totalDemandAmount;

    collectionPotential = commsForSum.reduce((sum, c) => {
      return sum + (Number(c.demandAmount) || Number(c.refundDemanded) || 0);
    }, 0);

    let teamPerformance = [];
    let missingSodUsers = [];
    let missingEodUsers = [];
    let missingNoUpdateUsers = [];

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

      // ── Team Performance (Admin Only) ──
      const casePipeline = [];
      if (Object.keys(teamDateQuery).length > 0) {
        casePipeline.push({ 
          $match: { 
            $or: [
              teamDateQuery,
              { updatedAt: teamDateQuery.createdAt }
            ] 
          } 
        });
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
          pending: { $sum: { $cond: [{ $not: [{ $in: ["$currentStatus", completedStatuses] }] }, 1, 0] } },
          settled: { $sum: { $cond: [{ $in: ["$currentStatus", completedStatuses] }, 1, 0] } },
          overdue: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ["$nextActionDate", null] },
                    { $ne: ["$nextActionDate", ""] },
                    { $lt: ["$nextActionDate", today] }, 
                    { $not: [{ $in: ["$currentStatus", completedStatuses] }] }
                  ] 
                }, 1, 0
              ] 
            } 
          }
        }
      });

      const taskPipeline = [{ $match: { status: { $ne: 'Completed' } } }];
      if (Object.keys(teamDateQuery).length > 0) taskPipeline.push({ $match: teamDateQuery });
      taskPipeline.push({ $group: { _id: "$assignee", count: { $sum: 1 } } });

      const commPipeline = [];
      if (Object.keys(commDateQuery).length > 0) commPipeline.push({ $match: commDateQuery });
      commPipeline.push({ $group: { _id: "$loggedBy", totalSaved: { $sum: { $convert: { input: "$amountSaved", to: "double", onError: 0, onNull: 0 } } } } });

      const [caseCounts, taskCounts, savedAmounts] = await Promise.all([
        Case.aggregate(casePipeline),
        Task.aggregate(taskPipeline),
        Communication.aggregate(commPipeline)
      ]);

      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];
      teamPerformance = allNonAdmins.map(u => {
        const uName = (u.fullName || u.name || '').trim();
        
        // Sum up stats if there are multiple groups for the same user (e.g. diff casing)
        const matchingStats = caseCounts.filter(c => c._id && c._id.trim().toLowerCase() === uName.toLowerCase());
        const stats = matchingStats.reduce((acc, curr) => {
          acc.total += curr.total || 0;
          acc.pending += curr.pending || 0;
          acc.settled += curr.settled || 0;
          acc.overdue += curr.overdue || 0;
          return acc;
        }, { total: 0, pending: 0, settled: 0, overdue: 0 });

        const tasks = taskCounts.find(t => t._id && t._id.trim().toLowerCase() === uName.toLowerCase()) || { count: 0 };
        const saved = savedAmounts.find(s => (s._id && s._id.trim().toLowerCase() === uName.toLowerCase()) || (s._id && s._id.trim().toLowerCase() === u.email.toLowerCase())) || { totalSaved: 0 };

        const parts = uName.split(' ').filter(Boolean);
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'U');

        return { id: u._id, name: uName, email: u.email, role: u.role, initials, color: colors[uName.length % colors.length], assigned: stats.total, pending: stats.overdue || 0, settled: stats.settled, pendingTasks: tasks.count, totalSaved: saved.totalSaved };
      }).sort((a, b) => b.assigned - a.assigned);

      // Batch fetch SOD and EOD reports for all users
      const allEmails = allNonAdmins.map(u => u.email);
      const [lastSods, lastEods] = await Promise.all([
        Report.find({ userEmail: { $in: allEmails }, type: 'SOD', date: { $lt: dateStrIST } }).sort({ date: -1 }).lean(),
        Report.find({ userEmail: { $in: allEmails }, type: 'EOD' }).lean()
      ]);

      const sodMap = {};
      lastSods.forEach(s => { if (!sodMap[s.userEmail]) sodMap[s.userEmail] = s; });
      const eodMap = {};
      lastEods.forEach(e => { eodMap[`${e.userEmail}_${e.date}`] = e; });

      allNonAdmins.forEach(user => {
        const hasSod = reportsToday.some(r => r.type === 'SOD' && (r.userEmail === user.email || r.userName === user.fullName));
        const hasReport48h = reportsLast48Hrs.some(r => r.userEmail === user.email || r.userName === user.fullName);

        if (!hasSod) missingSodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
        if (!hasReport48h) missingNoUpdateUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });

        const lastSod = sodMap[user.email];
        if (lastSod) {
          const lastEod = eodMap[`${user.email}_${lastSod.date}`];
          if (!lastEod) missingEodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
        }
      });

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
      
      const reportsForDuration = await require('./models/Report').find(reportQuery).lean();

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
      violations.slaBreached = missingNoUpdateUsers.length; // Per user request to show users with no update for 48hrs
      violations.missingSodUsers = missingSodUsers;
      violations.missingEodUsers = missingEodUsers;
      violations.missingNoUpdateUsers = missingNoUpdateUsers;

      // ── Active Users Tracking (Based on SOD/EOD) ──
      const todayStr = new Date().toISOString().split('T')[0];
      
      const todayReports = await Report.find({ date: todayStr }).lean();
      
      const todaySodMap = {};
      const todayEodMap = {};
      
      todayReports.forEach(r => {
        const email = (r.userEmail || '').toLowerCase();
        if (r.type === 'SOD') {
          todaySodMap[email] = r;
        } else if (r.type === 'EOD') {
          todayEodMap[email] = r;
        }
      });

      const activeUsers = allNonAdmins.map(u => {
        const userEmailKey = (u.email || '').toLowerCase();
        const sod = todaySodMap[userEmailKey];
        const eod = todayEodMap[userEmailKey];

        let status = 'Inactive';
        if (sod && !eod) {
          status = 'Active';
        }

        let duration = '—';
        if (sod) {
          const startTime = new Date(sod.createdAt);
          const endTime = eod ? new Date(eod.createdAt) : new Date();
          const diffMs = endTime - startTime;
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          duration = `${diffHrs}h ${diffMins}m`;
        }

        return {
          name: u.fullName || u.email,
          email: u.email,
          role: u.role,
          status: status,
          sodTime: sod ? (sod.checkInTime || sod.createdAt) : null,
          eodTime: eod ? (eod.checkOutTime || eod.createdAt) : null,
          duration: duration
        };
      });

      res.json({
        myPerformance,
        totalCriticalCases,
        closedCriticalCases,
        yesterdayEodFilled,
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
        criticalPriority,
        criticalPriorityAmount,
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
        bypassEodCheck,
        todaySod,
        todayEod,
        lastTimeline
      });
    } else {
      // Non-Admin response
      res.json({
        myPerformance,
        totalCriticalCases,
        closedCriticalCases,
        yesterdayEodFilled,
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
        timeBoundActions,
        linkedByCount,
        liveEscalations,
        collectionPotential,
        amountAtRisk,
        todaySod,
        todayEod,
        lastTimeline,
        myPerformance,
        teamPerformance,
        missingSodUsers
      });
    }
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    // Removed hardcoded error file writing
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/debug/migrate', async (req, res) => {
  try {
    const db = require('mongoose').connection.db;
    const cases = await db.collection('cases').find({}).toArray();
    let updatedCount = 0;
    
    const cleanNum = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const cleaned = val.toString().replace(/[₹$,]/g, '');
      return parseFloat(cleaned) || 0;
    };

    for (const c of cases) {
      const updates = {};
      if (typeof c.totalAmtPaid === 'string') updates.totalAmtPaid = cleanNum(c.totalAmtPaid);
      if (typeof c.savedAmount === 'string') updates.savedAmount = cleanNum(c.savedAmount);
      if (typeof c.refundedAmount === 'string') updates.refundedAmount = cleanNum(c.refundedAmount);
      if (typeof c.totalMouValue === 'string') updates.totalMouValue = cleanNum(c.totalMouValue);
      if (typeof c.amtInDispute === 'string') updates.amtInDispute = cleanNum(c.amtInDispute);
      
      if (Object.keys(updates).length > 0) {
        await db.collection('cases').updateOne({ _id: c._id }, { $set: updates });
        updatedCount++;
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: `Migration completed. Updated ${updatedCount} cases using raw driver.` }));
  } catch (err) {
    res.status(500).json({ error: err.message });
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