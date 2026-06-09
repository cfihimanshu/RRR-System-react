const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 1, email: 'admin@admin.com', role: 'Admin', fullName: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dashboard/stats?teamFilter=all',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
});

req.on('error', error => console.error(error));
req.end();
