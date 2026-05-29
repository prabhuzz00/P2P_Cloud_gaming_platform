const express = require('express');
const auth = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');

const router = express.Router();

const verifyGooglePlayReceipt = ({ packageName, purchaseToken, receiptToken, purchaseState }) => {
  const token = purchaseToken || receiptToken;

  if (!token || token.length < 10) {
    return { isValid: false, reason: 'Missing or invalid purchase token.' };
  }

  if (packageName && process.env.GOOGLE_PLAY_PACKAGE_NAME && packageName !== process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    return { isValid: false, reason: 'Package name mismatch.' };
  }

  if (purchaseState && !['PURCHASED', 'purchased', 'completed'].includes(purchaseState)) {
    return { isValid: false, reason: 'Purchase is not completed.' };
  }

  return { isValid: true, normalizedReference: token };
};

router.get('/balance', auth, async (req, res) => {
  try {
    const result = await query('SELECT token_balance FROM users WHERE id = $1', [req.user.id]);
    return res.json({ token_balance: result.rows[0]?.token_balance ?? 0 });
  } catch (error) {
    console.error('Get token balance error:', error);
    return res.status(500).json({ error: 'Failed to fetch token balance.' });
  }
});

router.post('/purchase', auth, async (req, res) => {
  try {
    const { tokens, packageName, purchaseToken, receiptToken, productId, purchaseState } = req.body;
    const amount = Number.parseInt(tokens, 10);

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'tokens must be a positive integer.' });
    }

    const receiptVerification = verifyGooglePlayReceipt({
      packageName,
      purchaseToken,
      receiptToken,
      purchaseState
    });

    if (!receiptVerification.isValid) {
      return res.status(400).json({ error: receiptVerification.reason });
    }

    const balance = await withTransaction(async (client) => {
      const duplicate = await client.query(
        `SELECT id
         FROM transactions
         WHERE type = 'purchase' AND reference_id = $1
         LIMIT 1`,
        [receiptVerification.normalizedReference]
      );

      if (duplicate.rowCount > 0) {
        throw Object.assign(new Error('Purchase token has already been used.'), { statusCode: 409 });
      }

      const updatedUser = await client.query(
        `UPDATE users
         SET token_balance = token_balance + $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING token_balance`,
        [req.user.id, amount]
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, reference_id)
         VALUES ($1, 'purchase', $2, $3, $4)`,
        [
          req.user.id,
          amount,
          `Google Play purchase${productId ? ` for ${productId}` : ''}`,
          receiptVerification.normalizedReference
        ]
      );

      return updatedUser.rows[0].token_balance;
    });

    return res.status(201).json({ message: 'Tokens credited successfully.', token_balance: balance });
  } catch (error) {
    console.error('Purchase tokens error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to purchase tokens.' });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT *
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

module.exports = router;
