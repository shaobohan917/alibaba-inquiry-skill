export type AgentStatus = 'online' | 'busy' | 'offline';

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capability: string;
  status: AgentStatus;
  handledToday: number;
}
