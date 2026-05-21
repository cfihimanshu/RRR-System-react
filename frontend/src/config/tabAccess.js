export const TAB_ACCESS = {
  "dashboard":            ["Admin", "Operations", "Staff", "Accountant"],
  "new-case":             ["Admin", "Operations", "Staff"],
  "case-master":          ["Admin", "Operations", "Reviewer"],
  "history":              ["Admin", "Operations", "Staff"],
  "action-log":           ["Admin", "Operations", "Staff"],
  "comm-log":             ["Admin", "Operations", "Staff"],
  "timeline":             ["Admin"],
  "doc-index":            ["Admin", "Operations", "Staff"],
  "admin-panel":          ["Admin"],
  "internal-search":      ["Admin"], // Explicitly only Admin by default, plus canAccessRecords override
  "reviewer-panel":       ["Admin", "Reviewer"],
  "accountant-dashboard": ["Admin", "Accountant"],
  "legal-dashboard":      ["Legal"],
  "agreement-gen":        ["Operations"],
  "my-task":              ["Admin", "Operations", "Staff", "Accountant", "Legal"],
  "sod-eod-reports":      ["Admin", "Operations", "Staff", "Accountant"],
  "work-report":          ["Admin", "Operations", "Legal"],
  "refund-request":       ["Operations", "Staff"]
};
