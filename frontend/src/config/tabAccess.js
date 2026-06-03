export const TAB_ACCESS = {
  "dashboard":            ["Admin", "Operations", "Staff", "Accountant", "Super Admin", "SuperAdmin", "Reviewer", "Operation Admin", "operation admin"],
  "new-case":             ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin", "Operation Admin", "operation admin"],
  "case-master":          ["Admin", "Operations", "Reviewer", "Super Admin", "SuperAdmin", "Operation Admin", "operation admin"],
  "archived-cases":       ["Admin", "Super Admin", "SuperAdmin", "Operation Admin", "operation admin"],
  "history":              ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin"],
  "action-log":           ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin"],
  "comm-log":             ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin"],
  "timeline":             ["Admin", "Super Admin", "SuperAdmin"],
  "doc-index":            ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin"],
  "admin-panel":          ["Admin", "Super Admin", "SuperAdmin"],
  "internal-search":      ["Admin", "Super Admin", "SuperAdmin"], // Explicitly only Admin by default, plus canAccessRecords override
  "reviewer-panel":       ["Admin", "Reviewer", "Super Admin", "SuperAdmin"],
  "accountant-dashboard": ["Admin", "Accountant", "Super Admin", "SuperAdmin"],
  "legal-dashboard":      ["Legal", "Super Admin", "SuperAdmin"],
  "agreement-gen":        ["Operations", "Super Admin", "SuperAdmin"],
  "my-task":              ["Admin", "Operations", "Staff", "Accountant", "Legal", "Super Admin", "SuperAdmin", "Operation Admin", "operation admin"],
  "sod-eod-reports":      ["Admin", "Operations", "Staff", "Accountant", "Super Admin", "SuperAdmin"],
  "work-report":          ["Admin", "Operations", "Legal", "Super Admin", "SuperAdmin", "Operation Admin", "operation admin"],
  "refund-request":       ["Admin", "Operations", "Staff", "Super Admin", "SuperAdmin"],
  "pending-refunds":      ["Admin", "Super Admin", "SuperAdmin"]
};
