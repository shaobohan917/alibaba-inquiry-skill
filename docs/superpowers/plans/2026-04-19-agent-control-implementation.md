# Agent 控制系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 React + Tauri 前端应用中实现 Agent 可视化控制，支持启动/停止 7 大业务 Agent 并实时查看日志

**Architecture:** 
- 后端 Express 通过 `child_process.spawn` 管理 Agent 进程
- SSE 单向推送日志到前端
- 前端 Zustand 管理状态，EventSource 订阅日志

**Tech Stack:** Node.js child_process, Express, SSE, React, Zustand, TypeScript

---

## 文件结构总览

**后端新增/修改**:
| 文件 | 类型 | 职责 |
|------|------|------|
| `backend/src/agents/agent-logs.js` | 新建 | 日志缓冲区（循环队列） |
| `backend/src/agents/agent-manager.js` | 新建 | 进程管理核心 |
| `backend/src/routes/agents.js` | 新建 | REST API + SSE 端点 |
| `backend/src/server.js` | 修改 | 注册 agents 路由 |
| `backend/src/config.js` | 修改 | 添加 `agentsDir` 配置 |

**前端新增/修改**:
| 文件 | 类型 | 职责 |
|------|------|------|
| `src/api/agents.ts` | 新建 | API 封装（fetch + EventSource） |
| `src/stores/useAgentStore.ts` | 修改 | 扩展状态和 actions |
| `src/components/agent/AgentCard.tsx` | 新建 | Agent 状态卡片 |
| `src/components/agent/AgentLogs.tsx` | 新建 | 日志面板组件 |
| `src/pages/dashboard/ConsolePage.tsx` | 修改 | 重构为真实数据驱动 |

**Agents 目录改造**：
| 文件 | 修改 | 职责 |
|------|------|------|
| `agents/sales/index.js` | 修改 | 添加 `worker` 模式 |
| `agents/operation/index.js` | 修改 | 添加 `worker` 模式 |

---

## Task 1: 后端日志缓冲区

**Files:**
- Create: `web-app/backend/src/agents/agent-logs.js`
- Test: `web-app/backend/tests/agent-logs.test.js`

- [ ] **Step 1: 创建测试文件**

```javascript
// web-app/backend/tests/agent-logs.test.js
import { describe, it, expect } from 'vitest';
import { LogBuffer, AgentLogManager } from '../src/agents/agent-logs.js';

describe('LogBuffer', () => {
  it('应该追加日志条目', () => {
    const buffer = new LogBuffer(10);
    buffer.push({ message: 'test1' });
    buffer.push({ message: 'test2' });
    expect(buffer.getHistory()).toHaveLength(2);
  });

  it('应该在超过 maxSize 时淘汰旧日志', () => {
    const buffer = new LogBuffer(3);
    buffer.push({ message: '1' });
    buffer.push({ message: '2' });
    buffer.push({ message: '3' });
    buffer.push({ message: '4' });
    const history = buffer.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].message).toBe('2');
  });

  it('应该支持限制返回数量', () => {
    const buffer = new LogBuffer(10);
    for (let i = 1; i <= 5; i++) buffer.push({ message: String(i) });
    expect(buffer.getHistory(2)).toHaveLength(2);
    expect(buffer.getHistory(2)[0].message).toBe('4');
  });
});

describe('AgentLogManager', () => {
  it('应该为每个 role 创建独立的 LogBuffer', () => {
    const manager = new AgentLogManager();
    manager.push('sales', { message: 's1' });
    manager.push('operation', { message: 'o1' });
    expect(manager.getHistory('sales').length).toBe(1);
    expect(manager.getHistory('operation').length).toBe(1);
  });

  it('应该支持订阅者回调', () => {
    const manager = new AgentLogManager();
    const received = [];
    manager.subscribe('sales', (log) => received.push(log));
    manager.push('sales', { message: 'test' });
    expect(received).toHaveLength(1);
  });

  it('应该支持取消订阅', () => {
    const manager = new AgentLogManager();
    const callback = (log) => {};
    manager.subscribe('sales', callback);
    manager.unsubscribe('sales', callback);
    expect(manager.subscribers.get('sales')?.size).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd web-app/backend
npm test -- tests/agent-logs.test.js
```
Expected: FAIL with "module not found"

