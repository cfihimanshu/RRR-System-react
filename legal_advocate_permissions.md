# RRR-System: Legal & Advocate Access & Permissions Manual
## Executive Presentation & Functional Scope Directory

---

## 1. Overview & Core Mission of the Role

The **Legal / Advocate** roles handle litigation, drafting legal notices, tracking case timelines, and managing dispute resolutions.

*   **Primary System Focus:** Drafting and managing legal notices, updating court/arbitration status, and tracking litigation tasks.
*   **Operational Constraints:** Subject to strict Start of Day (SOD) and End of Day (EOD) requirements. The legal dashboard requires camera validation (selfie) and GPS location tracking to submit SOD/EOD.
*   **Case Gating:** Has access to Case Master (My Cases) but can only view and edit cases assigned directly to them.

---

## 2. Complete Navigation Flow & Sub-Feature Chart

The following diagram maps the entire system path for the **Legal / Advocate** roles, including all main tabs and their respective sub-features and action forms:

```text
                          ┌──────────────────────────┐
                          │     🔑 User Logs In      │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │    📝 Submit SOD Form    │
                          │   (Selfie + GPS Check)   │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  ⚖️ Legal Dashboard      │
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
 │ ⚖️ Legal Panel│    │📋 Case Master│      │ ⚙️ My Tasks   │    │ 📊 Work      │
 ├──────────────┤    ├──────────────┤      ├──────────────┤    │  Report      │
 │• View Legal  │    │• View Legal  │      │• Create Legal│    ├──────────────┤
 │  Metrics     │    │  Cases Only  │      │  Tasks       │    │• View Action │
 │• Submit EOD  │    │• Edit Details│      │• Task Status │    │  Summaries   │
 │  Reports     │    │• Upload Legal│      │• Task Due    │    │• Audit Logs  │
 │• Task List   │    │  Notices     │      │  Dates       │    └──────────────┘
 └──────────────┘    └──────────────┘      └──────────────┘
```

---

## 3. Tab-by-Tab Functional Scope & Capabilities

The **Legal / Advocate** roles can access exactly 4 main navigation sections in the sidebar. Below is the comprehensive breakdown of permissions and action capabilities for each:

### 3.1. Legal Dashboard (UI: "Legal Dashboard" | Code: `legal-dashboard`)
This functions as the core workspace:
*   **Create/Write Actions:**
    *   **SOD/EOD Submissions:** Submit Start of Day (SOD) and End of Day (EOD) forms. Submissions require browser camera access (selfie capture) and GPS location tracking coords.
*   **Read Actions:**
    *   View Legal Notice metrics, active litigation files, and pending task checklists.

### 3.2. My Cases (Case Master)
*   **Visual Scope:** View is scoped to legal-notice type cases assigned to them.
*   **Create/Write Actions:**
    *   **Log Communications:** Register calls, legal consults, and advocate meetings.
    *   **Upload Legal Files:** Upload drafts of legal notices, court summons, and case records.
*   **Update/Edit Actions:**
    *   Update case details, court hearing dates, and legal notice status.

### 3.3. My Tasks
*   **Create/Write Actions:**
    *   Create legal tasks with descriptions and due dates.
*   **Update/Edit Actions:**
    *   Assign litigation tasks to self.
    *   Mark tasks as To Do, In Progress, or Completed.

### 3.4. Work Report
*   **Read Actions:**
    *   View action histories and log files of their completed daily tasks.

---

## 4. Operational Boundaries & Security Locks

1.  **Strictly Limited Access:** Have no access to the general Dashboard, MIS Report, Agreement Generation, New Case, or Approvals tabs.
2.  **Location & Photo Verification:** The system requires real-time GPS coordinates and camera selfie validation to submit SOD/EOD reports.
3.  **No Deletion Actions:** Cannot delete cases, litigation history, or uploaded court files.
