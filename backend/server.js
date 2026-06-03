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

const globalWithMongoose = global;
if (!globalWithMongoose._mongooseCache) {
  globalWithMongoose._mongooseCache = { conn: null, promise: null, indexesBuilt: false };
}
const mongooseCache = globalWithMongoose._mongooseCache;

const connectToDatabase = async () => {
  if (mongooseCache.conn && mongoose.connection.readyState === 1) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      bufferTimeoutMS: 30000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: process.env.VERCEL ? 5 : 10,
      minPoolSize: process.env.VERCEL ? 1 : 0,
      retryWrites: true,
    }).then((m) => {
      console.log('MongoDB Connected');
      return m;
    }).catch((err) => {
      mongooseCache.promise = null;
      console.error('DATABASE CONNECTION ERROR:', err);
      throw err;
    });
  }

  mongooseCache.conn = await mongooseCache.promise;

  if (!mongooseCache.indexesBuilt) {
    mongooseCache.indexesBuilt = true;

    // Index build only locally — skip on Vercel to avoid serverless DB flooding
    if (!process.env.VERCEL) {
      const Case = require('./models/Case');
      const Timeline = require('./models/Timeline');
      const Task = require('./models/Task');
      const Refund = require('./models/Refund');
      const Report = require('./models/Report');
      const User = require('./models/User');
      const Communication = require('./models/Communication');
      const TourRequest = require('./models/TourRequest');
      const LeaveRequest = require('./models/LeaveRequest');

      Promise.all([
        Case.createIndexes(),
        Timeline.createIndexes(),
        Task.createIndexes(),
        Refund.createIndexes(),
        Report.createIndexes(),
        User.createIndexes(),
        Communication.createIndexes(),
        TourRequest.createIndexes(),
        LeaveRequest.createIndexes()
      ]).then(() => {
        console.log('✓ All database indexes verified/built successfully');
      }).catch(err => {
        console.error('✗ Error building database indexes:', err);
        mongooseCache.indexesBuilt = false;
      });
    } else {
      console.log('✓ Running on Vercel: skipping automatic index verification to prevent serverless database flooding');
    }
  }

  return mongooseCache.conn;
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
app.use('/api/tours', require('./routes/tours'));
app.use('/api/leaves', require('./routes/leaves'));

