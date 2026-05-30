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
    portRange: currentSettings.portRange,
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
          const clientId = message.clientId || message.senderId || 'unknown';
          const answer = await streamingEngine.handleOffer(message);
          // Wire up ICE candidate forwarding back to the client via signaling
          // handleOffer recreates or reuses the peer connection, so we always reset the handler
          streamingEngine.setIceCandidateHandler(clientId, (candidate) => {
            hostManager.sendSignalingMessage({
              type: 'ice-candidate',
              targetId: message.senderId || message.clientId,
              clientId: message.clientId,
              hostId: hostManager.getStatus().hostId,
              payload: { candidate },
            });
          });
          // Wire up data channel input to the input handler for this client
          streamingEngine.setInputHandler(clientId, (inputData) => {
            inputHandler.handleInput(inputData);
          });
          // Add media stream tracks to the peer connection if capture is active
          if (streamingEngine.captureActive) {
            streamingEngine.addStreamToPeer(clientId);
          }
          await hostManager.sendSignalingMessage({
            type: 'answer',
            targetId: message.senderId || message.clientId,
            clientId: message.clientId,
            hostId: hostManager.getStatus().hostId,
            payload: { type: answer.type, sdp: answer.sdp },
          });
          break;
        }
        case 'ice-candidate':
          await streamingEngine.handleIceCandidate(message);
          break;
        case 'input':
          inputHandler.handleInput(message.inputData || message.payload);
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
    portRange: currentSettings.portRange,
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

    // Start screen capture using Electron's desktopCapturer.
    // The desktopCapturer provides the source ID; the actual MediaStream with video/audio
    // tracks is obtained via navigator.mediaDevices.getUserMedia in the renderer process
    // (which has access to Chromium media APIs) and then forwarded here via IPC.
    // For headless/wrtc-only operation, a native capture module would be needed.
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (sources.length > 0) {
      logger.info('Screen capture source acquired.', { sourceId: sources[0].id, name: sources[0].name });
      // Store source ID for renderer process to create MediaStream
      mainWindow?.webContents.send('capture-source-ready', { sourceId: sources[0].id });
    }

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
