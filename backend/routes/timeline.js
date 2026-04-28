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

    // Join with Case collection to filter out deleted cases
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
      },
      { $sort: { eventDate: -1 } },
      { $project: { case_match: 0 } }
    );

    const docs = await Timeline.aggregate(pipeline);
    res.json(docs);
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
