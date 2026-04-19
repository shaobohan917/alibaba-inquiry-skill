import { create } from 'zustand';

import type { AgentProfile } from '../types/agent';

interface AgentState {
  agents: AgentProfile[];
  selectedAgentId: string;
  selectAgent: (agentId: string) => void;
}

const initialAgents: AgentProfile[] = [
  {
    id: 'sales',
    name: '业务员 Agent',
    role: '询盘转化',
    capability: '客户识别、报价建议、跟进节奏',
    status: 'online',
    handledToday: 86,
  },
  {
    id: 'operation',
    name: '运营 Agent',
    role: '投流优化',
    capability: '关键词、广告、商品诊断',
    status: 'busy',
    handledToday: 42,
  },
  {
    id: 'procurement',
    name: '采购 Agent',
    role: '供应链比价',
    capability: '1688 寻源、供应商评分',
    status: 'online',
    handledToday: 31,
  },
  {
    id: 'inventory',
    name: '库存 Agent',
    role: '履约监控',
    capability: '库存预警、发货排程',
    status: 'online',
    handledToday: 27,
  },
  {
    id: 'logistics',
    name: '物流 Agent',
    role: '运费决策',
    capability: '渠道对比、轨迹同步',
    status: 'offline',
    handledToday: 14,
  },
  {
    id: 'design',
    name: '设计 Agent',
    role: '素材生产',
    capability: '主图、详情页、海报生成',
    status: 'busy',
    handledToday: 19,
  },
  {
    id: 'supervisor',
    name: '主管 Agent',
    role: '任务调度',
    capability: '跨 Agent 编排、异常接管',
    status: 'online',
    handledToday: 118,
  },
];

export const useAgentStore = create<AgentState>((set) => ({
  agents: initialAgents,
  selectedAgentId: 'sales',
  selectAgent: (agentId) => set({ selectedAgentId: agentId }),
}));
