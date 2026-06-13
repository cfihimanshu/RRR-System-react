const { Op } = require('sequelize');
const Case = require('./sql_models/Case');
async function run() {
  const cases = await Case.findAll({ attributes: ['caseId', 'currentStatus', 'sourceOfComplaint'] });
  let total = 0, odoo = 0, nonOdoo = 0;
  let closed = 0;
  cases.forEach(c => {
    total++;
    const isOdoo = String(c.sourceOfComplaint).toLowerCase().includes('odoo');
    if (isOdoo) odoo++;
    else {
      nonOdoo++;
      if (['Closure', 'closure'].includes(c.currentStatus)) closed++;
    }
  });
  console.log(`Total: ${total}, Odoo: ${odoo}, Non-Odoo: ${nonOdoo}, Closed(Non-Odoo): ${closed}`);
  process.exit(0);
}
run();
