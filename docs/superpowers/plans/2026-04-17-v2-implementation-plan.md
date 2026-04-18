# 阿里智能业务员 Pro v2.0 - 实现计划

## 📋 项目概述

**目标**：打造售价 2 万元的企业级桌面应用，包含 7 Agent 自动化能力 + 数据看板

**技术栈**：
- 前端：React + Ant Design + TypeScript
- 后端：Node.js（v1 快速交付） → Rust + Tauri（v2 专业交付）
- 数据库：SQLite（本地） + Supabase 接口预留
- 打包：Tauri Builder

**交付形式**：纯软件，桌面应用安装包（.dmg / .exe）

---

## 🎯 产品范围

### v1.0 基础版（快速交付）
| 模块 | 功能 | 优先级 |
|------|------|--------|
| 业务员 Agent | 询盘自动回复、客户 CRM | P0 |
| 运营 Agent | 数据采集、6 大指标、异常预警 | P0 |
| 数据看板 | 简约版（今日数据 + 趋势图） | P0 |
| SQLite 数据库 | 本地数据存储 | P0 |
| React 前端 | 新版 UI 框架 | P0 |

### v1.1 增强版（后续迭代）
| 模块 | 功能 | 优先级 |
|------|------|--------|
| 运营 Agent | 关键词分析、推广优化建议 | P1 |
| 数据看板 | 专业大屏（历史对比、导出报表） | P1 |
| 授权管理 | 机器码绑定、使用期限 | P1 |

### v2.0 专业版（长期规划）
| 模块 | 功能 | 优先级 |
|------|------|--------|
| Tauri 重构 | Rust 后端、更优性能 | P2 |
| 美工 Agent | 图片生成、A/B 测试 | P2 |
| 采购 Agent | 1688 选品、供应商管理 | P2 |
| 库存 Agent | 库存监控、预警 | P2 |
| 物流 Agent | 货代比价、物流跟踪 | P2 |
| Supabase 同步 | 云端数据备份、多设备同步 | P2 |

---

## 📐 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户侧桌面应用                           │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React + Ant Design 前端                               │  │
│  │  ├── 登录页                                            │  │
│  │  ├── 主控制台（数据看板）                              │  │
│  │  ├── 业务员模块（询盘处理、客户 CRM）                 │  │
│  │  ├── 运营模块（数据采集、推广优化）                   │  │
│  │  └── 设置页（店铺配置、API 配置）                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↕ IPC / HTTP                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Node.js 后端服务 (v1) / Rust Tauri Backend (v2)      │  │
│  │  ├── API Server                                        │  │
│  │  ├── 任务调度器                                        │  │
│  │  └── 浏览器自动化 (Playwright)                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↕                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SQLite 数据库                                         │  │
│  │  ├── tasks (任务表)                                   │  │
│  │  ├── customers (客户表)                               │  │
│  │  ├── inquiries (询盘表)                               │  │
│  │  ├── ad_metrics (推广数据表)                          │  │
│  │  └── settings (配置表)                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 数据库 Schema（SQLite）

```sql
-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    payload TEXT,
    progress INTEGER DEFAULT 0,
    result TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

-- 客户表
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    country TEXT,
    email TEXT,
    phone TEXT,
    tier TEXT DEFAULT 'normal',
    total_inquiries INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    last_contact_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 询盘表
CREATE TABLE inquiries (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id),
    subject TEXT,
    content TEXT,
    product_name TEXT,
    quantity TEXT,
    status TEXT DEFAULT 'unread',
    reply_content TEXT,
    reply_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 推广数据表（运营 Agent 核心）
CREATE TABLE ad_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exposure INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    cpc REAL DEFAULT 0,
    ctr REAL DEFAULT 0,
    inquiry_rate REAL DEFAULT 0,
    inquiry_cost REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- 配置表
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_ad_metrics_date ON ad_metrics(date);
```

### 数据库访问层设计（预留 Supabase 接口）

