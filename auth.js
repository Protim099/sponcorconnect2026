const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

/**
 * Verify JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

/**
 * Role-based access: pass allowed roles as arguments
 * Usage: authorize('admin', 'sponsor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
