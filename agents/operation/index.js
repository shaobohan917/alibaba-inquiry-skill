const BrowserManager = require('../../core/browser-manager');
const Analytics = require('./analytics');
const AdOptimizer = require('./ad-optimizer');
const { getEnv } = require('../../src/config');

const ALIBABA_AD_URL = getEnv(
  'ALIBABA_AD_URL',
  'https://i.alibaba.com/ads/p4p/campaign-manage.htm'
);
const OPERATION_CDP_PORT = parseInt(getEnv('OPERATION_CDP_PORT', '9223'), 10);

/**
 * 运营 Agent - 增强版
 * 负责数据采集、6 大指标监控、推广优化
 *
 * 6 大核心指标（出口通）：
 * 1. CPC (点击成本) - 警戒线：> 3 元
 * 2. AC (商机成本) - 警戒线：> 50 元
 * 3. 商机转化率 - 警戒线：< 1.5%
 * 4. CTR (点击率) - 警戒线：< 2%
 * 5. L1+ 点击量 - 警戒线：日点击 < 10 个
 * 6. L1+ 买家占比 - 警戒线：< 20%
 *
 * 每日工作流程：
 * - 8:00 早检：预算消耗、6 大指标、清理垃圾
 * - 13:00 午检：预算检查
 * - 20:00 晚检：分时折扣、工作日志
 */
class OperationAgent {
  constructor() {
    this.browser = null;
    this.analytics = new Analytics();
    this.adOptimizer = new AdOptimizer();
    this.workLog = []; // 工作日志
  }

  /**
   * 启动运营 Agent
   */
  async start() {
    console.log('🚀 运营 Agent 启动中...\n');

    // 启动浏览器，使用 operation 独立的浏览器配置和 CDP 端口
    this.browser = new BrowserManager({ role: 'operation', cdpPort: OPERATION_CDP_PORT });
    const page = await this.browser.launch('operation', 'default');

    // 导航到推广后台
    console.log('📍 正在打开阿里巴巴推广后台...');
    await this.browser.navigateTo(ALIBABA_AD_URL);

    // 等待页面加载
    await this.delay(3000, 5000);

    // 获取当前时段，执行对应检查
    const currentHour = new Date().getHours();
    const checkType = this.getCheckType(currentHour);

    console.log(`📍 当前时段：${checkType}检查\n`);

    // 数据采集
    await this.collectData(page);

    // 生成报告
    await this.generateReport();

    // 执行时段特定任务
    if (checkType === '早检') {
      await this.morningCheck(page);
    } else if (checkType === '午检') {
      await this.noonCheck(page);
    } else if (checkType === '晚检') {
      await this.eveningCheck(page);
    }

    // 写入工作日志
    this.writeWorkLog();

    console.log('\n✅ 运营 Agent 任务完成\n');
    await this.stop();
    process.exit(0);
  }

