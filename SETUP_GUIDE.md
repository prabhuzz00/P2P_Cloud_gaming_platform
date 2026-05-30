# 🎮 P2P Cloud Gaming Platform — Complete Setup Guide (For Non-Coders)

This guide will walk you through setting up the entire P2P Cloud Gaming Platform from scratch. No coding experience needed — just follow each step carefully.

---

## 📋 Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [What You Need Before Starting](#what-you-need-before-starting)
3. [Option A: Easy Setup with Docker (Recommended)](#option-a-easy-setup-with-docker-recommended)
4. [Option B: Manual Setup (Without Docker)](#option-b-manual-setup-without-docker)
5. [Setting Up the Host Software (Windows PC)](#setting-up-the-host-software-windows-pc)
6. [Setting Up the Android Client App](#setting-up-the-android-client-app)
7. [Testing That Everything Works](#testing-that-everything-works)
8. [Common Problems & Solutions](#common-problems--solutions)
9. [Understanding Each Component](#understanding-each-component)

---

## What This Project Does

This platform lets you:
- **Stream games** from a Windows PC to an Android phone over the internet
- **Rent out your PC** to other gamers when you're not using it
- **Rent someone else's PC** to play games you don't have hardware for

It has 4 main parts:
| Component | What it does | Where it runs |
|-----------|-------------|---------------|
| **Backend Server** | Handles user accounts, payments, matchmaking | Your server (cloud or local) |
| **Admin Panel** | Website for managing users, hosts, complaints | Your browser |
| **Host Software** | Streams your PC's screen to players | Windows PC |
| **Client App** | Receives the game stream and sends controls | Android phone |

---

## What You Need Before Starting

### For the Server (Backend + Admin Panel):

| Software | What it is | Download Link |
|----------|-----------|---------------|
| **Git** | Tool to download the project code | https://git-scm.com/downloads |
| **Docker Desktop** | Runs the server in containers (easiest method) | https://www.docker.com/products/docker-desktop/ |

> **OR** if you don't want Docker:

| Software | What it is | Download Link |
|----------|-----------|---------------|
| **Node.js 20+** | Runs JavaScript code on your computer | https://nodejs.org/ (choose LTS version) |
| **PostgreSQL 16+** | Database to store all the data | https://www.postgresql.org/download/ |

### For the Host Software (Game Streaming PC):

| Software | What it is | Download Link |
|----------|-----------|---------------|
| **Node.js 20+** | Runs the host application | https://nodejs.org/ (choose LTS version) |
| **Windows 10/11** | Operating system (required) | — |

### For the Android Client App:

| Software | What it is | Download Link |
|----------|-----------|---------------|
| **Android Studio** | Builds the Android app | https://developer.android.com/studio |
| **Android phone or emulator** | To run the app | — |

---

## Option A: Easy Setup with Docker (Recommended)

This is the **easiest method**. Docker packages everything so you don't need to install PostgreSQL or Node.js separately for the server.

### Step 1: Install Docker Desktop

1. Go to https://www.docker.com/products/docker-desktop/
2. Download the version for your operating system (Windows/Mac/Linux)
3. Run the installer and follow the on-screen instructions
4. After installation, **restart your computer**
5. Open Docker Desktop and wait for it to say "Docker is running" (green icon in the bottom-left)

> **Windows users**: If asked about WSL 2, click "Yes" to install it. This is needed for Docker to work.

### Step 2: Install Git

1. Go to https://git-scm.com/downloads
2. Download and install Git for your operating system
3. Use all default settings during installation

### Step 3: Download the Project

1. Open **Terminal** (Mac/Linux) or **Command Prompt** (Windows)
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
2. Navigate to where you want the project:
   ```bash
   cd Desktop
   ```
3. Download the project:
   ```bash
   git clone https://github.com/prabhuzz00/P2P_Cloud_gaming_platform.git
   ```
4. Go into the project folder:
   ```bash
   cd P2P_Cloud_gaming_platform
   ```

### Step 4: Create Your Configuration File

1. Copy the example configuration file:
   - **Windows (Command Prompt)**:
     ```bash
     copy .env.example .env
     ```
   - **Mac/Linux (Terminal)**:
     ```bash
     cp .env.example .env
     ```

2. Open the `.env` file in a text editor:
   - **Windows**: Right-click `.env` → Open with → Notepad
   - **Mac**: Open with TextEdit
   - **Linux**: Open with any text editor

3. Change these values in the file (replace the text after `=`):

   ```bash
   # Change this to a strong password (make up any password you want)
   DB_PASSWORD=MySecurePassword123!

   # Change these to random text (type random characters - the longer the better)
   JWT_SECRET=aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5
   JWT_REFRESH_SECRET=zY9xW8vU7tS6rQ5pO4nM3lK2jI1hG0fE9dC8bA7

   # Leave everything else as-is for now
   ```

4. **Save and close the file**

> ⚠️ **Important**: The `DB_PASSWORD`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` values must NOT be left as the default example values. Use your own unique values.

### Step 5: Start Everything

1. Make sure Docker Desktop is running (check for the green icon)
2. In your Terminal/Command Prompt (still in the project folder), run:
   ```bash
   docker compose up -d
   ```
3. **Wait 1-2 minutes** for everything to download and start

   You'll see output like:
   ```
   [+] Running 3/3
    ✔ Container p2p-gaming-db       Started
    ✔ Container p2p-gaming-backend  Started
    ✔ Container p2p-gaming-admin    Started
   ```

### Step 6: Verify It's Working

1. Check the backend server health:
   - Open your web browser
   - Go to: http://localhost:3000/health
   - You should see: `{"status":"ok","timestamp":"...","uptime":...}`

2. Open the Admin Panel:
   - Go to: http://localhost:3001
   - You should see the admin login page

3. Check all containers are healthy:
   ```bash
   docker compose ps
   ```
   All services should show "healthy" in the STATUS column.

### 🎉 Done! Your server is now running!

### How to Stop the Server

```bash
docker compose down
```

### How to Start It Again Later

```bash
cd Desktop/P2P_Cloud_gaming_platform
docker compose up -d
```

### How to See Server Logs (If Something Goes Wrong)

```bash
docker compose logs -f
```
Press `Ctrl + C` to stop viewing logs.

---

## Option B: Manual Setup (Without Docker)

Use this method if you can't install Docker or prefer to run things directly.

### Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS** version (the one that says "Recommended for most users")
3. Run the installer with default settings
4. **Restart your Terminal/Command Prompt** after installation
5. Verify installation:
   ```bash
   node --version
   ```
   You should see something like `v20.x.x`

### Step 2: Install PostgreSQL

#### Windows:
1. Go to https://www.postgresql.org/download/windows/
2. Click "Download the installer"
3. Download the latest PostgreSQL 16 version
4. Run the installer:
   - Set a password for the `postgres` user (remember this!)
   - Keep the default port: `5432`
   - Click through with default settings
5. The installer will also install "pgAdmin" (a database management tool)

#### Mac:
1. Go to https://postgresapp.com/ and download Postgres.app
2. Move it to your Applications folder
3. Open it and click "Initialize" to create a database server

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 3: Create the Database

1. Open a terminal and connect to PostgreSQL:
   - **Windows**: Open "SQL Shell (psql)" from Start Menu
   - **Mac/Linux**: Run `psql -U postgres`

2. When prompted for a password, type the password you set during installation

3. Create the database:
   ```sql
   CREATE DATABASE p2p_gaming;
   CREATE USER p2p_gaming WITH PASSWORD 'your-password-here';
   GRANT ALL PRIVILEGES ON DATABASE p2p_gaming TO p2p_gaming;
   \c p2p_gaming
   GRANT ALL ON SCHEMA public TO p2p_gaming;
   \q
   ```
   > Replace `your-password-here` with a password you'll remember.

4. Load the database schema:
   - **Windows** (from Command Prompt, in the project folder):
     ```bash
     psql -U p2p_gaming -d p2p_gaming -f backend/src/db/schema.sql
     ```
   - **Mac/Linux**:
     ```bash
     psql -U p2p_gaming -d p2p_gaming -f backend/src/db/schema.sql
     ```
   When prompted, enter the password you created above.

### Step 4: Set Up the Backend Server

1. Open Terminal/Command Prompt and go to the backend folder:
   ```bash
   cd Desktop/P2P_Cloud_gaming_platform/backend
   ```

2. Copy the example configuration:
   - **Windows**:
     ```bash
     copy .env.example .env
     ```
   - **Mac/Linux**:
     ```bash
     cp .env.example .env
     ```

3. Open `backend/.env` in a text editor and update:
   ```bash
   NODE_ENV=development
   PORT=3000

   # Update this with your database password (replace your-password-here)
   DATABASE_URL=******localhost:5432/p2p_gaming
   DATABASE_SSL=false

   # Change these to random text
   JWT_SECRET=aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5
   JWT_REFRESH_SECRET=zY9xW8vU7tS6rQ5pO4nM3lK2jI1hG0fE9dC8bA7

   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```
   > Replace `your-password-here` with the database password from Step 3.

4. Install dependencies:
   ```bash
   npm install
   ```
   Wait for it to finish (may take 1-2 minutes).

5. Start the backend server:
   ```bash
   npm run dev
   ```
   You should see:
   ```
   Server running on port 3000
   Connected to PostgreSQL
   ```

> **Keep this terminal window open!** The server stops if you close it.

### Step 5: Set Up the Admin Panel

1. Open a **new** Terminal/Command Prompt window (keep the backend running)
2. Go to the admin panel folder:
   ```bash
   cd Desktop/P2P_Cloud_gaming_platform/admin-panel
   ```

3. Install dependencies:
   ```bash
   npm install
   ```
   Wait for it to finish (may take 2-3 minutes).

4. Start the admin panel:
   ```bash
   npm start
   ```
   - A browser window will automatically open at http://localhost:3000
   - If the port conflicts, it may ask to use port 3001 — type `Y` and press Enter

> **Keep this terminal window open too!**

### Step 6: Verify It's Working

1. Backend: Open http://localhost:3000/health in your browser
   - You should see: `{"status":"ok",...}`
2. Admin Panel: Check the browser window that opened automatically
   - You should see the admin login page

---

## Setting Up the Host Software (Windows PC)

The Host Software runs on the Windows PC that will stream games.

### Step 1: Install Node.js (if not already done)

Same as [Step 1 in Option B](#step-1-install-nodejs).

### Step 2: Install the Host Software

1. Open Command Prompt and go to the host software folder:
   ```bash
   cd Desktop/P2P_Cloud_gaming_platform/host-software
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   > Note: You might see warnings about optional dependencies (`robotjs`, `wrtc`). This is normal — they are optional and the software works without them.

3. Start the host software:
   ```bash
   npm start
   ```
   An Electron window will open — this is the Host Software application.

### What You'll See

The Host Software window has:
- **System Info**: Shows your PC's specs (CPU, GPU, RAM)
- **Game Library**: Where you add games installed on your PC
- **QR Code**: Used to pair your Android phone with this PC
- **Streaming Settings**: Configure resolution and bitrate

### Connecting to Your Server

By default, the host software connects to `localhost:3000`. If your backend server is running on a different machine, you'll need to update the server URL in the host software settings.

---

## Setting Up the Android Client App

### Step 1: Install Android Studio

1. Go to https://developer.android.com/studio
2. Download Android Studio for your operating system
3. Run the installer:
   - Accept the license agreements
   - Use default settings
   - Wait for the download of SDK components (this can take 10-20 minutes)

### Step 2: Open the Project

1. Open Android Studio
2. Click "Open" (not "New Project")
3. Navigate to: `Desktop/P2P_Cloud_gaming_platform/client-app`
4. Click "OK" to open
5. **Wait** — Android Studio will:
   - Download Gradle (the build tool)
   - Sync the project dependencies
   - Index all the files
   
   This can take **5-15 minutes** on first open. Look for the progress bar at the bottom.

### Step 3: Configure the Server URL

You need to tell the Android app where your backend server is running:

1. In Android Studio, find the file: `app/src/main/java/.../data/network/` or look for where the API base URL is configured
2. Change the server URL to:
   - If testing on the **same computer** (using Android emulator): `http://10.0.2.2:3000`
   - If testing on a **real phone on the same WiFi**: `http://YOUR_COMPUTER_IP:3000`
     - To find your IP: Windows → `ipconfig`, Mac → `ifconfig`, Linux → `ip addr`
   - If your server is on the **internet**: `https://your-domain.com`

### Step 4: Build and Run

#### Using an Emulator (No Physical Phone Needed):
1. In Android Studio, click "Device Manager" (phone icon on the right sidebar)
2. Click "Create Device"
3. Choose a phone (e.g., "Pixel 7") → Next
4. Download a system image (e.g., "API 34") → Next → Finish
5. Click the ▶️ (Play) button next to the emulator
6. Wait for it to boot up
7. Click the green ▶️ "Run" button at the top of Android Studio

#### Using a Real Phone:
1. On your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times (this enables Developer Options)
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"
2. Connect your phone to your computer with a USB cable
3. Accept the "Allow USB Debugging?" prompt on your phone
4. In Android Studio, your phone should appear in the device dropdown at the top
5. Click the green ▶️ "Run" button

### Step 5: Build an APK (to share with others)

1. In Android Studio menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build to complete
3. Click "locate" in the notification at the bottom
4. The APK file can be shared and installed on any Android phone

---

## Testing That Everything Works

### Test 1: Backend Health Check

Open in your browser: http://localhost:3000/health

✅ **Expected**: `{"status":"ok","timestamp":"...","uptime":...}`

❌ **If you see an error**: The backend isn't running. Check the terminal where you started it.

### Test 2: Register a User

Open Terminal/Command Prompt and run:
```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"TestPassword123\"}"
```

On **Windows PowerShell**, use:
```powershell
curl -Method POST http://localhost:3000/api/auth/register -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@example.com","password":"TestPassword123"}'
```

✅ **Expected**: A JSON response with user info and a token

❌ **If you see "connection refused"**: Backend isn't running

### Test 3: Admin Panel Login

1. First, you need to create an admin user. Connect to your database:
   - **Docker**: 
     ```bash
     docker compose exec postgres psql -U p2p_gaming -d p2p_gaming
     ```
   - **Manual setup**: 
     ```bash
     psql -U p2p_gaming -d p2p_gaming
     ```

2. Upgrade the test user to admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'test@example.com';
   \q
   ```

3. Go to http://localhost:3001 and log in with:
   - Email: `test@example.com`
   - Password: `TestPassword123`

✅ **Expected**: You should see the Admin Dashboard

### Test 4: Host Software Connection

1. Start the host software (`npm start` in the host-software folder)
2. The application should show "Connected" status when the backend is running

### Test 5: Full Flow

1. Register a user account (using curl or the Android app)
2. Register a host PC (using the Host Software)
3. Verify the host from the Admin Panel
4. Connect from the Android app using QR code pairing

---

## Common Problems & Solutions

### Problem: "docker compose" command not found

**Solution**: 
- Make sure Docker Desktop is installed and running
- Try `docker-compose` (with a hyphen) instead
- Restart your terminal after installing Docker

### Problem: "port 3000 already in use"

**Solution**: Something else is using port 3000. Either:
1. Stop the other program using that port
2. Or change the port in your `.env` file:
   ```bash
   BACKEND_PORT=3001
   ```

### Problem: "ECONNREFUSED" or "connection refused"

**Solution**: The backend server isn't running. Start it with:
- Docker: `docker compose up -d`
- Manual: `cd backend && npm run dev`

### Problem: "password authentication failed for user"

**Solution**: Your database password doesn't match. Double-check:
- The password in your `.env` file matches what you set for PostgreSQL
- In Docker: check `DB_PASSWORD` in the root `.env` file
- Manual: check `DATABASE_URL` in `backend/.env`

### Problem: "npm install" fails with errors

**Solution**:
1. Delete the `node_modules` folder and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   ```
   (Windows: `rmdir /s node_modules` and `del package-lock.json`)
2. Try again: `npm install`
3. If still failing, check your Node.js version: `node --version` (must be 20+)

### Problem: Docker containers keep restarting

**Solution**: Check the logs:
```bash
docker compose logs backend
```
Usually this means the database password is wrong or the database isn't ready yet. Wait 30 seconds and try `docker compose restart backend`.

### Problem: Admin Panel shows blank page

**Solution**:
- Make sure the backend is running first
- Check that `REACT_APP_API_URL` in your `.env` matches where the backend is running
- Clear browser cache (Ctrl+Shift+Delete) and refresh

### Problem: Android app can't connect to server

**Solution**:
- Make sure the backend is running
- If using emulator: use `http://10.0.2.2:3000` (not `localhost`)
- If using real phone: use your computer's IP address, and make sure both are on same WiFi
- Check that your computer's firewall isn't blocking port 3000

### Problem: Host Software won't start (Electron errors)

**Solution**:
1. Make sure you're running on Windows
2. Try reinstalling:
   ```bash
   cd host-software
   rm -rf node_modules
   npm install
   npm start
   ```

---

## Understanding Each Component

### 🖥️ Backend Server (`/backend`)

**What it does**: This is the "brain" of the platform. It:
- Manages user accounts (registration, login)
- Keeps track of which PCs are available for streaming
- Handles the rental system (booking, payments, sessions)
- Facilitates WebRTC connections between hosts and clients
- Provides APIs for all other components to communicate

**Technology**: Node.js with Express (a web framework), PostgreSQL (database)

**Key files**:
- `src/index.js` — Main entry point, starts the server
- `src/db/schema.sql` — Database structure definition
- `src/routes/` — API endpoint definitions

---

### 🌐 Admin Panel (`/admin-panel`)

**What it does**: A website for platform administrators to:
- View dashboard with statistics (users, revenue, active sessions)
- Manage users (ban/unban)
- Verify host PCs before they can be rented
- Handle user complaints
- Configure pricing (cost per slot, commission %)

**Technology**: React (UI framework), Tailwind CSS (styling)

**How it works**: It's a Single Page Application (SPA) that communicates with the Backend Server via API calls.

---

### 🎮 Host Software (`/host-software`)

**What it does**: Runs on the Windows PC that streams games:
- Captures the screen (using NVENC hardware encoder for low latency)
- Streams video to the connected client via WebRTC
- Receives input commands (keyboard, mouse, gamepad) from the client
- Manages the game library (detects installed games)
- Generates QR codes for easy pairing

**Technology**: Electron (desktop app framework), WebRTC (real-time streaming)

**Note**: The actual screen capture and input injection are currently stubs (placeholders) that will be replaced with real implementations using NVENC and ViGEmBus.

---

### 📱 Client App (`/client-app`)

**What it does**: The Android app that gamers use to:
- Create an account and buy game tokens
- Pair with their own PC (scan QR code) for personal streaming
- Browse and rent other people's PCs
- Receive the game stream and display it
- Send input using on-screen gamepad overlay or Bluetooth controller

**Technology**: Kotlin, Jetpack Compose (modern Android UI), WebRTC

---

## 🔐 Environment Variables Explained

Here's what each setting in the `.env` file means:

| Variable | Plain English Explanation |
|----------|--------------------------|
| `DB_USER` | Username for the database (like a login name) |
| `DB_PASSWORD` | Password for the database (keep this secret!) |
| `DB_PORT` | Which "door" the database uses (default 5432) |
| `JWT_SECRET` | A secret code used to create login tokens (like a signature stamp) |
| `JWT_REFRESH_SECRET` | Another secret code for renewing expired login tokens |
| `BACKEND_PORT` | Which "door" the server uses (default 3000) |
| `ALLOWED_ORIGINS` | Which websites are allowed to talk to your server |
| `ADMIN_PORT` | Which "door" the admin panel uses (default 3001) |
| `REACT_APP_API_URL` | Tells the admin panel where the server is |
| `TURN_SERVER_URL` | A relay server for when direct connections aren't possible |

---

## 📁 Project Folder Structure

```
P2P_Cloud_gaming_platform/
├── .env.example          ← Template for your configuration
├── .env                  ← Your actual configuration (you create this)
├── docker-compose.yml    ← Instructions for Docker to run everything
├── backend/              ← Server code
│   ├── src/
│   │   ├── index.js      ← Server entry point
│   │   ├── db/schema.sql ← Database tables definition
│   │   ├── routes/       ← API endpoints
│   │   └── middleware/   ← Security & auth checks
│   ├── Dockerfile        ← Instructions to build server container
│   └── package.json      ← List of dependencies
├── admin-panel/          ← Admin website code
│   ├── src/              ← React components
│   ├── Dockerfile        ← Instructions to build admin container
│   └── package.json      ← List of dependencies
├── host-software/        ← Windows streaming app code
│   ├── main.js           ← Electron entry point
│   ├── src/              ← Streaming & input logic
│   └── package.json      ← List of dependencies
└── client-app/           ← Android app code
    ├── app/src/          ← Kotlin/Compose code
    └── build.gradle.kts  ← Build configuration
```

---

## 🚀 Quick Reference Card

### Start everything (Docker):
```bash
cd P2P_Cloud_gaming_platform
docker compose up -d
```

### Stop everything (Docker):
```bash
docker compose down
```

### Start backend only (Manual):
```bash
cd backend
npm run dev
```

### Start admin panel only (Manual):
```bash
cd admin-panel
npm start
```

### Start host software:
```bash
cd host-software
npm start
```

### Check if server is running:
Open http://localhost:3000/health in your browser

### View logs (Docker):
```bash
docker compose logs -f backend
```

### Rebuild after code changes (Docker):
```bash
docker compose up -d --build
```

---

## 💡 Tips for Success

1. **Always start the backend FIRST** — everything else depends on it
2. **Keep terminal windows open** — closing them stops the services (for manual setup)
3. **Use Docker if possible** — it handles most complexity for you
4. **Check the logs** when something goes wrong — they usually tell you exactly what failed
5. **Make sure ports aren't blocked** — firewalls can prevent connections
6. **Back up your `.env` file** — it contains all your configuration

---

## 🆘 Getting Help

If you're stuck:
1. Check the [Common Problems](#common-problems--solutions) section above
2. Check Docker logs: `docker compose logs -f`
3. Make sure all services are running: `docker compose ps`
4. Verify your `.env` file has valid values (no default/example passwords)
5. Open an issue on the GitHub repository with:
   - What you tried
   - What error you see
   - Your operating system (Windows/Mac/Linux)
