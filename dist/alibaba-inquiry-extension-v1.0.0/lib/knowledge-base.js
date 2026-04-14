/**
 * 销售话术知识库（简化版）
 * 用于 AI 调用失败时的降级回复
 */

export const SCRIPT_TEMPLATES = {
  price: {
    zh: `您好！感谢您对我们产品的关注。

关于价格，我们需要确认以下信息以便给您准确报价：
1. 您需要的产品型号和规格
2. 采购数量
3. 收货地址
4. 是否有中国的货运代理

我们提供阶梯式优惠，采购量越大，价格越优惠。请提供以上信息，我们将立即为您报价。

期待您的回复！`,
    en: `Thank you for your interest in our products!

To provide you with an accurate quote, we need to confirm:
1. Product model and specifications
2. Order quantity
3. Destination address
4. Do you have a freight forwarder in China?

We offer tiered discounts. Please provide the above information and we will quote you immediately.

Looking forward to your reply!`
  },
  sample: {
    zh: `您好！我们提供免费样品服务。

样品政策：
- 样品免费
- 客户承担运费
- 新客户/大额意向客户可申请运费优惠

请告诉我您的收货地址和需要的样品规格，我们立即为您安排！`,
    en: `Great news! We offer free samples!

Sample Policy:
- Free samples
- Customer pays shipping
- New customers may qualify for shipping discount

Please share your address and we'll arrange it immediately!`
  },
  general: {
    zh: `您好，感谢您的询盘！

我们已收到您的消息，会尽快给您回复。

如有任何问题，请随时联系我们。

祝好！`,
    en: `Thank you for your inquiry!

We have received your message and will respond as soon as possible.

If you have any questions, please feel free to contact us.

Best regards!`
  }
};

/**
 * 检测消息语言
 * @param {Array|string} messages - 消息数组或文本
 * @returns {string} 语言代码：zh | en | es | fr | de
 */
export function detectLanguage(messages) {
  const text = Array.isArray(messages)
    ? messages.map(m => m.content).join(' ').toLowerCase()
    : messages.toLowerCase();

  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  if (/\b(hola|qué|cómo|gracias)\b/i.test(text)) return 'es';
  if (/\b(bonjour|merci)\b/i.test(text)) return 'fr';
  if (/\b(hallo|danke)\b/i.test(text)) return 'de';
  return 'en';
}

/**
 * 分析客户意图
 * @param {Array|string} messages - 消息数组或文本
 * @returns {string} 意图类型：price | sample | payment | shipping | customization | after-sales | general
 */
export function analyzeIntent(messages) {
  const text = Array.isArray(messages)
    ? messages.map(m => m.content).join(' ').toLowerCase()
    : messages.toLowerCase();

  if (/\b(price|cost|quote|报价 | 价格)\b/i.test(text)) return 'price';
  if (/\b(sample|free sample|样品 | 试用)\b/i.test(text)) return 'sample';
  if (/\b(payment|pay|付款 | 支付)\b/i.test(text)) return 'payment';
  if (/\b(shipping|delivery|物流 | 运费)\b/i.test(text)) return 'shipping';
  if (/\b(customize|OEM|定制)\b/i.test(text)) return 'customization';
  if (/\b(damaged|return|refund|退货 | 退款)\b/i.test(text)) return 'after-sales';

  return 'general';
}
