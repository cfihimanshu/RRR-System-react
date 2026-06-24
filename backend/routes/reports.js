const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Report = require('../sql_models/Report');
const Task = require('../sql_models/Task');
const Case = require('../sql_models/Case');
const User = require('../sql_models/User');
const Progress = require('../sql_models/Progress');
const Refund = require('../sql_models/Refund');
const MisReport = require('../sql_models/MisReport');
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

    const parsedReports = reports.map(r => {
      let parsedData = {};
      try {
        parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      } catch (e) {
        parsedData = {};
      }
      return {
        ...r,
        ...parsedData
      };
    });

    res.json(parsedReports);
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
      userName: req.user.fullName,
      data: req.body
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

    const closureStatuses = [
      'Closure', 'closure', 'Resolution', 'resolution',
      'Resolved', 'resolved', 'Done', 'done',
      'Complete', 'complete', 'Completed', 'completed',
      'Closed', 'closed', 'NA', 'na', 'Na', 'nA',
      'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'
    ];

    const isClosureStatus = (status) => {
      if (!status) return false;
      return closureStatuses.includes(status.trim());
    };

    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${todayStr}T00:00:00+05:30`);

    const { startDate, endDate } = req.query;
    const isOperationHead = req.user?.role?.toLowerCase().trim() === 'operation head';
    const isAdmin = ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role);
    const isOperationReview = req.user?.role?.toLowerCase().trim() === 'operation review';
    const isOperationAdmin = req.user?.role?.toLowerCase().trim() === 'operation admin';
    const caseQuery = { isArchived: { [Op.not]: true } };
    if (!isOperationHead && !isAdmin && !isOperationReview && !isOperationAdmin) {
      caseQuery.sourceOfComplaint = { [Op.notLike]: '%odoo%' };
    }

    const start = startDate ? new Date(`${startDate}T00:00:00+05:30`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999+05:30`) : null;

    const allCases = await Case.findAll({ where: caseQuery });
    const allUsers = await User.findAll({ attributes: ['id', 'fullName', 'email', 'role', 'monthlyTarget'] });
    const allProgress = await Progress.findAll();
    const allRefunds = await Refund.findAll();
    
    const progressMap = {};
    allProgress.forEach(p => {
      progressMap[p.caseId] = p;
    });

    const refundsMap = {};
    allRefunds.forEach(r => {
      refundsMap[r.caseId] = r;
    });

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

    const userFullName = (req.user.fullName || '').trim().toLowerCase();
    const userEmail = (req.user.email || '').trim().toLowerCase();

    allCases.forEach(c => {
      const isCaseActive = !c.isArchived && !(c.currentStatus && closureStatuses.includes(c.currentStatus.trim()));
      const createdDate = c.createdAt ? new Date(c.createdAt) : null;
      const isCreatedToday = createdDate && createdDate >= startOfToday;

      // Check if case belongs to the logged in user if they are not admin
      const isOwnCase = isAdmin ||
        (c.assignedTo && (
          c.assignedTo.trim().toLowerCase() === userFullName ||
          c.assignedTo.trim().toLowerCase() === userEmail
        ));

      const isOdooCase = c.sourceOfComplaint && c.sourceOfComplaint.toLowerCase().includes('odoo');

      if (isCaseActive && !isOdooCase) {
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

        if (isOwnCase) {
          activeCasesList.push({
            assignee: c.assignedTo || 'Unassigned',
            caseId: c.caseId,
            companyName: c.companyName || '—',
            dueDate: c.dueDate || '—',
            totalAmtPaid: c.totalAmtPaid || 0,
            currentStatus: c.currentStatus || 'New'
          });
        }
      }

      if (isCreatedToday && isOwnCase && !isOdooCase) {
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
        target: u.monthlyTarget,
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
        resolvedTodayAmt: 0,
        totalCasesList: [],
        pendingCasesList: [],
        resolvedCasesList: [],
        todayCasesList: [],
        resolvedTodayList: []
      };
    });

    allCases.forEach(c => {
      const assigneeName = c.assignedTo;
      if (!assigneeName) return;

      const key = assigneeName.trim().toLowerCase();
      let stats = assigneeStatsMap[key];
      if (!stats) {
        // Fallback: search by email
        const foundKey = Object.keys(assigneeStatsMap).find(k => 
          assigneeStatsMap[k].email.trim().toLowerCase() === key
        );
        if (foundKey) {
          stats = assigneeStatsMap[foundKey];
        }
      }
      if (!stats) return;

      const roleLower = (stats.role || '').toLowerCase().trim();
      const isOdooCase = c.sourceOfComplaint && c.sourceOfComplaint.toLowerCase().includes('odoo');
      if (roleLower !== 'operation review' && isOdooCase) {
        return; // Skip Odoo cases for non-"Operation Review" specialists
      }

      const amt = c.totalAmtPaid || 0;
      const isCaseResolved = isCompleted(c.currentStatus) || c.refundStatus === 'Paid';
      const isCaseClosure = isCaseResolved;

      // Determine precise resolution date using Refund and Progress updates
      let resolvedDate = null;

      // 1. Try to get resolution date from Refund paymentDate if refundStatus is Paid
      if (c.refundStatus === 'Paid') {
        const ref = refundsMap[c.caseId];
        if (ref) {
          let reqs = ref.requests;
          if (typeof reqs === 'string') {
            try { reqs = JSON.parse(reqs); } catch (e) {}
          }
          const requestsList = Array.isArray(reqs) && reqs.length > 0 ? reqs : [ref];
          let refundPaidDate = null;
          requestsList.forEach(r => {
            if (r.status && r.status.toLowerCase() === 'paid' && r.paymentDate) {
              const pDate = new Date(r.paymentDate);
              if (!isNaN(pDate.getTime())) {
                if (!refundPaidDate || pDate > refundPaidDate) {
                  refundPaidDate = pDate;
                }
              }
            }
          });
          resolvedDate = refundPaidDate;
        }
      }

      // 2. Try to get resolution date from Progress updates if not already set
      if (!resolvedDate) {
        const progress = progressMap[c.caseId];
        if (progress) {
          let rawUpdates = progress.updates;
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
          }
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch(e) {}
          }
          const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
          const resolutionUpdate = updates.find(u => u.stage && isCompleted(u.stage));
          if (resolutionUpdate && resolutionUpdate.createdAt) {
            resolvedDate = new Date(resolutionUpdate.createdAt);
          }
        }
      }

      // 3. Fall back to createdAt rather than updatedAt to prevent shifting resolution dates on edits
      if (!resolvedDate) {
        resolvedDate = c.createdAt ? new Date(c.createdAt) : (c.updatedAt ? new Date(c.updatedAt) : null);
      }

      let saved = 0;
      const ref = refundsMap[c.caseId];
      if (ref && c.refundStatus === 'Paid') {
        if (ref.savedAmount !== null && ref.savedAmount !== undefined) {
          saved = Number(ref.savedAmount);
        } else {
          saved = Math.max(0, (c.totalAmtPaid || 0) - (c.refundedAmount || 0));
        }
      } else {
        saved = 0;
      }

      // Check if it got resolved within the period, or if it is still pending at the end of the period
      const isResolvedInPeriod = isCaseResolved && (!start || (resolvedDate && resolvedDate >= start)) && (!end || (resolvedDate && resolvedDate <= end));

      // Check assignment date to see if case existed for the user in this period
      const assignedDate = c.assignedAt ? new Date(c.assignedAt) : (c.createdAt ? new Date(c.createdAt) : (c.createdDate ? new Date(c.createdDate) : null));
      if (end && assignedDate && assignedDate > end && !isResolvedInPeriod) {
        return; // Skip case: was assigned/created after the end of this period
      }

      const createdDate = c.createdAt ? new Date(c.createdAt) : null;
      const isAssignedToday = createdDate && createdDate >= startOfToday;

      const isResolvedToday = isCaseResolved && isCaseClosure && resolvedDate && resolvedDate >= startOfToday;

      const caseItem = {
        id: c.id,
        caseId: c.caseId,
        companyName: c.companyName || '—',
        totalAmtPaid: amt,
        currentStatus: c.currentStatus || 'New',
        priority: c.priority || 'Medium',
        dueDate: c.dueDate || '—',
        savedAmount: saved,
        refundedAmount: c.refundedAmount || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };

      stats.totalCases++;
      stats.totalAmt += amt;
      stats.totalCasesList.push(caseItem);

      if (isResolvedInPeriod) {
        if (isCaseClosure) {
          stats.resolvedCases++;
          stats.resolvedCasesList.push(caseItem);
        }
        stats.resolvedAmt += saved;
        stats.saved += saved;
      } else {
        // If not resolved, or resolved after end of period, it counts as pending during this period
        // But if it was resolved BEFORE this period, it should NOT count as pending!
        const isResolvedBeforeStart = isCaseResolved && start && resolvedDate && resolvedDate < start;
        if (!isResolvedBeforeStart) {
          stats.pendingCases++;
          stats.pendingAmt += amt;
          stats.pendingCasesList.push(caseItem);
        }
      }

      if (isAssignedToday) {
        stats.todayCases++;
        stats.todayAmt += amt;
        stats.todayCasesList.push(caseItem);
      }

      if (isResolvedToday) {
        stats.resolvedToday++;
        stats.resolvedTodayAmt += saved;
        stats.resolvedTodayList.push(caseItem);
      }
    });

    let performanceList = Object.values(assigneeStatsMap).filter(stats => {
      const roleLower = (stats.role || '').toLowerCase().trim();
      const isExcluded = ['admin', 'super admin', 'superadmin', 'operation head', 'accountant'].includes(roleLower);
      if (isExcluded) return false;

      const isSpecialist = ['operations', 'staff', 'operation admin', 'operation review', 'reviewer'].includes(roleLower);
      return stats.totalCases > 0 || isSpecialist;
    });

    if (!isAdmin) {
      if (req.user?.role?.toLowerCase().trim() === 'operation head') {
        performanceList = performanceList.filter(p =>
          (p.role || '').toLowerCase().trim() === 'operation review'
        );
      } else {
        performanceList = performanceList.filter(p =>
          (p.name || '').trim().toLowerCase() === userFullName ||
          (p.email || '').trim().toLowerCase() === userEmail
        );
      }
    }

    try {
      const periodName = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';
      const existing = await MisReport.findOne({ where: { period: periodName } });
      if (existing) {
        await existing.update({
          totalActiveCases,
          totalActiveCasesAmount,
          pendingOverdueCases,
          pendingOverdueCasesAmount,
          totalAmountAtRisk,
          casesAssignedToday,
          specialistPerformance: performanceList
        });
      } else {
        await MisReport.create({
          period: periodName,
          totalActiveCases,
          totalActiveCasesAmount,
          pendingOverdueCases,
          pendingOverdueCasesAmount,
          totalAmountAtRisk,
          casesAssignedToday,
          specialistPerformance: performanceList
        });
      }
    } catch (dbErr) {
      console.error('Error saving mis_report to db:', dbErr);
    }

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

router.post('/send-daily-email', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (!['Admin', 'Super Admin', 'SuperAdmin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied: Only Admins can trigger reports.' });
    }
    const { sendDailyReportsToAdmins } = require('../utils/scheduler');
    await sendDailyReportsToAdmins();
    res.json({ success: true, message: 'Daily reports compiled and sent successfully.' });
  } catch (error) {
    console.error('Trigger mail reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
