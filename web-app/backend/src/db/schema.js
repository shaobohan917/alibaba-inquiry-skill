export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    alibaba_member_id TEXT UNIQUE,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    source TEXT NOT NULL DEFAULT 'alibaba',
    status TEXT NOT NULL DEFAULT 'new'
      CHECK (status IN ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost', 'archived')),
    tags TEXT NOT NULL DEFAULT '[]',
    last_contacted_at TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    alibaba_inquiry_id TEXT UNIQUE,
    customer_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    product_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    target_price REAL CHECK (target_price IS NULL OR target_price >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    message TEXT NOT NULL,
    ai_reply TEXT,
    status TEXT NOT NULL DEFAULT 'new'
      CHECK (status IN ('new', 'analyzing', 'replied', 'follow_up', 'quoted', 'closed', 'spam')),
    priority TEXT NOT NULL DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'manual'
      CHECK (type IN ('manual', 'sales', 'operation', 'procurement', 'inventory', 'logistics', 'design', 'supervisor')),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'running', 'blocked', 'completed', 'failed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_agent TEXT,
    related_customer_id TEXT,
    related_inquiry_id TEXT,
    due_at TEXT,
    completed_at TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (related_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (related_inquiry_id) REFERENCES inquiries(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS ad_metrics (
    id TEXT PRIMARY KEY,
    metric_date TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    product_id TEXT,
    impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
    spend REAL NOT NULL DEFAULT 0 CHECK (spend >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    inquiries INTEGER NOT NULL DEFAULT 0 CHECK (inquiries >= 0),
    orders INTEGER NOT NULL DEFAULT 0 CHECK (orders >= 0),
    revenue REAL NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    ctr REAL NOT NULL DEFAULT 0 CHECK (ctr >= 0),
    cpc REAL NOT NULL DEFAULT 0 CHECK (cpc >= 0),
    conversion_rate REAL NOT NULL DEFAULT 0 CHECK (conversion_rate >= 0),
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (metric_date, campaign_id, product_id)
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    is_secret INTEGER NOT NULL DEFAULT 0 CHECK (is_secret IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name)`,
  `CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON inquiries(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)`,
  `CREATE INDEX IF NOT EXISTS idx_inquiries_received_at ON inquiries(received_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_metrics_metric_date ON ad_metrics(metric_date)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign_id ON ad_metrics(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)`,
];

export const triggerStatements = [
  `CREATE TRIGGER IF NOT EXISTS trg_customers_updated_at
    AFTER UPDATE ON customers
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE customers SET updated_at = datetime('now') WHERE id = OLD.id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_inquiries_updated_at
    AFTER UPDATE ON inquiries
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE inquiries SET updated_at = datetime('now') WHERE id = OLD.id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_ad_metrics_updated_at
    AFTER UPDATE ON ad_metrics
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE ad_metrics SET updated_at = datetime('now') WHERE id = OLD.id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
    AFTER UPDATE ON settings
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE settings SET updated_at = datetime('now') WHERE key = OLD.key;
    END`,
];

export const seedStatements = [
  {
    sql: `INSERT OR IGNORE INTO settings (key, value, category, description)
      VALUES (?, ?, ?, ?)`,
    params: [
      'agent.enabled',
      JSON.stringify({
        sales: true,
        operation: true,
        procurement: true,
        inventory: true,
        logistics: true,
        design: true,
        supervisor: true,
      }),
      'agents',
      '7 Agent 自动化能力开关',
    ],
  },
  {
    sql: `INSERT OR IGNORE INTO settings (key, value, category, description)
      VALUES (?, ?, ?, ?)`,
    params: ['app.version', JSON.stringify('2.0.0'), 'system', '阿里智能业务员 Pro 版本号'],
  },
];
