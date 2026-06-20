const { sequelize } = require('./config/sequelize');

async function run() {
  try {
    console.log('Checking database table for column...');
    const [results] = await sequelize.query("SHOW COLUMNS FROM refunds LIKE 'bdaName'");
    if (results.length === 0) {
      console.log('Column bdaName does not exist. Adding it...');
      await sequelize.query('ALTER TABLE refunds ADD COLUMN bdaName VARCHAR(255) DEFAULT NULL');
      console.log('Column bdaName added successfully.');
    } else {
      console.log('Column bdaName already exists.');
    }
  } catch (err) {
    console.error('Error running DB migration:', err);
  } finally {
    await sequelize.close();
  }
}

run();
