const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const Report = require('../models/Report');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// ─────────────────────────────────────────
// GET / — Notifications for logged-in user
// ─────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userRole  = req.user.role;

    // Use req.user directly if available, otherwise find in DB once
    const fullName = req.user.fullName || '';

    // 1. Fetch persisted DB notifications for this user
    let notifications = await Notification.find({
      recipient: { $in: [userEmail, userRole, 'All'] }
    }).sort({ createdAt: -1 }).limit(50).lean();

    // 2. Inject dynamic system notifications at the top
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date();
    const systemNotifs = [];

    // ── Task Reminders ──
    if (fullName) {
      const reminders = await Task.find({
        assignee: { $regex: new RegExp(fullName, 'i') },
        status: { $nin: ['Completed', 'Done'] },
        reminderDateTime: { $exists: true, $ne: '' }
      }, 'title reminderDateTime').lean();

      for (const t of reminders) {
        const remDate = new Date(t.reminderDateTime);
        if (!isNaN(remDate) && remDate <= now && (now - remDate) < 86400000) {
          systemNotifs.push({
            _id: `sys-rem-${t._id}`,
            title: '⏰ Task Reminder',
            message: `Reminder due for: "${t.title}"`,
            type: 'Reminder',
            createdAt: t.reminderDateTime,
            isRead: false,
            isSystem: true,
            link: '/my-task'
          });
        }
      }
    }

    // ── Pending Tasks Count ──
    let pendingCount = 0;
    if (userRole === 'Admin') {
      pendingCount = await Task.countDocuments({ status: 'To Do' });
      if (pendingCount > 0) {
        systemNotifs.push({
          _id: 'sys-pending-tasks',
          title: '📋 System: Pending Tasks',
          message: `There are ${pendingCount} total pending tasks across all users.`,
          type: 'Task',
          createdAt: new Date(),
          isRead: false,
          isSystem: true,
          link: '/my-task'
        });
      }
    } else if (fullName) {
      pendingCount = await Task.countDocuments({
        assignee: { $regex: new RegExp(fullName, 'i') },
        status: 'To Do'
      });
      if (pendingCount > 0) {
        systemNotifs.push({
          _id: 'sys-pending-tasks',
          title: '📋 Tasks Pending',
          message: `You have ${pendingCount} pending task${pendingCount > 1 ? 's' : ''} in your To-Do list.`,
          type: 'Task',
          createdAt: new Date(),
          isRead: false,
          isSystem: true,
          link: '/my-task'
        });
      }
    }

    // ── SOD Pending (non-Admin only) ──
    if (userRole !== 'Admin') {
      const sodExists = await Report.findOne({ userEmail, type: 'SOD', date: today }).lean();
      if (!sodExists) {
        systemNotifs.push({
          _id: 'sys-sod-pending',
          title: '🌅 SOD Pending',
          message: "You haven't submitted your Start-of-Day report yet. Please fill it to begin tracking.",
          type: 'Alert',
          createdAt: new Date(),
          isRead: false,
          isSystem: true,
          link: '/?openSod=true'
        });
      }
    }

    // Push system notifications to the front (most urgent last unshift = first shown)
    notifications = [...systemNotifs.reverse(), ...notifications];

    res.json(notifications);
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────
// PUT /read-all — Mark all DB notifications as read
// IMPORTANT: must come before /:id/read to avoid Express matching 'read-all' as an ID
// ─────────────────────────────────────────
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: { $in: [req.user.email, req.user.role, 'All'] }, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────
// PUT /:id/read — Mark a single DB notification as read
// System notifications (isSystem: true) have string IDs — skip DB update for those
// ─────────────────────────────────────────
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    // System notifications have prefixed string IDs — safe to ignore
    if (id.startsWith('sys-')) {
      return res.json({ message: 'System notification acknowledged' });
    }
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
