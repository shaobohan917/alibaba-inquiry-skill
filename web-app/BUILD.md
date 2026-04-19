# 阿里国际站 AI 智能体协同系统 桌面打包说明

本文档说明如何使用 Tauri v2 打包 `ali-ai-agent-system@2.0.0`。

## 环境依赖

- Node.js 20 LTS 或更新版本
- npm 10 或更新版本
- Rust stable toolchain，包括 `cargo`
- Tauri v2 系统依赖

各平台还需要安装对应的原生打包依赖：

- Windows: Microsoft Visual Studio Build Tools、WebView2 Runtime
- macOS: Xcode Command Line Tools
- Linux: WebKitGTK、AppIndicator、Rsvg、OpenSSL、pkg-config 等 Tauri Linux 依赖

## 安装依赖

```bash
cd web-app
npm ci
```

## 本地开发

```bash
npm run tauri:dev
```

开发端口固定为 `1420`，与 `src-tauri/tauri.conf.json` 中的 `devUrl` 保持一致。

## 生产打包

通用命令：

```bash
cd web-app
npm run tauri build
```

等价脚本：

```bash
./build.sh
```

Windows:

```bat
build.bat
```

平台定向打包：

```bash
npm run build:mac
npm run build:windows
npm run build:linux
```

产物默认输出到：

```text
web-app/src-tauri/target/release/bundle/
```

## 打包目标

- Windows: NSIS `.exe` 安装程序、MSI `.msi` 安装程序
- macOS: `.dmg` 安装包
- Linux: `.AppImage` 安装包

Tauri 通常在当前操作系统上生成该平台产物。跨平台产物建议使用对应系统或 CI runner 构建。

## 图标

图标源文件：

```text
web-app/src-tauri/icons/icon-1024.png
```

该文件为 1024x1024 PNG。已生成 Tauri 所需的 `32x32.png`、`128x128.png`、`128x128@2x.png`、`icon.png`、`icon.ico`、`icon.icns` 等平台资源。

需要重新生成图标时：

```bash
cd web-app
npm run tauri -- icon src-tauri/icons/icon-1024.png
```

## 配置说明

核心配置文件：

- `src-tauri/tauri.conf.json`: 应用信息、窗口、安全策略、打包目标、图标
- `src-tauri/Cargo.toml`: Rust/Tauri 包信息与依赖
- `package.json`: Vite、TypeScript、Tauri 构建脚本

前端构建命令为 `npm run build`，Tauri 打包时会自动执行该命令并读取 `dist` 目录。

销售模块在 Tauri 运行时优先调用 Rust command，不依赖 Express 独立进程；浏览器开发模式仍保留 HTTP API 回退，便于继续调试历史后端。

## 常见问题

### `tauri build` 找不到 Rust 或 Cargo

安装 Rust stable toolchain：

```bash
rustup default stable
```

安装后重启终端，再执行构建命令。

### Windows 缺少 WebView2

Tauri 配置使用 WebView2 下载引导安装模式。离线企业环境建议预装 Microsoft Edge WebView2 Runtime。

### Linux 构建失败并提示 WebKitGTK 或 pkg-config 缺失

安装发行版对应的 Tauri Linux 依赖后重试。不同发行版包名不同，建议以 Tauri v2 官方 Linux 依赖说明为准。

### macOS 生成 DMG 但未签名或未公证

本配置未内置 Apple Developer 证书。企业分发或公网分发需要配置 macOS signing、notarization 和 stapling。

### 需要只生成当前平台安装包

使用平台脚本，例如 macOS：

```bash
npm run build:mac
```
