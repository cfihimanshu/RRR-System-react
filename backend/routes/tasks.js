const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');

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
      query.$or = [
        { assignee: req.user.fullName },
        { createdBy: req.user.email }
      ];
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task
router.post('/', verifyToken, async (req, res) => {
  try {
    const linkedCaseId = req.body.caseId || '';
    // Count existing tasks for this specific case to generate sequential number
    const existingCount = linkedCaseId
      ? await Task.countDocuments({ caseId: linkedCaseId })
      : await Task.countDocuments({ source: 'Manual' });
    const basePart = linkedCaseId || 'MAN';
    const taskId = `TSK-${basePart}-${String(existingCount + 1).padStart(3, '0')}`;
    const newTask = new Task({
      ...req.body,
      taskId,
      source: 'Manual',
      createdBy: req.user.email
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
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

module.exports = router;
