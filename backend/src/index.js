require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

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
const { testConnection, pool } = require('./config/database');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const app = express();
const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isNaN(parsedPort) ? 3000 : parsedPort;

// Trust proxy in production (behind load balancer/nginx)
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ADMIN_PANEL_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true
  })
);

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// Request logging
if (IS_PRODUCTION) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint (no rate limiting)
app.get('/health', async (_req, res) => {
  const health = {
    status: 'ok',
    service: 'p2p-cloud-gaming-backend',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
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

  // Don't leak error details in production
  const message = IS_PRODUCTION ? 'Internal server error.' : error.message || 'Internal server error.';
  return res.status(500).json({ error: message });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed.');
  });

  // Stop rental manager
  rentalManager.stop();
  console.log('Rental manager stopped.');

  // Close WebSocket connections
  signalingServer.wss.close(() => {
    console.log('WebSocket server closed.');
  });

  // Close database pool
  try {
    await pool.end();
    console.log('Database pool closed.');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }

  // Force exit after timeout
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 30000).unref();

  process.exit(0);
};

const validateEnvironment = () => {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    if (IS_PRODUCTION) {
      console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.warn(`WARNING: Missing environment variables: ${missing.join(', ')}. Check backend/.env.example`);
  }

  if (IS_PRODUCTION && process.env.JWT_SECRET === 'your-secret-key') {
    console.error('FATAL: Default JWT_SECRET detected in production. Set a secure secret.');
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    validateEnvironment();

    try {
      await testConnection();
      console.log('Connected to PostgreSQL.');
    } catch (databaseError) {
      if (IS_PRODUCTION) {
        console.error('FATAL: Database connection failed:', databaseError.message);
        process.exit(1);
      }
      console.warn('Database connection check failed. Server will still start:', databaseError.message || databaseError.code || 'unknown database error');
    }

    try {
      await rentalManager.start();
    } catch (rentalManagerError) {
      console.warn('Rental manager startup failed. Background timeout enforcement is disabled:', rentalManagerError.message || rentalManagerError.code || 'unknown rental manager error');
    }

    server.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT} [${NODE_ENV}]`);
      console.log(`WebSocket signaling endpoint available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (IS_PRODUCTION) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (IS_PRODUCTION) {
    process.exit(1);
  }
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
