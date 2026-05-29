const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');

const logger = require('./src/utils/logger');
const settingsManager = require('./src/config/settings');
const hostManager = require('./src/services/hostManager');
const gameLibrary = require('./src/services/gameLibrary');
const { StreamingEngine } = require('./src/services/streamingEngine');
const { InputHandler } = require('./src/services/inputHandler');
const { SessionController } = require('./src/services/sessionController');
const qrGenerator = require('./src/services/qrGenerator');

let mainWindow;
let currentSettings;

const streamingEngine = new StreamingEngine();
const inputHandler = new InputHandler();
const sessionController = new SessionController();

function createWindow() {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function applyAutoStartSettings(settings) {
  try {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({
        openAtLogin: Boolean(settings.autoStart),
        path: process.execPath,
        args: [],
      });
    }
  } catch (error) {
    logger.error('Failed to update Windows startup registration.', error);
  }
}

function getHostSnapshot() {
  return {
    ...hostManager.getStatus(),
    currentGame: sessionController.getCurrentGame(),
  };
}

function broadcastStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('host-status-updated', getHostSnapshot());
}

async function bootstrapServices() {
  currentSettings = await settingsManager.loadSettings();
  applyAutoStartSettings(currentSettings);

  inputHandler.initialize();
  streamingEngine.initialize({
    resolution: currentSettings.resolution,
    bitrate: currentSettings.bandwidth * 1000,
  });

  const hostRegistration = await hostManager.registerHost(currentSettings);
  if (hostRegistration?.hostId) {
    await gameLibrary.syncWithBackend(hostRegistration.hostId, currentSettings.serverUrl);
  }

  hostManager.startHeartbeat();
  hostManager.connectSignaling(async (message) => {
    try {
      switch (message.type) {
        case 'offer': {
          const answer = await streamingEngine.handleOffer(message);
          await hostManager.sendSignalingMessage({
            type: 'answer',
            clientId: message.clientId,
            hostId: hostManager.getStatus().hostId,
            answer,
          });
          break;
        }
        case 'ice-candidate':
          await streamingEngine.handleIceCandidate(message.candidate);
          break;
        case 'input':
          inputHandler.handleInput(message.inputData);
          break;
        case 'availability':
          await hostManager.updateAvailability(Boolean(message.available));
          break;
        default:
          logger.info(`Unhandled signaling message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Failed to process signaling message.', error);
    } finally {
      broadcastStatus();
    }
  });

  broadcastStatus();
}

ipcMain.handle('get-settings', async () => settingsManager.loadSettings());

ipcMain.handle('save-settings', async (_event, nextSettings) => {
  currentSettings = await settingsManager.saveSettings(nextSettings);
  applyAutoStartSettings(currentSettings);
  streamingEngine.initialize({
    resolution: currentSettings.resolution,
    bitrate: currentSettings.bandwidth * 1000,
  });
  await hostManager.registerHost(currentSettings);
  hostManager.disconnectSignaling(false);
  hostManager.connectSignaling();
  broadcastStatus();
  return currentSettings;
});

ipcMain.handle('get-games', async () => gameLibrary.getGames());
ipcMain.handle('scan-directory', async (_event, directoryPath) => gameLibrary.scanDirectory(directoryPath));

ipcMain.handle('pick-game-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Game Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const exePath = result.filePaths[0];
  return {
    name: path.basename(exePath, path.extname(exePath)),
    exePath,
    iconPath: '',
  };
});

ipcMain.handle('add-game', async (_event, game) => {
  const savedGame = await gameLibrary.addGame(game);
  const hostId = hostManager.getStatus().hostId;
  if (hostId) {
    await gameLibrary.syncWithBackend(hostId, currentSettings?.serverUrl);
  }
  return savedGame;
});

ipcMain.handle('remove-game', async (_event, gameId) => {
  const removed = await gameLibrary.removeGame(gameId);
  const hostId = hostManager.getStatus().hostId;
  if (removed && hostId) {
    await gameLibrary.syncWithBackend(hostId, currentSettings?.serverUrl);
  }
  return removed;
});

ipcMain.handle('get-qr-code', async () => {
  const settings = currentSettings || (await settingsManager.loadSettings());
  const hostId = hostManager.getStatus().hostId;
  return qrGenerator.generatePairingQR(hostId, settings.serverUrl);
});

ipcMain.handle('get-host-status', async () => getHostSnapshot());

ipcMain.handle('set-availability', async (_event, available) => {
  await hostManager.updateAvailability(Boolean(available));
  broadcastStatus();
  return getHostSnapshot();
});

ipcMain.handle('start-game', async (_event, gameIdOrExePath) => {
  const games = await gameLibrary.getGames();
  const selectedGame = games.find((game) => game.id == gameIdOrExePath || game.exePath === gameIdOrExePath);
  const exePath = selectedGame?.exePath || gameIdOrExePath;

  try {
    await sessionController.enableKioskMode();
    await streamingEngine.startCapture();
    const launchedGame = await sessionController.launchGame(exePath, selectedGame || null);
    broadcastStatus();
    return launchedGame;
  } catch (error) {
    await streamingEngine.stopCapture();
    await sessionController.disableKioskMode();
    throw error;
  }
});

ipcMain.handle('stop-game', async () => {
  await sessionController.terminateGame();
  await streamingEngine.stopCapture();
  await sessionController.disableKioskMode();
  broadcastStatus();
  return { success: true };
});

ipcMain.handle('get-logs', async () => logger.getRecentLogs(200));

app.whenReady().then(async () => {
  try {
    createWindow();
    await bootstrapServices();
  } catch (error) {
    logger.error('Application bootstrap failed.', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  hostManager.stopHeartbeat();
  hostManager.disconnectSignaling();
  await sessionController.forceStopAll();
  inputHandler.disconnect();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
