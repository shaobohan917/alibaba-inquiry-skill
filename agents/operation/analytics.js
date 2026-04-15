const DataStore = require('../../core/data-store');

/**
 * 数据分析模块
 * 负责 6 大核心指标采集和分析
 */
class Analytics {
  constructor() {
    this.store = new DataStore();
  }

  /**
   * 采集推广数据
   * @param {Object} page - Playwright Page
   * @returns {Object}
   */
  async collectAdData(page) {
    try {
      // 从阿里巴巴推广后台采集数据
      const data = await page.evaluate(() => {
        // 实际选择器需要根据阿里国际站后台调整
        const selectors = {
          exposure: '[data-testid="exposure"], .exposure-count, [class*="exposure"]',
          clicks: '[data-testid="clicks"], .click-count, [class*="click"]',
          cost: '[data-testid="cost"], .cost-count, [class*="cost"]',
          inquiries: '[data-testid="inquiries"], .inquiry-count, [class*="inquiry"]'
        };

        const parseNumber = (text) => {
          if (!text) return 0;
          return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
        };

        const getData = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : '0';
        };

        return {
          exposure: parseNumber(getData(selectors.exposure)),
          clicks: parseNumber(getData(selectors.clicks)),
          cost: parseNumber(getData(selectors.cost)),
          inquiries: parseNumber(getData(selectors.inquiries))
        };
      });

      // 计算衍生指标
      const cpc = data.clicks > 0 ? data.cost / data.clicks : 0;
      const ctr = data.exposure > 0 ? (data.clicks / data.exposure) * 100 : 0;
      const inquiryRate = data.clicks > 0 ? (data.inquiries / data.clicks) * 100 : 0;
      const inquiryCost = data.inquiries > 0 ? data.cost / data.inquiries : 0;

      return {
        ...data,
        cpc,
        ctr,
        inquiryRate,
        inquiryCost,
        collectedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('采集推广数据失败:', error.message);
      return null;
    }
  }

  /**
   * 记录日常数据
   * @param {Object} data
   */
  recordDailyData(data) {
    const today = new Date().toISOString().split('T')[0];

    return this.store.recordDailyData({
      date: today,
      type: 'advertising',
      exposure: data.exposure,
      clicks: data.clicks,
      cost: data.cost,
      inquiries: data.inquiries,
      cpc: data.cpc,
      ctr: data.ctr,
      inquiryRate: data.inquiryRate,
      inquiryCost: data.inquiryCost
    });
  }

  /**
   * 获取 6 大核心指标
   * @param {string} date - 日期 YYYY-MM-DD，默认今天
   * @returns {Object}
   */
  getCoreMetrics(date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const data = this.store.getDailyData(targetDate);

    if (!data) {
      return this.getEmptyMetrics();
    }

    return {
      date: targetDate,
      exposure: { value: data.exposure || 0, unit: '次', label: '曝光量', target: '≥1000' },
      clicks: { value: data.clicks || 0, unit: '次', label: '点击量', target: '≥50' },
      cpc: { value: (data.cpc || 0).toFixed(2), unit: '元', label: '单次点击成本', target: '≤2' },
      ctr: { value: (data.ctr || 0).toFixed(2) + '%', unit: '', label: '点击率', target: '≥1%' },
      inquiryRate: { value: (data.inquiryRate || 0).toFixed(2) + '%', unit: '', label: '询盘转化率', target: '≥5%' },
      inquiryCost: { value: (data.inquiryCost || 0).toFixed(2), unit: '元', label: '询盘成本', target: '≤30' }
    };
  }

