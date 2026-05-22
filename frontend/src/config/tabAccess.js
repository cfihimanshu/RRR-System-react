export const TAB_ACCESS = {
  "dashboard":            ["Admin", "Operations", "Staff", "Accountant", "Super Admin"],
  "new-case":             ["Admin", "Operations", "Staff", "Super Admin"],
  "case-master":          ["Admin", "Operations", "Reviewer", "Super Admin"],
  "history":              ["Admin", "Operations", "Staff", "Super Admin"],
  "action-log":           ["Admin", "Operations", "Staff", "Super Admin"],
  "comm-log":             ["Admin", "Operations", "Staff", "Super Admin"],
  "timeline":             ["Admin", "Super Admin"],
  "doc-index":            ["Admin", "Operations", "Staff", "Super Admin"],
  "admin-panel":          ["Admin", "Super Admin"],
  "internal-search":      ["Admin", "Super Admin"], // Explicitly only Admin by default, plus canAccessRecords override
  "reviewer-panel":       ["Admin", "Reviewer", "Super Admin"],
  "accountant-dashboard": ["Admin", "Accountant", "Super Admin"],
  "legal-dashboard":      ["Legal", "Super Admin"],
  "agreement-gen":        ["Operations", "Super Admin"],
  "my-task":              ["Admin", "Operations", "Staff", "Accountant", "Legal", "Super Admin"],
  "sod-eod-reports":      ["Admin", "Operations", "Staff", "Accountant", "Super Admin"],
  "work-report":          ["Admin", "Operations", "Legal", "Super Admin"],
  "refund-request":       ["Operations", "Staff", "Super Admin"]
};
