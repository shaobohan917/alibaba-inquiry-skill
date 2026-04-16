/**
 * PM2 生态系统配置
 * 支持本地开发和服务器生产环境
 *
 * 用法:
 *   本地开发：pm2 start ecosystem.config.js --env development
 *   生产环境：pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      // Web 可视化服务
      name: 'alibaba-web',
      script: './web/server.js',
      port: 3000,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        instances: 1,
        exec_mode: 'fork'
      },
      ignore_watch: ['node_modules', 'logs', 'data'],
      max_memory_restart: '500M',
      error_file: './logs/pm2/web-error.log',
      out_file: './logs/pm2/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: false  // 不自动重启，由用户手动控制
    },
    {
      // 任务执行器 (常驻服务)
      name: 'alibaba-executor',
      script: './core/task-executor.js',
      args: 'start 5000',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        instances: 1,
        exec_mode: 'fork'
      },
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/pm2/executor-error.log',
      out_file: './logs/pm2/executor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: false  // 不自动重启，由用户手动控制
    },
    {
      // 总监管 Agent (可选常驻)
      name: 'alibaba-supervisor',
      script: './agents/supervisor/index.js',
      args: 'start',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        instances: 1,
        exec_mode: 'fork'
      },
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/pm2/supervisor-error.log',
      out_file: './logs/pm2/supervisor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: false  // 不自动重启，由用户手动控制
    }
  ]
};
