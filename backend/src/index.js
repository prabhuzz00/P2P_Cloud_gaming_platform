require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const hostsRoutes = require('./routes/hosts');
const gamesRoutes = require('./routes/games');
const tokensRoutes = require('./routes/tokens');
const pairingsRoutes = require('./routes/pairings');
const complaintsRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const sessionsRoutesFactory = require('./routes/sessions');
const SignalingServer = require('./services/signalingServer');
const RentalManager = require('./services/rentalManager');
const { testConnection } = require('./config/database');

const app = express();
const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isNaN(parsedPort) ? 3000 : parsedPort;
const adminOrigin = process.env.ADMIN_PANEL_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === adminOrigin) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'p2p-cloud-gaming-backend' });
});

app.use('/api/auth', authLimiter, authRoutes);

const server = http.createServer(app);
const signalingServer = new SignalingServer({ server });
const rentalManager = new RentalManager({ signalingServer });

app.use('/api/hosts', hostsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/sessions', sessionsRoutesFactory({ rentalManager }));
app.use('/api/tokens', tokensRoutes);
app.use('/api/pairings', pairingsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);

// ICE server configuration endpoint - clients fetch this to know which STUN/TURN servers to use
const auth = require('./middleware/auth');
app.get('/api/ice-servers', auth, (_req, res) => {
  res.json({ iceServers: signalingServer.getIceServers() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled application error:', error);

  if (error.message === 'Origin not allowed by CORS.') {
    return res.status(403).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error.' });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET || !process.env.DATABASE_URL) {
      console.warn('Missing required environment variables. Check backend/.env.example before running in production.');
    }

    try {
      await testConnection();
      console.log('Connected to PostgreSQL.');
    } catch (databaseError) {
      console.warn('Database connection check failed. Server will still start:', databaseError.message || databaseError.code || 'unknown database error');
    }

    try {
      await rentalManager.start();
    } catch (rentalManagerError) {
      console.warn('Rental manager startup failed. Background timeout enforcement is disabled:', rentalManagerError.message || rentalManagerError.code || 'unknown rental manager error');
    }

    server.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT}`);
      console.log(`WebSocket signaling endpoint available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  server,
  startServer,
  signalingServer,
  rentalManager
};
