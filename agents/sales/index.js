const BrowserManager = require('../../core/browser-manager');
const InquiryHandler = require('./inquiry-handler');
const CustomerCRM = require('./customer-crm');
const { loadConfig, getEnv } = require('../../src/config');

const ALIBABA_MESSAGE_URL = getEnv(
  'ALIBABA_MESSAGE_URL',
  'https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all'
);

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
    this.options = options;
  }

  /**
   * 启动 Agent
   */
  async start() {
    console.log('🚀 业务员 Agent 启动中...\n');

    // 启动浏览器
    this.browser = new BrowserManager();
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
        console.log('用法：node agents/sales/index.js [start|followup|repurchase]');
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
  await agent.stop();
  console.log('👋 业务员 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = SalesAgent;
