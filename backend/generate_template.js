const xlsx = require('xlsx');

const headers = [
  "Company Name", "Brand Name", "Client Name", "Mobile", "Email", 
  "Type of Complaint", "Source of Complaint", "Priority", "State", 
  "City", "Pincode", "Services", "Service Amount", "Signed MOU Amount", 
  "Work Status", "BDA", "Amount Paid", "MOU Signed", "Dispute Amount", 
  "Date of Last Payment", "Summary", "Allegation", "Engagement Note", 
  "Initiated By", "Assigned To"
];

const sampleData = [
  {
    "Company Name": "Tech Solutions Pvt Ltd",
    "Brand Name": "TechSol",
    "Client Name": "Rahul Kumar",
    "Mobile": "9876543210",
    "Email": "rahul@tech.in",
    "Type of Complaint": "Consumer Complaint",
    "Source of Complaint": "Website",
    "Priority": "High",
    "State": "Delhi",
    "City": "New Delhi",
    "Pincode": "110001",
    "Services": "Web Dev, SEO",
    "Service Amount": "50000, 15000",
    "Signed MOU Amount": "50000, 15000",
    "Work Status": "In Progress, Not Initiated",
    "BDA": "Amit Sharma, Priya Singh",
    "Amount Paid": "20000",
    "MOU Signed": "Yes",
    "Dispute Amount": "5000",
    "Date of Last Payment": "10/05/2026",
    "Summary": "Client wants urgent delivery for the website.",
    "Allegation": "None",
    "Engagement Note": "Spoke to client, they will send the documents by tomorrow.",
    "Initiated By": "System",
    "Assigned To": "Priya Singh"
  }
];

const worksheet = xlsx.utils.json_to_sheet(sampleData, { header: headers });

// Auto size columns
const maxWidths = headers.map(h => ({ wch: h.length + 5 }));
worksheet['!cols'] = maxWidths;

const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Import Template");

xlsx.writeFile(workbook, "Case_Import_Template.xlsx");
console.log("Template generated successfully.");
