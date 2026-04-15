const DataStore = require('../../core/data-store');
const MemorySystem = require('../../core/memory-system');
const { getShopConfig } = require('../../config/shop-type');

/**
 * 供应商管理模块
 * 负责供应商信息、比价、评估、毛利控制
 */
class SupplierManager {
  constructor(shopType = 'export') {
    this.shopType = shopType;
    this.store = new DataStore();
    this.memory = new MemorySystem(null, 'procurement');
    this.shopConfig = getShopConfig(shopType);
    this.marginTarget = this.shopConfig.procurement.marginTarget; // 出口通 30%, 金品 25%
  }

  /**
   * 添加供应商
   * @param {Object} supplier
   * @returns {string}
   */
  addSupplier(supplier) {
    return this.store.create('suppliers', {
      name: supplier.name,
      platform: supplier.platform || '1688',
      shopUrl: supplier.shopUrl,
      rating: supplier.rating || 0,
      years: supplier.years || 0, // 经营年限
      responseRate: supplier.responseRate || 0, // 响应率
      deliveryScore: supplier.deliveryScore || 0, // 发货评分
      qualityScore: supplier.qualityScore || 0, // 质量评分
      categories: supplier.categories || [],
      contactInfo: supplier.contactInfo || {},
      addedAt: new Date().toISOString()
    });
  }

  /**
   * 记录产品价格
   * @param {string} supplierId
   * @param {Object} product
   */
  recordProductPrice(supplierId, product) {
    return this.store.create('product_prices', {
      supplierId,
      productName: product.name,
      price: product.price,
      moq: product.moq, // 最小起订量
      currency: product.currency || 'CNY',
      recordedAt: new Date().toISOString()
    });
  }

  /**
   * 比价分析
   * @param {string} productName
   * @returns {Array}
   */
  comparePrices(productName) {
    const suppliers = this.store.list('suppliers');
    const priceRecords = this.store.list('product_prices');

    // 找到包含该产品的供应商
    const matches = priceRecords
      .filter(r => r.productName.toLowerCase().includes(productName.toLowerCase()))
      .map(record => {
        const supplier = suppliers.find(s => s.id === record.supplierId);
        return {
          supplier: supplier?.name || 'Unknown',
          price: record.price,
          moq: record.moq,
          rating: supplier?.rating || 0,
          url: supplier?.shopUrl || ''
        };
      })
      .sort((a, b) => a.price - b.price);

    return matches;
  }

  /**
   * 评估供应商
   * @param {string} supplierId
   * @returns {Object}
   */
  evaluateSupplier(supplierId) {
    const supplier = this.store.get('suppliers', supplierId);

    if (!supplier) {
      return null;
    }

    // 计算综合评分
    const scores = {
      rating: supplier.rating || 0,
      years: Math.min(supplier.years * 2, 20), // 最高 20 分
      responseRate: supplier.responseRate || 0,
      deliveryScore: supplier.deliveryScore || 0,
      qualityScore: supplier.qualityScore || 0
    };

    const totalScore = (
      scores.rating * 0.3 +
      scores.years * 0.1 +
      scores.responseRate * 0.2 +
      scores.deliveryScore * 0.2 +
      scores.qualityScore * 0.2
    );

    // 计算毛利达标率
    const marginRate = this.calculateMarginRate(supplierId);

    return {
      id: supplier.id,
      name: supplier.name,
      scores,
      totalScore: totalScore.toFixed(2),
      level: this.getSupplierLevel(totalScore),
      recommendation: this.getRecommendation(totalScore),
      marginRate: marginRate,
      marginTarget: this.marginTarget,
      marginAchieved: marginRate >= this.marginTarget
    };
  }

  /**
   * 计算供应商毛利率
   * @param {string} supplierId
   * @returns {number}
   */
  calculateMarginRate(supplierId) {
    const prices = this.store.list('product_prices').filter(p => p.supplierId === supplierId);
    if (prices.length === 0) return 0;

    // 简化计算：假设目标售价是采购价的 1.3 倍（出口通）或 1.25 倍（金品）
    const targetMultiplier = this.shopType === 'gold' ? 1.25 : 1.3;
    const avgPrice = prices.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / prices.length;
    const targetPrice = avgPrice * targetMultiplier;
    const marginRate = ((targetPrice - avgPrice) / targetPrice) * 100;

    return marginRate;
  }

  /**
   * 获取供应商等级
   */
  getSupplierLevel(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  /**
   * 获取推荐意见
   */
  getRecommendation(score) {
    if (score >= 80) return '强烈推荐';
    if (score >= 60) return '推荐';
    if (score >= 40) return '谨慎合作';
    return '不推荐';
  }

  /**
   * 获取优质供应商列表
   * @returns {Array}
   */
  getTopSuppliers() {
    const suppliers = this.store.list('suppliers');
    const evaluated = suppliers
      .map(s => this.evaluateSupplier(s.id))
      .filter(e => e !== null)
      .sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));

    return evaluated;
  }

  /**
   * 打印比价结果
   * @param {string} productName
   */
  printPriceComparison(productName) {
    const comparisons = this.comparePrices(productName);

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`         "${productName}" 比价结果`);
    console.log(`═══════════════════════════════════════════\n`);

    if (comparisons.length === 0) {
      console.log('   暂无该产品比价数据\n');
      return;
    }

    for (let i = 0; i < Math.min(comparisons.length, 5); i++) {
      const item = comparisons[i];
      console.log(`${i + 1}. ${item.supplier}`);
      console.log(`   价格：¥${item.price} (MOQ: ${item.moq})`);
      console.log(`   评分：${item.rating}`);
      console.log(`   链接：${item.url}`);
      console.log();
    }

    console.log('═══════════════════════════════════════════\n');
  }

  /**
   * 打印供应商评级
   */
  printSupplierRatings() {
    const suppliers = this.getTopSuppliers();

    console.log('\n═══════════════════════════════════════════');
    console.log(`        [${this.shopType === 'gold' ? '金品诚企' : '出口通'}] 供应商评级`);
    console.log('═══════════════════════════════════════════\n');

    console.log(`📊 毛利目标：${this.marginTarget}%\\n`);

    for (const supplier of suppliers.slice(0, 10)) {
      const levelIcon = supplier.level === 'A' ? '🟢' : supplier.level === 'B' ? '🟡' : supplier.level === 'C' ? '🟠' : '🔴';
      const marginIcon = supplier.marginAchieved ? '✅' : '⚠️';
      console.log(`${levelIcon} ${supplier.name} (${supplier.level}级)`);
      console.log(`   综合评分：${supplier.totalScore}`);
      console.log(`   推荐意见：${supplier.recommendation}`);
      console.log(`   毛利率：${marginIcon} ${supplier.marginRate.toFixed(2)}% (目标：${this.marginTarget}%)`);
      console.log();
    }

    console.log('═══════════════════════════════════════════\n');
  }
}

module.exports = SupplierManager;
