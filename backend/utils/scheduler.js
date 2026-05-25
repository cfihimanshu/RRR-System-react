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

      // Find all cases that are active/incomplete and have a due date
      const activeCases = await Case.find({
        dueDate: { $exists: true, $ne: '' },
        currentStatus: { $nin: ['Settled', 'Closed', 'Closure', 'Resolved'] }
      });

      const overdueCases = [];
      const dueTodayCases = [];

      for (const caseItem of activeCases) {
        const dueDateObj = new Date(caseItem.dueDate);
        if (isNaN(dueDateObj.getTime())) continue;

        dueDateObj.setHours(0, 0, 0, 0);

        if (dueDateObj < today) {
          overdueCases.push(caseItem);
          
          // Notify Assignee
          if (caseItem.assignedTo && caseItem.assignedTo.trim() !== '') {
            try {
              const assignee = await User.findOne({
                fullName: { $regex: new RegExp(`^\\s*${caseItem.assignedTo.trim()}\\s*$`, 'i') }
              });
              if (assignee && assignee.email) {
                // 1. In-app notification for Assignee
                await createNotification(
                  assignee.email, 
                  `🚨 Overdue Case Action Required: ${caseItem.caseId}`, 
                  `Your assigned case ${caseItem.caseId} (${caseItem.companyName}) is overdue (Due Date: ${caseItem.dueDate}). Current Status: ${caseItem.currentStatus}. Please resolve immediately.`, 
                  'Critical', 
                  `/case-master?search=${caseItem.caseId}`
                );

                // 2. Email notification for Assignee
                const subject = `🚨 URGENT ACTION REQUIRED: Case ${caseItem.caseId} is Overdue!`;
                const html = `
                  <div style="font-family: sans-serif; border: 2px solid #ea580c; border-radius: 10px; padding: 20px; max-width: 600px; color: #333;">
                    <h3 style="color: #ea580c; margin-top: 0; font-size: 18px; text-transform: uppercase;">🚨 Overdue Case Notification</h3>
                    <p>Hello <strong>${assignee.fullName}</strong>,</p>
                    <p>This is an automated alert that your assigned case is currently <strong>overdue</strong> and has not been marked resolved/closed.</p>
                    <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.5;">
                      <strong>Case ID:</strong> ${caseItem.caseId}<br>
                      <strong>Client:</strong> ${caseItem.clientName || '—'}<br>
                      <strong>Company:</strong> ${caseItem.companyName || '—'}<br>
                      <strong>Current Status:</strong> ${caseItem.currentStatus}<br>
                      <strong>Due Date:</strong> <span style="color: #ea580c; font-weight: 900;">${caseItem.dueDate}</span>
                    </div>
                    <p>Please log in to update the case progress as soon as possible.</p>
                    <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseItem.caseId}" style="display: inline-block; background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Update Case on Dashboard</a></p>
                  </div>
                `;
                await sendEmail(assignee.email, subject, '', html);
              }
            } catch (err) {
              console.error(`Error notifying assignee for case ${caseItem.caseId}:`, err);
            }
          }

          // In-app notification for Admin
          await createNotification(
            'Admin', 
            `🚨 Case Overdue: ${caseItem.caseId}`, 
            `Case ${caseItem.caseId} (${caseItem.companyName}) assigned to ${caseItem.assignedTo || 'Unassigned'} was due on ${caseItem.dueDate} but remains unresolved (${caseItem.currentStatus}).`, 
            'Critical', 
            `/case-master?search=${caseItem.caseId}`
          );
        } else if (dueDateObj.getTime() === today.getTime()) {
          dueTodayCases.push(caseItem);

          // Notify Assignee
          if (caseItem.assignedTo && caseItem.assignedTo.trim() !== '') {
            try {
              const assignee = await User.findOne({
                fullName: { $regex: new RegExp(`^\\s*${caseItem.assignedTo.trim()}\\s*$`, 'i') }
              });
              if (assignee && assignee.email) {
                // 1. In-app notification for Assignee
                await createNotification(
                  assignee.email, 
                  `⚠️ Case Due Today: ${caseItem.caseId}`, 
                  `Your assigned case ${caseItem.caseId} (${caseItem.companyName}) is due today! Current Status: ${caseItem.currentStatus}.`, 
                  'Warning', 
                  `/case-master?search=${caseItem.caseId}`
                );

                // 2. Email notification for Assignee
                const subject = `⚠️ ATTENTION REQUIRED: Case ${caseItem.caseId} is Due Today!`;
                const html = `
                  <div style="font-family: sans-serif; border: 2px solid #f97316; border-radius: 10px; padding: 20px; max-width: 600px; color: #333;">
                    <h3 style="color: #f97316; margin-top: 0; font-size: 18px; text-transform: uppercase;">⚠️ Case Due TodayReminders</h3>
                    <p>Hello <strong>${assignee.fullName}</strong>,</p>
                    <p>This is an automated reminder that your assigned case is <strong>due today</strong>.</p>
                    <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.5;">
                      <strong>Case ID:</strong> ${caseItem.caseId}<br>
                      <strong>Client:</strong> ${caseItem.clientName || '—'}<br>
                      <strong>Company:</strong> ${caseItem.companyName || '—'}<br>
                      <strong>Current Status:</strong> ${caseItem.currentStatus}<br>
                      <strong>Due Date:</strong> <span style="color: #f97316; font-weight: 900;">${caseItem.dueDate}</span>
                    </div>
                    <p>Please ensure that all required next steps are executed.</p>
                    <p><a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}/case-master?search=${caseItem.caseId}" style="display: inline-block; background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">View on Dashboard</a></p>
                  </div>
                `;
                await sendEmail(assignee.email, subject, '', html);
              }
            } catch (err) {
              console.error(`Error notifying assignee for case ${caseItem.caseId}:`, err);
            }
          }

          // In-app notification for Admin
          await createNotification(
            'Admin', 
            `⚠️ Case Due Today: ${caseItem.caseId}`, 
            `Case ${caseItem.caseId} assigned to ${caseItem.assignedTo || 'Unassigned'} is due today. Current Status: ${caseItem.currentStatus}.`, 
            'Warning', 
            `/case-master?search=${caseItem.caseId}`
          );
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
