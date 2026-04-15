# 阿里国际站 AI 智能体协同系统

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    总监管 Agent                      │
│  /alibaba-supervisor                                │
│  任务分发、进度追踪、数据汇总看板                     │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   业务员 Agent │  │   运营 Agent   │  │   美工 Agent   │
│  /alibaba-sales│  │ /alibaba-operation│ │ /alibaba-design│
│ 询盘回复、CRM  │  │ 数据分析、推广 │  │ 主图、详情页  │
└───────────────┘  └───────────────┘  └───────────────┘
        │
        ▼
┌───────────────┐  ┌───────────────┐
│   采购 Agent   │  │   库存 Agent   │
│ /alibaba-procurement│ │ /alibaba-inventory│
│ 1688 选品、比价 │  │ 库存监控、物流 │
└───────────────┘  └───────────────┘
```

## Skill 列表

| Skill | 命令 | 功能 |
|-------|------|------|
| `/alibaba-supervisor` | 总监管 Agent | 任务分发、数据看板、日报生成 |
| `/alibaba-sales` | 业务员 Agent | 询盘回复、客户 CRM、复购促进 |
| `/alibaba-operation` | 运营 Agent | 数据采集、6 大指标、推广优化 |
| `/alibaba-design` | 美工 Agent | 主图生成、详情页优化 |
| `/alibaba-procurement` | 采购 Agent | 1688 选品、供应商管理 |
| `/alibaba-inventory` | 库存 Agent | 库存监控、物流跟踪 |

## 使用方式

### 总监管 Agent

```bash
# 开始今日任务
/alibaba-supervisor 开始今日任务

# 查看数据看板
/alibaba-supervisor 查看数据看板

# 生成日报
/alibaba-supervisor 生成日报

# 查看任务列表
/alibaba-supervisor 查看任务列表
```

### 业务员 Agent

```bash
# 开始处理询盘
/alibaba-sales 开始处理询盘

# 查看待跟进客户
/alibaba-sales 查看待跟进客户

# 生成复购话术
/alibaba-sales 生成复购话术 <customerId>
```

### 运营 Agent

```bash
# 开始数据采集
/alibaba-operation 开始数据采集

# 查看指标
/alibaba-operation 查看指标

# 分析关键词
/alibaba-operation 分析关键词
```

### 美工 Agent

```bash
# 开始生成图片
/alibaba-design 开始生成图片

# 优化低 CTR 产品
/alibaba-design 优化低 CTR 产品

# 查看模板
/alibaba-design 查看模板
```

### 采购 Agent

```bash
# 开始选品
/alibaba-procurement 开始选品

# 比价
/alibaba-procurement 比价 产品名

# 筛选新品
/alibaba-procurement 筛选新品

# 查看供应商
/alibaba-procurement 查看供应商
```

### 库存 Agent

```bash
# 查看库存预警
/alibaba-inventory 查看库存预警

# 查看物流状态
/alibaba-inventory 查看物流状态

# 入库
/alibaba-inventory 入库 product123 100

# 设置阈值
/alibaba-inventory 设置阈值 15
```

## 配置说明

### 环境变量 (.env)

```bash
# 大模型 API 配置
LLM_BASE_URL=https://api.anthropic.com
LLM_API_KEY=your_api_key
LLM_MODEL=claude-sonnet-4-5-20250929

# 阿里巴巴 URLs
ALIBABA_MESSAGE_URL=https://message.alibaba.com/...
ALIBABA_AD_URL=https://p4p.alibaba.com/...
ALIBABA_PRODUCT_URL=https://supplier.alibaba.com/...

# 运营配置
DAILY_BUDGET=150
SUB_PLANS_COUNT=3

# 库存配置
LOW_STOCK_THRESHOLD=10
```

## 数据看板 6 大核心指标

1. **曝光量** - 目标 ≥1000 次
2. **点击量** - 目标 ≥50 次
3. **CPC** (单次点击成本) - 目标 ≤2 元
4. **CTR** (点击率) - 目标 ≥1%
5. **询盘转化率** - 目标 ≥5%
6. **询盘成本** - 目标 ≤30 元

## 客户分层

- **新客户** - 首次询盘/下单
- **VIP 客户** - 2 次以上采购
- **大额意向** - 1000 件以上

## 运营策略

- **日预算**: 150 元
- **子计划**: 3 个，每个 50 元
- **严禁**: AI 智投，只做标准推广

## 文件结构

```
xiong/
├── core/                      # 核心框架层
│   ├── browser-manager.js     # 浏览器管理
│   ├── cookie-store.js        # Cookie 存储
│   ├── task-queue.js          # 任务队列
│   └── data-store.js          # 数据存储
├── agents/                    # 业务 Agent 层
│   ├── supervisor/            # 总监管
│   ├── sales/                 # 业务员
│   ├── operation/             # 运营
│   ├── design/                # 美工
│   ├── procurement/           # 采购
│   └── inventory/             # 库存
├── skills/                    # Skill 入口
│   ├── alibaba-supervisor/
│   ├── alibaba-sales/
│   ├── alibaba-operation/
│   ├── alibaba-design/
│   ├── alibaba-procurement/
│   └── alibaba-inventory/
├── config/
│   └── settings.json
├── docs/
│   └── knowledge-base.md      # 销售话术知识库
└── .env.example
```
