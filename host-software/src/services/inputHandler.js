const logger = require('../utils/logger');

let robotjs;
try {
  robotjs = require('robotjs');
} catch (err) {
  logger.warn('robotjs module not available. Input injection will be limited.', err.message);
  robotjs = null;
}

// Button name to keyboard key mapping for gamepad emulation via keyboard
const BUTTON_KEY_MAP = {
  'A': 'enter',
  'B': 'escape',
  'X': 'x',
  'Y': 'y',
  'LB': 'q',
  'RB': 'e',
  'LT': 'z',
  'RT': 'c',
  'Start': 'escape',
  'Select': 'tab',
  'DPadUp': 'up',
  'DPadDown': 'down',
  'DPadLeft': 'left',
  'DPadRight': 'right',
  'LeftStickButton': 'shift',
  'RightStickButton': 'control',
};

class InputHandler {
  constructor() {
    this.initialized = false;
    this.lastState = null;
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.mousePosition = { x: 960, y: 540 };
    this.sensitivity = 5;
  }

  initialize() {
    this.initialized = true;

    if (robotjs) {
      try {
        const screenSize = robotjs.getScreenSize();
        this.screenWidth = screenSize.width;
        this.screenHeight = screenSize.height;
        robotjs.setMouseDelay(0);
        robotjs.setKeyboardDelay(0);
        logger.info('Input handler initialized with robotjs.', {
          screenWidth: this.screenWidth,
          screenHeight: this.screenHeight,
        });
      } catch (err) {
        logger.warn('robotjs screen size detection failed, using defaults.', err.message);
      }
    } else {
      logger.info('Input handler initialized in passthrough mode (robotjs not available).');
    }
  }

  handleInput(inputData = {}) {
    if (!this.initialized) {
      throw new Error('Input handler has not been initialized.');
    }

    const { type, control, action, x, y, buttons, axes, triggers } = inputData;

    // Handle structured input messages from client data channel
    if (type === 'button') {
      this._handleButtonInput(control, action);
    } else if (type === 'analog') {
      this._handleAnalogInput(control, x || 0, y || 0);
    } else if (type === 'mouse') {
      this._handleMouseInput(inputData);
    } else if (type === 'keyboard') {
      this._handleKeyboardInput(control, action);
    } else if (buttons || axes || triggers) {
      // Legacy format: full gamepad state
      this._handleFullGamepadState({ buttons, axes, triggers });
    }

    this.lastState = inputData;
    return inputData;
  }

  _handleButtonInput(control, action) {
    if (!robotjs) {
      logger.info('Button input received (no robotjs).', { control, action });
      return;
    }

    const key = BUTTON_KEY_MAP[control];
    if (!key) {
      logger.warn('Unknown button control.', { control });
      return;
    }

    try {
      if (action === 'pressed' || action === 'down') {
        robotjs.keyToggle(key, 'down');
      } else if (action === 'released' || action === 'up') {
        robotjs.keyToggle(key, 'up');
      } else {
        // Single tap
        robotjs.keyTap(key);
      }
    } catch (err) {
      logger.warn('Failed to inject button input.', { control, action, error: err.message });
    }
  }

  _handleAnalogInput(control, x, y) {
    if (!robotjs) {
      logger.info('Analog input received (no robotjs).', { control, x, y });
      return;
    }

    try {
      if (control === 'LeftStick') {
        // Left stick controls WASD-style movement via key presses
        const threshold = 0.3;
        if (Math.abs(x) > threshold || Math.abs(y) > threshold) {
          if (y < -threshold) robotjs.keyToggle('w', 'down');
          else robotjs.keyToggle('w', 'up');

          if (y > threshold) robotjs.keyToggle('s', 'down');
          else robotjs.keyToggle('s', 'up');

          if (x < -threshold) robotjs.keyToggle('a', 'down');
          else robotjs.keyToggle('a', 'up');

          if (x > threshold) robotjs.keyToggle('d', 'down');
          else robotjs.keyToggle('d', 'up');
        } else {
          // Dead zone - release all
          robotjs.keyToggle('w', 'up');
          robotjs.keyToggle('s', 'up');
          robotjs.keyToggle('a', 'up');
          robotjs.keyToggle('d', 'up');
        }
      } else if (control === 'RightStick') {
        // Right stick controls mouse movement (camera look)
        const deltaX = Math.round(x * this.sensitivity);
        const deltaY = Math.round(y * this.sensitivity);
        this.mousePosition.x = Math.max(0, Math.min(this.screenWidth, this.mousePosition.x + deltaX));
        this.mousePosition.y = Math.max(0, Math.min(this.screenHeight, this.mousePosition.y + deltaY));
        robotjs.moveMouse(this.mousePosition.x, this.mousePosition.y);
      }
    } catch (err) {
      logger.warn('Failed to inject analog input.', { control, error: err.message });
    }
  }

  _handleMouseInput(inputData) {
    if (!robotjs) {
      logger.info('Mouse input received (no robotjs).', inputData);
      return;
    }

    const { action, x, y, button } = inputData;
    try {
      if (action === 'move' && x !== undefined && y !== undefined) {
        const absX = Math.round(x * this.screenWidth);
        const absY = Math.round(y * this.screenHeight);
        robotjs.moveMouse(absX, absY);
        this.mousePosition = { x: absX, y: absY };
      } else if (action === 'click' || action === 'down') {
        robotjs.mouseToggle('down', button || 'left');
      } else if (action === 'up' || action === 'released') {
        robotjs.mouseToggle('up', button || 'left');
      } else if (action === 'scroll') {
        robotjs.scrollMouse(x || 0, y || 0);
      }
    } catch (err) {
      logger.warn('Failed to inject mouse input.', { action, error: err.message });
    }
  }

  _handleKeyboardInput(key, action) {
    if (!robotjs) {
      logger.info('Keyboard input received (no robotjs).', { key, action });
      return;
    }

    try {
      if (action === 'down' || action === 'pressed') {
        robotjs.keyToggle(key, 'down');
      } else if (action === 'up' || action === 'released') {
        robotjs.keyToggle(key, 'up');
      } else {
        robotjs.keyTap(key);
      }
    } catch (err) {
      logger.warn('Failed to inject keyboard input.', { key, action, error: err.message });
    }
  }

  _handleFullGamepadState({ buttons = [], axes = [], triggers = [] }) {
    // Process full gamepad state snapshot (legacy format)
    buttons.forEach((pressed, index) => {
      if (pressed) {
        const buttonNames = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start'];
        const name = buttonNames[index];
        if (name) this._handleButtonInput(name, 'pressed');
      }
    });

    if (axes.length >= 2) {
      this._handleAnalogInput('LeftStick', axes[0], axes[1]);
    }
    if (axes.length >= 4) {
      this._handleAnalogInput('RightStick', axes[2], axes[3]);
    }
  }

  disconnect() {
    if (robotjs) {
      // Release any held keys
      try {
        const releaseKeys = ['w', 'a', 's', 'd', 'shift', 'control', 'up', 'down', 'left', 'right'];
        releaseKeys.forEach((key) => {
          try { robotjs.keyToggle(key, 'up'); } catch (e) { /* ignore */ }
        });
      } catch (err) {
        logger.warn('Error releasing keys during disconnect.', err.message);
      }
    }
    this.initialized = false;
    this.lastState = null;
    logger.info('Released input handler resources.');
  }
}

module.exports = { InputHandler };