```typescript
// 定义统一的数据访问接口
interface IRepository {
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  createTask(task: CreateTaskDto): Promise<Task>;
  updateTask(id: string, updates: UpdateTaskDto): Promise<Task>;
  
  getAdMetrics(date: string): Promise<AdMetric | null>;
  saveAdMetrics(metric: CreateAdMetricDto): Promise<AdMetric>;
  getAdMetricsRange(start: string, end: string): Promise<AdMetric[]>;
  
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  saveCustomer(customer: CreateCustomerDto): Promise<Customer>;
  
  getInquiries(status?: string): Promise<Inquiry[]>;
  getInquiry(id: string): Promise<Inquiry | null>;
  saveInquiry(inquiry: CreateInquiryDto): Promise<Inquiry>;
}

// SQLite 实现（v1）
class SQLiteRepository implements IRepository {
  // ... SQLite 具体实现
}

// Supabase 实现（v2 预留）
class SupabaseRepository implements IRepository {
  // ... Supabase 具体实现
}
```

---

## 📝 实现任务清单

### 阶段一：React + Ant Design 前端重构（5 天）

#### 任务 1.1：项目初始化
- [ ] 创建 React + TypeScript 项目（Vite）
- [ ] 安装 Ant Design、React Router、Zustand（状态管理）
- [ ] 配置 ESLint、Prettier
- [ ] 搭建基础路由结构

#### 任务 1.2：登录页
- [ ] 设计登录页 UI（简洁专业风）
- [ ] 实现登录表单（账号密码 / 机器码激活）
- [ ] 本地 Token 存储
- [ ] 路由守卫

#### 任务 1.3：主控制台布局
- [ ] 顶部导航栏（店铺类型切换、用户头像）
- [ ] 侧边栏菜单（仪表盘、业务员、运营、设置）
- [ ] 内容区域布局
- [ ] 响应式适配

#### 任务 1.4：数据看板组件（简约版）
- [ ] 7 大核心指标卡片组件
- [ ] 今日数据展示
- [ ] 简单趋势图（使用 Recharts）
- [ ] 自动刷新（每 5 秒）

#### 任务 1.5：业务员模块 UI
- [ ] 询盘列表页
- [ ] 询盘详情页
- [ ] 客户列表页
- [ ] 客户详情页

#### 任务 1.6：运营模块 UI
- [ ] 推广数据展示页
- [ ] 6 大指标卡片
- [ ] 异常预警列表
- [ ] 优化建议列表

#### 任务 1.7：设置页
- [ ] 店铺类型配置
- [ ] API Key 配置
- [ ] 数据导入/导出
- [ ] 关于页面

---

### 阶段二：SQLite 数据库集成（2 天）

#### 任务 2.1：数据库初始化
- [ ] 安装 better-sqlite3
- [ ] 创建数据库初始化脚本
- [ ] 实现 Schema 迁移
- [ ] 数据库备份工具

#### 任务 2.2：Repository 实现
- [ ] SQLiteRepository 基础类
- [ ] TaskRepository
- [ ] CustomerRepository
- [ ] InquiryRepository
- [ ] AdMetricRepository

#### 任务 2.3：API 服务层
- [ ] Express/Koa 路由
- [ ] 任务管理 API
- [ ] 客户管理 API
- [ ] 询盘管理 API
- [ ] 推广数据 API

---

### 阶段三：运营 Agent 增强（3 天）

#### 任务 3.1：数据采集增强
- [ ] 优化阿里巴巴页面选择器
- [ ] 增加数据校验逻辑
- [ ] 异常重试机制
- [ ] 数据采集日志

#### 任务 3.2：关键词分析功能
- [ ] 关键词数据采集
- [ ] 质量分分析
- [ ] 低效词识别
- [ ] 优化建议生成

#### 任务 3.3：推广优化功能
- [ ] 预算分配检查
- [ ] 计划表现分析
- [ ] 自动优化建议
- [ ] 优化效果追踪

