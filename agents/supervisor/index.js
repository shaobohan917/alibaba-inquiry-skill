const TaskQueue = require('../../core/task-queue');
const Dashboard = require('./dashboard');
const BrowserManager = require('../../core/browser-manager');

/**
 * 总监管 Agent
 * 负责任务分发、进度追踪、数据汇总
 */
class SupervisorAgent {
  constructor() {
    this.taskQueue = new TaskQueue();
    this.dashboard = new Dashboard();
    this.browser = null;
  }

  /**
   * 启动总监管
   */
  async start() {
    console.log('🚀 总监管 Agent 启动中...\n');

    // 显示数据看板
    this.dashboard.printDashboard();

    // 分发今日任务
    await this.dispatchDailyTasks();

    // 追踪任务进度
    await this.trackTaskProgress();

    console.log('\n✅ 总监管 Agent 任务分发完成\n');
  }

  /**
   * 分发今日任务
   */
  async dispatchDailyTasks() {
    console.log('📋 正在分发今日任务...\n');

    const tasks = [];

    // 1. 运营任务 - 数据分析
    tasks.push(this.taskQueue.create({
      type: 'operation/analyze',
      role: 'operation',
      priority: 'high',
      payload: {
        action: 'daily_analysis',
        metrics: ['exposure', 'clicks', 'cpc', 'ctr', 'inquiryRate']
      }
    }));

    // 2. 业务员任务 - 询盘回复
    tasks.push(this.taskQueue.create({
      type: 'sales/inquiry',
      role: 'sales',
      priority: 'high',
      payload: {
        action: 'handle_incoming_inquiries',
        maxCount: 5
      }
    }));

    // 3. 业务员任务 - 客户跟进
    const followUpCustomers = this.dashboard.store.getFollowUpCustomers(3);
    if (followUpCustomers.length > 0) {
      tasks.push(this.taskQueue.create({
        type: 'sales/followup',
        role: 'sales',
        priority: 'normal',
        payload: {
          action: 'followup_customers',
          customerCount: followUpCustomers.length
        }
      }));
    }

    // 4. 美工任务 - 主图优化
    tasks.push(this.taskQueue.create({
      type: 'design/image',
      role: 'design',
      priority: 'normal',
      payload: {
        action: 'optimize_main_images',
        count: 5
      }
    }));

    // 5. 采购任务 - 新品筛选
    tasks.push(this.taskQueue.create({
      type: 'procurement/new',
      role: 'procurement',
      priority: 'low',
      payload: {
        action: 'screen_new_products',
        platform: '1688'
      }
    }));

    console.log(`✓ 已创建 ${tasks.length} 个任务\n`);

    // 打印任务列表
    this.printTaskList();
  }

  /**
   * 追踪任务进度
   */
  async trackTaskProgress() {
    console.log('📊 任务进度追踪:\n');

    const stats = this.taskQueue.stats();

    console.log(`   总任务数：    ${stats.total}`);
    console.log(`   待处理：      ${stats.byStatus.pending || 0}`);
    console.log(`   进行中：      ${stats.byStatus.running || 0}`);
    console.log(`   已完成：      ${stats.byStatus.completed || 0}`);
    console.log(`   失败：        ${stats.byStatus.failed || 0}`);

    console.log();
  }

  /**
   * 打印任务列表
   */
  printTaskList() {
    const tasks = this.taskQueue.list();

    if (tasks.length === 0) {
      console.log('   暂无任务\n');
      return;
    }

    console.log('📋 任务列表:\n');

    for (const task of tasks) {
      const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'normal' ? '🟡' : '🟢';
      const statusIcon = task.status === 'completed' ? '✅' : task.status === 'running' ? '🔄' : '⏳';

      console.log(`   ${statusIcon} ${priorityIcon} [${task.id.substring(0, 15)}...] ${task.type}`);
      console.log(`      角色：${task.role} | 优先级：${task.priority} | 进度：${task.progress}%`);

      if (task.statusMessage) {
        console.log(`      状态：${task.statusMessage}`);
      }

      console.log();
    }
  }

  /**
   * 获取任务进度
   * @param {string} taskId
   */
  getTaskProgress(taskId) {
    const task = this.taskQueue.get(taskId);

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      statusMessage: task.statusMessage,
      createdAt: task.createdAt,
      completedAt: task.completedAt
    };
  }

  /**
   * 生成日报
   */
  generateDailyReport() {
    const report = this.dashboard.generateDailyReport();

    console.log('\n═══════════════════════════════════════════');
    console.log('              每日运营报告');
    console.log('═══════════════════════════════════════════\n');
    console.log(`日期：${report.date}\n`);

    console.log('📊 核心指标:');
    for (const [key, metric] of Object.entries(report.metrics)) {
      console.log(`   ${metric.label}: ${metric.value}${metric.unit}`);
    }

    console.log('\n📋 工作总结:');
    console.log(`   新增客户：${report.summary.newCustomers} 个`);
    console.log(`   已回复询盘：${report.summary.repliedInquiries} 个`);
    console.log(`   预算使用：${report.summary.budgetUsed} 元`);

    if (report.alerts.length > 0) {
      console.log('\n⚠️  异常预警:');
      for (const alert of report.alerts) {
        console.log(`   - ${alert.metric}: ${alert.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════════\n');

    return report;
  }

  /**
   * 停止总监管
   */
  async stop() {
    console.log('\n🛑 正在关闭总监管 Agent...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI 入口
async function main() {
  const agent = new SupervisorAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'worker':
        // Worker 模式：进程常驻，等待任务输入
        console.log('🔧 主管 Agent Worker 模式启动...');
        console.log('📋 工作模式：进程常驻，每个任务独立浏览器窗口');
        console.log('⏳ 等待任务输入...\n');

        // 保持进程运行，监听退出信号
        process.on('SIGTERM', async () => {
          console.log('\n🛑 收到退出信号，正在关闭...');
          await agent.stop();
          process.exit(0);
        });

        // 监听标准输入以保持事件循环活跃
        process.stdin.on('data', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log(`📋 收到消息：${JSON.stringify(message)}`);
          } catch (e) {
            console.log(`收到输入：${data.toString()}`);
          }
        });

        // 保持进程运行
        await new Promise(() => {});
        break;

      case 'dashboard':
        agent.dashboard.printDashboard();
        break;

      case 'report':
        agent.generateDailyReport();
        break;

      case 'tasks':
        agent.printTaskList();
        break;

      default:
        console.log('用法：node agents/supervisor/index.js [start|dashboard|report|tasks]');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    await agent.stop();
    process.exit(1);
  }
}

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = SupervisorAgent;
