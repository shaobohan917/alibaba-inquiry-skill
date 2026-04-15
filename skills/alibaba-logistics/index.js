/**
 * Alibaba Logistics Skill
 * 物流报价员 Agent 入口
 * 支持出口通/金品诚企双版本
 */

const LogisticsAgent = require('../agents/logistics');

async function run(command, args, shopType = 'export') {
  const agent = new LogisticsAgent(shopType);

  try {
    switch (command) {
      case 'start':
      case '查看物流状态':
        await agent.start();
        break;

      case 'compare':
      case '货代比价':
        const orderInfo = args?.[0] ? JSON.parse(args[0]) : {};
        agent.compareFreight(orderInfo);
        break;

      case 'create-order':
      case '创建订单':
        const orderData = args?.[0] ? JSON.parse(args[0]) : {};
        agent.createOrder(orderData);
        break;

      case 'update-order':
      case '更新订单':
        const orderId = args?.[0];
        const status = args?.[1];
        const event = args?.[2] || '';
        if (orderId && status) {
          agent.updateOrder(orderId, status, event);
        } else {
          console.log('用法：/alibaba-logistics 更新订单 <orderId> <status> [event]');
        }
        break;

      case 'status':
      case '物流状态':
        agent.showLogisticsStatus();
        break;

      case 'forwarders':
      case '查看货代':
        agent.printForwarderStats();
        break;

      case 'pending':
      case '待处理订单':
        const pending = agent.getPendingOrders();
        console.log(`\n⏳ 待处理订单：${pending.length} 个`);
        pending.forEach(o => console.log(`   - ${o.orderId}: ${o.destination || '未知目的地'}`));
        break;

      case 'exception':
      case '异常订单':
        const exceptions = agent.getExceptionOrders();
        console.log(`\n⚠️  异常订单：${exceptions.length} 个`);
        exceptions.forEach(o => console.log(`   - ${o.orderId}: ${o.status}`));
        break;

      case 'log':
      case '工作日志':
        agent.generateWorkLog();
        break;

      case 'metrics':
      case '查看指标':
        agent.printMetrics();
        break;

      default:
        console.log('用法：/alibaba-logistics [命令] [店铺类型]');
        console.log('\n命令列表:');
        console.log('  start/查看物流状态   启动物流 Agent，显示核心指标和物流状态');
        console.log('  货代比价            货代比价（需传入订单信息 JSON）');
        console.log('  创建订单            创建物流订单');
        console.log('  更新订单            更新订单状态');
        console.log('  物流状态            查看物流状态总览');
        console.log('  查看货代            查看货代统计信息');
        console.log('  待处理订单          查看待处理订单');
        console.log('  异常订单            查看异常订单');
        console.log('  工作日志            生成今日工作日志');
        console.log('  查看指标            查看 5/6 大核心指标');
        console.log('\n店铺类型参数:');
        console.log('  export (出口通，默认)');
        console.log('  gold (金品诚企)');
        console.log('\n示例:');
        console.log('  /alibaba-logistics 查看物流状态');
        console.log('  /alibaba-logistics 货代比价 \'{"weight": 5, "destination": "US"}\'');
        console.log('  /alibaba-logistics 查看指标 gold');
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