  /**
   * 获取空指标模板
   */
  getEmptyMetrics() {
    return {
      date: new Date().toISOString().split('T')[0],
      exposure: { value: 0, unit: '次', label: '曝光量', target: '≥1000' },
      clicks: { value: 0, unit: '次', label: '点击量', target: '≥50' },
      cpc: { value: '0.00', unit: '元', label: '单次点击成本', target: '≤2' },
      ctr: { value: '0.00%', unit: '', label: '点击率', target: '≥1%' },
      inquiryRate: { value: '0.00%', unit: '', label: '询盘转化率', target: '≥5%' },
      inquiryCost: { value: '0.00', unit: '元', label: '询盘成本', target: '≤30' }
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
    if (ctrValue < 1 && metrics.exposure.value > 0) {
      alerts.push({
        type: 'warning',
        metric: 'CTR',
        level: ctrValue < 0.5 ? 'high' : 'medium',
        message: `点击率 ${ctrValue}% 低于目标值（1%）`,
        suggestion: '建议优化主图和标题，提升吸引力'
      });
    }

    // CPC 过高预警（高于 2 元）
    const cpcValue = parseFloat(metrics.cpc.value);
    if (cpcValue > 2 && metrics.clicks.value > 0) {
      alerts.push({
        type: 'warning',
        metric: 'CPC',
        level: cpcValue > 3 ? 'high' : 'medium',
        message: `单次点击成本 ${cpcValue}元 高于目标值（2 元）`,
        suggestion: '建议优化关键词质量分，调整出价策略'
      });
    }

    // 询盘转化率过低预警（低于 5%）
    const inquiryRateValue = parseFloat(metrics.inquiryRate.value);
    if (inquiryRateValue < 5 && metrics.clicks.value > 10) {
      alerts.push({
        type: 'warning',
        metric: '询盘转化率',
        level: inquiryRateValue < 2 ? 'high' : 'medium',
        message: `询盘转化率 ${inquiryRateValue}% 低于目标值（5%）`,
        suggestion: '建议优化详情页和询盘引导，提升转化'
      });
    }

    // 曝光量过低预警
    if (metrics.exposure.value < 1000 && metrics.exposure.value > 0) {
      alerts.push({
        type: 'info',
        metric: '曝光量',
        level: 'low',
        message: `曝光量 ${metrics.exposure.value} 低于目标值（1000）`,
        suggestion: '建议增加推广预算或优化关键词覆盖'
      });
    }

    return alerts;
  }

  /**
   * 生成优化建议
   * @param {Object} metrics
   * @param {Array} alerts
   * @returns {Array}
   */
  generateOptimizationSuggestions(metrics, alerts) {
    const suggestions = [];

    // 根据警报生成建议
    for (const alert of alerts) {
      if (alert.metric === 'CTR') {
        suggestions.push({
          category: '主图优化',
          priority: alert.level === 'high' ? 'high' : 'medium',
          action: 'A/B 测试新主图，突出产品卖点和价格优势'
        });
      }

      if (alert.metric === 'CPC') {
        suggestions.push({
          category: '关键词优化',
          priority: 'medium',
          action: '删除低质量分关键词，增加长尾词投放'
        });
      }

      if (alert.metric === '询盘转化率') {
        suggestions.push({
          category: '详情页优化',
          priority: 'high',
          action: '强化产品优势展示，增加信任背书（证书/评价）'
        });
        suggestions.push({
          category: '询盘引导',
          priority: 'medium',
          action: '在详情页添加明显的询盘按钮和优惠信息'
        });
      }
    }

    // 去重
    const unique = [];
    const seen = new Set();
    for (const s of suggestions) {
      if (!seen.has(s.category)) {
        seen.add(s.category);
        unique.push(s);
      }
    }

    return unique;
  }

  /**
   * 打印指标报告
   */
  printMetricsReport(metrics = null) {
    if (!metrics) {
      metrics = this.getCoreMetrics();
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('              6 大核心指标');
    console.log('═══════════════════════════════════════════\n');

    for (const [key, metric] of Object.entries(metrics)) {
      if (key === 'date') continue;

      const icon = this.getMetricIcon(metric);
      console.log(`   ${icon} ${metric.label.padEnd(10)}: ${String(metric.value).padEnd(10)} ${metric.unit.padEnd(4)} (目标：${metric.target})`);
    }

    console.log('\n═══════════════════════════════════════════\n');
  }

  /**
   * 获取指标状态图标
   */
  getMetricIcon(metric) {
    const value = parseFloat(metric.value);
    const target = metric.target.replace(/[≥≤]/g, '');

    if (metric.label === '曝光量' || metric.label === '点击量') {
      return value >= parseFloat(target) ? '🟢' : '🔴';
    }

    if (metric.label.includes('成本')) {
      return value <= parseFloat(target) ? '🟢' : '🔴';
    }

    if (metric.label.includes('率')) {
      return value >= parseFloat(target) ? '🟢' : '🔴';
    }

    return '⚪';
  }
}

module.exports = Analytics;
