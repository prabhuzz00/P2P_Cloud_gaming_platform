const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

const OPEN_STATE = 1;

class SignalingServer {
  constructor({ server }) {
    this.clients = new Map();
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (socket, request) => {
      try {
        const requestUrl = new URL(request.url, 'http://localhost');
        const token = requestUrl.searchParams.get('token');

        if (!token) {
          socket.send(JSON.stringify({ type: 'error', error: 'Missing JWT token.' }));
          socket.close();
          return;
        }

        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = user;

        if (!this.clients.has(user.id)) {
          this.clients.set(user.id, new Set());
        }

        this.clients.get(user.id).add(socket);
        socket.send(JSON.stringify({ type: 'connected', payload: { userId: user.id } }));

        socket.on('message', (rawMessage) => this.handleMessage(socket, rawMessage));
        socket.on('close', () => this.unregister(socket));
        socket.on('error', () => this.unregister(socket));
      } catch (error) {
        socket.send(JSON.stringify({ type: 'error', error: 'WebSocket authentication failed.' }));
        socket.close();
      }
    });
  }

  handleMessage(socket, rawMessage) {
    try {
      const message = JSON.parse(rawMessage.toString());
      const allowedTypes = new Set(['offer', 'answer', 'ice-candidate', 'session-ready', 'session-end']);

      if (!allowedTypes.has(message.type)) {
        socket.send(JSON.stringify({ type: 'error', error: 'Unsupported signaling message type.' }));
        return;
      }

      if (!message.targetId) {
        socket.send(JSON.stringify({ type: 'error', error: 'targetId is required.' }));
        return;
      }

      const outbound = {
        type: message.type,
        payload: message.payload || {},
        sessionId: message.sessionId || null,
        senderId: socket.user.id,
        targetId: message.targetId,
        timestamp: new Date().toISOString()
      };

      const delivered = this.notifyUser(message.targetId, outbound);

      if (!delivered) {
        socket.send(JSON.stringify({ type: 'error', error: 'Target user is not connected.' }));
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid WebSocket payload.' }));
    }
  }

  notifyUser(userId, payload) {
    const sockets = this.clients.get(userId);

    if (!sockets || sockets.size === 0) {
      return false;
    }

    const message = JSON.stringify(payload);

    for (const socket of sockets) {
      if (socket.readyState === OPEN_STATE) {
        socket.send(message);
      }
    }

    return true;
  }

  unregister(socket) {
    if (!socket.user) {
      return;
    }

    const sockets = this.clients.get(socket.user.id);

    if (!sockets) {
      return;
    }

    sockets.delete(socket);

    if (sockets.size === 0) {
      this.clients.delete(socket.user.id);
    }
  }
}

module.exports = SignalingServer;
