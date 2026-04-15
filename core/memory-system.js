const fs = require('fs');
const path = require('path');

/**
 * 外置记忆系统
 * 根治 AI 失忆问题，永久留存历史信息
 * 包含：工作日志、错题本、记忆库
 */
class MemorySystem {
  constructor(baseDir = null, role = 'default') {
    this.baseDir = baseDir || path.join(__dirname, '..', 'data', 'memory');
    this.role = role;
    this.ensureDir();
  }

  /**
   * 确保目录存在
   */
  ensureDir() {
    const roleDir = path.join(this.baseDir, this.role);
    if (!fs.existsSync(roleDir)) {
      fs.mkdirSync(roleDir, { recursive: true });
    }
  }

  /**
   * 获取文件路径
   * @param {string} type - 文件类型 (log/error/memory)
   * @returns {string}
   */
  getFilePath(type) {
    const roleDir = path.join(this.baseDir, this.role);
    const date = new Date().toISOString().split('T')[0];

    if (type === 'log') {
      return path.join(roleDir, `work-log-${date}.json`);
    } else if (type === 'error') {
      return path.join(roleDir, 'error-book.json');
    } else if (type === 'memory') {
      return path.join(roleDir, 'memory-db.json');
    }

    return path.join(roleDir, `${type}.json`);
  }

  // ==================== 工作日志 ====================

  /**
   * 记录工作日志
   * @param {Object} entry
   * @param {string} entry.type - 记录类型
   * @param {Object} entry.data - 记录数据
   * @param {string} entry.summary - 简要总结
   */
  logWork(entry) {
    const filePath = this.getFilePath('log');
    const log = this.loadLog();

    const newEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: entry.type,
      data: entry.data,
      summary: entry.summary
    };

    log.entries.push(newEntry);
    this.saveLog(log);

