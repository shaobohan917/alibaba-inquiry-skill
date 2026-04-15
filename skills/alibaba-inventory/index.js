/**
 * Alibaba Inventory Skill
 * 库存 Agent 入口
 */

const InventoryAgent = require('../agents/inventory');

async function run(command, args) {
  const agent = new InventoryAgent();

  try {
    switch (command) {
      case 'start':
      case '查看库存预警':
        await agent.start();
        break;

      case 'alerts':
        agent.showStockAlerts();
        break;

      case 'logistics':
      case '查看物流状态':
        agent.showLogisticsStatus();
        break;

      case 'stockin':
      case '入库':
        const productId = args?.[0];
        const quantity = parseInt(args?.[1] || '0');
        if (productId && quantity) {
          await agent.stockIn(productId, quantity);
        } else {
          console.log('用法：/alibaba-inventory 入库 <productId> <quantity>');
        }
        break;

      case 'threshold':
      case '设置阈值':
        const threshold = parseInt(args?.[0] || '10');
        agent.setThreshold(threshold);
        break;

      default:
        console.log('用法：/alibaba-inventory [start|alerts|logistics|stockin|threshold]');
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

module.exports = {
  run
};
