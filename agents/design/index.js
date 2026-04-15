const BrowserManager = require('../../core/browser-manager');
const ImageGenerator = require('./image-generator');
const TemplateEngine = require('./template-engine');
const Analytics = require('../operation/analytics');
const { getEnv } = require('../../src/config');

const ALIBABA_PRODUCT_URL = getEnv(
  'ALIBABA_PRODUCT_URL',
  'https://supplier.alibaba.com/product/'
);

/**
 * 美工 Agent
 * 负责主图/详情页生成、优化
 */
class DesignAgent {
  constructor() {
    this.browser = null;
    this.imageGenerator = new ImageGenerator();
    this.templateEngine = new TemplateEngine();
    this.analytics = new Analytics();
  }

  /**
   * 启动美工 Agent
   */
  async start() {
    console.log('🚀 美工 Agent 启动中...\n');

    // 启动浏览器
    this.browser = new BrowserManager();
    const page = await this.browser.launch('design', 'default');

    // 导航到产品后台
    console.log('📍 正在打开阿里巴巴产品后台...');
    await this.browser.navigateTo(ALIBABA_PRODUCT_URL);

    // 等待页面加载
    await this.delay(3000, 5000);

    // 获取产品列表
    const products = await this.getProductList(page);

    if (products.length > 0) {
      console.log(`✓ 找到 ${products.length} 个产品\n`);

      // 为每个产品生成图片
      for (const product of products.slice(0, 5)) {
        await this.generateProductImages(product);
      }
    }

    console.log('\n✅ 美工 Agent 任务完成\n');
    await this.stop();
    process.exit(0);
  }

  /**
   * 获取产品列表
   * @param {Page} page
   * @returns {Array}
   */
  async getProductList(page) {
    try {
      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.product-item, [class*="product-card"]');

        return Array.from(productElements).map(el => {
          return {
            id: el.dataset?.id || '',
            name: el.querySelector('.product-name')?.textContent?.trim() || '',
            price: el.querySelector('.product-price')?.textContent?.trim() || '',
            image: el.querySelector('.product-image')?.src || '',
            exposure: parseInt(el.querySelector('.exposure')?.textContent?.trim() || '0'),
            clicks: parseInt(el.querySelector('.clicks')?.textContent?.trim() || '0'),
            inquiries: parseInt(el.querySelector('.inquiries')?.textContent?.trim() || '0'),
            ctr: parseFloat(el.querySelector('.ctr')?.textContent?.trim() || '0')
          };
        });
      });

      return products;
    } catch (error) {
      console.error('获取产品列表失败:', error.message);
      return [];
    }
  }

  /**
   * 为产品生成图片
   * @param {Object} product
   */
  async generateProductImages(product) {
    console.log(`\n📦 开始处理产品：${product.name}\n`);

    // 获取产品表现数据
    const metrics = {
      exposure: product.exposure,
      clicks: product.clicks,
      inquiries: product.inquiries,
      ctr: product.ctr
    };

    // 生成设计建议
    const suggestions = this.templateEngine.generateDesignSuggestions({
      ctr: { value: product.ctr },
      inquiryRate: { value: product.inquiries / product.clicks * 100 || 0 },
      clicks: { value: product.clicks }
    });

    if (suggestions.length > 0) {
      console.log('💡 优化建议:');
      for (const suggestion of suggestions) {
        console.log(`   [${suggestion.priority}] ${suggestion.issue}`);
        console.log(`         ${suggestion.suggestion}\n`);
      }
    }

    // 生成图片
    const imageParams = await this.imageGenerator.generateProductImages(product, 'US');

    console.log('\n📋 待生成图片:');
    console.log(`   主图：${imageParams.mainImage.type} (${imageParams.mainImage.style})`);
    console.log(`   详情页：${imageParams.detailImages.length} 张`);
    console.log(`   A/B 测试：${imageParams.abTestVariants.length} 个变体`);
    console.log();

    return imageParams;
  }

  /**
   * 优化低 CTR 产品的主图
   */
  async optimizeLowCTRProducts() {
    console.log('🔍 正在查找低 CTR 产品...\n');

    if (!this.browser?.page) {
      console.log('⚠️  浏览器未启动\n');
      return;
    }

    const products = await this.getProductList(this.browser.page);
    const lowCTRProducts = products.filter(p => p.ctr < 1 && p.exposure > 100);

    if (lowCTRProducts.length > 0) {
      console.log(`✓ 找到 ${lowCTRProducts.length} 个低 CTR 产品:\n`);

      for (const product of lowCTRProducts.slice(0, 3)) {
        console.log(`   - ${product.name}: CTR ${product.ctr}%, 曝光 ${product.exposure}`);
      }

      console.log('\n📸 为这些产品生成新主图...\n');

      for (const product of lowCTRProducts.slice(0, 3)) {
        await this.generateProductImages(product);
      }
    } else {
      console.log('✅ 没有低 CTR 产品需要优化\n');
    }
  }

  /**
   * 列出可用模板
   */
  showTemplates() {
    this.templateEngine.listAllTemplates();
  }

  /**
   * 停止 Agent
   */
  async stop() {
    console.log('\n🛑 正在关闭美工 Agent...');
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
  const agent = new DesignAgent();

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await agent.start();
        break;

      case 'optimize':
        await agent.start();
        await agent.optimizeLowCTRProducts();
        await agent.stop();
        break;

      case 'templates':
        agent.showTemplates();
        break;

      default:
        console.log('用法：node agents/design/index.js [start|optimize|templates]');
        console.log('\n示例:');
        console.log('  /alibaba-design 开始生成图片');
        console.log('  /alibaba-design 优化低 CTR 产品');
        console.log('  /alibaba-design 查看模板');
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
  console.log('👋 美工 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = DesignAgent;
