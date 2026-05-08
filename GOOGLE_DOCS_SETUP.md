# Google Docs Agreement Integration Setup Guide

## Overview
The agreement generation system now fetches templates directly from Google Docs instead of using HTML files. This allows you to:
- Edit agreements visually in Google Docs
- Maintain version history automatically
- Share templates with team members
- Apply professional formatting easily

## Setup Steps

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Google Docs API**:
   - Search for "Google Docs API"
   - Click "Enable"

### Step 2: Create a Service Account
1. In Google Cloud Console, go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in service account details:
   - Service Account Name: `rrr-agreement-generator`
   - Click "Create and Continue"
4. Skip the optional steps and click "Done"

### Step 3: Generate Service Account Key
1. Go to **APIs & Services > Service Accounts**
2. Click on the service account you just created
3. Go to the **Keys** tab
4. Click **Add Key > Create new key**
5. Choose **JSON** and click **Create**
6. A JSON file will download automatically

### Step 4: Set Environment Variables
1. Open your `.env` file in the backend folder
2. Open the downloaded JSON file with a text editor
3. Copy the entire JSON content (including the `{}` brackets)
4. In `.env`, set:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON=<paste the entire JSON here>
   ```

Example (with truncated values):
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"my-project","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...","client_email":"rrr-agreement@my-project.iam.gserviceaccount.com","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/..."}
```

### Step 5: Share Google Docs Template with Service Account
1. Open your Google Docs agreement template
2. Click **Share**
3. Copy the service account email from your downloaded JSON (looks like: `rrr-agreement@my-project.iam.gserviceaccount.com`)
4. Paste it in the share dialog and grant **Viewer** access
5. In your `.env`, also add the Google Docs ID:
   ```
   GOOGLE_DOCS_AGREEMENT_TEMPLATE_ID=1XlkI7KkF0YgYM1ZDu-FusPi_nY4lT5Hr68SbCOPB3bA
   ```
   (You can get this from the document URL: `docs.google.com/document/d/TEMPLATE_ID/edit`)

### Step 6: Update Your Google Docs Template
In your Google Docs document, add these placeholders where you want dynamic data:
- `{{Date}}`
- `{{FirstPartyCompany}}`
- `{{ClientName}}`
- `{{Address}}`
- `{{Pincode}}`
- `{{Amount}}`
- `{{AmountInWords}}`
- `{{InstallmentCountWords}}`
- `{{InstallmentCountNumber}}`
- `{{InstallmentPlural}}`
- `{{InstallmentDetails}}`
- `{{FirstPartyName}}`
- `{{SecondCompany}}`
- `{{SecondPartyName}}`

## Fallback Behavior
If Google Docs credentials are not configured, the system automatically falls back to using the HTML template (`backend/templates/agreement_template.html`). This ensures the system continues to work even if Google Docs API is not set up.

## How It Works
1. User fills the agreement form in the frontend
2. Frontend sends form data to backend's `/agreements/generate` endpoint
3. Backend fetches the Google Docs template using the provided template ID
4. Backend replaces placeholders with form data
5. Backend converts the document to PDF using `html-pdf`
6. PDF is sent to the user for download

## Troubleshooting

### "GOOGLE_SERVICE_ACCOUNT_JSON not configured"
- Check if you've properly set the `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env`
- Restart the backend server after updating `.env`
- Ensure the JSON is on a single line (no line breaks except within the key/cert)

### "Document not found" or "Permission denied"
- Verify the document ID is correct
- Ensure the service account email has access to the Google Docs document
- Check that you shared the document with the service account email address

### PDF formatting issues
- Google Docs API returns content structure, not exact formatting
- For complex layouts, use HTML/CSS in the document that converts well to PDF
- Test with a simple template first

## Creating a New Template
1. Create a new Google Docs document
2. Add your agreement content and design
3. Insert placeholders like `{{ClientName}}`, `{{Amount}}`, etc.
4. Share with the service account
5. Get the document ID from the URL
6. Add the ID to your frontend form or `.env`

## Support for Multiple Templates
The frontend already supports multiple templates via `templateId` field in the form. You can:
1. Create multiple Google Docs templates
2. Allow users to select which template to use
3. Pass different template IDs to the backend

The backend will automatically fetch and use the correct template based on the `templateId` provided.
