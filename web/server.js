const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const TASKS_DIR = path.join(__dirname, '..', 'data', 'tasks');

// 存储运行中的进程
const runningProcesses = new Map();

/**
 * 启动 Supervisor Agent
 */
async function startSupervisor() {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '..', 'agents', 'supervisor', 'index.js');
    const child = spawn('node', [script, 'start'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    let output = [];

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output.push(text);
      console.log('[Supervisor]', text.trim());
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      output.push(text);
      console.error('[Supervisor Error]', text.trim());
    });

    child.on('exit', (code) => {
      runningProcesses.delete('supervisor');
      if (code === 0) {
        resolve({ success: true, output: output.join('\n') });
      } else {
        reject(new Error(`Supervisor 退出码：${code}`));
      }
    });

    runningProcesses.set('supervisor', child);

    // 等待 3 秒后返回（给 Supervisor 时间执行）
    setTimeout(() => {
      resolve({ success: true, output: output.join('\n'), pid: child.pid });
    }, 3000);
  });
}

/**
 * 启动 Task Executor
 */
async function startExecutor(pollInterval = 5000) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '..', 'core', 'task-executor.js');
    const child = spawn('node', [script, 'start', pollInterval.toString()], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true  // 守护进程
    });

    let output = [];

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output.push({ type: 'stdout', data: text, time: new Date().toISOString() });
      console.log('[Executor]', text.trim());
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      output.push({ type: 'stderr', data: text, time: new Date().toISOString() });
      console.error('[Executor Error]', text.trim());
    });

    child.on('exit', (code) => {
      runningProcesses.delete('executor');
      console.log(`[Executor] 进程退出，退出码：${code}`);
    });

    runningProcesses.set('executor', { child, output, startTime: Date.now() });

    // 等待 5 秒后返回（给 Executor 时间执行第一轮）
    setTimeout(() => {
      resolve({ success: true, output, pid: child.pid });
    }, 5000);
  });
}

/**
 * 获取任务状态
 */
function getTaskStatus() {
  const stats = {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    tasks: []
  };

  if (!fs.existsSync(TASKS_DIR)) {
    return stats;
  }

  const files = fs.readdirSync(TASKS_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const filePath = path.join(TASKS_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      stats.total++;
      stats[data.status] = (stats[data.status] || 0) + 1;
      stats.tasks.push({
        id: data.id,
        type: data.type,
        role: data.role,
        status: data.status,
        progress: data.progress,
        createdAt: data.createdAt,
        completedAt: data.completedAt
      });
    } catch (e) {
      // 忽略无效文件
    }
  }

  // 按创建时间排序
  stats.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return stats;
}

/**
 * 获取 Executor 状态
 */
function getExecutorStatus() {
  const executor = runningProcesses.get('executor');
  if (!executor) {
    return { running: false };
  }

  return {
    running: true,
    pid: executor.child.pid,
    uptime: Math.floor((Date.now() - executor.startTime) / 1000),
    recentLogs: executor.output.slice(-20)  // 最近 20 条日志
  };
}

/**
 * 停止 Executor
 */
function stopExecutor() {
  const executor = runningProcesses.get('executor');
  if (executor) {
    executor.child.kill('SIGTERM');
    runningProcesses.delete('executor');
    return { success: true, message: 'Executor 已停止' };
  }
  return { success: false, message: 'Executor 未运行' };
}

/**
 * 启动静态文件服务
 */
function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API 路由
  try {
    // POST /api/supervisor/start
    if (req.method === 'POST' && pathname === '/api/supervisor/start') {
      console.log('[API] 启动 Supervisor...');
      const result = await startSupervisor();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // POST /api/executor/start
    if (req.method === 'POST' && pathname === '/api/executor/start') {
      const pollInterval = parseInt(url.searchParams.get('pollInterval')) || 5000;
      console.log(`[API] 启动 Executor (轮询间隔：${pollInterval}ms)...`);
      const result = await startExecutor(pollInterval);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // POST /api/executor/stop
    if (req.method === 'POST' && pathname === '/api/executor/stop') {
      console.log('[API] 停止 Executor...');
      const result = stopExecutor();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // GET /api/tasks/status
    if (req.method === 'GET' && pathname === '/api/tasks/status') {
      const stats = getTaskStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }

    // GET /api/executor/status
    if (req.method === 'GET' && pathname === '/api/executor/status') {
      const status = getExecutorStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      return;
    }

    // 静态文件服务
    if (pathname === '/' || pathname === '/index.html') {
      serveStaticFile(res, path.join(__dirname, 'index.html'), 'text/html');
      return;
    }

    if (pathname.endsWith('.js')) {
      serveStaticFile(res, path.join(__dirname, pathname), 'application/javascript');
      return;
    }

    if (pathname.endsWith('.css')) {
      serveStaticFile(res, path.join(__dirname, pathname), 'text/css');
      return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');

  } catch (error) {
    console.error('[API Error]', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log('       🚀 Web 服务器已启动');
  console.log('═══════════════════════════════════════════');
  console.log(`📍 本地访问：http://localhost:${PORT}`);
  console.log('📍 按 Ctrl+C 停止服务');
  console.log('═══════════════════════════════════════════\n');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');

  // 停止所有运行中的进程
  for (const [name, proc] of runningProcesses.entries()) {
    const child = proc.child || proc;
    console.log(`   停止 ${name} (PID: ${child.pid})...`);
    child.kill('SIGTERM');
  }

  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});
