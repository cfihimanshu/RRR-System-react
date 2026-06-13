const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const c = await Case.count({ where: { currentStatus: { [Op.in]: ['Closure', 'closure'] } }});
  const c2 = await Case.count({ where: { currentStatus: { [Op.in]: ['Closure', 'closure'] }, isArchived: true }});
  const c3 = await Case.count({ where: { currentStatus: { [Op.in]: ['Closure', 'closure'] }, isArchived: false }});
  const c4 = await Case.count({ where: { currentStatus: { [Op.in]: ['Closure', 'closure'] }, isArchived: null }});
  console.log("Total closure:", c);
  console.log("Archived closure:", c2);
  console.log("Not archived closure:", c3);
  console.log("Null archived closure:", c4);
  process.exit(0);
}
run();
