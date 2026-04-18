const DataStore = require('../../core/data-store');

/**
 * 推广优化模块 - 增强版
 * 负责广告计划管理、关键词优化、预算分配
 *
 * 预算铁律：
 * - 日预算：150 元 RMB
 * - 拆分：3 个独立子计划，每个 50 元
 * - 严禁：AI 智投，只做标准推广
 */
class AdOptimizer {
  constructor() {
    this.store = new DataStore();
    // 出口通预算配置
    this.dailyBudget = 150; // 日预算 150 元
    this.subPlansCount = 3; // 3 个子计划
    this.budgetPerPlan = 50; // 每个子计划 50 元
    // 黑名单（从错题本读取）
    this.blockedCountries = ['尼日利亚', '印度', '巴基斯坦'];
    this.blockedKeywords = ['free sample', 'cheap', 'free shipping'];
    this.blockedProducts = [];
  }

  /**
   * 获取推广计划状态
   * @param {Object} page - Playwright Page
   * @returns {Array}
   */
  async getAdPlans(page) {
    try {
      const plans = await page.evaluate(() => {
        // 从阿里巴巴推广后台获取计划列表
        const planElements = document.querySelectorAll('.ad-plan-item, [class*="plan-item"]');

        return Array.from(planElements).map(el => {
          return {
            name: el.querySelector('.plan-name')?.textContent?.trim() || '',
            type: el.querySelector('.plan-type')?.textContent?.trim() || '', // 普通品成长/爆品助推/新品加速
            status: el.querySelector('.plan-status')?.textContent?.trim() || '',
            budget: parseFloat(el.querySelector('.plan-budget')?.textContent?.trim() || '0'),
            spent: parseFloat(el.querySelector('.plan-spent')?.textContent?.trim() || '0'),
            exposure: parseInt(el.querySelector('.plan-exposure')?.textContent?.trim() || '0'),
            clicks: parseInt(el.querySelector('.plan-clicks')?.textContent?.trim() || '0'),
            cost: parseFloat(el.querySelector('.plan-cost')?.textContent?.trim() || '0'),
            ctr: parseFloat(el.querySelector('.plan-ctr')?.textContent?.trim() || '0'),
            productCount: parseInt(el.querySelector('.plan-product-count')?.textContent?.trim() || '0')
          };
        });
      });

      return plans;
    } catch (error) {
      console.error('获取推广计划失败:', error.message);
      return [];
    }
  }

  /**
   * 检查预算分配（预算铁律检查）
   * @param {Array} plans - 推广计划列表
   * @returns {Object}
   */
  checkBudgetAllocation(plans) {
    const result = {
      totalBudget: this.dailyBudget,
      subPlansCount: this.subPlansCount,
      budgetPerPlan: this.budgetPerPlan,
      status: 'normal',
      violations: [],
      suggestions: []
    };

    // 检查总预算
    const totalSpent = plans.reduce((sum, plan) => sum + (plan.spent || 0), 0);
    if (totalSpent > this.dailyBudget * 0.9) {
      result.violations.push({
        type: 'budget_warning',
        message: `预算已使用 ${((totalSpent / this.dailyBudget) * 100).toFixed(0)}%，接近上限 ${this.dailyBudget}元`
      });
    }

    // 检查子计划预算
    for (const plan of plans) {
      if (plan.spent > this.budgetPerPlan) {
        result.violations.push({
          type: 'sub_plan_over_budget',
          message: `计划 "${plan.name}" 已超支：${plan.spent}元 > ${this.budgetPerPlan}元`
        });
      }
    }

    // 检查计划数量（每个计划至少 15 个产品）
    for (const plan of plans) {
      if (plan.productCount < 15) {
        result.violations.push({
          type: 'too_few_products',
          message: `计划 "${plan.name}" 仅 ${plan.productCount}个产品，最少需要 15 个`
        });
      }
    }

    // 检查是否有单产品计划（红线）
    for (const plan of plans) {
      if (plan.productCount === 1) {
        result.violations.push({
          type: 'single_product_plan',
          level: 'critical',
          message: `计划 "${plan.name}" 仅 1 个产品 - 违反红线禁忌！`
        });
      }
    }

    // 状态判定
    if (result.violations.some(v => v.level === 'critical')) {
      result.status = 'critical';
    } else if (result.violations.length > 0) {
      result.status = 'warning';
    }

    return result;
  }

