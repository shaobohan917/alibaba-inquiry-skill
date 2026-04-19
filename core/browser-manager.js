const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const CookieStore = require('./cookie-store');

/**
 * 浏览器管理器
 * 支持 CDP 模式连接、多 Tab 管理、Cookie 自动加载
 */
class BrowserManager {
  constructor(options = {}) {
    // 支持按角色使用不同的用户数据目录
    const role = options.role || 'default';
    this.options = {
      cdpPort: options.cdpPort || 9222,
      // 不同角色使用不同的浏览器用户数据目录，实现账号隔离
      userDir: options.userDir || path.join(__dirname, '..', '.chrome-user-data', role),
      autoStart: options.autoStart !== false,
      ...options
    };

    this.browser = null;
    this.context = null;
    this.page = null;
    this.cookieStore = new CookieStore();
    this.tabs = new Map(); // 多 Tab 管理
  }

  /**
   * 检查 Chrome 是否已在 CDP 模式运行
   * @returns {boolean}
   */
  isChromeRunning() {
    try {
      execSync(`curl -s http://localhost:${this.options.cdpPort}/json/version`, { stdio: 'ignore' });
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
        '--remote-debugging-port=' + this.options.cdpPort,
        '--user-data-dir=' + this.options.userDir,
        '--no-first-run',
        '--no-default-app-check',
        'about:blank'
      ];

      const chromeProcess = spawn(chromeApp, args, {
        detached: true,
        stdio: 'ignore'
      });

      chromeProcess.unref();

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

  /**
   * 启动/连接浏览器
   * @param {string} role - 角色名（用于加载对应 Cookie）
   * @param {string} account - 账号标识
   */
  async launch(role = 'default', account = 'default') {
    // 检查 Chrome 是否运行
    if (!this.isChromeRunning() && this.options.autoStart) {
      await this.launchChrome();
    }

    // 通过 CDP 连接到 Chrome
    console.log(`🔍 连接到 CDP 模式的 Chrome (端口 ${this.options.cdpPort})...`);

    this.browser = await chromium.connectOverCDP(`http://localhost:${this.options.cdpPort}`);

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

    // 加载保存的 Cookie（如果存在）
    const cookies = this.cookieStore.load(role, account);
    if (cookies && cookies.length > 0) {
      console.log(`📍 加载 ${cookies.length} 个 Cookie...`);
      await this.context.addCookies(cookies);
      console.log('✓ Cookie 已加载，应已自动登录');
    }

    // 记录当前 Tab
    this.tabs.set('main', this.page);

    console.log('✓ 已连接到 Chrome 窗口');
    return this.page;
  }

  /**
   * 创建新 Tab
   * @param {string} name - Tab 名称
   * @returns {Promise<Page>}
   */
  async newTab(name = 'unnamed') {
    if (!this.context) {
      throw new Error('Browser not launched yet');
    }

    const page = await this.context.newPage();
    this.tabs.set(name, page);
    console.log(`✓ 新标签页已创建 [${name}]`);
    return page;
  }

  /**
   * 切换到指定 Tab
   * @param {string} name - Tab 名称
   * @returns {Page|null}
   */
  switchTab(name) {
    const page = this.tabs.get(name);
    if (page) {
      this.page = page;
      console.log(`✓ 已切换到标签页 [${name}]`);
      return page;
    }
    console.warn(`⚠️  标签页不存在 [${name}]`);
    return null;
  }

  /**
   * 关闭指定 Tab
   * @param {string} name - Tab 名称
   */
  async closeTab(name) {
    const page = this.tabs.get(name);
    if (page) {
      await page.close();
      this.tabs.delete(name);
      console.log(`✓ 标签页已关闭 [${name}]`);
    }
  }

  /**
   * 获取所有 Tab 信息
   * @returns {Array}
   */
  listTabs() {
    const result = [];
    for (const [name, page] of this.tabs.entries()) {
      result.push({
        name,
        url: page.url(),
        isActive: page === this.page
      });
    }
    return result;
  }

  /**
   * 保存 Cookie
   * @param {string} role - 角色名
   * @param {string} account - 账号标识
   */
  async saveCookies(role, account = 'default') {
    if (!this.context) return;

    const cookies = await this.context.cookies();
    await this.cookieStore.save(role, cookies, account);
  }

  /**
   * 导航到指定 URL
   * @param {string} url
   * @param {Object} options
   */
  async navigateTo(url, options = {}) {
    const waitUntil = options.waitUntil || 'domcontentloaded';
    const timeout = options.timeout || 30000;

    await this.page.goto(url, { waitUntil, timeout });
    await this.page.waitForTimeout(2000); // 等待页面稳定
  }

  /**
   * 关闭浏览器
   */
  async close() {
    // 保存所有 Tab 的 Cookie（按角色存储）
    if (this.context && this.options.role) {
      await this.saveCookies(this.options.role, 'default');
    }

    if (this.browser) {
      await this.browser.close();
      console.log('✓ 浏览器已关闭');
    }
  }
}

// 需要引入 path 模块
const path = require('path');
const fs = require('fs');

module.exports = BrowserManager;
