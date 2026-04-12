const OpenAI = require('openai');
const { loadConfig, getEnv } = require('./config');

class AIReplier {
  constructor() {
    this.config = loadConfig().llm || {};

    const apiKey = getEnv('LLM_API_KEY', this.config.apiKey);
    const baseUrl = getEnv('LLM_BASE_URL', this.config.baseUrl);
    const model = getEnv('LLM_MODEL', this.config.model);

    this.model = model;

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: baseUrl
      });
    } else {
      this.client = null;
    }
  }

  /**
   * 检测消息语言
   */
  detectLanguage(messages) {
    // 简单启发式：检查常见语言特征
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    // 中文特征
    if (/[\u4e00-\u9fa5]/.test(text)) {
      return 'zh';
    }
    // 西班牙语特征
    if (/\b(hola|qué|cómo|gracias|por favor|saludos)\b/i.test(text)) {
      return 'es';
    }
    // 法语特征
    if (/\b(bonjour|merci|s'il vous plaît|cordialement)\b/i.test(text)) {
      return 'fr';
    }
    // 德语特征
    if (/\b(hallo|danke|mit freundlichen grüßen)\b/i.test(text)) {
      return 'de';
    }
    // 葡萄牙语特征
    if (/\b(olá|obrigado|por favor|cumprimentos)\b/i.test(text)) {
      return 'pt';
    }
    // 阿拉伯语特征
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar';
    }
    // 俄语特征
    if (/[\u0400-\u04FF]/.test(text)) {
      return 'ru';
    }
    // 默认英语
    return 'en';
  }

  /**
   * 生成回复建议
   */
  async generateReply(chatHistory, tone = 'professional') {
    if (!this.client) {
      console.warn('⚠️  未配置 API Key，无法生成 AI 回复');
      return this.getFallbackReply(chatHistory);
    }

    // 直接使用 chatHistory 数组检测语言
    const language = this.detectLanguage(chatHistory);
    const messages = this.formatChatHistory(chatHistory);

    const systemPrompt = this.getSystemPrompt(tone, language);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `以下是与客户的聊天记录，请生成合适的回复：\n\n${messages}`
          }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI 回复生成失败:', error.message);
      return this.getFallbackReply(chatHistory);
    }
  }

  getSystemPrompt(tone, language) {
    const prompts = {
      en: `You are a professional sales representative responding to customer inquiries on Alibaba.
Tone: ${tone === 'professional' ? 'Professional, friendly, and helpful' : 'Friendly and casual'}.
- Address customer concerns directly
- Be concise and clear
- Include a professional closing
- Do not use emojis`,

      zh: `你是一名专业的阿里巴巴销售代表，正在回复客户咨询。
语气：${tone === 'professional' ? '专业、友好、乐于助人' : '友好、轻松'}。
- 直接回应客户关心的问题
- 简洁明了
- 使用专业的结尾
- 不使用表情符号`,

      es: `Eres un representante de ventas profesional respondiendo consultas de clientes en Alibaba.
Tono: ${tone === 'professional' ? 'Profesional, amable y servicial' : 'Amable y casual'}.
- Responde directamente las preocupaciones del cliente
- Sé conciso y claro
- Incluye un cierre profesional
- No uses emojis`,

      fr: `Vous êtes un représentant commercial professionnel répondant aux demandes de renseignements sur Alibaba.
Ton: ${tone === 'professional' ? 'Professionnel, amical et serviable' : 'Amical et décontracté'}.
- Répondez directement aux préoccupations du client
- Soyez concis et clair
- Incluez une conclusion professionnelle
- N'utilisez pas d'emojis`,

      de: `Sie sind ein professioneller Vertriebsmitarbeiter, der Kundenanfragen auf Alibaba beantwortet.
Ton: ${tone === 'professional' ? 'Professionell, freundlich und hilfreich' : 'Freundlich und locker'}.
- Gehen Sie direkt auf die Anliegen des Kunden ein
- Seien Sie prägnant und klar
- Fügen Sie einen professionellen Abschluss hinzu
- Verwenden Sie keine Emojis`,

      pt: `Você é um representante de vendas profissional respondendo a consultas de clientes no Alibaba.
Tom: ${tone === 'professional' ? 'Profissional, amigável e prestativo' : 'Amigável e casual'}.
- Responda diretamente às preocupações do cliente
- Seja conciso e claro
- Inclua um fechamento profissional
- Não use emojis`,

      ar: `أنت ممثل مبيعات محترف ترد على استفسارات العملاء على علي بابا.
النبرة: ${tone === 'professional' ? 'مهنية وودية ومفيدة' : 'ودية وغير رسمية'}.
- عالج مخاوف العميل مباشرة
- كن موجزاً وواضحاً
- ضمّن خاتمة احترافية
- لا تستخدم الرموز التعبيرية`,

      ru: `Вы профессиональный торговый представитель, отвечающий на запросы клиентов на Alibaba.
Тон: ${tone === 'professional' ? 'Профессиональный, дружелюбный и полезный' : 'Дружелюбный и непринужденный'}.
- Обратитесь непосредственно к проблемам клиента
- Будьте кратки и ясны
- Включите профессиональное завершение
- Не используйте эмодзи`
    };

    return prompts[language] || prompts.en;
  }

  formatChatHistory(chatHistory) {
    return chatHistory.map(msg => {
      const sender = msg.sender === 'buyer' ? '客户' : '我方';
      return `[${sender}]: ${msg.content}`;
    }).join('\n\n');
  }

  getFallbackReply(chatHistory) {
    // 当 AI 不可用时，返回一个占位符
    const lastMessage = chatHistory[chatHistory.length - 1];
    return `Thank you for your inquiry. We have received your message and will get back to you shortly.

Best regards,
[Your Name]`;
  }
}

module.exports = AIReplier;
