const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// FORCE RE-READ .env to bypass any cached injections
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const smtpUser = envVars['SMTP_USER'] || process.env.SMTP_USER;
const smtpPass = envVars['SMTP_PASS'] || process.env.SMTP_PASS;

console.log('Mailer Force-Read Sync:', { 
  user: smtpUser, 
  passStart: smtpPass ? smtpPass.substring(0, 2) + '...' : 'NONE'
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
