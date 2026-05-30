# P2P Cloud Gaming Platform

A production-ready peer-to-peer cloud gaming platform with PC renting system. Stream games from Windows PCs to Android devices with ultra-low latency (<50ms).

[![CI/CD Pipeline](https://github.com/prabhuzz00/P2P_Cloud_gaming_platform/actions/workflows/ci.yml/badge.svg)](https://github.com/prabhuzz00/P2P_Cloud_gaming_platform/actions/workflows/ci.yml)

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Admin Panel │     │  Backend Server   │     │ Host Software│
│  (React Web) │◄───►│  (Node.js API)    │◄───►│  (Electron)  │
└──────────────┘     │  + WebSocket      │     └──────────────┘
                     │  + PostgreSQL     │            ▲
                     └────────┬─────────┘            │
                              │                WebRTC Streaming
                              │                      │
                     ┌────────▼─────────┐            ▼
                     │   Client App     │────────────┘
                     │   (Android)      │
                     └──────────────────┘
```

## 📦 Components

### 1. Backend Server (`/backend`)
- **Tech**: Node.js, Express, PostgreSQL, WebSocket
- **Features**: Auth (JWT), Host Registry, Rental Manager, Token/Wallet System, WebRTC Signaling, Admin API
- **Production**: Dockerized, graceful shutdown, health checks, structured logging, compression, rate limiting
- **Port**: 3000

### 2. Admin Panel (`/admin-panel`)
- **Tech**: React, Tailwind CSS, Recharts
- **Features**: Dashboard, Host/User Management, Transactions, Complaints, Rental Config
- **Production**: Nginx-served static build, gzip compression, security headers
- **Port**: 3001 (80 in Docker)

### 3. Host Software (`/host-software`)
- **Tech**: Electron, WebRTC (stub), WebSocket
- **Features**: Game Library Manager, QR Pairing, Streaming Engine (NVENC stub), Input Injection (ViGEmBus stub), Session Controller, Auto-start

### 4. Client App (`/client-app`)
- **Tech**: Kotlin, Jetpack Compose, WebRTC
- **Features**: QR Pairing, Game Streaming, Gamepad Overlay (Xbox/PS3), Discover & Rent PCs, Token System, Bluetooth Controller Support

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis (optional, for session caching)

### Backend Server
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
psql -d p2p_gaming -f src/db/schema.sql
npm run dev
```

### Admin Panel
```bash
cd admin-panel
npm install
npm start
# Opens at http://localhost:3001
```

### Host Software
```bash
cd host-software
npm install
npm start
# Launches Electron app
```

### Client App (Android)
```bash
cd client-app
# Open in Android Studio
# Build with: ./gradlew assembleDebug
```

---

## 🐳 Production Deployment (Docker)

### Prerequisites
- Docker 24+ and Docker Compose v2
- A server with at least 2GB RAM

### Quick Deploy

```bash
# 1. Clone the repository
git clone https://github.com/prabhuzz00/P2P_Cloud_gaming_platform.git
cd P2P_Cloud_gaming_platform

# 2. Create environment file
cp .env.example .env
# Edit .env with secure production values (see below)

# 3. Start all services
docker compose up -d

# 4. Verify deployment
curl http://localhost:3000/health
```

### Production Environment Configuration

Edit `.env` with secure values:

```bash
# Generate secure secrets
openssl rand -hex 32  # Use for JWT_SECRET
openssl rand -hex 32  # Use for JWT_REFRESH_SECRET

# Set a strong database password
DB_PASSWORD=your-very-secure-password

# Set allowed CORS origins
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com

# Configure TURN server for WebRTC NAT traversal
TURN_SERVER_URL=turn:turn.yourdomain.com:3478
TURN_USERNAME=your-turn-user
TURN_CREDENTIAL=your-turn-password
```

### Docker Compose Services

| Service | Container | Port | Health Check |
|---------|-----------|------|--------------|
| PostgreSQL | p2p-gaming-db | 5432 | `pg_isready` |
| Backend API | p2p-gaming-backend | 3000 | `GET /health` |
| Admin Panel | p2p-gaming-admin | 3001 → 80 | HTTP check |

### Common Docker Commands

```bash
# View logs
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database)
docker compose down -v

# Scale backend (if using load balancer)
docker compose up -d --scale backend=3
```

---

## 🔧 Production Configuration Guide

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Set to `production` for production |
| `PORT` | No | `3000` | Backend server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `DATABASE_SSL` | No | `false` | Enable SSL for database |
| `JWT_SECRET` | Yes | — | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for refresh tokens |
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated CORS origins |
| `TURN_SERVER_URL` | Recommended | — | TURN server for WebRTC |
| `TURN_USERNAME` | With TURN | — | TURN server credentials |
| `TURN_CREDENTIAL` | With TURN | — | TURN server credentials |
| `GOOGLE_PLAY_PACKAGE_NAME` | For billing | — | Google Play package name |

### Security Checklist for Production

- [ ] Generate unique JWT secrets (min 32 chars, random)
- [ ] Set strong database password
- [ ] Enable `DATABASE_SSL=true` if connecting over network
- [ ] Configure `ALLOWED_ORIGINS` with only your domains
- [ ] Set up TURN server for reliable WebRTC connectivity
- [ ] Place behind reverse proxy (nginx/Cloudflare) with HTTPS
- [ ] Enable firewall — only expose ports 80/443
- [ ] Set up automated database backups
- [ ] Configure log aggregation (ELK, Datadog, etc.)
- [ ] Set up uptime monitoring on `/health` endpoint

### Reverse Proxy (nginx) Example

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for signaling
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## 🎮 How It Works

### For Host PC Owners:
1. Install Host Software on your Windows PC
2. Configure streaming settings (resolution, bandwidth)
3. Add games to your library (auto-detect or manual)
4. Generate QR code for pairing

### For Gamers (Android App):
1. Create an account
2. **Own PC**: Scan QR code to pair with your host PC, then stream games
3. **Rent a PC**: Browse available PCs on Discover page, check ping, book time slots with game tokens

### Rental Flow:
1. Host owner enables "Rent my PC" → Admin verifies
2. PC appears on Discover page for all users
3. Renter checks ping, books slots (₹40/30min default)
4. WebRTC connection established, host enters kiosk mode
5. On timeout: auto-disconnect, game force-stopped
6. Host earnings credited (minus platform commission)

---

## 🔒 Security

- **Server-side token validation** — Never trust client for financial logic
- **Google Play receipt verification** — Prevents fake purchases
- **JWT with short expiry (15min)** + refresh tokens (7d)
- **Rate limiting** — Prevents API abuse (100 req/15min general, 5 req/min auth)
- **Helmet security headers** — XSS, CSRF, clickjacking protection
- **Certificate pinning** — On Android client
- **Play Integrity API** — Anti-tamper detection
- **Kiosk mode** — Prevents desktop access during rental
- **Device fingerprinting** — Session binding
- **Graceful shutdown** — No dropped connections during deploys
- **Input validation** — SQL injection and XSS prevention via parameterized queries

---

## 📊 Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with token balances |
| `hosts` | Registered host PCs with specs |
| `games` | Games installed on hosts |
| `sessions` | Active/completed rental sessions |
| `transactions` | All financial transactions |
| `pairings` | User-to-host PC pairings |
| `complaints` | User complaints |
| `rental_config` | Pricing configuration |

---

## 🎯 Streaming Architecture

```
Host PC                          Client Android
┌─────────────┐                  ┌─────────────┐
│ Game Screen │                  │ Video Decode │
│   Capture   │──── WebRTC ────▶│  (MediaCodec)│
│ (NVENC H265)│   UDP/DTLS      │   Display    │
│             │                  │             │
│   Input     │◀── DataChannel ──│  Gamepad    │
│  Injection  │    (low-latency) │  Overlay    │
└─────────────┘                  └─────────────┘
```

**Latency Budget**: Capture (~2ms) + Encode (~4ms) + Network (~10-30ms) + Decode (~4ms) + Render (~4ms) = **~24-44ms** ✓

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh-token` | Refresh access token |

### Hosts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hosts` | Register a host PC |
| GET | `/api/hosts/my` | Get user's hosts |
| GET | `/api/hosts/discover` | Discover available hosts |
| PUT | `/api/hosts/:id` | Update host |
| PUT | `/api/hosts/:id/availability` | Toggle availability |
| GET | `/api/hosts/:id/status` | Get host status |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Start rental session |
| POST | `/api/sessions/:id/extend` | Extend session |
| POST | `/api/sessions/:id/end` | End session |
| GET | `/api/sessions/active` | Get active session |
| GET | `/api/sessions/history` | Get session history |

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens/balance` | Get token balance |
| POST | `/api/tokens/purchase` | Purchase tokens |
| GET | `/api/tokens/transactions` | Transaction history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/hosts` | All hosts |
| PUT | `/api/admin/hosts/:id/verify` | Verify/unverify host |
| GET | `/api/admin/users` | All users |
| PUT | `/api/admin/users/:id/ban` | Ban/unban user |
| GET | `/api/admin/sessions` | All sessions |
| GET | `/api/admin/transactions` | All transactions |
| GET | `/api/admin/complaints` | All complaints |
| PUT | `/api/admin/complaints/:id` | Respond to complaint |
| GET | `/api/admin/config` | Get rental config |
| PUT | `/api/admin/config` | Update rental config |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/ice-servers` | ICE/TURN config |
| POST | `/api/pairings` | Pair with host |
| GET | `/api/pairings` | Get pairings |
| DELETE | `/api/pairings/:id` | Remove pairing |
| POST | `/api/complaints` | Submit complaint |
| GET | `/api/complaints` | User's complaints |

---

## 🧪 CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **Backend CI**: Installs dependencies, runs database schema, performs smoke test
- **Admin Panel CI**: Installs dependencies, builds production bundle
- **Docker Build**: Verifies Docker images build successfully (on `main` branch)

---

## 📚 References

- [Sunshine by LizardByte](https://docs.lizardbyte.dev/projects/sunshine/latest/) — Streaming engine reference
- [Moonlight](https://moonlight-stream.org/) — Client streaming reference
- [ViGEmBus](https://github.com/ViGEm/ViGEmBus) — Virtual controller driver
- [Google Play Billing](https://developer.android.com/google/play/billing) — In-app purchase
- [Play Integrity API](https://developer.android.com/google/play/integrity) — Anti-tamper
- [Coturn](https://github.com/coturn/coturn) — TURN/STUN server

---

## 📋 Implementation Status

- [x] Backend Server (API, Auth, WebSocket Signaling)
- [x] Database Schema (PostgreSQL)
- [x] Admin Panel (Dashboard, Host/User/Session Management)
- [x] Host Software (Electron, Game Library, QR, Streaming Stub)
- [x] Client App (Android, Compose UI, WebRTC, Gamepad)
- [x] Docker containerization (Backend + Admin Panel + PostgreSQL)
- [x] CI/CD Pipeline (GitHub Actions)
- [x] Production hardening (graceful shutdown, health checks, logging, compression)
- [x] Environment configuration management
- [x] Security headers and rate limiting
- [ ] Production NVENC/AMF capture integration
- [ ] ViGEmBus real input injection
- [ ] TURN server deployment
- [ ] Play Store billing integration (live)
- [ ] Load testing & optimization
- [ ] Redis session caching
- [ ] Monitoring & alerting (Prometheus/Grafana)

---

## 📄 License

MIT
