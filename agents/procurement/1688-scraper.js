const { chromium } = require('playwright');

/**
 * 1688 选品模块
 * 负责从 1688 平台筛选新品
 */
class Platform1688Scraper {
  constructor() {
    this.baseUrl = 'https://www.1688.com';
    this.browser = null;
    this.page = null;
  }

  /**
   * 启动浏览器
   */
  async launch() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    // 设置 User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('✓ 浏览器已启动');
  }

  /**
   * 搜索产品
   * @param {string} keyword - 搜索关键词
   * @returns {Array}
   */
  async searchProducts(keyword) {
    try {
      const searchUrl = `${this.baseUrl}/page/offer.html?keywords=${encodeURIComponent(keyword)}`;

      console.log(`🔍 搜索：${keyword}`);
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待搜索结果加载
      await this.page.waitForSelector('.offer-item, .search-item', { timeout: 10000 }).catch(() => null);

      const products = await this.page.evaluate(() => {
        const items = document.querySelectorAll('.offer-item, .search-item, [class*="offer-row"]');

        return Array.from(items).map(el => {
          const titleEl = el.querySelector('.title, .offer-title, [class*="title"]');
          const priceEl = el.querySelector('.price, .offer-price, [class*="price"]');
          const salesEl = el.querySelector('.sales, .offer-sales, [class*="sales"]');
          const shopEl = el.querySelector('.shop-name, .supplier-name, [class*="shop"]');
          const imageEl = el.querySelector('img');

          return {
            title: titleEl?.textContent?.trim() || '',
            price: priceEl?.textContent?.trim() || '',
            sales: parseInt(salesEl?.textContent?.trim().replace(/[^\d]/g, '') || '0'),
            shop: shopEl?.textContent?.trim() || '',
            image: imageEl?.src || '',
            link: titleEl?.closest('a')?.href || ''
          };
        }).filter(p => p.title);
      });

      console.log(`✓ 找到 ${products.length} 个产品`);
      return products;
    } catch (error) {
      console.error('搜索产品失败:', error.message);
      return [];
    }
  }

  /**
   * 筛选优质供应商
   * @param {Array} products
   * @returns {Array}
   */
  filterQualitySuppliers(products) {
    return products.filter(p => {
      // 筛选条件：有价格、有销量、标题完整
      return p.price && p.sales > 0 && p.title.length > 10;
    });
  }

  /**
   * 分析产品价格区间
   * @param {Array} products
   * @returns {Object}
   */
  analyzePriceRange(products) {
    const prices = products
      .map(p => {
        const match = p.price.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : null;
      })
      .filter(p => p !== null);

    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
    };
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = Platform1688Scraper;
