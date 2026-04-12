const BrowserManager = require('./src/browser');
const InquiryScraper = require('./src/inquiry-scraper');
const { loadConfig, delay, getEnv } = require('./src/config');

const ALIBABA_MESSAGE_URL = getEnv(
  'ALIBABA_MESSAGE_URL',
  'https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all'
);

class AlibabaInquiryBot {
  constructor() {
    this.config = loadConfig();
    this.browser = null;
    this.scraper = null;
  }

  async start() {
    console.log('🚀 阿里巴巴询盘自动化工具启动中...\n');

    // 启动浏览器
    this.browser = new BrowserManager();
    const page = await this.browser.launch();
    this.scraper = new InquiryScraper(page, this.config);

    // 导航到询盘页面
    console.log('📍 正在打开阿里巴巴询盘页面...');
    await this.browser.navigateTo(ALIBABA_MESSAGE_URL);

    // 等待页面加载
    await delay(3000, 5000);

    // 检查是否在登录页
    const isLoginPage = page.url().includes('login');
    if (isLoginPage) {
      console.log('📍 检测到登录页，正在自动登录...\n');

      // 尝试自动点击登录按钮
      try {
        // 等待登录按钮出现
        await page.waitForSelector('.sif_form-submit', { timeout: 10000 });

        // 检查是否有验证码
        const hasCaptcha = await page.evaluate(() => {
          return document.querySelector('#nc_1_n1z') !== null ||
                 document.querySelector('.captcha') !== null ||
                 document.querySelector('[class*="captcha"]') !== null ||
                 document.querySelector('[class*="nc_"]') !== null;
        });

        if (hasCaptcha) {
          console.log('⚠️  检测到验证码，需要手动完成验证...\n');
          console.log('👉 请在浏览器中手动完成验证码验证，然后点击登录按钮\n');
          // 等待用户完成验证
          await delay(2000, 3000);
        } else {
          console.log('✓ 正在点击登录按钮...\n');
          await page.click('.sif_form-submit');
        }

        // 等待登录完成并跳转
        console.log('⏳ 等待登录完成...\n');
        try {
          await page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' });
          console.log('✓ 页面已跳转');
        } catch (e) {
          console.log('等待跳转超时，检查是否已登录');
        }

        await delay(2000, 3000);
      } catch (error) {
        console.log('⚠️  自动登录失败:', error.message);
        console.log('👉 请在浏览器中手动登录\n');
      }

      // 检查是否登录成功
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        console.log('\n⚠️  仍未跳转到询盘页面，请手动登录...\n');

        // 等待用户手动登录（最长等待 5 分钟）
        console.log('⏳ 等待登录完成...（最多 5 分钟）\n');

        let loggedIn = false;
        const maxWaitTime = 5 * 60 * 1000;
        const checkInterval = 2000;
        const startTime = Date.now();

        while (!loggedIn && (Date.now() - startTime < maxWaitTime)) {
          await delay(checkInterval, checkInterval);

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
          return;
        }
      } else {
        console.log('✓ 登录成功\n');
      }

      // 保存登录后的 Cookie
      await this.browser.saveState();
      console.log('✓ Cookie 已保存，下次将自动登录\n');
    } else {
      console.log('✓ 已登录状态\n');
      // 保存当前 Cookie
      await this.browser.saveState();
    }

    console.log('✅ 工具已就绪，开始处理询盘...\n');

    // 等待页面稳定
    await delay(2000, 3000);

    // 切换到详情页标签页（如果有已打开的详情页）
    await this.switchToDetailTab();

