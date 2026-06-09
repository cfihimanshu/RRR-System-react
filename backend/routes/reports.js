const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Report = require('../sql_models/Report');
const Task = require('../sql_models/Task');
const Case = require('../sql_models/Case');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');

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

    if (req.query.light === 'true') {
      const reportsRaw = await Report.findAll({
        where: matchQuery,
        order: [['createdAt', 'DESC']],
        offset: skipNum,
        limit: limitNum
      });
      const reports = reportsRaw.map(r => {
        const json = r.toJSON();
        return {
          ...json,
          ...(json.data || {})
        };
      });
      const total = await Report.count({ where: matchQuery });
      
      res.set('Cache-Control', 'private, max-age=30');
      return res.json({ reports, total, page, pages: Math.ceil(total / limitNum) });
    }

    // Build WHERE clause for raw query
    let whereFragments = [];
    let replacements = { limit: limitNum, skip: skipNum };

    if (matchQuery.userEmail) {
      whereFragments.push('r.userEmail = :userEmail');
      replacements.userEmail = matchQuery.userEmail;
    }
    if (matchQuery.date) {
      whereFragments.push('r.date = :date');
      replacements.date = matchQuery.date;
    }
    if (matchQuery.type) {
      whereFragments.push('r.type = :type');
      replacements.type = matchQuery.type;
    }

    const whereClauseString = whereFragments.length > 0 ? 'WHERE ' + whereFragments.join(' AND ') : '';

    const rawQuery = `
      SELECT r.*,
             (SELECT COUNT(*) FROM timelines t WHERE t.eventDate LIKE CONCAT(r.date, '%') AND (t.source = r.userName OR t.source = r.userEmail) AND t.eventType IN ('Call', 'Email', 'Whatsapp', 'Meeting')) AS commCount,
             (SELECT COUNT(*) FROM timelines t WHERE t.eventDate LIKE CONCAT(r.date, '%') AND (t.source = r.userName OR t.source = r.userEmail) AND t.eventType = 'Document Upload') AS docCount,
             (SELECT COUNT(*) FROM timelines t WHERE t.eventDate LIKE CONCAT(r.date, '%') AND (t.source = r.userName OR t.source = r.userEmail) AND t.eventType = 'Progress Update') AS progressCount,
             (SELECT COUNT(*) FROM tasks tk WHERE DATE(tk.updatedAt) = r.date AND tk.assignee = r.userName) AS taskCount
      FROM reports r
      ${whereClauseString}
      ORDER BY r.createdAt DESC
      LIMIT :limit OFFSET :skip
    `;

    const reports = await sequelize.query(rawQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

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

    if ((reportData.type === 'SOD' || reportData.type === 'EOD') && !isExempt) {
      if (!reportData.selfieUrl) {
        return res.status(400).json({ error: 'GPS Selfie is required for SOD/EOD submission!' });
      }
      if (!reportData.latitude || !reportData.longitude) {
        return res.status(400).json({ error: 'GPS coordinates are required for SOD/EOD submission!' });
      }
    }

    if (reportData.type === 'SOD' && !isExempt) {
      const user = await User.findByPk(req.user.id);
      if (!user?.bypassEodCheck) {
        const nowForIST = new Date();
        const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = istTime.toISOString().split('T')[0];
        
        const lastSod = await Report.findOne({ 
          where: { userEmail: req.user.email, type: 'SOD', date: { [Op.lt]: todayStr } },
          order: [['date', 'DESC']]
        });
        
        if (lastSod) {
          const lastEod = await Report.findOne({ 
            where: { userEmail: req.user.email, type: 'EOD', date: lastSod.date }
          });
          if (!lastEod) {
            return res.status(403).json({ error: 'You missed filling your EOD report on a previous day. Please contact Admin to grant you access to fill SOD.' });
          }
        }
      }
    }

    const report = await Report.create(reportData);

    if (report.type === 'SOD') {
      await User.update(
        { bypassEodCheck: false, sodAccessGrantedAt: "" },
        { where: { id: req.user.id } }
      );
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

    const manualTasksCount = await Task.count({ where: taskQuery });
    const manualCompletedCount = await Task.count({ where: { ...taskQuery, status: 'Completed' } });
    
    const totalCasesCount = await Case.count({ where: caseQuery });
    const settledCasesCount = await Case.count({ 
      where: { ...caseQuery, currentStatus: { [Op.in]: ['Settled', 'Settlement'] } } 
    });

    const closedCasesCount = await Case.count({ 
      where: { ...caseQuery, currentStatus: { [Op.in]: ['Closed', 'Closure'] } } 
    });

    const sodToday = await Report.count({ where: { ...query, type: 'SOD', createdAt: { [Op.gte]: today } } });
    const eodToday = await Report.count({ where: { ...query, type: 'EOD', createdAt: { [Op.gte]: today } } });

    let workingHours = 0;
    if (!isAdmin) {
      const firstSod = await Report.findOne({ 
        where: { ...query, type: 'SOD', createdAt: { [Op.gte]: today } },
        order: [['createdAt', 'ASC']]
      });
      const lastEod = await Report.findOne({ 
        where: { ...query, type: 'EOD', createdAt: { [Op.gte]: today } },
        order: [['createdAt', 'DESC']]
      });
      
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
    
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${todayStr}T00:00:00+05:30`);

    const isOperationHead = req.user?.role?.toLowerCase().trim() === 'operation head';
    const caseQuery = { isArchived: { [Op.not]: true } };
    if (!isOperationHead) {
      caseQuery.sourceOfComplaint = { [Op.notLike]: '%odoo%' };
    }

    const allCases = await Case.findAll({ where: caseQuery });
    const allUsers = await User.findAll({ attributes: ['id', 'fullName', 'email', 'role', 'monthlyTarget'] });

    let totalActiveCases = 0;
    let totalActiveCasesAmount = 0;
    let pendingOverdueCases = 0;
    let pendingOverdueCasesAmount = 0;
    let totalAmountAtRisk = 0;
    let casesAssignedToday = 0;

    const activeCasesList = [];
    const todayCasesList = [];

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

        if (c.dueDate) {
          const dueClean = c.dueDate.trim();
          if (dueClean <= todayStr) {
            pendingOverdueCases++;
            pendingOverdueCasesAmount += (c.totalAmtPaid || 0);
          }
        } else {
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

    const assigneeStatsMap = {};

    allUsers.forEach(u => {
      const key = u.fullName.trim().toLowerCase();
      assigneeStatsMap[key] = {
        userId: u.id,
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
        stats.saved += saved;
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
