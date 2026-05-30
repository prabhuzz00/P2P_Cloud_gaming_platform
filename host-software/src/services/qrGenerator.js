const { randomUUID } = require('crypto');
const QRCode = require('qrcode');

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

  return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
};

async function generatePairingQR(hostId, serverUrl = 'http://localhost:3000') {
  serverUrl = serverUrl.replace(/\/+$/, '');

  const payload = {
    hostId: hostId || 'unregistered-host',
    pairingToken: randomUUID(),
    serverUrl,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetchJson(`${serverUrl}/api/hosts/${payload.hostId}/pairing-token`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    logger.info('Sent pairing token to backend.', { hostId: payload.hostId });
  } catch (error) {
    logger.warn('Failed to persist pairing token with backend.', error.message);
  }

  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
    margin: 1,
    color: {
      dark: '#7c3aed',
      light: '#0f172acc',
    },
  });

  return { dataUrl, payload };
}

module.exports = {
  generatePairingQR,
};
