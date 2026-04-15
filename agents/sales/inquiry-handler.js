const InquiryScraper = require('../../src/inquiry-scraper');
const AIReplier = require('../../src/ai-replier');
const CustomerCRM = require('./customer-crm');
const { delay } = require('../../src/config');

/**
 * 询盘处理器
 * 整合现有的询盘回复功能和客户 CRM
 */
class InquiryHandler {
  constructor(browserManager, options = {}) {
    this.browser = browserManager;
    this.page = browserManager.page;
    this.config = options;
    this.scraper = new InquiryScraper(this.page, this.config);
    this.aiReplier = new AIReplier();
    this.crm = new CustomerCRM();
  }

  /**
   * 处理当前询盘
   * @param {Object} options
   * @param {boolean} options.autoFill - 是否自动填充回复
   * @param {boolean} options.autoSend - 是否自动发送（默认 false，需要人工确认）
   * @returns {Object} 处理结果
   */
  async processInquiry(options = {}) {
    const result = {
      success: false,
      inquiry: null,
      chatHistory: [],
      reply: '',
      error: null
    };

    try {
      // 1. 获取聊天历史记录
      console.log('📝 正在读取聊天记录...');
      const chatHistory = await this.scraper.getChatHistory();

      if (chatHistory.length === 0) {
        console.log('⚠️  未找到聊天记录');
        result.error = 'No chat history found';
        return result;
      }

      console.log(`✓ 找到 ${chatHistory.length} 条聊天记录\n`);

      // 2. 打印聊天记录摘要
      chatHistory.forEach((msg, i) => {
        const sender = msg.sender === 'buyer' ? '客户' : '我方';
        const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`   [${i + 1}] ${sender}: ${preview}...`);
      });
      console.log();

      result.chatHistory = chatHistory;

      // 3. 生成回复（基于知识库话术匹配 + AI 优化）
      console.log('✍️  准备回复内容...');
      const reply = await this.aiReplier.generateReply(chatHistory);

      console.log('\n📝 回复内容:\n');
      console.log('─'.repeat(50));
      console.log(reply);
      console.log('─'.repeat(50));
      console.log();

      result.reply = reply;

      // 4. 填充回复到输入框
      if (options.autoFill !== false) {
        console.log('✍️  正在填充回复到输入框...');
        const success = await this.scraper.fillReply(reply);

        if (success) {
          console.log('\n✅ 回复已填充到输入框\n');
          result.success = true;
        } else {
          console.log('⚠️  填充失败，请手动复制上方回复内容');
          result.error = 'Failed to fill reply';
        }
      } else {
        result.success = true;
      }

      return result;
    } catch (error) {
      console.error('❌ 处理询盘失败:', error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * 从询盘详情提取客户信息
   * @returns {Object}
   */
  async extractCustomerInfo() {
    try {
      const customerInfo = await this.page.evaluate(() => {
        // 尝试从页面提取客户信息
        const selectors = {
          name: '.buyer-name, .contact-name, .member-name, [class*="buyer-name"]',
          email: '.buyer-email, .contact-email, [class*="email"]',
          country: '.buyer-country, .contact-country, [class*="country"]',
          company: '.buyer-company, .contact-company, [class*="company"]'
        };

        const info = {};

        for (const [key, selector] of Object.entries(selectors)) {
          const element = document.querySelector(selector);
          if (element) {
            info[key] = element.textContent?.trim() || '';
          }
        }

        return info;
      });

      return customerInfo;
    } catch (error) {
      console.error('提取客户信息失败:', error.message);
      return {};
    }
  }

  /**
   * 处理询盘并记录 CRM
   * @param {Object} options
   * @returns {Object}
   */
  async processAndRecordCRM(options = {}) {
    const result = await this.processInquiry(options);

    if (result.success) {
      // 提取客户信息
      const customerInfo = await this.extractCustomerInfo();

      // 记录互动
      if (customerInfo.email || customerInfo.name) {
        await this.crm.recordInteraction({
          email: customerInfo.email || '',
          name: customerInfo.name || '',
          country: customerInfo.country || '',
          type: 'inquiry',
          content: result.chatHistory.map(m => m.content).join('\n'),
          metadata: {
            inquiryUrl: this.page.url(),
            repliedAt: new Date().toISOString()
          }
        });

        console.log('✓ 客户互动已记录到 CRM');
      }
    }

    return result;
  }

  /**
   * 批量处理询盘列表
   * @param {number} maxCount - 最大处理数量
   * @returns {Array}
   */
  async processInquiryList(maxCount = 5) {
    const results = [];

    // 获取询盘列表
    console.log('📋 正在获取询盘列表...');
    const inquiryList = await this.scraper.getInquiryList();

    if (inquiryList.length === 0) {
      console.log('⚠️  未找到询盘');
      return results;
    }

    console.log(`✓ 找到 ${inquiryList.length} 个询盘\n`);

    // 处理前 maxCount 个询盘
    const count = Math.min(maxCount, inquiryList.length);

    for (let i = 0; i < count; i++) {
      console.log(`\n════════════════════════════════════════`);
      console.log(`正在处理询盘 ${i + 1}/${count}`);
      console.log(`════════════════════════════════════════\n`);

      // 点击询盘
      console.log('📍 正在打开询盘...');
      const clicked = await this.scraper.clickFirstInquiry();

      if (!clicked) {
        console.log('⚠️  打开询盘失败，跳过');
        continue;
      }

      // 处理询盘
      const result = await this.processAndRecordCRM({
        autoFill: true,
        autoSend: false
      });

      results.push({
        inquiry: inquiryList[i],
        ...result
      });

      // 等待用户确认（如果需要）
      if (i < count - 1) {
        console.log('\n⏳ 等待 5 秒后处理下一个询盘...');
        await delay(5000);
      }
    }

    return results;
  }
}

module.exports = InquiryHandler;
