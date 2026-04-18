#!/bin/bash
# 使用 CDP 模式启动 Chrome，允许工具连接到现有浏览器

# CDP 配置文件目录（固定目录，保留登录状态）
CDP_PROFILE_DIR="$HOME/.chrome-cdp-profile"

# 关闭所有 Chrome 进程
echo "正在启动 Chrome (CDP 模式)..."
echo "💡 提示：首次登录后，后续启动会自动保留登录状态"
echo "📁 配置文件目录：$CDP_PROFILE_DIR"

# 创建配置文件目录
mkdir -p "$CDP_PROFILE_DIR"

# 启动 Chrome 并开放 CDP 端口
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir="$CDP_PROFILE_DIR" \
  about:blank &

echo "Chrome 已启动，CDP 端口：9222"
echo "请在打开的 Chrome 窗口中登录阿里巴巴国际站"
