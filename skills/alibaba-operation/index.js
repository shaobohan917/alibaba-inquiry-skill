/**
 * Alibaba Operation Skill
 * 运营 Agent 入口
 */

const OperationAgent = require('../agents/operation');

async function run(command) {
  const agent = new OperationAgent();

  try {
    switch (command) {
      case 'start':
      case '开始数据采集':
        await agent.start();
        break;

      case 'metrics':
      case '查看指标':
        agent.analytics.printMetricsReport();
        break;

      case 'analyze':
      case '分析关键词':
        await agent.start();
        await agent.analyzeKeywords();
        await agent.stop();
        break;

      default:
        console.log('用法：/alibaba-operation [start|metrics|analyze]');
        console.log('\n示例:');
        console.log('  /alibaba-operation 开始数据采集');
        console.log('  /alibaba-operation 查看指标');
        console.log('  /alibaba-operation 分析关键词');
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