- [ ] **Step 3: 创建 LogBuffer 类**

```javascript
// web-app/backend/src/agents/agent-logs.js

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
```

- [ ] **Step 4: 创建 AgentLogManager 类**

```javascript
// web-app/backend/src/agents/agent-logs.js
// 接在 LogBuffer 后面

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
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd web-app/backend
npm test -- tests/agent-logs.test.js
```
Expected: PASS (5/5 tests)

- [ ] **Step 6: 提交**

```bash
cd web-app
git add backend/src/agents/agent-logs.js backend/tests/agent-logs.test.js
git commit -m "feat: 日志缓冲区 + 订阅机制"
```

---

## Task 2: 后端进程管理器

**Files:**
- Create: `web-app/backend/src/agents/agent-manager.js`
- Test: `web-app/backend/tests/agent-manager.test.js`

- [ ] **Step 1: 创建进程管理器（无测试，集成验证）**

```javascript
// web-app/backend/src/agents/agent-manager.js
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentLogManager } from './agent-logs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(__dirname, '..', '..', '..', 'agents');

const ALLOWED_ROLES = [
  'sales',
  'operation',
  'procurement',
  'inventory',
  'logistics',
  'design',
  'supervisor'
];

/**
 * Agent 进程管理器
 */
class AgentManager {
  constructor() {
    this.processes = new Map(); // role -> { process, startedAt }
  }

  /**
   * 验证角色
   * @param {string} role
   * @returns {boolean}
   */
  validateRole(role) {
    return ALLOWED_ROLES.includes(role);
  }

  /**
   * 获取 Agent 脚本路径
   * @param {string} role
   * @returns {string}
   */
  getScriptPath(role) {
    return path.join(AGENTS_DIR, role, 'index.js');
  }

  /**
   * 启动 Agent
   * @param {string} role
   * @param {string[]} args
   * @param {Object} options
   * @returns {Object} { pid, role }
   */
  start(role, args = [], options = {}) {
    if (!this.validateRole(role)) {
      throw new Error(`无效的 Agent 角色：${role}`);
    }

    if (this.processes.has(role)) {
      const existing = this.processes.get(role);
      throw new Error(`${role} 已在运行中 (PID: ${existing.process.pid})`);
    }

    const script = this.getScriptPath(role);
    const nodeArgs = [
      '--max-old-space-size=512',
      script,
      ...args
    ];

    const proc = spawn('node', nodeArgs, {
      cwd: AGENTS_DIR,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    agentLogManager.push(role, {
      level: 'info',
      message: `🚀 ${role} Agent 启动中 (PID: ${proc.pid})...`
    });

    // 监听 stdout
    proc.stdout.on('data', (data) => {
      const message = data.toString().trim();
      agentLogManager.push(role, {
        level: 'info',
        message
      });
    });

    // 监听 stderr
    proc.stderr.on('data', (data) => {
      const message = data.toString().trim();
      agentLogManager.push(role, {
        level: 'error',
        message
      });
    });

    // 监听退出
    proc.on('exit', (code, signal) => {
      agentLogManager.push(role, {
        level: 'warn',
        message: `⚠️ ${role} Agent 已退出 (code: ${code}, signal: ${signal})`
      });
      agentLogManager.notify(role, {
        type: 'status',
        status: 'offline'
      });
      this.processes.delete(role);
    });

    // 监听错误
    proc.on('error', (err) => {
      agentLogManager.push(role, {
        level: 'error',
        message: `❌ ${role} Agent 错误：${err.message}`
      });
      this.processes.delete(role);
    });

    this.processes.set(role, {
      process: proc,
      startedAt: new Date().toISOString()
    });

    agentLogManager.notify(role, {
      type: 'status',
      status: 'running'
    });

    return {
      pid: proc.pid,
      role,
      startedAt: this.processes.get(role).startedAt
    };
  }

  /**
   * 停止 Agent
   * @param {string} role
   * @returns {Object} { success: boolean, exitCode?: number }
   */
  stop(role) {
    const procInfo = this.processes.get(role);
    if (!procInfo) {
      throw new Error(`${role} 未运行`);
    }

    return new Promise((resolve) => {
      const { process } = procInfo;
      
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          process.kill('SIGKILL');
          this.processes.delete(role);
          resolved = true;
          resolve({ success: true, exitCode: null, forceKilled: true });
        }
      }, 5000);

      process.once('exit', (code) => {
        if (!resolved) {
          clearTimeout(timeout);
          this.processes.delete(role);
          resolved = true;
          resolve({ success: true, exitCode: code });
        }
      });

      process.kill('SIGTERM');
    });
  }

  /**
   * 获取单个 Agent 状态
   * @param {string} role
   * @returns {Object|null}
   */
  getStatus(role) {
    const procInfo = this.processes.get(role);
    if (!procInfo) {
      return { role, status: 'offline', pid: null, startedAt: null };
    }
    return {
      role,
      status: 'running',
      pid: procInfo.process.pid,
      startedAt: procInfo.startedAt
    };
  }

  /**
   * 获取所有 Agent 状态
   * @returns {Array}
   */
  getAllStatus() {
    return ALLOWED_ROLES.map(role => this.getStatus(role));
  }

  /**
   * 订阅日志
   * @param {string} role
   * @param {(entry: Object) => void} callback
   * @returns {() => void}
   */
  subscribeLogs(role, callback) {
    return agentLogManager.subscribe(role, callback);
  }

  /**
   * 获取历史日志
   * @param {string} role
   * @param {number} limit
   * @returns {Array}
   */
  getLogs(role, limit = 100) {
    return agentLogManager.getHistory(role, limit);
  }
}

// 导出单例
export const agentManager = new AgentManager();
export default agentManager;
```