  /**
   * 获取关键词优化建议（增强版 - 包含黑名单检查）
   * @param {Object} page
   * @returns {Array}
   */
  async getKeywordSuggestions(page) {
    try {
      const keywords = await page.evaluate(() => {
        const keywordElements = document.querySelectorAll('.keyword-item, [class*="keyword-row"]');

        return Array.from(keywordElements).map(el => {
          return {
            keyword: el.querySelector('.keyword-text')?.textContent?.trim() || '',
            impressions: parseInt(el.querySelector('.impressions')?.textContent?.trim() || '0'),
            clicks: parseInt(el.querySelector('.clicks')?.textContent?.trim() || '0'),
            cost: parseFloat(el.querySelector('.cost')?.textContent?.trim() || '0'),
            ctr: parseFloat(el.querySelector('.ctr')?.textContent?.trim() || '0'),
            qualityScore: parseInt(el.querySelector('.quality-score')?.textContent?.trim() || '0'),
            bid: parseFloat(el.querySelector('.bid')?.textContent?.trim() || '0'),
            inquiries: parseInt(el.querySelector('.inquiries')?.textContent?.trim() || '0')
          };
        });
      });

      const suggestions = [];

      for (const kw of keywords) {
        // 检查黑名单关键词
        if (this.blockedKeywords.some(blocked => kw.keyword.toLowerCase().includes(blocked.toLowerCase()))) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'blacklist',
            action: 'remove_immediately',
            level: 'high',
            reason: '黑名单关键词',
            suggestion: '立即删除 - 历史数据证明无转化'
          });
          continue;
        }

