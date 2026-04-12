# alibaba-inquiry-skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code Skill](https://img.shields.io/badge/Claude_Code-Skill-blue)](https://github.com/anthropics/claude-code)

> 阿里巴巴国际站询盘自动回复 Claude Code Skill - 自动登录、AI 生成专业回复

## 在线演示

![Demo](demo.gif)

## 快速开始

### 方式 1：使用打包后的 Skill（推荐）

```bash
# 复制 Skill 到 Claude Code 目录
cp -r build/skills/alibaba-inquiry ~/.claude/skills/

# 安装依赖
cd ~/.claude/skills/alibaba-inquiry
npm install

# 安装浏览器
npm run install-browsers

# 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的 LLM_API_KEY
```

### 方式 2：从源码安装

```bash
git clone https://github.com/yourusername/alibaba-inquiry-skill.git
cd alibaba-inquiry-skill
npm install
npm run install-browsers
```

## 使用方法

在 Claude Code 中输入：

```bash
/alibaba-inquiry 开始处理询盘
```

### 完整流程

1. 自动启动 Chrome（如未运行）
2. 自动登录阿里巴巴（Cookie 持久化）
3. 打开询盘列表
4. 点击第一个询盘
5. 读取聊天记录
6. AI 分析意图并生成回复
7. 填充回复到输入框
8. 人工确认发送

## 功能特点

- ✅ **自动登录** - Cookie 持久化，一次登录永久有效
- ✅ **AI 话术匹配** - 基于知识库自动生成专业回复
- ✅ **多语言支持** - 自动检测客户语言（中/英/法/西等）
- ✅ **意图识别** - 价格/样品/付款/物流/定制/售后，自动匹配话术
- ✅ **手动发送** - 回复填充到输入框，人工确认后发送

## 配置说明

### 环境变量（.env）

```bash
# 大模型 API 配置
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-your-api-key
LLM_MODEL=qwen3.5-plus

# 询盘列表页 URL
ALIBABA_MESSAGE_URL=https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all
```

### 常见大模型配置

**阿里云通义千问**：
```bash
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-...
LLM_MODEL=qwen-plus
```

**OpenAI**：
```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
```

**DeepSeek**：
```bash
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=deepseek-chat
```

## 构建打包

```bash
# 运行构建脚本
./build.sh

# 输出位置
build/skills/alibaba-inquiry/
```

## 技术架构

```
alibaba-inquiry-skill/
├── skills/alibaba-inquiry/  # Skill 入口
│   ├── index.js             # Skill 主文件
│   ├── package.json         # Skill 配置
│   └── skill.json           # Skill 元数据
├── src/
│   ├── browser.js           # 浏览器管理（CDP 连接、Cookie 存取）
│   ├── ai-replier.js        # AI 回复生成（意图识别、话术匹配）
│   └── inquiry-scraper.js   # 询盘数据提取
├── docs/
│   └── knowledge-base.md    # 销售话术知识库
├── build.sh                 # 构建脚本
└── run.js                   # 主运行脚本
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

```bash
rm cookies/alibaba.json
# 重新运行 /alibaba-inquiry，手动登录后自动保存
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
