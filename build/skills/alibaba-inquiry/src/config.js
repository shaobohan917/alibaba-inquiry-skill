const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'settings.json');

function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load config:', error.message);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    replyStyle: {
      tone: 'professional',
      autoLanguage: true,
      signature: 'Best regards,\n[Your Name]'
    },
    automation: {
      autoFillReply: true,
      autoSend: false,
      delayBetweenActions: {
        min: 3000,
        max: 8000
      }
    }
  };
}

function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

function delay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  loadConfig,
  getEnv,
  delay
};
