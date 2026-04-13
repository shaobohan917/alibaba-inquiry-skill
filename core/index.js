/**
 * Core Module Exports
 * 共享服务层统一出口
 */

const BrowserManager = require('./browser-manager');
const CookieStore = require('./cookie-store');
const TaskQueue = require('./task-queue');
const DataStore = require('./data-store');

module.exports = {
  BrowserManager,
  CookieStore,
  TaskQueue,
  DataStore
};
