const express = require('express');
const multer = require('multer');
const ImageKit = require('@imagekit/nodejs');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Use memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', verifyToken, (req, res, next) => {
  console.log('Upload Route Hit:', req.file ? 'File present' : 'Waiting for multer');
  next();
}, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Attempting ImageKit upload for file:', req.file.originalname);

    // In @imagekit/nodejs v7+, upload is under .files.upload
    const response = await imagekit.files.upload({
      file: req.file.buffer.toString('base64'),
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: 'rrr_engine',
      useUniqueFileName: true
    });

    console.log('ImageKit Upload Success:', response.url);
    res.json({ url: response.url });
  } catch (error) {
    console.error('ImageKit Upload Error:', error);
    res.status(500).json({ 
      error: error.message || 'ImageKit Upload Failed',
      details: error
    });
  }
});

router.get('/download', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  res.redirect(url);
});

module.exports = router;
