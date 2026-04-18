const DataStore = require('../../core/data-store');

/**
 * 数据分析模块 - 增强版
 * 负责 6 大核心指标采集和分析（出口通版本）
 *
 * 6 大核心指标：
 * 1. CPC (点击成本) - 警戒线：> 3 元
 * 2. AC (商机成本) - 警戒线：> 50 元
 * 3. 商机转化率 - 警戒线：< 1.5%
 * 4. CTR (点击率) - 警戒线：< 2%
 * 5. L1+ 点击量 - 警戒线：日点击 < 10 个
 * 6. L1+ 买家占比 - 警戒线：< 20%
 */
class Analytics {
  constructor() {
    this.store = new DataStore();
    // 出口通店铺 6 大核心指标警戒线
    this.thresholds = {
      cpc: { max: 3, unit: '元' },           // 点击成本上限
      acquisitionCost: { max: 50, unit: '元' }, // 商机成本上限
      conversionRate: { min: 1.5, unit: '%' },  // 转化率下限
      ctr: { min: 2, unit: '%' },              // 点击率下限
      l1Clicks: { min: 10, unit: '个' },        // L1+ 点击量下限
      l1BuyerRatio: { min: 20, unit: '%' }      // L1+ 买家占比下限
    };
  }

  /**
   * 采集推广数据（增强版 - 包含 L1+ 数据）
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
          inquiries: '[data-testid="inquiries"], .inquiry-count, [class*="inquiry"]',
          l1Clicks: '[data-testid="l1-clicks"], .l1-click-count, [class*="l1-click"]',
          l1BuyerRatio: '[data-testid="l1-buyer-ratio"], .l1-buyer-ratio-count, [class*="l1-buyer"]'
        };

        const parseNumber = (text) => {
          if (!text) return 0;
          return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
        };

        const getData = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : '0';
        };

        const exposure = parseNumber(getData(selectors.exposure));
        const clicks = parseNumber(getData(selectors.clicks));
        const cost = parseNumber(getData(selectors.cost));
        const inquiries = parseNumber(getData(selectors.inquiries));
        const l1Clicks = parseNumber(getData(selectors.l1Clicks));
        const l1BuyerRatio = parseNumber(getData(selectors.l1BuyerRatio));

        // 计算衍生指标
        const cpc = clicks > 0 ? cost / clicks : 0;
        const ctr = exposure > 0 ? (clicks / exposure) * 100 : 0;
        const inquiryRate = clicks > 0 ? (inquiries / clicks) * 100 : 0;
        const acquisitionCost = inquiries > 0 ? cost / inquiries : 0;

        return {
          exposure,
          clicks,
          cost,
          inquiries,
          l1Clicks,
          l1BuyerRatio,
          cpc,
          ctr,
          inquiryRate,
          acquisitionCost,
          collectedAt: new Date().toISOString()
        };
      });

      return data;
    } catch (error) {
      console.error('采集推广数据失败:', error.message);
      return null;
    }
  }

  /**
   * 记录日常数据（包含 L1+ 数据）
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
      acquisitionCost: data.acquisitionCost,
      l1Clicks: data.l1Clicks,
      l1BuyerRatio: data.l1BuyerRatio
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
      cpc: {
        value: (data.cpc || 0).toFixed(2),
        unit: '元',
        label: '点击成本',
        target: `≤${this.thresholds.cpc.max}`,
        status: (data.cpc || 0) <= this.thresholds.cpc.max ? 'good' : 'warning'
      },
      acquisitionCost: {
        value: (data.acquisitionCost || 0).toFixed(2),
        unit: '元',
        label: '商机成本',
        target: `≤${this.thresholds.acquisitionCost.max}`,
        status: (data.acquisitionCost || 0) <= this.thresholds.acquisitionCost.max ? 'good' : 'warning'
      },
      conversionRate: {
        value: (data.inquiryRate || 0).toFixed(2) + '%',
        unit: '',
        label: '商机转化率',
        target: `≥${this.thresholds.conversionRate.min}%`,
        status: (data.inquiryRate || 0) >= this.thresholds.conversionRate.min ? 'good' : 'warning'
      },
      ctr: {
        value: (data.ctr || 0).toFixed(2) + '%',
        unit: '',
        label: '点击率',
        target: `≥${this.thresholds.ctr.min}%`,
        status: (data.ctr || 0) >= this.thresholds.ctr.min ? 'good' : 'warning'
      },
      l1Clicks: {
        value: data.l1Clicks || 0,
        unit: '个',
        label: 'L1+ 点击量',
        target: `≥${this.thresholds.l1Clicks.min}`,
        status: (data.l1Clicks || 0) >= this.thresholds.l1Clicks.min ? 'good' : 'warning'
      },
      l1BuyerRatio: {
        value: (data.l1BuyerRatio || 0).toFixed(2) + '%',
        unit: '',
        label: 'L1+ 买家占比',
        target: `≥${this.thresholds.l1BuyerRatio.min}%`,
        status: (data.l1BuyerRatio || 0) >= this.thresholds.l1BuyerRatio.min ? 'good' : 'warning'
      }
    };
  }

  /**
   * 获取空指标模板
   */
  getEmptyMetrics() {
    return {
      date: new Date().toISOString().split('T')[0],
      cpc: { value: '0.00', unit: '元', label: '点击成本', target: `≤${this.thresholds.cpc.max}`, status: 'empty' },
      acquisitionCost: { value: '0.00', unit: '元', label: '商机成本', target: `≤${this.thresholds.acquisitionCost.max}`, status: 'empty' },
      conversionRate: { value: '0.00%', unit: '', label: '商机转化率', target: `≥${this.thresholds.conversionRate.min}%`, status: 'empty' },
      ctr: { value: '0.00%', unit: '', label: '点击率', target: `≥${this.thresholds.ctr.min}%`, status: 'empty' },
      l1Clicks: { value: 0, unit: '个', label: 'L1+ 点击量', target: `≥${this.thresholds.l1Clicks.min}`, status: 'empty' },
      l1BuyerRatio: { value: '0.00%', unit: '', label: 'L1+ 买家占比', target: `≥${this.thresholds.l1BuyerRatio.min}%`, status: 'empty' }
    };
  }

