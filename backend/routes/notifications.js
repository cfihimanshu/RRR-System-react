const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Notification = require('../sql_models/Notification');
const Task = require('../sql_models/Task');
const Report = require('../sql_models/Report');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userRole  = req.user.role;
    const fullName = (req.user.fullName || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const today = new Date().toISOString().split('T')[0];
    const systemNotifs = [];

    const isSystemExempt = ['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant', 'Operation Head', 'Operation Review'].includes(userRole);

    let sodExists = false;
    if (!isSystemExempt) {
      const sod = await Report.findOne({
        where: { userEmail, type: 'SOD', date: today },
        attributes: ['id']
      });
      if (sod) sodExists = true;
    } else {
      sodExists = true; // Skip check for admins
    }

    let pendingCount = 0;
    if (userRole === 'Admin') {
      pendingCount = await Task.count({ where: { status: 'To Do' } });
    } else if (fullName) {
      pendingCount = await Task.count({
        where: { 
          assignee: { [Op.like]: `%${fullName}%` },
          status: 'To Do'
        }
      });
    }

    const notificationsRaw = await Notification.findAll({
      where: {
        recipient: { [Op.in]: [userEmail, userRole, 'All'] }
      },
      order: [['createdAt', 'DESC']],
      limit: limit
    });
    
    const notifications = notificationsRaw.map(n => {
      const j = n.toJSON();
      j._id = j.id;
      return j;
    });

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
    } else if (fullName && pendingCount > 0) {
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

    if (!isSystemExempt && !sodExists) {
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

router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { 
        where: { 
          recipient: { [Op.in]: [req.user.email, req.user.role, 'All'] },
          isRead: false
        }
      }
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id).startsWith('sys-')) {
      return res.json({ message: 'System notification acknowledged' });
    }
    
    await Notification.update(
      { isRead: true },
      { where: { id: id } }
    );
    
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
