const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const isClosedArr = ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved', 'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed'];
  const c = await Case.count({ where: { currentStatus: { [Op.in]: isClosedArr } }});
  const cases = await Case.findAll({ where: { currentStatus: { [Op.in]: isClosedArr } }});
  console.log("Total closed:", c);
  cases.forEach(x => console.log(x.caseId, x.currentStatus, x.isArchived));
  process.exit(0);
}
run();
