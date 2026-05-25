const cron = require('node-cron');
const Action = require('../models/Action');
const User = require('../models/User');
const Case = require('../models/Case');
const { sendEmail } = require('./mailer');
const { createNotification } = require('./notificationHelper');

const initScheduler = () => {
  // Run every morning at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily alert scheduler...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ==========================================
      // SECTION 1: DAILY ACTION ALERTS
      // ==========================================
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
          console.log('Daily action alerts sent to admins.');
        }
      }

      // ==========================================
      // SECTION 2: DAILY CASE DUE DATE ALERTS [AUTOMATION]
      // ==========================================
      console.log('Running daily Case Due Date automation scan...');
      const adminsList = await User.find({ role: 'Admin' });
      const adminEmailsStr = adminsList.map(a => a.email).join(',');

      // Find all cases that are active/incomplete and have a due date OR a next action date
      const activeCases = await Case.find({
        $or: [
          { dueDate: { $exists: true, $ne: '' } },
          { nextActionDate: { $exists: true, $ne: '' } }
        ],
        currentStatus: { $nin: ['Settled', 'Closed', 'Closure', 'Resolved'] }
      });

      const overdueCases = [];
      const dueTodayCases = [];

      for (const caseItem of activeCases) {
        let isCaseDue = false;
        let isCaseOverdue = false;
        let isActionDue = false;
        let isActionOverdue = false;

        if (caseItem.dueDate && caseItem.dueDate.trim() !== '') {
          const dueDateObj = new Date(caseItem.dueDate);
          if (!isNaN(dueDateObj.getTime())) {
            dueDateObj.setHours(0, 0, 0, 0);
            if (dueDateObj < today) {
              isCaseOverdue = true;
              overdueCases.push(caseItem);
            } else if (dueDateObj.getTime() === today.getTime()) {
              isCaseDue = true;
              dueTodayCases.push(caseItem);
            }
          }
        }

        if (caseItem.nextActionDate && caseItem.nextActionDate.trim() !== '') {
          const actionDateObj = new Date(caseItem.nextActionDate);
          if (!isNaN(actionDateObj.getTime())) {
            actionDateObj.setHours(0, 0, 0, 0);
            if (actionDateObj < today) {
              isActionOverdue = true;
            } else if (actionDateObj.getTime() === today.getTime()) {
              isActionDue = true;
            }
          }
        }

        const isAnyOverdue = isCaseOverdue || isActionOverdue;
        const isAnyDue = isCaseDue || isActionDue;

        if (isAnyOverdue || isAnyDue) {
          // Find Assignee user in DB to send them an email
          let assignee = null;
          if (caseItem.assignedTo && caseItem.assignedTo.trim() !== '') {
            try {
              assignee = await User.findOne({
                fullName: { $regex: new RegExp(`^\\s*${caseItem.assignedTo.trim()}\\s*$`, 'i') }
              });
            } catch (err) {
              console.error('Error finding assignee user:', err);
            }
          }

          // Build notification message and title
          let title = '';
          let message = '';
          let type = 'Warning';
          let emailSubject = '';
          let emailHtml = '';

          // Determine date description
          let dateDesc = '';
          if (isCaseOverdue) {
            dateDesc = `Due Date (${caseItem.dueDate}) has passed`;
            title = `🚨 Overdue Case Action Required: ${caseItem.caseId}`;
            type = 'Critical';
          } else if (isActionOverdue) {
            dateDesc = `Next Action Date (${caseItem.nextActionDate}) has passed`;
            title = `🚨 Case Action Overdue: ${caseItem.caseId}`;
            type = 'Critical';
          } else if (isCaseDue) {
            dateDesc = `Due Date (${caseItem.dueDate}) is Today`;
            title = `⚠️ Case Due Today: ${caseItem.caseId}`;
          } else if (isActionDue) {
            dateDesc = `Next Action Date (${caseItem.nextActionDate}) is Today`;
            title = `⚠️ Case Action Due Today: ${caseItem.caseId}`;
          }

          message = `Case ${caseItem.caseId} (${caseItem.companyName || 'N/A'}) has pending action: ${dateDesc}. Assigned to: ${caseItem.assignedTo || 'Unassigned'}. Current Status: ${caseItem.currentStatus}.`;

          emailSubject = isAnyOverdue 
            ? `🚨 URGENT: Case ${caseItem.caseId} requires attention (${dateDesc})`
            : `⚠️ REMINDER: Case ${caseItem.caseId} has due action today (${dateDesc})`;

          emailHtml = `
            <div style="font-family: sans-serif; border: 2px solid ${isAnyOverdue ? '#ea580c' : '#f97316'}; border-radius: 10px; padding: 25px; max-width: 600px; color: #333; line-height: 1.6;">
              <h3 style="color: ${isAnyOverdue ? '#ea580c' : '#f97316'}; margin-top: 0; font-size: 18px; text-transform: uppercase;">
                ${isAnyOverdue ? '🚨 Overdue Case Notification' : '⚠️ Case Due Date Reminder'}
              </h3>
              <p>Hello,</p>
              <p>This is an automated system alert that Case <strong>${caseItem.caseId}</strong> requires immediate attention.</p>
              
              <div style="background: #fff7ed; border-left: 4px solid ${isAnyOverdue ? '#ea580c' : '#f97316'}; padding: 18px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
                <strong>Case ID:</strong> ${caseItem.caseId}<br>
                <strong>Client Name:</strong> ${caseItem.clientName || '—'}<br>
                <strong>Company:</strong> ${caseItem.companyName || '—'}<br>
                <strong>Assignee:</strong> ${caseItem.assignedTo || 'Unassigned'}<br>
                <strong>Current Status:</strong> ${caseItem.currentStatus || '—'}<br>
                ${caseItem.dueDate ? `<strong>Due Date:</strong> ${caseItem.dueDate}<br>` : ''}
                ${caseItem.nextActionDate ? `<strong>Next Action Date:</strong> ${caseItem.nextActionDate}<br>` : ''}
                <strong style="color: ${isAnyOverdue ? '#dc2626' : '#d97706'}; text-transform: uppercase;">Alert Reason:</strong> ${dateDesc}
              </div>
              
              <p>Please log in to your dashboard to review and execute the required next steps.</p>
              <div style="margin-top: 25px;">
                <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseItem.caseId}" 
                   style="display: inline-block; background: ${isAnyOverdue ? '#ea580c' : '#f97316'}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  View & Update Case
                </a>
              </div>
            </div>
          `;

          // Notify in-app: Both the Assignee and Admin
          const recipients = ['Admin'];
          if (assignee && assignee.email) {
            recipients.push(assignee.email);
          }
          try {
            await createNotification(recipients, title, message, type, `/case-master?search=${caseItem.caseId}`);
          } catch (notifErr) {
            console.error('Error creating notifications:', notifErr);
          }

          // Notify via email: Both the Assignee and Admin
          const emailRecipientsList = [...adminsList.map(a => a.email)];
          if (assignee && assignee.email) {
            emailRecipientsList.push(assignee.email);
          }
          const uniqueEmailString = [...new Set(emailRecipientsList)].join(',');
          
          if (uniqueEmailString) {
            try {
              await sendEmail(uniqueEmailString, emailSubject, '', emailHtml);
              console.log(`Alert email sent for case ${caseItem.caseId} to: ${uniqueEmailString}`);
            } catch (mailErr) {
              console.error(`Failed to send email alert for case ${caseItem.caseId}:`, mailErr);
            }
          }
        }
      }

      // Send consolidated Case Due Dates summary email to all admins
      if ((overdueCases.length > 0 || dueTodayCases.length > 0) && adminEmailsStr) {
        try {
          const subject = `🚨 RRR System: Case Due Date Summary Alerts (${new Date().toLocaleDateString('en-IN')})`;
          let html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 12px; color: #333; max-width: 650px;">
              <h2 style="color: #ea580c; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; text-transform: uppercase; font-size: 20px;">📅 Case Due Date Automated Report</h2>
              <p>Daily automation scan report for <strong>${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</strong>.</p>
          `;

          if (overdueCases.length > 0) {
            html += `
              <h3 style="color: #dc2626; margin-top: 24px; font-size: 16px;">🚨 OVERDUE CASES (${overdueCases.length})</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #fef2f2; border-bottom: 2px solid #fecaca; text-align: left;">
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Case ID</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Assignee</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Due Date</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Status</th>
                  </tr>
                </thead>
                <tbody>
            `;
            overdueCases.forEach(c => {
              html += `
                <tr style="border-bottom: 1px solid #fee2e2;">
                  <td style="padding: 10px; font-weight: bold; color: #dc2626;">${c.caseId}</td>
                  <td style="padding: 10px;">${c.assignedTo || 'Unassigned'}</td>
                  <td style="padding: 10px; font-weight: bold; color: #dc2626;">${c.dueDate}</td>
                  <td style="padding: 10px;"><span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${c.currentStatus}</span></td>
                </tr>
              `;
            });
            html += `</tbody></table>`;
          }

          if (dueTodayCases.length > 0) {
            html += `
              <h3 style="color: #ea580c; margin-top: 24px; font-size: 16px;">⚠️ CASES DUE TODAY (${dueTodayCases.length})</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #fff7ed; border-bottom: 2px solid #ffedd5; text-align: left;">
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ffedd5;">Case ID</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ffedd5;">Assignee</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ffedd5;">Due Date</th>
                    <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ffedd5;">Status</th>
                  </tr>
                </thead>
                <tbody>
            `;
            dueTodayCases.forEach(c => {
              html += `
                <tr style="border-bottom: 1px solid #ffedd5;">
                  <td style="padding: 10px; font-weight: bold; color: #ea580c;">${c.caseId}</td>
                  <td style="padding: 10px;">${c.assignedTo || 'Unassigned'}</td>
                  <td style="padding: 10px; font-weight: bold; color: #ea580c;">${c.dueDate}</td>
                  <td style="padding: 10px;"><span style="background: #fff7ed; color: #ea580c; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${c.currentStatus}</span></td>
                </tr>
              `;
            });
            html += `</tbody></table>`;
          }

          html += `
              <p style="margin-top: 30px; font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 15px;">Please log in to the dashboard to review case details.</p>
              <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}" style="display: inline-block; background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to Dashboard</a></p>
            </div>
          `;

          await sendEmail(adminEmailsStr, subject, '', html);
          console.log('Daily case due date summary alerts sent to admins.');
        } catch (adminErr) {
          console.error('Error sending case due date summary email to admins:', adminErr);
        }
      }

    } catch (err) {
      console.error('Error in alert scheduler:', err);
    }
  });
};

module.exports = { initScheduler };