        // 低质量分关键词（质量分 < 6）
        if (kw.qualityScore > 0 && kw.qualityScore < 6) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'low_quality',
            action: 'pause_or_optimize',
            level: 'medium',
            reason: `质量分 ${kw.qualityScore} 过低`,
            suggestion: '建议暂停或优化相关性和落地页'
          });
        }

        // 高花费低转化关键词（点击≥5 没询盘）
        if (kw.cost > 20 && kw.clicks >= 5 && kw.inquiries === 0) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'high_cost_no_inquiry',
            action: 'negative_keyword',
            level: 'high',
            reason: `花费 ${kw.cost}元 点击 ${kw.clicks}次 0 询盘`,
            suggestion: '加入否定关键词，避免继续浪费'
          });
        }

        // 高点击 0 转化关键词
        if (kw.clicks >= 10 && kw.inquiries === 0) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'high_click_no_conversion',
            action: 'pause',
            level: 'high',
            reason: `点击 ${kw.clicks}次 0 询盘 - 达到暂停阈值`,
            suggestion: '立即暂停 - 点击≥10 没转化是红线'
          });
        }

        // 高表现关键词（CTR > 3% 且 质量分≥8）
        if (kw.ctr > 3 && kw.qualityScore >= 8) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'high_performer',
            action: 'increase_bid',
            level: 'info',
            reason: `CTR ${kw.ctr}% 质量分 ${kw.qualityScore}`,
            suggestion: '建议增加出价获取更多流量'
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('获取关键词建议失败:', error.message);
      return [];
    }
  }

  /**
   * 获取产品优化建议
   * @param {Object} page
   * @returns {Array}
   */
  async getProductSuggestions(page) {
    try {
      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.product-item, [class*="product-row"]');

        return Array.from(productElements).map(el => {
          return {
            productId: el.getAttribute('data-product-id') || '',
            name: el.querySelector('.product-name')?.textContent?.trim() || '',
            exposure: parseInt(el.querySelector('.product-exposure')?.textContent?.trim() || '0'),
            clicks: parseInt(el.querySelector('.product-clicks')?.textContent?.trim() || '0'),
            cost: parseFloat(el.querySelector('.product-cost')?.textContent?.trim() || '0'),
            inquiries: parseInt(el.querySelector('.product-inquiries')?.textContent?.trim() || '0'),
            ctr: parseFloat(el.querySelector('.product-ctr')?.textContent?.trim() || '0')
          };
        });
      });

      const suggestions = [];

      for (const product of products) {
        // 点击≥10 没转化的产品 - 暂停
        if (product.clicks >= 10 && product.inquiries === 0) {
          suggestions.push({
            productId: product.productId,
            productName: product.name,
            type: 'low_conversion',
            action: 'pause',
            level: 'high',
            reason: `点击 ${product.clicks}次 0 询盘 - 达到暂停阈值`,
            suggestion: '立即暂停 - 点击≥10 没转化是红线'
          });
        }

        // CTR 过低的产品
        if (product.exposure > 1000 && product.ctr < 1) {
          suggestions.push({
            productId: product.productId,
            productName: product.name,
            type: 'low_ctr',
            action: 'optimize_or_remove',
            level: 'medium',
            reason: `曝光 ${product.exposure} CTR 仅${product.ctr}%`,
            suggestion: '优化主图或移除计划'
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('获取产品建议失败:', error.message);
      return [];
    }
  }

  /**
   * 生成推广优化报告（增强版）
   * @param {Object} metrics - 6 大核心指标
   * @param {Array} adPlans - 推广计划列表
   * @returns {Object}
   */
  generateOptimizationReport(metrics, adPlans) {
    const report = {
      date: new Date().toISOString().split('T')[0],
      budget: this.checkBudgetAllocation(adPlans),
      metrics,
      plans: adPlans,
      alerts: [],
      suggestions: []
    };

    // 根据预算检查结果生成警报
    for (const violation of report.budget.violations) {
      report.alerts.push({
        type: violation.type,
        level: violation.level || 'warning',
        message: violation.message
      });
    }

    // 检查计划表现
    for (const plan of adPlans) {
      const ctr = plan.ctr || 0;

      if (ctr < 0.5 && plan.exposure > 1000) {
        report.suggestions.push({
          plan: plan.name,
          type: 'low_ctr',
          action: 'optimize_creative',
          message: `计划 "${plan.name}" CTR 仅${ctr}%，建议优化创意或暂停`
        });
      }
    }

    return report;
  }

  /**
   * 打印优化报告
   * @param {Object} report
   */
  printOptimizationReport(report) {
    console.log('\n═══════════════════════════════════════════');
    console.log('              推广优化报告');
    console.log('═══════════════════════════════════════════\n');

    console.log(`日期：${report.date}\n`);

    // 预算检查状态
    const budgetStatus = report.budget.status;
    const statusIcon = budgetStatus === 'critical' ? '🔴' : budgetStatus === 'warning' ? '⚠️' : '✅';
    console.log(`${statusIcon} 预算状态：${budgetStatus.toUpperCase()}`);
    console.log(`   总预算：${report.budget.totalBudget} 元 / 天`);
    console.log(`   子计划数：${report.budget.subPlansCount} 个`);
    console.log(`   单计划预算：${report.budget.budgetPerPlan} 元\n`);

    // 违规/警告
    if (report.budget.violations.length > 0) {
      console.log('⛔ 违规/警告:');
      for (const v of report.budget.violations) {
        const icon = v.level === 'critical' ? '🔴' : '⚠️';
        console.log(`   ${icon} ${v.message}`);
      }
      console.log();
    }

    if (report.plans.length > 0) {
      console.log('📋 推广计划列表:');
      for (const plan of report.plans) {
        console.log(`   - ${plan.name} (${plan.type})`);
        console.log(`     预算：${plan.budget}元 已花：${plan.spent}元 产品数：${plan.productCount}个`);
        console.log(`     曝光：${plan.exposure} 点击：${plan.clicks} CTR：${plan.ctr}%`);
      }
      console.log();
    }

    if (report.alerts.length > 0) {
      console.log('⚠️  预警:');
      for (const alert of report.alerts) {
        const icon = alert.level === 'high' ? '🔴' : '⚠️';
        console.log(`   ${icon} [${alert.type}] ${alert.message}`);
      }
      console.log();
    }

    if (report.suggestions.length > 0) {
      console.log('💡 优化建议:');
      for (const suggestion of report.suggestions) {
        console.log(`   - [${suggestion.type}] ${suggestion.message}`);
      }
      console.log();
    }

    console.log('═══════════════════════════════════════════\n');
  }

  /**
   * 添加黑名单记录（写入错题本）
   * @param {string} type - 类型：country/keyword/product
   * @param {string} value - 值
   * @param {string} reason - 原因
   */
  addToBlacklist(type, value, reason) {
    const blacklist = {
      country: this.blockedCountries,
      keyword: this.blockedKeywords,
      product: this.blockedProducts
    };

    if (blacklist[type]) {
      if (!blacklist[type].includes(value)) {
        blacklist[type].push(value);
        console.log(`✅ 已添加${type}黑名单：${value} (${reason})`);
      }
    }
  }
}

module.exports = AdOptimizer;
