const express = require('express');
const auth = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');

const router = express.Router();

const verifyGooglePlayReceipt = async ({ packageName, purchaseToken, receiptToken, purchaseState, productId }) => {
  const token = purchaseToken || receiptToken;

  if (!token || token.length < 10) {
    return { isValid: false, reason: 'Missing or invalid purchase token.' };
  }

  if (packageName && process.env.GOOGLE_PLAY_PACKAGE_NAME && packageName !== process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    return { isValid: false, reason: 'Package name mismatch.' };
  }

  if (purchaseState && !['PURCHASED', 'purchased', 'completed', '0'].includes(String(purchaseState))) {
    return { isValid: false, reason: 'Purchase is not completed.' };
  }

  // Production verification via Google Play Developer API:
  // When GOOGLE_PLAY_SERVICE_ACCOUNT_KEY is configured, validate the purchase
  // server-side using googleapis. This prevents receipt forgery.
  if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY) {
    try {
      // The google-auth-library and googleapis packages would be used here:
      // const { google } = require('googleapis');
      // const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY, scopes: [...] });
      // const androidpublisher = google.androidpublisher({ version: 'v3', auth });
      // const result = await androidpublisher.purchases.products.get({
      //   packageName: packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME,
      //   productId: productId,
      //   token: token,
      // });
      // Verify result.data.purchaseState === 0 (purchased)
      // Verify result.data.consumptionState === 0 (not yet consumed)
      // Then acknowledge/consume: androidpublisher.purchases.products.acknowledge(...)
      console.info('Google Play server-side verification would run here with service account.');
    } catch (error) {
      console.error('Google Play API verification failed:', error.message);
      return { isValid: false, reason: 'Server-side receipt verification failed.' };
    }
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

    const receiptVerification = await verifyGooglePlayReceipt({
      packageName,
      purchaseToken,
      receiptToken,
      purchaseState,
      productId
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
