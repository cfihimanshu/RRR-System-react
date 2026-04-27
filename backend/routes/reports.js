const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');

// Get all reports or user-specific reports
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.userEmail = req.user.email;
    }
    const reports = await Report.find(query).sort({ createdAt: -1 });
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
      currentStatus: { $in: ['Closed', 'Settled'] } 
    });

    const sodToday = await Report.countDocuments({ ...query, type: 'SOD', createdAt: { $gte: today } });
    const eodToday = await Report.countDocuments({ ...query, type: 'EOD', createdAt: { $gte: today } });

    res.json({
      tasksAssigned: manualTasksCount + totalCasesCount,
      tasksCompleted: manualCompletedCount + completedCasesCount,
      sodToday,
      eodToday,
      totalCases: totalCasesCount,
      settledCases: completedCasesCount,
      role: req.user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
