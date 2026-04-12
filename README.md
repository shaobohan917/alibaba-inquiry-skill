# 阿里巴巴国际站询盘自动化工具

自动读取阿里巴巴国际站询盘，AI 生成回复建议并填充到回复框。

## 功能特点

- ✅ 手动登录，自动保存 Cookie
- ✅ 自动读取询盘列表
- ✅ 提取聊天记录
- ✅ AI 根据聊天记录生成回复（支持多语言自动检测）
- ✅ 自动填充回复到输入框（不自动发送，需人工确认）

## 安装

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npm run install-browsers
```

## 配置

### 1. 配置大模型 API

编辑 `.env` 文件，填入你的大模型服务配置：

```bash
# 大模型 API 地址（支持 OpenAI 兼容接口）
LLM_BASE_URL=https://api.openai.com/v1

# API Key
LLM_API_KEY=sk-your-api-key

# 模型名称
LLM_MODEL=gpt-4o

# 询盘列表页 URL
ALIBABA_MESSAGE_URL=https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all
```

### 常见大模型配置示例

**OpenAI:**
```
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
```

**DeepSeek:**
```
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=deepseek-chat
```

**智谱 GLM:**
```
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_API_KEY=your_api_key
LLM_MODEL=glm-4
```

**通义千问 (阿里云):**
```
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=your_api_key
LLM_MODEL=qwen-plus
```

**本地部署 (Ollama):**
```
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:32b
```

**OneAPI / NewAPI 等中转服务:**
```
LLM_BASE_URL=http://your-domain.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=claude-sonnet-4-5-20250929
```

### 2. （可选）自定义回复风格

编辑 `config/settings.json` 修改回复语气、签名等

## 使用

```bash
npm start
```

### 使用流程

1. 运行工具后，如果检测到未登录，会打开浏览器跳转到登录页面
2. **手动登录**阿里巴巴国际站
3. 登录完成后，在终端**按回车键**继续
4. 工具会自动：
   - 保存 Cookie（下次自动登录）
   - 打开询盘列表
   - 点击第一条询盘
   - 读取聊天记录
   - 生成 AI 回复
   - 填充到回复框
5. **检查回复内容**，确认无误后**手动点击发送**
6. 发送完成后，在终端按回车键退出

## 目录结构

```
xiong/
├── main.js              # 主入口
├── src/
│   ├── browser.js       # 浏览器管理（Cookie 存取）
│   ├── config.js        # 配置加载
│   ├── ai-replier.js    # AI 回复生成
│   └── inquiry-scraper.js # 询盘数据提取
├── config/
│   └── settings.json    # 配置文件
├── cookies/
│   └── alibaba.json     # Cookie 存储（自动生成）
├── .env                 # 环境变量
└── .env.example         # 环境变量示例
```

## 注意事项

1. **首次使用需要手动登录**，之后会自动保存 Cookie
2. **回复不会自动发送**，需要人工审核后手动点击发送
3. 如果阿里巴巴页面结构更新，可能需要调整 `src/inquiry-scraper.js` 中的选择器
4. 需要配置有效的大模型 API Key

## 故障排除

### Cookie 失效
删除 `cookies/alibaba.json` 文件，重新手动登录

### 选择器失效
阿里巴巴可能更新了页面结构，需要检查并更新 `src/inquiry-scraper.js` 中的选择器

### AI 回复失败
- 检查 `.env` 文件中的 `LLM_API_KEY` 和 `LLM_BASE_URL` 是否正确配置
- 确认 API Key 有足够的余额/额度
- 检查网络连接是否正常
