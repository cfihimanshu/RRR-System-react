const { Op } = require('sequelize');
const { sequelize } = require('../../../../RRR-System-react/backend/config/sequelize');
const User = require('../../../../RRR-System-react/backend/sql_models/User');
const Case = require('../../../../RRR-System-react/backend/sql_models/Case');
const Progress = require('../../../../RRR-System-react/backend/sql_models/Progress');
const Refund = require('../../../../RRR-System-react/backend/sql_models/Refund');

const completedStatuses = [
  'Settled', 'settled', 'Settlement', 'settlement',
  'Closure', 'closure', 'Resolution', 'resolution',
  'Resolved', 'resolved', 'Done', 'done',
  'Complete', 'complete', 'Completed', 'completed',
  'Closed', 'closed', 'NA', 'na', 'Na', 'nA',
  'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'
];

const closureStatuses = [
  'Closure', 'closure', 'Resolution', 'resolution',
  'Resolved', 'resolved', 'Done', 'done',
  'Complete', 'complete', 'Completed', 'completed',
  'Closed', 'closed', 'NA', 'na', 'Na', 'nA',
  'NA Non Agreement', 'na non agreement', 'Non Agreement', 'non agreement'
];

const isCompleted = (status) => {
  if (!status) return false;
  return completedStatuses.includes(status.trim());
};

const isClosureStatus = (status) => {
  if (!status) return false;
  return closureStatuses.includes(status.trim());
};

const isSettlementStatus = (status) => {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'settlement' || s === 'settled';
};

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Fetch Meghna cases
    const meghna = await User.findOne({ where: { fullName: { [Op.like]: '%Meghna%' } } });
    if (!meghna) {
      console.log('Meghna not found');
      return;
    }
    console.log(`Found User: ${meghna.fullName} (${meghna.email})`);

    const cases = await Case.findAll({
      where: {
        assignedTo: meghna.fullName,
        isArchived: { [Op.not]: true }
      }
    });

    console.log(`Total non-archived cases assigned to Meghna: ${cases.length}`);

    let reportPending = 0;
    let schedulerPending = 0;

    for (const c of cases) {
      const isCaseResolvedReport = !isSettlementStatus(c.currentStatus) && isClosureStatus(c.currentStatus);
      const isCaseResolvedScheduler = isCompleted(c.currentStatus) || c.refundStatus === 'Paid';

      // reports.js pending logic (with start=null, end=null)
      if (!isCaseResolvedReport) {
        reportPending++;
      }

      // scheduler.js pending logic
      if (!isCaseResolvedScheduler) {
        schedulerPending++;
      }

      console.log(`Case: ${c.caseId}, Status: ${c.currentStatus}, RefundStatus: ${c.refundStatus}, ReportResolved: ${isCaseResolvedReport}, SchedulerResolved: ${isCaseResolvedScheduler}`);
    }

    console.log(`Pending counts -> reports.js: ${reportPending}, scheduler.js: ${schedulerPending}`);

  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

test();
