/**
 * Alibaba Procurement Skill
 * 采购 Agent 入口
 * 支持出口通/金品诚企双版本
 */

const ProcurementAgent = require('../agents/procurement');

async function run(command, args, shopType = 'export') {
  const agent = new ProcurementAgent(shopType);

  try {
    switch (command) {
      case 'start':
      case '开始选品':
        await agent.start();
        break;

      case 'compare':
      case '比价':
        const productName = args?.[0] || '热销产品';
        await agent.comparePrices(productName);
        break;

      case 'screen':
      case '筛选新品':
        await agent.screenNewProducts({
          minSales: 100,
          maxPrice: 50
        });
        break;

      case 'suppliers':
      case '查看供应商':
        agent.showSupplierRatings();
        break;

      case 'metrics':
      case '查看指标':
        agent.printMetrics();
        break;

      default:
        console.log('用法：/alibaba-procurement [命令] [店铺类型]');
        console.log('\n命令列表:');
        console.log('  start/开始选品     启动采购 Agent，显示核心指标');
        console.log('  compare/比价       比价分析（需传入产品名称）');
        console.log('  screen/筛选新品    筛选新品');
        console.log('  suppliers/查看供应商 查看供应商评级');
        console.log('  metrics/查看指标   查看采购核心指标');
        console.log('\n店铺类型参数:');
        console.log('  export (出口通，默认)');
        console.log('  gold (金品诚企)');
        console.log('\n示例:');
        console.log('  /alibaba-procurement 开始选品');
        console.log('  /alibaba-procurement 比价 产品名');
        console.log('  /alibaba-procurement 查看指标 gold');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    if (agent.scraper) {
      await agent.scraper.close();
    }
    process.exit(1);
  }
}

module.exports = {
  run
};
