const express = require('express');
const { Op } = require('sequelize');
const Communication = require('../sql_models/Communication');
const Timeline = require('../sql_models/Timeline');
const Case = require('../sql_models/Case');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = req.query.caseId ? { caseId: req.query.caseId } : {};
    
    if (req.user.role !== 'Admin' && !req.query.caseId) {
      const myIds = [req.user.fullName, req.user.email].filter(Boolean);
      query.loggedBy = { [Op.in]: myIds };
    }

    const docs = await Communication.findAll({
      where: query,
      order: [['dateTime', 'DESC']]
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const existingCount = await Communication.count({ where: { caseId: req.body.caseId } });
    const commId = `COM-${req.body.mode || 'NA'}-${req.body.caseId}-${String(existingCount + 1).padStart(3, '0')}`;
    
    const doc = await Communication.create({ ...req.body, commId });
    
    await Timeline.create({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      caseId: doc.caseId,
      eventDate: doc.dateTime,
      source: req.user.fullName || req.user.email || 'System',
      eventType: doc.mode,
      summary: doc.summary,
      details: `${doc.mode} ${doc.direction} with ${doc.fromTo}. Summary: ${doc.summary}`,
      metadata: {
        direction: doc.direction,
        fromTo: doc.fromTo,
        exactDemand: doc.exactDemand,
        legalThreat: doc.legalThreat,
        smMentioned: doc.smMentioned
      }
    });

    await Case.update({ hasBeenWorkedOn: true }, { where: { caseId: doc.caseId } });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { id } = req.params;
    const oldComm = await Communication.findByPk(id);
    if (!oldComm) {
      return res.status(404).json({ error: 'Communication log not found' });
    }

    await oldComm.update(req.body);
    const updatedComm = oldComm;

    try {
      const timelineEvent = await Timeline.findOne({
        where: {
          caseId: oldComm.caseId,
          eventType: oldComm.mode,
          summary: oldComm.summary
        }
      });
      
      if (timelineEvent) {
        await timelineEvent.update({
          eventType: updatedComm.mode,
          summary: updatedComm.summary,
          eventDate: updatedComm.dateTime,
          details: `${updatedComm.mode} ${updatedComm.direction} with ${updatedComm.fromTo || 'Client'}. Summary: ${updatedComm.summary}`,
          metadata: {
            ...(timelineEvent.metadata || {}),
            direction: updatedComm.direction,
            fromTo: updatedComm.fromTo,
            exactDemand: updatedComm.exactDemand,
            legalThreat: updatedComm.legalThreat,
            smMentioned: updatedComm.smMentioned
          }
        });
      }
    } catch (timelineErr) {
      console.error('Failed to sync timeline on communication update:', timelineErr);
    }

    res.json(updatedComm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
