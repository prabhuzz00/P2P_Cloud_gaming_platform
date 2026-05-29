const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { withTransaction, query } = require('../config/database');
const { isUuid, toInteger } = require('../utils/helpers');

module.exports = ({ rentalManager }) => {
  const router = express.Router();

  router.post('/', auth, async (req, res) => {
    try {
      const { host_id, slot_count = 1 } = req.body;
      const slotCount = Math.max(toInteger(slot_count, 1), 1);

      if (!isUuid(host_id)) {
        return res.status(400).json({ error: 'Valid host_id is required.' });
      }

      const session = await withTransaction(async (client) => {
        const hostResult = await client.query(
          `SELECT *
           FROM hosts
           WHERE id = $1
           FOR UPDATE`,
          [host_id]
        );

        if (hostResult.rowCount === 0) {
          throw Object.assign(new Error('Host not found.'), { statusCode: 404 });
        }

        const host = hostResult.rows[0];

        if (!host.is_verified || !host.is_available || !host.is_online || host.is_rented) {
          throw Object.assign(new Error('Host is not available for rent.'), { statusCode: 409 });
        }

        if (host.owner_user_id === req.user.id) {
          throw Object.assign(new Error('You cannot rent your own host.'), { statusCode: 400 });
        }

        const configResult = await client.query(
          `SELECT *
           FROM rental_config
           ORDER BY updated_at DESC
           LIMIT 1`
        );
        const config = configResult.rows[0];
        const tokensRequired = config.price_per_slot * slotCount;

        const userResult = await client.query(
          `SELECT id, token_balance, is_banned
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [req.user.id]
        );
        const user = userResult.rows[0];

        if (!user || user.is_banned) {
          throw Object.assign(new Error('User account is not eligible to rent.'), { statusCode: 403 });
        }

        if (user.token_balance < tokensRequired) {
          throw Object.assign(new Error('Insufficient tokens.'), { statusCode: 402 });
        }

        const sessionId = uuidv4();
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + slotCount * config.slot_duration_minutes * 60 * 1000);

        await client.query(
          `UPDATE users
           SET token_balance = token_balance - $2,
               updated_at = NOW()
           WHERE id = $1`,
          [req.user.id, tokensRequired]
        );

        await client.query(
          `UPDATE hosts
           SET is_rented = true,
               is_available = false,
               updated_at = NOW()
           WHERE id = $1`,
          [host_id]
        );

        const sessionResult = await client.query(
          `INSERT INTO sessions (id, host_id, renter_user_id, start_time, end_time, status, tokens_spent)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)
           RETURNING *`,
          [sessionId, host_id, req.user.id, startTime, endTime, tokensRequired]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, reference_id)
           VALUES ($1, 'rental', $2, $3, $4)`,
          [req.user.id, -tokensRequired, `Rental payment for host ${host.name}`, sessionId]
        );

        return sessionResult.rows[0];
      });

      rentalManager.scheduleSession(session.id, session.end_time);

      return res.status(201).json({ session });
    } catch (error) {
      console.error('Create session error:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create session.' });
    }
  });

  router.post('/:id/extend', auth, async (req, res) => {
    try {
      const { id } = req.params;
      const { slot_count = 1 } = req.body;
      const slotCount = Math.max(toInteger(slot_count, 1), 1);

      if (!isUuid(id)) {
        return res.status(400).json({ error: 'Invalid session id.' });
      }

      const session = await withTransaction(async (client) => {
        const sessionResult = await client.query(
          `SELECT *
           FROM sessions
           WHERE id = $1 AND renter_user_id = $2
           FOR UPDATE`,
          [id, req.user.id]
        );

        if (sessionResult.rowCount === 0) {
          throw Object.assign(new Error('Session not found.'), { statusCode: 404 });
        }

        const currentSession = sessionResult.rows[0];

        if (currentSession.status !== 'active') {
          throw Object.assign(new Error('Only active sessions can be extended.'), { statusCode: 409 });
        }

        const configResult = await client.query(
          `SELECT *
           FROM rental_config
           ORDER BY updated_at DESC
           LIMIT 1`
        );
        const config = configResult.rows[0];
        const extraCost = config.price_per_slot * slotCount;

        const userResult = await client.query(
          `SELECT token_balance
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [req.user.id]
        );

        if (userResult.rows[0].token_balance < extraCost) {
          throw Object.assign(new Error('Insufficient tokens to extend session.'), { statusCode: 402 });
        }

        const newEndTime = new Date(new Date(currentSession.end_time).getTime() + slotCount * config.slot_duration_minutes * 60 * 1000);

        await client.query(
          `UPDATE users
           SET token_balance = token_balance - $2,
               updated_at = NOW()
           WHERE id = $1`,
          [req.user.id, extraCost]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, reference_id)
           VALUES ($1, 'rental', $2, $3, $4)`,
          [req.user.id, -extraCost, `Session extension for ${id}`, id]
        );

        const updated = await client.query(
          `UPDATE sessions
           SET end_time = $2,
               tokens_spent = tokens_spent + $3
           WHERE id = $1
           RETURNING *`,
          [id, newEndTime, extraCost]
        );

        return updated.rows[0];
      });

      rentalManager.scheduleSession(session.id, session.end_time);

      return res.json({ session });
    } catch (error) {
      console.error('Extend session error:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to extend session.' });
    }
  });

  router.post('/:id/end', auth, async (req, res) => {
    try {
      const { id } = req.params;

      if (!isUuid(id)) {
        return res.status(400).json({ error: 'Invalid session id.' });
      }

      const result = await query(
        `SELECT id
         FROM sessions
         WHERE id = $1 AND renter_user_id = $2`,
        [id, req.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      const session = await rentalManager.completeSession(id);
      return res.json({ session });
    } catch (error) {
      console.error('End session error:', error);
      return res.status(500).json({ error: error.message || 'Failed to end session.' });
    }
  });

  router.get('/active', auth, async (req, res) => {
    try {
      const result = await query(
        `SELECT s.*, h.name AS host_name
         FROM sessions s
         JOIN hosts h ON h.id = s.host_id
         WHERE s.renter_user_id = $1
           AND s.status = 'active'
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [req.user.id]
      );

      return res.json({ session: result.rows[0] || null });
    } catch (error) {
      console.error('Get active session error:', error);
      return res.status(500).json({ error: 'Failed to fetch active session.' });
    }
  });

  router.get('/history', auth, async (req, res) => {
    try {
      const result = await query(
        `SELECT s.*, h.name AS host_name
         FROM sessions s
         JOIN hosts h ON h.id = s.host_id
         WHERE s.renter_user_id = $1
         ORDER BY s.created_at DESC`,
        [req.user.id]
      );

      return res.json({ sessions: result.rows });
    } catch (error) {
      console.error('Get session history error:', error);
      return res.status(500).json({ error: 'Failed to fetch session history.' });
    }
  });

  return router;
};