  /**
   * 获取当前时段的检查类型
   */
  getCheckType(hour) {
    if (hour < 12) return '早检';
    if (hour < 17) return '午检';
    return '晚检';
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
      console.log(`   L1+ 点击： ${data.l1Clicks}`);
      console.log(`   L1+ 占比： ${data.l1BuyerRatio.toFixed(2)}%`);
      console.log(`   CPC:      ${data.cpc.toFixed(2)} 元`);
      console.log(`   CTR:      ${data.ctr.toFixed(2)}%`);
      console.log(`   转化率：  ${data.inquiryRate.toFixed(2)}%`);
      console.log(`   商机成本：${data.acquisitionCost.toFixed(2)} 元\n`);

      // 记录到数据存储
      this.analytics.recordDailyData(data);
      console.log('✓ 数据已保存\n');

      // 记录到工作日志
      this.workLog.push({
        type: 'data_collection',
        time: new Date().toISOString(),
        data
      });
    } else {
      console.log('⚠️  数据采集失败，可能是选择器不匹配\n');
    }
  }

  /**
   * 早检任务（8:00）
   * - 检查预算消耗（早间花超 30% 没点击就加价）
   * - 检查 6 大指标，触发警戒线立即优化
   * - 清理垃圾：点击≥10 没转化的品暂停，点击≥5 没询盘的词否定
   */
  async morningCheck(page) {
    console.log('═══════════════════════════════════════════');
    console.log('           🌅 早检任务 (8:00)');
    console.log('═══════════════════════════════════════════\n');

    // 1. 检查预算消耗
    await this.checkBudgetConsumption(page);

    // 2. 检查 6 大指标
    await this.checkCoreMetrics();

    // 3. 清理垃圾
    await this.cleanUpGarbage(page);

    console.log('✅ 早检任务完成\n');
  }

  /**
   * 午检任务（13:00）
   * - 检查预算，快花完但没询盘就直接停
   */
  async noonCheck(page) {
    console.log('═══════════════════════════════════════════');
    console.log('           ☀️ 午检任务 (13:00)');
    console.log('═══════════════════════════════════════════\n');

    await this.checkBudgetConsumption(page);

    console.log('✅ 午检任务完成\n');
  }

  /**
   * 晚检任务（20:00）
   * - 调整分时折扣：凌晨时段降价 50%，欧美时段加价 10%
   * - 写工作日志
   */
  async eveningCheck(page) {
    console.log('═══════════════════════════════════════════');
    console.log('           🌙 晚检任务 (20:00)');
    console.log('═══════════════════════════════════════════\n');

    // 1. 调整分时折扣
    await this.adjustTimeDiscount(page);

    // 2. 写工作日志
    console.log('📝 正在写入工作日志...\n');

    console.log('✅ 晚检任务完成\n');
  }

  /**
   * 检查预算消耗
   */
  async checkBudgetConsumption(page) {
    console.log('📊 检查预算消耗...\n');

    const plans = await this.adOptimizer.getAdPlans(page);
    const budgetCheck = this.adOptimizer.checkBudgetAllocation(plans);

    if (budgetCheck.status === 'normal') {
      console.log('✅ 预算使用正常\n');
    } else if (budgetCheck.status === 'warning') {
      console.log('⚠️  预算警告:');
      for (const v of budgetCheck.violations) {
        console.log(`   - ${v.message}`);
      }
      console.log();
    } else if (budgetCheck.status === 'critical') {
      console.log('🔴 严重违规:');
      for (const v of budgetCheck.violations) {
        console.log(`   - ${v.message}`);
      }
      console.log();
    }

    // 早间特殊检查：花超 30% 没点击就加价
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      const totalSpent = plans.reduce((sum, plan) => sum + (plan.spent || 0), 0);
      const totalBudget = this.adOptimizer.dailyBudget;
      const consumedRate = totalSpent / totalBudget;

      if (consumedRate > 0.3) {
        const totalClicks = plans.reduce((sum, plan) => sum + (plan.clicks || 0), 0);
        if (totalClicks === 0) {
          console.log('⚠️  早间预算已花超 30% 但 0 点击，建议加价抢流量\n');
          this.workLog.push({
            type: 'budget_alert',
            time: new Date().toISOString(),
            message: `早间预算已花${(consumedRate * 100).toFixed(0)}% 但 0 点击`
          });
        }
      }
    }
  }

  /**
   * 检查 6 大核心指标
   */
  async checkCoreMetrics() {
    console.log('📊 检查 6 大核心指标...\n');

    const metrics = this.analytics.getCoreMetrics();
    this.analytics.printMetricsReport(metrics);

    const alerts = this.analytics.generateAlerts(metrics);

    if (alerts.length > 0) {
      console.log('⚠️  异常预警:\n');
      for (const alert of alerts) {
        console.log(`   [${alert.level.toUpperCase()}] ${alert.metric}: ${alert.message}`);
        console.log(`         建议：${alert.suggestion}\n`);

        this.workLog.push({
          type: 'alert',
          time: new Date().toISOString(),
          metric: alert.metric,
          message: alert.message,
          suggestion: alert.suggestion
        });
      }
    } else {
      console.log('✅ 所有指标正常\n');
    }
  }

  /**
   * 清理垃圾（点击≥10 没转化的品暂停，点击≥5 没询盘的词否定）
   */
  async cleanUpGarbage(page) {
    console.log('🧹 执行清理垃圾操作...\n');

    // 获取关键词建议
    const keywordSuggestions = await this.adOptimizer.getKeywordSuggestions(page);
    const highPrioritySuggestions = keywordSuggestions.filter(s => s.level === 'high');

    if (highPrioritySuggestions.length > 0) {
      console.log(`📋 发现 ${highPrioritySuggestions.length} 个需要处理的高优先级项目:\n`);

      for (const suggestion of highPrioritySuggestions) {
        console.log(`   - [${suggestion.type}] "${suggestion.keyword}"`);
        console.log(`     原因：${suggestion.reason}`);
        console.log(`     操作：${suggestion.suggestion}\n`);

        this.workLog.push({
          type: 'cleanup',
          time: new Date().toISOString(),
          target: suggestion.keyword,
          action: suggestion.action,
          reason: suggestion.reason
        });

        // 添加到黑名单
        if (suggestion.type === 'blacklist' || suggestion.type === 'high_cost_no_inquiry') {
          this.adOptimizer.addToBlacklist('keyword', suggestion.keyword, suggestion.reason);
        }
      }
    } else {
      console.log('✅ 无需清理的垃圾项目\n');
    }
  }

  /**
   * 调整分时折扣
   */
  async adjustTimeDiscount(page) {
    console.log('🕐 调整分时折扣...\n');

    // 凌晨时段降价 50%，欧美时段加价 10%
    console.log('📍 建议调整:');
    console.log('   - 凌晨时段 (0:00-6:00): 降价 50%');
    console.log('   - 欧美时段 (14:00-22:00): 加价 10%');
    console.log('   (实际调整需在后台手动操作)\n');

    this.workLog.push({
      type: 'time_discount',
      time: new Date().toISOString(),
      adjustments: [
        { period: '凌晨时段', action: '降价 50%' },
        { period: '欧美时段', action: '加价 10%' }
      ]
    });
  }

  /**
   * 生成运营报告
   */
  async generateReport() {
    console.log('📝 正在生成运营报告...\n');

    // 获取 6 大核心指标
    const metrics = this.analytics.getCoreMetrics();

    // 获取推广计划
    if (this.browser?.page) {
      const adPlans = await this.adOptimizer.getAdPlans(this.browser.page);

      if (adPlans.length > 0) {
        // 生成优化报告
        const report = this.adOptimizer.generateOptimizationReport(metrics, adPlans);
        this.adOptimizer.printOptimizationReport(report);

        this.workLog.push({
          type: 'optimization_report',
          time: new Date().toISOString(),
          report: {
            metrics,
            planCount: adPlans.length,
            alertCount: report.alerts.length,
            suggestionCount: report.suggestions.length
          }
        });
      }
    }

    // 生成优化建议
    const suggestions = this.analytics.generateOptimizationSuggestions(
      metrics,
      this.analytics.generateAlerts(metrics)
    );

    if (suggestions.length > 0) {
      console.log('💡 优化建议:\n');
      for (const suggestion of suggestions) {
        console.log(`   [${suggestion.priority.toUpperCase()}] ${suggestion.category}: ${suggestion.action}`);
      }
      console.log();
    }
  }

  /**
   * 写入工作日志
   */
  writeWorkLog() {
    const today = new Date().toISOString().split('T')[0];
    const logSummary = {
      date: today,
      entries: this.workLog
    };

    console.log('📝 工作日志摘要:');
    console.log(JSON.stringify(logSummary, null, 2));

    // 实际应该写入文件或数据库
    // 这里只是打印，后续可以集成到 DataStore 或 MemorySystem
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

      case 'worker':
        // Worker 模式：进程常驻，等待任务输入
        console.log('🔧 运营 Agent Worker 模式启动...');
        console.log('📋 工作模式：进程常驻，每个任务独立浏览器窗口');
        console.log('⏳ 等待任务输入...\n');

        // 保持进程运行，监听退出信号
        process.on('SIGTERM', async () => {
          console.log('\n🛑 收到退出信号，正在关闭...');
          await agent.stop();
          process.exit(0);
        });

        // 监听标准输入以保持事件循环活跃
        process.stdin.on('data', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log(`📋 收到消息：${JSON.stringify(message)}`);
            // 实际任务处理逻辑
          } catch (e) {
            console.log(`收到输入：${data.toString()}`);
          }
        });

        // 保持进程运行
        await new Promise(() => {});
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
        console.log('用法：node agents/operation/index.js [start|worker|metrics|analyze]');
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
