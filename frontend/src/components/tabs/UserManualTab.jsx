import React, { useState, useEffect } from 'react';

const steps = [
  {
    badge: '<i class="ti ti-home" style="font-size:18px"></i>',
    title: "Welcome to the RRR System",
    subtitle: "Your complete guide — 11 steps total",
    body: `
      <p class="section-label">What is RRR?</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:16px">The RRR System is a web-based case management platform. It helps teams track client cases, log communications, manage tasks, generate agreements, and handle approvals — all in one place.</p>
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-cell-label">Primary use</div><div class="stat-cell-val">Case tracking</div></div>
        <div class="stat-cell"><div class="stat-cell-label">Access via</div><div class="stat-cell-val">Web browser</div></div>
        <div class="stat-cell"><div class="stat-cell-label">Login method</div><div class="stat-cell-val">Email + password</div></div>
        <div class="stat-cell"><div class="stat-cell-label">Daily workflow</div><div class="stat-cell-val">SOD → Work → EOD</div></div>
      </div>
      <div class="tip"><i class="ti ti-info-circle"></i> Use the <strong>Next / Previous</strong> buttons to move through topics, or tap any dot to jump to a specific section.</div>
    `
  },
  {
    badge: "1",
    title: "Logging in",
    subtitle: "How to access your dashboard",
    body: `
      <div class="mock-screen">
        <div class="mock-topbar"><i class="ti ti-lock"></i><span class="mock-url-text">rrrsystem.com / login</span></div>
        <div class="mock-field"><i class="ti ti-mail"></i> Enter your corporate email address</div>
        <div class="mock-field"><i class="ti ti-lock"></i> Enter your password <i class="ti ti-eye eye"></i></div>
        <div class="mock-btn">Sign In</div>
        <div class="mock-link"><i class="ti ti-lock-open" style="font-size:13px;vertical-align:-2px"></i> Forgot Password?</div>
      </div>
      <div class="info-card">
        <p class="section-label">Steps to log in</p>
        <div class="steps-list">
          <div class="step-row"><div class="step-circle">1</div><div class="step-row-text">Open the RRR System URL in your web browser</div></div>
          <div class="step-row"><div class="step-circle">2</div><div class="step-row-text">Type your registered corporate email address</div></div>
          <div class="step-row"><div class="step-circle">3</div><div class="step-row-text">Type your password — click the eye icon to reveal it if needed</div></div>
          <div class="step-row"><div class="step-circle">4</div><div class="step-row-text">Click <strong>Sign In</strong><div class="step-row-note">Alternatively, use "Sign In with Google"</div></div></div>
        </div>
      </div>
      <div class="tip"><i class="ti ti-check"></i> On success, you'll be taken directly to your Dashboard.</div>
    `
  },
  {
    badge: "2",
    title: "Forgot your password?",
    subtitle: "Reset it in 4 easy steps",
    body: `
      <div class="info-card">
        <p class="section-label">Password recovery flow</p>
        <div class="steps-list">
          <div class="step-row"><div class="step-circle">1</div><div class="step-row-text">On the login page, click <strong>Forgot Password?</strong> link</div></div>
          <div class="step-row"><div class="step-circle">2</div><div class="step-row-text">Enter your registered email and click <strong>Send Code</strong></div></div>
          <div class="step-row"><div class="step-circle">3</div><div class="step-row-text">Check your inbox for a <strong>6-digit code</strong> (valid for 10 minutes)</div></div>
          <div class="step-row"><div class="step-circle">4</div><div class="step-row-text">Enter the code, type your new password twice, then click <strong>Reset Password</strong></div></div>
        </div>
      </div>
      <div class="warn"><i class="ti ti-clock"></i> <strong>Code expires in 10 minutes.</strong> If you don't see the email, check your Spam/Junk folder or click "Resend Code".</div>
      <div class="tip"><i class="ti ti-check"></i> You'll see "Password reset successfully! You can now login." — then log in as normal.</div>
    `
  },
  {
    badge: "3",
    title: "Start of Day (SOD)",
    subtitle: "Required every morning before you can work",
    body: `
      <div class="warn"><i class="ti ti-alert-triangle"></i> <strong>The SOD form locks your screen immediately after login.</strong> You cannot use any feature until it's completed and submitted.</div>
      <div class="info-card">
        <p class="section-label">What you need to complete SOD</p>
        <ul class="checklist">
          <li><i class="ti ti-map-pin"></i><div><strong>Allow GPS location:</strong> When your browser asks for location access, click Allow. This verifies you're at your work location.</div></li>
          <li><i class="ti ti-camera"></i><div><strong>Take a selfie:</strong> Click "Activate Camera" and capture your photo. This confirms your attendance for the day.</div></li>
          <li><i class="ti ti-list-check"></i><div><strong>Plan your tasks:</strong> Add the tasks you plan to complete today. These will automatically appear on your My Tasks page.</div></li>
          <li><i class="ti ti-send"></i><div><strong>Submit:</strong> Click Submit — the full system unlocks and you can start working.</div></li>
        </ul>
      </div>
      <div class="tip"><i class="ti ti-info-circle"></i> GPS showing "Satellite Lock Failed"? Click "Retry GPS Lock". Make sure your browser has location permission enabled in your device settings.</div>
    `
  },
  {
    badge: "4",
    title: "Your dashboard",
    subtitle: "The home screen — your command centre",
    body: `
      <div class="sidebar-layout">
        <div class="sidebar-panel">
          <div class="sidebar-item active"><i class="ti ti-layout-dashboard"></i> Dashboard</div>
          <div class="sidebar-item"><i class="ti ti-chart-bar"></i> MIS Report</div>
          <div class="sidebar-item"><i class="ti ti-circle-plus"></i> New Case</div>
          <div class="sidebar-item"><i class="ti ti-files"></i> My Cases</div>
          <div class="sidebar-item"><i class="ti ti-database"></i> Records</div>
          <div class="sidebar-item"><i class="ti ti-file-text"></i> Agreements</div>
          <div class="sidebar-item"><i class="ti ti-checkbox"></i> My Tasks</div>
          <div class="sidebar-item"><i class="ti ti-report"></i> Work Report</div>
          <div class="sidebar-item"><i class="ti ti-checkup-list"></i> Approvals</div>
        </div>
        <div class="dashboard-preview">
          <div class="stat-grid" style="margin-bottom:8px">
            <div class="stat-cell"><div class="stat-cell-label">Total cases</div><div class="stat-cell-val">64</div></div>
            <div class="stat-cell"><div class="stat-cell-label">Active</div><div class="stat-cell-val" style="color:#1D9E75">63</div></div>
            <div class="stat-cell"><div class="stat-cell-label">High risk</div><div class="stat-cell-val" style="color:#dc2626">0</div></div>
            <div class="stat-cell"><div class="stat-cell-label">Critical</div><div class="stat-cell-val" style="color:#dc2626">0</div></div>
          </div>
          <p style="font-size:11px;color:#9ca3af;text-align:center">Click any card → opens filtered cases</p>
        </div>
      </div>
      <div class="info-card">
        <p class="section-label">Key features</p>
        <ul class="checklist">
          <li><i class="ti ti-cursor-text"></i> Every counter card is clickable — it opens My Cases with that filter pre-applied</li>
          <li><i class="ti ti-bell"></i> Bell icon (top right) = notifications for tasks, alerts, and updates</li>
          <li><i class="ti ti-logout"></i> Logout in the header bar, or Sign Out at the bottom of the sidebar — both do the same thing</li>
        </ul>
      </div>
    `
  },
  {
    badge: "5",
    title: "Managing your cases",
    subtitle: "The My Cases page — your main workspace",
    body: `
      <div class="tab-row" id="case-tabs">
        <div class="tab active" onclick="switchTab(this,'cbody','ct-list')">Case list</div>
        <div class="tab" onclick="switchTab(this,'cbody','ct-detail')">Case details (5 tabs)</div>
        <div class="tab" onclick="switchTab(this,'cbody','ct-progress')">Progress update</div>
      </div>
      <div id="cbody">
        <div id="ct-list">
          <div class="info-card">
            <ul class="checklist">
              <li><i class="ti ti-search"></i> Search by Case ID, client name, or status using the search bar</li>
              <li><i class="ti ti-filter"></i> Use Filters to narrow results by status, date range, or assignee</li>
              <li><i class="ti ti-columns"></i> Columns button — show/hide table columns. Your preference is saved automatically</li>
              <li><i class="ti ti-circle-plus"></i> Click <strong>New Case</strong> (top right) to register a new case</li>
              <li><i class="ti ti-cursor-text"></i> Click any row to open the full case detail view</li>
            </ul>
          </div>
        </div>
        <div id="ct-detail" style="display:none">
          <div class="info-card">
            <p class="section-label">5 tabs inside every case record</p>
            <div class="steps-list">
              <div class="step-row"><div class="step-circle">1</div><div class="step-row-text"><strong>Case Details</strong> — company info, client profile, financial data, case summary</div></div>
              <div class="step-row"><div class="step-circle">2</div><div class="step-row-text"><strong>Communications</strong> — log calls, emails, and meetings with date, time, and notes</div></div>
              <div class="step-row"><div class="step-circle">3</div><div class="step-row-text"><strong>Documents</strong> — upload and index all related files and legal docs</div></div>
              <div class="step-row"><div class="step-circle">4</div><div class="step-row-text"><strong>Progress Update</strong> — advance the case stage (cannot go backwards)</div></div>
              <div class="step-row"><div class="step-circle">5</div><div class="step-row-text"><strong>History</strong> — full audit log of who did what and when</div></div>
            </div>
          </div>
        </div>
        <div id="ct-progress" style="display:none">
          <div class="info-card">
            <ul class="checklist">
              <li><i class="ti ti-arrow-up-right"></i> Select the current stage from the dropdown to advance the case</li>
              <li><i class="ti ti-user-share"></i> Optionally forward the case to another specialist</li>
              <li><i class="ti ti-lock"></i> Once a stage is submitted, <strong>you cannot go back</strong></li>
              <li><i class="ti ti-circle-x"></i> When closing a case, you must fill: Refunded Amount, Saved Amount, and Mark Compliance As Due</li>
            </ul>
          </div>
          <div class="warn"><i class="ti ti-alert-triangle"></i> Stage changes are permanent. Double-check everything before submitting a progress update.</div>
        </div>
      </div>
    `
  },
  {
    badge: "6",
    title: "Creating a new case",
    subtitle: "A guided wizard form — 4 stages",
    body: `
      <div class="wf-row">
        <div class="wf-item"><div class="wf-circle teal"><i class="ti ti-building"></i></div><div class="wf-label">Company info</div><div class="wf-sub">Stage 1</div></div>
        <div class="wf-item"><div class="wf-circle blue"><i class="ti ti-settings"></i></div><div class="wf-label">Services</div><div class="wf-sub">Stage 2</div></div>
        <div class="wf-item"><div class="wf-circle purple"><i class="ti ti-user"></i></div><div class="wf-label">Client info</div><div class="wf-sub">Stage 3</div></div>
        <div class="wf-item"><div class="wf-circle amber"><i class="ti ti-users"></i></div><div class="wf-label">Team assign</div><div class="wf-sub">Stage 4</div></div>
      </div>
      <div class="info-card">
        <p class="section-label">Each stage explained</p>
        <div class="steps-list">
          <div class="step-row"><div class="step-circle">1</div><div class="step-row-text"><strong>Company &amp; Case info</strong> — company name, complaint type, brand, priority, source of complaint</div></div>
          <div class="step-row"><div class="step-circle">2</div><div class="step-row-text"><strong>Services configuration</strong> — service type, amount, engagement notes</div></div>
          <div class="step-row"><div class="step-circle">3</div><div class="step-row-text"><strong>Client information</strong> — contact details, demographic info, case summary (all mandatory)</div></div>
          <div class="step-row"><div class="step-circle">4</div><div class="step-row-text"><strong>Team assignment</strong> — assign the case to the right specialist or manager</div></div>
        </div>
      </div>
      <div class="warn"><i class="ti ti-building"></i> <strong>Unique company rule:</strong> If the company name already exists you'll see "Company name already exist" — you must enter a unique name to proceed.</div>
      <div class="tip"><i class="ti ti-info-circle"></i> Based on the complaint type selected, additional fields appear automatically (Acknowledgment Number, FIR Number, or Grievance Number).</div>
    `
  },
  {
    badge: "7",
    title: "Tasks &amp; work report",
    subtitle: "Staying organised day to day",
    body: `
      <div class="tab-row" id="task-tabs">
        <div class="tab active" onclick="switchTab(this,'tbody','tt-tasks')">My Tasks (Kanban)</div>
        <div class="tab" onclick="switchTab(this,'tbody','tt-report')">Work Report</div>
      </div>
      <div id="tbody">
        <div id="tt-tasks">
          <div class="kanban">
            <div class="kanban-col todo"><i class="ti ti-circle" style="font-size:13px;margin-right:4px"></i>To Do</div>
            <div class="kanban-col inprogress"><i class="ti ti-progress" style="font-size:13px;margin-right:4px"></i>In Progress</div>
            <div class="kanban-col done"><i class="ti ti-circle-check" style="font-size:13px;margin-right:4px"></i>Completed</div>
          </div>
          <div class="info-card">
            <ul class="checklist">
              <li><i class="ti ti-drag-drop"></i> Drag and drop task cards between columns to update their status</li>
              <li><i class="ti ti-circle-plus"></i> Click <strong>New Task</strong> to create a standalone or case-linked task</li>
              <li><i class="ti ti-edit"></i> Click any task card to open details — add progress notes and set reminders</li>
              <li><i class="ti ti-download"></i> Click <strong>Export Excel</strong> to download all tasks as a spreadsheet (.xlsx)</li>
            </ul>
          </div>
        </div>
        <div id="tt-report" style="display:none">
          <div class="info-card">
            <p class="section-label">Your daily activity log</p>
            <ul class="checklist">
              <li><i class="ti ti-calendar"></i> Each row = one working day with check-in time, check-out time, and total hours</li>
              <li><i class="ti ti-chevron-down"></i> Click a row to expand it — see GPS location, selfie proof, and a full activity breakdown</li>
              <li><i class="ti ti-chart-bar"></i> Counters per day: C (Communications), D (Documents), P (Progress updates), T (Tasks)</li>
              <li><i class="ti ti-filter"></i> Filter by date or by SOD/EOD type. Admins can also filter by team member.</li>
            </ul>
          </div>
        </div>
      </div>
    `
  },
  {
    badge: "8",
    title: "Agreements &amp; records",
    subtitle: "Generating PDFs and searching company data",
    body: `
      <div class="tab-row" id="rec-tabs">
        <div class="tab active" onclick="switchTab(this,'rbody','rt-agree')">Agreement generation</div>
        <div class="tab" onclick="switchTab(this,'rbody','rt-rec')">Records / Data search</div>
      </div>
      <div id="rbody">
        <div id="rt-agree">
          <div class="info-card">
            <p class="section-label">To create a settlement agreement PDF</p>
            <div class="steps-list">
              <div class="step-row"><div class="step-circle">1</div><div class="step-row-text">Fill in agreement date, party names, client address, and settlement amount (numeric + words)</div></div>
              <div class="step-row"><div class="step-circle">2</div><div class="step-row-text">Add first party and second party signatories</div></div>
              <div class="step-row"><div class="step-circle">3</div><div class="step-row-text">Optionally click <strong>Add Installment</strong> to split payment — set amount + due date for each</div></div>
              <div class="step-row"><div class="step-circle">4</div><div class="step-row-text">Click <strong>Generate</strong> to preview the PDF, then <strong>Download</strong> to save it to your device</div></div>
            </div>
          </div>
          <div class="tip"><i class="ti ti-history"></i> All your past agreements appear in the "My Generated Agreements" log at the bottom of the page.</div>
        </div>
        <div id="rt-rec" style="display:none">
          <div class="info-card">
            <p class="section-label">Records page — 3 options</p>
            <div class="steps-list">
              <div class="step-row"><div class="step-circle"><i class="ti ti-database" style="font-size:13px"></i></div><div class="step-row-text"><strong>Data Search</strong> — search internal archived company records by name, contact, BDE, or email. Results update in real time.</div></div>
              <div class="step-row"><div class="step-circle"><i class="ti ti-external-link" style="font-size:13px"></i></div><div class="step-row-text"><strong>Odoo</strong> — opens the Odoo ERP portal in a new browser tab</div></div>
              <div class="step-row"><div class="step-circle"><i class="ti ti-file-text" style="font-size:13px"></i></div><div class="step-row-text"><strong>MOU</strong> — currently disabled, reserved for future integration</div></div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    badge: "9",
    title: "Approvals",
    subtitle: "Travel, settlements, and leave requests",
    body: `
      <div class="tab-row" id="app-tabs">
        <div class="tab active" onclick="switchTab(this,'abody','at-tour')">Tour (travel)</div>
        <div class="tab" onclick="switchTab(this,'abody','at-settle')">Settlement (refunds)</div>
        <div class="tab" onclick="switchTab(this,'abody','at-leave')">Leave</div>
      </div>
      <div id="abody">
        <div id="at-tour">
          <div class="info-card">
            <ul class="checklist">
              <li><i class="ti ti-plane"></i> Submit travel requests <strong>at least 3 working days</strong> before departure</li>
              <li><i class="ti ti-calculator"></i> Distance and fare auto-calculated for Owned Vehicle, Cab/Taxi, and Bus (₹10/km). Flight and Train fares are entered manually.</li>
              <li><i class="ti ti-receipt"></i> After the trip, submit a <strong>Reimbursement Claim</strong> linked to your approved travel request ID</li>
              <li><i class="ti ti-book"></i> Check the <strong>Travel Policy</strong> tab for official limits on class, meals, hotel, and miscellaneous expenses</li>
            </ul>
          </div>
        </div>
        <div id="at-settle" style="display:none">
          <div class="info-card">
            <p class="section-label">Refund request workflow</p>
            <div class="steps-list">
              <div class="step-row"><div class="step-circle">1</div><div class="step-row-text">Select a Case ID, enter refund amount, choose payment method (Bank / UPI / Card / QR), upload supporting document, and submit</div></div>
              <div class="step-row"><div class="step-circle">2</div><div class="step-row-text">Status → <span class="pill amber">Pending admin</span> — admin reviews and approves or rejects</div></div>
              <div class="step-row"><div class="step-circle">3</div><div class="step-row-text">If approved → <span class="pill blue">Pending payment</span> — forwarded to the accountant</div></div>
              <div class="step-row"><div class="step-circle">4</div><div class="step-row-text">Accountant records UTR, uploads proof → <span class="pill green">Paid</span></div></div>
            </div>
          </div>
          <div class="tip"><i class="ti ti-info-circle"></i> If rejected, you'll receive an email with the reason. Edit your request and resubmit to reset the status to Pending Review.</div>
        </div>
        <div id="at-leave" style="display:none">
          <div class="info-card">
            <ul class="checklist">
              <li><i class="ti ti-calendar-event"></i> Submit leave with type (Casual / Sick / Paid / Other), dates, and reason</li>
              <li><i class="ti ti-clock"></i> New requests start as <span class="pill amber">Pending review</span> until admin acts</li>
              <li><i class="ti ti-calendar"></i> Attendance calendar is colour-coded: <span class="pill green">Present</span> <span class="pill red">Absent</span> <span class="pill blue">Leave / Off Day</span></li>
              <li><i class="ti ti-download"></i> Export monthly attendance as Excel via the "Export Excel" button on the calendar</li>
            </ul>
          </div>
        </div>
      </div>
    `
  },
  {
    badge: "10",
    title: "End of Day (EOD)",
    subtitle: "Required every evening — never skip it",
    body: `
      <div class="warn"><i class="ti ti-alert-triangle"></i> <strong>Critical rule:</strong> If you skip EOD today, you will be blocked from submitting SOD tomorrow and cannot work on the system until it's resolved.</div>
      <div class="info-card">
        <p class="section-label">How to complete EOD</p>
        <div class="steps-list">
          <div class="step-row"><div class="step-circle">1</div><div class="step-row-text">Click the <strong>EOD</strong> button at the bottom of the dashboard sidebar</div></div>
          <div class="step-row"><div class="step-circle">2</div><div class="step-row-text">Allow GPS and capture your end-of-day selfie</div></div>
          <div class="step-row"><div class="step-circle">3</div><div class="step-row-text">Add a brief work summary of what you accomplished today</div></div>
          <div class="step-row"><div class="step-circle">4</div><div class="step-row-text">Click Submit — your check-out time is recorded</div></div>
        </div>
      </div>
      <div class="tip"><i class="ti ti-check"></i> After EOD, your Work Report for today will show check-in, check-out, total hours, and the full activity breakdown.</div>
    `
  },
  {
    badge: '<i class="ti ti-check" style="font-size:18px"></i>',
    title: "You're all set!",
    subtitle: "Quick reference summary",
    body: `
      <div class="highlight-box">
        <h3><i class="ti ti-sun" style="font-size:15px;vertical-align:-2px;margin-right:6px"></i>Your daily routine</h3>
        <ul class="checklist">
          <li><i class="ti ti-sun"></i><div><strong>Morning:</strong> Log in → Complete SOD (GPS + selfie + plan tasks) → Dashboard unlocks</div></li>
          <li><i class="ti ti-briefcase"></i><div><strong>During the day:</strong> Work on My Cases, log communications, upload documents, update progress, manage tasks</div></li>
          <li><i class="ti ti-moon"></i><div><strong>Evening:</strong> Submit EOD (GPS + selfie + work summary) — never skip this!</div></li>
        </ul>
      </div>
      <div class="info-card">
        <p class="section-label">Key rules to remember</p>
        <ul class="checklist">
          <li><i class="ti ti-alert-triangle warn-icon"></i> Progress updates on cases are permanent — cannot be undone</li>
          <li><i class="ti ti-alert-triangle warn-icon"></i> Company names in new cases must be unique across the system</li>
          <li><i class="ti ti-alert-triangle warn-icon"></i> Travel requests must be submitted 3+ working days before departure</li>
          <li><i class="ti ti-circle-check" style="color:#1D9E75"></i> All your daily activity is tracked in Work Report for full transparency</li>
          <li><i class="ti ti-circle-check" style="color:#1D9E75"></i> You can export tasks and attendance data as Excel files anytime</li>
        </ul>
      </div>
      <div class="tip"><i class="ti ti-rocket"></i> Use the Previous button or the dots below to revisit any section whenever you need a quick refresher.</div>
    `
  }
];

export default function UserManualTab() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Inject Tabler Icons dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css';
    document.head.appendChild(link);

    // Inject global switchTab helper for interactive manual links
    window.switchTab = (el, containerId, activeId) => {
      if (!el || !el.parentElement) return;
      el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      const container = document.getElementById(containerId);
      if (container) {
        container.querySelectorAll(':scope > div').forEach(d => d.style.display = 'none');
        const activeDiv = document.getElementById(activeId);
        if (activeDiv) activeDiv.style.display = 'block';
      }
    };

    return () => {
      document.head.removeChild(link);
      delete window.switchTab;
    };
  }, []);

  const changeStep = (dir) => {
    const nextStep = current + dir;
    if (nextStep >= 0 && nextStep < steps.length) {
      setCurrent(nextStep);
    }
  };

  const activeStep = steps[current];
  const pct = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div className="w-full min-h-screen bg-[#f5f7fa] py-8 px-4 flex justify-center items-start overflow-y-auto">
      <style>{`
        .guide-wrap {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }

        .guide-header {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e4e8ef;
          padding: 24px 28px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .logo-badge {
          width: 48px; height: 48px; border-radius: 12px;
          background: #1D9E75; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .logo-badge i { color: #fff; font-size: 24px; }
        .guide-header h1 { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 2px; }
        .guide-header p  { font-size: 13px; color: #6b7280; }

        .progress-wrap { margin-bottom: 20px; }
        .progress-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .progress-label { font-size: 13px; color: #6b7280; }
        .progress-pct   { font-size: 13px; font-weight: 600; color: #1D9E75; }
        .progress-bar   { height: 6px; background: #e4e8ef; border-radius: 99px; overflow: hidden; }
        .progress-fill  { height: 100%; background: #1D9E75; border-radius: 99px; transition: width 0.4s ease; }

        .step-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e4e8ef;
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }

        .step-top {
          background: #f8fafc;
          border-bottom: 1px solid #e4e8ef;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .step-num {
          width: 40px; height: 40px; border-radius: 50%;
          background: #1D9E75; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; flex-shrink: 0;
        }

        .step-num.done { background: #EAF3DE; color: #3B6D11; }
        .step-top h2   { font-size: 17px; font-weight: 600; color: #1a1a2e; margin-bottom: 2px; }
        .step-top p    { font-size: 13px; color: #6b7280; }
        .step-body     { padding: 24px; }

        .tab-row { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        
        .tab {
          padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid #e4e8ef;
          background: #f8fafc; color: #6b7280; transition: all 0.15s;
        }

        .tab:hover  { background: #f0fdf4; color: #1D9E75; border-color: #a7f3d0; }
        .tab.active { background: #e1f5ee; color: #085041; border-color: #5DCAA5; }

        .info-card {
          background: #f8fafc; border: 1px solid #e4e8ef;
          border-radius: 12px; padding: 16px 18px; margin-bottom: 14px;
        }

        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 12px;
        }

        .tip  { background: #f0fdf4; border-left: 3px solid #1D9E75; border-radius: 0 10px 10px 0; padding: 12px 16px; margin-bottom: 14px; font-size: 13px; color: #085041; line-height: 1.6; }
        .warn { background: #fffbeb; border-left: 3px solid #d97706; border-radius: 0 10px 10px 0; padding: 12px 16px; margin-bottom: 14px; font-size: 13px; color: #92400e; line-height: 1.6; }
        .tip i, .warn i { margin-right: 6px; vertical-align: -2px; font-size: 15px; }

        .checklist { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .checklist li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #374151; line-height: 1.6; }
        .checklist li i { color: #1D9E75; font-size: 17px; margin-top: 1px; flex-shrink: 0; }
        .checklist li i.warn-icon { color: #d97706; }

        .steps-list { display: flex; flex-direction: column; gap: 0; }
        
        .step-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid #f1f5f9; }
        .step-row:last-child { border-bottom: none; }
        
        .step-circle {
          width: 26px; height: 26px; border-radius: 50%; background: #e1f5ee;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #085041; flex-shrink: 0; margin-top: 1px;
        }

        .step-row-text { font-size: 14px; color: #374151; line-height: 1.6; flex: 1; }
        .step-row-note { font-size: 12px; color: #9ca3af; margin-top: 2px; }

        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .stat-cell { background: #f8fafc; border: 1px solid #e4e8ef; border-radius: 10px; padding: 12px 14px; }
        .stat-cell-label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
        .stat-cell-val   { font-size: 16px; font-weight: 600; color: #1a1a2e; }

        .mock-screen {
          background: #f8fafc; border: 1px solid #e4e8ef; border-radius: 12px;
          padding: 14px; margin-bottom: 14px;
        }

        .mock-topbar {
          background: #fff; border: 1px solid #e4e8ef; border-radius: 8px;
          padding: 8px 12px; display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px;
        }

        .mock-topbar i  { color: #9ca3af; font-size: 14px; }
        .mock-url-text  { font-size: 12px; color: #9ca3af; }
        
        .mock-field {
          background: #fff; border: 1px solid #e4e8ef; border-radius: 8px;
          padding: 9px 12px; margin-bottom: 8px; display: flex; align-items: center;
          gap: 8px; font-size: 13px; color: #9ca3af;
        }

        .mock-field i { font-size: 15px; color: #d1d5db; }
        .mock-field .eye { margin-left: auto; }
        
        .mock-btn {
          background: #1D9E75; color: #fff; border-radius: 8px;
          padding: 10px; text-align: center; font-size: 13px; font-weight: 600; margin-bottom: 10px;
        }

        .mock-link { text-align: center; font-size: 13px; color: #185FA5; cursor: pointer; }

        .sidebar-layout { display: flex; gap: 10px; margin-bottom: 14px; }
        
        .sidebar-panel {
          width: 120px; background: #f8fafc; border: 1px solid #e4e8ef;
          border-radius: 12px; padding: 10px; flex-shrink: 0;
        }

        .sidebar-item {
          display: flex; align-items: center; gap: 7px; padding: 7px 8px;
          border-radius: 7px; font-size: 12px; color: #6b7280; margin-bottom: 2px;
        }

        .sidebar-item.active { background: #fff; color: #1a1a2e; font-weight: 600; border: 1px solid #e4e8ef; }
        .sidebar-item i { font-size: 14px; }
        
        .dashboard-preview {
          flex: 1; background: #f8fafc; border: 1px solid #e4e8ef; border-radius: 12px; padding: 12px;
        }

        .kanban { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .kanban-col { border-radius: 10px; padding: 10px; text-align: center; font-size: 13px; font-weight: 600; }
        .kanban-col.todo       { background: #f8fafc; color: #6b7280; border: 1px solid #e4e8ef; }
        .kanban-col.inprogress { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .kanban-col.done       { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

        .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .pill.green  { background: #f0fdf4; color: #166534; }
        .pill.amber  { background: #fffbeb; color: #92400e; }
        .pill.red    { background: #fef2f2; color: #991b1b; }
        .pill.blue   { background: #eff6ff; color: #1e40af; }

        .nav-row { display: flex; justify-content: space-between; align-items: center; }
        
        .nav-btn {
          display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px;
          border: 1px solid #e4e8ef; border-radius: 10px; background: #fff;
          color: #374151; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s;
        }

        .nav-btn:hover    { background: #f8fafc; border-color: #d1d5db; }
        .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .nav-btn.primary  { background: #1D9E75; color: #fff; border-color: #1D9E75; }
        .nav-btn.primary:hover { background: #0F6E56; border-color: #0F6E56; }

        .dots { display: flex; gap: 7px; align-items: center; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #e4e8ef; cursor: pointer; transition: background 0.2s; }
        .dot.active { background: #1D9E75; }

        .wf-row { display: flex; gap: 0; margin-bottom: 14px; flex-wrap: wrap; }
        .wf-item { flex: 1; min-width: 100px; text-align: center; position: relative; }
        .wf-item:not(:last-child)::after {
          content: ''; position: absolute; top: 19px; right: -1px;
          width: 2px; height: 2px; background: #9ca3af;
        }
        .wf-circle {
          width: 38px; height: 38px; border-radius: 50%; margin: 0 auto 6px;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .wf-circle.teal   { background: #e1f5ee; color: #085041; }
        .wf-circle.blue   { background: #eff6ff; color: #1e40af; }
        .wf-circle.purple { background: #f5f3ff; color: #5b21b6; }
        .wf-circle.amber  { background: #fffbeb; color: #92400e; }
        .wf-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 2px; }
        .wf-sub   { font-size: 11px; color: #9ca3af; }

        .divider { height: 1px; background: #f1f5f9; margin: 14px 0; }

        .highlight-box {
          background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
          padding: 16px 18px; margin-bottom: 14px;
        }
        .highlight-box h3 { font-size: 14px; font-weight: 600; color: #166534; margin-bottom: 10px; }

        a { color: #185FA5; }
      `}</style>

      <div className="guide-wrap">
        <div className="guide-header">
          <div className="logo-badge"><i className="ti ti-layout-dashboard"></i></div>
          <div>
            <h1>RRR System — User Guide</h1>
            <p>Step-by-step walkthrough for first-time and everyday users</p>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-top">
            <span className="progress-label">Step {current + 1} of {steps.length}</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }}></div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-top">
            <div 
              className={`step-num ${current === steps.length - 1 ? 'done' : ''}`}
              dangerouslySetInnerHTML={{ __html: activeStep.badge }}
            />
            <div>
              <h2>{activeStep.title}</h2>
              <p>{activeStep.subtitle}</p>
            </div>
          </div>
          <div 
            className="step-body" 
            dangerouslySetInnerHTML={{ __html: activeStep.body }}
          />
        </div>

        <div className="nav-row">
          <button 
            className="nav-btn" 
            onClick={() => changeStep(-1)} 
            disabled={current === 0}
          >
            <i className="ti ti-arrow-left"></i> Previous
          </button>
          
          <div className="dots">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`dot ${i === current ? 'active' : ''}`}
                onClick={() => setCurrent(i)}
                title={`Step ${i + 1}`}
              />
            ))}
          </div>

          <button 
            className="nav-btn primary" 
            onClick={() => changeStep(1)} 
            disabled={current === steps.length - 1}
          >
            {current === steps.length - 1 ? (
              <>Done <i className="ti ti-check"></i></>
            ) : (
              <>Next <i className="ti ti-arrow-right"></i></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
