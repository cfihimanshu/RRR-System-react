const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');


const { verifyToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

const router = express.Router();

const getDeviceDetails = (userAgentString) => {
  if (!userAgentString) return 'Unknown Device';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/windows/i.test(userAgentString)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgentString)) os = 'Mac OS';
  else if (/android/i.test(userAgentString)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgentString)) os = 'iOS';
  else if (/linux/i.test(userAgentString)) os = 'Linux';

  if (/chrome|crios/i.test(userAgentString) && !/edge|edg/i.test(userAgentString) && !/opr/i.test(userAgentString)) browser = 'Chrome';
  else if (/safari/i.test(userAgentString) && !/chrome|crios/i.test(userAgentString)) browser = 'Safari';
  else if (/firefox|fxios/i.test(userAgentString)) browser = 'Firefox';
  else if (/edge|edg/i.test(userAgentString)) browser = 'Edge';
  else if (/opr/i.test(userAgentString)) browser = 'Opera';
  
  return `${browser} on ${os}`;
};

const logAuthAudit = async (req, userEmail, userRole, category, descriptionBase) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipAddress = rawIp.split(',')[0].trim();
    const userAgentRaw = req.headers['user-agent'] || '';
    const deviceDetails = getDeviceDetails(userAgentRaw);
    
    await AuditLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: userEmail,
      role: userRole,
      category: category,
      description: `${descriptionBase} | Device: ${deviceDetails} | IP: ${ipAddress}`,
      caseId: '',
      ipAddress: ipAddress,
      userAgent: deviceDetails
    });
  } catch (err) {
    console.error('Audit Log creation failed:', err);
  }
};

router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const tokenName = user.fullName || user.name || "User";
    const token = jwt.sign({ 
      id: user._id, 
      email: user.email, 
      role: user.role, 
      fullName: tokenName,
      canAccessRecords: user.canAccessRecords,
      passwordVersion: user.passwordVersion || 0
    }, process.env.JWT_SECRET, { expiresIn: '6h' });

    await logAuthAudit(req, user.email, user.role, 'Login', 'User logged in');

    // Ensure we send back a name even for older users
    const displayName = user.fullName || user.name || "";

    res.json({ 
      token, 
      role: user.role, 
      email: user.email, 
      fullName: displayName,
      canAccessRecords: user.canAccessRecords
    });
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

// Logout route to track audit log
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await logAuthAudit(req, req.user.email, req.user.role, 'Logout', 'User logged out');
    res.json({ message: 'Logged out successfully' });
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
      fullName: finalName,
      canAccessRecords: role === 'Admin' // Admins get access by default
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
          <p>Please log in at: <a href="${process.env.FRONTEND_URL || 'https://www.cfi247.com'}">RRR Engine Dashboard</a></p>
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

    await logAuthAudit(req, req.user.email, req.user.role, 'User Management', `Created user ${email} (${finalName}) with role ${role}`);

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to create user" });
  }
});

// Get all users for assignment dropdown (Admin/Operations only)
router.get('/users', verifyToken, roleGuard(['Admin', 'Operations']), async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email role canAccessRecords').sort({ fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a user's role (Admin only)
router.put('/users/:id/role', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!['Admin', 'Operations', 'Staff', 'Reviewer', 'Accountant', 'Legal', 'Super Admin', 'SuperAdmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

    userToUpdate.role = role;
    await userToUpdate.save();

    await logAuthAudit(req, req.user.email, req.user.role, 'User Management', `Updated role for ${userToUpdate.email} to ${role}`);

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Records module access (Admin only)
router.put('/users/:id/records-access', verifyToken, roleGuard(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { canAccessRecords } = req.body;
    
    const userToUpdate = await User.findById(id);
    if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

    userToUpdate.canAccessRecords = canAccessRecords;
    await userToUpdate.save();

    await logAuthAudit(req, req.user.email, req.user.role, 'User Management', `Updated Records access for ${userToUpdate.email} to ${canAccessRecords}`);

    res.json({ message: `Records access ${canAccessRecords ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password (Logged-in user)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordVersion = (user.passwordVersion || 0) + 1;
    await user.save();

    await logAuthAudit(req, user.email, user.role, 'Security', 'User changed their password');

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password (request reset)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User with this email not found' });

    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    user.password = hashedPassword;
    user.passwordVersion = (user.passwordVersion || 0) + 1;
    await user.save();

    // Send the temporary password via email
    try {
      const subject = '🔐 Password Reset - RRR Engine';
      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d97706;">Password Reset Request</h2>
          <p>Hello <strong>${user.fullName || 'User'}</strong>,</p>
          <p>You have requested a password reset. Below is your temporary login password:</p>
          <div style="background: #fff7ed; padding: 15px; border: 1px solid #ffedd5; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #d97706;">${tempPassword}</p>
          </div>
          <p style="color: #ef4444; font-weight: bold;">Important: Please log in using this temporary password and change it immediately from your dashboard security settings.</p>
          <p style="color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
            If you did not request this, please contact your Administrator immediately.
          </p>
        </div>
      `;
      await sendEmail(email, subject, '', html);
      console.log(`Password reset email sent to ${email}`);
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      return res.status(500).json({ error: 'Failed to send reset email. Please contact Admin.' });
    }

    await logAuthAudit(req, email, user.role, 'Security', 'User requested password reset (Temporary password sent)');

    res.json({ message: 'Temporary password sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
