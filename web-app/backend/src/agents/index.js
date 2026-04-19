/**
 * Agents Module - Agent 管理层统一出口
 *
 * 提供 Agent 进程管理和日志管理的统一接口
 */

export { AgentManager, AgentStatus } from './agent-manager.js';
export { AgentLogManager } from './agent-log-manager.js';

// 默认导出
import { AgentManager } from './agent-manager.js';
import { AgentLogManager } from './agent-log-manager.js';

export default {
  AgentManager,
  AgentLogManager
};
