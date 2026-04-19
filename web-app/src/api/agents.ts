const BASE_URL = 'http://localhost:3001';

export interface AgentStatus {
  role: string;
  taskId?: string | null;
  status: 'running' | 'offline' | 'error' | 'stopped' | 'starting' | 'stopping' | 'exited';
  pid: number | null;
  startedAt: string | null;
  exitedAt?: string | null;
  exitCode?: number | null;
  error?: string;
  uptime?: number | null;
}

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source?: string;
  message: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export interface StartAgentOptions {
  taskId?: string | null;
  args?: string[];
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
  return data.data || data.agents || [];
}

/**
 * 启动 Agent
 */
export async function startAgent(
  role: string,
  options?: StartAgentOptions
): Promise<{ pid: number; role: string; taskId?: string; status: string; startedAt: string }> {
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
export async function stopAgent(role: string): Promise<{ exitCode: number | null; stopped: boolean }> {
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
  return data.data?.logs || data.logs || [];
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
  const eventSource = new EventSource(`${BASE_URL}/api/agents/${role}/logs/sse`);

  // 使用 addEventListener 接收 event: log 类型的事件
  eventSource.addEventListener('log', (e) => {
    try {
      const entry = JSON.parse(e.data);
      onLog(entry);
    } catch (err) {
      console.error('SSE 消息解析失败:', err);
    }
  });

  eventSource.onerror = (e) => {
    console.error(`SSE 连接错误 [${role}]:`, e);
    onError?.(e);
  };

  return () => {
    eventSource.close();
  };
}
