const cron = require('node-cron');
const { Op } = require('sequelize');
const Action = require('../sql_models/Action');
const User = require('../sql_models/User');
const Case = require('../sql_models/Case');
const Report = require('../sql_models/Report');
const Task = require('../sql_models/Task');
const Timeline = require('../sql_models/Timeline');
const Progress = require('../sql_models/Progress');
const Refund = require('../sql_models/Refund');
const MisReport = require('../sql_models/MisReport');
const { sequelize } = require('../config/sequelize');
const { sendEmail } = require('./mailer');
const { createNotification } = require('./notificationHelper');
const XLSX = require('xlsx');

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

const sendDailyReportsToAdmins = async () => {
  console.log('Generating daily 8:00 PM email reports...');
  try {
    const nowForIST = new Date();
    const istTime = new Date(nowForIST.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = istTime.toISOString().split('T')[0];

    // Find all admins
    const admins = await User.findAll({
      where: {
        role: ['Admin', 'Super Admin', 'SuperAdmin']
      }
    });
    const adminEmailsList = admins.map(u => u.email).filter(Boolean);
    const adminEmails = adminEmailsList.length > 0 ? adminEmailsList.join(', ') : 'cfi.astha@gmail.com';

    // ==========================================
    // Part 1: Generate Escalation MIS Report
    // ==========================================
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const startOfPeriod = startOfToday; // To send per day's report

    const caseQuery = {
      isArchived: { [Op.not]: true }
    };

    const allCases = await Case.findAll({ where: caseQuery });
    const allUsers = await User.findAll({ attributes: ['id', 'fullName', 'email', 'role', 'monthlyTarget'] });
    const allProgress = await Progress.findAll();
    const allRefunds = await Refund.findAll();

    const progressMap = {};
    allProgress.forEach(p => {
      progressMap[p.caseId] = p;
    });

    const refundsMap = {};
    allRefunds.forEach(r => {
      refundsMap[r.caseId] = r;
    });

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

    const assigneeStatsMap = {};
    allUsers.forEach(u => {
      const key = u.fullName.trim().toLowerCase();
      assigneeStatsMap[key] = {
        name: u.fullName.trim(),
        email: u.email,
        role: u.role,
        target: u.monthlyTarget || 0,
        saved: 0,
        totalCases: 0,
        totalAmt: 0,
        pendingCases: 0,
        pendingAmt: 0,
        resolvedCases: 0,
        resolvedAmt: 0
      };
    });

    allCases.forEach(c => {
      const assigneeName = c.assignedTo;
      if (!assigneeName) return;

      const key = assigneeName.trim().toLowerCase();
      let stats = assigneeStatsMap[key];
      if (!stats) {
        const foundKey = Object.keys(assigneeStatsMap).find(k =>
          assigneeStatsMap[k].email?.trim().toLowerCase() === key
        );
        if (foundKey) {
          stats = assigneeStatsMap[foundKey];
        }
      }
      if (!stats) return;

      // Exclude Odoo complaints from non-"Operation Review" specialists
      const roleLower = (stats.role || '').toLowerCase().trim();
      const isOdooCase = c.sourceOfComplaint && c.sourceOfComplaint.toLowerCase().includes('odoo');
      if (roleLower !== 'operation review' && isOdooCase) {
        return;
      }

      const amt = c.totalAmtPaid || 0;
      let saved = 0;
      const ref = refundsMap[c.caseId];
      if (ref && c.refundStatus === 'Paid') {
        if (ref.savedAmount !== null && ref.savedAmount !== undefined) {
          saved = Number(ref.savedAmount);
        } else {
          saved = Math.max(0, (c.totalAmtPaid || 0) - (c.refundedAmount || 0));
        }
      } else {
        saved = 0;
      }
      const isCaseResolved = isCompleted(c.currentStatus) || c.refundStatus === 'Paid';
      const isCaseClosure = isCaseResolved;

      // Determine precise resolution date using Refund and Progress updates
      let resolvedDate = null;

      // 1. Try to get resolution date from Refund paymentDate if refundStatus is Paid
      if (c.refundStatus === 'Paid') {
        const ref = refundsMap[c.caseId];
        if (ref) {
          let reqs = ref.requests;
          if (typeof reqs === 'string') {
            try { reqs = JSON.parse(reqs); } catch (e) { }
          }
          const requestsList = Array.isArray(reqs) && reqs.length > 0 ? reqs : [ref];
          let refundPaidDate = null;
          requestsList.forEach(r => {
            if (r.status && r.status.toLowerCase() === 'paid' && r.paymentDate) {
              const pDate = new Date(r.paymentDate);
              if (!isNaN(pDate.getTime())) {
                if (!refundPaidDate || pDate > refundPaidDate) {
                  refundPaidDate = pDate;
                }
              }
            }
          });
          resolvedDate = refundPaidDate;
        }
      }

      // 2. Try to get resolution date from Progress updates if not already set
      if (!resolvedDate) {
        const progress = progressMap[c.caseId];
        if (progress) {
          let rawUpdates = progress.updates;
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch (e) { }
          }
          if (typeof rawUpdates === 'string') {
            try { rawUpdates = JSON.parse(rawUpdates); } catch (e) { }
          }
          const updates = Array.isArray(rawUpdates) ? rawUpdates : [];
          const resolutionUpdate = updates.find(u => u.stage && isCompleted(u.stage));
          if (resolutionUpdate && resolutionUpdate.createdAt) {
            resolvedDate = new Date(resolutionUpdate.createdAt);
          }
        }
      }

      // 3. Fall back to createdAt rather than updatedAt to prevent shifting resolution dates on edits
      if (!resolvedDate) {
        resolvedDate = c.createdAt ? new Date(c.createdAt) : (c.updatedAt ? new Date(c.updatedAt) : null);
      }

      // Check if it got resolved within the period (between startOfPeriod and endOfToday)
      const isResolvedInPeriod = isCaseResolved && (!startOfPeriod || resolvedDate >= startOfPeriod) && (!endOfToday || resolvedDate <= endOfToday);

      // Check assignment date to see if case existed for the user in this period (up to endOfToday)
      const assignedDate = c.assignedAt ? new Date(c.assignedAt) : (c.createdAt ? new Date(c.createdAt) : (c.createdDate ? new Date(c.createdDate) : null));
      if (endOfToday && assignedDate && assignedDate > endOfToday && !isResolvedInPeriod) {
        return; // Skip case: was assigned/created after endOfToday
      }

      stats.totalCases++;
      stats.totalAmt += amt;

      if (isResolvedInPeriod) {
        if (isCaseClosure) {
          stats.resolvedCases++;
        }
        stats.resolvedAmt += saved;
        stats.saved += saved;
      } else {
        // If not resolved, or resolved after endOfToday, it counts as pending during this period
        // But if it was resolved BEFORE the start of the period, it should NOT count as pending!
        const isResolvedBeforeStart = isCaseResolved && startOfPeriod && resolvedDate && resolvedDate < startOfPeriod;
        if (!isResolvedBeforeStart) {
          stats.pendingCases++;
          stats.pendingAmt += amt;
        }
      }
    });

    const performanceList = Object.values(assigneeStatsMap).filter(stats => {
      const roleLower = (stats.role || '').toLowerCase().trim();
      const isExcluded = ['admin', 'super admin', 'superadmin', 'operation head', 'accountant'].includes(roleLower);
      if (isExcluded) return false;
      const isSpecialist = ['operations', 'staff', 'operation admin', 'operation review', 'reviewer'].includes(roleLower);
      return stats.totalCases > 0 || isSpecialist;
    });

    const misRows = [
      ['All Specialists Performance Overview (Today)'],
      [],
      ['Specialist', 'Role', 'Total Cases', 'Total Amount', 'Pending Cases', 'Pending Amount', 'Resolved Cases', 'Amount Saved', 'Monthly Target']
    ];

    let sumTotalCases = 0;
    let sumTotalAmt = 0;
    let sumPendingCases = 0;
    let sumPendingAmt = 0;
    let sumResolvedCases = 0;
    let sumResolvedAmt = 0;
    let sumTarget = 0;

    performanceList.forEach(spec => {
      sumTotalCases += (spec.totalCases || 0);
      sumTotalAmt += (spec.totalAmt || 0);
      sumPendingCases += (spec.pendingCases || 0);
      sumPendingAmt += (spec.pendingAmt || 0);
      sumResolvedCases += (spec.resolvedCases || 0);
      sumResolvedAmt += (spec.saved || 0);
      sumTarget += (spec.target || 0);

      misRows.push([
        spec.name,
        spec.role || '—',
        spec.totalCases || 0,
        spec.totalAmt || 0,
        spec.pendingCases || 0,
        spec.pendingAmt || 0,
        spec.resolvedCases || 0,
        spec.saved || 0,
        spec.target || 0
      ]);
    });

    // Add Total Row
    misRows.push([
      'Total',
      '',
      sumTotalCases,
      sumTotalAmt,
      sumPendingCases,
      sumPendingAmt,
      sumResolvedCases,
      sumResolvedAmt,
      sumTarget
    ]);

    const misWorkbook = XLSX.utils.book_new();
    const misWorksheet = XLSX.utils.aoa_to_sheet(misRows);
    misWorksheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(misWorkbook, misWorksheet, 'Performance Overview');
    const misBuffer = XLSX.write(misWorkbook, { type: 'buffer', bookType: 'xlsx' });

    // ==========================================
    // Part 2: Generate Work Report Excel
    // ==========================================
    let targetDateStr = todayStr;
    let reportsRaw = await Report.findAll({
      where: { date: targetDateStr }
    });

    const groups = {};
    reportsRaw.forEach(r => {
      const key = `${r.date || 'unknown'}_${r.userEmail || r.userName || 'unknown'}`;
      if (!groups[key]) {
        groups[key] = {
          date: r.date,
          userEmail: r.userEmail,
          userName: r.userName,
          sod: null,
          eod: null,
          reports: []
        };
      }
      groups[key].reports.push(r);
      let parsedData = {};
      try {
        parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      } catch (e) {
        parsedData = {};
      }
      if (r.type === 'SOD') groups[key].sod = { ...r.toJSON(), ...parsedData };
      if (r.type === 'EOD') groups[key].eod = { ...r.toJSON(), ...parsedData };
    });

    const formatDuration = (startTime, endTime) => {
      if (!startTime || !endTime) return '';
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (!match) return null;
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3].toLowerCase();
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        const d = new Date();
        d.setHours(hour, minute, 0, 0);
        return d;
      };
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      if (!start || !end) return '';
      let diff = (end - start) / 1000 / 60;
      if (diff < 0) diff += 24 * 60;
      const hours = Math.floor(diff / 60);
      const minutes = Math.round(diff % 60);
      return `${hours}h ${minutes}m`;
    };

    const aggregatedReports = Object.values(groups).map(group => {
      const hasSod = !!group.sod;
      const hasEod = !!group.eod;
      const type = hasSod && hasEod ? 'SOD+EOD' : hasSod ? 'SOD' : 'EOD';
      const checkInTime = group.sod?.checkInTime || group.eod?.checkInTime || '';
      const checkOutTime = group.eod?.checkOutTime || group.sod?.checkOutTime || '';
      const duration = group.eod?.workDuration || formatDuration(checkInTime, checkOutTime);
      return {
        ...group,
        type,
        checkInTime,
        checkOutTime,
        duration,
        plannedTasks: group.sod?.plannedTasks || '',
        workSummary: group.eod?.workSummary || group.sod?.plannedTasks || '',
        progressScore: group.eod?.progressScore || null,
        moodEnergy: group.eod?.moodEnergy || '',
        completionStatus: hasSod && hasEod ? 'Fully Completed' : 'Incomplete'
      };
    });

    const timelinesToday = await Timeline.findAll({
      where: {
        eventDate: { [Op.like]: `${targetDateStr}%` }
      }
    });

    const startOfTargetDate = new Date(`${targetDateStr}T00:00:00`);
    const endOfTargetDate = new Date(`${targetDateStr}T23:59:59.999`);
    const tasksToday = await Task.findAll({
      where: {
        updatedAt: { [Op.between]: [startOfTargetDate, endOfTargetDate] }
      }
    });

    const detailedRows = [];
    for (const r of aggregatedReports) {
      const userComms = timelinesToday.filter(a =>
        (a.source === r.userName || a.source === r.userEmail) &&
        ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting', 'Communication'].includes(a.eventType)
      );

      const userDocs = timelinesToday.filter(a =>
        (a.source === r.userName || a.source === r.userEmail) &&
        ['Document Upload', 'Document Uploaded', 'Document Indexed'].includes(a.eventType)
      );

      const userProgress = timelinesToday.filter(a =>
        (a.source === r.userName || a.source === r.userEmail) &&
        ['Progress Update', 'Status Update', 'Progress Updated'].includes(a.eventType)
      );

      const userTasks = tasksToday.filter(t =>
        t.assignee && (t.assignee.trim().toLowerCase() === (allUsers.find(u => u.email === r.userEmail)?.fullName || r.userName).toLowerCase())
      );

      const commsList = userComms
        .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
        .join('\n');

      const docsList = userDocs
        .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
        .join('\n');

      const progressList = userProgress
        .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
        .join('\n');

      const tasksList = userTasks
        .map(t => `• ${t.taskId || 'N/A'}: ${t.title} [${t.status}]`)
        .join('\n');

      const totalCount = userComms.length + userDocs.length + userProgress.length + userTasks.length;

      detailedRows.push([
        r.date || '',
        r.type || '',
        r.userName || '',
        r.checkInTime || '',
        r.checkOutTime || '',
        r.duration || '',
        r.plannedTasks || '',
        r.workSummary || '',
        r.completionStatus || '',
        r.progressScore || '',
        r.moodEnergy || '',
        commsList,
        docsList,
        progressList,
        tasksList,
        totalCount
      ]);
    }

    const workHeaders = [
      'Date', 'Type', 'Submitted By', 'Check-In', 'Check-Out', 'Duration',
      'Planned Tasks', 'Work Summary', 'Completion', 'Progress Score', 'Mood',
      'Communication Details (ID: Summary)', 'Document Details (ID: Summary)',
      'Progress Updates (ID: Summary)', 'Task Details (ID: Title [Status])', 'Total Activity Count'
    ];

    const workRows = [workHeaders, ...detailedRows];
    const workWorkbook = XLSX.utils.book_new();
    const workWorksheet = XLSX.utils.aoa_to_sheet(workRows);

    // Set column widths
    const workColWidths = workHeaders.map((h, i) => {
      let maxLen = h.length;
      detailedRows.forEach(row => {
        const val = String(row[i] || '');
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    workWorksheet['!cols'] = workColWidths;

    XLSX.utils.book_append_sheet(workWorkbook, workWorksheet, 'Detailed Work Report');
    const workBuffer = XLSX.write(workWorkbook, { type: 'buffer', bookType: 'xlsx' });

    // ==========================================
    // Part 3: Send Email
    // ==========================================
    const subject = `📅 RRR System: Daily Reports Summary - ${targetDateStr}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 12px; padding: 25px;">
        <h2 style="color: #0b72b8; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0;">Daily Reports Summary</h2>
        <p>Hello Admin,</p>
        <p>Please find attached the daily reports for <strong>${targetDateStr}</strong>:</p>
        <ol>
          <li><strong>Escalation MIS Report</strong> (All Specialists Performance Overview)</li>
          <li><strong>Work Report</strong> (Detailed Work Report with SOD/EOD details)</li>
        </ol>
        <p>These reports are automatically compiled and sent every day at 8:00 PM.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated notification from the RRR System. Please do not reply directly to this email.</p>
      </div>
    `;

    const attachments = [
      {
        filename: `Escalation_MIS_Report_${targetDateStr}.xlsx`,
        content: misBuffer
      },
      {
        filename: `Detailed_Work_Report_${targetDateStr}.xlsx`,
        content: workBuffer
      }
    ];

    await sendEmail(adminEmails, subject, '', htmlContent, attachments);
    console.log(`Daily 8:00 PM email reports successfully sent to: ${adminEmails}`);

  } catch (error) {
    console.error('Error generating or sending daily 8:00 PM reports:', error);
  }
};

const initScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily alert scheduler...');
    await runDueCaseAlerts();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('Running 30-min assignment reminders...');
    await runAssignmentReminders();
  });

  // Daily 8:00 PM report mailer
  cron.schedule('0 20 * * *', async () => {
    await sendDailyReportsToAdmins();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('Scheduler initialized with Daily Alerts, 30-Min Assignment Reminders, and Daily 8:00 PM Reports (IST Timezone).');
};

module.exports = { initScheduler, runDueCaseAlerts, sendUserOverdueAlerts, runAssignmentReminders, sendDailyReportsToAdmins };
