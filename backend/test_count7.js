const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const cases = await Case.findAll({
    where: { currentStatus: { [Op.in]: ['Closure', 'closure'] } },
    attributes: ['caseId', 'createdAt', 'currentStatus']
  });
  cases.forEach(c => console.log(c.caseId, c.createdAt));
  process.exit(0);
}
run();
