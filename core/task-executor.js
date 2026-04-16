const { spawn } = require('child_process');
const path = require('path');
const TaskQueue = require('./task-queue');

/**
 * 任务执行器（简化版）
 * 轮询 TaskQueue，每次只执行一个任务，避免打开多个 Chrome 窗口
 */
class TaskExecutor {
  constructor(options = {}) {
    this.taskQueue = new TaskQueue();
    this.pollInterval = options.pollInterval || 5000; // 默认 5 秒轮询一次
    this.agentMap = {
      'sales': path.join(__dirname, '..', 'agents', 'sales', 'index.js'),
      'operation': path.join(__dirname, '..', 'agents', 'operation', 'index.js'),
      'design': path.join(__dirname, '..', 'agents', 'design', 'index.js'),
      'procurement': path.join(__dirname, '..', 'agents', 'procurement', 'index.js'),
      'inventory': path.join(__dirname, '..', 'agents', 'inventory', 'index.js'),
      'logistics': path.join(__dirname, '..', 'agents', 'logistics', 'index.js')
    };
    this.currentTask = null; // 当前正在执行的任务
    this.maxConcurrent = 1; // 固定为 1，避免打开多个 Chrome 窗口
  }

  /**
   * 轮询并执行任务
   */
  async pollAndExecute() {
    // 如果有任务正在执行，跳过
    if (this.currentTask) {
      return;
    }

    const pendingTasks = this.taskQueue.list({ status: 'pending' });

    if (pendingTasks.length === 0) {
      return;
    }

    console.log(`\n📋 发现 ${pendingTasks.length} 个待处理任务...`);

    // 只取第一个任务（队列顺序）
    const task = pendingTasks[0];

    // 检查该角色是否有可用的 Agent
    const agentScript = this.agentMap[task.role];
    if (!agentScript) {
      console.log(`⚠️  未找到角色 [${task.role}] 的 Agent，跳过任务 [${task.id}]`);
      // 标记为失败，避免无限循环
      this.taskQueue.update(task.id, { status: 'failed', error: '无可用 Agent' });
      return;
    }

    // 标记为运行中
    this.taskQueue.update(task.id, { status: 'running' });
    this.currentTask = task.id;

    // 启动 Agent 进程
    this.executeTask(task, agentScript);
  }

  /**
   * 执行单个任务
   */
  executeTask(task, agentScript) {
    console.log(`\n📍 执行任务 [${task.id}]: ${task.type}`);
    console.log(`   角色：${task.role} | 优先级：${task.priority}`);
    console.log(`   参数：${JSON.stringify(task.payload)}`);

    // 启动 Agent 进程，传入 taskId 参数
    const child = spawn('node', [agentScript, 'execute', task.id], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 监听标准输出
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`   [${task.role}] ${output}`);
      }
    });

    // 监听错误输出
    child.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error(`   [${task.role}] ❌ ${error}`);
      }
    });

    // 监听退出
    child.on('exit', (code) => {
      this.currentTask = null;

      if (code === 0) {
        console.log(`✅ 任务完成 [${task.id}]`);
        this.taskQueue.complete(task.id, { success: true, exitCode: code });
      } else {
        console.error(`❌ 任务失败 [${task.id}]: 退出码 ${code}`);
        this.taskQueue.fail(task.id, `Agent 退出码：${code}`);
      }
    });

    // 监听错误
    child.on('error', (error) => {
      this.currentTask = null;
      console.error(`❌ 进程启动失败 [${task.id}]: ${error.message}`);
      this.taskQueue.fail(task.id, error.message);
    });
  }

  /**
   * 启动执行器
   */
  async start() {
    console.log('═══════════════════════════════════════════');
    console.log('          🚀 任务执行器启动中...');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📍 轮询间隔：${this.pollInterval}ms`);
    console.log(`📍 最大并发：${this.maxConcurrent} (单窗口模式)\n`);

    // 开始轮询
    setInterval(() => this.pollAndExecute(), this.pollInterval);

    // 立即执行一次
    await this.pollAndExecute();
  }

  /**
   * 获取运行中的任务列表
   * @returns {Array}
   */
  getRunningTasks() {
    if (!this.currentTask) {
      return [];
    }
    return [{ taskId: this.currentTask, status: 'running' }];
  }

  /**
   * 停止执行器
   */
  async stop() {
    console.log('\n🛑 正在关闭任务执行器...');
    console.log('✅ 任务执行器已关闭\n');
    process.exit(0);
  }
}

// CLI 入口
async function main() {
  const executor = new TaskExecutor({
    pollInterval: parseInt(process.argv[3]) || 5000
  });

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await executor.start();
        // 保持进程运行
        process.on('SIGINT', async () => {
          await executor.stop();
          process.exit(0);
        });
        break;

      case 'status':
        const stats = executor.taskQueue.stats();
        console.log('\n📊 任务统计:');
        console.log(`   总任务数：${stats.total}`);
        console.log(`   待处理：${stats.byStatus.pending || 0}`);
        console.log(`   进行中：${stats.byStatus.running || 0}`);
        console.log(`   已完成：${stats.byStatus.completed || 0}`);
        console.log(`   失败：${stats.byStatus.failed || 0}`);

        const runningTasks = executor.getRunningTasks();
        if (runningTasks.length > 0) {
          console.log('\n🔄 运行中的任务:');
          for (const task of runningTasks) {
            console.log(`   - [${task.taskId}] ${task.type} (${task.elapsed})`);
          }
        }
        break;

      default:
        console.log('用法：node core/task-executor.js [start|status] [pollInterval]');
        console.log('示例：');
        console.log('  node core/task-executor.js start        # 启动执行器（默认 5 秒轮询）');
        console.log('  node core/task-executor.js start 3000   # 启动执行器（3 秒轮询）');
        console.log('  node core/task-executor.js status       # 查看任务统计');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    await executor.stop();
    process.exit(1);
  }
}

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = TaskExecutor;
