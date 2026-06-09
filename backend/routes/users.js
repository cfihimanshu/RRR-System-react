const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/sequelize');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// Get all users (Filtered for Operations in frontend)
router.get('/', verifyToken, roleGuard(['Admin', 'Operations', 'Legal', 'Operation Review', 'Operation Head']), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'email', 'role', 'department']
    });
    res.set('Cache-Control', 'private, max-age=60');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users who missed EOD on any previous day
router.get('/missed-eod', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    // Auto-expire previous days' SOD access grants
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    const usersWithAccess = await User.findAll({ where: { bypassEodCheck: true } });
    for (const u of usersWithAccess) {
      if (u.sodAccessGrantedAt) {
        const grantedIST = new Date(new Date(u.sodAccessGrantedAt).getTime() + (5.5 * 60 * 60 * 1000));
        const grantedDateStr = grantedIST.toISOString().split('T')[0];
        if (grantedDateStr < todayStr) {
          u.bypassEodCheck = false;
          u.sodAccessGrantedAt = "";
          await u.save();
        }
      } else {
        u.bypassEodCheck = false;
        await u.save();
      }
    }

    // Equivalent MySQL query for the complex Mongoose aggregation
    const missedEodQuery = `
      SELECT 
        r.userEmail AS _id,
        MAX(r.userName) AS name,
        JSON_ARRAYAGG(r.date) AS missedDates,
        u.bypassEodCheck,
        u.sodAccessGrantedAt
      FROM (
        SELECT userEmail, userName, date,
          SUM(CASE WHEN type = 'SOD' THEN 1 ELSE 0 END) AS has_sod,
          SUM(CASE WHEN type = 'EOD' THEN 1 ELSE 0 END) AS has_eod
        FROM reports
        WHERE date < :today
        GROUP BY userEmail, userName, date
      ) AS r
      LEFT JOIN users u ON r.userEmail = u.email
      WHERE r.has_sod > 0 AND r.has_eod = 0
      GROUP BY r.userEmail, u.bypassEodCheck, u.sodAccessGrantedAt;
    `;

    const missedEodUsers = await sequelize.query(missedEodQuery, {
      replacements: { today: todayStr },
      type: sequelize.QueryTypes.SELECT
    });

    res.json(missedEodUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant access to fill SOD despite missing EOD
router.post('/:email/grant-sod-access', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { email } = req.params;
    await User.update(
      { 
        bypassEodCheck: true,
        sodAccessGrantedAt: new Date().toISOString()
      },
      { where: { email } }
    );
    res.json({ message: `Access granted to ${email} to fill SOD today.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update monthly target for a user
router.put('/:userId/target', verifyToken, roleGuard(['Admin', 'Super Admin', 'SuperAdmin', 'Operations', 'Operation Head']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthlyTarget } = req.body;
    await User.update({ monthlyTarget }, { where: { id: userId } });
    const user = await User.findByPk(userId);
    res.json({ message: "Monthly target updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
