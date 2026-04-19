import { config } from './config.js';
import { closeDatabase, getDatabase, initializeDatabase } from './db/database.js';
import { createRepositories } from './repositories/index.js';
import { createApp } from './app.js';
import { AgentManager, AgentLogManager } from './agents/index.js';

// 初始化数据库
const db = initializeDatabase(getDatabase());
const repositories = createRepositories(db);

// 初始化日志管理器
const agentLogManager = new AgentLogManager({
  enablePersistence: true,
  logDir: './logs/agents'
});

// 初始化 Agent 管理器
const agentManager = new AgentManager({
  logManager: agentLogManager
});

// 创建应用，传入依赖
const app = createApp(repositories, { agentManager, agentLogManager });

// 导出全局实例
export { agentManager, agentLogManager };

const server = app.listen(config.port, config.host, () => {
  console.log(`API server listening on http://${config.host}:${config.port}`);
  console.log(`SQLite database: ${config.dbPath}`);
  console.log(`Agent Log Manager: enabled`);
  console.log(`Agent Manager: ready`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down API server`);

  // 先关闭所有 Agent 进程
  console.log('Stopping all agents...');
  await agentManager.stopAll({ timeout: 3000 });

  // 关闭日志管理器
  agentLogManager.destroy();

  server.close(() => {
    closeDatabase();
    console.log('API server shutdown complete');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