const CITY_COORDS = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  noida: { lat: 28.5355, lon: 77.3910 },
  gurgaon: { lat: 28.4595, lon: 77.0266 },
  gurugram: { lat: 28.4595, lon: 77.0266 },
  ghaziabad: { lat: 28.6692, lon: 77.4538 },
  agra: { lat: 27.1767, lon: 78.0081 },
  patna: { lat: 25.5941, lon: 85.1376 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  indore: { lat: 22.7196, lon: 75.8577 },
  kanpur: { lat: 26.4499, lon: 80.3319 }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getDeterministicMockDistance(fromCity, toCity) {
  let hash = 0;
  const combined = (fromCity + toCity).toLowerCase();
  for (let i = 0; i < combined.length; i++) {
    hash += combined.charCodeAt(i);
  }
  return 150 + (hash % 800);
}

app.get('/api/distance', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to are required"
      });
    }

    const cleanFrom = from.trim().toLowerCase();
    const cleanTo = to.trim().toLowerCase();

    // Check if we have both coordinates locally
    if (CITY_COORDS[cleanFrom] && CITY_COORDS[cleanTo]) {
      const c1 = CITY_COORDS[cleanFrom];
      const c2 = CITY_COORDS[cleanTo];
      const straightLineDist = haversineDistance(c1.lat, c1.lon, c2.lat, c2.lon);
      const drivingDistance = (straightLineDist * 1.15) + 2; // Apply correction factor
      const speedKmh = 60; // Average driving speed
      const durationMin = (drivingDistance / speedKmh) * 60;

      return res.json({
        success: true,
        from,
        to,
        distance_km: Number(drivingDistance.toFixed(2)),
        duration_minutes: Number(durationMin.toFixed(2)),
        source: 'local_database'
      });
    }

    // Otherwise, try external APIs
    try {
      // Geocode From
      const fromUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=jsonv2&limit=1`;
      const fromRes = await fetch(fromUrl, {
        headers: {
          "User-Agent": "DistanceAPI/1.0"
        }
      });
      const fromGeo = await fromRes.json();

      // Geocode To
      const toUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=jsonv2&limit=1`;
      const toRes = await fetch(toUrl, {
        headers: {
          "User-Agent": "DistanceAPI/1.0"
        }
      });
      const toGeo = await toRes.json();

      if (fromGeo && fromGeo.length && toGeo && toGeo.length) {
        const fromLat = fromGeo[0].lat;
        const fromLon = fromGeo[0].lon;
        const toLat = toGeo[0].lat;
        const toLon = toGeo[0].lon;

        // Route Distance
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
        const routeRes = await fetch(routeUrl);
        const route = await routeRes.json();

        if (route.routes && route.routes.length) {
          const rawDistanceKm = route.routes[0].distance / 1000;
          const distanceKm = (rawDistanceKm * 1.10) + 2;
          const durationMin = route.routes[0].duration / 60;

          return res.json({
            success: true,
            from,
            to,
            distance_km: Number(distanceKm.toFixed(2)),
            duration_minutes: Number(durationMin.toFixed(2)),
            source: 'osrm_api'
          });
        }
      }
    } catch (apiErr) {
      // Quietly fall back to deterministic calculations when Nominatim is rate-limited
    }

    // Final fallback to deterministic mock distance so it never fails
    const mockDist = getDeterministicMockDistance(from, to);
    const mockDuration = (mockDist / 60) * 60; // 60 km/h average speed

    res.json({
      success: true,
      from,
      to,
      distance_km: Number(mockDist.toFixed(2)),
      duration_minutes: Number(mockDuration.toFixed(2)),
      source: 'deterministic_fallback'
    });

  } catch (error) {
    console.error("General error in distance calculation:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

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
const statsCache = new Map();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

global.clearStatsCache = () => {
  statsCache.clear();
  console.log('Dashboard stats cache cleared successfully.');
};

function buildAnchoredRegex(text) {
  const safe = String(text || '').trim();
  if (!safe) return null;
  const escaped = safe.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}`, 'i');
}

app.get('/api/dashboard/stats', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_${req.query.teamFilter || ''}_${req.query.userFilter || ''}_${req.query.startDate || ''}_${req.query.endDate || ''}_${req.query.perfStartDate || ''}_${req.query.perfEndDate || ''}_${req.query.isLegalDashboard || ''}`;
    const cachedItem = statsCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION)) {
      res.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=45');
      return res.json(cachedItem.data);
    }

    const Case = require('./models/Case');
    const User = require('./models/User');
    const Task = require('./models/Task');
    const Communication = require('./models/Communication');
    const Refund = require('./models/Refund');
    const Timeline = require('./models/Timeline');
    const Report = require('./models/Report');

    const timings = {};
    const track = async (name, promiseOrFn) => {
      const start = Date.now();
      const resVal = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
      timings[name] = Date.now() - start;
      return resVal;
    };

    const { teamFilter, userFilter, startDate, endDate, perfStartDate, perfEndDate } = req.query;
    let teamDateQuery = {};
    let commDateQuery = {};

    let activeTeamFilter = teamFilter;
    if (!activeTeamFilter && !startDate && !endDate) {
      activeTeamFilter = '7days';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      teamDateQuery = { createdAt: { $gte: start, $lte: end } };
      commDateQuery = { createdAt: { $gte: start, $lte: end } };
    } else if (activeTeamFilter === '7days') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - 7);
      teamDateQuery = { createdAt: { $gte: d } };
      commDateQuery = { createdAt: { $gte: d } };
    } else if (activeTeamFilter === '1month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - 1);
      teamDateQuery = { createdAt: { $gte: d } };
      commDateQuery = { createdAt: { $gte: d } };
    } else if (activeTeamFilter === '3months') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      const end = new Date(d);
      d.setMonth(d.getMonth() - 3);
      teamDateQuery = { createdAt: { $gte: d, $lt: end } };
      commDateQuery = { createdAt: { $gte: d, $lt: end } };
    }

    // Ownership filter logic
    const dbUser = await track('fetchUserDb', () => User.findById(req.user.id).lean());
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    let userEmail = (dbUser?.email || req.user.email || '').trim();
    let userId = req.user.id;

    let targetEmail = userEmail;
    if (userFilter) {
      const filteredUser = await User.findOne({
        $or: [
          { fullName: { $regex: new RegExp(`^\\s*${userFilter.trim()}\\s*$`, 'i') } },
          { name: { $regex: new RegExp(`^\\s*${userFilter.trim()}\\s*$`, 'i') } }
        ]
      }).lean();
      if (filteredUser) {
        targetEmail = filteredUser.email;
      }
    }


    const firstName = userName.split(/\s+/)[0];
    const searchValues = [userName, userEmail, userId];
    if (firstName && firstName.length >= 3) {
      searchValues.push(firstName);
    }
    const uniqueSearchValues = [...new Set(searchValues.filter(Boolean).map(v => v.trim()))];
    const regexParts = uniqueSearchValues
      .map(v => buildAnchoredRegex(v))
      .filter(Boolean);
    const myNameRegex = regexParts.length === 0 ? null : new RegExp(regexParts.map(r => r.source).join('|'), 'i');

    let ownershipQuery = {};
    let activeNameRegex = myNameRegex;
    let legalEmails = [];

    const isLegalDashboard = req.query.isLegalDashboard === 'true' || req.user.role === 'Legal';

    if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      const legalUsers = await User.find({ role: 'Legal' }).lean();
      const legalNames = legalUsers.map(u => (u.fullName || u.name || '').trim()).filter(Boolean);
      legalEmails = legalUsers.map(u => (u.email || '').trim()).filter(Boolean);
      if (legalNames.length > 0) {
        const regexStr = legalNames.map(n => `^\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).join('|');
        activeNameRegex = new RegExp(regexStr, 'i');
        ownershipQuery = { assignedTo: activeNameRegex };
      } else {
        activeNameRegex = /__non_existent_user__/i;
        ownershipQuery = { assignedTo: '__non_existent_user__' };
      }
    } else if (['operation admin', 'operation admin'].includes(req.user.role?.toLowerCase().trim())) {
      ownershipQuery = { assignedTo: myNameRegex };
    } else if (req.user.role !== 'Admin') {
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

    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(req.user.role)) {
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


    const completedStatuses = ['Settled', 'settled', 'Settlement', 'settlement', 'Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed', 'NA', 'na', 'Na', 'nA', 'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'];
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

    let refundQuery = {
      status: { $in: ['Pending Payment', 'Paid'] }
    };
    if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      refundQuery.requestedBy = { $in: legalEmails };
    } else if (req.user.role !== 'Admin' && req.user.role !== 'Accountant') {
      refundQuery.requestedBy = targetEmail;
    }

    let taskUserQuery = {};
    if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      taskUserQuery = {
        $or: [
          { assignee: activeNameRegex },
          { createdBy: { $in: legalEmails } }
        ]
      };
    } else if (req.user.role !== 'Admin' || userFilter) {
      const targetUserStr = String(userFilter || userName || '');
      const escUser = targetUserStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const userQueryRegex = new RegExp(escUser, 'i');
      taskUserQuery = {
        $or: [
          { assignee: userQueryRegex },
          { createdBy: targetEmail }
        ]
      };
    }

    let myCaseIds = [];
    if (req.user.role !== 'Admin' || isLegalDashboard) {
      myCaseIds = await track('myCaseIdsDistinct', () => Case.distinct('caseId', query));
    }
    const timelineQuery = (req.user.role !== 'Admin' || isLegalDashboard) ? { caseId: { $in: myCaseIds } } : {};

    let timelineMatch = { ...timelineQuery };
    if (req.user.role !== 'Admin' || userFilter || isLegalDashboard) {
      timelineMatch.source = activeNameRegex || nameRegex;
    }

    const yesterday = new Date(istTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [
      caseMetricsFacet,
      timelineMetrics,
      refundMetrics,
      taskMetrics,
      yesterdayEod,
      todaySod,
      todayEod,
      lastTimeline,
      perfCaseIds
    ] = await track('mainPromiseAll', () => Promise.all([
      track('caseMetricsFacet', () => Case.aggregate([
        { $match: query },
        {
          $facet: {
            basic: [
              {
                $group: {
                  _id: null,
                  totalCases: { $sum: 1 },
                  totalAmountPaid: { $sum: { $ifNull: ['$totalAmtPaid', 0] } },
                  openCases: { $sum: { $cond: [{ $and: [{ $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  openCasesAmount: { $sum: { $cond: [{ $and: [{ $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }, { $ne: ["$isArchived", true] }] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  settledCount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'settled', 'Settlement', 'settlement']] }, 1, 0] } },
                  settledAmount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Settled', 'settled', 'Settlement', 'settlement']] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  closedCount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed']] }, 1, 0] } },
                  closedAmount: { $sum: { $cond: [{ $in: ["$currentStatus", ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed']] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  criticalPriority: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Critical"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  criticalPriorityAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Critical"] }, { $ne: ["$isArchived", true] }] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  highPriority: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  highPriorityAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $ne: ["$isArchived", true] }] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  mediumPriority: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Medium"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  mediumPriorityAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Medium"] }, { $ne: ["$isArchived", true] }] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  lowPriority: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Low"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  lowPriorityAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "Low"] }, { $ne: ["$isArchived", true] }] }, { $ifNull: ['$totalAmtPaid', 0] }, 0] } },
                  linkedByCount: { $sum: { $cond: [{ $and: [{ $gt: ["$linkedBy", null] }, { $ne: ["$linkedBy", ""] }] }, 1, 0] } },
                  createdToday: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
                  liveEscalations: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $gte: ["$updatedAt", fortyEightHrsAgo] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }] }, 1, 0] } },
                  noUpdate48Hrs: { $sum: { $cond: [{ $and: [{ $lt: ["$updatedAt", fortyEightHrsAgo] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }] }, 1, 0] } },
                  slaBreached: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $lt: ["$nextActionDate", today] }, { $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }] }, 1, 0] } },
                  totalCriticalCases: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $ne: ["$isArchived", true] }] }, 1, 0] } },
                  closedCriticalCases: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "High"] }, { $in: ["$currentStatus", ['Settled', 'Closed', 'Settlement', 'Closure', 'Resolution', 'settled', 'settlement', 'closed', 'closure', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed']] }] }, 1, 0] } }
                }
              }
            ],
            unassigned: [
              {
                $match: {
                  $and: [
                    { $or: [{ initiatedBy: { $regex: /^\s*$/ } }, { initiatedBy: { $exists: false } }, { initiatedBy: null }] },
                    { $or: [{ assignedTo: { $regex: /^\s*$/ } }, { assignedTo: { $exists: false } }, { assignedTo: null }] }
                  ]
                }
              },
              { $count: "count" }
            ],
            caseTypeWise: [
              {
                $group: {
                  _id: { $toUpper: { $trim: { input: { $ifNull: ['$typeOfComplaint', 'Unknown'] } } } },
                  count: { $sum: 1 },
                  totalAmount: { $sum: { $ifNull: ['$totalAmtPaid', 0] } }
                }
              },
              { $sort: { count: -1 } }
            ],
            sourceWise: [
              {
                $group: {
                  _id: { $toUpper: { $trim: { input: { $ifNull: ['$sourceOfComplaint', 'Unknown'] } } } },
                  count: { $sum: 1 },
                  totalAmount: { $sum: { $ifNull: ['$totalAmtPaid', 0] } }
                }
              },
              { $sort: { count: -1 } }
            ],
            trendData: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  newCases: { $sum: 1 },
                  highPriority: { $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] } }
                }
              },
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
              { $match: { priority: 'High', currentStatus: { $nin: completedStatuses }, refundStatus: { $ne: 'Paid' } } },
              { $sort: { createdAt: -1 } },
              { $limit: 10 }
            ],
            threatTrends: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
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
            ]
          }
        }
      ])),
      track('timelineMetrics', () => Timeline.aggregate([
        { $match: timelineMatch },
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
      ])),
      track('refundMetrics', async () => {
        const paidFilter = {
          status: 'Paid'
        };
        if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
          paidFilter.requestedBy = { $in: legalEmails };
        } else if (req.user.role !== 'Admin' && req.user.role !== 'Accountant') {
          paidFilter.requestedBy = targetEmail;
        }
        const [paidSumResult, allRefunds, pendingApprovalsResult] = await Promise.all([
          Refund.aggregate([
            { $match: paidFilter },
            { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$amount', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
          ]),
          Refund.find(refundQuery)
            .select('caseId amount status installments timestamp paymentDate requests')
            .lean(),
          Refund.aggregate([
            { $match: { status: 'Pending Admin Approval' } },
            { $group: { _id: null, total: { $sum: { $convert: { input: { $ifNull: ['$amount', '0'] }, to: 'double', onError: 0, onNull: 0 } } } } }
          ])
        ]);
        return { paidSumResult, allRefunds, pendingApprovalsResult };
      }),
      track('taskMetrics', async () => {
        const sodReportQuery = isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)
          ? { userEmail: { $in: legalEmails }, type: 'SOD', date: dateStrIST }
          : { userEmail: targetEmail, type: 'SOD', date: dateStrIST };
        const sodReport = await Report.findOne(sodReportQuery).sort({ createdAt: -1 }).lean();
        const sodTasksCount = sodReport ? (sodReport.myTasksToday?.length || 0) : 0;


        const taskCountsResult = await Task.aggregate([
          { $match: taskUserQuery },
          {
            $facet: {
              pendingTasksCount: [
                {
                  $match: {
                    status: { $ne: 'Completed' },
                    ...(req.user.role !== 'Admin' ? { assignee: userName } : {})
                  }
                },
                { $count: 'count' }
              ],
              dueTodayCount: [
                {
                  $match: {
                    status: { $nin: ['Completed', 'Done'] },
                    createdAt: { $gte: startOfToday }
                  }
                },
                { $count: 'count' }
              ],
              dueWithin24h: [
                {
                  $match: {
                    status: { $nin: ['Completed', 'Done'] },
                    dueDate: tomorrowStr
                  }
                },
                { $count: 'count' }
              ],
              dueWithin48h: [
                {
                  $match: {
                    status: { $nin: ['Completed', 'Done'] },
                    dueDate: dayAfterTomorrowStr
                  }
                },
                { $count: 'count' }
              ],
              overdue: [
                {
                  $match: {
                    status: { $nin: ['Completed', 'Done'] },
                    reminderDateTime: { $lt: new Date().toISOString(), $ne: '' }
                  }
                },
                { $count: 'count' }
              ],
              actionTakenToday: [
                {
                  $match: {
                    status: 'Completed',
                    updatedAt: { $gte: startOfToday }
                  }
                },
                { $count: 'count' }
              ],
              totalTasksTodayCount: [
                {
                  $match: {
                    createdAt: { $gte: startOfToday }
                  }
                },
                { $count: 'count' }
              ],
              completedTasksToday: [
                {
                  $match: {
                    createdAt: { $gte: startOfToday },
                    status: { $in: ['Completed', 'Done'] }
                  }
                },
                { $count: 'count' }
              ]
            }
          }
        ]);

        const tc = taskCountsResult[0] || {};
        return {
          pendingTasksCount: tc.pendingTasksCount?.[0]?.count || 0,
          dueToday: (tc.dueTodayCount?.[0]?.count || 0) + sodTasksCount,
          dueWithin24h: tc.dueWithin24h?.[0]?.count || 0,
          dueWithin48h: tc.dueWithin48h?.[0]?.count || 0,
          overdue: tc.overdue?.[0]?.count || 0,
          actionTakenToday: tc.actionTakenToday?.[0]?.count || 0,
          totalTasksToday: (tc.totalTasksTodayCount?.[0]?.count || 0) + sodTasksCount,
          completedTasksToday: tc.completedTasksToday?.[0]?.count || 0
        };
      }),
      track('yesterdayEod', () => {
        const query = isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)
          ? { userEmail: { $in: legalEmails }, type: 'EOD', date: yesterdayStr }
          : { userEmail: targetEmail, type: 'EOD', date: yesterdayStr };
        return Report.findOne(query).sort({ createdAt: -1 }).lean();
      }),
      track('todaySod', () => {
        const query = isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)
          ? { userEmail: { $in: legalEmails }, type: 'SOD', date: dateStrIST }
          : { userEmail: targetEmail, type: 'SOD', date: dateStrIST };
        return Report.findOne(query).sort({ createdAt: -1 }).lean();
      }),
      track('todayEod', () => {
        const query = isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)
          ? { userEmail: { $in: legalEmails }, type: 'EOD', date: dateStrIST }
          : { userEmail: targetEmail, type: 'EOD', date: dateStrIST };
        return Report.findOne(query).sort({ createdAt: -1 }).lean();
      }),
      track('lastTimeline', () => Timeline.findOne({ source: nameRegex, createdAt: { $gte: startOfToday } }).sort({ createdAt: -1 }).lean()),
      track('perfCaseIds', () => Case.distinct('caseId', ownershipQuery))
    ]));

    const facet = caseMetricsFacet[0] || {};
    const b = facet.basic?.[0] || {};

    const totalCases = b.totalCases || 0;
    const totalAmountPaid = b.totalAmountPaid || 0;
    const openCases = b.openCases || 0;
    const openCasesAmount = b.openCasesAmount || 0;
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

    const { paidSumResult, allRefunds, pendingApprovalsResult } = refundMetrics;
    let totalRefundAmount = 0;
    let pendingApprovals = 0;

    allRefunds.forEach(r => {
      const itemsToProcess = (r.requests && r.requests.length > 0) ? r.requests : [r];

      itemsToProcess.forEach(item => {
        if (item.status === 'Pending Admin Approval') {
          pendingApprovals += Number(item.amount) || 0;
        }

        if (item.status === 'Rejected') return;

        const instList = item.installments || [];
        const allInstPaid = instList.length > 0 && instList.every(inst => inst.status === 'Paid');
        const isFullyPaid = item.status === 'Paid' || allInstPaid;

        if (isFullyPaid) {
          totalRefundAmount += Number(item.amount) || 0;
        } else if (instList.length > 0) {
          const paidInstSum = instList
            .filter(inst => inst.status === 'Paid')
            .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
          totalRefundAmount += paidInstSum;
        }
      });
    });

    const { pendingTasksCount, dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday } = taskMetrics;
    const timeBoundActions = { dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday };

    const totalCriticalCases = b.totalCriticalCases || 0;
    const closedCriticalCases = b.closedCriticalCases || 0;

    const yesterdayEodFilled = yesterdayEod ? 1 : 0;

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
    const sourceWiseData = (facet.sourceWise || []).map(item => ({ source: item._id || 'Unknown', count: item.count, totalAmount: item.totalAmount || 0 }));

    const myPerformance = {
      totalCommunications: 0,
      casesResolved: 0,
      naCases: 0,
      overdueCases: 0
    };

    const [overdueCasesCount, totalCommsCount, casesResolvedCount, naCasesCount] = await track('myPerformancePromiseAll', () => Promise.all([
      track('overdueCasesCount', () => Case.countDocuments({
        ...ownershipQuery,
        currentStatus: { 
          $nin: [
            'Settled', 'settled', 'Settlement', 'settlement', 
            'Closure', 'closure', 'Resolution', 'resolution', 
            'Resolved', 'resolved', 'Done', 'done', 'Complete', 
            'complete', 'Completed', 'completed', 'Closed', 'closed', 
            'NA', 'na', 'Na', 'nA', 'NA Non Agreement', 'na non agreement', 
            'Non Agreement', 'non agreement'
          ] 
        },
        refundStatus: { $ne: 'Paid' },
        $or: [
          { nextActionDate: { $lt: dateStrIST } },
          { nextActionDate: { $lt: new Date().toISOString().split('T')[0] } }
        ]
      })),
      track('totalCommsCount', () => Communication.countDocuments({
        loggedBy: activeNameRegex,
        ...(perfDateRange ? { createdAt: perfDateRange } : {})
      })),
      track('casesResolvedCount', () => Case.countDocuments({
        ...ownershipQuery,
        currentStatus: { $in: ['Settled', 'settled', 'Settlement', 'settlement'] },
        ...(perfDateRange ? { updatedAt: perfDateRange } : {})
      })),
      track('naCasesCount', () => Case.countDocuments({
        ...ownershipQuery,
        typeOfComplaint: { 
          $in: [
            'NA Non Agreement', 'na non agreement', 'NA NON AGREEMENT', 
            'Non Agreement', 'non agreement', 'NON AGREEMENT'
          ] 
        },
        ...(perfDateRange ? { updatedAt: perfDateRange } : {})
      }))
    ]));

    myPerformance.overdueCases = overdueCasesCount;
    myPerformance.totalCommunications = totalCommsCount;
    myPerformance.casesResolved = casesResolvedCount;
    myPerformance.naCases = naCasesCount;    // Reshape threatTrends
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

    const provisions = {
      today: { count: 0, amount: 0 },
      thisWeek: { count: 0, amount: 0 },
      thisMonth: { count: 0, amount: 0 },
      next6Months: { count: 0, amount: 0 }
    };

    const nowForRefunds = new Date();

    // Today Boundaries
    const startOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate(), 0, 0, 0, 0);
    const endOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate(), 23, 59, 59, 999);

    // This Week Boundaries (Monday to Sunday of the current week)
    const startOfThisWeekForRefunds = new Date(startOfTodayForRefunds);
    const dayVal = startOfThisWeekForRefunds.getDay();
    const diffVal = startOfThisWeekForRefunds.getDate() - dayVal + (dayVal === 0 ? -6 : 1);
    startOfThisWeekForRefunds.setDate(diffVal);
    startOfThisWeekForRefunds.setHours(0, 0, 0, 0);

    const endOfThisWeekForRefunds = new Date(startOfThisWeekForRefunds);
    endOfThisWeekForRefunds.setDate(endOfThisWeekForRefunds.getDate() + 6);
    endOfThisWeekForRefunds.setHours(23, 59, 59, 999);

    // This Month Boundaries
    const startOfThisMonthForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), 1, 0, 0, 0, 0);
    const endOfThisMonthForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 1, 0, 23, 59, 59, 999);

    // Next 6 Months Boundary (Next month 1st to end of 6th month)
    const startOfNext6MonthsForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 1, 1, 0, 0, 0, 0);
    const endOfNext6MonthsForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 7, 0, 23, 59, 59, 999);

    // Sets to count UNIQUE cases per period
    const caseSets = {
      today: new Set(),
      thisWeek: new Set(),
      thisMonth: new Set(),
      next6Months: new Set()
    };

    allRefunds.forEach(r => {
      if (r.status === 'Rejected') return;

      const installments = r.installments && r.installments.length > 0
        ? r.installments
        : [{ status: r.status, dueDate: r.paymentDate || r.timestamp, amount: r.amount, paymentDate: r.paymentDate, transactionId: r.transactionId }];

      installments.forEach(inst => {
        if (inst.status === 'Paid') return; // Skip already paid installments, only show pending!

        const amt = Number(inst.amount) || 0;

        let refDate = null;
        if (inst.dueDate) {
          refDate = new Date(inst.dueDate);
        } else {
          refDate = new Date(r.timestamp || r.paymentDate || new Date());
        }

        // Today
        if (refDate >= startOfTodayForRefunds && refDate <= endOfTodayForRefunds) {
          caseSets.today.add(r.caseId);
          provisions.today.amount += amt;
        }

        // This Week
        if (refDate >= startOfThisWeekForRefunds && refDate <= endOfThisWeekForRefunds) {
          caseSets.thisWeek.add(r.caseId);
          provisions.thisWeek.amount += amt;
        }

        // This Month
        if (refDate >= startOfThisMonthForRefunds && refDate <= endOfThisMonthForRefunds) {
          caseSets.thisMonth.add(r.caseId);
          provisions.thisMonth.amount += amt;
        }

        // Next 6 Months
        if (refDate >= startOfNext6MonthsForRefunds && refDate <= endOfNext6MonthsForRefunds) {
          caseSets.next6Months.add(r.caseId);
          provisions.next6Months.amount += amt;
        }
      });
    });

    // Set count to size of unique case sets
    provisions.today.count = caseSets.today.size;
    provisions.thisWeek.count = caseSets.thisWeek.size;
    provisions.thisMonth.count = caseSets.thisMonth.size;
    provisions.next6Months.count = caseSets.next6Months.size;

    // Collection Potential and Total Demand/Saved (aggregated — avoids loading all comm rows)
    let commQuery = {};
    if (req.user.role !== 'Admin' && myCaseIds.length > 0) {
      commQuery = { caseId: { $in: myCaseIds } };
    } else if (req.user.role !== 'Admin') {
      commQuery = { caseId: { $in: [] } };
    }
    const commAgg = await track('commMetricsAgg', () => Communication.aggregate([
      { $match: commQuery },
      {
        $group: {
          _id: { $ifNull: ['$caseId', 'unlinked'] },
          maxDemand: {
            $max: {
              $max: [
                { $ifNull: ['$demandAmount', 0] },
                { $convert: { input: { $ifNull: ['$refundDemanded', '0'] }, to: 'double', onError: 0, onNull: 0 } }
              ]
            }
          },
          maxSaved: { $max: { $ifNull: ['$amountSaved', 0] } },
          sumDemand: {
            $sum: {
              $max: [
                { $ifNull: ['$demandAmount', 0] },
                { $convert: { input: { $ifNull: ['$refundDemanded', '0'] }, to: 'double', onError: 0, onNull: 0 } }
              ]
            }
          }
        }
      }
    ]));
    const totalDemandAmount = commAgg.reduce((sum, row) => sum + (row.maxDemand || 0), 0);
    const totalAmountSaved = commAgg.reduce((sum, row) => sum + (row.maxSaved || 0), 0);
    const amountAtRisk = totalDemandAmount;
    const collectionPotential = commAgg.reduce((sum, row) => sum + (row.sumDemand || 0), 0);

    let teamPerformance = [];
    let missingSodUsers = [];
    let missingEodUsers = [];
    let missingNoUpdateUsers = [];

    if (req.user.role === 'Admin') {
      const Report = require('./models/Report');
      const reportsToday = await Report.find({
        createdAt: { $gte: startOfToday }
      }).select('userEmail userName type date checkInTime createdAt').lean();

      const fortyEightHrsAgo = new Date();
      fortyEightHrsAgo.setHours(fortyEightHrsAgo.getHours() - 48);
      const reportsLast48Hrs = await Report.find({
        createdAt: { $gte: fortyEightHrsAgo }
      }).select('userEmail userName type date createdAt').lean();

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
          pending: { $sum: { $cond: [{ $and: [{ $not: [{ $in: ["$currentStatus", completedStatuses] }] }, { $ne: ["$refundStatus", "Paid"] }] }, 1, 0] } },
          settled: { $sum: { $cond: [{ $in: ["$currentStatus", ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed']] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$nextActionDate", null] },
                    { $ne: ["$nextActionDate", ""] },
                    { $lt: ["$nextActionDate", today] },
                    { $not: [{ $in: ["$currentStatus", completedStatuses] }] },
                    { $ne: ["$refundStatus", "Paid"] }
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
        Report.find({ userEmail: { $in: allEmails }, type: 'SOD', date: { $lt: dateStrIST } })
          .sort({ date: -1 })
          .select('userEmail date')
          .lean(),
        Report.find({ userEmail: { $in: allEmails }, type: 'EOD' })
          .select('userEmail date')
          .lean()
      ]);

      const sodMap = {};
      lastSods.forEach(s => { if (!sodMap[s.userEmail]) sodMap[s.userEmail] = s; });
      const eodMap = {};
      lastEods.forEach(e => { eodMap[`${e.userEmail}_${e.date}`] = e; });

      allNonAdmins.forEach(user => {
        const isExempt = ['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(user.role);

        const hasSod = reportsToday.some(r => r.type === 'SOD' && (r.userEmail === user.email || r.userName === user.fullName));
        const hasReport48h = reportsLast48Hrs.some(r => r.userEmail === user.email || r.userName === user.fullName);

        if (!hasSod && !isExempt) missingSodUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });
        if (!hasReport48h) missingNoUpdateUsers.push({ name: user.fullName || user.name || user.email, email: user.email, role: user.role });

        const lastSod = sodMap[user.email];
        if (lastSod && !isExempt) {
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

      const reportsForDuration = await Report.find(reportQuery)
        .select('userName userEmail type date checkInTime checkOutTime workDuration createdAt')
        .lean();

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

      const todayReports = await Report.find({ date: todayStr })
        .select('userEmail type checkInTime checkOutTime createdAt')
        .lean();

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

      res.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=45');
      const responseData = {
        _timings: timings,
        myPerformance,
        totalCriticalCases,
        closedCriticalCases,
        yesterdayEodFilled,
        threatTrendData: threatTrendDataArray,
        linkedByCount,
        threatTrendTypes: sortedTypes,
        totalCases,
        openCases,
        openCasesAmount,
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
      };
      statsCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
      res.json(responseData);
    } else {
      // Non-Admin response
      res.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=45');
      const responseData = {
        _timings: timings,
        myPerformance,
        totalCriticalCases,
        closedCriticalCases,
        yesterdayEodFilled,
        threatTrendData: threatTrendDataArray,
        threatTrendTypes: sortedTypes,
        totalCases,
        openCases,
        openCasesAmount,
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
      };
      statsCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
      res.json(responseData);
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