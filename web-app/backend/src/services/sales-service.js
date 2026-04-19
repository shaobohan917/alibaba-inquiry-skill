const intentRank = {
  urgent: 95,
  high: 82,
  medium: 58,
  low: 34,
};

export class SalesService {
  constructor(repositories) {
    this.customers = repositories.customers;
    this.inquiries = repositories.inquiries;
    this.tasks = repositories.tasks;
  }

  getOverview() {
    const recentInquiries = this.inquiries.search({ limit: 200 });
    const customers = this.customers.search({ limit: 200 });
    const salesTasks = this.tasks.search({ type: 'sales', limit: 200 });

    return {
      inquiryCount: recentInquiries.length,
      newInquiryCount: recentInquiries.filter((inquiry) => inquiry.status === 'new').length,
      urgentInquiryCount: recentInquiries.filter((inquiry) => inquiry.priority === 'urgent').length,
      highIntentCustomerCount: this.getLeads({ limit: 200 }).filter((lead) => lead.intent === '高').length,
      followUpTaskCount: salesTasks.filter((task) => ['pending', 'running', 'blocked'].includes(task.status)).length,
      customerCount: customers.length,
    };
  }

  getLeads({ limit = 20 } = {}) {
    const customers = this.customers.search({ limit: 200 });
    const inquiries = this.inquiries.search({ limit: 500 });

    return customers
      .map((customer) => {
        const customerInquiries = inquiries.filter((inquiry) => inquiry.customer_id === customer.id);
        const latestInquiry = customerInquiries[0] ?? null;
        const score = this.scoreLead(customer, customerInquiries);

        return {
          id: customer.id,
          customer: customer.company_name,
          contactName: customer.contact_name,
          country: customer.country,
          intent: this.intentLabel(score),
          score,
          action: this.recommendAction(customer, latestInquiry, score),
          status: customer.status,
          priority: latestInquiry?.priority ?? 'medium',
          inquiryCount: customerInquiries.length,
          lastContactedAt: customer.last_contacted_at,
          latestInquiryAt: latestInquiry?.received_at,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  createReplyDraft(payload) {
    const message = normalizeText(payload.message);
    const productName = normalizeText(payload.productName ?? payload.product_name);
    const quantity = normalizeText(payload.quantity);
    const targetPrice = normalizeText(payload.targetPrice ?? payload.target_price);
    const currency = normalizeText(payload.currency) || 'USD';
    const customerName = normalizeText(payload.customerName ?? payload.customer_name) || 'there';
    const score = this.scoreMessage(message, quantity, targetPrice);
    const intent = this.intentLabel(score);
    const strategy = this.replyStrategy({ intent, quantity, targetPrice });
    const nextActions = this.nextActions({ intent, quantity, targetPrice });
    const reply = [
      `Hi ${customerName},`,
      '',
      `Thank you for your inquiry${productName ? ` about ${productName}` : ''}. We can support your request and will prepare a suitable quotation based on your quantity, destination, and packaging requirements.`,
      quantity ? `For ${quantity}, we can check the best tier price and production schedule for you.` : 'Could you share the estimated order quantity so we can offer the right price tier?',
      targetPrice
        ? `We noticed your target price is ${targetPrice} ${currency}. I will review it with our team and confirm the closest workable offer.`
        : 'If you have a target price or reference specification, please send it over and I will match it as closely as possible.',
      '',
      'To move forward, please confirm:',
      '1. Quantity and delivery country',
      '2. Product specification or reference photo',
      '3. Required packaging and delivery time',
      '',
      'Best regards,',
      '[Your Name]',
    ].join('\n');

    return {
      reply,
      intent,
      intentScore: score,
      strategy,
      nextActions,
      generatedAt: new Date().toISOString(),
    };
  }

  createFollowUpTask(payload) {
    const customerId = payload.customerId ?? payload.customer_id;
    const inquiryId = payload.inquiryId ?? payload.inquiry_id;

    return this.tasks.create({
      title: payload.title ?? '跟进高意向询盘',
      description: payload.description ?? '业务员 Agent 根据询盘意向生成跟进任务。',
      type: 'sales',
      status: 'pending',
      priority: payload.priority ?? 'high',
      assigned_agent: 'sales',
      related_customer_id: customerId,
      related_inquiry_id: inquiryId,
      due_at: payload.dueAt ?? payload.due_at,
      metadata: {
        source: 'sales-api',
        action: payload.action ?? 'follow_up',
      },
    });
  }

  scoreLead(customer, inquiries) {
    const latestInquiry = inquiries[0];
    let score = latestInquiry ? intentRank[latestInquiry.priority] ?? 50 : 40;

    if (['negotiating', 'qualified', 'won'].includes(customer.status)) {
      score += 12;
    }

    if (inquiries.length >= 3) {
      score += 8;
    }

    if (customer.last_contacted_at) {
      const days = daysSince(customer.last_contacted_at);
      if (days <= 3) {
        score += 5;
      }
    }

    return Math.min(score, 100);
  }

  scoreMessage(message, quantity, targetPrice) {
    let score = 45;
    const lower = message.toLowerCase();

    if (/(price|quote|quotation|cost|报价|价格)/i.test(lower)) {
      score += 15;
    }

    if (/(sample|样品)/i.test(lower)) {
      score += 8;
    }

    if (/(urgent|asap|soon|急|马上)/i.test(lower)) {
      score += 12;
    }

    if (quantity) {
      score += 10;
    }

    if (targetPrice) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  intentLabel(score) {
    if (score >= 78) {
      return '高';
    }
    if (score >= 55) {
      return '中';
    }
    return '低';
  }

  recommendAction(customer, latestInquiry, score) {
    if (!latestInquiry) {
      return '补充客户画像';
    }

    if (score >= 78 && latestInquiry.target_price) {
      return '发送阶梯报价';
    }

    if (score >= 78) {
      return '确认数量并报价';
    }

    if (customer.status === 'new') {
      return '补充认证资料';
    }

    return '安排跟进提醒';
  }

  replyStrategy({ intent, quantity, targetPrice }) {
    if (intent === '高') {
      return targetPrice ? '先确认目标价可行性，再给阶梯报价和交期。' : '优先确认规格和数量，尽快输出正式报价。';
    }

    if (quantity) {
      return '用数量做价格锚点，引导客户补充交付国家和包装要求。';
    }

    return '先降低沟通门槛，索取数量、规格和目的国。';
  }

  nextActions({ intent, quantity, targetPrice }) {
    const actions = ['确认目的国和交期', '补齐规格或参考图'];

    if (!quantity) {
      actions.unshift('询问采购数量');
    }

    if (targetPrice) {
      actions.push('核算目标价可行性');
    }

    if (intent === '高') {
      actions.push('创建 24 小时跟进任务');
    }

    return actions;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function daysSince(dateValue) {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}