- [ ] **Step 2: 提交**

```bash
cd web-app
git add backend/src/agents/agent-manager.js
git commit -m "feat: Agent 进程管理器（启动/停止/日志）"
```

---

## Task 3: 后端 REST API + SSE 端点

**Files:**
- Create: `web-app/backend/src/routes/agents.js`
- Modify: `web-app/backend/src/server.js`

- [x] **Step 1: 创建路由文件**

✅ 已完成 - 所有 6 个端点已实现并测试通过

**Commit:** `7906446 feat: 完成 Agent REST API + SSE 日志推送端点`

---

## Task 4: 前端 API 封装

**Files:**
- Create: `web-app/src/api/agents.ts`

- [ ] **Step 1: 创建 API 封装**

```typescript
// web-app/src/api/agents.ts

const BASE_URL = 'http://localhost:3001';

export interface AgentStatus {
  role: string;
  status: 'running' | 'offline' | 'error';
  pid: number | null;
  startedAt: string | null;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  type?: 'status';
  status?: 'running' | 'offline';
}

export interface StartAgentOptions {
  args?: string[];
  options?: {
    env?: Record<string, string>;
  };
}

/**
 * 获取所有 Agent 状态
 */
export async function getAgentStatus(): Promise<AgentStatus[]> {
  const res = await fetch(`${BASE_URL}/api/agents/status`);
  if (!res.ok) {
    throw new Error(`获取 Agent 状态失败：${res.statusText}`);
  }
  const data = await res.json();
  return data.agents;
}

/**
 * 启动 Agent
 */
export async function startAgent(
  role: string,
  options?: StartAgentOptions
): Promise<{ pid: number; role: string; startedAt: string }> {
  const res = await fetch(`${BASE_URL}/api/agents/${role}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `启动 ${role} Agent 失败`);
  }
  return res.json();
}

/**
 * 停止 Agent
 */
export async function stopAgent(role: string): Promise<{ exitCode: number | null }> {
  const res = await fetch(`${BASE_URL}/api/agents/${role}/stop`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `停止 ${role} Agent 失败`);
  }
  return res.json();
}

/**
 * 获取历史日志
 */
