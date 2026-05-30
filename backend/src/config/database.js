const { Pool } = require('pg');
require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Production pool settings
  max: IS_PRODUCTION ? 20 : 5,
  idleTimeoutMillis: IS_PRODUCTION ? 30000 : 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: IS_PRODUCTION ? 30000 : undefined,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error);
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection
};
