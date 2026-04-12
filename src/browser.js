const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');

const COOKIES_PATH = path.join(__dirname, '..', 'cookies', 'alibaba.json');
const CHROME_USER_DATA = path.join(__dirname, '..', '.chrome-user-data');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * 检查 Chrome 是否已在 CDP 模式运行
   */
  isChromeRunning() {
    try {
      execSync('curl -s http://localhost:9222/json/version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 自动启动 Chrome（CDP 模式）
   */
  async launchChrome() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Chrome 未运行，正在自动启动...');

      const chromeApp = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      const args = [
        '--remote-debugging-port=9222',
        '--user-data-dir=' + CHROME_USER_DATA,
        '--no-first-run',
        '--no-default-app-check',
        'about:blank'
      ];

      // 后台启动 Chrome
      const chromeProcess = spawn(chromeApp, args, {
        detached: true,
        stdio: 'ignore'
      });

      chromeProcess.unref();

      // 等待 Chrome 启动（最多 10 秒）
      let attempts = 0;
      const maxAttempts = 20;

      const checkChrome = () => {
        if (this.isChromeRunning()) {
          console.log('✓ Chrome 已启动');
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkChrome, 500);
        } else {
          reject(new Error('Chrome 启动超时'));
        }
      };

      setTimeout(checkChrome, 1000);
    });
  }

  async launch() {
    // 检查 Chrome 是否运行
    if (!this.isChromeRunning()) {
      await this.launchChrome();
    }

    // 通过 CDP 连接到 Chrome
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
