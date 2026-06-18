# RRR-System: Role-Based Access Control (RBAC) & Operational Permissions Manual
## (गैर-एडमिन उपयोगकर्ता भूमिकाओं और परिचालन अनुमतियों के लिए मार्गदर्शिका)

> [!NOTE]
> This document serves as a non-technical reference manual for all non-admin and non-super-admin roles in the RRR-System. It outlines page-level accessibility and CRUD (Create, Read, Update, Delete) permissions as configured in the system code. No database or source code changes were made to compile this manual.

---

## 1. Quick Summary Matrix (त्वरित संदर्भ तालिका)

| Page/Tab Name | Operations | Staff | Accountant | Reviewer | Legal/Advocate | Operation Head | Operation Review | Operation Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write |
| **New Case** | Create | Create | ❌ | ❌ | ❌ | Create | Create | Create |
| **Case Master** | Read / Edit | ❌ | ❌ | Read | Read / Edit | Read / Edit | Read / Edit | Read / Edit |
| **Archived Cases** | ❌ | ❌ | ❌ | ❌ | ❌ | Read | Read | Read |
| **History / Logs** | Read | Read | ❌ | ❌ | ❌ | Read | Read | ❌ |
| **Doc Index** | Read / Upload | Read / Upload | ❌ | ❌ | ❌ | Read / Upload | Read / Upload | ❌ |
| **Reviewer Panel** | ❌ | ❌ | ❌ | Read / Update | ❌ | ❌ | ❌ | ❌ |
| **Accountant Dash** | ❌ | ❌ | Read / Update | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Legal Dashboard** | ❌ | ❌ | ❌ | ❌ | Read / Edit | ❌ | ❌ | ❌ |
| **Agreement Gen** | Create / Delete | ❌ | ❌ | ❌ | ❌ | Create / Delete | Create / Delete | ❌ |
| **My Task** | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write |
| **SOD / EOD Reports**| Read | Read | Read | ❌ | ❌ | Read | Read | ❌ |
| **Work Report** | Read | ❌ | ❌ | ❌ | Read | Read | Read | Read |
| **Refund Request** | Create | Create | ❌ | ❌ | ❌ | Create | Create | ❌ |
| **Pending Refunds** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Timeline** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Admin Panel** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Data Search** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend (संकेत):**
*   **Create / Upload / Edit**: Authorized to perform actions (बनाने/अपलोड/बदलाव करने की अनुमति है).
*   **Read**: Authorized to view own or filtered data only (केवल अपना या फ़िल्टर किया गया डेटा देखने की अनुमति है).
*   **❌**: Access Denied (प्रवेश वर्जित है).

---

## 2. Role-by-Role Operational Scope (भूमिका-वार परिचालन दायरा)

