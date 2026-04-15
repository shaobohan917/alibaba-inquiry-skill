/**
 * Alibaba Design Skill
 * 美工 Agent 入口
 */

const DesignAgent = require('../agents/design');

async function run(command) {
  const agent = new DesignAgent();

  try {
    switch (command) {
      case 'start':
      case '开始生成图片':
        await agent.start();
        break;

      case 'optimize':
      case '优化低 CTR 产品':
        await agent.start();
        await agent.optimizeLowCTRProducts();
        await agent.stop();
        break;

      case 'templates':
      case '查看模板':
        agent.showTemplates();
        break;

      default:
        console.log('用法：/alibaba-design [start|optimize|templates]');
        console.log('\n示例:');
        console.log('  /alibaba-design 开始生成图片');
        console.log('  /alibaba-design 优化低 CTR 产品');
        console.log('  /alibaba-design 查看模板');
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
