const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { query } = require('../config/database');
const { isUuid } = require('../utils/helpers');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { host_id, name, icon_url = null, exe_path } = req.body;

    if (!isUuid(host_id) || !name || !exe_path) {
      return res.status(400).json({ error: 'host_id, name and exe_path are required.' });
    }

    const host = await query('SELECT id FROM hosts WHERE id = $1 AND owner_user_id = $2', [host_id, req.user.id]);

    if (host.rowCount === 0) {
      return res.status(404).json({ error: 'Host not found.' });
    }

    const result = await query(
      `INSERT INTO games (id, host_id, name, icon_url, exe_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), host_id, name, icon_url, exe_path]
    );

    return res.status(201).json({ game: result.rows[0] });
  } catch (error) {
    console.error('Create game error:', error);
    return res.status(500).json({ error: 'Failed to add game.' });
  }
});

router.get('/host/:hostId', async (req, res) => {
  try {
    const { hostId } = req.params;

    if (!isUuid(hostId)) {
      return res.status(400).json({ error: 'Invalid host id.' });
    }

    const result = await query(
      `SELECT *
       FROM games
       WHERE host_id = $1
       ORDER BY created_at DESC`,
      [hostId]
    );

    return res.json({ games: result.rows });
  } catch (error) {
    console.error('List games error:', error);
    return res.status(500).json({ error: 'Failed to fetch games.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon_url, exe_path } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid game id.' });
    }

    const existing = await query(
      `SELECT g.*
       FROM games g
       JOIN hosts h ON h.id = g.host_id
       WHERE g.id = $1 AND h.owner_user_id = $2`,
      [id, req.user.id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const current = existing.rows[0];
    const result = await query(
      `UPDATE games
       SET name = $2,
           icon_url = $3,
           exe_path = $4
       WHERE id = $1
       RETURNING *`,
      [id, name || current.name, icon_url !== undefined ? icon_url : current.icon_url, exe_path || current.exe_path]
    );

    return res.json({ game: result.rows[0] });
  } catch (error) {
    console.error('Update game error:', error);
    return res.status(500).json({ error: 'Failed to update game.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid game id.' });
    }

    const result = await query(
      `DELETE FROM games g
       USING hosts h
       WHERE g.host_id = h.id
         AND g.id = $1
         AND h.owner_user_id = $2
       RETURNING g.id`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    return res.json({ message: 'Game removed successfully.' });
  } catch (error) {
    console.error('Delete game error:', error);
    return res.status(500).json({ error: 'Failed to delete game.' });
  }
});

module.exports = router;
