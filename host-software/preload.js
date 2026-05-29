const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hostAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getGames: () => ipcRenderer.invoke('get-games'),
  scanDirectory: (directoryPath) => ipcRenderer.invoke('scan-directory', directoryPath),
  pickGameFile: () => ipcRenderer.invoke('pick-game-file'),
  addGame: (game) => ipcRenderer.invoke('add-game', game),
  removeGame: (gameId) => ipcRenderer.invoke('remove-game', gameId),
  getQRCode: () => ipcRenderer.invoke('get-qr-code'),
  getHostStatus: () => ipcRenderer.invoke('get-host-status'),
  setAvailability: (available) => ipcRenderer.invoke('set-availability', available),
  startGame: (gameIdOrExePath) => ipcRenderer.invoke('start-game', gameIdOrExePath),
  stopGame: () => ipcRenderer.invoke('stop-game'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  onHostStatusUpdated: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('host-status-updated', listener);
    return () => ipcRenderer.removeListener('host-status-updated', listener);
  },
});
