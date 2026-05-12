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

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./models/Case');
    const User = require('./models/User');
    const Task = require('./models/Task');
    const Communication = require('./models/Communication');
    const Refund = require('./models/Refund');
    const Timeline = require('./models/Timeline');

    const { teamFilter } = req.query;
    let teamDateQuery = {};
    let commDateQuery = {};

    if (teamFilter === '7days') {
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
      d.setMonth(d.getMonth() - 3);
      teamDateQuery = { createdAt: { $gte: d } };
      commDateQuery = { dateTime: { $gte: d.toISOString() } };
    }

    let query = {};

    // Always fetch the latest user record from DB (so name is always fresh)
    const dbUser = await User.findById(req.user.id).lean();
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();

    // Non-admin: total cases = Assigned to me OR (Unassigned AND Initiated by me)
    // Non-admin: Isolated data view
    if (req.user.role !== 'Admin') {
      const esc = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = { $regex: new RegExp(`^\\s*${esc}\\s*$`, 'i') };

      // Case query: Cases assigned to me OR initiated by me
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

    const getMetrics = async (matchQuery) => {
      const result = await Case.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
      ]);
      return result.length > 0 ? result[0] : { count: 0, amount: 0 };
    };

    const completedStatuses = ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution'];
    const totalCases = await Case.countDocuments(query);
    const openCases = await Case.countDocuments({ ...query, currentStatus: { $nin: completedStatuses } });

    const settledMetrics = await getMetrics({ ...query, currentStatus: { $in: ['Settled', 'Settlement', 'Resolution'] } });
    const settledCases = settledMetrics.count;
    const settledAmount = settledMetrics.amount;

    const closedMetrics = await getMetrics({ ...query, currentStatus: { $in: ['Closed', 'Closure'] } });
    const closedCases = closedMetrics.count;
    const closedAmount = closedMetrics.amount;

    const highMetrics = await getMetrics({ ...query, priority: 'High' });
    const highPriority = highMetrics.count;
    const highPriorityAmount = highMetrics.amount;

    const mediumMetrics = await getMetrics({ ...query, priority: 'Medium' });
    const mediumPriority = mediumMetrics.count;
    const mediumPriorityAmount = mediumMetrics.amount;

    const lowMetrics = await getMetrics({ ...query, priority: 'Low' });
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // For today's activities, we filter by cases the user owns if not Admin
    let timelineQuery = {};
    if (req.user.role !== 'Admin') {
      const myCaseIds = await Case.find(query).distinct('caseId');
      timelineQuery = { caseId: { $in: myCaseIds } };
    }

    const casesCreatedToday = await Case.countDocuments({ ...query, createdAt: { $gte: startOfToday } });

    const documentsUploadedToday = await Timeline.countDocuments({
      ...timelineQuery,
      eventType: { $in: ['Document Upload', 'Document Uploaded'] },
      createdAt: { $gte: startOfToday }
    });

    const communicationsToday = await Timeline.countDocuments({
      ...timelineQuery,
      eventType: { $in: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] },
      createdAt: { $gte: startOfToday }
    });

    const progressUpdatesToday = await Timeline.countDocuments({
      ...timelineQuery,
      eventType: { $in: ['Progress Update', 'Status Update'] },
      createdAt: { $gte: startOfToday }
    });

    const pendingTasksCount = await Task.countDocuments({
      ...(req.user.role !== 'Admin' ? { assignee: userName } : {}),
      status: { $ne: 'Completed' }
    });

    const today = new Date().toISOString().split('T')[0];
    const overdueActions = await Case.find({ ...query, nextActionDate: { $lt: today }, currentStatus: { $ne: 'Closed' } }).limit(50).lean();

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dueSoonDate = twoDaysFromNow.toISOString().split('T')[0];
    const dueSoonActions = await Case.find({ ...query, nextActionDate: { $gte: today, $lte: dueSoonDate }, currentStatus: { $ne: 'Closed' } }).limit(50).lean();

    const refundsPaid = await Refund.find({ ...(req.user.role !== 'Admin' ? { requestedBy: req.user.email } : {}), status: 'Paid' }).lean();
    const totalRefundAmount = refundsPaid.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Financial Metrics Isolation: Show data for all communications related to cases the staff member OWNS
    let commQuery = {};
    if (req.user.role !== 'Admin') {
      const myCaseIds = await Case.find(query).distinct('caseId');
      commQuery = { caseId: { $in: myCaseIds } };
    }
    const commsForSum = await Communication.find(commQuery).lean();

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

    const recentCases = await Case.find(query).sort({ createdAt: -1 }).limit(10).lean();
    const highPriorityCases = await Case.find({ ...query, priority: 'High', currentStatus: { $nin: ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution'] } }).sort({ createdAt: -1 }).limit(10).lean();

    // Fetch Dynamic Case Type Wise Data
    const caseTypeAggregation = await Case.aggregate([
      { $match: query },
      { $group: { _id: '$typeOfComplaint', count: { $sum: 1 }, totalAmount: { $sum: { $convert: { input: { $ifNull: ['$totalAmtPaid', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } },
      { $sort: { count: -1 } }
    ]);
    const caseTypeWiseData = caseTypeAggregation.map(item => ({ caseType: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));

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
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $not: [{ $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution']] }] }, 1, 0] } },
          settled: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution']] }, 1, 0] } }
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
        const stats = caseCounts.find(c => c._id && c._id.trim().toLowerCase() === uName.toLowerCase()) || { total: 0, pending: 0, settled: 0 };
        const tasks = taskCounts.find(t => t._id && t._id.trim().toLowerCase() === uName.toLowerCase()) || { count: 0 };
        const saved = savedAmounts.find(s => (s._id && s._id.trim().toLowerCase() === uName.toLowerCase()) || (s._id && s._id.trim().toLowerCase() === u.email.toLowerCase())) || { totalSaved: 0 };

        const parts = uName.split(' ').filter(Boolean);
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'U');
        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

        return { id: u._id, name: uName, email: u.email, role: u.role, initials, color: colors[uName.length % colors.length], assigned: stats.total, pending: stats.pending, settled: stats.settled, pendingTasks: tasks.count, totalSaved: saved.totalSaved };
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
    const amountAtRiskResult = await Communication.aggregate([
      { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$refundDemanded', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
    ]);
    const amountAtRisk = amountAtRiskResult.length > 0 ? amountAtRiskResult[0].total : 0;

    const RefundModel = require('./models/Refund');
    const pendingApprovals = await RefundModel.countDocuments({ status: 'Pending Admin Approval' });

    // ── Time Bound Actions ──
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfTodayForTasks = new Date();
    startOfTodayForTasks.setHours(0, 0, 0, 0);

    const timeBoundActions = {
      dueToday: await Task.countDocuments({
        status: { $nin: ['Completed', 'Done'] },
        reminderDateTime: { $lt: new Date().toISOString(), $ne: '' }
      }),
      dueWithin24h: await Task.countDocuments({
        status: { $nin: ['Completed', 'Done'] },
        dueDate: todayStr
      }),
      dueWithin48h: await Task.countDocuments({
        status: { $nin: ['Completed', 'Done'] },
        dueDate: yesterdayStr
      }),
      overdue: await Task.countDocuments({
        status: { $nin: ['Completed', 'Done'] },
        dueDate: { $lt: todayStr }
      }),
      actionTakenToday: await Task.countDocuments({
        status: 'Completed',
        updatedAt: { $gte: startOfTodayForTasks }
      })
    };

    // ── Compliance Rate & Detailed Team Stats ──
    if (req.user.role === 'Admin') {
      const Report = require('./models/Report');
      const reportsToday = await Report.find({
        createdAt: { $gte: startOfToday }
      }).lean();

      // Simple compliance calculation: percentage of active users who submitted SOD today
      const allNonAdmins = await User.find({ role: { $ne: 'Admin' } }).lean();
      const missingSodUsers = [];
      const missingEodUsers = [];

      allNonAdmins.forEach(user => {
        const hasSod = reportsToday.some(r => r.type === 'SOD' && (r.userEmail === user.email || r.userName === user.fullName));
        const hasEod = reportsToday.some(r => r.type === 'EOD' && (r.userEmail === user.email || r.userName === user.fullName));

        if (!hasSod) missingSodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
        if (!hasEod) missingEodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
      });

      const complianceRate = allNonAdmins.length > 0 ? Math.round(((allNonAdmins.length - missingSodUsers.length) / allNonAdmins.length) * 100) : 100;

      teamPerformance = teamPerformance.map(staff => {
        const hasSod = reportsToday.some(r => r.type === 'SOD' && (r.userName === staff.name || r.userEmail === staff.email));
        return {
          ...staff,
          isOnline: hasSod,
          slaScore: hasSod ? 95 : 65
        };
      });

      violations.sodNotSubmitted = missingSodUsers.length;
      violations.eodNotSubmitted = missingEodUsers.length;
      violations.missingSodUsers = missingSodUsers;
      violations.missingEodUsers = missingEodUsers;

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
        totalCases,
        openCases,
        settledCases,
        settledAmount,
        closedCases,
        closedAmount,
        casesCreatedToday,
        documentsUploadedToday,
        communicationsToday,
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
        pendingApprovals
      });
    } else {
      // Non-Admin response
      res.json({
        totalCases,
        openCases,
        settledCases,
        settledAmount,
        closedCases,
        closedAmount,
        casesCreatedToday,
        documentsUploadedToday,
        communicationsToday,
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
        trendData
      });
    }
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    // const fs = require('fs');
    // fs.writeFileSync('c:\\Users\\dell\\RRR-System\\backend\\dashboard_error.txt', error.stack || error.message);
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