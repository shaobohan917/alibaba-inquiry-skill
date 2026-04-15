const StockMonitor = require('./stock-monitor');
const ShipmentTracker = require('./shipment-tracker');
const DataStore = require('../../core/data-store');

/**
 * 库存 Agent
 * 负责库存监控、发货跟踪、缺货预警
 */
class InventoryAgent {
  constructor() {
    this.stockMonitor = new StockMonitor();
    this.shipmentTracker = new ShipmentTracker();
    this.store = new DataStore();
  }

  /**
   * 启动库存 Agent
   */
  async start() {
    console.log('🚀 库存 Agent 启动中...\n');

    // 显示库存预警
    this.stockMonitor.printStockAlerts();

    // 显示物流状态
    this.shipmentTracker.printLogisticsStatus();

    console.log('\n✅ 库存 Agent 任务完成\n');
  }

  /**
   * 设置低库存阈值
   * @param {number} threshold
   */
  setThreshold(threshold) {
    this.stockMonitor.setThreshold(threshold);
    console.log(`✓ 低库存阈值已设置为：${threshold}\n`);
  }

  /**
   * 添加入库
   * @param {string} productId
   * @param {number} quantity
   */
  async stockIn(productId, quantity) {
    console.log(`\n📥 入库操作：产品 ${productId} × ${quantity}\n`);

    const inventory = this.stockMonitor.updateStock(productId, quantity, 'in');

    if (inventory) {
      console.log(`✓ 入库成功，当前库存：${inventory.quantity}\n`);
    }
  }

  /**
   * 出库
   * @param {string} productId
   * @param {number} quantity
   */
  async stockOut(productId, quantity) {
    console.log(`\n📤 出库操作：产品 ${productId} × ${quantity}\n`);

    const inventory = this.stockMonitor.updateStock(productId, quantity, 'out');

    if (inventory) {
      console.log(`✓ 出库成功，当前库存：${inventory.quantity}\n`);
    }
  }

  /**
   * 创建发货单
   * @param {Object} shipment
   */
  createShipment(shipment) {
    const shipmentId = this.shipmentTracker.createShipment(shipment);
    console.log(`✓ 发货单已创建：${shipmentId}\n`);
    return shipmentId;
  }

  /**
   * 更新发货状态
   * @param {string} shipmentId
   * @param {string} status
   */
  updateShipmentStatus(shipmentId, status) {
    this.shipmentTracker.updateShipmentStatus(shipmentId, status);
    console.log(`✓ 发货单状态已更新：${shipmentId} → ${status}\n`);
  }

  /**
   * 显示库存预警
   */
  showStockAlerts() {
    this.stockMonitor.printStockAlerts();
  }

  /**
   * 显示物流状态
   */
  showLogisticsStatus() {
    this.shipmentTracker.printLogisticsStatus();
  }
}

// CLI 入口
async function main() {
  const agent = new InventoryAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'alerts':
        agent.showStockAlerts();
        break;

      case 'logistics':
        agent.showLogisticsStatus();
        break;

      case 'stockin':
        const productIdIn = process.argv[3];
        const quantityIn = parseInt(process.argv[4] || '0');
        if (productIdIn && quantityIn) {
          await agent.stockIn(productIdIn, quantityIn);
        } else {
          console.log('用法：node agents/inventory/index.js stockin <productId> <quantity>');
        }
        break;

      case 'stockout':
        const productIdOut = process.argv[3];
        const quantityOut = parseInt(process.argv[4] || '0');
        if (productIdOut && quantityOut) {
          await agent.stockOut(productIdOut, quantityOut);
        } else {
          console.log('用法：node agents/inventory/index.js stockout <productId> <quantity>');
        }
        break;

      case 'threshold':
        const threshold = parseInt(process.argv[3] || '10');
        agent.setThreshold(threshold);
        break;

      default:
        console.log('用法：node agents/inventory/index.js [start|alerts|logistics|stockin|stockout|threshold]');
        console.log('\n示例:');
        console.log('  /alibaba-inventory 查看库存预警');
        console.log('  /alibaba-inventory 查看物流状态');
        console.log('  /alibaba-inventory 入库 product123 100');
        console.log('  /alibaba-inventory 设置阈值 15');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  console.log('👋 库存 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = InventoryAgent;
