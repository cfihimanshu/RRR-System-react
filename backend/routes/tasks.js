const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationHelper');
const User = require('../models/User');

// Get all tasks - only from Task collection (no case merging)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { assignee } = req.query;
    
    let query = {};
    if (req.user.role === 'Admin') {
      if (assignee && assignee !== 'All Users' && assignee !== 'undefined') {
        // Use \s* to ignore any leading/trailing spaces saved in the database
        query.assignee = new RegExp(`^\\s*${assignee.trim()}\\s*$`, 'i');
      }
    } else {
      // Non-admins see tasks assigned to them OR created by them
      const esc = req.user.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`${esc}`, 'i');
      query.$or = [
        { assignee: nameRegex },
        { createdBy: req.user.email }
      ];
    }

    if (req.query.date) {
      const dateObj = new Date(req.query.date);
      const start = new Date(dateObj.setHours(0, 0, 0, 0));
      const end = new Date(dateObj.setHours(23, 59, 59, 999));
      query.updatedAt = { $gte: start, $lte: end };
    }

    if (req.query.status_ne) {
      query.status = { $ne: req.query.status_ne };
    }

    if (req.query.status_nin) {
      const values = String(req.query.status_nin).split(',').map(v => v.trim()).filter(Boolean);
      if (values.length) query.status = { $nin: values };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);

    const rawTasks = await Task.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('taskId title priority assignee dueDate caseId details status reminderDateTime source notes createdBy createdAt updatedAt')
      .lean();

    const caseIds = [...new Set(rawTasks.map(t => t.caseId).filter(Boolean))];
    const cases = caseIds.length
      ? await Case.find({ caseId: { $in: caseIds } }, 'caseId companyName').lean()
      : [];
    const caseMap = {};
    cases.forEach(c => {
      caseMap[c.caseId] = c.companyName;
    });

    const tasks = rawTasks.map(t => ({
      ...t,
      companyName: caseMap[t.caseId] || ''
    }));

    res.set('Cache-Control', 'private, max-age=30');
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
    
    // Count existing tasks to get a starting number
    let count = linkedCaseId
      ? await Task.countDocuments({ caseId: linkedCaseId })
      : await Task.countDocuments({ source: 'Manual' });
      
    let taskId = `TSK-${basePart}-${String(count + 1).padStart(3, '0')}`;
    
    // Ensure taskId is unique by checking if it already exists
    let exists = await Task.findOne({ taskId });
    while (exists) {
      count++;
      taskId = `TSK-${basePart}-${String(count + 1).padStart(3, '0')}`;
      exists = await Task.findOne({ taskId });
    }
    const newTask = new Task({
      ...req.body,
      taskId,
      source: 'Manual',
      createdBy: req.user.email
    });
    await newTask.save();
    
    // Notify Assignee
    try {
      const assigneeUser = await User.findOne({ 
        fullName: { $regex: new RegExp(`^\\s*${req.body.assignee.trim()}\\s*$`, 'i') } 
      });
      if (assigneeUser) {
        createNotification(assigneeUser.email, 'New Task Assigned', `Task ${newTask.taskId}: ${newTask.title}`, 'Task', '/my-task');
      }
    } catch (e) { console.error('Task Notification Error:', e); }

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Task Create Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task status (Drag and drop or manual)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // 1. Try updating as a manual Task
    let updated = await Task.findByIdAndUpdate(
      req.params.id, 
      { ...req.body },
      { new: true }
    );

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

      updated = await Case.findByIdAndUpdate(
        req.params.id,
        updatePayload,
        { new: true }
      );
      
      if (updated) {
        // Return in task-mapped format so frontend is happy
        return res.json({
          _id: updated._id,
          status: status, // The kanban status
          isCase: true
        });
      }
    }

    if (!updated) {
      return res.status(404).json({ error: 'Task or Case not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
