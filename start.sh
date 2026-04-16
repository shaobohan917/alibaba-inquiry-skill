#!/bin/bash

# 阿里智能业务员 Pro - 一键启动脚本 (Mac/Linux)

echo "════════════════════════════════════════════"
echo "    🚀 阿里智能业务员 Pro - 一键启动"
echo "════════════════════════════════════════════"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js"
    echo "   下载地址：https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✅ 检测到 Node.js:"
node -v
echo ""

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "⏳ PM2 未安装，正在自动安装..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ PM2 安装失败，请手动运行：npm install -g pm2"
        echo ""
        exit 1
    fi
fi

echo "✅ PM2 已安装"
pm2 -v
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "⏳ 正在安装依赖..."
    npm install --production
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        echo ""
        exit 1
    fi
    echo "✅ 依赖安装完成"
    echo ""
fi

# 创建必要目录
mkdir -p logs/pm2
mkdir -p data/tasks
mkdir -p data/cookies

# 停止旧的进程
echo "📋 清理旧的进程..."
pm2 delete alibaba-web alibaba-executor alibaba-supervisor 2>/dev/null || true
sleep 2
echo ""

# 启动服务
echo "🚀 启动服务..."
echo ""

# 启动 Web 服务
echo "  [1/2] 启动 Web 服务..."
pm2 start ecosystem.config.js --env development
sleep 3

echo ""
echo "════════════════════════════════════════════"
echo "            ✅ 启动成功!"
echo "════════════════════════════════════════════"
echo ""
echo "🌐 访问地址：http://localhost:3000"
echo ""
echo "💡 提示:"
echo "   - 在浏览器中打开上面的地址即可使用"
echo "   - 查看日志：pm2 logs"
echo "   - 停止服务：pm2 stop all"
echo "   - 关闭此窗口不会影响服务运行"
echo ""
echo "════════════════════════════════════════════"
echo ""

# Mac 下自动打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
fi
