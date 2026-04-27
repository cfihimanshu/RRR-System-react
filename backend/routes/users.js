const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Get all users (Filtered for Operations in frontend)
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email role department');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
