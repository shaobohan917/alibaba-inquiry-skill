# 阿里智能业务员 Pro

> 让外贸更简单 - 自动回复询盘 · 智能客户跟进

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://example.com)
[![License](https://img.shields.io/badge/license-Commercial-green.svg)](https://example.com)

---

## 🚀 快速启动

### Windows 用户
**双击 `start.bat`** 即可启动，浏览器会自动打开系统界面。

### Mac 用户
**双击 `start.sh`** 即可启动，浏览器会自动打开系统界面。

> **首次启动说明**: 系统会自动安装依赖（约 1-2 分钟），后续启动只需 3-5 秒

---

## 💡 使用说明

启动后访问 http://localhost:3000，您会看到简洁的操作界面：

### 核心功能

#### 1. 💬 自动回复询盘
- 客户发来询盘后，系统自动分析并生成专业回复
- 15 分钟内快速响应，提高转化率
- 支持出口通和金品诚企两种店铺类型

#### 2. ⚙️ 自动任务执行
- 自动处理待办任务（客户跟进、数据同步、订单处理等）
- 启动后自动轮询，发现任务立即执行
- 实时查看任务状态和进度

### 店铺类型切换

点击顶部按钮切换店铺类型：
- 📦 **出口通店铺**: 标准响应时效（15 分钟）
- 💎 **金品诚企店铺**: 优先响应时效（10 分钟）

---

## 📋 系统要求

- **操作系统**: Windows 10+ / macOS 11+ / Ubuntu 18.04+
- **Node.js**: 16.0+ (启动时自动检测)
- **网络**: 首次启动需要访问 npm 仓库

---

## 🔧 常用命令

### 查看服务状态
```bash
pm2 status
```

### 查看日志
```bash
pm2 logs
```

### 停止服务
```bash
pm2 stop all
```

### 重启服务
```bash
pm2 restart all
```

### 监控面板
```bash
pm2 monit
```

---

## 📁 目录结构

```
xiong/
├── start.bat              # Windows 一键启动脚本
├── start.sh               # Mac/Linux 一键启动脚本
├── ecosystem.config.js    # PM2 配置文件
├── web/
│   ├── server.js          # Web 服务器
│   └── index.html         # 用户界面
├── core/
│   ├── browser-manager.js # 浏览器管理
│   ├── task-queue.js      # 任务队列
│   ├── task-executor.js   # 任务执行器
│   └── data-store.js      # 数据存储
├── agents/
│   ├── supervisor/        # 总运营（任务分发）
│   ├── sales/             # 业务员（询盘处理）
│   └── ...                # 其他 Agent
├── data/                  # 数据存储目录
│   ├── cookies/           # 登录 Cookie
│   └── tasks/             # 任务数据
└── docs/
    ├── USER_GUIDE.md      # 详细使用指南
    └── CHANGELOG.md       # 版本更新说明
```

---

## ❓ 常见问题

### Q: 启动后显示"PM2 未安装"
**A**: 系统会自动安装 PM2，请等待安装完成。如果安装失败，可手动运行：
```bash
npm install -g pm2
```

### Q: 浏览器没有自动打开
**A**: 
1. 手动访问 http://localhost:3000
2. 检查防火墙设置，确保 3000 端口未被阻止

### Q: 如何停止服务
**A**: 运行以下命令：
```bash
pm2 stop all
```

### Q: Cookie 存储在哪里
**A**: `data/cookies/` 目录，请妥善保管，不要分享给他人

### Q: 如何备份数据
**A**: 备份整个 `data/` 目录即可

---

## 📞 技术支持

如遇到问题，请查看：
- **详细文档**: `docs/USER_GUIDE.md`
- **版本说明**: `docs/CHANGELOG.md`

---

## 📊 版本信息

**当前版本**: v1.0.0 (2026-04-14)
**代号**: 小白用户版

**核心特性**:
- ✅ 一键启动，无需命令行操作
- ✅ 简化界面，去掉技术术语
- ✅ 手动控制，取消开机自启
- ✅ 安全稳定，本地存储数据

---

## ⚠️ 注意事项

1. **账号安全**: 本系统通过浏览器自动化操作，请合理使用，避免频繁操作触发风控
2. **数据备份**: 定期备份 `data/` 目录
3. **网络环境**: 首次启动需要稳定的网络连接
4. **隐私保护**: 不要在公共电脑上使用本系统

---

**让外贸更简单！** 🚀
