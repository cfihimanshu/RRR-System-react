const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'rrr_system_db',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || 'Legal786skr',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database Connected successfully via Sequelize.');
  } catch (error) {
    console.error('❌ Unable to connect to the MySQL database:', error);
  }
};

module.exports = { sequelize, connectDB };