export async function getAgentLogs(
  role: string,
  limit = 100
): Promise<LogEntry[]> {
  const res = await fetch(`${BASE_URL}/api/agents/${role}/logs/history?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`获取日志失败：${res.statusText}`);
  }
  const data = await res.json();
  return data.logs;
}

/**
 * 订阅实时日志 (SSE)
 * @returns 取消订阅函数
 */
export function subscribeAgentLogs(
  role: string,
  onLog: (log: LogEntry) => void,
  onError?: (error: Event) => void
): () => void {
  const eventSource = new EventSource(`${BASE_URL}/api/agents/${role}/logs`);

  eventSource.onmessage = (e) => {
    try {
      const entry = JSON.parse(e.data);
      onLog(entry);
    } catch (err) {
      console.error('SSE 消息解析失败:', err);
    }
  };

  eventSource.onerror = (e) => {
    console.error(`SSE 连接错误 [${role}]:`, e);
    onError?.(e);
  };

  return () => {
    eventSource.close();
  };
}
```

- [ ] **Step 2: 提交**

```bash
cd web-app
git add src/api/agents.ts
git commit -m "feat: 前端 Agent API 封装"
```

---

## Task 5: 扩展 Zustand Store

**Files:**
- Modify: `web-app/src/stores/useAgentStore.ts`

- [ ] **Step 1: 读取当前文件确认结构**

- [ ] **Step 2: 重写 Store**

```typescript
// web-app/src/stores/useAgentStore.ts
import { create } from 'zustand';
import {
  getAgentStatus,
  startAgent,
  stopAgent,
  getAgentLogs,
  subscribeAgentLogs,
  type AgentStatus,
  type LogEntry,
} from '../api/agents';

interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capability: string;
}

const agentProfiles: AgentProfile[] = [
  { id: 'sales', name: '业务员 Agent', role: '询盘转化', capability: '客户识别、报价建议、跟进节奏' },
  { id: 'operation', name: '运营 Agent', role: '投流优化', capability: '关键词、广告、商品诊断' },
  { id: 'procurement', name: '采购 Agent', role: '供应链比价', capability: '1688 寻源、供应商评分' },
  { id: 'inventory', name: '库存 Agent', role: '履约监控', capability: '库存预警、发货排程' },
  { id: 'logistics', name: '物流 Agent', role: '运费决策', capability: '渠道对比、轨迹同步' },
  { id: 'design', name: '设计 Agent', role: '素材生产', capability: '主图、详情页、海报生成' },
  { id: 'supervisor', name: '主管 Agent', role: '任务调度', capability: '跨 Agent 编排、异常接管' },
];

interface AgentState {
  // 状态
  agents: AgentStatus[];
  logs: Map<string, LogEntry[]>;
  subscriptions: Map<string, () => void>;
  selectedAgentId: string | null;
  
  // UI 状态
  loading: boolean;
  error: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  startAgent: (role: string) => Promise<void>;
  stopAgent: (role: string) => Promise<void>;
  subscribeLogs: (role: string) => void;
  clearLogs: (role: string) => void;
  selectAgent: (agentId: string | null) => void;
  getProfile: (roleId: string) => AgentProfile | undefined;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  logs: new Map(),
  subscriptions: new Map(),
  selectedAgentId: null,
  loading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await getAgentStatus();
      set({ agents, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取状态失败', loading: false });
    }
  },

  startAgent: async (role) => {
    set({ loading: true, error: null });
    try {
      await startAgent(role);
      await get().fetchStatus();
      get().subscribeLogs(role);
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '启动失败', loading: false });
    }
  },

  stopAgent: async (role) => {
    set({ loading: true, error: null });
    try {
      await stopAgent(role);
      await get().fetchStatus();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '停止失败', loading: false });
    }
  },

  subscribeLogs: (role) => {
    const { subscriptions, logs } = get();
    
    // 已订阅则跳过
    if (subscriptions.has(role)) return;

    // 先加载历史日志
    getAgentLogs(role, 100).then((history) => {
      set((state) => ({
        logs: new Map(state.logs).set(role, history),
      }));
    });

    // 订阅实时日志
    const unsubscribe = subscribeAgentLogs(role, (entry) => {
      set((state) => {
        const roleLogs = state.logs.get(role) || [];
        const newLogs = [...roleLogs, entry].slice(-500); // 最多 500 条
        return { logs: new Map(state.logs).set(role, newLogs) };
      });
    });

    set((state) => ({
      subscriptions: new Map(state.subscriptions).set(role, unsubscribe),
    }));
  },

  clearLogs: (role) => {
    set((state) => ({
      logs: new Map(state.logs).set(role, []),
    }));
  },

  selectAgent: (agentId) => {
    set({ selectedAgentId: agentId });
  },

  getProfile: (roleId) => {
    return agentProfiles.find(p => p.id === roleId);
  },
}));
```

- [ ] **Step 3: 提交**

```bash
cd web-app
git add src/stores/useAgentStore.ts
git commit -m "feat: Zustand Store 扩展（Agent 状态 + 日志）"
```

---

## Task 6: AgentCard 组件

**Files:**
- Create: `web-app/src/components/agent/AgentCard.tsx`

- [ ] **Step 1: 创建组件**

```typescript
// web-app/src/components/agent/AgentCard.tsx
import { Card, Tag, Button, Space, Typography } from 'antd';
import { PlayCircleOutlined, StopOutlined, CloudSyncOutlined } from '@ant-design/icons';

interface AgentCardProps {
  role: string;
  name: string;
  capability: string;
  status: 'running' | 'offline' | 'error';
  pid: number | null;
  onStart: () => void;
  onStop: () => void;
  loading?: boolean;
}

export function AgentCard({
  role,
  name,
  capability,
  status,
  pid,
  onStart,
  onStop,
  loading = false,
}: AgentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'green';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    if (status === 'running' && pid) {
      return `运行中 (PID: ${pid})`;
    }
    return status === 'running' ? '运行中' : status;
  };

  return (
    <Card
      title={name}
      extra={
        <Tag color={getStatusColor()}>{getStatusText()}</Tag>
      }
      bordered={status === 'running'}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Typography.Text strong>{role}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {capability}
        </Typography.Text>
        
        <Space style={{ marginTop: 8 }}>
          {status === 'running' ? (
            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              loading={loading}
              size="small"
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onStart}
              loading={loading}
              size="small"
            >
              启动
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
cd web-app
git add src/components/agent/AgentCard.tsx
git commit -m "feat: AgentCard 组件"
```

---

## Task 7: AgentLogs 组件

**Files:**
- Create: `web-app/src/components/agent/AgentLogs.tsx`

- [ ] **Step 1: 创建组件**

```typescript
// web-app/src/components/agent/AgentLogs.tsx
import { Card, List, Typography, Space, Button, Switch } from 'antd';
import { ClearOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface AgentLogsProps {
  role: string;
  logs: LogEntry[];
  onClear?: () => void;
}

const levelColors: Record<string, string> = {
  info: '#1677ff',
  warn: '#faad14',
  error: '#ff4d4f',
};

export function AgentLogs({ role, logs, onClear }: AgentLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card
      title={`📋 ${role} 日志`}
      extra={
        <Space size="small">
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="自动滚动"
            unCheckedChildren="手动"
            size="small"
          />
          {onClear && (
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={onClear}
              size="small"
            >
              清空
            </Button>
          )}
        </Space>
      }
      size="small"
    >
      <div
        ref={listRef}
        style={{
          height: 400,
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
          borderRadius: 4,
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {logs.length === 0 ? (
          <Typography.Text type="secondary">暂无日志</Typography.Text>
        ) : (
          <List
            dataSource={logs}
            renderItem={(log) => (
              <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                <Space size={8} style={{ alignItems: 'flex-start' }}>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 11, minWidth: 70 }}
                  >
                    {formatTime(log.timestamp)}
                  </Typography.Text>
                  <Tag color={levelColors[log.level]} style={{ margin: 0 }}>
                    {log.level.toUpperCase()}
                  </Tag>
                  <Typography.Text
                    copyable={{ text: log.message }}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  >
                    {log.message}
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
cd web-app
git add src/components/agent/AgentLogs.tsx
git commit -m "feat: AgentLogs 日志面板组件"
```

---

## Task 8: 重构 ConsolePage

**Files:**
- Modify: `web-app/src/pages/dashboard/ConsolePage.tsx`

- [ ] **Step 1: 读取当前文件**

- [ ] **Step 2: 重构页面**

```typescript
// web-app/src/pages/dashboard/ConsolePage.tsx
import { Alert, Row, Col, Space, Typography, Empty } from 'antd';
import { useEffect } from 'react';
import { useAgentStore } from '../../stores/useAgentStore';
import { AgentCard } from '../../components/agent/AgentCard';
import { AgentLogs } from '../../components/agent/AgentLogs';

export function ConsolePage() {
  const {
    agents,
    logs,
    subscriptions,
    selectedAgentId,
    loading,
    error,
    fetchStatus,
    startAgent,
    stopAgent,
    subscribeLogs,
    clearLogs,
    selectAgent,
    getProfile,
  } = useAgentStore();

  // 初始化加载状态
  useEffect(() => {
    fetchStatus();
  }, []);

  // 自动订阅运行中 Agent 的日志
  useEffect(() => {
    agents.forEach((agent) => {
      if (agent.status === 'running' && !subscriptions.has(agent.role)) {
        subscribeLogs(agent.role);
      }
    });
  }, [agents]);

  const handleStart = async (role: string) => {
    await startAgent(role);
  };

  const handleStop = async (role: string) => {
    await stopAgent(role);
  };

  const selectedAgent = agents.find(a => a.role === selectedAgentId);

  return (
    <Space direction="vertical" size={20} className="page-stack" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>主控制台</Typography.Title>
        <Typography.Text type="secondary">
          统一查看 Agent 协作状态、关键任务与异常提醒。
        </Typography.Text>
      </div>

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          closable
        />
      )}

      {/* Agent 卡片网格 */}
      <Row gutter={[16, 16]}>
        {agents.length === 0 ? (
          <Col span={24}>
            <Empty description="加载中..." />
          </Col>
        ) : (
          agents.map((agent) => {
            const profile = getProfile(agent.role);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={agent.role}>
                <AgentCard
                  role={profile?.role || agent.role}
                  name={profile?.name || agent.role}
                  capability={profile?.capability || ''}
                  status={agent.status}
                  pid={agent.pid}
                  onStart={() => handleStart(agent.role)}
                  onStop={() => handleStop(agent.role)}
                  loading={loading}
                />
              </Col>
            );
          })
        )}
      </Row>

      {/* 日志面板 */}
      {selectedAgentId ? (
        <AgentLogs
          role={selectedAgentId}
          logs={logs.get(selectedAgentId) || []}
          onClear={() => clearLogs(selectedAgentId)}
        />
      ) : (
        <Alert
          message="选择一个 Agent 查看日志"
          description="点击上方的 Agent 卡片可查看实时日志输出"
          type="info"
          showIcon
        />
      )}
    </Space>
  );
}
```

- [ ] **Step 3: 提交**

```bash
cd web-app
git add src/pages/dashboard/ConsolePage.tsx
git commit -m "feat: ConsolePage 重构为真实数据驱动"
```

---

## Task 9: 集成测试 + 修复

**Files:**
- 所有已创建文件

- [ ] **Step 1: 启动后端验证**

```bash
cd web-app/backend
npm run backend:dev
```
Expected: 输出 "Agents endpoint: http://localhost:3001/api/agents/status"

- [ ] **Step 2: 测试 API**

```bash
# 获取状态
curl http://localhost:3001/api/agents/status

# 启动 sales Agent
curl -X POST http://localhost:3001/api/agents/sales/start

# 再次获取状态（应显示 running）
curl http://localhost:3001/api/agents/status

# 停止 sales Agent
curl -X POST http://localhost:3001/api/agents/sales/stop
```

- [ ] **Step 3: 启动前端验证**

```bash
cd web-app
npm run dev
```
Expected: Vite dev server 启动，访问 http://localhost:5173

- [ ] **Step 4: 手动测试前端**

1. 打开浏览器访问 http://localhost:5173
2. 进入主控制台页面
3. 点击 sales Agent 的"启动"按钮
4. 验证状态变为"运行中"，日志开始流动
5. 点击"停止"按钮
6. 验证状态变为"离线"

- [ ] **Step 5: 提交所有修改**

```bash
cd web-app
git add .
git commit -m "feat: Agent 控制系统集成完成"
```

---

## 验收标准

- [ ] 后端 API 可启动/停止 sales Agent
- [ ] SSE 日志推送延迟 < 1 秒
- [ ] 前端卡片显示正确状态
- [ ] 日志面板实时滚动
- [ ] 并发启动 2 个 Agent 不冲突
- [ ] 异常退出时前端显示错误

---

**预计工作量**: 4-6 小时  
**测试策略**: TDD（后端单元测试 + 前端手动集成测试）
**提交频率**: 每任务 1 提交，共 9 提交
