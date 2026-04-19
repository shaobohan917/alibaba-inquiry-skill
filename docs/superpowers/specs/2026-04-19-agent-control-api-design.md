# Agent 控制系统 API 设计

**日期**: 2026-04-19  
**作者**: AI Agent Team  
**版本**: v1.0

---

## 概述

本设计文档描述如何在 React + Tauri 前端应用中启动和控制 7 大业务 Agent，实现可视化操作界面。

---

## 架构设计

### 整体流程

```
┌─────────────────┐     HTTP      ┌─────────────────┐    spawn    ┌─────────────────┐
│   React 前端     │ ───────────→  │  Express 后端   │ ─────────→  │   Agent 进程     │
│  (Tauri 应用)   │ ← ──────────  │  (web-app/      │ ← ─────────  │ (agents/*.js)   │
│                 │   SSE 日志    │   backend/)     │  进程退出   │                 │
└─────────────────┘               └─────────────────┘             └─────────────────┘
```

### 技术选型

| 模块 | 技术 | 说明 |
|------|------|------|
| 进程管理 | `child_process.spawn` | Node.js 原生子进程 |
| 日志推送 | SSE (Server-Sent Events) | 单向 HTTP 长连接 |
| 状态存储 | Express 内存 Map | 运行时状态，重启清零 |
| 前端状态 | Zustand | React 状态管理 |

---

## API 接口设计

### 1. 获取所有 Agent 状态

```http
GET /api/agents/status
```

**响应**:
```json
{
  "agents": [
    { "role": "sales", "status": "running", "pid": 12345, "startedAt": "2026-04-19T10:00:00Z" },
    { "role": "operation", "status": "offline", "pid": null, "startedAt": null },
    { "role": "procurement", "status": "running", "pid": 12347, "startedAt": "2026-04-19T09:30:00Z" }
  ]
}
```

---

### 2. 启动指定 Agent

```http
POST /api/agents/:role/start
Content-Type: application/json

{
  "args": ["worker"],
  "options": {
    "env": { "SHOP_TYPE": "export" }
  }
}
```

**路径参数**:
- `role`: `sales` | `operation` | `procurement` | `inventory` | `logistics` | `design` | `supervisor`

**响应**:
```json
{
  "success": true,
  "pid": 12345,
  "role": "sales",
  "message": "Agent 已启动"
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": "sales 已在运行中 (PID: 12345)"
}
```

---

### 3. 停止指定 Agent

```http
POST /api/agents/:role/stop
```

**响应**:
```json
{
  "success": true,
  "role": "sales",
  "message": "Agent 已停止",
  "exitCode": 0
}
```

**错误响应** (400):
```json
{
  "success": false,
  "error": "sales 未运行"
}
```

---

### 4. 获取 Agent 实时日志 (SSE)

```http
GET /api/agents/:role/logs
Accept: text/event-stream
```

**响应流**:
```
event: log
data: {"timestamp":"2026-04-19T10:00:01Z","level":"info","message":"🚀 业务员 Agent 启动中..."}

event: log
data: {"timestamp":"2026-04-19T10:00:02Z","level":"info","message":"📍 正在打开阿里巴巴询盘页面..."}

event: status
data: {"role":"sales","status":"running"}
```

---

### 5. 获取历史日志

```http
GET /api/agents/:role/logs/history?limit=100
```

**响应**:
```json
{
  "role": "sales",
  "logs": [
    { "timestamp": "2026-04-19T10:00:01Z", "level": "info", "message": "🚀 业务员 Agent 启动中..." },
    { "timestamp": "2026-04-19T10:00:02Z", "level": "info", "message": "📍 正在打开阿里巴巴询盘页面..." }
  ]
}
```

---

## 后端实现

### `AgentManager` 类

**文件**: `web-app/backend/src/agents/agent-manager.js`

**职责**:
- 维护进程 Map：`Map<role, ChildProcess>`
- 启动/停止 Agent 进程
- 捕获 stdout/stderr 输出
- 广播日志到 SSE 订阅者

**核心方法**:
```javascript
class AgentManager {
  start(role: string, args?: string[], options?: SpawnOptions): ProcessInfo
  stop(role: string): Promise<ExitInfo>
  getStatus(role: string): 'running' | 'offline'
  getAllStatus(): AgentStatus[]
  subscribeLogs(role: string, callback: (log: LogEntry) => void): () => void
}
```

---

### 日志缓冲区

**文件**: `web-app/backend/src/agents/agent-logs.js`

**设计**:
- 每个 Agent 角色维护一个循环缓冲区
- 默认保留最近 500 条日志
- 支持按级别过滤（info/warn/error）
- 新日志追加，旧日志自动淘汰

```javascript
class LogBuffer {
  constructor(maxSize = 500) {
    this.entries = [];
    this.maxSize = maxSize;
  }

  push(entry: LogEntry) {
    if (this.entries.length >= this.maxSize) {
      this.entries.shift();
    }
    this.entries.push(entry);
  }

  getHistory(limit = 100): LogEntry[] {
    return this.entries.slice(-limit);
  }
}
```

