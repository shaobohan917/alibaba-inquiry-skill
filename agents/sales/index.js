const BrowserManager = require('../../core/browser-manager');
const InquiryHandler = require('./inquiry-handler');
const CustomerCRM = require('./customer-crm');
const TaskQueue = require('../../core/task-queue');
const { loadConfig, getEnv } = require('../../src/config');

const ALIBABA_MESSAGE_URL = getEnv(
  'ALIBABA_MESSAGE_URL',
  'https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all'
);
const SALES_CDP_PORT = parseInt(getEnv('SALES_CDP_PORT', '9222'), 10);

/**
 * 业务员 Agent
 * 整合询盘处理、客户 CRM、自动跟单功能
 */
class SalesAgent {
  constructor(options = {}) {
    this.config = loadConfig();
    this.browser = null;
    this.inquiryHandler = null;
    this.crm = new CustomerCRM();
    this.taskQueue = new TaskQueue(); // 任务队列
    this.options = options;
  }

  /**
   * 启动 Agent
   */
  async start() {
    console.log('🚀 业务员 Agent 启动中...\n');

    // 启动浏览器，使用 sales 独立的浏览器配置和 CDP 端口
    this.browser = new BrowserManager({ role: 'sales', cdpPort: SALES_CDP_PORT });
    const page = await this.browser.launch('sales', 'default');

    // 创建询盘处理器
    this.inquiryHandler = new InquiryHandler(this.browser, this.config);

    // 导航到询盘页面
    console.log('📍 正在打开阿里巴巴询盘页面...');
    await this.browser.navigateTo(ALIBABA_MESSAGE_URL);

    // 等待页面加载
    await this.delay(3000, 5000);

    // 检查是否登录
    const isLoginPage = page.url().includes('login');
    if (isLoginPage) {
      console.log('📍 检测到登录页，需要手动登录...\n');
      await this.waitForLogin(page);
    }

    // 保存登录状态
    await this.browser.saveCookies('sales', 'default');

    console.log('\n✅ 业务员 Agent 已就绪\n');

    // 开始处理询盘
    await this.handleIncomingInquiries();
  }

