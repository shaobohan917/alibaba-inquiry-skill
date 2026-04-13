const TaskQueue = require('../../core/task-queue');
const DataStore = require('../../core/data-store');

/**
 * 数据汇总看板
 * 负责 6 大核心指标监控和报表生成
 */
class Dashboard {
  constructor() {
    this.store = new DataStore();
  }

  /**
   * 获取今日数据概览
   * @returns {Object}
   */
  getTodayOverview() {
    const today = new Date().toISOString().split('T')[0];
    const data = this.store.getDailyData(today);

    return {
      date: today,
      exposure: data?.exposure || 0,
      clicks: data?.clicks || 0,
      inquiries: data?.inquiries || 0,
      cpc: data?.cpc || 0,
      ctr: data?.ctr || 0,
      inquiryRate: data?.inquiryRate || 0
    };
  }

  /**
   * 获取 6 大核心指标
   * @returns {Object}
   */
  getCoreMetrics() {
    const today = this.getTodayOverview();

    // 计算 CPC（单次点击成本）
    const dailyBudget = 150; // 日预算 150 元
    const cpc = today.clicks > 0 ? dailyBudget / today.clicks : 0;

    // 计算 CTR（点击率）
    const ctr = today.exposure > 0 ? (today.clicks / today.exposure) * 100 : 0;

    // 计算询盘转化率
    const inquiryRate = today.clicks > 0 ? (today.inquiries / today.clicks) * 100 : 0;

    // 计算询盘成本
    const inquiryCost = today.inquiries > 0 ? dailyBudget / today.inquiries : 0;

    return {
      exposure: { value: today.exposure, unit: '次', label: '曝光量' },
      clicks: { value: today.clicks, unit: '次', label: '点击量' },
      cpc: { value: cpc.toFixed(2), unit: '元', label: '单次点击成本' },
      ctr: { value: ctr.toFixed(2) + '%', unit: '', label: '点击率' },
      inquiryRate: { value: inquiryRate.toFixed(2) + '%', unit: '', label: '询盘转化率' },
      inquiryCost: { value: inquiryCost.toFixed(2), unit: '元', label: '询盘成本' }
    };
  }

  /**
   * 生成日报
   * @returns {Object}
   */
  generateDailyReport() {
    const metrics = this.getCoreMetrics();
    const today = new Date().toISOString().split('T')[0];

    // 获取客户数据
    const newCustomers = this.store.list('customers', {}).filter(c => {
      if (!c.createdAt) return false;
      return c.createdAt.startsWith(today);
    }).length;

    const repliedInquiries = this.store.list('interactions', { type: 'inquiry' }).filter(i => {
      if (!i.recordedAt) return false;
      return i.recordedAt.startsWith(today);
    }).length;

    return {
      date: today,
      metrics,
      summary: {
        newCustomers,
        repliedInquiries,
        budgetUsed: 150, // 日预算 150 元
        budgetRemaining: 0 // 假设已用完
      },
      alerts: this.generateAlerts(metrics)
    };
  }

  /**
   * 生成异常预警
   * @param {Object} metrics
   * @returns {Array}
   */
  generateAlerts(metrics) {
    const alerts = [];

    // CTR 过低预警（低于 1%）
    const ctrValue = parseFloat(metrics.ctr.value);
    if (ctrValue < 1) {
      alerts.push({
        type: 'warning',
        metric: 'CTR',
        message: `点击率 ${ctrValue}% 低于正常水平（建议 >1%）`,
        suggestion: '建议优化主图和标题'
      });
    }

    // CPC 过高预警（高于 2 元）
    const cpcValue = parseFloat(metrics.cpc.value);
    if (cpcValue > 2) {
      alerts.push({
        type: 'warning',
        metric: 'CPC',
        message: `单次点击成本 ${cpcValue}元 高于平均水平`,
        suggestion: '建议优化关键词质量分'
      });
    }

    // 询盘转化率过低预警（低于 5%）
    const inquiryRateValue = parseFloat(metrics.inquiryRate.value);
    if (inquiryRateValue < 5 && metrics.clicks.value > 10) {
      alerts.push({
        type: 'warning',
        metric: '询盘转化率',
        message: `询盘转化率 ${inquiryRateValue}% 低于正常水平`,
        suggestion: '建议优化详情页和询盘引导'
      });
    }

    return alerts;
  }

  /**
   * 记录推广数据
   * @param {Object} data
   */
  recordAdData(data) {
    return this.store.recordDailyData({
      type: 'advertising',
      exposure: data.exposure,
      clicks: data.clicks,
      cost: data.cost,
      inquiries: data.inquiries,
      cpc: data.cost / data.clicks,
      ctr: (data.clicks / data.exposure) * 100,
      inquiryRate: (data.inquiries / data.clicks) * 100
    });
  }

  /**
   * 打印看板
   */
  printDashboard() {
    console.log('\n═══════════════════════════════════════════');
    console.log('         阿里国际站运营数据看板');
    console.log('═══════════════════════════════════════════\n');

    const metrics = this.getCoreMetrics();

    console.log('📊 6 大核心指标:\n');
    console.log(`   曝光量：        ${metrics.exposure.value.toLocaleString()} ${metrics.exposure.unit}`);
    console.log(`   点击量：        ${metrics.clicks.value.toLocaleString()} ${metrics.clicks.unit}`);
    console.log(`   单次点击成本：  ${metrics.cpc.value} ${metrics.cpc.unit}`);
    console.log(`   点击率：        ${metrics.ctr.value}`);
    console.log(`   询盘转化率：    ${metrics.inquiryRate.value}`);
    console.log(`   询盘成本：      ${metrics.inquiryCost.value} ${metrics.inquiryCost.unit}`);

    console.log('\n───────────────────────────────────────────\n');

    const report = this.generateDailyReport();

    console.log('📋 今日总结:\n');
    console.log(`   新增客户：      ${report.summary.newCustomers} 个`);
    console.log(`   已回复询盘：    ${report.summary.repliedInquiries} 个`);
    console.log(`   日预算：        ${report.summary.budgetUsed} 元`);

    if (report.alerts.length > 0) {
      console.log('\n───────────────────────────────────────────\n');
      console.log('⚠️  异常预警:\n');

      for (const alert of report.alerts) {
        console.log(`   [${alert.type.toUpperCase()}] ${alert.metric}: ${alert.message}`);
        console.log(`            建议：${alert.suggestion}`);
      }
    }

    console.log('\n═══════════════════════════════════════════\n');
  }
}

module.exports = Dashboard;
