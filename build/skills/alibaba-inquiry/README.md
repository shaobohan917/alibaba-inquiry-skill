# alibaba-inquiry

阿里巴巴国际站询盘自动回复 Claude Code Skill

## 安装

```bash
# 复制 Skill 到 Claude Code 目录
cp -r alibaba-inquiry ~/.claude/skills/

# 安装依赖
cd ~/.claude/skills/alibaba-inquiry
npm install

# 安装浏览器
npm run install-browsers
```

## 配置

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
```

## 使用

在 Claude Code 中输入：
```
/alibaba-inquiry 开始处理询盘
```

## 许可证

MIT License
