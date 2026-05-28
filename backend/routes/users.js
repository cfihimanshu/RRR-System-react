const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// Get all users (Filtered for Operations in frontend)
router.get('/', verifyToken, roleGuard(['Admin', 'Operations', 'Legal']), async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email role department').lean();
    res.set('Cache-Control', 'private, max-age=60');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users who missed EOD on any previous day
router.get('/missed-eod', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const Report = require('../models/Report');
    
    // Auto-expire previous days' SOD access grants
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    const usersWithAccess = await User.find({ bypassEodCheck: true });
    for (const u of usersWithAccess) {
      if (u.sodAccessGrantedAt) {
        const grantedIST = new Date(new Date(u.sodAccessGrantedAt).getTime() + (5.5 * 60 * 60 * 1000));
        const grantedDateStr = grantedIST.toISOString().split('T')[0];
        if (grantedDateStr < todayStr) {
          u.bypassEodCheck = false;
          u.sodAccessGrantedAt = "";
          await u.save();
        }
      } else {
        u.bypassEodCheck = false;
        await u.save();
      }
    }

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
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "userDetails"
        }
      },
      {
        $addFields: {
          bypassEodCheck: { $arrayElemAt: ["$userDetails.bypassEodCheck", 0] },
          sodAccessGrantedAt: { $arrayElemAt: ["$userDetails.sodAccessGrantedAt", 0] }
        }
      },
      {
        $project: {
          userDetails: 0
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
    await User.findOneAndUpdate(
      { email },
      { 
        bypassEodCheck: true,
        sodAccessGrantedAt: new Date().toISOString()
      }
    );
    res.json({ message: `Access granted to ${email} to fill SOD today.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
