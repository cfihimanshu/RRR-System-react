const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const Task = require('../sql_models/Task');
const Case = require('../sql_models/Case');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationHelper');

// Get all tasks - only from Task collection (no case merging)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { assignee } = req.query;
    
    let query = {};
    if (['Admin', 'Super Admin', 'SuperAdmin', 'BD Head'].includes(req.user.role)) {
      if (req.query.isLegalDashboard === 'true') {
        const legalUsers = await User.findAll({ where: { role: 'Legal' } });
        const legalNames = legalUsers.map(u => (u.fullName || u.name || '').trim()).filter(Boolean);
        const legalEmails = legalUsers.map(u => (u.email || '').trim()).filter(Boolean);
        if (legalNames.length > 0) {
          query[Op.or] = [
            { assignee: { [Op.in]: legalNames } }, // Approximation, usually exact match is better for SQL
            { createdBy: { [Op.in]: legalEmails } }
          ];
        } else {
          query.assignee = '__non_existent_user__';
        }
      } else if (assignee && assignee !== 'All Users' && assignee !== 'undefined') {
        query.assignee = { [Op.like]: `%${assignee.trim()}%` };
      }
    } else {
      // Non-admins see tasks assigned to them OR created by them
      const nameRegex = `%${req.user.fullName}%`;
      query[Op.or] = [
        { assignee: { [Op.like]: nameRegex } },
        { createdBy: req.user.email }
      ];
    }

    if (req.query.date) {
      const dateObj = new Date(req.query.date);
      const start = new Date(dateObj.setHours(0, 0, 0, 0));
      const end = new Date(dateObj.setHours(23, 59, 59, 999));
      query.updatedAt = { [Op.between]: [start, end] };
    }

    if (req.query.status_ne) {
      query.status = { [Op.ne]: req.query.status_ne };
    }

    if (req.query.status_nin) {
      const values = String(req.query.status_nin).split(',').map(v => v.trim()).filter(Boolean);
      if (values.length) query.status = { [Op.notIn]: values };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const total = await Task.count({ where: query });

    const rawTasks = await Task.findAll({
      where: query,
      order: [['updatedAt', 'DESC']],
      offset: skip,
      limit: limit,
      attributes: ['id', 'taskId', 'title', 'priority', 'assignee', 'dueDate', 'caseId', 'details', 'status', 'source', 'createdBy', 'createdAt', 'updatedAt', 'notes', 'completedAt']
    });

    const caseIds = [...new Set(rawTasks.map(t => t.caseId).filter(Boolean))];
    const cases = caseIds.length
      ? await Case.findAll({ where: { caseId: { [Op.in]: caseIds } }, attributes: ['caseId', 'companyName'] })
      : [];
    const caseMap = {};
    cases.forEach(c => {
      caseMap[c.caseId] = c.companyName;
    });

    const tasks = rawTasks.map(t => ({
      ...t.toJSON(),
      _id: t.id, // For frontend compatibility
      companyName: caseMap[t.caseId] || ''
    }));

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
      tasks,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task
router.post('/', verifyToken, async (req, res) => {
  try {
    const linkedCaseId = req.body.caseId || '';
    const basePart = linkedCaseId || 'MAN';
    
    let count = linkedCaseId
      ? await Task.count({ where: { caseId: linkedCaseId } })
      : await Task.count({ where: { source: 'Manual' } });
      
    let taskId = `TSK-${basePart}-${String(count + 1).padStart(3, '0')}`;
    
    let exists = await Task.findOne({ where: { taskId } });
    while (exists) {
      count++;
      taskId = `TSK-${basePart}-${String(count + 1).padStart(3, '0')}`;
      exists = await Task.findOne({ where: { taskId } });
    }
    const taskData = { ...req.body };
    if (taskData.status === 'Completed') {
      taskData.completedAt = new Date();
    }
    const newTask = await Task.create({
      ...taskData,
      taskId,
      source: 'Manual',
      createdBy: req.user.email
    });
    
    // Notify Assignee
    try {
      const assigneeUser = await User.findOne({ 
        where: { fullName: { [Op.like]: `%${req.body.assignee.trim()}%` } } 
      });
      if (assigneeUser) {
        createNotification(assigneeUser.email, 'New Task Assigned', `Task ${newTask.taskId}: ${newTask.title}`, 'Task', '/my-task');
      }
    } catch (e) { console.error('Task Notification Error:', e); }

    const responseObj = newTask.toJSON();
    responseObj._id = newTask.id; // Frontend compatibility
    res.status(201).json(responseObj);
  } catch (error) {
    console.error('Task Create Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task status (Drag and drop or manual)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    let updated = await Task.findByPk(req.params.id);
    if (updated) {
      const updateData = { ...req.body };
      if (status) {
        if (status === 'Completed') {
          if (updated.status !== 'Completed') {
            updateData.completedAt = new Date();
          }
        } else {
          updateData.completedAt = null;
        }
      }
      await updated.update(updateData);
      const responseObj = updated.toJSON();
      responseObj._id = updated.id;
      return res.json(responseObj);
    }

    // 2. If not found in Task, it might be a Case
    if (!updated) {
      let updatePayload = { ...req.body };
      if (req.body.status) {
        let caseStatus = 'New';
        if (req.body.status === 'Completed') caseStatus = 'Closed';
        else if (req.body.status === 'In Progress') caseStatus = 'In Progress';
        else if (req.body.status === 'To Do') caseStatus = 'New';
        updatePayload.currentStatus = caseStatus;
        delete updatePayload.status;
      }

      updated = await Case.findByPk(req.params.id);
      
      if (updated) {
        await updated.update(updatePayload);
        // Return in task-mapped format so frontend is happy
        return res.json({
          _id: updated.id,
          status: status, // The kanban status
          isCase: true
        });
      }
    }

    return res.status(404).json({ error: 'Task or Case not found' });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedTask = await Task.findByPk(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await deletedTask.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
