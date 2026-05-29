const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../config/database');
const { isUuid, toInteger } = require('../utils/helpers');

const router = express.Router();

router.use(auth, adminAuth);

router.get('/dashboard', async (_req, res) => {
  try {
    const [users, hosts, activeSessions, revenue] = await Promise.all([
      query('SELECT COUNT(*)::int AS total_users FROM users'),
      query('SELECT COUNT(*)::int AS total_hosts FROM hosts'),
      query(`SELECT COUNT(*)::int AS active_sessions FROM sessions WHERE status = 'active'`),
      query(`SELECT COALESCE(SUM(amount), 0)::int AS revenue FROM transactions WHERE type = 'purchase'`)
    ]);

    return res.json({
      total_users: users.rows[0].total_users,
      total_hosts: hosts.rows[0].total_hosts,
      active_sessions: activeSessions.rows[0].active_sessions,
      revenue: revenue.rows[0].revenue
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

router.get('/hosts', async (_req, res) => {
  try {
    const result = await query(
      `SELECT h.*, u.email AS owner_email
       FROM hosts h
       JOIN users u ON u.id = h.owner_user_id
       ORDER BY h.created_at DESC`
    );

    return res.json({ hosts: result.rows });
  } catch (error) {
    console.error('Admin hosts error:', error);
    return res.status(500).json({ error: 'Failed to fetch hosts.' });
  }
});

router.put('/hosts/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    if (!isUuid(id) || typeof is_verified !== 'boolean') {
      return res.status(400).json({ error: 'Valid host id and is_verified boolean are required.' });
    }

    const result = await query(
      `UPDATE hosts
       SET is_verified = $2,
           is_available = CASE WHEN $2 = false THEN false ELSE is_available END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, is_verified]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    return res.json({ host: result.rows[0] });
  } catch (error) {
    console.error('Verify host error:', error);
    return res.status(500).json({ error: 'Failed to update host verification.' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, email, role, token_balance, is_banned, device_fingerprint, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json({ users: result.rows });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.put('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body;

    if (!isUuid(id) || typeof is_banned !== 'boolean') {
      return res.status(400).json({ error: 'Valid user id and is_banned boolean are required.' });
    }

    const result = await query(
      `UPDATE users
       SET is_banned = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, role, token_balance, is_banned`,
      [id, is_banned]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Ban user error:', error);
    return res.status(500).json({ error: 'Failed to update user suspension.' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const { type, userId, from, to } = req.query;
    const values = [];
    const filters = [];

    if (type) {
      values.push(type);
      filters.push(`t.type = $${values.length}`);
    }

    if (userId) {
      if (!isUuid(userId)) {
        return res.status(400).json({ error: 'Invalid userId.' });
      }
      values.push(userId);
      filters.push(`t.user_id = $${values.length}`);
    }

    if (from) {
      values.push(from);
      filters.push(`t.created_at >= $${values.length}`);
    }

    if (to) {
      values.push(to);
      filters.push(`t.created_at <= $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await query(
      `SELECT t.*, u.email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      values
    );

    return res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Admin transactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

router.get('/sessions', async (_req, res) => {
  try {
    const result = await query(
      `SELECT s.*, h.name AS host_name, u.email AS renter_email
       FROM sessions s
       JOIN hosts h ON h.id = s.host_id
       JOIN users u ON u.id = s.renter_user_id
       ORDER BY s.created_at DESC`
    );

    return res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Admin sessions error:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

router.get('/complaints', async (_req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.email, h.name AS host_name
       FROM complaints c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN hosts h ON h.id = c.host_id
       ORDER BY c.created_at DESC`
    );

    return res.json({ complaints: result.rows });
  } catch (error) {
    console.error('Admin complaints error:', error);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

router.put('/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    const allowedStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];

    if (!isUuid(id) || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid complaint id and status are required.' });
    }

    const result = await query(
      `UPDATE complaints
       SET status = $2,
           admin_response = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, admin_response || null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    return res.json({ complaint: result.rows[0] });
  } catch (error) {
    console.error('Respond complaint error:', error);
    return res.status(500).json({ error: 'Failed to update complaint.' });
  }
});

router.get('/config', async (_req, res) => {
  try {
    const result = await query(
      `SELECT *
       FROM rental_config
       ORDER BY updated_at DESC
       LIMIT 1`
    );

    return res.json({ config: result.rows[0] });
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({ error: 'Failed to fetch rental config.' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const { price_per_slot, slot_duration_minutes, platform_commission_percent } = req.body;

    const price = toInteger(price_per_slot, NaN);
    const duration = toInteger(slot_duration_minutes, NaN);
    const commission = toInteger(platform_commission_percent, NaN);

    if (![price, duration, commission].every(Number.isInteger)) {
      return res.status(400).json({ error: 'All config values must be integers.' });
    }

    const result = await query(
      `UPDATE rental_config
       SET price_per_slot = $1,
           slot_duration_minutes = $2,
           platform_commission_percent = $3,
           updated_at = NOW()
       WHERE id = (SELECT id FROM rental_config ORDER BY updated_at DESC LIMIT 1)
       RETURNING *`,
      [price, duration, commission]
    );

    return res.json({ config: result.rows[0] });
  } catch (error) {
    console.error('Update config error:', error);
    return res.status(500).json({ error: 'Failed to update rental config.' });
  }
});

module.exports = router;
