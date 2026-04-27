const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // For raw files, Cloudinary requires the extension in the public_id to serve it correctly
    const extIndex = file.originalname.lastIndexOf('.');
    const ext = extIndex !== -1 ? file.originalname.substring(extIndex) : '';
    const originalName = extIndex !== -1 ? file.originalname.substring(0, extIndex) : file.originalname;
    const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueSuffix = Date.now();
    return {
      folder: 'rrr_engine',
      resource_type: 'raw',
      public_id: `${cleanName}_${uniqueSuffix}${ext}`
    };
  }
});

const upload = multer({ storage: storage });

router.post('/', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download', (req, res) => {
  try {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).json({ error: 'No URL provided' });
    
    // Clean up url if it has query params for filename parsing
    const cleanUrl = fileUrl.split('?')[0];
    let filename = cleanUrl.split('/').pop() || 'download';
    
    const https = require('https');
    const http = require('http');
    const client = fileUrl.startsWith('https') ? https : http;
    
    client.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({ error: 'Failed to fetch file from source' });
      }
      
      let contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Ensure the filename has the correct extension based on content-type if missing
      if (!filename.includes('.')) {
        if (contentType.includes('pdf')) filename += '.pdf';
        else if (contentType.includes('wordprocessingml')) filename += '.docx';
        else if (contentType.includes('msword')) filename += '.doc';
        else if (contentType.includes('spreadsheetml')) filename += '.xlsx';
        else if (contentType.includes('excel')) filename += '.xls';
        else if (contentType.includes('png')) filename += '.png';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename += '.jpg';
        else if (contentType.includes('text/plain')) filename += '.txt';
        else if (contentType.includes('csv')) filename += '.csv';
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      
      response.pipe(res);
    }).on('error', (err) => {
      console.error('Download proxy error:', err.message);
      res.status(500).json({ error: 'Failed to download file' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process download request' });
  }
});

module.exports = router;
