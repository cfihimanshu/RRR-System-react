# RRR-System: Operation Review Access & Permissions Manual
## Executive Presentation & Functional Scope Directory

---

## 1. Overview & Core Mission of the Role

The **Operation Review** is an operational oversight role in the RRR-System. The system provides this role with case registration, update logs, agreement workflows, and task tracking.

*   **Primary System Focus:** Registering new cases, logging actions, generating agreements, and submitting/tracking travel, settlement, and leave requests.
*   **Operational Exemption:** The role is exempt from standard system blocks (such as the mandatory SOD/EOD dashboard lock), allowing uninterrupted operational navigation.
*   **Target Gating:** This role is not authorized to edit target metrics on the MIS Report page and can only view their own target report (viewing team performance is locked).

---

## 2. Complete Navigation Flow & Sub-Feature Chart

The following diagram maps the entire system path for the **Operation Review**, including all main tabs and their respective sub-features and action forms:

```text
                          ┌──────────────────────────┐
                          │     🔑 User Logs In      │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │ 📊 Dashboard Tab Opens   │
                          │ (Exempt from SOD/EOD)    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │ 📈 Browse System Tabs    │
                          └─────────────┬────────────┘
                                        │
         ┌───────────────────┬──────────┴──────────┬───────────────────┐
         ▼                   ▼                     ▼                   ▼
 ┌──────────────┐    ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
 │ 📊 Dashboard │    │ 📉 MIS Report│      │ ➕ New Case  │    │ 📋 My Cases  │
 ├──────────────┤    ├──────────────┤      ├──────────────┤    ├──────────────┤
 │• View Stats  │    │• View Target │      │• Register    │    │• View        │
 │• Filter Data │    │  Report Only │      │  New Cases   │    │  Assigned    │
 │• Submit SOD/ │    │• Target      │      │• Assign to   │    │  Cases Only  │
 │  EOD         │    │  Editing     │      │  Team Member │    │• Edit Details│
 └──────────────┘    │  Locked      │      └──────────────┘    │• Log Comms   │
                     └──────────────┘                          └──────────────┘
         │                   │                     │                   │
         └───────────────────┼─────────────────────┼───────────────────┘
                             │
         ┌───────────────────┴──────────┬──────────┴───────────────────┐
         ▼                              ▼                              ▼
 ┌──────────────┐               ┌──────────────┐               ┌──────────────┐
 │📄 Agreement  │               │ ⚙️ My Tasks   │               │ ✔️ Approvals  │
 ├──────────────┤               ├──────────────┤               ├──────────────┤
 │• Generate MOU│               │• Create/      │               │• Tour        │
 │  Agreement   │               │  Assign Tasks│               │  - Travel Req│
 │• Download    │               │• Task Status │               │  - Reimburse │
 │  PDFs        │               │• View Logs   │               │• Settlement  │
 │• Delete Past │               └──────────────┘               │  - Refund Req│
 │  Agreements  │                                              │• Leave       │
 └──────────────┘                                              │  - Leave Req │
                                                               └──────────────┘
```

---

## 3. Tab-by-Tab Functional Scope & Capabilities

The **Operation Review** can access exactly 9 main navigation sections in the sidebar. Below is the comprehensive breakdown of permissions and action capabilities for each:

### 3.1. Dashboard
*   **Visual Scope:** High-level metrics view showing organizational metrics (Total Cases, Active Cases, High Risk Cases, Critical, Closure Cases, and Settlement metrics).
*   **Create/Write Actions:**
    *   Exempt from mandatory Start of Day (SOD) and End of Day (EOD) blocking. They can browse without reporting.
    *   Can voluntarily submit their own daily SOD/EOD reports.
*   **Update/Edit Actions:**
    *   Can apply filters by Specialist/User and Date range to query dashboard statistics.
*   **Delete Actions:**
    *   ❌ None.

### 3.2. MIS Report
*   **Visual Scope:** Viewing is strictly limited to their own personal target tracking/performance report. 
*   **Update/Edit Actions:**
    *   ❌ Target Editing Locked: Not authorized to modify daily or monthly performance targets.
