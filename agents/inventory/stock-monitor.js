const DataStore = require('../../core/data-store');

/**
 * 库存监控模块
 * 负责库存水位、预警、统计
 */
class StockMonitor {
  constructor() {
    this.store = new DataStore();
    this.lowStockThreshold = 10; // 低库存阈值
  }

  /**
   * 设置低库存阈值
   * @param {number} threshold
   */
  setThreshold(threshold) {
    this.lowStockThreshold = threshold;
  }

  /**
   * 更新库存
   * @param {string} productId - 产品 ID
   * @param {number} quantity - 数量
   * @param {string} type - in/out
   */
  updateStock(productId, quantity, type = 'in') {
    return this.store.updateInventory(productId, quantity, type);
  }

  /**
   * 获取低库存产品列表
   * @returns {Array}
   */
  getLowStockProducts() {
    return this.store.getLowStockProducts(this.lowStockThreshold);
  }

  /**
   * 获取库存预警
   * @returns {Array}
   */
  getStockAlerts() {
    const lowStockProducts = this.getLowStockProducts();
    const alerts = [];

    for (const product of lowStockProducts) {
      alerts.push({
        type: 'low_stock',
        level: product.quantity < 5 ? 'high' : 'medium',
        productId: product.productId,
        productName: product.productName,
        currentStock: product.quantity,
        threshold: this.lowStockThreshold,
        message: `库存不足：${product.productName} (当前：${product.quantity}, 阈值：${this.lowStockThreshold})`,
        suggestion: product.quantity < 5 ? '立即补货' : '安排补货'
      });
    }

    return alerts;
  }

  /**
   * 获取库存统计
   * @returns {Object}
   */
  getStockStats() {
    const inventory = this.store.list('inventory');
    const products = this.store.list('products');

    const totalProducts = products.length;
    const totalStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockCount = inventory.filter(item => (item.quantity || 0) < this.lowStockThreshold).length;
    const outOfStockCount = inventory.filter(item => (item.quantity || 0) === 0).length;

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      outOfStockCount,
      healthRate: totalProducts > 0 ? ((totalProducts - lowStockCount) / totalProducts * 100).toFixed(1) + '%' : '100%'
    };
  }

  /**
   * 打印库存预警
   */
  printStockAlerts() {
    const alerts = this.getStockAlerts();

    console.log('\n═══════════════════════════════════════════');
    console.log('              库存预警');
    console.log('═══════════════════════════════════════════\n');

    if (alerts.length === 0) {
      console.log('✅ 库存充足，无预警\n');
    } else {
      for (const alert of alerts) {
        const levelIcon = alert.level === 'high' ? '🔴' : '🟡';
        console.log(`${levelIcon} ${alert.message}`);
        console.log(`   建议：${alert.suggestion}\n`);
      }
    }

    // 打印统计
    const stats = this.getStockStats();
    console.log('📊 库存统计:');
    console.log(`   产品总数：${stats.totalProducts}`);
    console.log(`   库存总量：${stats.totalStock}`);
    console.log(`   低库存产品：${stats.lowStockCount} 个`);
    console.log(`   缺货产品：${stats.outOfStockCount} 个`);
    console.log(`   库存健康度：${stats.healthRate}\n`);

    console.log('═══════════════════════════════════════════\n');
  }
}

module.exports = StockMonitor;
