const fs = require('fs');
const path = require('path');

/**
 * 数据存储中心
 * 统一管理客户、产品、库存等数据
 */
class DataStore {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '..', 'data');
    this.ensureDir();
  }

  /**
   * 确保数据目录存在
   */
  ensureDir() {
    const collections = ['customers', 'products', 'inventory', 'orders', 'analytics'];

    for (const collection of collections) {
      const dir = path.join(this.dataDir, collection);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 获取集合目录
   * @param {string} collection - 集合名
   * @returns {string}
   */
  getCollectionDir(collection) {
    return path.join(this.dataDir, collection);
  }

  /**
   * 获取记录文件路径
   * @param {string} collection
   * @param {string} id
   * @returns {string}
   */
  getRecordPath(collection, id) {
    return path.join(this.getCollectionDir(collection), `${id}.json`);
  }

  /**
   * 创建记录
   * @param {string} collection - 集合名
   * @param {Object} data - 记录数据
   * @returns {string} 记录 ID
   */
  create(collection, data) {
    const id = data.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    const recordPath = this.getRecordPath(collection, id);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));

    return id;
  }

  /**
   * 获取记录
   * @param {string} collection
   * @param {string} id
   * @returns {Object|null}
   */
  get(collection, id) {
    const recordPath = this.getRecordPath(collection, id);

    if (fs.existsSync(recordPath)) {
      return JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
    }

    return null;
  }

  /**
   * 更新记录
   * @param {string} collection
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null}
   */
  update(collection, id, updates) {
    const record = this.get(collection, id);
    if (!record) {
      return null;
    }

    Object.assign(record, updates, { updatedAt: new Date().toISOString() });

    const recordPath = this.getRecordPath(collection, id);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));

    return record;
  }

  /**
   * 删除记录
   * @param {string} collection
   * @param {string} id
   * @returns {boolean}
   */
  delete(collection, id) {
    const recordPath = this.getRecordPath(collection, id);

    if (fs.existsSync(recordPath)) {
      fs.unlinkSync(recordPath);
      return true;
    }

    return false;
  }

  /**
   * 列出记录
   * @param {string} collection
   * @param {Object} filters - 过滤条件
   * @returns {Array}
   */
  list(collection, filters = {}) {
    const records = [];
    const collectionDir = this.getCollectionDir(collection);

    if (!fs.existsSync(collectionDir)) {
      return records;
    }

    const files = fs.readdirSync(collectionDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const recordPath = path.join(collectionDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));

        // 应用过滤
        let matches = true;
        for (const [key, value] of Object.entries(filters)) {
          if (data[key] !== value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          records.push(data);
        }
      } catch (e) {
        // 忽略无效文件
      }
    }

    // 按创建时间倒序
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records;
  }

  /**
   * 查找单条记录
   * @param {string} collection
   * @param {Object} filters
   * @returns {Object|null}
   */
  findOne(collection, filters) {
    const records = this.list(collection, filters);
    return records[0] || null;
  }

  // ============ 客户管理专用方法 ============

  /**
   * 创建/更新客户记录
   * @param {Object} customer
   */
  upsertCustomer(customer) {
    const existing = this.findOne('customers', { email: customer.email });

    if (existing) {
      return this.update('customers', existing.id, {
        ...customer,
        lastContactAt: new Date().toISOString(),
        contactCount: (existing.contactCount || 0) + 1
      });
    } else {
      return this.create('customers', {
        ...customer,
        lastContactAt: new Date().toISOString(),
        contactCount: 1,
        tier: this.calculateCustomerTier(customer)
      });
    }
  }

  /**
   * 计算客户层级
   * @param {Object} customer
   * @returns {string} new/vip/bulk
   */
  calculateCustomerTier(customer) {
    if (customer.orderCount >= 2) return 'vip';
    if (customer.orderQuantity >= 1000) return 'bulk';
    return 'new';
  }

  /**
   * 获取需要跟进的客户列表
   * @param {number} days - 超过多少天未联系
   * @returns {Array}
   */
  getFollowUpCustomers(days = 3) {
    const customers = this.list('customers');
    const now = Date.now();
    const thresholdMs = days * 24 * 60 * 60 * 1000;

    return customers.filter(customer => {
      if (!customer.lastContactAt) return true;
      const lastContact = new Date(customer.lastContactAt).getTime();
      return (now - lastContact) > thresholdMs;
    });
  }

  // ============ 产品管理专用方法 ============

  /**
   * 创建/更新产品记录
   * @param {Object} product
   */
  upsertProduct(product) {
    const existing = this.findOne('products', { sku: product.sku });

    if (existing) {
      return this.update('products', existing.id, product);
    } else {
      return this.create('products', product);
    }
  }

  // ============ 库存管理专用方法 ============

  /**
   * 更新库存
   * @param {string} productId
   * @param {number} quantity
   * @param {string} type - in/out
   */
  updateInventory(productId, quantity, type = 'in') {
    const inventory = this.findOne('inventory', { productId });

    if (inventory) {
      const newQuantity = type === 'in'
        ? (inventory.quantity || 0) + quantity
        : (inventory.quantity || 0) - quantity;

      return this.update('inventory', inventory.id, {
        quantity: newQuantity,
        lastUpdatedAt: new Date().toISOString()
      });
    } else {
      return this.create('inventory', {
        productId,
        quantity: type === 'in' ? quantity : 0,
        lastUpdatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * 获取低库存产品
   * @param {number} threshold - 阈值
   * @returns {Array}
   */
  getLowStockProducts(threshold = 10) {
    const inventory = this.list('inventory');
    return inventory.filter(item => (item.quantity || 0) < threshold);
  }

  // ============ 数据分析专用方法 ============

  /**
   * 记录日常数据
   * @param {Object} data
   */
  recordDailyData(data) {
    const today = new Date().toISOString().split('T')[0];

    return this.create('analytics', {
      date: today,
      ...data,
      recordedAt: new Date().toISOString()
    });
  }

  /**
   * 获取某日期的数据
   * @param {string} date - YYYY-MM-DD
   * @returns {Object|null}
   */
  getDailyData(date) {
    return this.findOne('analytics', { date });
  }
}

module.exports = DataStore;
