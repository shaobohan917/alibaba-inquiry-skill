import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { adMetricRoutes } from './routes/ad-metrics.js';
import { customerRoutes } from './routes/customers.js';
import { inquiryRoutes } from './routes/inquiries.js';
import { salesRoutes } from './routes/sales.js';
import { settingRoutes } from './routes/settings.js';
import { taskRoutes } from './routes/tasks.js';
import { createAgentRoutes } from './routes/agents.js';

export function createApp(repositories, options = {}) {
  const app = express();
  const { agentManager, agentLogManager } = options;

  app.use(
    cors({
      origin: config.corsOrigin.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ali-ai-agent-system-api',
      version: '2.0.0',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/tasks', taskRoutes(repositories));
  app.use('/api/customers', customerRoutes(repositories));
  app.use('/api/inquiries', inquiryRoutes(repositories));
  app.use('/api/sales', salesRoutes(repositories));
  app.use('/api/ad-metrics', adMetricRoutes(repositories));
  app.use('/api/settings', settingRoutes(repositories));

  // Agent 管理路由
  if (agentManager && agentLogManager) {
    app.use('/api/agents', createAgentRoutes({ agentManager, agentLogManager }));
    console.log('[App] Agent routes enabled');
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
