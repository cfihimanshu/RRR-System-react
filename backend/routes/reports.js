const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');

// Get all reports or user-specific reports
router.get('/', verifyToken, async (req, res) => {
  try {
    let matchQuery = {};
    if (req.user.role !== 'Admin') {
      matchQuery.userEmail = req.user.email;
    }

    const reports = await Report.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'timelines',
          let: { rDate: '$date', rUser: '$userName', rEmail: '$userEmail' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $regexMatch: { input: '$eventDate', regex: { $concat: ['^', '$$rDate'] } } },
                    { 
                      $or: [
                        { $eq: ['$source', '$$rUser'] },
                        { $eq: ['$source', '$$rEmail'] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                commCount: {
                  $sum: {
                    $cond: [{ $in: ['$eventType', ['Call', 'Email', 'Whatsapp', 'Meeting']] }, 1, 0]
                  }
                },
                docCount: {
                  $sum: {
                    $cond: [{ $eq: ['$eventType', 'Document Upload'] }, 1, 0]
                  }
                },
                progressCount: {
                  $sum: {
                    $cond: [{ $eq: ['$eventType', 'Progress Update'] }, 1, 0]
                  }
                }
              }
            }
          ],
          as: 'activityCounts'
        }
      },
      {
        $addFields: {
          activityCounts: { $arrayElemAt: ['$activityCounts', 0] }
        }
      },
      {
        $addFields: {
          commCount: { $ifNull: ['$activityCounts.commCount', 0] },
          docCount: { $ifNull: ['$activityCounts.docCount', 0] },
          progressCount: { $ifNull: ['$activityCounts.progressCount', 0] }
        }
      },
      {
        $project: {
          activityCounts: 0
        }
      }
    ]);

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new report (SOD or EOD)
router.post('/', verifyToken, async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.fullName
    };
    const report = new Report(reportData);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stats for Work Report Tab (Dynamic based on Role)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isAdmin = req.user.role === 'Admin';
    let query = {};
    let taskQuery = {};
    let caseQuery = {};

    if (!isAdmin) {
      query.userEmail = req.user.email;
      taskQuery.assignee = req.user.fullName;
      caseQuery.assignedTo = req.user.fullName;
    }

    const manualTasksCount = await Task.countDocuments(taskQuery);
    const manualCompletedCount = await Task.countDocuments({ ...taskQuery, status: 'Completed' });
    
    const totalCasesCount = await Case.countDocuments(caseQuery);
    const completedCasesCount = await Case.countDocuments({ 
      ...caseQuery, 
      currentStatus: { $in: ['Closed', 'Settled', 'Settlement', 'Closure'] } 
    });

    const sodToday = await Report.countDocuments({ ...query, type: 'SOD', createdAt: { $gte: today } });
    const eodToday = await Report.countDocuments({ ...query, type: 'EOD', createdAt: { $gte: today } });

    let workingHours = 0;
    if (!isAdmin) {
      const firstSod = await Report.findOne({ ...query, type: 'SOD', createdAt: { $gte: today } }).sort({ createdAt: 1 });
      const lastEod = await Report.findOne({ ...query, type: 'EOD', createdAt: { $gte: today } }).sort({ createdAt: -1 });
      
      if (firstSod) {
        const startTime = new Date(firstSod.createdAt);
        const endTime = lastEod ? new Date(lastEod.createdAt) : new Date();
        workingHours = (endTime - startTime) / (1000 * 60 * 60);
      }
    }

    res.json({
      tasksAssigned: manualTasksCount + totalCasesCount,
      tasksCompleted: manualCompletedCount + completedCasesCount,
      sodToday,
      eodToday,
      totalCases: totalCasesCount,
      settledCases: completedCasesCount,
      workingHours: workingHours.toFixed(2),
      role: req.user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
