const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const isClosed = ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed'];
  const cases = await Case.findAll({
    where: { currentStatus: { [Op.in]: isClosed } },
    attributes: ['caseId', 'currentStatus', 'isArchived', 'sourceOfComplaint']
  });
  console.log("Total isClosed:", cases.length);
  cases.forEach(c => console.log(c.caseId, c.currentStatus, c.isArchived, c.sourceOfComplaint));
  process.exit(0);
}
run();
