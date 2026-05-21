const express = require('express');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId, date, type, sourceFilter, userEmail: queryEmail, feed } = req.query;
    const isFeed = feed === 'true' || feed === '1';
    let pipeline = [];

    // Base filters
    let baseMatch = {};
    if (caseId) baseMatch.caseId = caseId;
    if (sourceFilter) baseMatch.source = sourceFilter;
    if (type) {
      if (type === 'Communication') {
        baseMatch.eventType = { $in: ['Call', 'Email', 'Whatsapp', 'Meeting', 'Communication'] };
      } else {
        baseMatch.eventType = type;
      }
    }

    if (Object.keys(baseMatch).length > 0) {
      pipeline.push({ $match: baseMatch });
    }

    if (!isFeed) {
      pipeline.push({
        $lookup: {
          from: 'cases',
          localField: 'caseId',
          foreignField: 'caseId',
          as: 'case_match'
        }
      });
    }

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
    const isAdminOrReviewerOrAccountant = ['Admin', 'Reviewer', 'Accountant'].includes(req.user.role);
    if (!isAdminOrReviewerOrAccountant) {
      const User = require('../models/User');
      const dbUser = await User.findById(req.user.id).select('fullName email').lean();
      const myIds = [...new Set([req.user.fullName, req.user.email, dbUser?.fullName, dbUser?.email])].filter(Boolean);

      if (isFeed) {
        pipeline.push({ $match: { source: { $in: myIds } } });
      } else {
        pipeline.push({
          $match: {
            $or: [
              { source: { $in: myIds } },
              { 'case_match.assignedTo': { $in: myIds } },
              { 'case_match.initiatedBy': { $in: myIds } }
            ]
          }
        });
      }
    } else if (queryEmail || req.query.userName) {
      // If Admin is filtering for a specific user, match broad
      const User = require('../models/User');
      const targetUser = queryEmail ? await User.findOne({ email: { $regex: new RegExp(`^${queryEmail}$`, 'i') } }) : null;
      
      const userIds = [...new Set([
        queryEmail, 
        req.query.userName,
        targetUser?.fullName, 
        targetUser?.email
      ])].filter(Boolean);

      let orConditions = [{ source: { $in: userIds } }];
      if (queryEmail) {
        orConditions.push({ source: { $regex: new RegExp(queryEmail.split('@')[0], 'i') } });
      }

      pipeline.push({
        $match: {
          $or: orConditions
        }
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    if (isFeed) {
      pipeline.push({
        $project: {
          caseId: 1,
          eventDate: 1,
          source: 1,
          eventType: 1,
          summary: 1,
          createdAt: 1
        }
      });
    } else {
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
          caseInfo: { $arrayElemAt: ['$case_match', 0] }
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limitNum = Math.min(parseInt(req.query.limit) || (isFeed ? 30 : 100), 200);
    const skipNum = (page - 1) * limitNum;

    pipeline.push({ $skip: skipNum });
    pipeline.push({ $limit: limitNum });

    const docs = await Timeline.aggregate(pipeline);
    res.set('Cache-Control', 'private, max-age=30');
    res.json(docs);
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
