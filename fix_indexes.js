const { sequelize } = require('./backend/config/sequelize');

async function fix() {
  try {
    const [indexes] = await sequelize.query("SHOW INDEX FROM progresses;");
    for (const idx of indexes) {
      if (idx.Key_name !== 'PRIMARY') {
        console.log(`Dropping index ${idx.Key_name}`);
        try {
          await sequelize.query(`ALTER TABLE progresses DROP INDEX \`${idx.Key_name}\`;`);
        } catch (e) {
          console.error(`Failed to drop ${idx.Key_name}`, e.message);
        }
      }
    }
    console.log("Indexes cleaned up.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
