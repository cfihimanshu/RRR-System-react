require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

// Create downloads directory if it doesn't exist
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

async function downloadFiles() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Switch to the project_backup database where the files actually are
    const db = mongoose.connection.client.db('project_backup');
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'projectFiles'
    });

    // Get all files from the bucket
    const files = await bucket.find().toArray();

    if (files.length === 0) {
      console.log('No files found in projectFiles bucket.');
      mongoose.connection.close();
      return;
    }

    console.log(`Found ${files.length} file(s). Starting download...`);

    for (const file of files) {
      const filePath = path.join(downloadDir, file.filename || file._id.toString());
      const downloadStream = bucket.openDownloadStream(file._id);
      const writeStream = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        downloadStream.pipe(writeStream)
          .on('error', reject)
          .on('finish', () => {
            console.log(`Downloaded: ${file.filename || file._id}`);
            resolve();
          });
      });
    }

    console.log('\nAll files downloaded successfully to the "downloads" folder!');
  } catch (err) {
    console.error('Error downloading files:', err);
  } finally {
    mongoose.connection.close();
  }
}

downloadFiles();
