const logger = require('../utils/logger');

let wrtc;
try {
  wrtc = require('wrtc');
} catch (err) {
  logger.warn('wrtc module not available. WebRTC peer connections will not function.', err.message);
  wrtc = null;
}

class StreamingEngine {
  constructor() {
    this.config = {
      resolution: '1080p',
      bitrate: 15000,
      codec: 'h264',
      fps: 60,
    };
    this.peerConnections = new Map();
    this.captureActive = false;
    this.mediaStream = null;
    this.portRange = null;
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }

  initialize(config = {}) {
    this.config = {
      ...this.config,
      ...config,
    };

    if (config.iceServers) {
      this.iceServers = config.iceServers;
    }

    if (config.portRange) {
      this.portRange = config.portRange;
    }

    logger.info('Streaming engine initialized.', this.config);
  }

  setMediaStream(stream) {
    this.mediaStream = stream;
    logger.info('Media stream set for streaming engine.', { tracks: stream?.getTracks().length || 0 });
  }

  addStreamToPeer(clientId) {
    const connection = this.peerConnections.get(clientId);
    if (!connection || !connection.pc || !this.mediaStream) {
      logger.warn('Cannot add stream to peer. Missing connection or media stream.', { clientId });
      return false;
    }

    const tracks = this.mediaStream.getTracks();
    for (const track of tracks) {
      connection.pc.addTrack(track, this.mediaStream);
    }

    logger.info('Added media tracks to peer connection.', { clientId, trackCount: tracks.length });
    return true;
  }

  async startCapture() {
    this.captureActive = true;
    logger.info('Starting screen capture.', { config: this.config });

    // Screen capture is initiated from Electron's main process using desktopCapturer.
    // The main process obtains the MediaStream and passes it via setMediaStream().
    // When running without Electron (e.g., wrtc-only mode), this acts as a readiness signal.
    return { captureActive: this.captureActive, config: this.config };
  }

  async stopCapture() {
    this.captureActive = false;
    logger.info('Stopping capture.');

    // Close all active peer connections when capture stops
    for (const [clientId, conn] of this.peerConnections) {
      try {
        if (conn.pc && conn.pc.connectionState !== 'closed') {
          conn.pc.close();
        }
      } catch (err) {
        logger.warn('Error closing peer connection during capture stop.', { clientId, error: err.message });
      }
    }
    this.peerConnections.clear();

    return { captureActive: this.captureActive };
  }

  createPeerConnection(clientId) {
    if (!wrtc) {
      logger.error('Cannot create peer connection: wrtc module not available.');
      return { clientId, state: 'failed', pc: null, dataChannel: null };
    }

    const { RTCPeerConnection } = wrtc;

    const rtcConfig = {
      iceServers: this.iceServers,
    };

    // Configure port range for ICE candidates if specified.
    // Note: portRange is not part of the standard WebRTC RTCConfiguration spec.
    // It is included here for compatibility with implementations that support it.
    // Users must still manually forward this port range on their router.
    if (this.portRange) {
      rtcConfig.portRange = {
        min: this.portRange.start,
        max: this.portRange.end,
      };
    }

    const pc = new RTCPeerConnection(rtcConfig);

    const connection = {
      clientId,
      state: 'new',
      pc,
      dataChannel: null,
      onInputData: null,
      onIceCandidate: null,
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && connection.onIceCandidate) {
        connection.onIceCandidate({
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      connection.state = pc.iceConnectionState;
      logger.info('ICE connection state changed.', { clientId, state: pc.iceConnectionState });
    };

    pc.onconnectionstatechange = () => {
      logger.info('Peer connection state changed.', { clientId, state: pc.connectionState });
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(clientId);
      }
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      connection.dataChannel = channel;
      logger.info('Data channel received from client.', { clientId, label: channel.label });

      channel.onmessage = (msgEvent) => {
        try {
          const inputData = JSON.parse(msgEvent.data);
          if (connection.onInputData) {
            connection.onInputData(inputData);
          }
        } catch (err) {
          logger.warn('Failed to parse data channel message.', { clientId, error: err.message });
        }
      };
    };

    this.peerConnections.set(clientId, connection);
    logger.info('Created WebRTC peer connection.', { clientId, iceServers: this.iceServers.length });
    return connection;
  }

  setIceCandidateHandler(clientId, handler) {
    const connection = this.peerConnections.get(clientId);
    if (connection) {
      connection.onIceCandidate = handler;
    }
  }

  async handleOffer(offer) {
    const clientId = offer.clientId || 'unknown-client';
    let connection = this.peerConnections.get(clientId);

    if (!connection || !connection.pc) {
      connection = this.createPeerConnection(clientId);
    }

    if (!connection.pc) {
      throw new Error('WebRTC peer connection could not be created (wrtc module missing).');
    }

    const { pc } = connection;
    const sdpOffer = offer.payload?.sdp || offer.offer || offer;

    const remoteDesc = typeof sdpOffer === 'string'
      ? { type: 'offer', sdp: sdpOffer }
      : sdpOffer;

    await pc.setRemoteDescription(remoteDesc);
    connection.state = 'have-remote-offer';
    logger.info('Set remote SDP offer.', { clientId });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    connection.state = 'have-local-answer';

    logger.info('Generated SDP answer.', { clientId });
    return pc.localDescription;
  }

  async handleIceCandidate(candidate) {
    const clientId = candidate?.clientId || 'unknown-client';
    const connection = this.peerConnections.get(clientId);

    if (!connection || !connection.pc) {
      logger.warn('Received ICE candidate for unknown peer.', { clientId });
      return false;
    }

    const iceCandidate = candidate.candidate || candidate.payload?.candidate || candidate;

    try {
      if (wrtc && iceCandidate.candidate) {
        const rtcCandidate = new wrtc.RTCIceCandidate(iceCandidate);
        await connection.pc.addIceCandidate(rtcCandidate);
      }
      logger.info('Added ICE candidate.', { clientId });
      return true;
    } catch (err) {
      logger.warn('Failed to add ICE candidate.', { clientId, error: err.message });
      return false;
    }
  }

  setInputHandler(clientId, handler) {
    const connection = this.peerConnections.get(clientId);
    if (connection) {
      connection.onInputData = handler;
    }
  }

  closePeerConnection(clientId) {
    const connection = this.peerConnections.get(clientId);
    if (!connection) return;

    try {
      if (connection.dataChannel) {
        connection.dataChannel.close();
      }
      if (connection.pc && connection.pc.connectionState !== 'closed') {
        connection.pc.close();
      }
    } catch (err) {
      logger.warn('Error during peer connection cleanup.', { clientId, error: err.message });
    }

    this.peerConnections.delete(clientId);
    logger.info('Closed peer connection.', { clientId });
  }

  getConnectionState(clientId) {
    const connection = this.peerConnections.get(clientId);
    if (!connection || !connection.pc) return 'closed';
    return connection.pc.connectionState;
  }

  getActiveConnections() {
    return Array.from(this.peerConnections.keys());
  }
}

module.exports = { StreamingEngine };
