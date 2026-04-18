---
name: SQLite 本地存储预留 Supabase 接口
description: 本地数据库使用 SQLite，但架构设计时预留 Supabase 云端同步接口
type: feedback
---

**数据库策略**：本地 SQLite 存储 + 云端 Supabase 接口预留。

**Why**：用户选择先用 SQLite 做本地存储，后续升级到 Supabase 云端同步，这是渐进式架构。

**How to apply**：设计数据库访问层（Repository Pattern），定义统一的 Data Trait/Interface，SQLite 实现本地存储逻辑，预留 Supabase 实现位置。代码结构：`database.rs (Trait)` → `sqlite_impl.rs` / `supabase_impl.rs (未来)`。
