const express = require('express');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId, date, userEmail: queryEmail } = req.query;
    let pipeline = [];

    // Base filters
    let baseMatch = {};
    if (caseId) baseMatch.caseId = caseId;
    if (Object.keys(baseMatch).length > 0) {
      pipeline.push({ $match: baseMatch });
    }

    // Lookup case
    pipeline.push({
      $lookup: {
        from: 'cases',
        localField: 'caseId',
        foreignField: 'caseId',
        as: 'case_match'
      }
    });

    // Date filtering (Multi-format support)
    if (date) {
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthShort = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      startOfDay.setMinutes(startOfDay.getMinutes() - 330); // Shift for IST (UTC+5:30)
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      endOfDay.setMinutes(endOfDay.getMinutes() - 330); // Shift for IST (UTC+5:30)
      
      pipeline.push({
        $match: {
          $or: [
            { eventDate: { $regex: new RegExp(date) } }, // YYYY-MM-DD
            { eventDate: { $regex: new RegExp(`${day} ${monthShort} ${year}`, 'i') } }, // DD MMM YYYY
            { createdAt: { $gte: startOfDay, $lte: endOfDay } }
          ]
        }
      });
    }

    // Role and Identity filtering
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin) {
      const User = require('../models/User');
      const dbUser = await User.findById(req.user.id);
      const myIds = [...new Set([req.user.fullName, req.user.email, dbUser?.fullName, dbUser?.email])].filter(Boolean);

      pipeline.push({
        $match: {
          $or: [
            { source: { $in: myIds } },
            { 'case_match.assignedTo': { $in: myIds } },
            { 'case_match.initiatedBy': { $in: myIds } }
          ]
        }
      });
    } else if (queryEmail) {
      // If Admin is filtering for a specific user, match broad
      const User = require('../models/User');
      const targetUser = await User.findOne({ email: queryEmail });
      const userIds = [...new Set([queryEmail, queryEmail.split('@')[0], targetUser?.fullName, targetUser?.email])].filter(Boolean);

      pipeline.push({
        $match: {
          $or: [
            { source: { $in: userIds } },
            { source: { $regex: new RegExp(queryEmail.split('@')[0], 'i') } }
          ]
        }
      });
    }

    pipeline.push({ $sort: { eventDate: -1, createdAt: -1 } });

    pipeline.push({ 
      $project: { 
        caseId: 1,
        eventDate: 1,
        source: 1,
        eventType: 1,
        summary: 1,
        details: 1,
        metadata: 1,
        createdAt: 1,
        caseInfo: { $arrayElemAt: ["$case_match", 0] }
      } 
    });

    if (!date && !caseId) {
      pipeline.push({ $limit: 100 });
    }

    const docs = await Timeline.aggregate(pipeline);
    res.json(docs);
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
