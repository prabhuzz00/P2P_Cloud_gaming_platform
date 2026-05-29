const fs = require('fs/promises');
const path = require('path');

const logger = require('../utils/logger');

const defaultSettings = {
  resolution: '1920x1080',
  bandwidth: 15,
  portRange: {
    start: 47984,
    end: 48010,
  },
  autoStart: true,
  serverUrl: 'http://localhost:3000',
};

function resolveDataDirectory() {
  try {
    const { app } = require('electron');
    if (app?.isReady?.()) {
      return path.join(app.getPath('userData'), 'host-data');
    }
  } catch (_error) {
  }

  return path.join(process.cwd(), '.host-data');
}

async function ensureDataDirectory() {
  const directory = resolveDataDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

async function getSettingsPath() {
  return path.join(await ensureDataDirectory(), 'settings.json');
}

async function loadSettings() {
  const settingsPath = await getSettingsPath();

  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      portRange: {
        ...defaultSettings.portRange,
        ...(parsed.portRange || {}),
      },
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Failed to read settings file. Falling back to defaults.', error);
    }

    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    return { ...defaultSettings };
  }
}

async function saveSettings(nextSettings = {}) {
  const currentSettings = await loadSettings();
  const mergedSettings = {
    ...currentSettings,
    ...nextSettings,
    portRange: {
      ...currentSettings.portRange,
      ...(nextSettings.portRange || {}),
    },
  };

  const settingsPath = await getSettingsPath();
  await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
  logger.info('Saved host settings.', mergedSettings);
  return mergedSettings;
}

module.exports = {
  defaultSettings,
  loadSettings,
  saveSettings,
};
