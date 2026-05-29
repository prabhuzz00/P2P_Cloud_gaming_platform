const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { query } = require('../config/database');
const { createQrPayload, generatePairingToken, isUuid } = require('../utils/helpers');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, specs = {}, streaming_config = {}, port_range = null } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Host name is required.' });
    }

    const hostId = uuidv4();
    const pairingToken = generatePairingToken();

    const result = await query(
      `INSERT INTO hosts (id, owner_user_id, name, specs, streaming_config, port_range, pairing_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [hostId, req.user.id, name, specs, streaming_config, port_range, pairingToken]
    );

    const host = result.rows[0];

    return res.status(201).json({
      host,
      qr_payload: createQrPayload({ hostId, pairingToken })
    });
  } catch (error) {
    console.error('Create host error:', error);
    return res.status(500).json({ error: 'Failed to register host.' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT *
       FROM hosts
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ hosts: result.rows });
  } catch (error) {
    console.error('Get my hosts error:', error);
    return res.status(500).json({ error: 'Failed to fetch hosts.' });
  }
});

router.get('/discover', async (_req, res) => {
  try {
    const result = await query(
      `SELECT h.id, h.name, h.specs, h.streaming_config, h.port_range, h.created_at,
              u.id AS owner_user_id, u.email AS owner_email
       FROM hosts h
       JOIN users u ON u.id = h.owner_user_id
       WHERE h.is_verified = true
         AND h.is_available = true
         AND h.is_online = true
         AND h.is_rented = false
       ORDER BY h.updated_at DESC`
    );

    return res.json({ hosts: result.rows });
  } catch (error) {
    console.error('Discover hosts error:', error);
    return res.status(500).json({ error: 'Failed to discover hosts.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specs, streaming_config, port_range, is_online, regenerate_pairing_token } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid host id.' });
    }

    const existing = await query('SELECT * FROM hosts WHERE id = $1 AND owner_user_id = $2', [id, req.user.id]);

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    const current = existing.rows[0];
    const pairingToken = regenerate_pairing_token ? generatePairingToken() : current.pairing_token;

    const result = await query(
      `UPDATE hosts
       SET name = $3,
           specs = $4,
           streaming_config = $5,
           port_range = $6,
           is_online = COALESCE($7, is_online),
           pairing_token = $8,
           updated_at = NOW()
       WHERE id = $1 AND owner_user_id = $2
       RETURNING *`,
      [
        id,
        req.user.id,
        name || current.name,
        specs !== undefined ? specs : current.specs,
        streaming_config !== undefined ? streaming_config : current.streaming_config,
        port_range !== undefined ? port_range : current.port_range,
        typeof is_online === 'boolean' ? is_online : null,
        pairingToken
      ]
    );

    return res.json({
      host: result.rows[0],
      qr_payload: createQrPayload({ hostId: id, pairingToken })
    });
  } catch (error) {
    console.error('Update host error:', error);
    return res.status(500).json({ error: 'Failed to update host.' });
  }
});

router.put('/:id/availability', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid host id.' });
    }

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean.' });
    }

    const existing = await query('SELECT * FROM hosts WHERE id = $1 AND owner_user_id = $2', [id, req.user.id]);

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    const host = existing.rows[0];

    if (is_available && (!host.is_verified || !host.is_online || host.is_rented)) {
      return res.status(409).json({ error: 'Only verified, online, unrented hosts can be made available.' });
    }

    const result = await query(
      `UPDATE hosts
       SET is_available = $3,
           updated_at = NOW()
       WHERE id = $1 AND owner_user_id = $2
       RETURNING *`,
      [id, req.user.id, is_available]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    return res.json({ host: result.rows[0] });
  } catch (error) {
    console.error('Toggle host availability error:', error);
    return res.status(500).json({ error: 'Failed to update host availability.' });
  }
});

router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid host id.' });
    }

    const result = await query(
      `SELECT id, is_verified, is_available, is_online, is_rented, updated_at
       FROM hosts
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    return res.json({ status: result.rows[0] });
  } catch (error) {
    console.error('Get host status error:', error);
    return res.status(500).json({ error: 'Failed to fetch host status.' });
  }
});

module.exports = router;
