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
      max: process.env.VERCEL ? 3 : 5,
      min: 0,
      acquire: 30000,
      idle: process.env.VERCEL ? 0 : 10000,
      evict: process.env.VERCEL ? 0 : 1000
    },
    retry: {
      match: [
        /ECONNRESET/,
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNREFUSED/,
        /EPIPE/,
        'SequelizeConnectionError',
        'SequelizeDatabaseError'
      ],
      max: 3
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
