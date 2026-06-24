import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ec9439cfc6c796ae2029594d_jwt');
    
    // Check if it's admin role decoded from admin login
    if (decoded.role === 'admin') {
      req.user = { id: 'admin', username: 'admin1234', role: 'admin' };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ec9439cfc6c796ae2029594d_jwt');
      if (decoded.role === 'admin') {
        req.user = { id: 'admin', username: 'admin1234', role: 'admin' };
        return next();
      }
      const user = await User.findById(decoded.id).select('-password_hash');
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Fail silently for optional auth
    }
  }
  next();
};

export const sellerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'seller') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied, seller role required' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied, admin role required' });
  }
};

export const verifyToken = protect;
export const requireAdmin = adminOnly;
