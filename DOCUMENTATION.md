# RRR System Documentation

## 1) Overview

`RRR System` is a browser-based case management platform connected to Google Sheets and Google Drive through Google Apps Script.

It supports:
- secure login with role-based access
- case creation and bulk import
- history/action/communication/document tracking
- refund workflow (request -> review -> approval -> payment)
- case study generation and PDF download
- internal master data search

The frontend is a single-page app:
- `index.html` (UI structure)
- `style.css` (styling)
- `script.js` (all business logic)

---

## 2) Core Architecture

### Frontend
- Pure HTML/CSS/JavaScript
- Uses browser `localStorage` as temporary backup/cache
- Syncs main data to Apps Script endpoint (`SCRIPT_URL`)

### Backend (Apps Script)
- Reads/writes data to Google Sheets tabs (`Cases`, `History`, `Actions`, `Communications`, `Documents`, `Timeline`, `Refunds`, etc.)
- Uploads base64 files to Google Drive and stores public links

### Data Flow
1. User logs in from `login.html`
2. App loads DB from cloud (`doGet`)
3. User actions update in-memory `DB`
4. `saveDB()` posts `DB` to Apps Script (`doPost`)
5. Apps Script writes to tabs and Sync storage

---

## 3) Roles and Permissions

Supported roles:
- `Admin`
- `Operations`
- `Staff`
- `Reviewer`
- `Accountant`

### High-level behavior
- **Admin**: full visibility and controls
- **Non-admin**: case visibility filtered by assignment (`assignedTo`) or ownership (`initiatedBy`)
- **Refund workflow** is role-driven (review/approval/payment)

---

## 4) Main Modules

## 4.1 Dashboard
- KPIs: total/open/settled/overdue/due-soon/high-priority
- Recent cases table
- Refund request + refund status cards

## 4.2 New Case
- Full structured case form including:
  - company, complaint details, client details
  - financial details
  - risk profile
  - narrative and proofs
  - team data
  - engagement note
- Supports `Create` and `Edit` mode

## 4.3 Case Master
- Main case register table
- Search + filter by status/priority
- Edit and view actions per case
- Bulk import from **Excel** (`.xlsx` / `.xls`)
- Export CSV

## 4.4 History Upload
- Add historical entries per case
- Optional file attachment (upload/URL)

## 4.5 Action Log
- Add internal actions per case
- Supports next action planning and file attachments

## 4.6 Communication Log
- Call/email/meeting/WhatsApp records
- Includes direction, summary, legal/social tags, file evidence

## 4.7 Document Index
- Manual document indexing per case
- Search and preview support

## 4.8 Timeline View
- Chronological case timeline from all events

## 4.9 Case Study
- Generate formatted case study per case
- Includes case overview, team info, risk profile, timeline, actions, communications
- Includes **Engagement Note**
- PDF download support

## 4.10 Admin Panel
- Refund approvals
- User creation

## 4.11 Reviewer Dashboard
- Pending refund reviews
- Approve or reject with remark

## 4.12 Accountant Dashboard
- Approved/pending-payment refunds
- Mark as paid with transaction ID

## 4.13 Data Search
- Upload sample data
- Search internal records quickly

---

## 5) ID and Status Rules

### Case ID
Format:
- `RRR-<BrandCode>-<Year>-<Serial>`

Brand code logic:
- first letters from brand words
- Example:
  - `startup kare` -> `SK`
  - `startup flora` -> `SF`

### Communication ID
Format:
- `COMM-<Mode>-RRR-<CaseId>-<SrNo>`

### Document ID
Format:
- `DOC-<CaseId>-<SrNo>`

### New Case Status
- New form and bulk imported cases default to:
  - `currentStatus = "New"`

---

## 6) Assignment Behavior

Primary assignment field:
- `assignedTo` (email)

Visibility rule:
- Admin sees all cases
- Non-admin sees only:
  - cases assigned to their email, or
  - fallback initiated ownership where applicable

Case Master includes assignment action (admin only) to assign case to a user email.

---

## 7) Refund Workflow

End-to-end flow:
1. Refund request created (`Pending Review`)
2. Reviewer:
   - approve -> `Pending Approval`
   - reject -> `Rejected by Reviewer` + remark
3. Admin approves -> `Pending Payment`
4. Accountant marks paid -> `Refund Completed`

Refund data is also persisted in dedicated `Refunds` sheet and shown role-wise.

---

## 8) File Upload and Preview

### Upload
- Files can be base64 from frontend
- Apps Script converts base64 to Drive files via `uploadToDrive()`
- Saved links are persisted in records

### Preview
- In-app full-screen preview modal
- Download option provided
- Avoids opening blank tabs for previews

---

## 9) Bulk Import (Case Master)

### Supported format
- Excel only (`.xlsx`, `.xls`)

### Behavior
- Header-based parsing (not strict fixed-column only)
- Missing fields are allowed and stored blank/default
- If `caseId` is missing, system auto-generates
- Imported cases are marked:
  - `caseCreatedSource = "Excel"`
  - `currentStatus = "New"`

---

## 10) Cache and Sync

### Cache
- Local cache keys:
  - `RRR_DB_v1`
  - `RRR_SAMPLE_DATA_v1`
- Header button: **Clear Cache**
  - clears local backup
  - reloads fresh cloud data

### Sync
- `saveDB()` pushes DB to Apps Script
- Optional control for syncing sampleData to prevent accidental sheet overwrite

---

## 11) Required Google Sheets Tabs

Expected tabs include:
- `Sync`
- `Cases`
- `History`
- `Actions`
- `Communications`
- `Documents`
- `Timeline`
- `Refunds`
- `AuditLogs`
- `Users`
- `SampleData`

If a required sheet is missing, backend operations may fail.

---

## 12) Deployment Notes

1. Update frontend `SCRIPT_URL` in `login.html` and `script.js`
2. Save Apps Script changes
3. Deploy new web app version
4. Hard refresh browser (`Ctrl + F5`)

---

## 13) Common Troubleshooting

### Case appears then disappears after refresh
- Cloud sync failed or backend write failed
- Check Apps Script execution logs
- Verify `doPost` writes complete successfully

### Data Search sheet gets cleared unexpectedly
- Ensure sampleData is synced only when intended
- Keep normal saves from overwriting `SampleData` unless explicit upload flow

### File preview issues
- Verify Drive sharing permission (`ANYONE_WITH_LINK`)
- Confirm stored file links are valid

### ID format mismatch
- Verify latest frontend `script.js` is deployed
- Ensure browser cache is cleared

---

## 14) Suggested Future Improvements

- Assignment by dropdown from `Users` (instead of free-text email)
- Dedicated audit trail UI
- API-level validation and schema checks
- Incremental writes instead of full-tab overwrite
- Test suite for import/parsing and workflow transitions

---

## 15) Quick Functional Summary

This system currently provides:
- full case lifecycle management
- role-aware dashboards and operations
- robust refund control flow
- evidence/document management
- bulk import + reporting + case study generation

It is designed for operational teams handling high-volume dispute/refund case workflows with Google Sheets as the data backbone.

