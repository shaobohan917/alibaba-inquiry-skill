/**
 * 阿里巴巴国际站询盘自动回复 Skill
 *
 * 用法：
 * /alibaba-inquiry 开始处理询盘
 * /alibaba-inquiry 读取聊天记录
 * /alibaba-inquiry 生成回复
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname);
const RUN_SCRIPT = path.join(__dirname, 'run.js');

module.exports = {
  name: 'alibaba-inquiry',
  description: '阿里巴巴国际站询盘自动回复 - 自动登录、读取询盘、AI 生成专业回复',

  async execute(args) {
    const command = args?.trim() || 'start';

    console.log('🚀 阿里巴巴询盘自动化工具\n');
    console.log(`📝 执行命令：${command}\n`);

    try {
      // 执行主脚本
      const result = execSync(`node "${RUN_SCRIPT}"`, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: { ...process.env }
      });

      return {
        success: true,
        message: '任务执行完成'
      };
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
