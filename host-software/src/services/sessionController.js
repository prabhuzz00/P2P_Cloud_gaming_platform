const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const logger = require('../utils/logger');

class SessionController {
  constructor() {
    this.currentProcess = null;
    this.currentGame = null;
  }

  async launchGame(exePath, gameMetadata = null) {
    if (!exePath) {
      throw new Error('Executable path is required to launch a game.');
    }

    if (!fs.existsSync(exePath)) {
      throw new Error(`Game executable was not found: ${exePath}`);
    }

    if (this.currentProcess) {
      throw new Error('Another game is already running.');
    }

    const child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: false,
      stdio: 'ignore',
    });

    this.currentProcess = child;
    this.currentGame = {
      id: gameMetadata?.id || null,
      name: gameMetadata?.name || path.basename(exePath, path.extname(exePath)),
      exePath,
      pid: child.pid,
      startedAt: new Date().toISOString(),
    };

    child.on('exit', (code, signal) => {
      logger.info('Game process exited.', { code, signal, exePath });
      this.currentProcess = null;
      this.currentGame = null;
    });

    child.on('error', (error) => {
      logger.error('Failed to launch game process.', error);
      this.currentProcess = null;
      this.currentGame = null;
    });

    logger.info('Launched game process.', this.currentGame);
    return this.currentGame;
  }

  async terminateGame() {
    if (!this.currentProcess || !this.currentGame) {
      return false;
    }

    const pid = this.currentProcess.pid;
    try {
      if (process.platform === 'win32') {
        await new Promise((resolve, reject) => {
          const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F']);
          killer.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`taskkill exited with ${code}`))));
          killer.on('error', reject);
        });
      } else {
        process.kill(pid, 'SIGTERM');
      }

      logger.info('Terminated running game.', { pid, exePath: this.currentGame.exePath });
    } finally {
      this.currentProcess = null;
      this.currentGame = null;
    }

    return true;
  }

  async enableKioskMode() {
    logger.info('Enable kiosk mode requested.');

    if (process.platform === 'win32') {
      try {
        // Hide taskbar by setting auto-hide via registry (non-destructive)
        const { execSync } = require('child_process');

        // Disable keyboard shortcuts that could escape the game (Win key, Alt+Tab, etc.)
        // Using a low-level keyboard hook would require a native module.
        // For now, we use the registry to set ForegroundLockTimeout to prevent focus stealing.
        execSync(
          'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAutoHideInDesktopMode /t REG_DWORD /d 1 /f',
          { stdio: 'ignore' }
        );

        logger.info('Kiosk mode enabled: taskbar set to auto-hide.');
      } catch (err) {
        logger.warn('Failed to enable kiosk mode (non-critical).', err.message);
      }
    }

    return true;
  }

  async disableKioskMode() {
    logger.info('Disable kiosk mode requested.');

    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');

        // Restore taskbar visibility
        execSync(
          'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAutoHideInDesktopMode /t REG_DWORD /d 0 /f',
          { stdio: 'ignore' }
        );

        logger.info('Kiosk mode disabled: taskbar restored.');
      } catch (err) {
        logger.warn('Failed to disable kiosk mode (non-critical).', err.message);
      }
    }

    return true;
  }

  getCurrentGame() {
    return this.currentGame;
  }

  async forceStopAll() {
    return this.terminateGame();
  }
}

module.exports = { SessionController };
