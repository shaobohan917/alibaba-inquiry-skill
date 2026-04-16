@echo off
chcp 65001 >nul
title 阿里智能业务员 Pro - 一键启动

echo ════════════════════════════════════════════
echo     🚀 阿里智能业务员 Pro - 一键启动
echo ════════════════════════════════════════════
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    echo    下载地址：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ 检测到 Node.js:
node -v
echo.

REM 检查 PM2 是否安装
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⏳ PM2 未安装，正在自动安装...
    npm install -g pm2
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ PM2 安装失败，请手动运行：npm install -g pm2
        echo.
        pause
        exit /b 1
    )
)

echo ✅ PM2 已安装
pm2 -v
echo.

REM 检查依赖是否安装
if not exist "node_modules" (
    echo ⏳ 正在安装依赖...
    call npm install --production
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        echo.
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

REM 创建必要目录
if not exist "logs\pm2" mkdir logs\pm2
if not exist "data\tasks" mkdir data\tasks
if not exist "data\cookies" mkdir data\cookies

REM 停止旧的进程
echo 📋 清理旧的进程...
pm2 delete alibaba-web alibaba-executor alibaba-supervisor 2>nul >nul
timeout /t 2 /nobreak >nul
echo.

REM 启动服务
echo 🚀 启动服务...
echo.

REM 启动 Web 服务
echo   [1/3] 启动 Web 服务...
pm2 start ecosystem.config.js --env development
timeout /t 3 /nobreak >nul

echo.
echo ════════════════════════════════════════════
echo              ✅ 启动成功!
echo ════════════════════════════════════════════
echo.
echo 🌐 访问地址：http://localhost:3000
echo.
echo 💡 提示:
echo    - 在浏览器中打开上面的地址即可使用
echo    - 查看日志：pm2 logs
echo    - 停止服务：pm2 stop all
echo    - 关闭此窗口不会影响服务运行
echo.
echo ════════════════════════════════════════════
echo.

REM 自动打开浏览器
start http://localhost:3000

pause
