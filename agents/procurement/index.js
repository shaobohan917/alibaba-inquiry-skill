const Platform1688Scraper = require('./1688-scraper');
const SupplierManager = require('./supplier-manager');
const DataStore = require('../../core/data-store');
const MemorySystem = require('../../core/memory-system');
const { getShopConfig } = require('../../config/shop-type');

/**
 * 采购 Agent
 * 负责 1688 选品、供应商管理、比价、毛利控制
 * 支持出口通/金品诚企双版本
 */
class ProcurementAgent {
  constructor(shopType = 'export') {
    this.shopType = shopType;
    this.shopConfig = getShopConfig(shopType);
    this.scraper = new Platform1688Scraper();
    this.supplierManager = new SupplierManager(shopType);
    this.store = new DataStore();
    this.memory = new MemorySystem(null, 'procurement');
  }

  /**
   * 启动采购 Agent
   */
  async start() {
    console.log(`🚀 采购 Agent 启动中 [${this.shopType === 'gold' ? '金品诚企' : '出口通'}]...\n`);

    // 显示核心指标
    this.printMetrics();

    // 启动浏览器
    await this.scraper.launch();

    try {
      // 搜索产品
      await this.searchNewProducts();

      // 显示供应商评级
      this.supplierManager.printSupplierRatings();
    } catch (error) {
      console.error('❌ 发生错误:', error.message);
    } finally {
      await this.scraper.close();
    }

    console.log('\n✅ 采购 Agent 任务完成\n');
  }

  /**
   * 打印核心指标
   */
  printMetrics() {
    console.log('\n═══════════════════════════════════════════');
    console.log(`        [${this.shopType === 'gold' ? '金品诚企' : '出口通'}] 采购核心指标`);
    console.log('═══════════════════════════════════════════\n');

    console.log(`📊 核心指标：`);
    console.log(`   1. 采购毛利率：警戒线 <${this.shopConfig.metrics.procurementMargin.min}%`);
    console.log(`   2. 供应商响应时效：警戒线 >${this.shopConfig.metrics.supplierResponseTime.max / 60}小时`);
    console.log(`   3. 优质供应商占比：目标≥80%`);
    console.log(`   4. 新品筛选效率：目标≥5 个/天`);

    console.log(`\n🎯 当前配置：`);
    console.log(`   店铺类型：${this.shopType === 'gold' ? '金品诚企' : '出口通'}`);
    console.log(`   毛利目标：${this.shopConfig.procurement.marginTarget}%`);
    console.log(`   供应商类型：${this.shopConfig.procurement.supplierType}`);
    console.log(`   定制支持：${this.shopConfig.procurement.customizationSupport ? '✅' : '❌'}`);

    console.log('\n═══════════════════════════════════════════\n');
  }

  /**
   * 搜索新品
   */
  async searchNewProducts() {
    // 获取待搜索的关键词列表
    const keywords = await this.getSearchKeywords();

    for (const keyword of keywords) {
      console.log(`\n🔍 搜索关键词：${keyword}\n`);

      const products = await this.scraper.searchProducts(keyword);

      if (products.length > 0) {
        // 筛选优质供应商
        const qualityProducts = this.scraper.filterQualitySuppliers(products);

        // 分析价格区间
        const priceRange = this.scraper.analyzePriceRange(qualityProducts);

        console.log(`   找到 ${qualityProducts.length} 个优质产品`);
        console.log(`   价格区间：¥${priceRange.min} - ¥${priceRange.max} (平均：¥${priceRange.avg})\n`);

        // 记录产品信息
        for (const product of qualityProducts.slice(0, 5)) {
          const productId = this.store.create('products', {
            name: product.title,
            price: product.price,
            sales: product.sales,
            shop: product.shop,
            source: '1688',
            sourceUrl: product.link,
            crawledAt: new Date().toISOString()
          });

          console.log(`   ✓ 已记录：${product.title.substring(0, 30)}...`);
        }
      }
    }
  }

  /**
   * 获取搜索关键词
   * @returns {Array}
   */
  async getSearchKeywords() {
    // 从已有产品数据中获取关键词
    const products = this.store.list('products');

    // 提取产品名称作为关键词
    const keywords = products
      .map(p => {
        // 简化产品名称作为关键词
        return p.name.split(' ').slice(0, 2).join(' ');
      })
      .filter((v, i, a) => a.indexOf(v) === i) // 去重
      .slice(0, 5);

    // 如果没有产品，返回默认关键词
    if (keywords.length === 0) {
      return ['热销产品', '新品', '爆款'];
    }

    return keywords;
  }

  /**
   * 比价分析
   * @param {string} productName
   */
  async comparePrices(productName) {
    console.log(`\n💰 正在比价：${productName}\n`);

    // 搜索 1688
    await this.scraper.launch();

    try {
      const products = await this.scraper.searchProducts(productName);

      if (products.length > 0) {
        // 添加供应商
        for (const product of products.slice(0, 5)) {
          const supplierId = this.supplierManager.addSupplier({
            name: product.shop,
            platform: '1688',
            shopUrl: product.link,
            rating: 5 // 默认评分
          });

          // 记录价格
          this.supplierManager.recordProductPrice(supplierId, {
            name: product.title,
            price: product.price,
            moq: 1
          });
        }
      }
    } finally {
      await this.scraper.close();
    }

    // 打印比价结果
    this.supplierManager.printPriceComparison(productName);
  }

  /**
   * 筛选新品
   * @param {Object} options
   */
  async screenNewProducts(options = {}) {
    const {
      keyword = '新品',
      minSales = 100,
      maxPrice = 100
    } = options;

    console.log(`\n🔍 筛选新品：${keyword}\n`);
    console.log(`   条件：销量 ≥ ${minSales}, 价格 ≤ ¥${maxPrice}\n`);

    await this.scraper.launch();

    try {
      const products = await this.scraper.searchProducts(keyword);

      // 筛选
      const filtered = products.filter(p => {
        const priceMatch = p.price.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;

        return p.sales >= minSales && price <= maxPrice;
      });

      console.log(`✓ 找到 ${filtered.length} 个符合条件的产品:\n`);

      for (const product of filtered.slice(0, 10)) {
        console.log(`   - ${product.title}`);
        console.log(`     价格：${product.price}, 销量：${product.sales}`);
        console.log();
      }
    } finally {
      await this.scraper.close();
    }
  }

  /**
   * 显示供应商评级
   */
  showSupplierRatings() {
    this.supplierManager.printSupplierRatings();
  }
}

// CLI 入口
async function main() {
  const agent = new ProcurementAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'compare':
        const productName = process.argv[3] || '热销产品';
        await agent.comparePrices(productName);
        break;

      case 'screen':
        await agent.screenNewProducts({
          minSales: 100,
          maxPrice: 50
        });
        break;

      case 'suppliers':
        agent.showSupplierRatings();
        break;

      default:
        console.log('用法：node agents/procurement/index.js [start|compare|screen|suppliers]');
        console.log('\n示例:');
        console.log('  /alibaba-procurement 开始选品');
        console.log('  /alibaba-procurement 比价 产品名');
        console.log('  /alibaba-procurement 筛选新品');
        console.log('  /alibaba-procurement 查看供应商');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    await agent.scraper.close();
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  await agent.scraper.close();
  console.log('👋 采购 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = ProcurementAgent;
