/**
 * AgentLogManager - Agent 日志管理器
 *
 * 负责：
 * - 收集和管理所有 Agent 的日志输出
 * - 支持日志持久化（可选）
 * - 提供日志查询接口
 * - 支持 WebSocket 实时推送（可选）
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 默认配置
const DEFAULT_CONFIG = {
  maxLogsPerRole: 1000,      // 每个角色最大日志数
  maxTotalLogs: 10000,       // 总最大日志数
  logDir: path.join(__dirname, '../../../../logs/agents'),
  enablePersistence: false,  // 是否启用持久化
  flushInterval: 30000       // 持久化刷新间隔（毫秒）
};

/**
 * 日志条目结构
 */
class LogEntry {
  constructor(role, data) {
    this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.role = role;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.level = data.level || 'info';  // info, warn, error, debug
    this.source = data.source || 'stdout';  // stdout, stderr, process, system
    this.message = data.message || '';
    this.metadata = data.metadata || {};
  }
}

/**
 * AgentLogManager 类
 */
export class AgentLogManager extends EventEmitter {
  /**
   * 构造函数
   * @param {Object} config - 配置选项
   */
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 日志存储：role -> LogEntry[]
    this.logs = new Map();

    // 持久化缓冲区
    this.flushBuffer = [];

    // 持久化定时器
    this.flushTimer = null;

