# RRR-System: Reviewer Access & Permissions Manual
## Executive Presentation & Functional Scope Directory

---

## 1. Overview & Core Mission of the Role

The **Reviewer** role is a supervisory and auditing profile in the RRR-System. 

*   **Primary System Focus:** Auditing case progress, evaluating case compliance, and approving or rejecting client refund/settlement requests.
*   **Operational Exemption:** Completely exempt from mandatory Start of Day (SOD) and End of Day (EOD) dashboard blocking. They do not fill out SOD or EOD logs.
*   **Case Gating:** Has access to the Case Master (My Cases) tab to view cases and audit logs.

---

## 2. Complete Navigation Flow & Sub-Feature Chart

The following diagram maps the entire system path for the **Reviewer** role, including all main tabs and their respective sub-features and action forms:

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
         ┌───────────────────┼─────────────────────┐
         ▼                   ▼                     ▼
 ┌──────────────┐    ┌──────────────┐      ┌──────────────┐
 │ 📊 Dashboard │    │ 📉 MIS Report│      │ 📋 My Cases  │
 ├──────────────┤    ├──────────────┤      ├──────────────┤
 │• View Stats  │    │• View Target │      │• View Cases  │
 │• Filter Data │    │  Report Only │      │• View Logs   │
 │              │    │• Target      │      │• Case History│
 │              │    │  Editing     │      │• Audit Case  │
 │              │    │  Locked      │      │  Details     │
 └──────────────┘    └──────────────┘      └──────────────┘
                                                   │
         ┌─────────────────────────────────────────┘
         ▼
 ┌──────────────┐
 │ 🔍 Reviewer  │
 │  Dashboard   │
 ├──────────────┤
 │• Approve     │
 │  Settlements │
 │• Reject      │
 │  Settlements │
 └──────────────┘
```

---

## 3. Tab-by-Tab Functional Scope & Capabilities

The **Reviewer** role can access exactly 4 main navigation sections in the sidebar. Below is the comprehensive breakdown of permissions and action capabilities for each:

### 3.1. Dashboard
*   **Visual Scope:** High-level metrics view showing general case statistics and summaries.
*   **Create/Write Actions:**
    *   ❌ Exempt from SOD/EOD: Does not fill out Start of Day (SOD) or End of Day (EOD) reports.
*   **Update/Edit Actions:**
    *   Can apply filters by Specialist/User and Date range to query aggregate statistics.

### 3.2. MIS Report
*   **Visual Scope:** Viewing is limited to their own personal target tracking/performance report. 
*   **Update/Edit Actions:**
    *   ❌ Target Editing Locked: Not authorized to modify performance targets.
*   **Access Limitations:**
    *   ❌ Team Performance Locked: Cannot view performance reports or target metrics of other team members.

### 3.3. My Cases (Case Master)
*   **Visual Scope:** Complete read-only overview of cases and audit histories to perform reviews.
*   **Read Actions:**
    *   Review case parameter files, communication histories, and document attachments.
*   **Update/Edit Actions:**
    *   ❌ Cannot register new cases.
    *   ❌ Cannot directly edit case fields or log actions (read-only case access for review).

### 3.4. Reviewer Dashboard (UI: "Reviewer Dashboard" | Code: `reviewer-panel`)
This is the core operational area for the Reviewer role:
*   **Settlement Approvals:**
    *   **Approve Requests:** Approve pending client refund and settlement requests (sends them to the Admin for final payout release).
    *   **Reject Requests:** Reject settlement requests with remarks.
*   **Request Lists:** Tabbed views displaying all "Pending", "Approved", and "Rejected" requests.

---

## 4. Operational Boundaries & Security Locks

1.  **No Case Registration:** The Reviewer cannot create new cases or modify case files directly.
2.  **No Tasks Access:** The My Tasks page is disabled and hidden for this role.
3.  **No Agreement Gen:** Agreement Generation tab is completely hidden.
4.  **No Payment Processing:** Approval is for validation purposes only; payment execution is locked to the Accountant and Admin.
