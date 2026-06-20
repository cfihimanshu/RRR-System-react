const express = require('express');
const { Op } = require('sequelize');
const Timeline = require('../sql_models/Timeline');
const Case = require('../sql_models/Case');
const User = require('../sql_models/User');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Define association on the fly if not already defined globally
if (!Timeline.associations.case_match) {
  Timeline.belongsTo(Case, { foreignKey: 'caseId', targetKey: 'caseId', as: 'case_match' });
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { caseId, date, type, sourceFilter, userEmail: queryEmail, feed } = req.query;
    const isFeed = feed === 'true' || feed === '1';
    
    let whereClause = {};

    if (caseId) {
      whereClause.caseId = caseId;
      const targetCase = await Case.findOne({ where: { caseId }, attributes: ['createdAt', 'createdDate'] });
      if (targetCase) {
        const cutoffDate = targetCase.createdAt || targetCase.createdDate;
        if (cutoffDate) {
          const cutoff = new Date(cutoffDate);
          cutoff.setMinutes(cutoff.getMinutes() - 5);
          whereClause.createdAt = { [Op.gte]: cutoff };
        }
      }
    }
    if (sourceFilter) whereClause.source = sourceFilter;
    if (type) {
      if (type === 'Communication') {
        whereClause.eventType = { [Op.in]: ['Call', 'Email', 'Whatsapp', 'Meeting', 'Communication'] };
      } else {
        whereClause.eventType = type;
      }
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause[Op.or] = [
        { eventDate: { [Op.like]: `%${date}%` } },
        { createdAt: { [Op.between]: [startOfDay, endOfDay] } }
      ];
    }

    const isAdminOrReviewerOrAccountant = ['Admin', 'Reviewer', 'Accountant'].includes(req.user.role);
    let includeClause = [];
    
    if (!isFeed) {
      includeClause.push({
        model: Case,
        as: 'case_match',
        required: false,
        attributes: ['caseId', 'companyName', 'clientName', 'assignedTo', 'initiatedBy']
      });
    }

    if (!isAdminOrReviewerOrAccountant) {
      const dbUser = await User.findByPk(req.user.id, { attributes: ['fullName', 'email'] });
      const myIds = [...new Set([req.user.fullName, req.user.email, dbUser?.fullName, dbUser?.email])].filter(Boolean);

      if (isFeed) {
        whereClause.source = { [Op.in]: myIds };
      } else {
        const userOrCondition = [
          { source: { [Op.in]: myIds } },
          { '$case_match.assignedTo$': { [Op.in]: myIds } },
          { '$case_match.initiatedBy$': { [Op.in]: myIds } }
        ];
        
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            { [Op.or]: userOrCondition }
          ];
          delete whereClause[Op.or];
        } else {
          whereClause[Op.or] = userOrCondition;
        }
      }
    } else if (queryEmail || req.query.userName) {
      const targetUser = queryEmail ? await User.findOne({ where: { email: queryEmail.trim() } }) : null;
      
      const userIds = [...new Set([
        queryEmail, 
        req.query.userName,
        targetUser?.fullName, 
        targetUser?.email
      ])].filter(Boolean);

      let orConditions = [{ source: { [Op.in]: userIds } }];
      if (queryEmail) {
        orConditions.push({ source: { [Op.like]: `%${queryEmail.split('@')[0]}%` } });
      }

      if (whereClause[Op.or]) {
        whereClause[Op.and] = [
          { [Op.or]: whereClause[Op.or] },
          { [Op.or]: orConditions }
        ];
        delete whereClause[Op.or];
      } else {
        whereClause[Op.or] = orConditions;
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limitNum = Math.min(parseInt(req.query.limit) || (isFeed ? 30 : 100), 200);
    const skipNum = (page - 1) * limitNum;

    const docs = await Timeline.findAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      offset: skipNum,
      limit: limitNum
    });

    const formattedDocs = docs.map(doc => {
      const data = doc.toJSON();
      if (!isFeed) {
        data.caseInfo = data.case_match;
        delete data.case_match;
      } else {
        delete data.details;
        delete data.metadata;
        delete data.case_match;
      }
      return data;
    });

    res.set('Cache-Control', 'private, max-age=30');
    res.json(formattedDocs);
  } catch (error) {
    console.error('Timeline Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
