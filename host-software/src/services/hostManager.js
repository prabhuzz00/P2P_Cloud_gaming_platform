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
    this.authToken = null;
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
    this.reconnectAttempts = 0;
    this.portRange = null;
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
    this.portRange = config.portRange || this.portRange || { start: 47984, end: 48010 };

    // If credentials are provided, login first to get auth token
    if (config.email && config.password && !this.authToken) {
      try {
        const loginResponse = await fetchJson(`${this.serverUrl}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email: config.email, password: config.password }),
        });
        this.authToken = loginResponse.access_token || loginResponse.token || null;
        logger.info('Authenticated with backend.', { email: config.email });
      } catch (loginError) {
        logger.warn('Backend authentication failed. Trying registration.', loginError.message);
        try {
          const registerResponse = await fetchJson(`${this.serverUrl}/api/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ email: config.email, password: config.password }),
          });
          this.authToken = registerResponse.access_token || registerResponse.token || null;
          logger.info('Registered and authenticated with backend.', { email: config.email });
        } catch (registerError) {
          logger.warn('Backend registration also failed.', registerError.message);
        }
      }
    }

    // Use existing token if provided directly
    if (config.authToken) {
      this.authToken = config.authToken;
    }

    const payload = {
      name: config.hostName || os.hostname(),
      specs: this.buildSpecs(config),
      port_range: `${this.portRange.start}-${this.portRange.end}`,
    };

    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = 'Bearer ' + this.authToken;
    }

    try {
      const response = await fetchJson(`${this.serverUrl}/api/hosts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      this.hostId = response.hostId || response.host?.id || null;
      this.online = true;
      this.registered = true;
      logger.info('Registered host with backend.', { hostId: this.hostId, serverUrl: this.serverUrl });
    } catch (error) {
      // If registration fails with 409 (host exists), try to fetch existing hosts
      if (error.message.includes('409') || error.message.includes('already')) {
        try {
          const myHosts = await fetchJson(`${this.serverUrl}/api/hosts/my`, {
            method: 'GET',
            headers,
          });
          const hosts = myHosts.hosts || [];
          if (hosts.length > 0) {
            this.hostId = hosts[0].id;
            this.online = true;
            this.registered = true;
            logger.info('Found existing host registration.', { hostId: this.hostId });
          }
        } catch (fetchError) {
          logger.warn('Failed to fetch existing hosts.', fetchError.message);
        }
      }

      if (!this.registered) {
        this.hostId = randomUUID();
        this.online = false;
        this.registered = false;
        logger.warn('Backend host registration failed. Continuing in offline mode.', error.message);
      }
    }

    return this.getStatus();
  }

  async sendHeartbeat() {
    if (!this.hostId || !this.serverUrl) {
      return;
    }

    const headers = {};
    if (this.authToken) {
      headers['Authorization'] = "Bearer " + this.authToken;
    }

    try {
      await fetchJson(`${this.serverUrl}/api/hosts/${this.hostId}/heartbeat`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          online: true,
          available: this.available,
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
    this.reconnectAttempts = 0;

    // Include JWT token and hostId in the WebSocket URL for authentication
    const params = new URLSearchParams({ hostId: this.hostId });
    if (this.authToken) {
      params.set('token', this.authToken);
    }
    const wsUrl = this.serverUrl.replace(/^http/i, 'ws') + `/ws?${params.toString()}`;

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      logger.error('Failed to create signaling WebSocket.', error);
      return;
    }

    this.socket.on('open', () => {
      this.signalingConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Connected to signaling server.', { wsUrl: wsUrl.replace(/token=[^&]+/, 'token=***') });
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
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s, max 60s
        const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 60000);
        this.reconnectAttempts++;
        logger.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}).`);
        setTimeout(() => this.connectSignaling(), delay);
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
      portRange: this.portRange || null,
    };
  }
}

module.exports = new HostManager();
