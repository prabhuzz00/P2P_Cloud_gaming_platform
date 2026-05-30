const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const logger = require('../utils/logger');

const fetchJson = async (url, options = {}) => {
  const { default: fetch } = await import('node-fetch');
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
};

class GameLibrary {
  resolveDataDirectory() {
    try {
      const { app } = require('electron');
      if (app?.isReady?.()) {
        return path.join(app.getPath('userData'), 'host-data');
      }
    } catch (_error) {
    }

    return path.join(process.cwd(), '.host-data');
  }

  async getGamesFilePath() {
    const directory = this.resolveDataDirectory();
    await fs.mkdir(directory, { recursive: true });
    return path.join(directory, 'games.json');
  }

  async loadGames() {
    const gamesFilePath = await this.getGamesFilePath();

    try {
      const raw = await fs.readFile(gamesFilePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to read games file.', error);
      }
      await fs.writeFile(gamesFilePath, '[]', 'utf8');
      return [];
    }
  }

  async saveGames(games) {
    const gamesFilePath = await this.getGamesFilePath();
    await fs.writeFile(gamesFilePath, JSON.stringify(games, null, 2), 'utf8');
  }

  async walkForExecutables(directoryPath) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...await this.walkForExecutables(entryPath));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        results.push({
          name: path.basename(entry.name, path.extname(entry.name)),
          exePath: entryPath,
          iconPath: '',
        });
      }
    }

    return results;
  }

  async scanDirectory(directoryPath) {
    try {
      const scannedGames = await this.walkForExecutables(directoryPath);
      logger.info('Scanned directory for game executables.', { directoryPath, found: scannedGames.length });
      return scannedGames;
    } catch (error) {
      logger.error('Failed to scan directory for games.', error);
      throw error;
    }
  }

  async addGame(game) {
    if (!game?.exePath) {
      throw new Error('A game executable path is required.');
    }

    const games = await this.loadGames();
    const existing = games.find((entry) => entry.exePath === game.exePath);
    if (existing) {
      return existing;
    }

    const savedGame = {
      id: randomUUID(),
      name: game.name || path.basename(game.exePath, path.extname(game.exePath)),
      exePath: game.exePath,
      iconPath: game.iconPath || '',
      createdAt: new Date().toISOString(),
    };

    games.push(savedGame);
    await this.saveGames(games);
    logger.info('Added game to local library.', savedGame);
    return savedGame;
  }

  async removeGame(id) {
    const games = await this.loadGames();
    const nextGames = games.filter((game) => game.id !== id);

    if (nextGames.length === games.length) {
      return false;
    }

    await this.saveGames(nextGames);
    logger.info('Removed game from local library.', { id });
    return true;
  }

  async getGames() {
    return this.loadGames();
  }

  async syncWithBackend(hostId, serverUrl = 'http://localhost:3000', authToken = null) {
    if (!hostId || !serverUrl) {
      return false;
    }

    serverUrl = serverUrl.replace(/\/+$/, '');

    const headers = {};
    if (authToken) {
      headers['Authorization'] = "Bearer " + authToken;
    }

    try {
      const games = await this.loadGames();
      for (const game of games) {
        await fetchJson(`${serverUrl}/api/games`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ host_id: hostId, name: game.name, exe_path: game.exePath || game.exe_path }),
        });
      }
      logger.info('Synced game library with backend.', { hostId, count: games.length });
      return true;
    } catch (error) {
      logger.warn('Game library sync failed.', error.message);
      return false;
    }
  }
}

module.exports = new GameLibrary();
