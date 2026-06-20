const { sequelize } = require('./config/sequelize');
const User = require('./sql_models/User');

async function run() {
  try {
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'email', 'role']
    });
    console.log('--- ALL USERS IN DB ---');
    console.log(JSON.stringify(users.map(u => u.toJSON()), null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await sequelize.close();
  }
}

run();
