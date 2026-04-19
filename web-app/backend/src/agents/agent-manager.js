/**
 * AgentManager - Agent 进程管理器
 *
 * 负责：
 * - 使用 child_process.spawn 启动 Agent 进程
 * - 支持角色白名单验证
 * - 监听 stdout/stderr 输出到日志管理器
 * - 监听进程退出/错误事件
 * - 提供启动/停止/状态查询方法
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 角色白名单 - 只允许已定义的 7 大 Agent 角色
const ALLOWED_ROLES = new Set([
  'supervisor',  // 总运营
  'sales',       // 业务员
  'operation',   // 运营
  'design',      // 美工
  'procurement', // 采购
  'inventory',   // 库存
  'logistics'    // 物流
]);

// 角色到 Agent 文件路径的映射
const ROLE_TO_AGENT_PATH = {
  supervisor: path.join(__dirname, '../../../../agents/supervisor/index.js'),
  sales: path.join(__dirname, '../../../../agents/sales/index.js'),
  operation: path.join(__dirname, '../../../../agents/operation/index.js'),
  design: path.join(__dirname, '../../../../agents/design/index.js'),
  procurement: path.join(__dirname, '../../../../agents/procurement/index.js'),
  inventory: path.join(__dirname, '../../../../agents/inventory/index.js'),
  logistics: path.join(__dirname, '../../../../agents/logistics/index.js')
};

/**
 * Agent 进程状态枚举
 */
export const AgentStatus = {
  STOPPED: 'stopped',     // 已停止
  STARTING: 'starting',   // 启动中
  RUNNING: 'running',     // 运行中
  STOPPING: 'stopping',   // 停止中
  ERROR: 'error',         // 错误状态
  EXITED: 'exited'        // 已退出
};

/**
 * Agent 进程信息类
 */
class AgentProcessInfo {
  constructor(role, taskId = null) {
    this.role = role;
    this.taskId = taskId;
    this.status = AgentStatus.STOPPED;
    this.pid = null;
    this.spawned = null;
    this.startedAt = null;
    this.exitedAt = null;
    this.exitCode = null;
    this.error = null;
  }
}

/**
 * AgentManager 类
 *
 * 管理所有 Agent 进程的生命周期
 */
export class AgentManager extends EventEmitter {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {Object} options.logManager - 日志管理器实例
   * @param {string} options.nodePath - Node.js 可执行文件路径
   */
  constructor(options = {}) {
    super();
    this.logManager = options.logManager;
    this.nodePath = options.nodePath || 'node';

    // 进程 registry: role -> AgentProcessInfo
    this.processes = new Map();

    // 角色白名单
    this.allowedRoles = ALLOWED_ROLES;
  }

  /**
   * 验证角色是否在白名单中
   * @param {string} role - 角色名称
   * @returns {boolean}
   */
  validateRole(role) {
    return this.allowedRoles.has(role);
  }

  /**
   * 获取角色对应的 Agent 文件路径
   * @param {string} role - 角色名称
   * @returns {string|null}
   */
  getAgentPath(role) {
    return ROLE_TO_AGENT_PATH[role] || null;
  }

