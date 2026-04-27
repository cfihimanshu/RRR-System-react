const nodemailer = require('nodemailer');
require('dotenv').config();

async function test() {
    console.log('Testing SMTP with:', process.env.SMTP_USER);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP Connection Successful');
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
    }
}

test();
