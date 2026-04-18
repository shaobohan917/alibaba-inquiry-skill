---
name: Tauri + React + SQLite 技术栈
description: 桌面应用采用 Tauri 框架（Rust 后端）、React + Ant Design 前端、SQLite 本地数据库
type: feedback
---

**技术栈选择**：
1. Tauri 作为桌面应用框架（替代 Electron，体积更小性能更好）
2. React + Ant Design 作为前端 UI 框架
3. SQLite 作为本地数据存储

**Why**：用户明确选择 Tauri + React + SQLite，这是一套现代化、高性能的技术组合，适合打造专业级桌面应用。

**How to apply**：
- Tauri 需要 Rust 环境，后端 API 需用 Rust 重写（现有 Node.js 代码不能直接用）
- React 需要重构现有前端
- SQLite 需设计数据库 schema，预留云端同步接口
- 开发成本高于 Electron 方案，但产品性能和体积更优
