#!/bin/bash
# 打包脚本 - 构建独立的 skill 包

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
SKILL_NAME="alibaba-inquiry"

echo "🔧 开始构建 $SKILL_NAME..."

# 清理旧的构建目录
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 创建 skill 目录
mkdir -p "$BUILD_DIR/skills/$SKILL_NAME"

# 复制 skill 入口文件
echo "📁 复制 skill 入口..."
cp -r "$SCRIPT_DIR/skills/$SKILL_NAME"/* "$BUILD_DIR/skills/$SKILL_NAME/"

# 复制核心代码
echo "📁 复制核心代码..."
cp -r "$SCRIPT_DIR/src" "$BUILD_DIR/skills/$SKILL_NAME/src"
cp -r "$SCRIPT_DIR/docs" "$BUILD_DIR/skills/$SKILL_NAME/docs"
cp -r "$SCRIPT_DIR/config" "$BUILD_DIR/skills/$SKILL_NAME/config"
cp -r "$SCRIPT_DIR/cookies" "$BUILD_DIR/skills/$SKILL_NAME/cookies" 2>/dev/null || mkdir -p "$BUILD_DIR/skills/$SKILL_NAME/cookies"

# 复制主运行脚本
echo "📁 复制运行脚本..."
cp "$SCRIPT_DIR/run.js" "$BUILD_DIR/skills/$SKILL_NAME/"
cp "$SCRIPT_DIR/start-chrome.sh" "$BUILD_DIR/skills/$SKILL_NAME/" 2>/dev/null || true

# 复制根目录配置
echo "📁 复制配置文件..."
cp "$SCRIPT_DIR/package.json" "$BUILD_DIR/skills/$SKILL_NAME/root-package.json"
cp "$SCRIPT_DIR/.env.example" "$BUILD_DIR/skills/$SKILL_NAME/.env.example"
cp "$SCRIPT_DIR/.gitignore" "$BUILD_DIR/skills/$SKILL_NAME/.gitignore" 2>/dev/null || true
cp "$SCRIPT_DIR/LICENSE" "$BUILD_DIR/skills/$SKILL_NAME/" 2>/dev/null || true

# 修改 index.js 使用相对路径
echo "🔧 修改路径引用..."
sed -i.bak "s|path.join(__dirname, '..', '..')|path.join(__dirname)|g" "$BUILD_DIR/skills/$SKILL_NAME/index.js"
sed -i.bak "s|path.join(PROJECT_ROOT, 'run.js')|path.join(__dirname, 'run.js')|g" "$BUILD_DIR/skills/$SKILL_NAME/index.js"
rm -f "$BUILD_DIR/skills/$SKILL_NAME/index.js.bak"

# 创建 skill 专用的 package.json
echo "📝 创建 package.json..."
cat > "$BUILD_DIR/skills/$SKILL_NAME/package.json" << EOF
{
  "name": "$SKILL_NAME",
  "version": "1.0.0",
  "description": "阿里巴巴国际站询盘自动回复 Skill",
  "main": "index.js",
  "scripts": {
    "start": "node run.js",
    "install-browsers": "npx playwright install chromium"
  },
  "keywords": ["alibaba", "inquiry", "auto-reply", "claude-code-skill"],
  "license": "MIT",
  "dependencies": {
    "dotenv": "^17.4.1",
    "openai": "^6.34.0",
    "playwright": "^1.59.1"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

# 创建 README
echo "📝 创建 README..."
cat > "$BUILD_DIR/skills/$SKILL_NAME/README.md" << EOF
# $SKILL_NAME

阿里巴巴国际站询盘自动回复 Claude Code Skill

## 安装

\`\`\`bash
# 复制 Skill 到 Claude Code 目录
cp -r $SKILL_NAME ~/.claude/skills/

# 安装依赖
cd ~/.claude/skills/$SKILL_NAME
npm install

# 安装浏览器
npm run install-browsers
\`\`\`

## 配置

\`\`\`bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
\`\`\`

## 使用

在 Claude Code 中输入：
\`\`\`
/$SKILL_NAME 开始处理询盘
\`\`\`

## 许可证

MIT License
EOF

# 计算大小
BUILD_SIZE=$(du -sh "$BUILD_DIR/skills/$SKILL_NAME" | cut -f1)
echo ""
echo "✅ 构建完成！"
echo "📦 包位置：$BUILD_DIR/skills/$SKILL_NAME"
echo "📦 包大小：$BUILD_SIZE"
echo ""
echo "📋 安装方法："
echo "  cp -r $BUILD_DIR/skills/$SKILL_NAME ~/.claude/skills/"
echo "  cd ~/.claude/skills/$SKILL_NAME && npm install"
