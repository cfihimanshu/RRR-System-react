const cron = require('node-cron');
const { Op } = require('sequelize');
const Action = require('../sql_models/Action');
const User = require('../sql_models/User');
const Case = require('../sql_models/Case');
const { sendEmail } = require('./mailer');
const { createNotification } = require('./notificationHelper');

const runDueCaseAlerts = async () => {
  console.log('Running Case Due Date and action alerts scan...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ==========================================
    // SECTION 1: DAILY ACTION ALERTS
    // ==========================================
    const allActions = await Action.findAll({ 
      where: { 
        nextActionDate: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } 
      } 
    });
    
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
      const admins = await User.findAll({ where: { role: 'Admin' } });
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
    const adminsList = await User.findAll({ where: { role: 'Admin' } });
    const adminEmailsStr = adminsList.map(a => a.email).join(',');

    const activeCases = await Case.findAll({
      where: {
        [Op.or]: [
          { dueDate: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
          { nextActionDate: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } }
        ],
        currentStatus: { [Op.notIn]: ['Settled', 'Closed', 'Closure', 'Resolved'] }
      }
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
        let assignee = null;
        if (caseItem.assignedTo && caseItem.assignedTo.trim() !== '') {
          try {
            assignee = await User.findOne({
              where: { fullName: { [Op.like]: `%${caseItem.assignedTo.trim()}%` } }
            });
          } catch (err) {
            console.error('Error finding assignee user:', err);
          }
        }

        let title = '';
        let message = '';
        let type = 'Warning';
        let emailSubject = '';
        let emailHtml = '';

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

        const recipients = ['Admin'];
        if (assignee && assignee.email) {
          recipients.push(assignee.email);
        }
        try {
          await createNotification(recipients, title, message, type, `/case-master?search=${caseItem.caseId}`);
        } catch (notifErr) {
          console.error('Error creating notifications:', notifErr);
        }
      }
    }

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
};

const sendUserOverdueAlerts = async (user) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const adminsList = await User.findAll({ where: { role: 'Admin' } });
    const adminEmails = adminsList.map(a => a.email);

    let query = {
      currentStatus: { [Op.notIn]: ['Settled', 'Closed', 'Closure', 'Resolved'] }
    };

    const isAdmin = ['Admin', 'Super Admin', 'SuperAdmin'].includes(user.role);
    if (!isAdmin) {
      query.assignedTo = { [Op.like]: `%${user.fullName.trim()}%` };
    }

    const activeCases = await Case.findAll({ where: query });

    const overdueCases = [];
    const dueTodayCases = [];

    for (const caseItem of activeCases) {
      let isOverdue = false;
      let isDue = false;

      if (caseItem.dueDate && caseItem.dueDate.trim() !== '') {
        const dueDateObj = new Date(caseItem.dueDate);
        if (!isNaN(dueDateObj.getTime())) {
          dueDateObj.setHours(0, 0, 0, 0);
          if (dueDateObj < today) {
            isOverdue = true;
          } else if (dueDateObj.getTime() === today.getTime()) {
            isDue = true;
          }
        }
      }

      if (caseItem.nextActionDate && caseItem.nextActionDate.trim() !== '') {
        const actionDateObj = new Date(caseItem.nextActionDate);
        if (!isNaN(actionDateObj.getTime())) {
          actionDateObj.setHours(0, 0, 0, 0);
          if (actionDateObj < today) {
            isOverdue = true;
          } else if (actionDateObj.getTime() === today.getTime()) {
            isDue = true;
          }
        }
      }

      if (isOverdue) {
        overdueCases.push(caseItem);
      } else if (isDue) {
        dueTodayCases.push(caseItem);
      }
    }

    if (overdueCases.length === 0 && dueTodayCases.length === 0) {
      console.log(`No overdue or due cases found for user: ${user.fullName}`);
      return;
    }

    const recipients = [user.email, ...adminEmails];
    const uniqueRecipients = [...new Set(recipients)].join(',');

    const subject = `🚨 RRR System: Overdue & Due Cases Daily Alert for ${user.fullName} (${new Date().toLocaleDateString('en-IN')})`;

    let html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 12px; color: #333; max-width: 650px;">
        <h2 style="color: #ea580c; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; text-transform: uppercase; font-size: 20px;">📅 Case Overdue & Due Alert</h2>
        <p>Hello <strong>${user.fullName}</strong>,</p>
        <p>This is your daily alert for cases that require immediate attention or have actions due today.</p>
    `;

    if (overdueCases.length > 0) {
      html += `
        <h3 style="color: #dc2626; margin-top: 24px; font-size: 16px;">🚨 OVERDUE CASES (${overdueCases.length})</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #fef2f2; border-bottom: 2px solid #fecaca; text-align: left;">
              <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Case ID</th>
              <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #fecaca;">Company</th>
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
            <td style="padding: 10px;">${c.companyName || '—'}</td>
            <td style="padding: 10px; font-weight: bold; color: #dc2626;">${c.dueDate || c.nextActionDate || '—'}</td>
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
              <th style="padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ffedd5;">Company</th>
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
            <td style="padding: 10px;">${c.companyName || '—'}</td>
            <td style="padding: 10px; font-weight: bold; color: #ea580c;">${c.dueDate || c.nextActionDate || '—'}</td>
            <td style="padding: 10px;"><span style="background: #fff7ed; color: #ea580c; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${c.currentStatus}</span></td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }

    html += `
        <p style="margin-top: 30px; font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 15px;">Please log in to the dashboard to review and resolve these cases.</p>
        <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}" style="display: inline-block; background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Go to Dashboard</a></p>
      </div>
    `;

    await sendEmail(uniqueRecipients, subject, '', html);
    console.log(`Overdue alert email successfully sent for user ${user.fullName} to: ${uniqueRecipients}`);
  } catch (err) {
    console.error('Error sending user-specific overdue alerts:', err);
  }
};

