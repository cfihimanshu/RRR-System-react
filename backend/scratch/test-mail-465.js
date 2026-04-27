const nodemailer = require('nodemailer');
require('dotenv').config();

async function test() {
    console.log('Testing SMTP with Port 465 (Secure)...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP Connection Successful on 465');
    } catch (error) {
        console.error('❌ SMTP Connection Failed on 465:', error.message);
    }
}

test();