---

### 阶段四：前后端联调（2 天）

#### 任务 4.1：API 对接
- [ ] React 前端调用后端 API
- [ ] 统一错误处理
- [ ] Loading 状态管理
- [ ] Toast 通知

#### 任务 4.2：数据流测试
- [ ] 运营 Agent 采集数据 → 存入 SQLite → 前端展示
- [ ] 完整流程测试
- [ ] 性能优化

---

### 阶段五：打包与分发（2 天）

#### 任务 5.1：Electron/Tauri 打包
- [ ] 选择打包框架（Electron 快速版 / Tauri 专业版）
- [ ] 配置打包脚本
- [ ] 代码签名（可选）
- [ ] 安装包测试

#### 任务 5.2：安装包制作
- [ ] Windows 安装包（.exe）
- [ ] Mac 安装包（.dmg）
- [ ] 自动更新配置
- [ ] 安装指南文档

---

## 📅 时间规划

| 阶段 | 内容 | 工期 | 累计 |
|------|------|------|------|
| 阶段一 | React 前端重构 | 5 天 | 5 天 |
| 阶段二 | SQLite 集成 | 2 天 | 7 天 |
| 阶段三 | 运营 Agent 增强 | 3 天 | 10 天 |
| 阶段四 | 前后端联调 | 2 天 | 12 天 |
| 阶段五 | 打包分发 | 2 天 | 14 天 |

**总计**：约 2-3 周（14 个工作日）

---

## 🧪 测试计划

### 单元测试
- [ ] Repository 层测试
- [ ] API 服务层测试
- [ ] 工具函数测试

### 集成测试
- [ ] 前端组件测试
- [ ] 前后端联调测试
- [ ] 数据库操作测试

### E2E 测试
- [ ] 用户登录流程
- [ ] 运营数据采集流程
- [ ] 询盘处理流程

---

## 📦 交付物清单

### 软件交付
- [ ] Windows 安装包（.exe）
- [ ] Mac 安装包（.dmg）
- [ ] Linux 安装包（.AppImage，可选）

### 文档交付
- [ ] 产品使用手册（PDF）
- [ ] 快速入门指南（Markdown）
- [ ] API 接口文档（Markdown）
- [ ] 数据库设计文档（Markdown）

### 技术交付
- [ ] 源代码（Git 仓库）
- [ ] 构建脚本
- [ ] 部署文档
- [ ] 维护手册

---

## 🚀 后续迭代规划

### v1.1 增强版（+1 周）
- 授权管理系统（机器码绑定）
- 数据导出功能（Excel）
- 日志查看器

### v1.2 专业版（+2 周）
- 专业数据大屏（历史对比、异常预警）
- 消息通知（系统内通知 + 邮件）
- 多店铺管理

### v2.0 Tauri 版（+4 周）
- Rust 后端重构
- Supabase 云端同步
- 自动更新

### v2.1 完整版（+4 周）
- 美工 Agent
- 采购 Agent
- 库存 Agent
- 物流 Agent

---

## ⚠️ 风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 阿里巴巴页面结构变更 | 高 | 中 | 抽象选择器配置，支持热更新 |
| Playwright 兼容性问题 | 中 | 低 | 充分测试，准备 Puppeteer 备选 |
| SQLite 性能瓶颈 | 中 | 低 | 数据分表、分页查询、定期清理 |
| React 重构进度延期 | 高 | 中 | 优先级排序，核心功能先行 |
| Tauri/Rust 学习成本 | 高 | 高 | 先 Node.js 交付，后续迭代 |

---

## 📋 下一步行动

1. **确认技术选型** — Electron 快速交付 vs Tauri 专业交付
2. **启动阶段一** — React + Ant Design 前端重构
3. **创建 Git 分支** — `feature/v2-react-ui`
4. **每日站会** — 同步进度和问题

---

**文档版本**：v1.0
**创建日期**：2026-04-17
**最后更新**：2026-04-17
