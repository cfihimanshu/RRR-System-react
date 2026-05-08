# 📋 Google Docs Agreement - Quick Setup Checklist

## Phase 1: Google Cloud Setup ⛅
- [ ] Go to https://console.cloud.google.com/
- [ ] Create a new project (name: "RRR Agreement Generator")
- [ ] Wait for project to be created
- [ ] Search for "Google Docs API" in the search bar
- [ ] Click on it and select the right project
- [ ] Click "ENABLE"
- [ ] Verify: You should see "API Enabled" status

## Phase 2: Service Account Creation 🔑
- [ ] In Google Cloud Console, go to **APIs & Services > Credentials**
- [ ] Click **Create Credentials > Service Account**
- [ ] Service Account Name: `rrr-agreement-generator`
- [ ] Service Account ID: `rrr-agreement-generator` (auto-filled)
- [ ] Click "Create and Continue"
- [ ] Click "Skip the optional steps"
- [ ] Click "Done"

## Phase 3: Generate & Download Key 📥
- [ ] Go back to **APIs & Services > Service Accounts**
- [ ] Click on your newly created service account (`rrr-agreement-generator`)
- [ ] Click on the **Keys** tab
- [ ] Click **Add Key > Create new key**
- [ ] Select **JSON** as the key type
- [ ] Click **Create**
- [ ] ✅ JSON file downloads automatically
- [ ] Save it safely on your computer

## Phase 4: Update Environment Variables 🔐
- [ ] Open the downloaded JSON file in a text editor
- [ ] Copy the **entire content** (including the `{}` brackets)
- [ ] Open your backend `.env` file
- [ ] Find: `GOOGLE_SERVICE_ACCOUNT_JSON=`
- [ ] Paste the entire JSON as the value (should be all on one line)
- [ ] Save the `.env` file
- [ ] Restart the backend server (kill and restart `npm start`)

## Phase 5: Share Google Docs Template 🤝
- [ ] Open your Google Docs agreement template (or create a new one)
- [ ] Open the downloaded JSON file again
- [ ] Find the `"client_email"` field - copy that email address
  (Looks like: `rrr-agreement-generator@YOUR-PROJECT.iam.gserviceaccount.com`)
- [ ] In Google Docs, click **Share**
- [ ] Paste the service account email
- [ ] Change permission to **Viewer** only
- [ ] Click **Share** (don't send notifications)
- [ ] Get the Document ID from the URL:
  - URL format: `docs.google.com/document/d/DOCUMENT_ID/edit`
  - Copy just the DOCUMENT_ID part
- [ ] In `.env`, update: `GOOGLE_DOCS_AGREEMENT_TEMPLATE_ID=PASTE_ID_HERE`
- [ ] Restart backend server again

## Phase 6: Add Placeholders to Google Docs 📝
In your Google Docs template, add these placeholders where needed:
- [ ] `{{Date}}` - Agreement date
- [ ] `{{FirstPartyCompany}}` - Your company name
- [ ] `{{ClientName}}` - Client full name
- [ ] `{{Address}}` - Client address
- [ ] `{{Pincode}}` - Client postal code
- [ ] `{{Amount}}` - Settlement amount in numbers
- [ ] `{{AmountInWords}}` - Settlement amount in words (e.g., "Ten Thousand Only")
- [ ] `{{FirstPartyName}}` - Signatory name from your company
- [ ] `{{SecondCompany}}` - Client company/individual identifier
- [ ] `{{SecondPartyName}}` - Client signatory name
- [ ] `{{InstallmentDetails}}` - Full installment details
- [ ] `{{InstallmentAmount}}` - Individual installment amount
- [ ] `{{InstallmentDate}}` - Individual installment date

## Phase 7: Test ✅
- [ ] Backend server is running
- [ ] Go to Agreement Generation tab in frontend
- [ ] Fill in all required fields (marked with *)
- [ ] Click "Generate"
- [ ] Watch the loading message say "Fetching Template from Google Docs..."
- [ ] Wait for PDF to generate (may take 3-5 seconds first time)
- [ ] Verify PDF shows your data filled in
- [ ] Click "EXECUTE & DOWNLOAD"
- [ ] Check downloaded PDF - all placeholders should be replaced

## 🎉 Success Indicators
- ✅ Loading message mentions "Google Docs"
- ✅ PDF generates without errors
- ✅ All form fields appear in the PDF
- ✅ Download works correctly

## 🆘 Troubleshooting Checklist

### If you see "Google Docs API not configured"
- [ ] Check `.env` - is `GOOGLE_SERVICE_ACCOUNT_JSON` filled in?
- [ ] Is it the complete JSON content (all on one line)?
- [ ] Have you restarted the backend server?
- [ ] Is there any special character that needs escaping?

### If you see "Permission denied"
- [ ] Verify service account email is shared in Google Docs
- [ ] Make sure it's **Viewer** access (not Editor/Owner)
- [ ] Try sharing with the exact email from JSON's "client_email" field

### If you see "Document not found"
- [ ] Check the document ID in `.env`
- [ ] Verify the document still exists and is accessible
- [ ] Confirm you copied the ID correctly from the URL

### If PDF shows empty placeholders
- [ ] Check placeholder spelling in Google Docs matches exactly (case-sensitive)
- [ ] Make sure placeholders are on one line (not wrapped)
- [ ] Verify you filled all required fields in the form

### If backend server won't start
- [ ] Check `.env` syntax - there shouldn't be quotes around the JSON
- [ ] The entire JSON should be the value after the `=`
- [ ] Check for any unclosed brackets or quotes

## 📞 Quick Help
- **Setup Guide**: See `GOOGLE_DOCS_SETUP.md` for detailed instructions
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md` for technical overview
- **Backend Logs**: Check terminal logs for specific error messages

---
**Difficulty Level**: Medium (mainly setup)  
**Time Estimate**: 10-15 minutes  
**No Coding Required**: Pure configuration setup
