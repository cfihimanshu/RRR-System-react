const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

// Get all reports or user-specific reports
router.get('/', verifyToken, async (req, res) => {
  try {
    let matchQuery = {};
    if (req.user.role !== 'Admin') {
      matchQuery.userEmail = req.user.email;
    }

    const page = parseInt(req.query.page) || 1;
    const limitNum = parseInt(req.query.limit) || 50;
    const skipNum = (page - 1) * limitNum;

    const reports = await Report.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skipNum },
      { $limit: limitNum },
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
        $lookup: {
          from: 'tasks',
          let: { rDate: '$date', rUser: '$userName' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, "$$rDate"] },
                    { $eq: ["$assignee", "$$rUser"] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: 'taskActivity'
        }
      },
      {
        $addFields: {
          activityCounts: { $arrayElemAt: ['$activityCounts', 0] },
          taskActivity: { $arrayElemAt: ['$taskActivity', 0] }
        }
      },
      {
        $addFields: {
          commCount: { $ifNull: ['$activityCounts.commCount', 0] },
          docCount: { $ifNull: ['$activityCounts.docCount', 0] },
          progressCount: { $ifNull: ['$activityCounts.progressCount', 0] },
          taskCount: { $ifNull: ['$taskActivity.count', 0] }
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

    if (reportData.type === 'SOD' && req.user.role !== 'Admin') {
      const User = require('../models/User');
      const user = await User.findById(req.user.id).lean();
      if (!user?.bypassEodCheck) {
        const nowForIST = new Date();
        const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = istTime.toISOString().split('T')[0];
        
        const lastSod = await Report.findOne({ userEmail: req.user.email, type: 'SOD', date: { $lt: todayStr } }).sort({ date: -1 }).lean();
        if (lastSod) {
          const lastEod = await Report.findOne({ userEmail: req.user.email, type: 'EOD', date: lastSod.date }).lean();
          if (!lastEod) {
            return res.status(403).json({ error: 'You missed filling your EOD report on a previous day. Please contact Admin to grant you access to fill SOD.' });
          }
        }
      }
    }

    const report = new Report(reportData);
    await report.save();

    // Reset bypassEodCheck if this was a SOD submission
    if (report.type === 'SOD') {
      await User.findByIdAndUpdate(req.user.id, { 
        bypassEodCheck: false,
        sodAccessGrantedAt: ""
      });
    }

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
    const settledCasesCount = await Case.countDocuments({ 
      ...caseQuery, 
      currentStatus: { $in: ['Settled', 'Settlement'] } 
    });

    const closedCasesCount = await Case.countDocuments({ 
      ...caseQuery, 
      currentStatus: { $in: ['Closed', 'Closure'] } 
    });

    const sodToday = await Report.countDocuments({ ...query, type: 'SOD', createdAt: { $gte: today } });
    const eodToday = await Report.countDocuments({ ...query, type: 'EOD', createdAt: { $gte: today } });

    let workingHours = 0;
    if (!isAdmin) {
      const firstSod = await Report.findOne({ ...query, type: 'SOD', createdAt: { $gte: today } }).sort({ createdAt: 1 }).lean();
      const lastEod = await Report.findOne({ ...query, type: 'EOD', createdAt: { $gte: today } }).sort({ createdAt: -1 }).lean();
      
      if (firstSod) {
        const startTime = new Date(firstSod.createdAt);
        const endTime = lastEod ? new Date(lastEod.createdAt) : new Date();
        workingHours = (endTime - startTime) / (1000 * 60 * 60);
      }
    }

    res.json({
      tasksAssigned: manualTasksCount + totalCasesCount,
      tasksCompleted: manualCompletedCount + settledCasesCount + closedCasesCount,
      sodToday,
      eodToday,
      totalCases: totalCasesCount,
      settledCases: settledCasesCount,
      closedCases: closedCasesCount,
      workingHours: workingHours.toFixed(2),
      role: req.user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
