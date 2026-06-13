const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 7);
  const cases = await Case.findAll({
    where: { createdAt: { [Op.gte]: d } },
    attributes: ['caseId', 'currentStatus']
  });
  const map = {};
  cases.forEach(c => {
    map[c.currentStatus] = (map[c.currentStatus] || 0) + 1;
  });
  console.log(map);
  console.log("Total:", cases.length);
  process.exit(0);
}
run();