  /**
   * 启动 Agent 进程
   * @param {string} role - 角色名称
   * @param {Object} options - 启动选项
   * @param {string} options.taskId - 任务 ID
   * @param {string[]} options.args - 额外的命令行参数
   * @returns {Promise<AgentProcessInfo>}
   */
  async start(role, options = {}) {
    const { taskId = null, args = [] } = options;

    // 1. 验证角色
    if (!this.validateRole(role)) {
      const error = new Error(`不允许的 Agent 角色：${role}，允许的角色：${[...this.allowedRoles].join(', ')}`);
      this.emit('error', { role, error });
      throw error;
    }

    // 2. 检查是否已经在运行
    const existing = this.processes.get(role);
    if (existing && existing.status === AgentStatus.RUNNING) {
      console.log(`[AgentManager] Agent "${role}" 已在运行中，跳过启动`);
      return existing;
    }

    // 3. 获取 Agent 路径
    const agentPath = this.getAgentPath(role);
    if (!agentPath) {
      const error = new Error(`未找到 Agent 路径：${role}`);
      this.emit('error', { role, error });
      throw error;
    }

    // 4. 创建进程信息
    const procInfo = new AgentProcessInfo(role, taskId);
    procInfo.status = AgentStatus.STARTING;
    this.processes.set(role, procInfo);

    // 5. 构建启动参数
    const spawnArgs = [agentPath, 'worker', ...args];
    console.log(`[AgentManager] 启动 Agent: ${role}, pid: ${procInfo.pid}`);

    // 6. 生成日志前缀
    const logPrefix = `[Agent:${role}]`;

    try {
      // 7. Spawn 进程
      const spawned = spawn(this.nodePath, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      procInfo.pid = spawned.pid;
      procInfo.spawned = spawned;
      procInfo.startedAt = new Date();
      procInfo.status = AgentStatus.RUNNING;

      // 8. 监听 stdout
      spawned.stdout.on('data', (data) => {
        const output = data.toString();
        this._handleOutput(role, taskId, output, 'stdout');
      });

      // 9. 监听 stderr
      spawned.stderr.on('data', (data) => {
        const output = data.toString();
        this._handleOutput(role, taskId, output, 'stderr');
      });

      // 10. 监听错误
      spawned.on('error', (error) => {
        this._handleError(role, taskId, error);
      });

      // 11. 监听退出
      spawned.on('exit', (code, signal) => {
        this._handleExit(role, taskId, code, signal);
      });

      // 12. 发送启动通知
      this.emit('start', { role, taskId, pid: spawned.pid });
      console.log(`[AgentManager] Agent "${role}" 已启动 (PID: ${spawned.pid})`);

      return procInfo;
    } catch (error) {
      procInfo.status = AgentStatus.ERROR;
      procInfo.error = error.message;
      this._handleError(role, taskId, error);
      throw error;
    }
  }

  /**
   * 停止 Agent 进程
   * @param {string} role - 角色名称
   * @param {Object} options - 停止选项
   * @param {number} options.timeout - 超时时间（毫秒），默认 5000ms
   * @param {string} options.signal - 退出信号，默认 'SIGTERM'
   * @returns {Promise<boolean>} 是否成功停止
   */
  async stop(role, options = {}) {
    const { timeout = 5000, signal = 'SIGTERM' } = options;

    const procInfo = this.processes.get(role);
    if (!procInfo || !procInfo.spawned) {
      console.log(`[AgentManager] Agent "${role}" 未运行，无需停止`);
      return false;
    }

    if (procInfo.status === AgentStatus.STOPPING || procInfo.status === AgentStatus.STOPPED) {
      console.log(`[AgentManager] Agent "${role}" 已在停止中或已停止`);
      return false;
    }

    // 1. 标记为停止中
    procInfo.status = AgentStatus.STOPPING;
    console.log(`[AgentManager] 正在停止 Agent "${role}" (PID: ${procInfo.pid})...`);

    // 2. 发送退出信号
    const killed = procInfo.spawned.kill(signal);

    if (!killed) {
      console.log(`[AgentManager] 发送 ${signal} 信号失败，尝试强制杀死进程`);
      // 尝试强制杀死
      try {
        process.kill(procInfo.pid, 'SIGKILL');
      } catch (e) {
        console.log(`[AgentManager] 强制杀死进程失败：${e.message}`);
      }
    }

    // 3. 等待进程退出
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkExit = () => {
        const current = this.processes.get(role);
        if (!current || current.status === AgentStatus.STOPPED || current.status === AgentStatus.EXITED) {
          console.log(`[AgentManager] Agent "${role}" 已停止`);
          resolve(true);
          return;
        }

        // 检查超时
        if (Date.now() - startTime > timeout) {
          console.log(`[AgentManager] 停止 Agent "${role}" 超时，尝试强制杀死`);
          try {
            process.kill(current.pid, 'SIGKILL');
          } catch (e) {
            // 进程可能已经不存在
          }
          current.status = AgentStatus.STOPPED;
          current.exitedAt = new Date();
          this.emit('stop', { role, taskId: current.taskId, forced: true });
          resolve(true);
          return;
        }

        // 继续等待
        setTimeout(checkExit, 100);
      };

      checkExit();
    });
  }

  /**
   * 停止所有 Agent 进程
   * @param {Object} options - 停止选项
   * @returns {Promise<Object>} 各角色的停止结果
   */
  async stopAll(options = {}) {
    const results = {};
    const stopPromises = [];

    for (const [role, procInfo] of this.processes.entries()) {
      if (procInfo.status === AgentStatus.RUNNING || procInfo.status === AgentStatus.STARTING) {
        stopPromises.push(
          this.stop(role, options).then(success => {
            results[role] = { success };
          }).catch(error => {
            results[role] = { success: false, error: error.message };
          })
        );
      }
    }

    await Promise.all(stopPromises);
    return results;
  }

  /**
   * 查询 Agent 状态
   * @param {string} role - 角色名称
   * @returns {Object|null} 进程状态信息
   */
  getStatus(role) {
    const procInfo = this.processes.get(role);
    if (!procInfo) {
      return null;
    }

    return {
      role: procInfo.role,
      taskId: procInfo.taskId,
      status: procInfo.status,
      pid: procInfo.pid,
      startedAt: procInfo.startedAt,
      exitedAt: procInfo.exitedAt,
      exitCode: procInfo.exitCode,
      error: procInfo.error,
      uptime: procInfo.startedAt ?
        (procInfo.exitedAt || new Date()) - procInfo.startedAt :
        null
    };
  }

  /**
   * 查询所有 Agent 状态
   * @returns {Object[]} 所有进程状态信息数组
   */
  getAllStatus() {
    const results = [];
    // 返回所有允许的角色状态，包括未启动的
    for (const role of this.allowedRoles) {
      const status = this.getStatus(role);
      if (status) {
        results.push(status);
      }
    }
    return results;
  }

  /**
   * 检查 Agent 是否正在运行
   * @param {string} role - 角色名称
   * @returns {boolean}
   */
  isRunning(role) {
    const procInfo = this.processes.get(role);
    return procInfo ? procInfo.status === AgentStatus.RUNNING : false;
  }

  /**
   * 处理进程输出
   * @private
   */
  _handleOutput(role, taskId, output, source) {
    const logPrefix = `[Agent:${role}]`;
    const trimmedOutput = output.trim();

    // 输出到控制台
    if (source === 'stderr') {
      console.error(`${logPrefix} ${trimmedOutput}`);
    } else {
      console.log(`${logPrefix} ${trimmedOutput}`);
    }

    // 发送到日志管理器
    if (this.logManager) {
      this.logManager.append(role, {
        timestamp: new Date().toISOString(),
        level: source === 'stderr' ? 'error' : 'info',
        source: 'stdout',
        message: trimmedOutput
      });
    }

    // 触发事件
    this.emit('output', { role, taskId, output: trimmedOutput, source });
  }

  /**
   * 处理进程错误
   * @private
   */
  _handleError(role, taskId, error) {
    const procInfo = this.processes.get(role);
    if (procInfo) {
      procInfo.status = AgentStatus.ERROR;
      procInfo.error = error.message;
    }

    console.error(`[AgentManager] Agent "${role}" 发生错误：${error.message}`);

    // 发送到日志管理器
    if (this.logManager) {
      this.logManager.append(role, {
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'process',
        message: `进程错误：${error.message}`
      });
    }

    // 触发错误事件
    this.emit('error', { role, taskId, error });
  }

  /**
   * 处理进程退出
   * @private
   */
  _handleExit(role, taskId, code, signal) {
    const procInfo = this.processes.get(role);
    if (procInfo) {
      procInfo.status = AgentStatus.EXITED;
      procInfo.exitedAt = new Date();
      procInfo.exitCode = code;
      procInfo.spawned = null;
    }

    const exitInfo = code !== null ? `退出码：${code}` : `信号：${signal}`;
    console.log(`[AgentManager] Agent "${role}" 已退出：${exitInfo}`);

    // 发送到日志管理器
    if (this.logManager) {
      this.logManager.append(role, {
        timestamp: new Date().toISOString(),
        level: code === 0 ? 'info' : 'warning',
        source: 'process',
        message: `进程退出：${exitInfo}`
      });
    }

    // 触发退出事件
    this.emit('exit', { role, taskId, code, signal });
  }
}

export default AgentManager;
