const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const connectDB = require('../db');

const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();

router.post('/login', async (req, res) => {
  await connectDB(); // 🔥 MUST be here
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, fullName: user.fullName }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: user.email,
      role: user.role,
      category: 'Login',
      description: 'User logged in',
      caseId: ''
    });
    
    // Ensure we send back a name even for older users
    const displayName = user.fullName || user.name || "";
    
    res.json({ token, role: user.role, email: user.email, fullName: displayName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile from DB (to stay in sync with DB changes)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { sendEmail } = require('../utils/mailer');

router.post('/create-user', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { email, password, role, fullName, name } = req.body;
    
    // Support both keys for maximum compatibility
    const finalName = fullName || name || "New User";

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      email, 
      password: hashedPassword, 
      role, 
      fullName: finalName 
    });
    
    await newUser.save();

    // Send Welcome Email
    console.log('Attempting to send welcome email to:', email);
    try {
      const subject = 'Welcome to RRR Engine - Your Account Credentials';
      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1a73e8;">Welcome to RRR Engine</h2>
          <p>Hello <strong>${finalName}</strong>,</p>
          <p>Your account has been created by the Administrator. Below are your login credentials:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
          </div>
          <p>Please log in at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">RRR Engine Dashboard</a></p>
          <p style="color: #666; font-size: 12px; border-top: 1px solid #eee; pt: 10px; margin-top: 20px;">
            Note: This is an automated message. Please change your password after your first login for security.
          </p>
        </div>
      `;
      sendEmail(email, subject, '', html)
        .then(() => console.log('Welcome email queued successfully'))
        .catch(e => console.error('Welcome Email Error:', e));

      // Notify other Admins about new user creation
      const admins = await User.find({ role: 'Admin' });
      const adminEmails = admins.map(u => u.email).join(',');
      if (adminEmails) {
        console.log('Attempting to notify admins:', adminEmails);
        sendEmail(adminEmails, '👤 New User Created in System', `
          <h3>New User Notification</h3>
          <p>A new user account has been created by ${req.user.email}.</p>
          <ul>
            <li><strong>Name:</strong> ${finalName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Role:</strong> ${role}</li>
          </ul>
        `)
          .then(() => console.log('Admin notification queued successfully'))
          .catch(e => console.error('Admin Notification Error:', e));
      }
    } catch (mailErr) {
      console.error('Failed to prepare emails:', mailErr);
    }

    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      category: 'User Management',
      description: `Created user ${email} (${finalName}) with role ${role}`,
      caseId: ''
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to create user" });
  }
});

// Get all users for assignment dropdown (Admin/Operations only)
router.get('/users', verifyToken, roleGuard(['Admin', 'Operations']), async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email role').sort({ fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