  /**
   * 等待登录完成
   * @param {Page} page
   */
  async waitForLogin(page) {
    console.log('⏳ 等待登录完成...（最多 5 分钟）\n');

    let loggedIn = false;
    const maxWaitTime = 5 * 60 * 1000;
    const checkInterval = 2000;
    const startTime = Date.now();

    while (!loggedIn && (Date.now() - startTime < maxWaitTime)) {
      await this.delay(checkInterval, checkInterval);

      const url = page.url();
      if (!url.includes('login') && url.includes('message')) {
        loggedIn = true;
        console.log('✓ 检测到登录成功\n');
        break;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed % 10000 < checkInterval) {
        console.log(`⏳ 已等待 ${Math.floor(elapsed / 1000)} 秒...`);
      }
    }

    if (!loggedIn) {
      console.log('⚠️  登录超时，请重启工具后手动登录');
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * 处理新进询盘
   */
  async handleIncomingInquiries() {
    // 检查是否有未读询盘
    const hasUnread = await this.checkUnreadInquiries();

    if (hasUnread) {
      console.log('📬 检测到未读询盘，开始处理...\n');

      // 处理询盘（默认最多 5 个）
      const results = await this.inquiryHandler.processInquiryList(5);

      // 统计结果
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ 本次处理完成：成功 ${successCount}/${results.length} 个询盘\n`);
    } else {
      console.log('✅ 没有未读询盘\n');
    }

    // 任务完成，退出
    console.log('👋 任务完成，退出 Agent');
    await this.stop();
    process.exit(0);
  }

  /**
   * 检查是否有未读询盘
   * @returns {Promise<boolean>}
   */
  async checkUnreadInquiries() {
    try {
      const hasUnread = await this.browser.page.evaluate(() => {
        const unreadSelectors = [
          '.unread',
          '.inquiry-recent',
          '[class*="unread"]',
          '.ui2-list-body .unread',
          '.inquiry-list .unread'
        ];

        for (const selector of unreadSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return true;
          }
        }

        return false;
      });

      return hasUnread;
    } catch (error) {
      console.error('检查未读询盘失败:', error.message);
      return false;
    }
  }

  /**
   * 获取需要跟进的客户列表
   */
  async showFollowUpCustomers() {
    console.log('\n📋 需要跟进的客户:\n');

    const customers = this.crm.getFollowUpList(3);

    if (customers.length === 0) {
      console.log('✓ 没有需要跟进的客户\n');
      return;
    }

    for (const customer of customers) {
      const daysSinceContact = customer.lastContactAt
        ? Math.floor((Date.now() - new Date(customer.lastContactAt)) / (1000 * 60 * 60 * 24))
        : 999;

      console.log(`   - ${customer.name || customer.email} (${daysSinceContact}天未联系)`);
    }

    console.log();
  }

  /**
   * 生成复购促进话术
   * @param {string} customerId
   */
  async generateRepurchaseScript(customerId) {
    const script = this.crm.generateRepurchaseScript(customerId);

    if (script) {
      console.log('\n📝 复购促进话术:\n');
      console.log('─'.repeat(50));
      console.log(script);
      console.log('─'.repeat(50));
      console.log();
    }

    return script;
  }

  /**
   * 停止 Agent
   */
  async stop() {
    console.log('\n🛑 正在关闭业务员 Agent...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * 执行指定任务（由 TaskExecutor 调用）
   * @param {string} taskId - 任务 ID
   */
  async executeTask(taskId) {
    console.log(`📍 执行任务：${taskId}\n`);

    // 获取任务
    const task = this.taskQueue.get(taskId);
    if (!task) {
      throw new Error(`任务不存在：${taskId}`);
    }

    console.log(`📋 任务信息:`);
    console.log(`   类型：${task.type}`);
    console.log(`   角色：${task.role}`);
    console.log(`   参数：${JSON.stringify(task.payload)}\n`);

    // 启动浏览器，使用 sales 独立的浏览器配置和 CDP 端口
    this.browser = new BrowserManager({ role: 'sales', cdpPort: SALES_CDP_PORT });
    await this.browser.launch('sales', 'default');

    // 创建询盘处理器
    this.inquiryHandler = new InquiryHandler(this.browser, this.config);

    // 导航到阿里巴巴询盘页面
    console.log('📍 正在打开阿里巴巴询盘页面...');
    await this.browser.navigateTo(ALIBABA_MESSAGE_URL);

    // 等待页面加载
    await this.delay(3000, 5000);

    // 检查是否登录
    const page = this.browser.page;
    const isLoginPage = page.url().includes('login');
    if (isLoginPage) {
      console.log('📍 检测到登录页，需要手动登录...\n');
      await this.waitForLogin(page);
    }

    // 保存登录状态
    await this.browser.saveCookies('sales', 'default');

    console.log('\n✅ 业务员 Agent 已就绪\n');

    // 根据任务类型执行具体操作
    switch (task.payload.action) {
      case 'handle_incoming_inquiries':
        const maxCount = task.payload.maxCount || 5;
        console.log(`📬 开始处理询盘，最多 ${maxCount} 个...\n`);
        const results = await this.inquiryHandler.processInquiryList(maxCount);
        const successCount = results.filter(r => r.success).length;
        console.log(`\n✅ 任务完成：成功 ${successCount}/${results.length} 个询盘`);
        return { success: true, processed: results.length, successCount };

      case 'followup_customers':
        console.log('📋 开始客户跟进...\n');
        await this.showFollowUpCustomers();
        return { success: true };

      default:
        throw new Error(`未知的任务类型：${task.payload.action}`);
    }
  }

  /**
   * Worker 模式 - 常驻监听任务（简单版：进程保持运行，每个任务独立浏览器）
   */
  async startWorker() {
    console.log('🔧 业务员 Agent Worker 模式启动...');
    console.log('📋 工作模式：进程常驻，每个任务独立浏览器窗口\n');

    // 保持进程运行
    process.on('SIGTERM', async () => {
      console.log('\n🛑 收到退出信号，正在关闭...');
      if (this.browser) {
        await this.browser.close();
      }
      process.exit(0);
    });

    // 监听标准输入
    process.stdin.on('data', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'task' && message.taskId) {
          console.log(`\n═══════════════════════════════════════════`);
          console.log(`📋 收到任务：${message.taskId}`);
          console.log(`═══════════════════════════════════════════\n`);

          try {
            // 每个任务启动新浏览器，使用 sales 独立的浏览器配置
            this.browser = new BrowserManager({ role: 'sales' });
            await this.browser.launch('sales', 'default');
            this.inquiryHandler = new InquiryHandler(this.browser, this.config);

            // 导航到阿里巴巴询盘页面
            console.log('📍 正在打开阿里巴巴询盘页面...');
            await this.browser.navigateTo(ALIBABA_MESSAGE_URL);
            await this.delay(3000, 5000);

            // 检查是否登录
            const page = this.browser.page;
            const isLoginPage = page.url().includes('login');
            if (isLoginPage) {
              console.log('📍 检测到登录页，需要手动登录...\n');
              await this.waitForLogin(page);
            }
            await this.browser.saveCookies('sales', 'default');
            console.log('\n✅ 已就绪\n');

            // 获取任务并执行
            const task = this.taskQueue.get(message.taskId);
            if (!task) throw new Error(`任务不存在：${message.taskId}`);

            switch (task.payload.action) {
              case 'handle_incoming_inquiries':
                const maxCount = task.payload.maxCount || 5;
                console.log(`📬 开始处理询盘，最多 ${maxCount} 个...\n`);
                const results = await this.inquiryHandler.processInquiryList(maxCount);
                const successCount = results.filter(r => r.success).length;
                console.log(`\n✅ 成功 ${successCount}/${results.length} 个询盘`);
                break;
              case 'followup_customers':
                console.log('📋 开始客户跟进...\n');
                await this.showFollowUpCustomers();
                break;
              default:
                throw new Error(`未知的任务类型：${task.payload.action}`);
            }

            // 关闭浏览器
            if (this.browser) {
              await this.browser.close();
              this.browser = null;
            }
            console.log(`\n✅ 任务 ${message.taskId} 完成，等待下一个任务...\n`);

          } catch (error) {
            console.error(`❌ 任务失败：${error.message}\n`);
            if (this.browser) {
              await this.browser.close();
              this.browser = null;
            }
          }
        }
      } catch (error) {
        console.error('❌ 消息解析失败:', error.message);
      }
    });

    console.log('⏳ 等待任务输入...\n');
  }

  /**
   * 延迟工具
   */
  delay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI 入口
async function main() {
  const agent = new SalesAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'execute':
        const taskId = process.argv[3];
        if (taskId) {
          await agent.executeTask(taskId);
        } else {
          console.log('用法：node agents/sales/index.js execute <taskId>');
          process.exit(1);
        }
        break;

      case 'worker':
        // Worker 模式 - 常驻监听任务
        await agent.startWorker();
        break;

      case 'followup':
        await agent.showFollowUpCustomers();
        break;

      case 'repurchase':
        const customerId = process.argv[3];
        if (customerId) {
          await agent.generateRepurchaseScript(customerId);
        } else {
          console.log('用法：node agents/sales/index.js repurchase <customerId>');
        }
        break;

      default:
        console.log('用法：node agents/sales/index.js [start|execute|worker|followup|repurchase]');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    await agent.stop();
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  if (agent) {
    await agent.stop();
    console.log('👋 业务员 Agent 已退出');
  }
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = SalesAgent;
