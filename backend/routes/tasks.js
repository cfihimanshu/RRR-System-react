const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Case = require('../models/Case');
const { verifyToken } = require('../middleware/auth');

// Get all tasks (Admin can filter, Staff sees theirs)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { assignee } = req.query;
    console.log('Fetching tasks. Query assignee:', assignee, 'User Role:', req.user.role);
    
    let query = {};

    if (req.user.role === 'Admin') {
      if (assignee && assignee !== 'All Users' && assignee !== 'undefined') {
        query.assignee = new RegExp(`^${assignee.trim()}$`, 'i');
      }
      // If 'All Users' or no assignee filter, return everything
    } else {
      // Non-admins only see tasks assigned to them
      query.assignee = req.user.fullName;
    }

    console.log('Mongoose Query:', query);
    
    // Fetch manual tasks
    const manualTasks = await Task.find(query).sort({ createdAt: -1 });

    // Fetch cases and map them to task format
    // Map Case Query: assignedTo instead of assignee
    let caseQuery = {};
    if (req.user.role === 'Admin') {
      if (assignee && assignee !== 'All Users' && assignee !== 'undefined') {
        caseQuery.assignedTo = new RegExp(`^${assignee.trim()}$`, 'i');
      }
    } else {
      caseQuery.assignedTo = req.user.fullName;
    }

    const cases = await Case.find(caseQuery);
    const mappedCases = cases.map(c => {
      // Map status
      let kanbanStatus = 'To Do';
      if (c.currentStatus === 'Closed' || c.currentStatus === 'Settled') kanbanStatus = 'Completed';
      else if (c.currentStatus === 'Action Logged' || c.currentStatus === 'In Progress') kanbanStatus = 'In Progress';

      return {
        _id: c._id,
        title: `Case: ${c.companyName || 'Untitled'}`,
        priority: c.priority || 'Medium',
        assignee: c.assignedTo || c.initiatedBy || 'Unassigned',
        dueDate: c.nextActionDate || '',
        caseId: c.caseId,
        details: c.caseSummary || '',
        status: kanbanStatus,
        isCase: true // To distinguish in UI
      };
    });

    // Combine and return
    res.json([...manualTasks, ...mappedCases]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task
router.post('/', verifyToken, async (req, res) => {
  try {
    const newTask = new Task({
      ...req.body,
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
      { status },
      { new: true }
    );

    // 2. If not found in Task, it might be a Case
    if (!updated) {
      let caseStatus = 'New';
      if (status === 'Completed') caseStatus = 'Closed';
      else if (status === 'In Progress') caseStatus = 'In Progress';
      else if (status === 'To Do') caseStatus = 'New';

      updated = await Case.findByIdAndUpdate(
        req.params.id,
        { currentStatus: caseStatus },
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
