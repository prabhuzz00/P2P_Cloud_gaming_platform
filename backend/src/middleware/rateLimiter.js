const rateLimit = require('express-rate-limit');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: IS_PRODUCTION ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health'
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: IS_PRODUCTION ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again shortly.' }
});

module.exports = {
  generalLimiter,
  authLimiter
};
