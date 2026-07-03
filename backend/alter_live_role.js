const { Sequelize } = require('sequelize');
const seq = new Sequelize('fmojnedg_cfi247', 'fmojnedg_cfi247', 'Legal786skr', {
  host: '103.191.208.201',
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  logging: false
});

seq.query("ALTER TABLE users MODIFY COLUMN role ENUM('Admin', 'Operations', 'Staff', 'Reviewer', 'Accountant', 'Legal', 'Super Admin', 'SuperAdmin', 'Operation Admin', 'Operation Review', 'Operation Head', 'BD Head') NOT NULL")
  .then(() => {
    console.log('Successfully altered live users table role ENUM!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to alter live users table role ENUM:', err);
    process.exit(1);
  });
