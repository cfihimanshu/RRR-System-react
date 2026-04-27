const cron = require('node-cron');
const Action = require('../models/Action');
const User = require('../models/User');
const { sendEmail } = require('./mailer');

const initScheduler = () => {
  // Run every morning at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily alert scheduler...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all actions where nextActionDate is today or past
      // Since nextActionDate is a String in your model, we'll need to parse/compare carefully
      // Assuming format is YYYY-MM-DD or similar standard
      const allActions = await Action.find({ nextActionDate: { $exists: true, $ne: '' } });
      
      const overdue = [];
      const dueToday = [];

      allActions.forEach(action => {
        const actionDate = new Date(action.nextActionDate);
        if (isNaN(actionDate.getTime())) return;
        
        actionDate.setHours(0, 0, 0, 0);

        if (actionDate < today) {
          overdue.push(action);
        } else if (actionDate.getTime() === today.getTime()) {
          dueToday.push(action);
        }
      });

      if (overdue.length > 0 || dueToday.length > 0) {
        const admins = await User.find({ role: 'Admin' });
        const adminEmails = admins.map(a => a.email);

        if (adminEmails.length > 0) {
          const subject = `RRR Engine: Daily Action Alerts (${new Date().toLocaleDateString()})`;
          
          let html = `
            <h2>Daily Case Action Alerts</h2>
            <p>Summary for ${new Date().toLocaleDateString()}</p>
          `;

          if (overdue.length > 0) {
            html += `<h3 style="color: red;">🚨 Overdue Actions (${overdue.length})</h3><ul>`;
            overdue.forEach(a => {
              html += `<li><strong>${a.caseId}:</strong> ${a.nextAction} (Due: ${a.nextActionDate})</li>`;
            });
            html += `</ul>`;
          }

          if (dueToday.length > 0) {
            html += `<h3 style="color: orange;">⚠️ Due Today (${dueToday.length})</h3><ul>`;
            dueToday.forEach(a => {
              html += `<li><strong>${a.caseId}:</strong> ${a.nextAction}</li>`;
            });
            html += `</ul>`;
          }

          html += `<br><p>Please log in to the dashboard to take necessary actions.</p>`;

          await sendEmail(adminEmails.join(','), subject, '', html);
          console.log('Daily alerts sent to admins.');
        }
      }
    } catch (err) {
      console.error('Error in alert scheduler:', err);
    }
  });
};

module.exports = { initScheduler };
