const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const Case = require('../sql_models/Case');
const User = require('../sql_models/User');
const Task = require('../sql_models/Task');
const Communication = require('../sql_models/Communication');
const Refund = require('../sql_models/Refund');
const Timeline = require('../sql_models/Timeline');
const Report = require('../sql_models/Report');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const statsCache = new Map();
const CACHE_DURATION = 60000; 

global.clearStatsCache = () => {
  statsCache.clear();
  console.log('Dashboard stats cache cleared successfully.');
};

function buildAnchoredRegex(text) {
  const safe = String(text || '').trim();
  if (!safe) return null;
  const escaped = safe.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  return new RegExp(`^\\\\s*${escaped}`, 'i');
}

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_${req.query.teamFilter || ''}_${req.query.userFilter || ''}_${req.query.startDate || ''}_${req.query.endDate || ''}_${req.query.perfStartDate || ''}_${req.query.perfEndDate || ''}_${req.query.isLegalDashboard || ''}`;
    const cachedItem = statsCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION)) {
      res.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=45');
      return res.json(cachedItem.data);
    }

    const timings = {};
    const track = async (name, promiseOrFn) => {
      const start = Date.now();
      const resVal = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
      timings[name] = Date.now() - start;
      return resVal;
    };

    const { teamFilter, userFilter, startDate, endDate, perfStartDate, perfEndDate } = req.query;
    let teamDateQuery = {};
    let commDateQuery = {};
    let dateStrWhere = '';
    let commDateStrWhere = '';

    let activeTeamFilter = teamFilter;
    if (!activeTeamFilter && !startDate && !endDate) {
      activeTeamFilter = '7days';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      teamDateQuery = { createdAt: { [Op.between]: [start, end] } };
      dateStrWhere = `createdAt >= '${start.toISOString().split('T')[0]} 00:00:00' AND createdAt <= '${end.toISOString().split('T')[0]} 23:59:59'`;
    } else if (activeTeamFilter === '7days') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - 7);
      teamDateQuery = { createdAt: { [Op.gte]: d } };
      dateStrWhere = `createdAt >= '${d.toISOString().split('T')[0]} 00:00:00'`;
    } else if (activeTeamFilter === '1month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - 1);
      teamDateQuery = { createdAt: { [Op.gte]: d } };
      dateStrWhere = `createdAt >= '${d.toISOString().split('T')[0]} 00:00:00'`;
    } else if (activeTeamFilter === '3months') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      const end = new Date(d);
      d.setMonth(d.getMonth() - 3);
      teamDateQuery = { createdAt: { [Op.gte]: d, [Op.lt]: end } };
      dateStrWhere = `createdAt >= '${d.toISOString().split('T')[0]} 00:00:00' AND createdAt < '${end.toISOString().split('T')[0]} 00:00:00'`;
    }
    
    commDateQuery = teamDateQuery;
    commDateStrWhere = dateStrWhere;

    const dbUser = await track('fetchUserDb', () => User.findByPk(req.user.id));
    let userName = (dbUser?.fullName || dbUser?.name || req.user.fullName || '').trim();
    let userEmail = (dbUser?.email || req.user.email || '').trim();
    let userId = req.user.id;

    let targetEmail = userEmail;
    if (userFilter) {
      const filteredUser = await User.findOne({
        where: {
          [Op.or]: [
            { fullName: { [Op.like]: `%${userFilter.trim()}%` } },
            { name: { [Op.like]: `%${userFilter.trim()}%` } }
          ]
        }
      });
      if (filteredUser) {
        targetEmail = filteredUser.email;
      }
    }

    const firstName = userName.split(/\\s+/)[0];
    const searchValues = [userName, userEmail, userId];
    if (firstName && firstName.length >= 3) {
      searchValues.push(firstName);
    }
    const uniqueSearchValues = [...new Set(searchValues.filter(Boolean).map(v => String(v).trim()))];
    
    let ownershipQuery = {};
    let activeNameRegexStr = userName; // Default
    let legalEmails = [];

    const isLegalDashboard = req.query.isLegalDashboard === 'true' || req.user.role === 'Legal';

    if (req.user?.role?.toLowerCase().trim() === 'operation head') {
      ownershipQuery = {};
    } else if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      const legalUsers = await User.findAll({ where: { role: 'Legal' } });
      const legalNames = legalUsers.map(u => (u.fullName || u.name || '').trim()).filter(Boolean);
      legalEmails = legalUsers.map(u => (u.email || '').trim()).filter(Boolean);
      if (legalNames.length > 0) {
        ownershipQuery = { assignedTo: { [Op.in]: legalNames } };
      } else {
        ownershipQuery = { assignedTo: '__non_existent_user__' };
      }
    } else if (['operation admin', 'operation admin'].includes(req.user.role?.toLowerCase().trim())) {
      ownershipQuery = { assignedTo: { [Op.like]: `%${userName}%` } };
    } else if (req.user.role !== 'Admin') {
      ownershipQuery = {
        [Op.or]: [
          { assignedTo: { [Op.like]: `%${userName}%` } },
          {
            [Op.and]: [
              { [Op.or]: [{ assignedTo: '' }, { assignedTo: null }] },
              { initiatedBy: { [Op.like]: `%${userName}%` } }
            ]
          }
        ]
      };
    } else if (userFilter) {
      const filterEsc = userFilter.trim();
      ownershipQuery = {
        [Op.or]: [
          { assignedTo: { [Op.like]: `%${filterEsc}%` } },
          {
            [Op.and]: [
              { [Op.or]: [{ assignedTo: '' }, { assignedTo: null }] },
              { initiatedBy: { [Op.like]: `%${filterEsc}%` } }
            ]
          }
        ]
      };
    }

    let query = { ...teamDateQuery, ...ownershipQuery };

    const bypassEodCheck = dbUser?.bypassEodCheck || false;
    let isEodMissed = false;

    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant', 'Operation Head', 'Operation Review'].includes(req.user.role)) {
      const nowForIST = new Date();
      const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
      const todayStr = istTime.toISOString().split('T')[0];

      const lastSod = await Report.findOne({ 
        where: { userEmail: req.user.email, type: 'SOD', date: { [Op.lt]: todayStr } },
        order: [['date', 'DESC']]
      });

      if (lastSod) {
        const lastEod = await Report.findOne({ where: { userEmail: req.user.email, type: 'EOD', date: lastSod.date } });
        if (!lastEod) {
          isEodMissed = true;
        }
      }
    }

    const completedStatuses = ['Settled', 'settled', 'Settlement', 'settlement', 'Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed', 'NA', 'na', 'Na', 'nA', 'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'];
    
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const dateStrIST = istTime.toISOString().split('T')[0];
    const startOfToday = new Date(`${dateStrIST}T00:00:00+05:30`);
    const fortyEightHrsAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const dueSoonDate = twoDaysFromNow.toISOString().split('T')[0];

    const tomorrowObj = new Date();
    tomorrowObj.setDate(nowForIST.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
    const dayAfterTomorrowObj = new Date();
    dayAfterTomorrowObj.setDate(nowForIST.getDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrowObj.toISOString().split('T')[0];

    let refundQuery = {
      status: { [Op.in]: ['Pending Payment', 'Paid'] }
    };
    if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      refundQuery.requestedBy = { [Op.in]: legalEmails };
    } else if (req.user.role !== 'Admin' && req.user.role !== 'Accountant') {
      refundQuery.requestedBy = targetEmail;
    }

    let taskUserQuery = {};
    if (isLegalDashboard && ['Admin', 'Super Admin', 'SuperAdmin'].includes(req.user.role)) {
      taskUserQuery = {
        [Op.or]: [
          { assignee: { [Op.in]: legalEmails } },
          { createdBy: { [Op.in]: legalEmails } }
        ]
      };
    } else if (req.user.role !== 'Admin' || userFilter) {
      const targetUserStr = String(userFilter || userName || '');
      taskUserQuery = {
        [Op.or]: [
          { assignee: { [Op.like]: `%${targetUserStr}%` } },
          { createdBy: targetEmail }
        ]
      };
    }

    let myCaseIds = [];
    if (req.user.role !== 'Admin' || isLegalDashboard) {
      const cases = await track('myCaseIdsDistinct', () => Case.findAll({ attributes: ['caseId'], where: query }));
      myCaseIds = cases.map(c => c.caseId).filter(Boolean);
    }
    const timelineQuery = (req.user.role !== 'Admin' || isLegalDashboard) ? { caseId: { [Op.in]: myCaseIds } } : {};

    let timelineMatch = { ...timelineQuery };
    if (req.user.role !== 'Admin' || userFilter || isLegalDashboard) {
      timelineMatch.source = { [Op.like]: `%${userName}%` };
    }

    const yesterday = new Date(istTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // RAW SQL FOR CASE METRICS (Replacing complex Mongoose aggregation)
    let sqlWhere = '1=1';
    if (Object.keys(query).length > 0) {
       // A bit simplified mapping of query to raw SQL where
       if (req.user?.role?.toLowerCase().trim() !== 'operation head' && req.user.role !== 'Admin') {
          sqlWhere += ` AND (assignedTo LIKE '%${userName}%' OR ( (assignedTo IS NULL OR assignedTo = '') AND initiatedBy LIKE '%${userName}%' ))`;
       }
       if (dateStrWhere) {
          sqlWhere += ` AND ${dateStrWhere}`;
       }
    }
    
    // We will do a full fetch of relevant cases and reduce them in JS, which is very fast for a few thousand cases
    const allCases = await track('fetchAllCases', () => Case.findAll({ where: query }));
    
    const b = {
      totalCases: 0, totalAmountPaid: 0, openCases: 0, openCasesAmount: 0,
      settledCount: 0, settledAmount: 0, closedCount: 0, closedAmount: 0,
      criticalPriority: 0, criticalPriorityAmount: 0, highPriority: 0, highPriorityAmount: 0,
      mediumPriority: 0, mediumPriorityAmount: 0, lowPriority: 0, lowPriorityAmount: 0,
      linkedByCount: 0, createdToday: 0, liveEscalations: 0, noUpdate48Hrs: 0,
      slaBreached: 0, totalCriticalCases: 0, closedCriticalCases: 0
    };

    let unassignedCount = 0;
    const caseTypeMap = {};
    const sourceMap = {};
    const trendMap = {};
    const overdueActions = [];
    const dueSoonActions = [];
    const highPriorityCases = [];
    const threatTrendMap = {};

    allCases.forEach(c => {
      // Avoid Odoo cases if not operation head
      if (req.user?.role?.toLowerCase().trim() !== 'operation head' && String(c.sourceOfComplaint).toLowerCase().includes('odoo')) {
         return;
      }
      
      b.totalCases++;
      const amt = Number(c.totalAmtPaid) || 0;
      b.totalAmountPaid += amt;
      
      const isSettled = ['Settled', 'settled', 'Settlement', 'settlement'].includes(c.currentStatus);
      const isClosed = ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed'].includes(c.currentStatus);
      const isCompletedStatus = completedStatuses.includes(c.currentStatus);
      const isOpen = !isCompletedStatus && c.refundStatus !== 'Paid' && !c.isArchived;

      if (isOpen) {
        b.openCases++;
        b.openCasesAmount += amt;
      }
      if (isSettled) { b.settledCount++; b.settledAmount += amt; }
      if (isClosed) { b.closedCount++; b.closedAmount += amt; }

      if (c.priority === 'Critical' && !c.isArchived) { b.criticalPriority++; b.criticalPriorityAmount += amt; }
      if (c.priority === 'High' && !c.isArchived) { b.highPriority++; b.highPriorityAmount += amt; }
      if (c.priority === 'Medium' && !c.isArchived) { b.mediumPriority++; b.mediumPriorityAmount += amt; }
      if (c.priority === 'Low' && !c.isArchived) { b.lowPriority++; b.lowPriorityAmount += amt; }

      if (c.linkedBy) b.linkedByCount++;
      if (new Date(c.createdAt) >= startOfToday) b.createdToday++;

      if (c.priority === 'High' && new Date(c.updatedAt) >= fortyEightHrsAgo && !isCompletedStatus && c.refundStatus !== 'Paid') b.liveEscalations++;
      if (new Date(c.updatedAt) < fortyEightHrsAgo && !isCompletedStatus && c.refundStatus !== 'Paid') b.noUpdate48Hrs++;
      if (c.priority === 'High' && c.nextActionDate && c.nextActionDate < today && !isCompletedStatus && c.refundStatus !== 'Paid') b.slaBreached++;

      if (c.priority === 'High' && !c.isArchived) b.totalCriticalCases++;
      if (c.priority === 'High' && (isSettled || isClosed)) b.closedCriticalCases++;

      if (!c.assignedTo && !c.initiatedBy) unassignedCount++;

      const type = (c.typeOfComplaint || 'Unknown').toUpperCase().trim();
      caseTypeMap[type] = (caseTypeMap[type] || { count: 0, amount: 0 });
      caseTypeMap[type].count++;
      caseTypeMap[type].amount += amt;

      const source = (c.sourceOfComplaint || 'Unknown').toUpperCase().trim();
      sourceMap[source] = (sourceMap[source] || { count: 0, amount: 0 });
      sourceMap[source].count++;
      sourceMap[source].amount += amt;

      if (new Date(c.createdAt) >= sevenDaysAgo) {
         const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
         trendMap[dateStr] = trendMap[dateStr] || { newCases: 0, highPriority: 0 };
         trendMap[dateStr].newCases++;
         if (c.priority === 'High') trendMap[dateStr].highPriority++;
      }

      if (c.nextActionDate && c.nextActionDate < today && c.currentStatus !== 'Closed') {
         overdueActions.push(c);
      }
      if (c.nextActionDate && c.nextActionDate >= today && c.nextActionDate <= dueSoonDate && c.currentStatus !== 'Closed') {
         dueSoonActions.push(c);
      }
      if (c.priority === 'High' && !isCompletedStatus && c.refundStatus !== 'Paid') {
         highPriorityCases.push(c);
      }

      if (new Date(c.createdAt) >= thirtyDaysAgo) {
         const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
         const key = `${dateStr}_${c.typeOfComplaint}`;
         threatTrendMap[key] = (threatTrendMap[key] || 0) + 1;
      }
    });

    overdueActions.sort((a,b) => (a.nextActionDate > b.nextActionDate ? 1 : -1));
    dueSoonActions.sort((a,b) => (a.nextActionDate > b.nextActionDate ? 1 : -1));
    allCases.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    highPriorityCases.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    const caseTypeWiseData = Object.entries(caseTypeMap).map(([k,v]) => ({ caseType: k, count: v.count, totalAmount: v.amount })).sort((a,b) => b.count - a.count);
    const sourceWiseData = Object.entries(sourceMap).map(([k,v]) => ({ source: k, count: v.count, totalAmount: v.amount })).sort((a,b) => b.count - a.count);

    const [
      docsTodayCount, commsTodayCount, totalCommsCountRaw, progressTodayCount,
      yesterdayEod, todaySod, todayEod, lastTimeline, refundDocs
    ] = await Promise.all([
      Timeline.count({ where: { ...timelineMatch, eventType: { [Op.in]: ['Document Upload', 'Document Uploaded'] }, createdAt: { [Op.gte]: startOfToday } } }),
      Timeline.count({ where: { ...timelineMatch, eventType: { [Op.in]: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] }, createdAt: { [Op.gte]: startOfToday } } }),
      Timeline.count({ where: { ...timelineMatch, eventType: { [Op.in]: ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'] } } }),
      Timeline.count({ where: { ...timelineMatch, eventType: { [Op.in]: ['Progress Update', 'Status Update'] }, createdAt: { [Op.gte]: startOfToday } } }),
      
      Report.findOne({ where: { userEmail: targetEmail, type: 'EOD', date: yesterdayStr }, order: [['createdAt', 'DESC']] }),
      Report.findOne({ where: { userEmail: targetEmail, type: 'SOD', date: dateStrIST }, order: [['createdAt', 'DESC']] }),
      Report.findOne({ where: { userEmail: targetEmail, type: 'EOD', date: dateStrIST }, order: [['createdAt', 'DESC']] }),
      Timeline.findOne({ where: { source: { [Op.like]: `%${userName}%` }, createdAt: { [Op.gte]: startOfToday } }, order: [['createdAt', 'DESC']] }),
      Refund.findAll({ where: refundQuery })
    ]);

    const documentsUploadedToday = docsTodayCount;
    const communicationsToday = commsTodayCount;
    const totalCommunications = totalCommsCountRaw;
    const progressUpdatesToday = progressTodayCount;

    const allRefunds = refundDocs.map(r => r.toJSON());
    let totalRefundAmount = 0;
    let pendingApprovals = 0;

    allRefunds.forEach(r => {
      const itemsToProcess = (r.requests && r.requests.length > 0) ? r.requests : [r];

      itemsToProcess.forEach(item => {
        if (item.status === 'Pending Admin Approval') {
          pendingApprovals += Number(item.amount) || 0;
        }

        if (item.status === 'Rejected') return;

        const instList = Array.isArray(item.installments) ? item.installments : [];
        const allInstPaid = instList.length > 0 && instList.every(inst => inst.status === 'Paid');
        const isFullyPaid = item.status === 'Paid' || allInstPaid;

        if (isFullyPaid) {
          totalRefundAmount += Number(item.amount) || 0;
        } else if (instList.length > 0) {
          const paidInstSum = instList
            .filter(inst => inst.status === 'Paid')
            .reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
          totalRefundAmount += paidInstSum;
        }
      });
    });

    const [tasks] = await Promise.all([
      Task.findAll({ where: taskUserQuery })
    ]);

    let pendingTasksCount = 0;
    let dueToday = todaySod ? (todaySod.myTasksToday?.length || 0) : 0;
    let dueWithin24h = 0;
    let dueWithin48h = 0;
    let overdue = 0;
    let actionTakenToday = 0;
    let totalTasksToday = todaySod ? (todaySod.myTasksToday?.length || 0) : 0;
    let completedTasksToday = 0;

    tasks.forEach(t => {
       const isCompleted = ['Completed', 'Done'].includes(t.status);
       if (!isCompleted) pendingTasksCount++;
       if (!isCompleted && new Date(t.createdAt) >= startOfToday) dueToday++;
       if (!isCompleted && t.dueDate === tomorrowStr) dueWithin24h++;
       if (!isCompleted && t.dueDate === dayAfterTomorrowStr) dueWithin48h++;
       if (!isCompleted && t.reminderDateTime && t.reminderDateTime < new Date().toISOString() && t.reminderDateTime !== '') overdue++;
       if (t.status === 'Completed' && new Date(t.updatedAt) >= startOfToday) actionTakenToday++;
       if (new Date(t.createdAt) >= startOfToday) totalTasksToday++;
       if (isCompleted && new Date(t.createdAt) >= startOfToday) completedTasksToday++;
    });

    const timeBoundActions = { dueToday, dueWithin24h, dueWithin48h, overdue, actionTakenToday, totalTasksToday, completedTasksToday };

    const totalCriticalCases = b.totalCriticalCases;
    const closedCriticalCases = b.closedCriticalCases;

    const yesterdayEodFilled = yesterdayEod ? 1 : 0;

    const threatTrendAggregation = Object.entries(threatTrendMap).map(([k,v]) => {
      const parts = k.split('_');
      return { _id: { date: parts[0], type: parts[1] }, count: v };
    });
    
    const foundTypes = new Set();
    threatTrendAggregation.forEach(item => { if (item._id.type) foundTypes.add(item._id.type); });

    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      dateMap[dayStr] = { date: label };
      foundTypes.forEach(type => { dateMap[dayStr][type] = 0; });
    }
    threatTrendAggregation.forEach(item => {
      if (dateMap[item._id.date] && item._id.type) dateMap[item._id.date][item._id.type] = item.count;
    });
    const threatTrendDataArray = Object.values(dateMap);
    const typeTotals = {};
    threatTrendAggregation.forEach(item => {
      const type = item._id.type || 'Unknown';
      typeTotals[type] = (typeTotals[type] || 0) + item.count;
    });
    const sortedTypes = Object.keys(typeTotals).sort((a, b) => typeTotals[b] - typeTotals[a]);

    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayData = trendMap[dayStr] || { newCases: 0, highPriority: 0 };
      trendData.push({ date: label, newCases: dayData.newCases, closedCases: 0, highPriority: dayData.highPriority });
    }

    const threatAnalysis = caseTypeWiseData.slice(0, 5).map(item => ({ type: item.caseType, count: item.count, amount: item.totalAmount || 0 }));
    
    const provisions = {
      today: { count: 0, amount: 0 },
      thisWeek: { count: 0, amount: 0 },
      thisMonth: { count: 0, amount: 0 },
      next6Months: { count: 0, amount: 0 }
    };

    const nowForRefunds = new Date();

    const startOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate(), 0, 0, 0, 0);
    const endOfTodayForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), nowForRefunds.getDate(), 23, 59, 59, 999);

    const startOfThisWeekForRefunds = new Date(startOfTodayForRefunds);
    const dayVal = startOfThisWeekForRefunds.getDay();
    const diffVal = startOfThisWeekForRefunds.getDate() - dayVal + (dayVal === 0 ? -6 : 1);
    startOfThisWeekForRefunds.setDate(diffVal);
    startOfThisWeekForRefunds.setHours(0, 0, 0, 0);

    const endOfThisWeekForRefunds = new Date(startOfThisWeekForRefunds);
    endOfThisWeekForRefunds.setDate(endOfThisWeekForRefunds.getDate() + 6);
    endOfThisWeekForRefunds.setHours(23, 59, 59, 999);

    const startOfThisMonthForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth(), 1, 0, 0, 0, 0);
    const endOfThisMonthForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfNext6MonthsForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 1, 1, 0, 0, 0, 0);
    const endOfNext6MonthsForRefunds = new Date(nowForRefunds.getFullYear(), nowForRefunds.getMonth() + 7, 0, 23, 59, 59, 999);

    const caseSets = {
      today: new Set(),
      thisWeek: new Set(),
      thisMonth: new Set(),
      next6Months: new Set()
    };

    allRefunds.forEach(r => {
      if (r.status === 'Rejected') return;

      const installments = r.installments && r.installments.length > 0
        ? r.installments
        : [{ status: r.status, dueDate: r.paymentDate || r.timestamp, amount: r.amount, paymentDate: r.paymentDate, transactionId: r.transactionId }];

      installments.forEach(inst => {
        if (inst.status === 'Paid') return; 

        const amt = Number(inst.amount) || 0;

        let refDate = null;
        if (inst.dueDate) {
          refDate = new Date(inst.dueDate);
        } else {
          refDate = new Date(r.timestamp || r.paymentDate || new Date());
        }

        if (refDate >= startOfTodayForRefunds && refDate <= endOfTodayForRefunds) {
          caseSets.today.add(r.caseId);
          provisions.today.amount += amt;
        }
        if (refDate >= startOfThisWeekForRefunds && refDate <= endOfThisWeekForRefunds) {
          caseSets.thisWeek.add(r.caseId);
          provisions.thisWeek.amount += amt;
        }
        if (refDate >= startOfThisMonthForRefunds && refDate <= endOfThisMonthForRefunds) {
          caseSets.thisMonth.add(r.caseId);
          provisions.thisMonth.amount += amt;
        }
        if (refDate >= startOfNext6MonthsForRefunds && refDate <= endOfNext6MonthsForRefunds) {
          caseSets.next6Months.add(r.caseId);
          provisions.next6Months.amount += amt;
        }
      });
    });

    provisions.today.count = caseSets.today.size;
    provisions.thisWeek.count = caseSets.thisWeek.size;
    provisions.thisMonth.count = caseSets.thisMonth.size;
    provisions.next6Months.count = caseSets.next6Months.size;

    const commsForPotential = await track('commsPotential', () => Communication.findAll({ where: (req.user.role !== 'Admin' ? { caseId: { [Op.in]: myCaseIds } } : {}) }));
    
    let totalDemandAmount = 0;
    let totalAmountSaved = 0;
    const commCaseMap = {};
    commsForPotential.forEach(c => {
       const cid = c.caseId || 'unlinked';
       commCaseMap[cid] = commCaseMap[cid] || { demand: 0, saved: 0 };
       const maxD = Math.max(Number(c.demandAmount) || 0, Number(c.refundDemanded) || 0);
       const maxS = Number(c.amountSaved) || 0;
       if (maxD > commCaseMap[cid].demand) commCaseMap[cid].demand = maxD;
       if (maxS > commCaseMap[cid].saved) commCaseMap[cid].saved = maxS;
    });

    Object.values(commCaseMap).forEach(v => {
       totalDemandAmount += v.demand;
       totalAmountSaved += v.saved;
    });

    const amountAtRisk = totalDemandAmount;

    let teamPerformance = [];
    
    const myPerformance = {
      totalCommunications: totalCommunications,
      casesResolved: b.settledCount,
      naCases: 0,
      overdueCases: 0
    };

    allCases.forEach(c => {
       if (c.currentStatus !== 'Closed' && c.nextActionDate && c.nextActionDate < todayStr) {
          myPerformance.overdueCases++;
       }
       if (['NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'].includes(c.typeOfComplaint)) {
          myPerformance.naCases++;
       }
    });

    const responseData = {
      _timings: timings,
      myPerformance,
      totalCriticalCases,
      closedCriticalCases,
      yesterdayEodFilled,
      threatTrendData: threatTrendDataArray,
      linkedByCount: b.linkedByCount,
      threatTrendTypes: sortedTypes,
      totalCases: b.totalCases,
      totalAmountPaid: b.totalAmountPaid,
      openCases: b.openCases,
      openCasesAmount: b.openCasesAmount,
      settledCases: b.settledCount,
      settledAmount: b.settledAmount,
      closedCases: b.closedCount,
      closedAmount: b.closedAmount,
      casesCreatedToday: b.createdToday,
      documentsUploadedToday,
      communicationsToday,
      totalCommunications,
      progressUpdatesToday,
      pendingTasksCount,
      criticalPriority: b.criticalPriority,
      criticalPriorityAmount: b.criticalPriorityAmount,
      highPriority: b.highPriority,
      highPriorityAmount: b.highPriorityAmount,
      mediumPriority: b.mediumPriority,
      mediumPriorityAmount: b.mediumPriorityAmount,
      lowPriority: b.lowPriority,
      lowPriorityAmount: b.lowPriorityAmount,
      overdueActions: overdueActions.slice(0, 10),
      dueSoonActions: dueSoonActions.slice(0, 10),
      recentCases: allCases.slice(0, 10),
      highPriorityCases: highPriorityCases.slice(0, 10),
      teamPerformance,
      totalRefundAmount,
      totalAmountSaved,
      totalDemandAmount,
      caseTypeWiseData,
      sourceWiseData,
      trendData,
      threatAnalysis,
      isEodMissed,
      bypassEodCheck,
      provisions,
      collectionPotential: totalDemandAmount,
      amountAtRisk,
      timeBoundActions,
      violations: {
         sodNotSubmitted: 0,
         eodNotSubmitted: 0,
         noUpdate48Hrs: b.noUpdate48Hrs,
         slaBreached: b.slaBreached,
         missingSodUsers: [],
         missingEodUsers: [],
         missingNoUpdateUsers: []
      }
    };

    statsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    res.json(responseData);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
