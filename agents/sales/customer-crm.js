const DataStore = require('../../core/data-store');

/**
 * 客户 CRM 管理
 * 负责客户分层、跟进记录、复购促进
 */
class CustomerCRM {
  constructor() {
    this.store = new DataStore();
  }

  /**
   * 记录客户互动
   * @param {Object} interaction
   * @param {string} interaction.email - 客户邮箱
   * @param {string} interaction.name - 客户姓名
   * @param {string} interaction.country - 国家
   * @param {string} interaction.type - 互动类型 (inquiry/order/complaint)
   * @param {string} interaction.content - 互动内容
   * @param {Object} interaction.metadata - 附加数据（订单数量、金额等）
   * @returns {string} 客户 ID
   */
  async recordInteraction(interaction) {
    // 创建或更新客户记录
    const customerId = this.store.upsertCustomer({
      email: interaction.email,
      name: interaction.name,
      country: interaction.country,
      lastContactAt: new Date().toISOString(),
      lastInteractionType: interaction.type,
      lastInteractionContent: interaction.content.substring(0, 200),
      ...interaction.metadata
    });

    // 记录互动历史
    this.store.create('interactions', {
      customerId,
      type: interaction.type,
      content: interaction.content,
      metadata: interaction.metadata,
      recordedAt: new Date().toISOString()
    });

    return customerId;
  }

  /**
   * 获取客户分层
   * @param {string} customerId
   * @returns {Object} 客户信息（含 tier）
   */
  getCustomerTier(customerId) {
    const customer = this.store.get('customers', customerId);

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      tier: customer.tier,
      orderCount: customer.orderCount || 0,
      orderQuantity: customer.orderQuantity || 0,
      lastContactAt: customer.lastContactAt,
      tags: this.generateCustomerTags(customer)
    };
  }

  /**
   * 生成客户标签
   * @param {Object} customer
   * @returns {Array<string>}
   */
  generateCustomerTags(customer) {
    const tags = [];

    // 新客户标签
    if (!customer.orderCount || customer.orderCount === 0) {
      tags.push('新客户');
    }

    // VIP 标签
    if (customer.orderCount >= 2) {
      tags.push('VIP 客户');
    }

    // 大额意向标签
    if (customer.orderQuantity >= 1000) {
      tags.push('大额意向');
    }

    // 长期未联系标签
    if (customer.lastContactAt) {
      const daysSinceContact = (Date.now() - new Date(customer.lastContactAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceContact > 30) {
        tags.push('长期未联系');
      }
    }

    return tags;
  }

  /**
   * 获取需要跟进的客户列表
   * @param {number} days - 超过多少天未联系（默认 3 天）
   * @returns {Array}
   */
  getFollowUpList(days = 3) {
    return this.store.getFollowUpCustomers(days);
  }

  /**
   * 获取 VIP 客户列表
   * @returns {Array}
   */
  getVIPCustomers() {
    const customers = this.store.list('customers');
    return customers.filter(c => c.tier === 'vip' || c.tier === 'bulk');
  }

  /**
   * 获取新客户列表
   * @returns {Array}
   */
  getNewCustomers() {
    const customers = this.store.list('customers');
    return customers.filter(c => c.tier === 'new');
  }

  /**
   * 获取大额意向客户列表
   * @returns {Array}
   */
  getBulkProspects() {
    const customers = this.store.list('customers');
    return customers.filter(c => c.tier === 'bulk');
  }

  /**
   * 生成复购促进话术
   * @param {string} customerId
   * @returns {string}
   */
  generateRepurchaseScript(customerId) {
    const customer = this.store.get('customers', customerId);

    if (!customer) {
      return '';
    }

    const tier = customer.tier;
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor((Date.now() - new Date(customer.lastOrderAt)) / (1000 * 60 * 60 * 24))
      : 0;

    if (tier === 'vip') {
      return `尊敬的 ${customer.name || '客户'}，

感谢您一直以来的支持！作为我们的 VIP 客户，您可享受二次采购专属折扣（5-10% OFF）。

最近我们上新了多款产品，如果您有采购需求，我很乐意为您提供最新报价单。

期待您的回复！

Best regards,
[Your Name]`;
    }

    if (tier === 'bulk') {
      return `尊敬的 ${customer.name || '客户'}，

您好！感谢您之前的订单支持。

针对大额采购客户，我们提供专属优惠方案：
- 阶梯优惠价格（量大从优）
- 可申请公司承担部分运费
- VIP 专属客服服务

如果您近期有采购计划，请随时联系我，我将为您申请最优价格！

Best regards,
[Your Name]`;
    }

    // 新客户复购话术
    return `尊敬的 ${customer.name || '客户'}，

感谢您首次下单！为了表达我们的诚意，新客户二次采购可享受专属优惠。

如果您对产品满意或有返单需求，请随时联系我。

期待您的再次光临！

Best regards,
[Your Name]`;
  }
}

module.exports = CustomerCRM;