---

### SSE 端点实现

```javascript
app.get('/api/agents/:role/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const unsubscribe = agentManager.subscribeLogs(req.params.role, (log) => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});
```

---

## 前端实现

### API 封装

**文件**: `web-app/src/api/agents.ts`

```typescript
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
}

export async function getAgentStatus(): Promise<AgentStatus[]> {
  const res = await fetch(`${BASE_URL}/api/agents/status`);
  return res.json();
}

export async function startAgent(role: string, options?: StartOptions): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/agents/${role}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function stopAgent(role: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/agents/${role}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
}

export function subscribeAgentLogs(
  role: string,
  onLog: (log: LogEntry) => void
): () => void {
  const eventSource = new EventSource(`${BASE_URL}/api/agents/${role}/logs`);
  eventSource.onmessage = (e) => onLog(JSON.parse(e.data));
  return () => eventSource.close();
}
```

---

### Zustand Store

**文件**: `web-app/src/stores/useAgentStore.ts`

```typescript
interface AgentState {
  agents: AgentStatus[];
  logs: Map<string, LogEntry[]>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  startAgent: (role: string) => Promise<void>;
  stopAgent: (role: string) => Promise<void>;
  subscribeLogs: (role: string) => void;
  clearLogs: (role: string) => void;
}
```

---

### 组件设计

#### `AgentCard.tsx` - Agent 状态卡片

```typescript
interface AgentCardProps {
  role: string;
  name: string;
  status: 'running' | 'offline' | 'error';
  pid: number | null;
  onStart: () => void;
  onStop: () => void;
}
```

**UI 元素**:
- Agent 名称 + 图标
- 状态标签（绿色运行中 / 灰色离线 / 红色错误）
- 启动/停止按钮
- PID 显示（运行中时）

---

#### `AgentLogs.tsx` - 日志面板

```typescript
interface AgentLogsProps {
  role: string;
  logs: LogEntry[];
  autoScroll?: boolean;
}
```

**UI 元素**:
- 日志列表（时间戳 + 级别 + 消息）
- 自动滚动开关
- 清空日志按钮
- 级别过滤（全部/info/warn/error）

---

#### `AgentControl.tsx` - 控制台主面板

```typescript
// 7 个 Agent 卡片网格
// 底部全局日志面板（可切换角色）
```

---

## 错误处理

### 进程异常退出

```javascript
proc.on('exit', (code, signal) => {
  agentManager.emitStatus(role, 'error');
  agentManager.emitLog(role, {
    level: 'error',
    message: `进程异常退出 (code: ${code}, signal: ${signal})`,
  });
});
```

### 前端重试机制

```typescript
async function startAgentWithRetry(role: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await startAgent(role);
      return;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}
```

---

## 安全考虑

### 1. 进程权限

- Agent 脚本只能从 `agents/` 目录加载
- 禁止动态路径拼接（防止路径遍历攻击）
- 验证 `role` 参数白名单

```javascript
const ALLOWED_ROLES = ['sales', 'operation', 'procurement', 'inventory', 'logistics', 'design', 'supervisor'];

function validateRole(role: string): void {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`无效的 Agent 角色：${role}`);
  }
}
```

### 2. 资源限制

- 每个 Agent 进程设置内存上限：`--max-old-space-size=512`
- 日志缓冲区大小限制：500 条
- SSE 连接超时：30 秒无心跳自动断开

---

## 测试计划

### 单元测试

1. `AgentManager.start()` - 验证进程创建
2. `AgentManager.stop()` - 验证进程终止
3. `AgentManager.getStatus()` - 验证状态同步
4. `LogBuffer.push()` - 验证循环缓冲

### 集成测试

1. 启动 sales Agent → 验证前端状态变为 `running`
2. 停止 sales Agent → 验证前端状态变为 `offline`
3. 查看日志 → 验证 SSE 推送正常
4. 并发启动多个 Agent → 验证隔离性

### 端到端测试

1. 打开控制台页面 → 所有 Agent 显示离线
2. 点击 sales 卡片启动 → 状态变为运行中，日志开始流动
3. 点击停止 → 状态变为离线
4. 刷新页面 → 状态重置（后端重启）

---

## 后续扩展

1. **任务队列集成** - 前端查看 TaskQueue 任务列表
2. **指标可视化** - Recharts 展示 6 大核心指标
3. **配置管理** - 前端修改 `.env` 配置
4. **通知系统** - 异常时推送系统通知

---

## 验收标准

- [ ] 前端可启动/停止 sales 和 operation Agent
- [ ] 日志实时推送到前端（延迟 < 1 秒）
- [ ] 状态变更同步到前端（延迟 < 500ms）
- [ ] 历史日志可查询（最近 500 条）
- [ ] 异常退出时前端显示错误状态
- [ ] 并发启动多个 Agent 不冲突

---

**评审记录**:
- 设计评审通过：2026-04-19
- 待用户评审后进入实施阶段
