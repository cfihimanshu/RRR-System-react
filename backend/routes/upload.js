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

// Endpoint for frontend to get ImageKit auth parameters for direct upload
router.get('/auth', verifyToken, (req, res) => {
  try {
    const authenticationParameters = imagekit.helper.getAuthenticationParameters();
    res.json({
      ...authenticationParameters,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
  } catch (error) {
    console.error('ImageKit Auth Error:', error);
    res.status(500).json({ error: 'Failed to generate auth parameters' });
  }
});

// Legacy upload via backend (kept for backward compatibility or smaller files)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const response = await imagekit.files.upload({
      file: req.file.buffer.toString('base64'),
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: 'rrr_engine',
      useUniqueFileName: true
    });

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
