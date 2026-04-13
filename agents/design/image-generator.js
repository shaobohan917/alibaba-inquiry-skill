const fs = require('fs');
const path = require('path');

/**
 * 图片生成模块
 * 负责主图、详情页图片生成
 */
class ImageGenerator {
  constructor(outputDir = null) {
    this.outputDir = outputDir || path.join(__dirname, '..', '..', 'generated', 'images');
    this.ensureDir();
  }

  /**
   * 确保输出目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 生成图片文件名
   * @param {string} type - 图片类型
   * @param {string} productId - 产品 ID
   * @returns {string}
   */
  generateFilename(type, productId) {
    const timestamp = Date.now();
    return `${productId}_${type}_${timestamp}.png`;
  }

  /**
   * 生成主图（白底图）
   * @param {Object} product - 产品信息
   * @param {string} country - 目标国家
   * @returns {string} 图片路径
   */
  async generateMainImage(product, country = 'US') {
    console.log(`🎨 正在生成主图（${country} 国别站）...`);

    // 生成图片描述 prompt（用于调用 AI 图片生成 API）
    const prompt = this.buildMainImagePrompt(product, country);

    // 返回生成参数（实际使用时调用 AI 图片 API）
    const imageParams = {
      type: 'main_image',
      prompt,
      style: 'white_background',
      size: '800x800',
      country,
      product
    };

    console.log(`✓ 主图生成参数已准备`);
    return imageParams;
  }

  /**
   * 构建主图 prompt
   */
  buildMainImagePrompt(product, country) {
    const styleGuide = this.getCountryStyleGuide(country);

    return `生成一张专业的电商产品主图：
- 产品：${product.name}
- 风格：${styleGuide.style}
- 背景：纯白色（RGB 255,255,255）
- 构图：产品居中，占画面 70-80%
- 光线：柔和均匀，无明显阴影
- 要求：高清、专业、符合${country}市场审美
- 禁止：文字、水印、边框`;
  }

  /**
   * 获取国别站风格指南
   */
  getCountryStyleGuide(country) {
    const guides = {
      'US': { style: '简洁现代，突出产品质感', color: '中性色调' },
      'UK': { style: '英伦风格，注重细节', color: '经典配色' },
      'FR': { style: '优雅精致，艺术感', color: '柔和色调' },
      'DE': { style: '严谨专业，功能导向', color: '稳重组配' },
      'ES': { style: '热情活力，色彩明快', color: '暖色调' },
      'IT': { style: '时尚设计，美学优先', color: '高级配色' },
      'JP': { style: '简约日式，细节精致', color: '淡雅色调' },
      'KR': { style: '韩系清新，年轻化', color: '马卡龙色系' }
    };

    return guides[country] || guides['US'];
  }

  /**
   * 生成详情页图片
   * @param {Object} product
   * @returns {Array} 图片参数列表
   */
  async generateDetailImages(product) {
    console.log('🎨 正在生成详情页图片...');

    const images = [];

    // 1. 产品卖点图
    images.push({
      type: 'feature',
      prompt: `生成产品卖点展示图：
- 产品：${product.name}
- 核心卖点：${product.features?.join('、') || '高品质'}
- 布局：左侧产品图，右侧卖点文字
- 风格：专业、清晰、易读`,
      size: '750x600'
    });

    // 2. 产品规格图
    images.push({
      type: 'specification',
      prompt: `生成产品规格参数图：
- 清晰的表格布局
- 包含尺寸、重量、材质等参数
- 专业简洁的设计风格`,
      size: '750x500'
    });

    // 3. 使用场景图
    images.push({
      type: 'scenario',
      prompt: `生成产品使用场景图：
- 产品：${product.name}
- 场景：${product.scenario || '实际使用环境'}
- 风格：真实自然，有代入感`,
      size: '750x600'
    });

    // 4. 产品细节图
    images.push({
      type: 'detail',
      prompt: `生成产品细节放大图：
- 展示产品关键细节
- 高分辨率，清晰可见
- 专业微距摄影风格`,
      size: '750x500'
    });

    // 5. 包装信息图
    images.push({
      type: 'packaging',
      prompt: `生成产品包装展示图：
- 展示包装盒/袋
- 包含包装尺寸和重量
- 专业整洁的展示风格`,
      size: '750x400'
    });

    // 6. 信任背书图
    images.push({
      type: 'trust',
      prompt: `生成信任背书展示图：
- 展示证书、资质、检测报告
- 排列整齐，清晰可见
- 增强买家信任感`,
      size: '750x400'
    });

    console.log(`✓ 详情页图片生成参数已准备 (${images.length} 张)`);
    return images;
  }

  /**
   * 生成 A/B 测试主图变体
   * @param {Object} product
   * @returns {Array}
   */
  async generateABTestVariants(product) {
    console.log('🎨 正在生成 A/B 测试主图变体...');

    const variants = [];

    // 变体 A：标准白底图
    variants.push({
      variant: 'A',
      type: 'white_background',
      prompt: this.buildMainImagePrompt(product, 'US'),
      description: '标准白底图'
    });

    // 变体 B：带场景的主图
    variants.push({
      variant: 'B',
      type: 'with_context',
      prompt: `生成带使用场景的产品主图：
- 产品：${product.name}
- 背景：模糊的使用场景
- 构图：产品前景突出，背景虚化
- 风格：自然真实`,
      description: '场景主图'
    });

    // 变体 C：带卖点的图片
    variants.push({
      variant: 'C',
      type: 'with_features',
      prompt: `生成带卖点标注的产品主图：
- 产品：${product.name}
- 标注：在图片边缘标注核心卖点
- 风格：简洁专业，不影响产品展示`,
      description: '卖点标注主图'
    });

    // 变体 D：带促销信息的主图
    variants.push({
      variant: 'D',
      type: 'with_promotion',
      prompt: `生成带促销信息的产品主图：
- 产品：${product.name}
- 促销角标：右上角添加"Hot Sale"或"New Arrival"
- 风格：吸引眼球但不过度`,
      description: '促销主图'
    });

    console.log(`✓ A/B 测试变体已准备 (${variants.length} 个)`);
    return variants;
  }

  /**
   * 调用 AI 图片生成 API
   * @param {Object} params - 图片参数
   * @returns {string} 生成的图片路径
   */
  async generateWithAI(params) {
    // 这里是占位符，实际使用时需要调用 AI 图片生成 API
    // 如：Midjourney, DALL-E 3, Stable Diffusion 等

    console.log('🤖 调用 AI 图片生成 API...');
    console.log('   Prompt:', params.prompt);

    // 模拟 API 调用
    const imagePath = path.join(this.outputDir, this.generateFilename(params.type || 'image', 'product'));

    // TODO: 实际接入 AI 图片 API
    // const response = await fetch(aiImageApiUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ prompt: params.prompt, size: params.size })
    // });

    console.log(`✓ 图片已生成：${imagePath}`);
    return imagePath;
  }

  /**
   * 批量生成产品图片
   * @param {Object} product
   * @param {string} country
   */
  async generateProductImages(product, country = 'US') {
    console.log(`\n📦 开始生成产品图片：${product.name}\n`);

    // 1. 生成主图
    const mainImageParams = await this.generateMainImage(product, country);

    // 2. 生成详情页图片
    const detailImageParams = await this.generateDetailImages(product);

    // 3. 生成 A/B 测试变体
    const abTestParams = await this.generateABTestVariants(product);

    return {
      mainImage: mainImageParams,
      detailImages: detailImageParams,
      abTestVariants: abTestParams
    };
  }
}

module.exports = ImageGenerator;