const runAssignmentReminders = async () => {
  console.log('Running Assignment Reminders scan...');
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const pendingCases = await Case.findAll({
      where: {
        assignedTo: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        assignedAt: { [Op.ne]: null },
        hasBeenWorkedOn: false,
        [Op.or]: [
          { lastReminderSentAt: null, assignedAt: { [Op.lte]: thirtyMinsAgo } },
          { lastReminderSentAt: { [Op.lte]: thirtyMinsAgo } }
        ],
        currentStatus: { [Op.notIn]: ['Settled', 'Closed', 'Closure', 'Resolved'] }
      }
    });

    for (const caseItem of pendingCases) {
      let assigneeEmail = null;
      let assigneeName = caseItem.assignedTo;

      if (caseItem.assignedTo.includes('@')) {
        assigneeEmail = caseItem.assignedTo;
      } else {
        const user = await User.findOne({
          where: { fullName: { [Op.like]: `%${caseItem.assignedTo.trim()}%` } }
        });
        if (user) {
          assigneeEmail = user.email;
          assigneeName = user.fullName;
        }
      }

      if (assigneeEmail) {
        const subject = `⚠️ URGENT: Action Required on Assigned Case ${caseItem.caseId}`;
        const html = `
          <div style="font-family: sans-serif; padding: 20px; border: 2px solid #dc2626; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #dc2626; margin-top: 0;">Case Pending Action</h2>
            <p>Hello <strong>${assigneeName}</strong>,</p>
            <p>Case <strong>${caseItem.caseId}</strong> (${caseItem.companyName || 'N/A'}) was assigned/forwarded to you, but no work or updates have been logged yet.</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Assigned At:</strong> ${new Date(caseItem.assignedAt).toLocaleString('en-IN')}</p>
              <p style="margin: 5px 0;"><strong>Current Status:</strong> ${caseItem.currentStatus}</p>
            </div>
            <p>Please log in and take immediate action on this case by updating its progress, logging an action, or adding a communication.</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseItem.caseId}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Case</a></p>
          </div>
        `;

        await sendEmail(assigneeEmail, subject, '', html);
        console.log(`Sent assignment reminder to ${assigneeEmail} for case ${caseItem.caseId}`);
        
        await Case.update(
          { lastReminderSentAt: new Date().toISOString() },
          { where: { id: caseItem.id } }
        );
      }
    }
  } catch (err) {
    console.error('Error in assignment reminder scheduler:', err);
  }
};

const initScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily alert scheduler...');
    await runDueCaseAlerts();
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('Running 30-min assignment reminders...');
    await runAssignmentReminders();
  });

  console.log('Scheduler initialized with Daily Alerts and 30-Min Assignment Reminders.');
};

module.exports = { initScheduler, runDueCaseAlerts, sendUserOverdueAlerts, runAssignmentReminders };
