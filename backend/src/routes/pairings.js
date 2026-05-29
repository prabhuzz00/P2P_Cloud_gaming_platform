const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { query } = require('../config/database');
const { isUuid } = require('../utils/helpers');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { host_id, pairing_token, custom_name = null } = req.body;

    if (!isUuid(host_id) || !pairing_token) {
      return res.status(400).json({ error: 'host_id and pairing_token are required.' });
    }

    const hostResult = await query(
      `SELECT id, owner_user_id, name
       FROM hosts
       WHERE id = $1 AND pairing_token = $2`,
      [host_id, pairing_token]
    );

    if (hostResult.rowCount === 0) {
      return res.status(404).json({ error: 'Invalid pairing credentials.' });
    }

    const existing = await query(
      `SELECT id
       FROM pairings
       WHERE user_id = $1 AND host_id = $2`,
      [req.user.id, host_id]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Host is already paired.' });
    }

    const result = await query(
      `INSERT INTO pairings (id, user_id, host_id, custom_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), req.user.id, host_id, custom_name]
    );

    return res.status(201).json({ pairing: result.rows[0] });
  } catch (error) {
    console.error('Pair host error:', error);
    return res.status(500).json({ error: 'Failed to pair host.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, h.name AS host_name, h.specs, h.is_online, h.is_available
       FROM pairings p
       JOIN hosts h ON h.id = p.host_id
       WHERE p.user_id = $1
       ORDER BY p.paired_at DESC`,
      [req.user.id]
    );

    return res.json({ pairings: result.rows });
  } catch (error) {
    console.error('List pairings error:', error);
    return res.status(500).json({ error: 'Failed to fetch pairings.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid pairing id.' });
    }

    const result = await query(
      `DELETE FROM pairings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pairing not found.' });
    }

    return res.json({ message: 'Pairing removed successfully.' });
  } catch (error) {
    console.error('Delete pairing error:', error);
    return res.status(500).json({ error: 'Failed to remove pairing.' });
  }
});

module.exports = router;
