import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  Lock, 
  Clock, 
  LayoutGrid, 
  CheckSquare, 
  FileText, 
  Check, 
  HelpCircle, 
  Mail,
  AlertTriangle,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All Topics' },
  { id: 'login', name: 'Login & Access', icon: Lock },
  { id: 'sod-eod', name: 'SOD / EOD', icon: Clock },
  { id: 'cases', name: 'Cases', icon: LayoutGrid },
  { id: 'tasks', name: 'Tasks & Reports', icon: CheckSquare },
  { id: 'agreements', name: 'Agreements', icon: FileText },
  { id: 'approvals', name: 'Approvals', icon: Check }
];

const FAQ_DATA = [
  // LOGIN & ACCESS
  {
    category: 'login',
    question: 'How do I log in to the RRR System?',
    answer: (
      <>
        Open the RRR System URL in any modern web browser, then:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Enter your registered <strong>corporate email address</strong></li>
          <li>Enter your <strong>password</strong> (click the eye icon to reveal it if needed)</li>
          <li>Click <strong>Sign In</strong></li>
        </ol>
        You can also use <strong>Sign In with Google</strong> if your account is linked. On success, you will be taken directly to your Dashboard.
      </>
    )
  },
  {
    category: 'login',
    question: 'I forgot my password. How do I reset it?',
    answer: (
      <>
        <ol className="list-decimal ml-5 space-y-1">
          <li>On the login page, click the <strong>Forgot Password?</strong> link</li>
          <li>Enter your registered email and click <strong>Send Code</strong></li>
          <li>Check your inbox for a <strong>6-digit OTP</strong> (valid for 10 minutes)</li>
          <li>Enter the code, set your new password, and click <strong>Reset Password</strong></li>
        </ol>
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>The code expires in 10 minutes. If you don't see the email, check your Spam/Junk folder or click <strong>Resend Code</strong>.</span>
        </div>
        <div className="tip-inline mt-2 flex items-start gap-2 p-3 bg-emerald-50 border-l-3 border-emerald-500 rounded-r-lg text-emerald-800 text-xs">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>Once reset is successful you will see "Password reset successfully! You can now login." Log in as normal after that.</span>
        </div>
      </>
    )
  },
  {
    category: 'login',
    question: 'Can I stay logged in across browser sessions?',
    answer: (
      <>
        Sessions are managed securely and may expire based on your organisation's policy. You can log out manually at any time using the <strong>Logout</strong> option in the header bar or via <strong>Sign Out</strong> at the bottom of the sidebar — both perform the same action.
      </>
    )
  },

  // SOD / EOD
  {
    category: 'sod-eod',
    question: 'What is SOD and why is it mandatory?',
    answer: (
      <>
        SOD (Start of Day) is a mandatory morning check-in that unlocks the full RRR System for the day. It verifies your attendance, captures your location, and lets you plan the day's tasks.
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>The SOD form appears immediately after login and locks your screen — you cannot access any feature until it is completed and submitted.</span>
        </div>
      </>
    )
  },
  {
    category: 'sod-eod',
    question: 'What do I need to complete the SOD form?',
    answer: (
      <>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Allow GPS location</strong> — click Allow when your browser asks for location access. This verifies you are at your work location.</li>
          <li><strong>Take a selfie</strong> — click "Activate Camera" and capture your photo for attendance confirmation.</li>
          <li><strong>Plan your tasks</strong> — add the tasks you intend to complete today. They will automatically appear on your My Tasks page.</li>
          <li><strong>Submit</strong> — click Submit and the full system unlocks.</li>
        </ul>
        <div className="tip-inline mt-3 flex items-start gap-2 p-3 bg-emerald-50 border-l-3 border-emerald-500 rounded-r-lg text-emerald-800 text-xs">
          <Lightbulb size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>GPS showing "Satellite Lock Failed"? Click <strong>Retry GPS Lock</strong> and ensure your browser has location permission enabled in your device settings.</span>
        </div>
      </>
    )
  },
  {
    category: 'sod-eod',
    question: 'What is EOD and when must I submit it?',
    answer: (
      <>
        EOD (End of Day) is your mandatory evening check-out. Submit it before you finish work every day:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Click the <strong>EOD</strong> button at the bottom of the dashboard sidebar</li>
          <li>Allow GPS and capture your end-of-day selfie</li>
          <li>Add a brief work summary of what you accomplished</li>
          <li>Click <strong>Submit</strong> — your check-out time is recorded</li>
        </ol>
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span><strong>Critical:</strong> If you skip EOD today, you will be blocked from submitting SOD tomorrow and cannot use the system until the issue is resolved.</span>
        </div>
      </>
    )
  },
  {
    category: 'sod-eod',
    question: 'What does my Work Report show after I submit EOD?',
    answer: (
      <>
        Your Work Report for each day shows:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Check-in time and check-out time</li>
          <li>Total hours worked</li>
          <li>GPS location proof and selfie photo</li>
          <li>Full activity breakdown — Communications (C), Documents (D), Progress updates (P), and Tasks (T) logged during the day</li>
        </ul>
        Admins can also filter work reports by team member.
      </>
    )
  },

  // CASES
  {
    category: 'cases',
    question: 'What can I see on the Dashboard?',
    answer: (
      <>
        The Dashboard is your command centre. It shows real-time counters for:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Total cases, Active cases, High-risk cases, and Critical cases</li>
        </ul>
        Every counter card is clickable — clicking it opens the <strong>My Cases</strong> page with that filter pre-applied. You can also access notifications (bell icon, top right) for tasks, alerts, and updates.
      </>
    )
  },
  {
    category: 'cases',
    question: 'How do I find a specific case?',
    answer: (
      <>
        On the <strong>My Cases</strong> page:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Use the <strong>Search bar</strong> to find cases by Case ID, client name, or status</li>
          <li>Use <strong>Filters</strong> to narrow results by status, date range, or assignee</li>
          <li>Use the <strong>Columns</strong> button to show or hide table columns — your preference is saved automatically</li>
          <li>Click any row to open the full case detail view</li>
        </ul>
      </>
    )
  },
  {
    category: 'cases',
    question: 'How do I create a new case?',
    answer: (
      <>
        Click <strong>New Case</strong> (top right of My Cases). A 4-stage guided wizard opens:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li><strong>Company &amp; Case info</strong> — company name, complaint type, brand, priority, source of complaint</li>
          <li><strong>Services configuration</strong> — service type, amount, engagement notes</li>
          <li><strong>Client information</strong> — contact details, demographic info, and case summary (all fields are mandatory)</li>
          <li><strong>Team assignment</strong> — assign the case to the right specialist or manager</li>
        </ol>
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span><strong>Unique company rule:</strong> If the company name already exists in the system, you'll see "Company name already exist." You must enter a unique name to proceed.</span>
        </div>
        <div className="tip-inline mt-2 flex items-start gap-2 p-3 bg-emerald-50 border-l-3 border-emerald-500 rounded-r-lg text-emerald-800 text-xs">
          <Lightbulb size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>Based on the complaint type selected, additional fields (Acknowledgment Number, FIR Number, or Grievance Number) appear automatically.</span>
        </div>
      </>
    )
  },
  {
    category: 'cases',
    question: 'What are the 5 tabs inside a case record?',
    answer: (
      <>
        Every case has five tabs:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li><strong>Case Details</strong> — company info, client profile, financial data, and case summary</li>
          <li><strong>Communications</strong> — log calls, emails, and meetings with date, time, and notes</li>
          <li><strong>Documents</strong> — upload and index all related files and legal documents</li>
          <li><strong>Progress Update</strong> — advance the case stage (cannot go backwards)</li>
          <li><strong>History</strong> — full audit log of who did what and when</li>
        </ol>
      </>
    )
  },
  {
    category: 'cases',
    question: 'Can I reverse a progress update once submitted?',
    answer: (
      <>
        <strong>No.</strong> Stage changes are permanent and cannot be undone. Once a stage is submitted, you cannot go back.
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Double-check everything before submitting a progress update. You can also optionally forward the case to another specialist before submitting.</span>
        </div>
      </>
    )
  },
  {
    category: 'cases',
    question: 'What information is required when closing a case?',
    answer: (
      <>
        When marking a case as closed, you must fill in:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Refunded Amount</strong></li>
          <li><strong>Saved Amount</strong></li>
          <li><strong>Mark Compliance As Due</strong></li>
        </ul>
        All three fields are mandatory before the case can be formally closed.
      </>
    )
  },

  // TASKS & REPORTS
  {
    category: 'tasks',
    question: 'How does the My Tasks Kanban board work?',
    answer: (
      <>
        Tasks are displayed in three columns: <strong>To Do</strong>, <strong>In Progress</strong>, and <strong>Completed</strong>. You can:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Drag and drop</strong> task cards between columns to update their status</li>
          <li>Click <strong>New Task</strong> to create a standalone or case-linked task</li>
          <li>Click any task card to open details, add progress notes, or set reminders</li>
          <li>Click <strong>Export Excel</strong> to download all tasks as a .xlsx spreadsheet</li>
        </ul>
        Tasks added during SOD automatically appear here at the start of each day.
      </>
    )
  },
  {
    category: 'tasks',
    question: 'What does the Work Report section show?',
    answer: (
      <>
        Each row in Work Report represents one working day, showing check-in time, check-out time, and total hours. Click any row to expand it and see:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>GPS location and selfie proof</li>
          <li>Full activity breakdown — C (Communications), D (Documents), P (Progress updates), T (Tasks)</li>
        </ul>
        You can filter by date or by SOD/EOD type. Admins can additionally filter by team member.
      </>
    )
  },
  {
    category: 'tasks',
    question: 'Can I export my tasks or attendance data?',
    answer: (
      <>
        Yes. Both exports are available:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Tasks</strong> — click <strong>Export Excel</strong> on the My Tasks page to download a .xlsx file of all your tasks</li>
          <li><strong>Attendance</strong> — use the <strong>Export Excel</strong> button on the attendance calendar (under Approvals → Leave) to download your monthly attendance</li>
        </ul>
      </>
    )
  },

  // AGREEMENTS
  {
    category: 'agreements',
    question: 'How do I generate a settlement agreement PDF?',
    answer: (
      <>
        Go to <strong>Agreements</strong> in the sidebar and follow these steps:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Fill in the agreement date, party names, client address, and settlement amount (numeric + words)</li>
          <li>Add first party and second party signatories</li>
          <li>Optionally click <strong>Add Installment</strong> to split the payment — set an amount and due date for each installment</li>
          <li>Click <strong>Generate</strong> to preview the PDF, then <strong>Download</strong> to save it to your device</li>
        </ol>
        <div className="tip-inline mt-3 flex items-start gap-2 p-3 bg-emerald-50 border-l-3 border-emerald-500 rounded-r-lg text-emerald-800 text-xs">
          <Lightbulb size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>All your previously generated agreements appear in the "My Generated Agreements" log at the bottom of the page.</span>
        </div>
      </>
    )
  },
  {
    category: 'agreements',
    question: 'What options are available under Records?',
    answer: (
      <>
        The Records page offers three options:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Data Search</strong> — search internal archived company records by name, contact, BDE, or email. Results update in real time.</li>
          <li><strong>Odoo</strong> — opens the Odoo ERP portal in a new browser tab</li>
          <li><strong>MOU</strong> — currently disabled and reserved for a future integration</li>
        </ul>
      </>
    )
  },

  // APPROVALS
  {
    category: 'approvals',
    question: 'How do I submit a travel (tour) request?',
    answer: (
      <>
        Go to <strong>Approvals → Tour (Travel)</strong> and submit your request at least <strong>3 working days before departure</strong>.
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Distance and fare are <strong>auto-calculated</strong> for Owned Vehicle, Cab/Taxi, and Bus (₹10/km)</li>
          <li>Flight and Train fares must be entered manually</li>
          <li>After completing the trip, submit a <strong>Reimbursement Claim</strong> linked to your approved travel request ID</li>
          <li>Check the <strong>Travel Policy</strong> tab for official limits on travel class, meals, hotel, and miscellaneous expenses</li>
        </ul>
        <div className="warn-inline mt-3 flex items-start gap-2 p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Travel requests submitted less than 3 working days before departure may not be approved in time.</span>
        </div>
      </>
    )
  },
  {
    category: 'approvals',
    question: 'What is the refund/settlement request workflow?',
    answer: (
      <>
        The refund request goes through a 4-step approval chain:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Select a Case ID, enter the refund amount, choose payment method (Bank / UPI / Card / QR), upload a supporting document, and submit → Status: <strong>Pending Admin</strong></li>
          <li>Admin reviews and approves or rejects</li>
          <li>If approved → Status: <strong>Pending Payment</strong> — forwarded to the accountant</li>
          <li>Accountant records the UTR and uploads proof → Status: <strong>Paid</strong></li>
        </ol>
        <div className="tip-inline mt-3 flex items-start gap-2 p-3 bg-emerald-50 border-l-3 border-emerald-500 rounded-r-lg text-emerald-800 text-xs">
          <Lightbulb size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>If your request is rejected, you will receive an email with the reason. Edit and resubmit to reset the status back to Pending Review.</span>
        </div>
      </>
    )
  },
  {
    category: 'approvals',
    question: 'How do I apply for leave?',
    answer: (
      <>
        Go to <strong>Approvals → Leave</strong> and submit your leave request with:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Leave type: Casual / Sick / Paid / Other</li>
          <li>Date range and reason</li>
        </ul>
        New requests start as <strong>Pending Review</strong> until an admin acts on them. Your attendance calendar is colour-coded: <strong>Present</strong> (green), <strong>Absent</strong> (red), <strong>Leave / Off Day</strong> (blue). You can export monthly attendance as Excel using the "Export Excel" button on the calendar.
      </>
    )
  },
  {
    category: 'approvals',
    question: 'What leave types are available in the system?',
    answer: (
      <>
        The system supports four leave categories:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Casual Leave</strong></li>
          <li><strong>Sick Leave</strong></li>
          <li><strong>Paid Leave</strong></li>
          <li><strong>Other</strong></li>
        </ul>
        Select the appropriate type when submitting your request.
      </>
    )
  },

  // GENERAL (using 'all' or standalone category)
  {
    category: 'all', // General / All
    question: 'What is the RRR System?',
    answer: (
      <>
        The RRR System is a web-based case management platform designed to help teams track client cases, log communications, manage tasks, generate settlement agreements, and handle approvals — all in one place. It is accessed via any standard web browser and requires a corporate email and password to log in.
      </>
    )
  },
  {
    category: 'all',
    question: 'What is my daily routine in the RRR System?',
    answer: (
      <>
        Your standard daily workflow is:
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li><strong>Morning:</strong> Log in → Complete SOD (GPS + selfie + plan tasks) → Dashboard unlocks</li>
          <li><strong>During the day:</strong> Work on My Cases, log communications, upload documents, update progress, manage tasks</li>
          <li><strong>Evening:</strong> Submit EOD (GPS + selfie + work summary) — never skip this</li>
        </ol>
      </>
    )
  },
  {
    category: 'all',
    question: 'What are the key rules I must remember?',
    answer: (
      <>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Progress updates on cases are <strong>permanent</strong> and cannot be undone</li>
          <li>Company names in new cases must be <strong>unique</strong> across the system</li>
          <li>Travel requests must be submitted <strong>at least 3 working days</strong> before departure</li>
          <li>Skipping EOD blocks you from using the system the next morning</li>
          <li>All daily activity is tracked in Work Report for full transparency</li>
          <li>Tasks and attendance data can be exported as Excel files at any time</li>
        </ul>
      </>
    )
  },
  {
    category: 'all',
    question: 'What browser or device should I use to access the system?',
    answer: (
      <>
        The RRR System is web-based and works on any modern browser (Chrome, Edge, Firefox, Safari). For SOD and EOD features, make sure your browser has <strong>location (GPS) permission</strong> and <strong>camera access</strong> enabled. For the best experience, use an up-to-date browser on a desktop or laptop.
      </>
    )
  }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItemId, setOpenItemId] = useState(null);

  // Toggle item
  const handleToggle = (index) => {
    setOpenItemId(prev => prev === index ? null : index);
  };

  // Filter list
  const filteredFAQ = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.map((item, idx) => ({ ...item, globalIndex: idx })).filter(item => {
      // Category match
      const catMatch = activeCategory === 'all' || item.category === activeCategory;
      
      // Search query match
      let textMatch = true;
      if (q) {
        const questionText = item.question.toLowerCase();
        textMatch = questionText.includes(q);
      }
      
      return catMatch && textMatch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="faq-container w-full min-h-screen bg-[#f4f5f8] text-[#1a1a2e] font-sans pb-20">
      <style>{`
        .faq-hero {
          background: linear-gradient(135deg, #0d3d2f 0%, #1D9E75 100%);
          padding: 64px 24px 56px;
          text-align: center;
          color: #ffffff;
        }
        .faq-hero-badge {
          display: inline-flex; 
          align-items: center; 
          gap: 8px;
          background: rgba(255, 255, 255, 0.12); 
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px; 
          padding: 6px 16px;
          font-size: 12px; 
          font-weight: 600; 
          letter-spacing: 0.06em;
          text-transform: uppercase; 
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 24px;
        }
        .faq-hero h1 { 
          font-size: 36px; 
          font-weight: 700; 
          margin-bottom: 12px; 
          line-height: 1.2; 
        }
        .faq-hero p { 
          font-size: 16px; 
          color: rgba(255, 255, 255, 0.75); 
          max-width: 520px; 
          margin: 0 auto 36px; 
        }
        .faq-search-wrap { 
          max-width: 480px; 
          margin: 0 auto; 
          position: relative; 
        }
        .faq-search-input {
          width: 100%; 
          padding: 14px 20px 14px 46px !important;
          border: none !important; 
          border-radius: 12px !important;
          font-size: 15px !important; 
          outline: none !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          color: #1a1a2e !important;
          background: #ffffff !important;
        }
        .faq-search-icon {
          position: absolute; 
          left: 16px; 
          top: 50%; 
          transform: translateY(-50%);
          color: #6b7280; 
          pointer-events: none;
        }
        .faq-filter-bar {
          max-width: 860px; 
          margin: 36px auto 0; 
          padding: 0 24px;
          display: flex; 
          gap: 8px; 
          flex-wrap: wrap; 
          justify-content: center;
        }
        .faq-filter-pill {
          padding: 8px 18px; 
          border-radius: 999px; 
          font-size: 13px; 
          font-weight: 500;
          cursor: pointer; 
          border: 1px solid #e4e8ef;
          background: #ffffff; 
          color: #6b7280; 
          transition: all 0.15s;
          user-select: none;
        }
        .faq-filter-pill:hover { 
          border-color: #1D9E75; 
          color: #1D9E75; 
        }
        .faq-filter-pill.active { 
          background: #1D9E75; 
          color: #ffffff; 
          border-color: #1D9E75; 
        }
        .faq-page-content { 
          max-width: 860px; 
          margin: 0 auto; 
          padding: 40px 24px 0; 
        }
        .faq-section-heading {
          display: flex; 
          align-items: center; 
          gap: 10px;
          font-size: 13px; 
          font-weight: 700; 
          letter-spacing: 0.08em;
          text-transform: uppercase; 
          color: #1D9E75;
          margin-top: 32px;
          margin-bottom: 16px; 
          padding-bottom: 10px;
          border-bottom: 2px solid #e1f5ee;
        }
        .faq-item-card {
          background: #ffffff; 
          border: 1px solid #e4e8ef;
          border-radius: 12px; 
          margin-bottom: 10px; 
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .faq-item-card:hover { 
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); 
        }
        .faq-item-card.open { 
          border-color: #1D9E75; 
        }
        .faq-q-btn {
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          gap: 14px; 
          padding: 18px 20px; 
          cursor: pointer;
          font-size: 15px; 
          font-weight: 600; 
          color: #1a1a2e;
          user-select: none;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
        }
        .faq-q-btn:hover {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .faq-chevron-wrap {
          width: 28px; 
          height: 28px; 
          flex-shrink: 0;
          background: #f4f5f8; 
          border-radius: 50%;
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: transform 0.25s, background 0.2s;
          color: #6b7280;
        }
        .faq-item-card.open .faq-chevron-wrap { 
          transform: rotate(180deg); 
          background: #e1f5ee; 
          color: #1D9E75; 
        }
        .faq-a-body {
          padding: 0 20px 18px;
          font-size: 14px; 
          color: #374151; 
          line-height: 1.75;
          border-top: 1px solid #e4e8ef;
          padding-top: 16px;
        }
        .faq-no-results { 
          text-align: center; 
          padding: 60px 20px; 
          color: #6b7280; 
        }
        .faq-no-results-icon { 
          opacity: 0.3; 
          margin: 0 auto 12px; 
        }
        .faq-contact-strip {
          background: #ffffff; 
          border: 1px solid #e4e8ef;
          border-radius: 16px; 
          padding: 28px 32px;
          display: flex; 
          align-items: center; 
          gap: 20px;
          flex-wrap: wrap;
          margin-top: 48px;
        }
        .faq-contact-text h3 { 
          font-size: 17px; 
          font-weight: 600; 
          margin-bottom: 4px; 
          color: #1a1a2e;
        }
        .faq-contact-text p { 
          font-size: 14px; 
          color: #6b7280; 
        }
        .faq-contact-btn {
          margin-left: auto; 
          background: #1D9E75 !important; 
          color: #ffffff !important;
          padding: 11px 24px !important; 
          border-radius: 10px !important; 
          font-size: 14px !important;
          font-weight: 600 !important; 
          text-decoration: none !important; 
          white-space: nowrap;
          transition: background 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none !important;
          box-shadow: none !important;
        }
        .faq-contact-btn:hover { 
          background: #0F6E56 !important; 
        }
        
        @media(max-width:600px) {
          .faq-hero h1 { font-size: 26px; }
          .faq-contact-strip { flex-direction: column; align-items: flex-start; }
          .faq-contact-btn { margin-left: 0; width: 100%; }
        }
      `}</style>

      {/* Hero */}
      <div className="faq-hero">
        <div className="faq-hero-badge">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="8"/>
          </svg>
          RRR System Help Centre
        </div>
        <h1>Frequently Asked Questions</h1>
        <p>Find quick answers about logging in, daily workflows, case management, approvals, and more.</p>
        
        <div className="faq-search-wrap">
          <Search className="faq-search-icon" size={18} />
          <input 
            type="text" 
            className="faq-search-input" 
            placeholder="Search questions…" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenItemId(null); // Close active when searching
            }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="faq-filter-bar">
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            className={`faq-filter-pill ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(category.id);
              setOpenItemId(null); // Close active when filtering
            }}
          >
            {category.name}
          </div>
        ))}
      </div>

      {/* Page Content */}
      <div className="faq-page-content">
        {filteredFAQ.length === 0 ? (
          <div className="faq-no-results">
            <Search className="faq-no-results-icon" size={48} />
            <p>No questions match your search. Try different keywords.</p>
          </div>
        ) : (
          <div>
            {/* We will group the filtered items by category so we can display section headings if there are matches */}
            {CATEGORIES.filter(cat => cat.id !== 'all').map((cat) => {
              const catItems = filteredFAQ.filter(item => item.category === cat.id);
              if (catItems.length === 0) return null;
              
              const CategoryIcon = cat.icon || HelpCircle;

              return (
                <div key={cat.id} className="mb-8">
                  <div className="faq-section-heading">
                    <CategoryIcon size={16} className="shrink-0" />
                    <span>{cat.name}</span>
                  </div>

                  <div className="space-y-3">
                    {catItems.map((item) => {
                      const isOpen = openItemId === item.globalIndex;
                      return (
                        <div 
                          key={item.globalIndex} 
                          className={`faq-item-card ${isOpen ? 'open' : ''}`}
                        >
                          <button 
                            className="faq-q-btn"
                            onClick={() => handleToggle(item.globalIndex)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>
                            <div className="faq-chevron-wrap">
                              <ChevronDown size={14} />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="faq-a-body animate-fade-in">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Standalone General (All) Heading if not covered above */}
            {(() => {
              const generalItems = filteredFAQ.filter(item => item.category === 'all');
              if (generalItems.length === 0) return null;
              return (
                <div className="mb-8">
                  <div className="faq-section-heading">
                    <HelpCircle size={16} className="shrink-0" />
                    <span>General</span>
                  </div>
                  <div className="space-y-3">
                    {generalItems.map((item) => {
                      const isOpen = openItemId === item.globalIndex;
                      return (
                        <div 
                          key={item.globalIndex} 
                          className={`faq-item-card ${isOpen ? 'open' : ''}`}
                        >
                          <button 
                            className="faq-q-btn"
                            onClick={() => handleToggle(item.globalIndex)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>
                            <div className="faq-chevron-wrap">
                              <ChevronDown size={14} />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="faq-a-body animate-fade-in">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Contact Strip */}
        <div className="faq-contact-strip">
          <div className="p-3 bg-emerald-50 rounded-2xl text-[#1D9E75] shrink-0 border border-emerald-100">
            <Mail size={24} />
          </div>
          <div className="faq-contact-text">
            <h3>Still have a question?</h3>
            <p>Contact your system administrator or reach out to the operations team for further assistance.</p>
          </div>
          <a className="faq-contact-btn" href="https://mail.google.com/mail/?view=cm&fs=1&to=cfi.himanshu@gmail.com" target="_blank" rel="noopener noreferrer">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
