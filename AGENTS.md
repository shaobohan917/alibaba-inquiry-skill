# 仓库指南

## 项目结构与模块组织

本仓库是阿里巴巴国际站 AI 智能体系统。根目录 Node 运行入口是 `run.js`，自动化代码位于 `src/`，平台服务位于 `core/`。按岗位划分的智能体位于 `agents/`，包括 `sales`、`operation`、`logistics`、`inventory`、`procurement`、`design`、`supervisor`。技能包位于 `skills/`。

浏览器扩展位于 `chrome-extension/`，包含 `background/`、`content/`、`popup/` 和 `lib/`。简单本地 Web UI 位于 `web/`。React/Tauri 应用位于 `web-app/`：前端代码在 `web-app/src/`，后端 API 在 `web-app/backend/src/`，测试在 `web-app/backend/tests/`，Rust 桌面壳代码在 `web-app/src-tauri/`。运行数据放在 `data/`、`cookies/`、`logs/`、`generated/`、`build/` 或 `dist/`。

## 构建、测试与开发命令

- `npm run install-browsers`：安装 Playwright Chromium，用于浏览器自动化。
- `npm run dev` / `npm start`：通过 `node run.js` 运行根目录智能体系统。
- `./build-extension.sh`：将 Chrome 扩展打包到 `dist/`。
- `cd web-app && npm install`：安装桌面应用依赖。
- `cd web-app && npm run dev`：启动 Vite 前端。
- `cd web-app && npm run backend:dev`：以 watch 模式启动后端 API。
- `cd web-app && npm run build`：执行类型检查并构建应用。
- `cd web-app && npm run tauri:dev`：开发时运行桌面壳。

## 代码风格与命名约定

根目录运行时和扩展默认使用 JavaScript CommonJS，除非目标包已经使用 ESM。`web-app` 使用 TypeScript、React 和 ESM。遵循现有两空格缩进、分号、描述性的 camelCase 标识符，以及 `browser-manager.js` 这类 kebab-case 文件名。岗位逻辑应放在对应 agent 或 skill 目录内。

## 测试指南

根目录自动化测试较少；智能体改动应通过有针对性的手动运行和日志检查验证。`web-app` 使用 Vitest，测试文件命名为 `*.test.js` 或 `*.test.ts`，放在相关 `tests/` 目录下。合并行为变更前运行 `cd web-app && npm run test`；修改 TypeScript/React 代码时运行 `cd web-app && npm run lint`。

## 提交与 Pull Request 规范

近期历史使用 Conventional Commit 前缀，常配中文摘要，例如 `feat: ...`、`fix: ...`、`docs: ...`、`chore: ...`。提交应保持范围清晰、语气明确。Pull Request 应包含简洁描述、受影响模块、验证命令、关联 issue 或任务；涉及 UI 或扩展变更时附截图。

## 安全与配置提示

不要提交真实 cookies、账号凭据、API keys 或本地 `.env` 文件。以 `.env.example` 和 `config/settings.json` 作为配置参考。将 `data/` 和 `cookies/` 视为敏感运行状态，谨慎备份和共享。
