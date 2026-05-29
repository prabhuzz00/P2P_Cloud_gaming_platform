const os = require('os');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');

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

class HostManager {
  constructor() {
    this.hostId = null;
    this.serverUrl = null;
    this.heartbeatInterval = null;
    this.socket = null;
    this.available = true;
    this.online = false;
    this.registered = false;
    this.signalingConnected = false;
    this.connectedClients = [];
    this.lastHeartbeatAt = null;
    this.signalingHandler = null;
    this.shouldReconnect = true;
  }

  buildSpecs(config = {}) {
    const cpus = os.cpus() || [];
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown CPU',
      cpuCores: cpus.length,
      memoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
      resolution: config.resolution,
      bandwidthMbps: config.bandwidth,
    };
  }

  async registerHost(config = {}) {
    this.serverUrl = config.serverUrl || this.serverUrl || 'http://localhost:3000';
    const payload = {
      hostId: this.hostId || randomUUID(),
      available: this.available,
      specs: this.buildSpecs(config),
    };

    try {
      const response = await fetchJson(`${this.serverUrl}/api/hosts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      this.hostId = response.hostId || payload.hostId;
      this.online = true;
      this.registered = true;
      logger.info('Registered host with backend.', { hostId: this.hostId, serverUrl: this.serverUrl });
    } catch (error) {
      this.hostId = payload.hostId;
      this.online = false;
      this.registered = false;
      logger.warn('Backend host registration failed. Continuing in offline mode.', error.message);
    }

    return this.getStatus();
  }

  async sendHeartbeat() {
    if (!this.hostId || !this.serverUrl) {
      return;
    }

    try {
      await fetchJson(`${this.serverUrl}/api/hosts/${this.hostId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          online: true,
          available: this.available,
          connectedClients: this.connectedClients,
          lastHeartbeatAt: new Date().toISOString(),
        }),
      });

      this.online = true;
      this.lastHeartbeatAt = new Date().toISOString();
      logger.info('Heartbeat sent successfully.', { hostId: this.hostId });
    } catch (error) {
      this.online = false;
      logger.warn('Heartbeat update failed.', error.message);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch((error) => logger.error('Heartbeat timer execution failed.', error));
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async updateAvailability(available) {
    this.available = available;
    await this.sendHeartbeat();
    return this.getStatus();
  }

  connectSignaling(onMessage) {
    if (typeof onMessage === 'function') {
      this.signalingHandler = onMessage;
    }

    if (!this.serverUrl || !this.hostId) {
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnectSignaling(false);
    this.shouldReconnect = true;
    const wsUrl = this.serverUrl.replace(/^http/i, 'ws') + `/ws/signaling?hostId=${encodeURIComponent(this.hostId)}`;

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      logger.error('Failed to create signaling WebSocket.', error);
      return;
    }

    this.socket.on('open', () => {
      this.signalingConnected = true;
      logger.info('Connected to signaling server.', { wsUrl });
    });

    this.socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        this.handleSignalingMessage(message);
      } catch (error) {
        logger.error('Failed to parse signaling message.', error);
      }
    });

    this.socket.on('close', () => {
      this.signalingConnected = false;
      logger.warn('Disconnected from signaling server.');

      if (this.shouldReconnect) {
        setTimeout(() => this.connectSignaling(), 15000);
      }
    });

    this.socket.on('error', (error) => {
      this.signalingConnected = false;
      logger.warn('Signaling socket reported an error.', error.message);
    });
  }

  handleSignalingMessage(message) {
    switch (message.type) {
      case 'client-connected':
        if (!this.connectedClients.includes(message.clientId)) {
          this.connectedClients.push(message.clientId);
        }
        break;
      case 'client-disconnected':
        this.connectedClients = this.connectedClients.filter((clientId) => clientId !== message.clientId);
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        logger.info('Routing WebRTC signaling payload.', { type: message.type, clientId: message.clientId });
        break;
      default:
        logger.info('Received signaling control message.', message);
    }

    if (typeof this.signalingHandler === 'function') {
      this.signalingHandler(message);
    }
  }

  async sendSignalingMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.warn('Skipping signaling send because the socket is offline.');
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  disconnectSignaling(updateReconnectFlag = true) {
    if (updateReconnectFlag) {
      this.shouldReconnect = false;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }

    this.signalingConnected = false;
  }

  getStatus() {
    return {
      hostId: this.hostId,
      serverUrl: this.serverUrl,
      online: this.online,
      registered: this.registered,
      signalingConnected: this.signalingConnected,
      available: this.available,
      connectedClients: this.connectedClients,
      lastHeartbeatAt: this.lastHeartbeatAt,
    };
  }
}

module.exports = new HostManager();
