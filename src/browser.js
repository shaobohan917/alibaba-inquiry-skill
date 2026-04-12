const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const COOKIES_PATH = path.join(__dirname, '..', 'cookies', 'alibaba.json');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    // 通过 CDP 连接到 Chrome (使用固定用户数据目录)
    console.log('🔍 连接到 CDP 模式的 Chrome (端口 9222)...');

    this.browser = await chromium.connectOverCDP('http://localhost:9222');

    // 获取第一个上下文或创建新的
    this.context = this.browser.contexts()[0];
    if (!this.context) {
      this.context = await this.browser.newContext();
    }

    // 获取第一个页面或创建新的
    this.page = this.context.pages()[0];
    if (!this.page) {
      this.page = await this.context.newPage();
    }

    console.log('✓ 已连接到 Chrome 窗口');
    return this.page;
  }

  saveCookies() {
    const cookiesDir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    this.context.cookies().then(cookies => {
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('✓ Cookie 已保存到', COOKIES_PATH);
    });
  }

  loadCookies() {
    if (fs.existsSync(COOKIES_PATH)) {
      try {
        const data = fs.readFileSync(COOKIES_PATH, 'utf-8');
        const cookies = JSON.parse(data);
        if (cookies.length > 0) {
          return cookies;
        }
      } catch (error) {
        console.warn('Cookie 加载失败:', error.message);
      }
    }
    return null;
  }

  async navigateTo(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 额外等待页面稳定
    await this.page.waitForTimeout(2000);
  }

  async saveState() {
    this.saveCookies();
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = BrowserManager;
