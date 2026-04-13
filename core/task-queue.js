const fs = require('fs');
const path = require('path');

/**
 * 轻量级任务队列
 * 基于文件系统，支持任务持久化和进度追踪
 */
class TaskQueue {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '..', 'data', 'tasks');
    this.ensureDir();
    this.localCache = new Map(); // 内存缓存
  }

  /**
   * 确保数据目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 生成任务 ID
   * @returns {string}
   */
  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取任务文件路径
   * @param {string} taskId
   * @returns {string}
   */
  getTaskPath(taskId) {
    return path.join(this.dataDir, `${taskId}.json`);
  }

  /**
   * 创建任务
   * @param {Object} task - 任务定义
   * @param {string} task.type - 任务类型 (sales/inquiry, operation/analyze, design/generate 等)
   * @param {string} task.role - 执行角色
   * @param {Object} task.payload - 任务数据
   * @param {string} task.priority - 优先级 (high/normal/low)
   * @returns {string} 任务 ID
   */
  create(task) {
    const taskId = this.generateId();
    const taskData = {
      id: taskId,
      type: task.type,
      role: task.role,
      payload: task.payload,
      priority: task.priority || 'normal',
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null
    };

    const taskPath = this.getTaskPath(taskId);
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
    this.localCache.set(taskId, taskData);

    console.log(`✓ 任务已创建 [${taskId}] type=${task.type} role=${task.role}`);
    return taskId;
  }

  /**
   * 获取任务
   * @param {string} taskId
   * @returns {Object|null}
   */
  get(taskId) {
    // 优先从缓存读取
    if (this.localCache.has(taskId)) {
      return this.localCache.get(taskId);
    }

    const taskPath = this.getTaskPath(taskId);
    if (fs.existsSync(taskPath)) {
      const data = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      this.localCache.set(taskId, data);
      return data;
    }

    return null;
  }

  /**
   * 更新任务状态
   * @param {string} taskId
   * @param {Object} updates - 更新字段
   */
  update(taskId, updates) {
    const task = this.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    Object.assign(task, updates, { updatedAt: new Date().toISOString() });

    if (updates.status === 'running' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }

    if (['completed', 'failed', 'cancelled'].includes(updates.status) && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }

    const taskPath = this.getTaskPath(taskId);
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
    this.localCache.set(taskId, task);
  }

  /**
   * 更新任务进度
   * @param {string} taskId
   * @param {number} progress - 进度百分比 (0-100)
   * @param {string} message - 进度消息
   */
  updateProgress(taskId, progress, message = '') {
    const updates = {
      progress: Math.min(100, Math.max(0, progress))
    };

    if (message) {
      updates.statusMessage = message;
    }

    this.update(taskId, updates);
  }

  /**
   * 标记任务完成
   * @param {string} taskId
   * @param {Object} result - 任务结果
   */
  complete(taskId, result) {
    this.update(taskId, {
      status: 'completed',
      progress: 100,
      result
    });
    console.log(`✓ 任务已完成 [${taskId}]`);
  }

  /**
   * 标记任务失败
   * @param {string} taskId
   * @param {string} error - 错误信息
   */
  fail(taskId, error) {
    this.update(taskId, {
      status: 'failed',
      error: typeof error === 'string' ? error : error.message
    });
    console.error(`✗ 任务失败 [${taskId}]: ${error}`);
  }

  /**
   * 列出任务
   * @param {Object} filters - 过滤条件
   * @param {string} filters.status - 按状态过滤
   * @param {string} filters.role - 按角色过滤
   * @param {string} filters.type - 按类型过滤
   * @returns {Array}
   */
  list(filters = {}) {
    const tasks = [];

    if (!fs.existsSync(this.dataDir)) {
      return tasks;
    }

    const files = fs.readdirSync(this.dataDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const taskPath = path.join(this.dataDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

        // 应用过滤
        if (filters.status && data.status !== filters.status) continue;
        if (filters.role && data.role !== filters.role) continue;
        if (filters.type && !data.type.startsWith(filters.type)) continue;

        tasks.push(data);
      } catch (e) {
        // 忽略无效文件
      }
    }

    // 按优先级和创建时间排序
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    tasks.sort((a, b) => {
      if (a.status !== b.status) {
        // 未完成的任务排在前面
        if (a.status === 'completed') return 1;
        if (b.status === 'completed') return -1;
      }
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return tasks;
  }

  /**
   * 获取下一个待处理任务
   * @param {string} role - 角色名
   * @returns {Object|null}
   */
  next(role) {
    const pendingTasks = this.list({ status: 'pending' });

    // 按优先级排序，找到第一个属于该角色的任务
    for (const task of pendingTasks) {
      if (task.role === role || task.role === 'any') {
        return task;
      }
    }

    return null;
  }

  /**
   * 删除任务
   * @param {string} taskId
   */
  remove(taskId) {
    const taskPath = this.getTaskPath(taskId);
    if (fs.existsSync(taskPath)) {
      fs.unlinkSync(taskPath);
      this.localCache.delete(taskId);
      console.log(`✓ 任务已删除 [${taskId}]`);
    }
  }

  /**
   * 清理已完成任务（超过保留期限的）
   * @param {number} retainDays - 保留天数
   * @returns {number} 清理的任务数量
   */
  cleanup(retainDays = 7) {
    const tasks = this.list();
    const now = Date.now();
    const retainMs = retainDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const task of tasks) {
      if (task.status === 'completed' && task.completedAt) {
        const completedAt = new Date(task.completedAt).getTime();
        if (now - completedAt > retainMs) {
          this.remove(task.id);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`✓ 已清理 ${cleaned} 个过期任务`);
    }

    return cleaned;
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  stats() {
    const tasks = this.list();
    const stats = {
      total: tasks.length,
      byStatus: {},
      byRole: {},
      byPriority: {}
    };

    for (const task of tasks) {
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      stats.byRole[task.role] = (stats.byRole[task.role] || 0) + 1;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    }

    return stats;
  }
}

module.exports = TaskQueue;
