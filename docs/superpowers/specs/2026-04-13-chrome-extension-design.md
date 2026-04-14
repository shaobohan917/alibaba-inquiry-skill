# 阿里巴巴询盘助手 Chrome 扩展设计文档

**创建日期**: 2026-04-13  
**状态**: 已批准  
**版本**: 1.0.0

---

## 一、项目概述

将现有的阿里巴巴询盘自动化工具从 Playwright/CDP 架构转换为 Chrome 浏览器扩展（Manifest V3），实现更轻量的部署和更自然的用户体验。

### 核心目标
- 用户安装即用，零配置
- 在阿里巴巴询盘列表页点击插件图标开始处理
- 自动完成：点击询盘 → 读取聊天记录 → AI 生成回复 → 填充回复

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Popup     │  │   Options   │  │   Content   │     │
│  │  popup.html │  │ options.html│  │ content.js  │     │
│  │  popup.js   │  │ options.js  │  │ (注入页面)  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │   Service Worker      │                  │
│              │   background/service.js                  │
│              │   - 流程控制          │                  │
│              │   - AI API 调用        │                  │
│              │   - 消息路由          │                  │
│              └───────────┬───────────┘                  │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │   chrome.storage      │                  │
│              │   - API Key (内置)    │                  │
│              │   - 用户配置          │                  │
│              │   - 历史记录          │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| Service Worker | `background/service.js` | 流程控制、AI API 调用、消息路由、Cookie 管理 |
| Content Script | `content/content.js` | DOM 操作、聊天记录提取、回复填充 |
| Popup | `popup/popup.html + js` | 用户界面、状态显示、触发处理 |
| Options | `options/options.html + js` | 高级配置（可选，允许用户覆盖 API Key） |

---

## 三、用户流程

### 3.1 核心流程

```
用户打开询盘列表页
       ↓
点击插件图标 → Popup 弹出
       ↓
显示"开始处理询盘"按钮
       ↓
用户点击按钮
       ↓
┌──────────────────────────────────────┐
│  Service Worker 控制流程：           │
│  1. 发送消息给 Content Script        │
│  2. 点击第一个询盘                   │
│  3. 等待详情页加载 (tabs.onUpdated)  │
│  4. 读取聊天记录                     │
│  5. 调用 AI 生成回复                   │
│  6. 填充回复到输入框                 │
│  7. 通知 Popup 完成                   │
└──────────────────────────────────────┘
       ↓
提示用户检查并手动发送
```

### 3.2 页面检测逻辑

```javascript
// content.js 注入时检测页面类型
const pageType = detectPageType(); // 'list' | 'detail' | 'unknown'

// 通过 message 告知 Popup
chrome.runtime.sendMessage({
  type: 'PAGE_DETECTED',
  pageType
});
```

### 3.3 详情页加载检测

```javascript
// Service Worker 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url.includes('maDetail.htm')) {
    // 详情页已加载，继续处理
    handleDetailPageLoaded(tab);
  }
});
```

---

## 四、功能范围

### 4.1 P0 功能（第一版必做）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 内置 API Key | 代码中内置通义千问 API Key，用户零配置 | P0 |
| 页面类型检测 | 自动识别询盘列表页/详情页 | P0 |
| 点击第一个询盘 | 在列表页自动点击第一个询盘 | P0 |
| 读取聊天记录 | 提取买家/卖家的对话历史 | P0 |
| AI 生成回复 | 调用通义千问 API 生成专业回复 | P0 |
| 填充回复 | 将 AI 回复填充到输入框（TinyMCE） | P0 |
| 完成通知 | Popup 显示处理完成状态 | P0 |

### 4.2 P1 功能（后续迭代）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 新询盘通知 | chrome.notifications 推送 | P1 |
| 询盘历史记录 | 存储处理历史到 chrome.storage | P1 |
| 多模型切换 | 支持 OpenAI/DeepSeek 等 | P1 |
| 话术模板配置 | 允许用户自定义话术 | P1 |

---

## 五、技术规格

### 5.1 Manifest V3 配置

```json
{
  "name": "阿里巴巴询盘助手",
  "version": "1.0.0",
  "manifest_version": 3,
  "description": "阿里巴巴国际站询盘自动回复工具 - 自动登录、AI 生成专业回复",
  
  "permissions": [
    "tabs",
    "activeTab",
    "scripting",
    "storage",
    "cookies",
    "notifications"
  ],
  
  "host_permissions": [
    "*://message.alibaba.com/*"
  ],
  
  "background": {
    "service_worker": "background/service.js"
  },
  
  "content_scripts": [
    {
      "matches": ["*://message.alibaba.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "阿里巴巴询盘助手",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  
  "options_page": "options/options.html"
}
```

