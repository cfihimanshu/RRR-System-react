const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization'] || req.headers['x-access-token'];
  if (!token) return res.status(403).json({ error: "No token provided" });

  try {
    const tokenParts = token.split(' ');
    const decoded = jwt.verify(tokenParts[tokenParts.length - 1], process.env.JWT_SECRET);
    
    const User = require('../sql_models/User');
    const user = await User.findByPk(decoded.id, { attributes: ['passwordVersion'] });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tokenPasswordVersion = decoded.passwordVersion || 0;
    const dbPasswordVersion = user.passwordVersion || 0;
    if (dbPasswordVersion !== tokenPasswordVersion) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = decoded;
    if (req.user && (req.user.role === 'Super Admin' || req.user.role === 'SuperAdmin')) {
      req.user.role = 'Admin';
      req.user.isSuperAdmin = true;
    }
    
    // Update lastSeen asynchronously
    User.update({ lastSeen: new Date() }, { where: { id: decoded.id } }).catch(err => console.error('Failed to update lastSeen:', err));

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { verifyToken };