    console.log(`✓ 工作日志已记录 [${this.role}]: ${entry.type}`);
    return newEntry.id;
  }

  /**
   * 加载工作日志
   * @returns {Object}
   */
  loadLog() {
    const filePath = this.getFilePath('log');

    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        // 文件损坏，返回空
      }
    }

    return { entries: [], date: new Date().toISOString().split('T')[0] };
  }

  /**
   * 保存工作日志
   * @param {Object} log
   */
  saveLog(log) {
    const filePath = this.getFilePath('log');
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2));
  }

  /**
   * 查询历史日志
   * @param {Object} filters
   * @returns {Array}
   */
  queryLog(filters = {}) {
    const log = this.loadLog();
    let entries = log.entries;

    if (filters.type) {
      entries = entries.filter(e => e.type === filters.type);
    }

    if (filters.dateFrom) {
      entries = entries.filter(e => e.timestamp >= filters.dateFrom);
    }

    if (filters.dateTo) {
      entries = entries.filter(e => e.timestamp <= filters.dateTo);
    }

    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 获取今日日志摘要
   * @returns {Object}
   */
  getTodaySummary() {
    const log = this.loadLog();
    const today = new Date().toISOString().split('T')[0];

    const todayEntries = log.entries.filter(e => e.timestamp.startsWith(today));

    return {
      date: today,
      total: todayEntries.length,
      byType: this.groupByType(todayEntries)
    };
  }

  // ==================== 错题本 ====================

  /**
   * 记录错题（踩坑）
   * @param {Object} error
   * @param {string} error.category - 错误分类
   * @param {string} error.description - 错误描述
   * @param {string} error.solution - 解决方案
   * @param {string} error.lesson - 教训
   */
  recordError(error) {
    const filePath = this.getFilePath('error');
    const errorBook = this.loadErrorBook();

    const newError = {
      id: `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: error.category,
      description: error.description,
      solution: error.solution,
      lesson: error.lesson,
      reviewed: false
    };

    errorBook.errors.push(newError);
    this.saveErrorBook(errorBook);

    console.log(`✓ 错题已记录 [${this.role}]: ${error.category}`);
    return newError.id;
  }

  /**
   * 加载错题本
   * @returns {Object}
   */
  loadErrorBook() {
    const filePath = this.getFilePath('error');

    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        // 文件损坏，返回空
      }
    }

    return { errors: [] };
  }

  /**
   * 保存错题本
   * @param {Object} errorBook
   */
  saveErrorBook(errorBook) {
    const filePath = this.getFilePath('error');
    fs.writeFileSync(filePath, JSON.stringify(errorBook, null, 2));
  }

  /**
   * 查询错题
   * @param {Object} filters
   * @returns {Array}
   */
  queryErrors(filters = {}) {
    const errorBook = this.loadErrorBook();
    let errors = errorBook.errors;

    if (filters.category) {
      errors = errors.filter(e => e.category === filters.category);
    }

    if (filters.reviewed !== undefined) {
      errors = errors.filter(e => e.reviewed === filters.reviewed);
    }

    return errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 标记错题已复习
   * @param {string} errorId
   */
  markErrorReviewed(errorId) {
    const errorBook = this.loadErrorBook();
    const error = errorBook.errors.find(e => e.id === errorId);

    if (error) {
      error.reviewed = true;
      error.reviewedAt = new Date().toISOString();
      this.saveErrorBook(errorBook);
    }
  }

  // ==================== 记忆库 ====================

  /**
   * 写入记忆
   * @param {string} key - 记忆键
   * @param {Object} value - 记忆值
   */
  setMemory(key, value) {
    const filePath = this.getFilePath('memory');
    const memoryDb = this.loadMemoryDb();

    memoryDb.records[key] = {
      value,
      updatedAt: new Date().toISOString()
    };

    this.saveMemoryDb(memoryDb);
    console.log(`✓ 记忆已写入 [${this.role}]: ${key}`);
  }

  /**
   * 读取记忆
   * @param {string} key
   * @returns {Object|null}
   */
  getMemory(key) {
    const memoryDb = this.loadMemoryDb();
    return memoryDb.records[key] || null;
  }

  /**
   * 加载记忆库
   * @returns {Object}
   */
  loadMemoryDb() {
    const filePath = this.getFilePath('memory');

    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        // 文件损坏，返回空
      }
    }

    return { records: {} };
  }

  /**
   * 保存记忆库
   * @param {Object} memoryDb
   */
  saveMemoryDb(memoryDb) {
    const filePath = this.getFilePath('memory');
    fs.writeFileSync(filePath, JSON.stringify(memoryDb, null, 2));
  }

  // ==================== 辅助方法 ====================

  groupByType(entries) {
    const result = {};
    for (const entry of entries) {
      result[entry.type] = (result[entry.type] || 0) + 1;
    }
    return result;
  }

  /**
   * 获取记忆键（带前缀）
   * @param {string} key
   * @returns {string}
   */
  memoryKey(key) {
    return `${this.role}:${key}`;
  }

  /**
   * 检查记忆是否存在
   * @param {string} key
   * @returns {boolean}
   */
  hasMemory(key) {
    return this.getMemory(key) !== null;
  }

  /**
   * 删除记忆
   * @param {string} key
   */
  deleteMemory(key) {
    const filePath = this.getFilePath('memory');
    const memoryDb = this.loadMemoryDb();

    if (memoryDb.records[key]) {
      delete memoryDb.records[key];
      this.saveMemoryDb(memoryDb);
    }
  }

  /**
   * 清空记忆
   */
  clearMemory() {
    const filePath = this.getFilePath('memory');
    fs.writeFileSync(filePath, JSON.stringify({ records: {} }, null, 2));
  }

  /**
   * 导出记忆为 JSON
   * @returns {string}
   */
  exportMemory() {
    const filePath = this.getFilePath('memory');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return JSON.stringify({ records: {} });
  }

  /**
   * 打印记忆摘要
   */
  printMemorySummary() {
    const memoryDb = this.loadMemoryDb();
    const errorBook = this.loadErrorBook();
    const log = this.loadLog();

    console.log('\n═══════════════════════════════════════════');
    console.log(`        [${this.role}] 外置记忆系统摘要`);
    console.log('═══════════════════════════════════════════\n');

    console.log(`📝 记忆库：${Object.keys(memoryDb.records).length} 条记录`);
    console.log(`📋 错题本：${errorBook.errors.length} 条错题`);
    console.log(`📊 今日日志：${this.getTodaySummary().total} 条记录`);

    if (errorBook.errors.length > 0) {
      const unreviewed = errorBook.errors.filter(e => !e.reviewed).length;
      console.log(`⚠️  未复习错题：${unreviewed} 条`);
    }

    console.log('\n═══════════════════════════════════════════\n');
  }
}

module.exports = MemorySystem;
