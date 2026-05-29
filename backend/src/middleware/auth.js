const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authorization token is required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.is_banned) {
      return res.status(403).json({ error: 'This account is suspended.' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
