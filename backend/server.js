require('dotenv').config();
const dns = require('dns');
// Only override DNS servers locally, as it breaks AWS Lambda/Vercel internal telemetry and DNS
if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');

const app = express();

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Set these in your host environment or deployment settings before starting the server.');
  process.exit(1);
}

const allowedOrigins = [
  'https://cfi247.com',
  'https://www.cfi247.com',
  'https://www.api.cfi247.com',
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
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] ✗ Origin "${origin}" NOT in whitelist`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-access-token'],
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
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, x-access-token');
  res.header('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { sequelize } = require('./config/sequelize');

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Database Connected successfully.');
    const Communication = require('./sql_models/Communication');
    const LeaveRequest = require('./sql_models/LeaveRequest');
    const TourRequest = require('./sql_models/TourRequest');
    const LegalRequest = require('./sql_models/LegalRequest');
    const LegalProcess = require('./sql_models/LegalProcess');
    const Progress = require('./sql_models/Progress');
    const Document = require('./sql_models/Document');
    const Case = require('./sql_models/Case');
    const Refund = require('./sql_models/Refund');
    const Task = require('./sql_models/Task');
    
    await Communication.sync({ alter: true });
    await LeaveRequest.sync({ alter: true });
    await TourRequest.sync({ alter: true });
    await LegalRequest.sync({ alter: true });
    await LegalProcess.sync({ alter: true });
    await Progress.sync({ alter: true });
    await Document.sync({ alter: true });
    await Case.sync(); // alter: true removed to fix ER_TOO_MANY_KEYS
    await Refund.sync({ alter: true });
    await Task.sync({ alter: true });
    console.log('Models synced.');
  } catch (err) {
    console.error('DATABASE CONNECTION ERROR:', err);
  }
};

app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    try {
      await sequelize.authenticate();
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
app.use('/api/agreements', require('./routes/agreements'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/case-study', require('./routes/caseStudy'));
app.use('/api/tours', require('./routes/tours'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/legal-requests', require('./routes/legalRequests'));
app.use('/api/legal-process', require('./routes/legalProcess'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/dashboard', require('./routes/dashboard'));

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
    await sequelize.authenticate();
    res.json({ status: "success", message: "Database connected successfully", readyState: 1 });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed", error: err.message });
  }
});

// One-time migration: rename old FIR types to Criminal Complaint/FIR
app.get('/api/admin/migrate-fir-types', require('./middleware/auth').verifyToken, async (req, res) => {
  try {
    const Case = require('./sql_models/Case');
    const { Op } = require('sequelize');
    const result = await Case.update(
      { typeOfComplaint: 'Criminal Complaint/FIR' },
      { where: { typeOfComplaint: { [Op.in]: ['Criminal FIR', 'FIR'] } } }
    );
    res.json({ success: true, updated: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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