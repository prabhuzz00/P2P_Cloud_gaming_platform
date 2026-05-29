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
    // A production Windows host would temporarily lock down shell shortcuts, hide the taskbar,
    // and suppress Alt+Tab / Win key input while a rental session is active.
    return true;
  }

  async disableKioskMode() {
    logger.info('Disable kiosk mode requested.');
    // This is where shell state, focus rules, and any temporary desktop restrictions would be restored.
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