### 5.2 消息通信协议

**Popup → Service Worker:**
```javascript
{ type: 'START_PROCESS' }           // 开始处理询盘
{ type: 'GET_STATUS' }              // 获取当前状态
```

**Content Script → Service Worker:**
```javascript
{ type: 'PAGE_DETECTED', pageType } // 页面类型检测完成
{ type: 'CHAT_HISTORY', history }   // 聊天记录提取完成
{ type: 'REPLY_FILLED' }            // 回复填充完成
```

**Service Worker → Popup:**
```javascript
{ type: 'STATUS_UPDATE', status }   // 状态更新
{ type: 'PROCESS_COMPLETE' }        // 处理完成
{ type: 'ERROR', message }          // 发生错误
```

### 5.3 API 配置（内置）

```javascript
// config.js
export const LLM_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'sk-xxx', // 内置 API Key
  model: 'qwen-plus'
};
```

### 5.4 DOM 选择器映射

```javascript
// 阿里巴巴国际站 DOM 选择器
const SELECTORS = {
  // 列表页
  inquiryList: '.ui2-list-body, .inquiry-list',
  inquiryItem: '.ui2-list-body .inquiry-item',
  
  // 聊天页
  chatMessage: '.buyer-chat-msg, .chat-message',
  buyerMessage: '.buyer-chat-msg, .buyer',
  inputBox: '.mock-reply',
  editorId: 'normal-im-send'  // TinyMCE editor ID
};
```

---

## 六、错误处理

### 6.1 异常场景

| 场景 | 处理方式 |
|------|---------|
| 非询盘页面 | Popup 显示"请在询盘页面使用此插件" |
| 未登录 | 提示"请先登录阿里巴巴账号" |
| 聊天记录为空 | 生成默认欢迎回复 |
| AI API 调用失败 | 降级到本地话术模板 |
| DOM 元素未找到 | 重试 3 次后提示用户手动操作 |

### 6.2 重试机制

```javascript
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(delay * (i + 1));
    }
  }
}
```

---

## 七、UI 设计

### 7.1 Popup 界面

```
┌─────────────────────────────────┐
│  📬 阿里巴巴询盘助手            │
├─────────────────────────────────┤
│                                 │
│  📍 当前页面：询盘列表          │
│                                 │
│  ┌─────────────────────────┐   │
│  │   开始处理询盘          │   │
│  └─────────────────────────┘   │
│                                 │
│  ─────────────────────────────  │
│  状态：就绪                     │
│                                 │
│  ⚙️ 设置                        │
└─────────────────────────────────┘

处理中状态:
┌─────────────────────────────────┐
│  📬 阿里巴巴询盘助手            │
├─────────────────────────────────┤
│                                 │
│  ⏳ 正在处理询盘...             │
│                                 │
│  ✓ 已点击询盘                   │
│  ✓ 已读取聊天记录 (5 条)         │
│  ⏳ 正在生成回复...             │
│                                 │
│  [取消]                         │
└─────────────────────────────────┘
```

### 7.2 图标设计

- 尺寸：16x16, 48x48, 128x128
- 风格：简洁商务风
- 主色调：阿里巴巴橙色 (#FF6600)

---

## 八、测试计划

### 8.1 功能测试

- [ ] Popup 正常弹出
- [ ] 页面类型检测准确
- [ ] 点击询盘功能正常
- [ ] 聊天记录提取完整
- [ ] AI 回复生成成功
- [ ] 回复填充到输入框
- [ ] 完成状态显示

### 8.2 边界测试

- [ ] 非询盘页面处理
- [ ] 未登录状态处理
- [ ] 网络异常处理
- [ ] DOM 变化兼容

---

## 九、发布计划

### 版本规划

| 版本 | 功能 | 时间 |
|------|------|------|
| v1.0.0 | P0 核心功能 | 第一周 |
| v1.1.0 | 新询盘通知、历史记录 | 第二周 |
| v1.2.0 | 多模型支持 | 第三周 |

### 发布渠道

- Chrome Web Store（需要审核）
- 开发者模式安装（开发测试用）

---

## 十、附录

### 10.1 项目文件结构

```
alibaba-inquiry-extension/
├── manifest.json
├── background/
│   └── service.js
├── content/
│   └── content.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   └── options.js
├── lib/
│   └── ai-replier.js
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### 10.2 参考资源

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Service Worker 最佳实践](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [消息传递](https://developer.chrome.com/docs/extensions/mv3/messaging/)

---

**文档结束**
