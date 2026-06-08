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
    if (!['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      matchQuery.userEmail = req.user.email;
    } else if (req.query.userEmail) {
      matchQuery.userEmail = req.query.userEmail;
    }
    if (req.query.date) {
      matchQuery.date = req.query.date;
    }
    if (req.query.type) {
      matchQuery.type = req.query.type;
    }

    const page = parseInt(req.query.page) || 1;
    const limitNum = Math.min(parseInt(req.query.limit) || 50, 1000);
    const skipNum = (page - 1) * limitNum;

    // Fast path for dashboard / SOD checks — skip expensive timeline+task lookups
    if (req.query.light === 'true') {
      const [reports, total] = await Promise.all([
        Report.find(matchQuery)
          .sort({ createdAt: -1 })
          .skip(skipNum)
          .limit(limitNum)
          .select('type userName userEmail date checkInTime checkOutTime workDuration completionStatus createdAt myTasksToday sodCaseIds sodTaskIds selfieUrl latitude longitude gpsAddress')
          .lean(),
        Report.countDocuments(matchQuery)
      ]);
      res.set('Cache-Control', 'private, max-age=30');
      return res.json({ reports, total, page, pages: Math.ceil(total / limitNum) });
    }

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

    const isExempt = ['admin', 'super admin', 'superadmin', 'reviewer', 'accountant', 'operation head', 'operation review'].includes(req.user.role?.toLowerCase().trim());

    // Validation: Require GPS Selfie and Coordinates for SOD/EOD for non-exempt roles
    if ((reportData.type === 'SOD' || reportData.type === 'EOD') && !isExempt) {
      if (!reportData.selfieUrl) {
        return res.status(400).json({ error: 'GPS Selfie is required for SOD/EOD submission!' });
      }
      if (!reportData.latitude || !reportData.longitude) {
        return res.status(400).json({ error: 'GPS coordinates are required for SOD/EOD submission!' });
      }
    }

    if (reportData.type === 'SOD' && !isExempt) {
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

    const isAdmin = ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role);
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

// GET /api/reports/mis — Escalation MIS Report data
router.get('/mis', verifyToken, async (req, res) => {
  try {
    const completedStatuses = [
      'Settled', 'settled', 'Settlement', 'settlement',
      'Closure', 'closure', 'Resolution', 'resolution',
      'Resolved', 'resolved', 'Done', 'done',
      'Complete', 'complete', 'Completed', 'completed',
      'Closed', 'closed', 'NA', 'na', 'Na', 'nA',
      'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'
    ];
    
    // Calculate today's date boundaries in IST
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${todayStr}T00:00:00+05:30`);

    const isOperationHead = req.user?.role?.toLowerCase().trim() === 'operation head';
    const caseQuery = { isArchived: { $ne: true } };
    if (!isOperationHead) {
      caseQuery.sourceOfComplaint = { $not: /^\s*odoo\s*$/i };
    }

    // Fetch all cases matching the query
    const allCases = await Case.find(caseQuery).lean();
    
    // Fetch all users
    const allUsers = await User.find({}, 'fullName email role monthlyTarget').lean();

    // 1. Overview metrics
    let totalActiveCases = 0;
    let totalActiveCasesAmount = 0;
    let pendingOverdueCases = 0;
    let pendingOverdueCasesAmount = 0;
    let totalAmountAtRisk = 0;
    let casesAssignedToday = 0;

    const activeCasesList = [];
    const todayCasesList = [];

    // Helper to check if a case status is completed/resolved
    const isCompleted = (status) => {
      if (!status) return false;
      return completedStatuses.includes(status.trim());
    };

    allCases.forEach(c => {
      const isCaseResolved = isCompleted(c.currentStatus) || c.refundStatus === 'Paid';
      const isCaseActive = !isCaseResolved;
      const createdDate = c.createdAt ? new Date(c.createdAt) : null;
      const isCreatedToday = createdDate && createdDate >= startOfToday;

      if (isCaseActive) {
        totalActiveCases++;
        totalActiveCasesAmount += (c.totalAmtPaid || 0);
        totalAmountAtRisk += (c.totalAmtPaid || 0);

        // Check if overdue: dueDate is older than or equal to today
        if (c.dueDate) {
          const dueClean = c.dueDate.trim();
          if (dueClean <= todayStr) {
            pendingOverdueCases++;
            pendingOverdueCasesAmount += (c.totalAmtPaid || 0);
          }
        } else {
          // If no due date, count as requiring attention if it is active
          pendingOverdueCases++;
          pendingOverdueCasesAmount += (c.totalAmtPaid || 0);
        }

        activeCasesList.push({
          assignee: c.assignedTo || 'Unassigned',
          caseId: c.caseId,
          companyName: c.companyName || '—',
          dueDate: c.dueDate || '—',
          totalAmtPaid: c.totalAmtPaid || 0,
          currentStatus: c.currentStatus || 'New'
        });
      }

      if (isCreatedToday) {
        casesAssignedToday++;
        todayCasesList.push({
          assignee: c.assignedTo || 'Unassigned',
          caseId: c.caseId,
          companyName: c.companyName || '—',
          totalAmtPaid: c.totalAmtPaid || 0,
          priority: c.priority || 'Medium',
          currentStatus: c.currentStatus || 'New'
        });
      }
    });

    // 2. Assignee performance calculations
    const assigneeStatsMap = {};

    allUsers.forEach(u => {
      const key = u.fullName.trim().toLowerCase();
      assigneeStatsMap[key] = {
        userId: u._id,
        name: u.fullName.trim(),
        email: u.email,
        role: u.role,
        target: u.monthlyTarget || 500000,
        saved: 0,
        totalCases: 0,
        totalAmt: 0,
        pendingCases: 0,
        pendingAmt: 0,
        resolvedCases: 0,
        resolvedAmt: 0,
        todayCases: 0,
        todayAmt: 0,
        resolvedToday: 0,
        resolvedTodayAmt: 0
      };
    });

    allCases.forEach(c => {
      const assigneeName = c.assignedTo;
      if (!assigneeName) return;
      
      const key = assigneeName.trim().toLowerCase();
      if (!assigneeStatsMap[key]) return;

      const stats = assigneeStatsMap[key];
      const amt = c.totalAmtPaid || 0;
      const saved = c.savedAmount || c.refundedAmount || 0;
      const isCaseResolved = isCompleted(c.currentStatus) || c.refundStatus === 'Paid';

      const createdDate = c.createdAt ? new Date(c.createdAt) : null;
      const isAssignedToday = createdDate && createdDate >= startOfToday;
      
      const updatedDate = c.updatedAt ? new Date(c.updatedAt) : null;
      const isResolvedToday = isCaseResolved && updatedDate && updatedDate >= startOfToday;

      stats.totalCases++;
      stats.totalAmt += amt;

      if (isCaseResolved) {
        stats.resolvedCases++;
        stats.resolvedAmt += saved;
        stats.saved += saved; // progress towards target
      } else {
        stats.pendingCases++;
        stats.pendingAmt += amt;
      }

      if (isAssignedToday) {
        stats.todayCases++;
        stats.todayAmt += amt;
      }

      if (isResolvedToday) {
        stats.resolvedToday++;
        stats.resolvedTodayAmt += saved;
      }
    });

    const performanceList = Object.values(assigneeStatsMap).filter(stats => {
      const isSpecialist = ['Operations', 'Staff', 'Operation Admin', 'operation admin', 'Operation Review', 'Operation Head', 'Reviewer', 'Accountant'].includes(stats.role);
      return stats.totalCases > 0 || isSpecialist;
    });

    res.json({
      reportDate: todayStr,
      metrics: {
        totalActiveCases,
        totalActiveCasesAmount,
        pendingOverdueCases,
        pendingOverdueCasesAmount,
        totalAmountAtRisk,
        casesAssignedToday
      },
      activeCases: activeCasesList,
      todayCases: todayCasesList,
      assigneePerformance: performanceList
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