### 2.1. Operations Role
**Description:** The primary team member managing cases, customer communication, and case agreements.
*(मुख्य सदस्य जो मामलों, ग्राहक संचार और समझौतों का प्रबंधन करता है।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Dashboard, MIS Report, New Case, Case Master, History, Action Log, Comm Log, Doc Index, Agreement Gen, My Task, SOD/EOD Reports, Work Report, Refund Request.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   **New Cases**: Register new cases in the system.
    *   **Actions & Comms**: Log calls, emails, meetings, and upload file attachments.
    *   **Documents**: Upload files to the document index.
    *   **Agreements**: Generate formal client agreements via template inputs.
    *   **Refund Requests**: Propose a new refund request for customers.
    *   **Tasks & Travel**: Create daily tasks and request tour/reimbursement approval.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   Can update progress details and next action dates only for cases assigned to them.
    *   Can edit Daily and Monthly performance targets within the MIS Report page.
*   **What they CANNOT do (क्या नहीं कर सकते):**
    *   ❌ Cannot view Odoo-sourced cases (filtered out from their dashboard).
    *   ❌ Cannot delete cases or documents (Admin/Super Admin only).
    *   ❌ Cannot view other team members' refund requests.
    *   ❌ Cannot approve refunds or travel requests.
    *   ❌ Cannot export SOD/EOD Excel reports.

---

### 2.2. Staff Role
**Description:** Back-office support role focusing on registration, document indexing, and task logging.
*(बैक-ऑफिस सपोर्ट जो केस पंजीकरण, दस्तावेज़ इंडेक्सिंग और टास्क लॉगिंग पर काम करता है।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Dashboard, MIS Report, New Case, History, Action Log, Comm Log, Doc Index, My Task, SOD/EOD Reports, Refund Request.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   **Cases**: Register cases. However, they **cannot assign** the case to another person (the assignment input is disabled).
    *   **Logs**: Submit action logs, communication history, and upload documents.
    *   **Refund Requests**: Create client refund requests (limited to own view).
    *   **Travel**: Submit travel & reimbursement forms.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   Can update task status (Pending to Completed) for tasks assigned to them.
*   **What they CANNOT do (क्या नहीं कर सकते):**
    *   ❌ **No Case Master Access**: Cannot view or modify cases in the Case Master panel.
    *   ❌ Cannot edit cases or assign cases to others.
    *   ❌ Cannot generate agreement templates.
    *   ❌ Cannot delete any transaction logs, cases, or files.

---

### 2.3. Accountant Role
**Description:** Dedicated financial node managing payment releases, installment collections, and refund clearances.
*(वित्तीय विभाग का नोड जो पेमेंट रिलीज, किस्त संग्रह और रिफंड क्लीयरेंस प्रबंधित करता है।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Dashboard, MIS Report, Accountant Dashboard, My Task, SOD/EOD Reports.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   **Payouts**: Register payment details and ledger entries.
    *   **Travel**: Create travel/reimbursement requests.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   **Refund installments**: Mark pending installments as "Paid" or "Processed" and update transaction IDs.
*   **What they CANNOT do (क्या नहीं कर सकते):**
    *   ❌ Cannot create or edit cases.
    *   ❌ Cannot index general case documents.
    *   ❌ Cannot modify agreement parameters.
    *   ❌ Cannot delete financial logs or refund request records.

---

### 2.4. Reviewer Role
**Description:** Audit and review node that approves case updates and confirms audit compliance.
*(ऑडिट और समीक्षा नोड जो केस अपडेट को मंजूरी देता है और ऑडिट अनुपालन की पुष्टि करता है।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Dashboard, MIS Report, Case Master, Reviewer Panel, My Task.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   **Tasks & Travel**: Standard task entries and travel requests.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   **Review Status**: Approve, reject, or mark cases as requiring modification in the Reviewer Panel.
*   **What they CANNOT do (क्या नहीं कर सकते):**
    *   ❌ Cannot create new cases.
    *   ❌ Cannot upload general repository documents or generate agreements.
    *   ❌ Cannot view or modify financial/refund databases.

---

### 2.5. Legal / Advocate Roles
**Description:** Handles formal litigation, legal notices, and compliance workflows.
*(कानूनी नोटिस, मुकदमों और अदालती दस्तावेज़ों को संभालने वाली भूमिका।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Case Master, Legal Dashboard, My Task, Work Report.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   **Tasks & Travel**: standard team tasks and travel claims.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   **Legal Milestones**: Update progress updates, court dates, hearing summaries, and upload legal filings.
*   **What they CANNOT do (क्या नहीं कर सकते):**
    *   ❌ Cannot register new cases.
    *   ❌ Cannot generate MOU templates.
    *   ❌ Cannot create or process refunds.

---

### 2.6. Operation Head / Operation Review / Operation Admin
**Description:** Supervisory operational heads with broad visibility over team performance.
*(पर्यवेक्षी परिचालन प्रमुख जिनके पास टीम के प्रदर्शन पर व्यापक दृष्टि होती है।)*

*   **Allowed Pages (इन पेजों का एक्सेस है):**
    *   Dashboard, MIS Report, New Case, Case Master, Archived Cases, History, Action Log, Comm Log, Doc Index, Agreement Gen, My Task, SOD/EOD Reports, Work Report, Refund Request.
*   **What they can CREATE (क्या बना सकते हैं):**
    *   Same capabilities as the Operations role.
*   **What they can UPDATE (क्या एडिट कर सकते हैं):**
    *   **MIS Targets**: Can edit Daily/Monthly specialist performance targets.
*   **Key Privileges (विशेष अधिकार):**
    *   **Odoo Scoping**: They are permitted to view and search cases sourced from Odoo (unlike standard Operations).
    *   **Block Exemption**: *Operation Head* and *Operation Review* are exempt from the mandatory dashboard SOD/EOD block.

---

## 3. General Restrictions & Strict Boundaries (सामान्य प्रतिबंध और सीमाएं)

### 3.1. Case Ownership Gating (केस ओनरशिप गेटिंग)
Standard users (Staff, Operations, Operation Admin) can only modify/edit case details if they are explicitly registered as the **assigned owner** of that case. A read-only mode applies to any case where they are not the assignee.

### 3.2. Deletion Guardrails (डिलीशन ब्लॉक)
No non-admin role is capable of deleting case profiles, documents from the repository, or action logs. The "Delete" buttons are systematically hidden and protected at the server-level for anyone without an `Admin` or `Super Admin` role.

### 3.3. SOD/EOD Block Rules (एसओडी / ईओडी ब्लॉक नियम)
*   **Staff, Operations, Legal, and Advocate** roles MUST submit their Start of Day (SOD) report immediately upon logging into the dashboard.
*   Failure to submit the SOD report triggers a fullscreen block modal, preventing them from accessing case master databases or logging actions until the report is completed.
*   **Accountants, Reviewers, Operation Head, and Operation Review** roles are exempt from this blocking mechanic.
