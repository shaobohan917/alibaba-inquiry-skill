# 避免触发短信验证的技术方案

## 问题背景

在使用 CDP/Playwright 自动化操作阿里巴巴国际站时，频繁触发短信验证，影响自动化流程。

## 解决方案

### 方案一：Cookie 持久化（推荐）

**原理**：保存已登录状态的 Cookie，避免每次重新登录。

**实现代码**：
```javascript
const { chromium } = require('playwright');

async function saveCookies(context, filePath) {
  const cookies = await context.cookies();
  const fs = require('fs');
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
}

async function loadCookies(context, filePath) {
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    const cookies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    await context.addCookies(cookies);
  }
}

// 使用示例
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  userDataDir: '~/.chrome-cdp-profile' // 固定目录
});

// 加载已有 Cookie
await loadCookies(context, './cookies.json');

// 导航到阿里巴巴
const page = await context.newPage();
await page.goto('https://www.alibaba.com');

// 如果 Cookie 失效，需要重新登录（手动输入短信验证码）
// 登录成功后保存 Cookie
await saveCookies(context, './cookies.json');
```

**注意**：
- Cookie 有有效期，过期后需要重新登录
- 阿里巴巴的 Cookie 可能包含设备指纹信息，更换设备/目录会失效

---

### 方案二：固定浏览器指纹

**原理**：保持浏览器指纹一致，降低被识别为自动化工具的概率。

**关键配置**：
```javascript
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  locale: 'en-US',
  timezoneId: 'America/New_York',
  permissions: ['geolocation'],
  geolocation: { longitude: 120, latitude: 30 },
  httpCredentials: null,
  colorScheme: 'light',
});
```

---

### 方案三：使用官方 API（最稳定）

**阿里巴巴开放平台**：https://open.alibaba.com/

**优势**：
- 官方支持，不会触发验证
- 稳定的数据接口
- OAuth2.0 授权机制

**缺点**：
- 需要申请开发者资质
- 部分接口可能收费

---

### 方案四：人机验证处理服务

当无法避免验证码时，使用第三方打码服务：

| 服务 | 价格 | 支持类型 |
|------|------|----------|
| 2Captcha | $1-3/1000 个 | 短信/图片/滑块 |
| Anti-Captcha | $1-5/1000 个 | 全类型 |
| Capsolver | $0.5-2/1000 个 | ReCAPTCHA/hCaptcha |

**集成示例**：
```javascript
async function solveWith2Captcha(siteKey, pageUrl) {
  const response = await fetch('https://api.2captcha.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: 'YOUR_API_KEY',
      task: {
        type: 'ReCaptchaV2TaskProxyless',
        websiteURL: pageUrl,
        websiteKey: siteKey
      }
    })
  });
  const { taskId } = await response.json();
  
  // 轮询获取结果
  while (true) {
    const result = await fetch(`https://api.2captcha.com/getTaskResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: 'YOUR_API_KEY', taskId })
    });
    const { status, solution } = await result.json();
    if (status === 'ready') return solution.gRecaptchaResponse;
    await sleep(5000);
  }
}
```

---

## 最佳实践建议

### 针对阿里巴巴国际站

1. **固定用户目录**（已实施）
   - 使用 `~/.chrome-cdp-profile` 固定目录
   - 保留 Cookie 和浏览器缓存

2. **降低操作频率**
   - 单次会话操作不超过 50 次请求
   - 每次操作间隔 3-10 秒随机延迟

3. **模拟真实用户行为**
   - 随机鼠标移动轨迹
   - 随机滚动页面
   - 避免固定时间间隔

4. **分时操作**
   - 避开高峰期（工作时间）
   - 选择凌晨/深夜执行自动化任务

### 代码实现建议

```javascript
// 在 BrowserManager 中添加
async function createStealthContext(browser) {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    permissions: ['notifications'],
  });
}

// 随机延迟
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 使用示例
await page.waitForTimeout(randomDelay(3000, 10000));
```

---

## 注意事项

1. **合规性**：确保自动化操作符合阿里巴巴服务条款
2. **账号安全**：避免过于频繁的操作导致账号受限
3. **验证码准备**：重要操作时仍需准备人工处理验证码

---

## 参考资料

- [Playwright Cookie 管理](https://playwright.dev/docs/api/class-browsercontext#browser-context-cookies)
- [阿里巴巴开放平台](https://open.alibaba.com/)
- [浏览器指纹检测](https://antoinevastel.com/bot%20detection/2018/09/12/detect-chrome-headless-v2.html)
