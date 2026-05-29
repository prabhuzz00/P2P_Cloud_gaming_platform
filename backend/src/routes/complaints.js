const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { query } = require('../config/database');
const { isUuid } = require('../utils/helpers');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { session_id = null, host_id = null, description } = req.body;

    if (!description || (!session_id && !host_id)) {
      return res.status(400).json({ error: 'description and session_id or host_id are required.' });
    }

    if ((session_id && !isUuid(session_id)) || (host_id && !isUuid(host_id))) {
      return res.status(400).json({ error: 'Invalid session_id or host_id.' });
    }

    const result = await query(
      `INSERT INTO complaints (id, user_id, session_id, host_id, description, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [uuidv4(), req.user.id, session_id, host_id, description]
    );

    return res.status(201).json({ complaint: result.rows[0] });
  } catch (error) {
    console.error('Submit complaint error:', error);
    return res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT *
       FROM complaints
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ complaints: result.rows });
  } catch (error) {
    console.error('List complaints error:', error);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

module.exports = router;
