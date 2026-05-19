const jwt = require('jsonwebtoken');
const Author = require('../models/Author');
const Admin = require('../models/Admin');
const { verifyToken } = require('../utils/jwt');

const extractToken = (req) => {
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const authenticate = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided, Please login first' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};  

const authorOnly = async (req, res, next) => {
  try {
    authenticate(req, res, async () => {
      if (req.user.role !== 'author') {
        return res.status(403).json({ success: false, message: 'Author access required' });
      }
      const author = await Author.findOne({ author_id: req.user.id }).populate('books');
      if (!author) {
        return res.status(403).json({ success: false, message: 'Author account not found' });
      }
      req.author = author;
      next();
    });
  } catch (err) {
    next(err);
  }
};

const adminOnly = async (req, res, next) => {
  try {
    authenticate(req, res, async () => {
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'support_agent') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      const admin = await Admin.findOne({ admin_id: req.user.id });
      if (!admin || !admin.is_active) {
        return res.status(403).json({ success: false, message: 'Admin account not found or inactive' });
      }
      req.admin = admin;
      next();
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorOnly, adminOnly };