    // 如果还在列表页，自动点击第一个询盘
    if (this.isListPage()) {
      console.log('📍 当前在列表页，正在点击第一个询盘...\n');

      // 记录点击前的标签页数量和 URL，用于检测行为
      const initialPageCount = this.browser.context.pages().length;
      const initialUrl = this.scraper.page.url();

      const clicked = await this.scraper.clickFirstInquiry();
      if (clicked) {
        const finalPageCount = this.browser.context.pages().length;
        const finalUrl = this.scraper.page.url();

        console.log('✓ 已点击第一个询盘');
        console.log(`   标签页数量：${initialPageCount} → ${finalPageCount}`);
        console.log(`   URL 变化：${initialUrl.substring(0, 70)}... → ${finalUrl.substring(0, 70)}...`);

        // 判断行为类型
        if (finalPageCount > initialPageCount) {
          console.log('   行为：打开新标签页');
        } else if (finalUrl !== initialUrl) {
          console.log('   行为：当前标签页内跳转');
        } else {
          console.log('   行为：SPA 内部更新（URL 和标签页都未变）');
        }
        console.log();

        // 如果有新标签页打开，切换过去
        if (finalPageCount > initialPageCount) {
          await this.switchToDetailTab();
        }

        await delay(3000, 5000);
      }
    } else {
      console.log('📍 当前已在详情页，跳过点击步骤\n');
    }

    // 开始处理询盘
    await this.processCurrentDetailPage();
  }

  /**
   * 判断当前是否在列表页
   */
  isListPage() {
    const url = this.scraper.page.url();
    return url.includes('#feedback/all') || url.includes('default.htm');
  }

  /**
   * 切换到详情页标签页
   * @param {number} initialPageCount - 点击前的标签页数量，用于找到新打开的标签页
   */
  async switchToDetailTab(initialPageCount = 0) {
    const pages = this.browser.context.pages();
    console.log(`📍 当前标签页数量：${pages.length}`);

    // 找到所有详情页标签页
    const detailPages = pages.filter(p => {
      const url = p.url();
      return url.includes('maDetail.htm') && !url.includes('#feedback/all');
    });

    if (detailPages.length > 0) {
      // 如果有新标签页打开，选择最后一个（最新打开的）
      // 否则选择第一个详情页
      const targetIndex = (initialPageCount > 0 && detailPages.length > 1)
        ? detailPages.length - 1
        : 0;
      const targetPage = detailPages[targetIndex];
      const currentUrl = targetPage.url();

      console.log(`✓ 切换到详情页标签页（共 ${detailPages.length} 个详情页标签页）`);
      console.log(`   详情页 URL: ${currentUrl}`);

      this.scraper.page = targetPage;
      this.browser.page = targetPage;
      return true;
    }

    console.log('⚠️  未找到详情页标签页');
    return false;
  }

  /**
   * 处理当前详情页
   */
  async processCurrentDetailPage() {
    const currentUrl = this.scraper.page.url();
    console.log('📍 当前页面:', currentUrl);
    console.log();

    // 获取聊天记录
    console.log('📝 正在读取聊天记录...');
    const chatHistory = await this.scraper.getChatHistory();

    if (chatHistory.length === 0) {
      console.log('⚠️  未找到聊天记录');
      return;
    }

    console.log(`✓ 找到 ${chatHistory.length} 条聊天记录\n`);

    // 打印聊天记录摘要
    chatHistory.forEach((msg, i) => {
      const sender = msg.sender === 'buyer' ? '客户' : '我方';
      const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
      console.log(`   [${i + 1}] ${sender}: ${preview}...`);
    });
    console.log();

    // 生成回复（固定文本）
    console.log('✍️  准备回复内容...');
    const reply = `您好，感谢您的询盘！

我们已收到您的消息，会尽快给您回复。

祝好，
[您的名字]`;

    console.log('\n📝 回复内容:\n');
    console.log('─'.repeat(50));
    console.log(reply);
    console.log('─'.repeat(50));
    console.log();

    // 填充回复到输入框
    console.log('✍️  正在填充回复到输入框...');
    const success = await this.scraper.fillReply(reply);

    if (success) {
      console.log('\n✅ 回复已填充到输入框\n');
      console.log('👉 请检查回复内容，确认无误后手动点击发送');
      console.log('\n✅ 任务完成\n');
    } else {
      console.log('⚠️  填充失败，请手动复制上方回复内容');
      console.log('\n✅ 任务完成\n');
    }

    // 任务完成，退出
    process.exit(0);
  }

  async stop() {
    console.log('\n🛑 正在关闭工具...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 运行机器人
const bot = new AlibabaInquiryBot();

bot.start().catch(async error => {
  console.error('❌ 发生错误:', error.message);
  console.error(error.stack);
  await bot.stop();
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  await bot.stop();
  console.log('👋 工具已退出');
  process.exit(0);
});
