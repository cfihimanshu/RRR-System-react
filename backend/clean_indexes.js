require('dotenv').config();
const { sequelize } = require('./config/sequelize');

async function cleanIndexes() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    
    // Get all indexes for cases table
    const [results] = await sequelize.query("SHOW INDEX FROM cases");
    const indexNames = [...new Set(results.map(r => r.Key_name))].filter(name => name !== 'PRIMARY');
    
    console.log(`Found ${indexNames.length} secondary indexes on cases table`);
    
    // Drop all secondary indexes
    for (const indexName of indexNames) {
      console.log(`Dropping index ${indexName}...`);
      try {
        await sequelize.query(`ALTER TABLE cases DROP INDEX \`${indexName}\``);
      } catch (err) {
        console.log(`Failed to drop index ${indexName}:`, err.message);
      }
    }
    
    console.log('Finished dropping redundant indexes. Sequelize will recreate necessary ones on next sync.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning indexes:', error);
    process.exit(1);
  }
}

cleanIndexes();