  /**
   * 生成异常预警（基于 6 大核心指标）
   * @param {Object} metrics
   * @returns {Array}
   */
  generateAlerts(metrics) {
    const alerts = [];

    // CPC 过高预警
    const cpcValue = parseFloat(metrics.cpc.value);
    if (cpcValue > this.thresholds.cpc.max && metrics.cpc.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: 'CPC',
        level: cpcValue > 5 ? 'high' : 'medium',
        message: `点击成本 ${cpcValue}元 超过警戒线（${this.thresholds.cpc.max}元）`,
        suggestion: '建议降低高价词出价，优化关键词质量分'
      });
    }

    // 商机成本过高预警
    const acValue = parseFloat(metrics.acquisitionCost.value);
    if (acValue > this.thresholds.acquisitionCost.max && metrics.acquisitionCost.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: '商机成本',
        level: acValue > 80 ? 'high' : 'medium',
        message: `商机成本 ${acValue}元 超过警戒线（${this.thresholds.acquisitionCost.max}元）`,
        suggestion: '建议暂停低转化产品，删除垃圾关键词'
      });
    }

    // 转化率过低预警
    const conversionValue = parseFloat(metrics.conversionRate.value);
    if (conversionValue < this.thresholds.conversionRate.min && metrics.conversionRate.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: '商机转化率',
        level: conversionValue < 1 ? 'high' : 'medium',
        message: `商机转化率 ${conversionValue}% 低于目标值（${this.thresholds.conversionRate.min}%）`,
        suggestion: '建议优化详情页，强化卖点描述和询盘引导'
      });
    }

    // CTR 过低预警
    const ctrValue = parseFloat(metrics.ctr.value);
    if (ctrValue < this.thresholds.ctr.min && metrics.ctr.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: 'CTR',
        level: ctrValue < 1 ? 'high' : 'medium',
        message: `点击率 ${ctrValue}% 低于目标值（${this.thresholds.ctr.min}%）`,
        suggestion: '建议优化主图，提升产品吸引力和信息密度'
      });
    }

    // L1+ 点击量过低预警
    const l1ClicksValue = metrics.l1Clicks;
    if (l1ClicksValue < this.thresholds.l1Clicks.min && metrics.l1Clicks.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: 'L1+ 点击量',
        level: l1ClicksValue < 5 ? 'high' : 'medium',
        message: `L1+ 点击量 ${l1ClicksValue}个 低于目标值（${this.thresholds.l1Clicks.min}个）`,
        suggestion: '建议加大 L1+ 人群溢价，争取更多高质量流量'
      });
    }

    // L1+ 买家占比过低预警
    const l1RatioValue = parseFloat(metrics.l1BuyerRatio.value);
    if (l1RatioValue < this.thresholds.l1BuyerRatio.min && metrics.l1BuyerRatio.status === 'warning') {
      alerts.push({
        type: 'warning',
        metric: 'L1+ 买家占比',
        level: l1RatioValue < 10 ? 'high' : 'medium',
        message: `L1+ 买家占比 ${l1RatioValue}% 低于目标值（${this.thresholds.l1BuyerRatio.min}%）`,
        suggestion: '建议关停低质量人群投放，回收预算到高价值人群'
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
      if (alert.metric === 'CPC') {
        suggestions.push({
          category: '关键词优化',
          priority: alert.level === 'high' ? 'high' : 'medium',
          action: '降低高价词出价，删除低质量分关键词'
        });
      }
      if (alert.metric === '商机成本') {
        suggestions.push({
          category: '产品优化',
          priority: 'high',
          action: '暂停点击高 0 转化的产品，优化产品选择'
        });
      }
      if (alert.metric === '商机转化率') {
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
      if (alert.metric === 'CTR') {
        suggestions.push({
          category: '主图优化',
          priority: 'medium',
          action: 'A/B 测试新主图，突出产品卖点和价格优势'
        });
      }
      if (alert.metric === 'L1+ 点击量') {
        suggestions.push({
          category: '人群溢价',
          priority: 'medium',
          action: '提高 L1+ 买家溢价比例至 15-20%'
        });
      }
      if (alert.metric === 'L1+ 买家占比') {
        suggestions.push({
          category: '人群定向',
          priority: 'high',
          action: '关停低质量国家/地区投放，聚焦目标市场'
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
    console.log('           出口通店铺 - 6 大核心指标');
    console.log('═══════════════════════════════════════════\n');

    for (const [key, metric] of Object.entries(metrics)) {
      if (key === 'date') continue;

      const icon = this.getMetricIcon(metric);
      console.log(`${icon} ${metric.label.padEnd(10)}: ${String(metric.value).padEnd(10)} ${metric.unit.padEnd(4)} (目标：${metric.target})`);
    }

    console.log('\n═══════════════════════════════════════════\n');
  }

  /**
   * 获取指标状态图标
   */
  getMetricIcon(metric) {
    const status = metric.status;
    if (status === 'good') return '🟢';
    if (status === 'warning') return '🔴';
    if (status === 'high') return '⚠️';
    return '⚪';
  }
}

module.exports = Analytics;
