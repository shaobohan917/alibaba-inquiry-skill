# 阿里国际站 AI 智能体协同系统 - 打包构建指南

## 环境要求

### 必需
- Node.js >= 18.18
- npm >= 9.0
- Rust >= 1.70 (使用 rustup 安装)

### Windows 额外要求
- Visual Studio 2022 with C++ workload
- WebView2 (安装包会自动下载)

### macOS 额外要求
- Xcode Command Line Tools
- macOS 10.13 或更高版本

## 开发模式

```bash
# 1. 进入项目目录
cd web-app

# 2. 安装依赖
npm install

# 3. 启动前端开发服务器
npm run dev

# 4. 启动后端 API (新终端窗口)
npm run backend:dev

# 5. 启动 Tauri 开发模式 (新终端窗口)
npm run tauri dev
```

## 生产构建

### 构建前端
```bash
npm run build
```

输出目录：`dist/`

### 构建 Tauri 应用

```bash
# 调试构建
npm run tauri build

# 发布构建 (优化体积)
npm run tauri build -- --release
```

## 打包产物

### Windows
- `src-tauri/target/release/bundle/msi/阿里智能业务员 Pro_2.0.0_x64.msi`
- `src-tauri/target/release/bundle/nsis/阿里智能业务员 Pro_2.0.0_x64-setup.exe`

### macOS
- `src-tauri/target/release/bundle/dmg/阿里智能业务员 Pro_2.0.0_x64.dmg`
- `src-tauri/target/release/bundle/macos/阿里智能业务员 Pro.app`

### Linux
- `src-tauri/target/release/bundle/appimage/ali-ai-agent-system_2.0.0_amd64.AppImage`

## 应用签名（可选）

### Windows 签名
```bash
# 使用 SignTool
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 target/release/阿里智能业务员 Pro.exe
```

### macOS 签名
```bash
# 使用 codesign
codesign --sign "Developer ID Application: Your Name" --deep --strict --options runtime dist/阿里智能业务员 Pro.app
```

## 分发说明

### 安装要求
1. Windows: 需要 .NET Desktop Runtime 8.0 (安装包会自动检测并提示下载)
2. macOS: 需要 macOS 10.13+
3. Linux: 需要 WebKit2GTK 2.36+

### 首次启动
- 应用会在 `~/.ali-ai-agent-system/` 创建本地 SQLite 数据库
- 首次启动会自动初始化数据库 Schema

## 故障排查

### 前端构建失败
```bash
# 清理缓存
rm -rf node_modules dist
npm install
npm run build
```

### Tauri 构建失败
```bash
# 检查 Rust 环境
rustc --version
cargo --version

# 更新 Rust
rustup update

# 重新安装 Tauri CLI
npm install -g @tauri-apps/cli
```

### 依赖安装失败
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

## 版本发布流程

1. 更新版本号
   - 修改 `package.json` version
   - 修改 `src-tauri/tauri.conf.json` version

2. 运行测试
   ```bash
   npm run lint
   npm run build
   npm run tauri build
   ```

3. 创建 Git 标签
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```

4. 上传安装包到发布渠道

---

**最后更新**: 2026-04-19
**版本**: 2.0.0