    // 初始化
    this._initialize();
  }

  /**
   * 初始化
   * @private
   */
  async _initialize() {
    // 创建日志目录
    if (this.config.enablePersistence) {
      try {
        await fs.mkdir(this.config.logDir, { recursive: true });
        console.log(`[AgentLogManager] 日志目录已准备：${this.config.logDir}`);
      } catch (error) {
        console.error(`[AgentLogManager] 创建日志目录失败：${error.message}`);
      }

      // 启动定时刷新
      this._startFlushTimer();
    }
  }

  /**
   * 启动定时刷新
   * @private
   */
  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this._flushLogs();
    }, this.config.flushInterval);

    // 进程退出时刷新
    process.on('beforeExit', () => {
      this._flushLogs();
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
    });
  }

  /**
   * 追加日志
   * @param {string} role - 角色名称
   * @param {Object} data - 日志数据
   * @param {string} data.timestamp - 时间戳
   * @param {string} data.level - 日志级别
   * @param {string} data.source - 来源
   * @param {string} data.message - 消息内容
   * @returns {LogEntry}
   */
  append(role, data) {
    const entry = new LogEntry(role, data);

    // 获取或创建角色日志数组
    if (!this.logs.has(role)) {
      this.logs.set(role, []);
    }

    const roleLogs = this.logs.get(role);

    // 添加日志
    roleLogs.push(entry);

    // 限制日志数量
    if (roleLogs.length > this.config.maxLogsPerRole) {
      roleLogs.shift();
    }

    // 限制总日志数
    const totalLogs = this.getTotalCount();
    if (totalLogs > this.config.maxTotalLogs) {
      this._trimOldestLogs(totalLogs - this.config.maxTotalLogs);
    }

    // 添加到持久化缓冲区
    if (this.config.enablePersistence) {
      this.flushBuffer.push(entry);
    }

    // 触发事件
    this.emit('log', entry);
    this.emit(`log:${role}`, entry);

    return entry;
  }

  /**
   * 获取角色日志
   * @param {string} role - 角色名称
   * @param {Object} options - 查询选项
   * @param {number} options.limit - 返回数量限制
   * @param {number} options.offset - 偏移量
   * @param {string} options.level - 日志级别过滤
   * @param {string} options.startTime - 开始时间
   * @param {string} options.endTime - 结束时间
   * @returns {LogEntry[]}
   */
  getLogs(role, options = {}) {
    const { limit = 100, offset = 0, level, startTime, endTime } = options;

    let logs = this.logs.get(role) || [];

    // 级别过滤
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // 时间范围过滤
    if (startTime) {
      logs = logs.filter(log => log.timestamp >= startTime);
    }
    if (endTime) {
      logs = logs.filter(log => log.timestamp <= endTime);
    }

    // 排序（最新在前）
    logs = [...logs].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // 分页
    return logs.slice(offset, offset + limit);
  }

  /**
   * 获取所有角色日志
   * @param {Object} options - 查询选项
   * @returns {LogEntry[]}
   */
  getAllLogs(options = {}) {
    const { limit = 100, offset = 0, level, roles, startTime, endTime } = options;

    let logs = [];

    // 收集所有日志
    for (const [role, roleLogs] of this.logs.entries()) {
      if (roles && !roles.includes(role)) {
        continue;
      }

      for (const log of roleLogs) {
        // 级别过滤
        if (level && log.level !== level) {
          continue;
        }

        // 时间范围过滤
        if (startTime && log.timestamp < startTime) {
          continue;
        }
        if (endTime && log.timestamp > endTime) {
          continue;
        }

        logs.push(log);
      }
    }

    // 排序（最新在前）
    logs = logs.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // 分页
    return logs.slice(offset, offset + limit);
  }

  /**
   * 获取角色日志数量
   * @param {string} role - 角色名称
   * @returns {number}
   */
  getCount(role) {
    return this.logs.get(role)?.length || 0;
  }

  /**
   * 获取总日志数量
   * @returns {number}
   */
  getTotalCount() {
    let total = 0;
    for (const logs of this.logs.values()) {
      total += logs.length;
    }
    return total;
  }

  /**
   * 获取所有角色列表
   * @returns {string[]}
   */
  getRoles() {
    return [...this.logs.keys()];
  }

  /**
   * 清空角色日志
   * @param {string} role - 角色名称
   * @returns {number} 清空的日志数量
   */
  clear(role) {
    const logs = this.logs.get(role);
    if (logs) {
      const count = logs.length;
      this.logs.delete(role);
      console.log(`[AgentLogManager] 已清空角色 "${role}" 的 ${count} 条日志`);
      return count;
    }
    return 0;
  }

  /**
   * 清空所有日志
   * @returns {number} 清空的日志数量
   */
  clearAll() {
    let total = 0;
    for (const [role, logs] of this.logs.entries()) {
      total += logs.length;
    }
    this.logs.clear();
    console.log(`[AgentLogManager] 已清空所有日志，共 ${total} 条`);
    return total;
  }

  /**
   * 刷新日志到磁盘
   * @private
   */
  async _flushLogs() {
    if (this.flushBuffer.length === 0) {
      return;
    }

    const buffer = [...this.flushBuffer];
    this.flushBuffer = [];

    try {
      const date = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
      const logFile = path.join(this.config.logDir, `agents-${date}.jsonl`);

      // 以追加模式写入
      const content = buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(logFile, content, 'utf8');

      console.log(`[AgentLogManager] 已刷新 ${buffer.length} 条日志到 ${logFile}`);
    } catch (error) {
      console.error(`[AgentLogManager] 刷新日志失败：${error.message}`);
    }
  }

  /**
   * 删除最旧的日志
   * @private
   */
  _trimOldestLogs(count) {
    // 获取所有日志并排序
    const allLogs = [];
    for (const [role, logs] of this.logs.entries()) {
      for (const log of logs) {
        allLogs.push({ role, log });
      }
    }

    allLogs.sort((a, b) => {
      return new Date(a.log.timestamp) - new Date(b.log.timestamp);
    });

    // 删除最旧的
    for (let i = 0; i < count && i < allLogs.length; i++) {
      const { role, log } = allLogs[i];
      const roleLogs = this.logs.get(role);
      if (roleLogs) {
        const index = roleLogs.indexOf(log);
        if (index !== -1) {
          roleLogs.splice(index, 1);
        }
      }
    }
  }

  /**
   * 导出日志
   * @param {Object} options - 导出选项
   * @param {string} options.format - 导出格式（json, text）
   * @param {string} options.role - 角色过滤
   * @returns {string}
   */
  exportLogs(options = {}) {
    const { format = 'text', role } = options;

    let logs = role ? this.getLogs(role, { limit: 10000 }) : this.getAllLogs({ limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'text') {
      return logs.map(log => {
        return `[${log.timestamp}] [${log.role}] [${log.level}] ${log.message}`;
      }).join('\n');
    }

    return '';
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.flushTimer) {
      this._flushLogs();
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.logs.clear();
    this.flushBuffer = [];
  }
}

export default AgentLogManager;