*   **Access Limitations:**
    *   ❌ Team Performance Locked: Cannot view performance reports, target completion stats, or matrices of other specialists or team members.
*   **Reporting Actions:**
    *   Can export their personal target report to Excel.

### 3.3. New Case
*   **Create/Write Actions:**
    *   Register and create new case files (inputs: Company Name, Case Title, Priority, Source, Complaint Type, Brand Name).
    *   Assign the case to an active team member directly at the time of registration.

### 3.4. My Cases (Case Master)
*   **Visual Scope:** View is scoped to show cases assigned directly to them (`assignedTo` matches their name/email, or where they initiated the case if it is unassigned).
*   **Create/Write Actions:**
    *   **Log Communications:** Register calls, emails, WhatsApp messages, and in-person meetings.
    *   **Document Upload:** Attach case-specific files (e.g. Legal notices, FIR documents, bank account details).
*   **Update/Edit Actions:**
    *   Update case details, status, and next action dates only for cases that they own or initiated.
*   **Delete Actions:**
    *   ❌ Case deletion is restricted (Admin/Super Admin only).

### 3.5. Archived Cases
*   **Visual Scope:** Database lookup for resolved or closed cases.
*   **Read Actions:**
    *   Read-only viewing. No edits allowed on archived cases.

### 3.6. Agreement Generation
*   **Create/Write Actions:**
    *   Input client billing details and generate client MOU/Agreements from configured templates.
    *   Set up installment payment schedules.
*   **Read Actions:**
    *   Download generated agreement PDFs.
*   **Delete Actions:**
    *   Delete agreement records from history.

### 3.7. My Tasks
*   **Create/Write Actions:**
    *   Create tasks with titles, descriptions, assignees, and due dates.
*   **Update/Edit Actions:**
    *   Assign tasks to self or team members.
    *   Mark tasks as To Do, In Progress, or Completed.

### 3.8. Work Report
*   **Read Actions:**
    *   View audit logs of activities performed by team members.

### 3.9. Approvals (UI: "Approvals" | Code: `refund-request`)
This tab consolidates three distinct request workflows, which the Operation Review can submit and track:

#### A. Tour (Travel Management)
*   **New Request:** Submit detailed travel applications (specifying Employee Name, Role, Trip Purpose, Departure/Return dates, Travel mode: Owned Vehicle/Cab/Flight/Train/Bus, Estimated Fare, Meals, and Lodging).
*   **Reimbursement:** Submit billing claims, actual expenses, and transaction logs.
*   **Travel Policy:** View reference policies and travel guidelines.
*   **Status Tracker:** View status of own requests (Pending Review, Approved, Rejected).
*   *Note: Approval authority for tours is reserved for Admin/Super Admin.*

#### B. Settlement (Refund Requests)
*   **Request Form:** Submit new refund/settlement requests for clients (inputs: Case ID, dispute details, settlement amount, bank details).
*   **Status Tracker:** View and track status of own submitted requests.
*   *Note: Approval authority is reserved for Admin/Super Admin; processing payouts is reserved for Accountants.*

#### C. Leave (Leave Management)
*   **Leave Request:** Submit leave requests (inputs: Leave Type: Casual, Sick, Paid, or Other; dates; and reasons).
*   **Status Tracker:** View status of own leave requests.
*   *Note: Approval authority is reserved for Admin/Super Admin/Reviewer.*

---

## 4. Operational Boundaries & Security Locks

1.  **Deletion Guardrails:** The Operation Review role cannot delete cases, uploaded files, or communication logs. Deletion buttons are hidden/disabled and backend requests for deletion are restricted to Admins.
2.  **Case Scope:** Enforces a strict filter on Case Master queries for Operation Review, scoping their search results and statistics to their assigned cases.
3.  **Target Setting:** Target configuration and team-wide reports on the MIS dashboard are restricted.
4.  **Assignment Alerts:** Operation Review receives automatic notification emails whenever a case is assigned to another team member, indicating that work must begin within 30 minutes of assignment.
