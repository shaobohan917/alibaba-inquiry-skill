/**
 * Agent 管理路由
 *
 * 提供 Agent 启动/停止/状态查询的 HTTP API + SSE 日志推送
 */

import express from 'express';
import { AgentStatus } from '../agents/agent-manager.js';

/**
 * AgentLogManager 订阅者映射
 * role -> Set<res> 用于清理
 */
const sseSubscribers = new Map();

/**
 * 创建 Agent 管理路由
 * @param {Object} deps - 依赖注入
 * @param {AgentManager} deps.agentManager - Agent 管理器实例
 * @param {AgentLogManager} deps.agentLogManager - 日志管理器实例
 * @returns {Router}
 */
export function createAgentRoutes(deps) {
  const { agentManager, agentLogManager } = deps;
  const router = express.Router();

  /**
   * GET /api/agents/status
   * 获取所有 Agent 状态
   */
  router.get('/status', (_req, res) => {
    try {
      const agents = agentManager.getAllStatus();
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/:role/status
   * 获取指定 Agent 状态
   */
  router.get('/:role/status', (req, res) => {
    try {
      const { role } = req.params;
      const status = agentManager.getStatus(role);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: `Agent "${role}" 不存在`
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents
   * 获取所有 Agent 状态（兼容旧版）
   */
  router.get('/', (_req, res) => {
    try {
      const agents = agentManager.getAllStatus();
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/:role
   * 获取指定 Agent 状态（兼容旧版）
   */
  router.get('/:role', (req, res) => {
    try {
      const { role } = req.params;
      const status = agentManager.getStatus(role);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: `Agent "${role}" 不存在`
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/agents/:role/start
   * 启动 Agent
   */
  router.post('/:role/start', async (req, res) => {
    try {
      const { role } = req.params;
      const { taskId, args = [] } = req.body || {};

      // 验证角色
      if (!agentManager.validateRole(role)) {
        return res.status(400).json({
          success: false,
          error: `不允许的 Agent 角色：${role}`
        });
      }

      console.log(`[API] 启动 Agent: ${role}, taskId: ${taskId || 'N/A'}`);

      const procInfo = await agentManager.start(role, { taskId, args });

      res.json({
        success: true,
        data: {
          role: procInfo.role,
          taskId: procInfo.taskId,
          pid: procInfo.pid,
          status: procInfo.status,
          startedAt: procInfo.startedAt
        }
      });
    } catch (error) {
      console.error(`[API] 启动 Agent 失败：${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/agents/:role/stop
   * 停止 Agent
   */
  router.post('/:role/stop', async (req, res) => {
    try {
      const { role } = req.params;
      const { timeout, signal } = req.body || {};

      const options = {};
      if (timeout !== undefined) options.timeout = timeout;
      if (signal !== undefined) options.signal = signal;

      console.log(`[API] 停止 Agent: ${role}`);

      const success = await agentManager.stop(role, options);

      res.json({
        success: true,
        data: {
          role,
          stopped: success
        }
      });
    } catch (error) {
      console.error(`[API] 停止 Agent 失败：${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/agents/stop-all
   * 停止所有 Agent
   */
  router.post('/stop-all', async (_req, res) => {
    try {
      console.log('[API] 停止所有 Agents');

      const results = await agentManager.stopAll();

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error(`[API] 停止所有 Agents 失败：${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/:role/logs
   * SSE 实时日志推送
   */
  router.get('/:role/logs/sse', (req, res) => {
    const { role } = req.params;

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送历史日志
    const history = agentLogManager.getLogs(role, { limit: 100 });
    for (const entry of history) {
      res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
    }

    // 订阅实时日志
    const onLog = (entry) => {
      if (entry.role === role) {
        res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
      }
    };

    agentLogManager.on('log', onLog);

    // 记录订阅者
    if (!sseSubscribers.has(role)) {
      sseSubscribers.set(role, new Set());
    }
    sseSubscribers.get(role).add(res);

    // 客户端断开时清理
    req.on('close', () => {
      agentLogManager.removeListener('log', onLog);
      const subs = sseSubscribers.get(role);
      if (subs) {
        subs.delete(res);
        if (subs.size === 0) {
          sseSubscribers.delete(role);
        }
      }
      console.log(`[SSE] Client disconnected for ${role}`);
    });

    console.log(`[SSE] Client connected for ${role}`);
  });

  /**
   * GET /api/agents/:role/logs/history
   * 获取历史日志（JSON）
   */
  router.get('/:role/logs/history', (req, res) => {
    try {
      const { role } = req.params;
      const { limit = 100, offset = 0, level } = req.query;

      const logs = agentLogManager.getLogs(role, {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        level
      });

      res.json({
        success: true,
        data: {
          role,
          count: logs.length,
          logs
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/:role/logs
   * 获取 Agent 日志（兼容旧版，返回 JSON）
   */
  router.get('/:role/logs', (req, res) => {
    try {
      const { role } = req.params;
      const { limit = 100, offset = 0, level } = req.query;

      const logs = agentLogManager.getLogs(role, {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        level
      });

      res.json({
        success: true,
        data: {
          role,
          count: logs.length,
          logs
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/agents/logs
   * 获取所有 Agent 日志
   */
  router.get('/logs', (req, res) => {
    try {
      const { limit = 100, offset = 0, level, roles } = req.query;

      const options = {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        level
      };

      if (roles) {
        options.roles = Array.isArray(roles) ? roles : [roles];
      }

      const logs = agentLogManager.getAllLogs(options);

      res.json({
        success: true,
        data: {
          count: logs.length,
          logs
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/agents/:role/logs
   * 清空 Agent 日志
   */
  router.delete('/:role/logs', (req, res) => {
    try {
      const { role } = req.params;
      const count = agentLogManager.clear(role);

      res.json({
        success: true,
        data: {
          role,
          cleared: count
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

export default createAgentRoutes;
