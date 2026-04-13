/**
 * Alibaba Supervisor Skill
 * 总监管 Agent 入口
 */

const SupervisorAgent = require('../agents/supervisor');

async function run(command) {
  const agent = new SupervisorAgent();

  try {
    switch (command) {
      case 'start':
      case '开始今日任务':
        await agent.start();
        break;

      case 'dashboard':
      case '查看数据看板':
        agent.dashboard.printDashboard();
        break;

      case 'report':
      case '生成日报':
        agent.generateDailyReport();
        break;

      case 'tasks':
      case '查看任务列表':
        agent.printTaskList();
        break;

      default:
        console.log('用法：/alibaba-supervisor [start|dashboard|report|tasks]');
        console.log('\n示例:');
        console.log('  /alibaba-supervisor 开始今日任务');
        console.log('  /alibaba-supervisor 查看数据看板');
        console.log('  /alibaba-supervisor 生成日报');
        console.log('  /alibaba-supervisor 查看任务列表');
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
