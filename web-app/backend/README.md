# 阿里智能业务员 Pro v2.0 Backend

Express + better-sqlite3 本地 API 服务，面向 Tauri/React 前端提供 SQLite 数据访问层。

## 运行

```bash
npm install
npm run backend:init
npm run backend:dev
```

默认配置：

- API: `http://127.0.0.1:3001`
- CORS: `http://localhost:5173`
- SQLite: `backend/data/ali-ai-agent-system.sqlite`

可用环境变量：

- `API_HOST`
- `API_PORT`
- `DB_PATH`
- `CORS_ORIGIN`，多个来源用英文逗号分隔

## API

- `GET /health`
- `/api/tasks`
- `/api/customers`
- `/api/inquiries`
- `/api/sales`
- `/api/ad-metrics`
- `/api/settings`

除 `settings` 使用 `PUT /api/settings/:key` 外，主要资源支持 `GET /`、`GET /:id`、`POST /`、`PATCH /:id`、`DELETE /:id`。

业务员聚合接口：

- `GET /api/sales/overview`：业务员看板统计
- `GET /api/sales/leads?limit=20`：高意向客户列表
- `POST /api/sales/reply-drafts`：根据询盘内容生成回复草稿、意向评分和下一步动作
- `POST /api/sales/follow-up-tasks`：创建业务员跟进任务
