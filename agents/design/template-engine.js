const DataStore = require('../../core/data-store');

/**
 * 模板引擎模块
 * 负责主图/详情页模板管理
 */
class TemplateEngine {
  constructor() {
    this.store = new DataStore();
    this.templates = this.loadDefaultTemplates();
  }

  /**
   * 加载默认模板
   */
  loadDefaultTemplates() {
    return {
      // 主图模板
      main_image: [
        {
          id: 'main_001',
          name: '经典白底',
          description: '纯白背景，产品居中，适合大多数产品',
          style: 'minimalist',
          background: '#FFFFFF',
          composition: 'center'
        },
        {
          id: 'main_002',
          name: '场景融合',
          description: '带使用场景背景，增强代入感',
          style: 'lifestyle',
          background: 'scene',
          composition: 'rule-of-thirds'
        },
        {
          id: 'main_003',
          name: '渐变背景',
          description: '柔和渐变背景，突出产品质感',
          style: 'gradient',
          background: 'gradient',
          composition: 'center'
        }
      ],

      // 详情页模板
      detail_image: [
        {
          id: 'detail_001',
          name: '卖点展示',
          description: '左侧产品图，右侧卖点文字',
          layout: 'split-left-right',
          sections: ['product_image', 'feature_list']
        },
        {
          id: 'detail_002',
          name: '规格参数',
          description: '清晰的表格布局展示参数',
          layout: 'table',
          sections: ['specification_table']
        },
        {
          id: 'detail_003',
          name: '场景展示',
          description: '全屏场景图加文字说明',
          layout: 'full-bleed',
          sections: ['scenario_image', 'caption']
        }
      ]
    };
  }

  /**
   * 根据数据选择推荐模板
   * @param {string} type - 图片类型
   * @param {Object} data - 性能数据
   * @returns {Object}
   */
  recommendTemplate(type, data) {
    const templates = this.templates[type] || [];

    if (!data || templates.length === 0) {
      return templates[0];
    }

    // 根据 CTR 选择最佳模板
    const bestPerforming = this.getBestPerformingTemplate(type, data);

    if (bestPerforming) {
      console.log(`📊 推荐模板：${bestPerforming.name} (CTR: ${bestPerforming.ctr}%)`);
      return bestPerforming;
    }

    // 返回默认模板
    return templates[0];
  }

  /**
   * 获取表现最佳的模板
   */
  getBestPerformingTemplate(type, data) {
    // 从数据存储中获取各模板的表现数据
    const analytics = this.store.list('analytics');

    const templatePerformance = analytics
      .filter(a => a.templateType === type)
      .sort((a, b) => (b.ctr || 0) - (a.ctr || 0));

    if (templatePerformance.length > 0) {
      const best = templatePerformance[0];
      const template = this.templates[type]?.find(t => t.id === best.templateId);

      if (template) {
        return { ...template, ctr: best.ctr };
      }
    }

    return null;
  }

  /**
   * 生成图片设计建议
   * @param {Object} metrics - 6 大核心指标
   * @returns {Array}
   */
  generateDesignSuggestions(metrics) {
    const suggestions = [];

    // CTR 低 - 需要优化主图
    const ctrValue = parseFloat(metrics.ctr?.value) || 0;
    if (ctrValue < 1) {
      suggestions.push({
        type: 'main_image',
        priority: 'high',
        issue: `CTR 仅 ${ctrValue}%，主图吸引力不足`,
        suggestion: '建议：更换主图风格，尝试场景图或增加卖点标注',
        action: 'regenerate_main_image'
      });
    }

    // 询盘转化率低 - 需要优化详情页
    const inquiryRateValue = parseFloat(metrics.inquiryRate?.value) || 0;
    if (inquiryRateValue < 5 && metrics.clicks?.value > 10) {
      suggestions.push({
        type: 'detail_image',
        priority: 'high',
        issue: `询盘转化率 ${inquiryRateValue}%，详情页说服力不足`,
        suggestion: '建议：增加信任背书（证书/评价），优化卖点展示',
        action: 'regenerate_detail_images'
      });
    }

    // 点击量低但 CTR 正常 - 需要增加曝光
    if (metrics.clicks?.value < 50 && ctrValue >= 1) {
      suggestions.push({
        type: 'main_image',
        priority: 'medium',
        issue: '点击量偏低，但 CTR 正常',
        suggestion: '建议：保持当前主图，增加推广曝光',
        action: 'increase_exposure'
      });
    }

    return suggestions;
  }

  /**
   * 记录模板表现
   * @param {string} templateId
   * @param {string} templateType
   * @param {Object} performance
   */
  recordTemplatePerformance(templateId, templateType, performance) {
    return this.store.create('analytics', {
      templateId,
      templateType,
      ...performance,
      recordedAt: new Date().toISOString()
    });
  }

  /**
   * 打印模板推荐
   * @param {string} type
   * @param {Object} data
   */
  printTemplateRecommendation(type, data) {
    const template = this.recommendTemplate(type, data);

    if (template) {
      console.log(`\n📋 推荐模板：${template.name}`);
      console.log(`   描述：${template.description}`);
      console.log(`   风格：${template.style}`);
      if (template.ctr) {
        console.log(`   历史 CTR: ${template.ctr}%`);
      }
      console.log();
    }
  }

  /**
   * 列出所有可用模板
   */
  listAllTemplates() {
    console.log('\n═══════════════════════════════════════════');
    console.log('              可用模板列表');
    console.log('═══════════════════════════════════════════\n');

    for (const [type, templates] of Object.entries(this.templates)) {
      console.log(`【${type === 'main_image' ? '主图' : '详情页'}】`);

      for (const template of templates) {
        console.log(`   ${template.id}: ${template.name}`);
        console.log(`      ${template.description}`);
        console.log(`      风格：${template.style}`);
        console.log();
      }
    }

    console.log('═══════════════════════════════════════════\n');
  }
}

module.exports = TemplateEngine;
