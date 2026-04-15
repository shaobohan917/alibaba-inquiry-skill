const BrowserManager = require('../../core/browser-manager');
const Analytics = require('./analytics');
const AdOptimizer = require('./ad-optimizer');
const { getEnv } = require('../../src/config');

const ALIBABA_AD_URL = getEnv(
  'ALIBABA_AD_URL',
  'https://p4p.alibaba.com/offer/offer_list.htm'
);

/**
 * 运营 Agent
 * 负责数据采集、6 大指标监控、推广优化
 */
class OperationAgent {
  constructor() {
    this.browser = null;
    this.analytics = new Analytics();
    this.adOptimizer = new AdOptimizer();
  }

  /**
   * 启动运营 Agent
   */
  async start() {
    console.log('🚀 运营 Agent 启动中...\n');

    // 启动浏览器
    this.browser = new BrowserManager();
    const page = await this.browser.launch('operation', 'default');

    // 导航到推广后台
    console.log('📍 正在打开阿里巴巴推广后台...');
    await this.browser.navigateTo(ALIBABA_AD_URL);

    // 等待页面加载
    await this.delay(3000, 5000);

    // 采集数据
    await this.collectData(page);

    // 生成报告
    await this.generateReport();

    console.log('\n✅ 运营 Agent 任务完成\n');
    await this.stop();
    process.exit(0);
  }

  /**
   * 采集推广数据
   * @param {Page} page
   */
  async collectData(page) {
    console.log('📊 正在采集推广数据...\n');

    const data = await this.analytics.collectAdData(page);

    if (data) {
      console.log('✓ 数据采集成功:');
      console.log(`   曝光量：  ${data.exposure}`);
      console.log(`   点击量：  ${data.clicks}`);
      console.log(`   花费：    ${data.cost.toFixed(2)} 元`);
      console.log(`   询盘数：  ${data.inquiries}`);
      console.log(`   CPC:      ${data.cpc.toFixed(2)} 元`);
      console.log(`   CTR:      ${data.ctr.toFixed(2)}%`);
      console.log(`   转化率：  ${data.inquiryRate.toFixed(2)}%`);
      console.log(`   询盘成本：${data.inquiryCost.toFixed(2)} 元`);

      // 记录到数据存储
      this.analytics.recordDailyData(data);
      console.log('\n✓ 数据已保存\n');
    } else {
      console.log('⚠️  数据采集失败，可能是选择器不匹配\n');
    }
  }

  /**
   * 生成运营报告
   */
  async generateReport() {
    console.log('📝 正在生成运营报告...\n');

    // 获取 6 大核心指标
    const metrics = this.analytics.getCoreMetrics();

    // 打印指标
    this.analytics.printMetricsReport(metrics);

    // 生成警报
    const alerts = this.analytics.generateAlerts(metrics);

    if (alerts.length > 0) {
      console.log('⚠️  异常预警:\n');
      for (const alert of alerts) {
        console.log(`   [${alert.level.toUpperCase()}] ${alert.metric}: ${alert.message}`);
        console.log(`         建议：${alert.suggestion}\n`);
      }
    } else {
      console.log('✅ 所有指标正常\n');
    }

    // 获取推广计划
    if (this.browser?.page) {
      const adPlans = await this.adOptimizer.getAdPlans(this.browser.page);

      if (adPlans.length > 0) {
        // 生成优化报告
        const report = this.adOptimizer.generateOptimizationReport(metrics, adPlans);
        this.adOptimizer.printOptimizationReport(report);
      }
    }

    // 生成优化建议
    const suggestions = this.analytics.generateOptimizationSuggestions(metrics, alerts);

    if (suggestions.length > 0) {
      console.log('💡 优化建议:\n');
      for (const suggestion of suggestions) {
        console.log(`   [${suggestion.priority.toUpperCase()}] ${suggestion.category}: ${suggestion.action}`);
      }
      console.log();
    }
  }

  /**
   * 获取关键词优化建议
   */
  async analyzeKeywords() {
    console.log('🔍 正在分析关键词...\n');

    if (!this.browser?.page) {
      console.log('⚠️  浏览器未启动\n');
      return;
    }

    const suggestions = await this.adOptimizer.getKeywordSuggestions(this.browser.page);

    if (suggestions.length > 0) {
      console.log('📋 关键词优化建议:\n');

      for (const suggestion of suggestions) {
        console.log(`   [${suggestion.type}] "${suggestion.keyword}"`);
        console.log(`         原因：${suggestion.reason}`);
        console.log(`         建议：${suggestion.suggestion}\n`);
      }
    } else {
      console.log('✅ 无需优化关键词\n');
    }
  }

  /**
   * 停止 Agent
   */
  async stop() {
    console.log('\n🛑 正在关闭运营 Agent...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * 延迟工具
   */
  delay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI 入口
async function main() {
  const agent = new OperationAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'metrics':
        agent.analytics.printMetricsReport();
        break;

      case 'analyze':
        await agent.start();
        await agent.analyzeKeywords();
        await agent.stop();
        break;

      default:
        console.log('用法：node agents/operation/index.js [start|metrics|analyze]');
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

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  await agent.stop();
  console.log('👋 运营 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = OperationAgent;
