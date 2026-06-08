const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Progress = require('./models/Progress');
  const User = require('./models/User');
  const jwt = require('jsonwebtoken');
  
  // Create a mock token
  const token = jwt.sign({ id: 'mock', email: 'mock@mock.com', role: 'Admin' }, process.env.JWT_SECRET || 'secret');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/progress?caseId=RRR-SF-2026-0081',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`Success! Found ${parsed.logs.length} logs.`);
        parsed.logs.forEach(l => {
          console.log(`- [${l.stage}] ${l.summary.substring(0, 50)}...`);
        });
      } catch(e) {
        console.error('Failed to parse:', data);
      }
      process.exit(0);
    });
  });
  
  req.on('error', e => {
    console.error(e);
    process.exit(1);
  });
  
  req.end();
}).catch(console.error);
