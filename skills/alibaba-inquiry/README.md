# 阿里巴巴国际站询盘自动回复 Skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code Skill](https://img.shields.io/badge/Claude_Code-Skill-blue)](https://github.com/anthropics/claude-code)

> 阿里巴巴国际站询盘自动回复工具 - 自动登录、读取询盘、AI 生成专业回复

## 功能特点

- ✅ **自动登录** - Cookie 持久化，一次登录永久有效
- ✅ **自动读取询盘** - 点击第一个询盘，读取聊天记录
- ✅ **AI 话术匹配** - 基于知识库自动生成专业回复
- ✅ **多语言支持** - 自动检测客户语言（中/英/法/西等）
- ✅ **意图识别** - 价格/样品/付款/物流/定制/售后，自动匹配话术
- ✅ **手动发送** - 回复填充到输入框，人工确认后发送

## 安装

### 方式 1：克隆仓库（推荐）

```bash
git clone https://github.com/yourusername/alibaba-auto-reply-skill.git ~/.claude/skills/alibaba
```

### 方式 2：手动复制

```bash
# 下载后复制到 Skill 目录
cp -r alibaba-auto-reply-skill ~/.claude/skills/alibaba
```

### 安装依赖

```bash
cd ~/.claude/skills/alibaba
npm install
```

### 配置环境变量

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑 .env 文件，填入你的 API 配置
```

## 使用方法

在 Claude Code 中：

```bash
/alibaba 开始处理询盘
```

### 完整流程

1. **启动 Chrome**（如未运行，自动启动）
2. **自动登录**（加载 Cookie）
3. **打开询盘列表**
4. **点击第一个询盘**
5. **读取聊天记录**
6. **AI 分析意图并生成回复**
7. **填充回复到输入框**
8. **人工确认发送**

## 配置说明

### 环境变量（.env）

```bash
# 大模型 API 配置
LLM_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
LLM_API_KEY=sk-your-api-key
LLM_MODEL=qwen3.5-plus

# 询盘列表页 URL
ALIBABA_MESSAGE_URL=https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all
```

### 常见大模型配置

**阿里云通义千问**：
```
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=your-api-key
LLM_MODEL=qwen-plus
```

**OpenAI**：
```
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
```

**DeepSeek**：
```
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=deepseek-chat
```

## 知识库话术

本 Skill 内置销售话术知识库，包括：

- 客户分层运营策略
- 价格谈判话术（小单/中单/大单）
- 样品政策
- 询盘高频问答（价格/样品/付款/物流/定制/售后）
- AI Agent 人设指令（30 年外贸销售总监）

## 技术架构

```
alibaba-auto-reply-skill/
├── skills/alibaba/       # Skill 入口
│   ├── index.js          # Skill 主文件
│   └── package.json      # Skill 配置
├── src/
│   ├── browser.js        # 浏览器管理（CDP 连接、Cookie 存取）
│   ├── ai-replier.js     # AI 回复生成（意图识别、话术匹配）
│   ├── inquiry-scraper.js # 询盘数据提取
│   └── config.js         # 配置加载
├── docs/
│   └── knowledge-base.md # 销售话术知识库
├── cookies/              # Cookie 存储目录
└── run.js                # 主运行脚本
```

## 系统要求

- Node.js >= 16.0.0
- Google Chrome（CDP 模式，端口 9222）
- 阿里巴巴国际站账号

## 常见问题

### Chrome 未运行

Skill 会自动启动 Chrome（CDP 模式）。如果启动失败，请手动执行：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --no-first-run
```

### Cookie 失效

删除 Cookie 文件，重新登录：

```bash
rm cookies/alibaba.json
# 重新运行 /alibaba，手动登录后自动保存
```

### AI 回复生成失败

检查 `.env` 文件中的 API Key 是否有效，或检查网络连接。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
