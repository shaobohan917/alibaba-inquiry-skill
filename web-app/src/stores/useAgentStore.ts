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
  fetchFailed: false, // 标记初始加载是否失败

  fetchStatus: async (showError = false) => {
    set({ loading: true, error: null });
    try {
      const agents = await getAgentStatus();
      set({ agents, loading: false, fetchFailed: false });
    } catch (error) {
      // 只在显式请求显示错误时才设置 error 状态
      set({
        error: showError && error instanceof Error ? error.message : null,
        loading: false,
        fetchFailed: true
      });
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
    // 清空前端日志
    set((state) => ({
      logs: new Map(state.logs).set(role, []),
    }));

    // 取消旧的订阅并从 Map 中删除
    const { subscriptions } = get();
    const unsubscribe = subscriptions.get(role);
    if (unsubscribe) {
      unsubscribe();
      // 必须先删除旧的订阅记录，不然重新订阅时会被跳过
      set((state) => {
        const newSubs = new Map(state.subscriptions);
        newSubs.delete(role);
        return { subscriptions: newSubs };
      });
    }

    // 重新订阅实时日志（不加载历史日志，只显示清空后的新日志）
    setTimeout(() => {
      // 直接建立 SSE 订阅，不加载历史日志
      const unsubscribe = subscribeAgentLogs(role, (entry) => {
        set((state) => {
          const roleLogs = state.logs.get(role) || [];
          const newLogs = [...roleLogs, entry].slice(-500);
          return { logs: new Map(state.logs).set(role, newLogs) };
        });
      });
      set((state) => ({
        subscriptions: new Map(state.subscriptions).set(role, unsubscribe),
      }));
      console.log(`${role} 日志已清空，只监听新日志`);
    }, 100);
  },

  selectAgent: (agentId) => {
    set({ selectedAgentId: agentId });
  },

  getProfile: (roleId) => {
    return agentProfiles.find(p => p.id === roleId);
  },
}));
