# P2P Cloud Gaming Platform

A peer-to-peer cloud gaming platform with PC renting system. Stream games from Windows PCs to Android devices with ultra-low latency (<50ms).

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
- **Port**: 3000

### 2. Admin Panel (`/admin-panel`)
- **Tech**: React, Tailwind CSS, Recharts
- **Features**: Dashboard, Host/User Management, Transactions, Complaints, Rental Config
- **Port**: 3001

### 3. Host Software (`/host-software`)
- **Tech**: Electron, WebRTC (stub), WebSocket
- **Features**: Game Library Manager, QR Pairing, Streaming Engine (NVENC stub), Input Injection (ViGEmBus stub), Session Controller, Auto-start

### 4. Client App (`/client-app`)
- **Tech**: Kotlin, Jetpack Compose, WebRTC
- **Features**: QR Pairing, Game Streaming, Gamepad Overlay (Xbox/PS3), Discover & Rent PCs, Token System, Bluetooth Controller Support

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for session caching)

### Backend Server
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
# Run schema: psql -d p2p_gaming -f src/db/schema.sql
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
- **JWT with short expiry** + refresh tokens
- **Rate limiting** — Prevents API abuse
- **Certificate pinning** — On Android client
- **Play Integrity API** — Anti-tamper detection
- **Kiosk mode** — Prevents desktop access during rental
- **Device fingerprinting** — Session binding

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
- [ ] Production NVENC/AMF capture integration
- [ ] ViGEmBus real input injection
- [ ] TURN server deployment
- [ ] Play Store billing integration (live)
- [ ] Load testing & optimization

---

## 📄 License

MIT
