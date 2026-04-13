const DataStore = require('../../core/data-store');

/**
 * 推广优化模块
 * 负责广告计划管理、关键词优化、预算分配
 */
class AdOptimizer {
  constructor() {
    this.store = new DataStore();
    this.dailyBudget = 150; // 日预算 150 元
    this.subPlansCount = 3; // 3 个子计划
    this.budgetPerPlan = 50; // 每个子计划 50 元
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
            status: el.querySelector('.plan-status')?.textContent?.trim() || '',
            budget: el.querySelector('.plan-budget')?.textContent?.trim() || '',
            spent: el.querySelector('.plan-spent')?.textContent?.trim() || '',
            exposure: el.querySelector('.plan-exposure')?.textContent?.trim() || '',
            clicks: el.querySelector('.plan-clicks')?.textContent?.trim() || '',
            cost: el.querySelector('.plan-cost')?.textContent?.trim() || '',
            ctr: el.querySelector('.plan-ctr')?.textContent?.trim() || ''
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
   * 检查预算分配
   * @returns {Object}
   */
  checkBudgetAllocation() {
    const expectedPerPlan = this.dailyBudget / this.subPlansCount;

    return {
      totalBudget: this.dailyBudget,
      subPlansCount: this.subPlansCount,
      budgetPerPlan: this.budgetPerPlan,
      status: 'normal',
      suggestions: []
    };
  }

  /**
   * 获取关键词优化建议
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
            bid: parseFloat(el.querySelector('.bid')?.textContent?.trim() || '0')
          };
        });
      });

      const suggestions = [];

      for (const kw of keywords) {
        // 低质量分关键词
        if (kw.qualityScore < 6 && kw.qualityScore > 0) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'low_quality',
            action: 'pause_or_optimize',
            reason: `质量分 ${kw.qualityScore} 过低`,
            suggestion: '建议暂停或优化相关性和落地页'
          });
        }

        // 高花费低转化关键词
        if (kw.cost > 20 && kw.clicks > 0 && kw.ctr < 1) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'high_cost_low_ctr',
            action: 'reduce_bid',
            reason: `花费 ${kw.cost}元 但 CTR 仅 ${kw.ctr}%`,
            suggestion: '建议降低出价或优化创意'
          });
        }

        // 高表现关键词（增加曝光）
        if (kw.ctr > 3 && kw.qualityScore >= 8) {
          suggestions.push({
            keyword: kw.keyword,
            type: 'high_performer',
            action: 'increase_exposure',
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
   * 生成推广优化报告
   * @param {Object} metrics
   * @param {Array} adPlans
   * @returns {Object}
   */
  generateOptimizationReport(metrics, adPlans) {
    const report = {
      date: new Date().toISOString().split('T')[0],
      budget: this.checkBudgetAllocation(),
      metrics,
      plans: adPlans,
      alerts: [],
      suggestions: []
    };

    // 检查预算执行情况
    const totalSpent = adPlans.reduce((sum, plan) => {
      return sum + (parseFloat(plan.spent) || 0);
    }, 0);

    if (totalSpent > this.dailyBudget * 0.9) {
      report.alerts.push({
        type: 'budget_warning',
        message: `预算已使用 ${((totalSpent / this.dailyBudget) * 100).toFixed(0)}%，接近上限`
      });
    }

    // 检查计划表现
    for (const plan of adPlans) {
      const ctr = parseFloat(plan.ctr) || 0;

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

    console.log('📊 预算分配:');
    console.log(`   总预算：${report.budget.totalBudget} 元`);
    console.log(`   子计划数：${report.budget.subPlansCount} 个`);
    console.log(`   单计划预算：${report.budget.budgetPerPlan} 元\n`);

    if (report.plans.length > 0) {
      console.log('📋 推广计划:');
      for (const plan of report.plans) {
        console.log(`   - ${plan.name}: 花费 ${plan.spent}元, 曝光 ${plan.exposure}, 点击 ${plan.clicks}, CTR ${plan.ctr}`);
      }
      console.log();
    }

    if (report.alerts.length > 0) {
      console.log('⚠️  预警:');
      for (const alert of report.alerts) {
        console.log(`   - ${alert.message}`);
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
}

module.exports = AdOptimizer;
