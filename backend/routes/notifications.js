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
    const fullName = (req.user.fullName || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const systemNotifs = [];

    const escName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const assigneeRegex = fullName ? new RegExp(`^\\s*${escName}\\s*$`, 'i') : null;

    const [notifications, sodExists, pendingCount] = await Promise.all([
      Notification.find({
        recipient: { $in: [userEmail, userRole, 'All'] }
      }).sort({ createdAt: -1 }).limit(limit).lean(),
      !['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant', 'Operation Head', 'Operation Review'].includes(userRole)
        ? Report.findOne({ userEmail, type: 'SOD', date: today }).select('_id').lean()
        : Promise.resolve({ _id: 'admin-skip' }),
      userRole === 'Admin'
        ? Task.countDocuments({ status: 'To Do' })
        : (assigneeRegex
          ? Task.countDocuments({ assignee: assigneeRegex, status: 'To Do' })
          : Promise.resolve(0))
    ]);

    if (userRole === 'Admin' && pendingCount > 0) {
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
    } else if (assigneeRegex && pendingCount > 0) {
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

    if (!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant', 'Operation Head', 'Operation Review'].includes(userRole) && !sodExists) {
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

    const merged = [...systemNotifs.reverse(), ...notifications];
    res.set('Cache-Control', 'private, max-age=20');
    res.json(merged);
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
