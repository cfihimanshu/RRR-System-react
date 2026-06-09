require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const doc = await db.collection('sampledatas').findOne({});
    console.log(JSON.stringify(doc, null, 2));
  } finally {
    await client.close();
  }
}
run().catch(console.error);
