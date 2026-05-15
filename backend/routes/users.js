const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// Get all users (Filtered for Operations in frontend)
router.get('/', verifyToken, roleGuard(['Admin', 'Operations']), async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email role department');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users who missed EOD on any previous day
router.get('/missed-eod', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const Report = require('../models/Report');
    const todayStr = new Date().toISOString().split('T')[0];

    const missedEodUsers = await Report.aggregate([
      {
        $group: {
          _id: { email: "$userEmail", date: "$date" },
          types: { $push: "$type" },
          userName: { $first: "$userName" }
        }
      },
      {
        $match: {
          types: { $all: ["SOD"], $nin: ["EOD"] },
          "_id.date": { $lt: todayStr }
        }
      },
      {
        $group: {
          _id: "$_id.email",
          name: { $first: "$userName" },
          missedDates: { $push: "$_id.date" }
        }
      }
    ]);

    res.json(missedEodUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant access to fill SOD despite missing EOD
router.post('/:email/grant-sod-access', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { email } = req.params;
    await User.findOneAndUpdate({ email }, { bypassEodCheck: true });
    res.json({ message: `Access granted to ${email} to fill SOD today.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
