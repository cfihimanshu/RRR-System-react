const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('Mailer Init:', { 
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

const sendEmail = async (to, subject, text, html, attachments) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
      attachments,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
