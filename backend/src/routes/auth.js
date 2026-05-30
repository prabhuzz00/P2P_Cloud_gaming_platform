const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/helpers');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body;

    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Valid email and password (min 6 chars) are required.' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const result = await query(
      `INSERT INTO users (id, email, password_hash, role, device_fingerprint)
       VALUES ($1, $2, $3, 'user', $4)
       RETURNING id, email, role, token_balance, is_banned, created_at`,
      [userId, email.toLowerCase(), passwordHash, deviceFingerprint || null]
    );

    const user = result.rows[0];

    return res.status(201).json({
      user,
      access_token: generateAccessToken(user),
      refresh_token: generateRefreshToken(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await query(
      `SELECT id, email, password_hash, role, token_balance, is_banned
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'This account is suspended.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        token_balance: user.token_balance,
        is_banned: user.is_banned
      },
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login.' });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token is required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await query(
      `SELECT id, email, role, token_balance, is_banned
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'This account is suspended.' });
    }

    return res.json({
      access_token: generateAccessToken(user)
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;
