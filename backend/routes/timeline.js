const express = require('express');
const Timeline = require('../models/Timeline');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const caseIdFilter = req.query.caseId;
    
    let pipeline = [];

    // If specific caseId requested, filter by it
    if (caseIdFilter) {
      pipeline.push({ $match: { caseId: caseIdFilter } });
    }

    // Join with Case collection to filter out deleted cases and for role-based filtering
    pipeline.push(
      {
        $lookup: {
          from: 'cases',
          localField: 'caseId',
          foreignField: 'caseId',
          as: 'case_match'
        }
      },
      {
        $match: {
          'case_match.0': { $exists: true }
        }
      }
    );

    // Role-based filtering for non-admins (Operations, Staff, Accountant, etc.)
    // Only 'Admin' role is allowed to see global activities.
    const isAdmin = req.user.role === 'Admin';
    console.log(`[Timeline] Request by: ${req.user.email}, Role: ${req.user.role}, IsAdmin: ${isAdmin}`);

    if (!isAdmin) {
      const User = require('../models/User');
      const dbUser = await User.findById(req.user.id);
      
      const myFullNames = [req.user.fullName, dbUser?.fullName, dbUser?.name].filter(f => f && f.trim());
      const myEmails = [req.user.email, dbUser?.email].filter(e => e && e.trim());
      const allMyIdentifiers = [...new Set([...myFullNames, ...myEmails])];

      console.log(`[Timeline Filter] Identifiers for ${req.user.email}:`, allMyIdentifiers);

      pipeline.push({
        $match: {
          $or: [
            { source: { $in: allMyIdentifiers } }, // User performed the action
            { 
              $and: [
                { 'case_match.0': { $exists: true } },
                { 
                  $or: [
                    { 'case_match.assignedTo': { $in: allMyIdentifiers } },
                    { 'case_match.initiatedBy': { $in: allMyIdentifiers } }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { eventDate: -1, createdAt: -1 } },
      { 
        $project: { 
          caseId: 1,
          eventDate: 1,
          source: 1,
          eventType: 1,
          summary: 1,
          createdAt: 1,
          // Include ownership info so frontend can filter even if source is different (e.g. Admin)
          assignedTo: { $arrayElemAt: ["$case_match.assignedTo", 0] },
          initiatedBy: { $arrayElemAt: ["$case_match.initiatedBy", 0] }
        } 
      },
      { $limit: 40 } 
    );

    const docs = await Timeline.aggregate(pipeline);
    console.log(`[Timeline] Returning ${docs.length} activities for user ${req.user.email}`);
    res.json(docs);
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
