const logger = require('../utils/logger');

class InputHandler {
  constructor() {
    this.initialized = false;
    this.lastState = null;
  }

  initialize() {
    this.initialized = true;
    logger.info('Initialize ViGEmBus virtual controller.');
    // ViGEmBus would normally expose a virtual Xbox/DS4 controller device to Windows.
    // A production host would create the virtual device once, then reuse it for every session
    // so remote gamepad state can be translated into native input events with low latency.
  }

  handleInput(inputData = {}) {
    if (!this.initialized) {
      throw new Error('Input handler has not been initialized.');
    }

    const normalizedInput = {
      buttons: Array.isArray(inputData.buttons) ? inputData.buttons : [],
      axes: Array.isArray(inputData.axes) ? inputData.axes : [],
      triggers: Array.isArray(inputData.triggers) ? inputData.triggers : [],
    };

    this.lastState = normalizedInput;
    logger.info('Received remote controller input.', normalizedInput);
    // Real ViGEmBus integration would map these values into XInput/DS4 reports and submit them
    // over the bus driver on every frame, handling analog dead zones, trigger ranges, and rumble.
    return normalizedInput;
  }

  disconnect() {
    this.initialized = false;
    this.lastState = null;
    logger.info('Released virtual controller resources.');
  }
}

module.exports = { InputHandler };
