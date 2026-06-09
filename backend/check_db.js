const { sequelize } = require('./config/sequelize');
const Case = require('./sql_models/Case');
async function check() {
  const count = await Case.count();
  console.log('Total Cases in MySQL:', count);
  if (count > 0) {
    const c = await Case.findOne();
    console.log('Sample case servicesSold type:', typeof c.servicesSold, Array.isArray(c.servicesSold) ? 'Array' : '');
  }
  process.exit();
}
check();
