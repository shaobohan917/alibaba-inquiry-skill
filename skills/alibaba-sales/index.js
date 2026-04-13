/**
 * Alibaba Sales Skill
 * 业务员 Agent 入口
 */

const SalesAgent = require('../agents/sales');
const CustomerCRM = require('../agents/sales/customer-crm');

async function run(command, args) {
  const agent = new SalesAgent();

  try {
    switch (command) {
      case 'start':
      case '开始处理询盘':
        await agent.start();
        break;

      case 'followup':
      case '查看待跟进客户':
        await agent.showFollowUpCustomers();
        break;

      case 'repurchase':
      case '生成复购话术':
        const customerId = args?.[0];
        if (customerId) {
          await agent.generateRepurchaseScript(customerId);
        } else {
          console.log('用法：/alibaba-sales 生成复购话术 <customerId>');
        }
        break;

      default:
        console.log('用法：/alibaba-sales [start|followup|repurchase]');
        console.log('\n示例:');
        console.log('  /alibaba-sales 开始处理询盘');
        console.log('  /alibaba-sales 查看待跟进客户');
        console.log('  /alibaba-sales 生成复购话术 <customerId>');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    await agent.stop();
    process.exit(1);
  }
}

module.exports = {
  run
};
