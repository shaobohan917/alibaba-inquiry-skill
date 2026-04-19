/**
 * 循环日志缓冲区
 * 保留最近 N 条日志，超出自动淘汰
 */
export class LogBuffer {
  constructor(maxSize = 500) {
    this.entries = [];
    this.maxSize = maxSize;
  }

  /**
   * 追加日志
   * @param {Object} entry - 日志条目
   */
  push(entry) {
    if (this.entries.length >= this.maxSize) {
      this.entries.shift(); // 淘汰最旧的
    }
    this.entries.push(entry);
  }

  /**
   * 获取历史日志
   * @param {number} limit - 最大返回数量
   * @returns {Array} 日志数组
   */
  getHistory(limit = 100) {
    return this.entries.slice(-limit);
  }

  /**
   * 清空缓冲区
   */
  clear() {
    this.entries = [];
  }
}

/**
 * Agent 日志管理器
 * 为每个 role 维护独立的 LogBuffer 和订阅者列表
 */
export class AgentLogManager {
  constructor() {
    this.buffers = new Map(); // role -> LogBuffer
    this.subscribers = new Map(); // role -> Set<callback>
  }

  /**
   * 获取或创建 LogBuffer
   * @param {string} role
   * @returns {LogBuffer}
   */
  getBuffer(role) {
    if (!this.buffers.has(role)) {
      this.buffers.set(role, new LogBuffer(500));
    }
    return this.buffers.get(role);
  }

  /**
   * 追加日志并通知订阅者
   * @param {string} role
   * @param {Object} entry
   */
  push(role, entry) {
    const buffer = this.getBuffer(role);
    buffer.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
    this.notify(role, buffer.entries[buffer.entries.length - 1]);
  }

  /**
   * 获取历史日志
   * @param {string} role
   * @param {number} limit
   * @returns {Array}
   */
  getHistory(role, limit = 100) {
    return this.getBuffer(role).getHistory(limit);
  }

  /**
   * 订阅日志
   * @param {string} role
   * @param {(entry: Object) => void} callback
   * @returns {() => void} 取消订阅函数
   */
  subscribe(role, callback) {
    if (!this.subscribers.has(role)) {
      this.subscribers.set(role, new Set());
    }
    this.subscribers.get(role).add(callback);
    return () => this.unsubscribe(role, callback);
  }

  /**
   * 取消订阅
   * @param {string} role
   * @param {Function} callback
   */
  unsubscribe(role, callback) {
    const subs = this.subscribers.get(role);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscribers.delete(role);
      }
    }
  }

  /**
   * 通知所有订阅者
   * @param {string} role
   * @param {Object} entry
   */
  notify(role, entry) {
    const subs = this.subscribers.get(role);
    if (subs) {
      subs.forEach(cb => {
        try {
          cb(entry);
        } catch (e) {
          console.error(`LogManager notify error [${role}]:`, e.message);
        }
      });
    }
  }

  /**
   * 清空指定 role 的日志
   * @param {string} role
   */
  clear(role) {
    this.getBuffer(role).clear();
  }
}

// 导出单例
export const agentLogManager = new AgentLogManager();
