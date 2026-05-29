const { query, withTransaction } = require('../config/database');

class RentalManager {
  constructor({ signalingServer, checkIntervalMs = 60 * 1000 }) {
    this.signalingServer = signalingServer;
    this.checkIntervalMs = checkIntervalMs;
    this.interval = null;
    this.sessionTimers = new Map();
  }

  async start() {
    await this.bootstrapActiveSessions();
    this.interval = setInterval(() => {
      this.checkExpiredSessions().catch((error) => {
        console.error('Failed to enforce rental timeouts:', error);
      });
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    for (const timer of this.sessionTimers.values()) {
      clearTimeout(timer);
    }

    this.sessionTimers.clear();
  }

  async bootstrapActiveSessions() {
    const result = await query(
      `SELECT id, end_time
       FROM sessions
       WHERE status = 'active'`
    );

    result.rows.forEach((session) => this.scheduleSession(session.id, session.end_time));
  }

  scheduleSession(sessionId, endTime) {
    this.clearSessionTimer(sessionId);

    const delay = Math.max(new Date(endTime).getTime() - Date.now(), 0);
    const maxDelay = 2_147_483_647;

    const timer = setTimeout(() => {
      this.expireSession(sessionId).catch((error) => {
        console.error(`Failed to auto-expire session ${sessionId}:`, error);
      });
    }, Math.min(delay, maxDelay));

    this.sessionTimers.set(sessionId, timer);
  }

  clearSessionTimer(sessionId) {
    const timer = this.sessionTimers.get(sessionId);

    if (timer) {
      clearTimeout(timer);
      this.sessionTimers.delete(sessionId);
    }
  }

  async checkExpiredSessions() {
    const result = await query(
      `SELECT id
       FROM sessions
       WHERE status = 'active'
         AND end_time <= NOW()`
    );

    for (const session of result.rows) {
      await this.expireSession(session.id);
    }
  }

  async expireSession(sessionId) {
    return this.finalizeSession(sessionId, 'expired', 'Rental session expired automatically.');
  }

  async completeSession(sessionId) {
    return this.finalizeSession(sessionId, 'completed', 'Rental session ended successfully.');
  }

  async cancelSession(sessionId) {
    return this.finalizeSession(sessionId, 'cancelled', 'Rental session was cancelled.');
  }

  async finalizeSession(sessionId, status, notificationMessage) {
    this.clearSessionTimer(sessionId);

    return withTransaction(async (client) => {
      const sessionResult = await client.query(
        `SELECT s.*, h.owner_user_id, h.is_online, h.is_verified
         FROM sessions s
         JOIN hosts h ON h.id = s.host_id
         WHERE s.id = $1
         FOR UPDATE`,
        [sessionId]
      );

      if (sessionResult.rowCount === 0) {
        throw new Error('Session not found.');
      }

      const session = sessionResult.rows[0];

      if (session.status !== 'active') {
        return session;
      }

      const configResult = await client.query(
        `SELECT price_per_slot, slot_duration_minutes, platform_commission_percent
         FROM rental_config
         ORDER BY updated_at DESC
         LIMIT 1`
      );

      const config = configResult.rows[0] || {
        price_per_slot: 40,
        slot_duration_minutes: 30,
        platform_commission_percent: 20
      };

      const hostEarning = Math.max(
        Math.floor(session.tokens_spent * ((100 - config.platform_commission_percent) / 100)),
        0
      );

      await client.query(
        `UPDATE sessions
         SET status = $2,
             end_time = CASE WHEN $2 = 'completed' THEN NOW() ELSE end_time END
         WHERE id = $1`,
        [sessionId, status]
      );

      await client.query(
        `UPDATE hosts
         SET is_rented = false,
             is_available = CASE WHEN is_online AND is_verified THEN true ELSE false END,
             updated_at = NOW()
         WHERE id = $1`,
        [session.host_id]
      );

      const existingEarning = await client.query(
        `SELECT 1 FROM transactions WHERE type = 'earning' AND reference_id = $1 LIMIT 1`,
        [sessionId]
      );

      if (hostEarning > 0 && existingEarning.rowCount === 0) {
        await client.query(
          `UPDATE users
           SET token_balance = token_balance + $2,
               updated_at = NOW()
           WHERE id = $1`,
          [session.owner_user_id, hostEarning]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, description, reference_id)
           VALUES ($1, 'earning', $2, $3, $4)`,
          [session.owner_user_id, hostEarning, `Host earnings for session ${sessionId}`, sessionId]
        );
      }

      this.signalingServer.notifyUser(session.renter_user_id, {
        type: 'session-end',
        payload: { sessionId, status, message: notificationMessage },
        sessionId,
        senderId: 'system'
      });

      this.signalingServer.notifyUser(session.owner_user_id, {
        type: 'session-end',
        payload: { sessionId, status, message: notificationMessage },
        sessionId,
        senderId: 'system'
      });

      return {
        ...session,
        status
      };
    });
  }
}

module.exports = RentalManager;
