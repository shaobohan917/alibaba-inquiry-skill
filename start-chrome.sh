#!/bin/bash
# 使用 CDP 模式启动 Chrome，允许工具连接到现有浏览器

# 关闭所有 Chrome 进程
echo "正在启动 Chrome (CDP 模式)..."
echo "💡 提示：登录后请保持浏览器打开，然后运行 npm start"

# 启动 Chrome 并开放 CDP 端口
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir=/tmp/chrome-cdp-profile \
  about:blank &

echo "Chrome 已启动，CDP 端口：9222"
echo "请在打开的 Chrome 窗口中登录阿里巴巴国际站"
