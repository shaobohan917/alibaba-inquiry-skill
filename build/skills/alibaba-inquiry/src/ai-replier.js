const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { loadConfig, getEnv } = require('./config');

// 知识库路径
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'docs', 'knowledge-base.md');

class AIReplier {
  constructor() {
    this.config = loadConfig().llm || {};

    const apiKey = getEnv('LLM_API_KEY', this.config.apiKey);
    const baseUrl = getEnv('LLM_BASE_URL', this.config.baseUrl);
    const model = getEnv('LLM_MODEL', this.config.model);

    this.model = model;
    this.knowledgeBase = this.loadKnowledgeBase();

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
   * 加载知识库
   */
  loadKnowledgeBase() {
    try {
      if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
        const content = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
        console.log('📚 知识库已加载');
        return content;
      }
    } catch (error) {
      console.warn('⚠️  知识库加载失败:', error.message);
    }
    return null;
  }

  /**
   * 分析客户意图
   */
  analyzeIntent(messages) {
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    // 价格咨询
    if (/\b(price|cost|quote|quotation|discount|cheap|expensive|budget|报价 | 价格 | 便宜 | 贵|折扣)\b/i.test(text)) {
      return 'price';
    }
    // 样品请求
    if (/\b(sample|free sample|testing|试单 | 样品 | 试用)\b/i.test(text)) {
      return 'sample';
    }
    // 付款问题
    if (/\b(payment|pay|transfer|T\/T|western union|money|付款 | 支付 | 转账)\b/i.test(text)) {
      return 'payment';
    }
    // 物流咨询
    if (/\b(shipping|delivery|freight|logistics|transport|ship|发货 | 物流 | 运费 | 运输)\b/i.test(text)) {
      return 'shipping';
    }
    // 定制需求
    if (/\b(customize|OEM|ODM|logo|packaging|label|定制 | 贴牌 | 包装)\b/i.test(text)) {
      return 'customization';
    }
    // 售后问题
    if (/\b(damaged|broken|defect|return|refund|complaint|损坏 | 退货 | 退款 | 投诉)\b/i.test(text)) {
      return 'after-sales';
    }
    // 新客户
    if (/\b(first time|new customer|interested|cooperate|合作 | 首次)\b/i.test(text)) {
      return 'new-customer';
    }

    return 'general';
  }

  /**
   * 获取话术模板
   */
  getScriptTemplate(intent, language) {
    const templates = {
      'price': {
        zh: `您好！感谢您对我们产品的关注。

关于价格，我们需要确认以下信息以便给您准确报价：
1. 您需要的产品型号和规格
2. 采购数量
3. 收货地址
4. 是否有中国的货运代理

我们提供阶梯式优惠，采购量越大，价格越优惠。请提供以上信息，我们将立即为您报价。

期待您的回复！`,
        en: `Thank you for your interest in our products!

To provide you with an accurate quote, we need to confirm the following:
1. Product model and specifications
2. Order quantity
3. Destination address
4. Do you have a freight forwarder in China?

We offer tiered discounts - the larger the order, the better the price. Please provide the above information and we will quote you immediately.

Looking forward to your reply!`,
        fr: `Merci de votre intérêt pour nos produits !

Pour vous fournir un devis précis, nous avons besoin de confirmer :
1. Modèle et spécifications du produit
2. Quantité de commande
3. Adresse de destination
4. Avez-vous un transitaire en Chine ?

Nous offrons des remises dégressives. N'hésitez pas à nous contacter.`,
        es: `¡Gracias por su interés en nuestros productos!

Para darle una cotización precisa, necesitamos confirmar:
1. Modelo y especificaciones del producto
2. Cantidad del pedido
3. Dirección de destino
4. ¿Tiene un agente de carga en China?

Ofrecemos descuentos por volumen. ¡Esperamos su respuesta!`
      },
      'sample': {
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
- New customers/bulk order prospects may qualify for shipping discount

Please share your address and required sample specifications, and we'll arrange it immediately!`,
        fr: `Bonne nouvelle ! Nous offrons des échantillons gratuits !

Politique d'échantillons :
- Échantillons gratuits
- Frais de port à la charge du client
- Des réductions possibles pour nouveaux clients

Partagez-nous votre adresse et nous organiserons l'envoi immédiatement !`,
        es: `¡Buenas noticias! ¡Ofrecemos muestras gratis!

Política de muestras:
- Muestras gratuitas
- Cliente paga envío
- Descuentos disponibles para nuevos clientes

¡Comparta su dirección y lo organizaremos de inmediato!`
      },
      'payment': {
        zh: `您好！关于付款方式，我们接受以下方式：

1. T/T 电汇（推荐）
2. 信用证 (L/C)
3. 西联汇款
4. 支付宝（仅限国内客户）

如您遇到付款问题，请检查：
- 订单详情中的"付款记录"
- 账户余额是否充足（含手续费）
- 垃圾邮件箱（可能有安全验证链接）

如有其他问题，请随时联系我们！`,
        en: `We accept the following payment methods:

1. T/T Bank Transfer (Recommended)
2. Letter of Credit (L/C)
3. Western Union
4. Alipay (Domestic customers only)

If you encounter payment issues, please check:
- "Payment Record" in order details
- Account balance (including fees)
- Spam folder (security verification link)

Feel free to contact us for any assistance!`,
        fr: `Nous acceptons les modes de paiement suivants :

1. Virement bancaire T/T
2. Lettre de crédit (L/C)
3. Western Union
4. Alipay (clients domestiques uniquement)

En cas de problème, vérifiez votre solde et votre dossier spam.`,
        es: `Aceptamos los siguientes métodos de pago:

1. Transferencia bancaria T/T
2. Carta de crédito (L/C)
3. Western Union
4. Alipay (solo clientes nacionales)

¡Contáctenos si tiene problemas!`
      },
      'shipping': {
        zh: `您好！关于运费和时效，以下是我们的运输方案：

运输方式及时效：
- 快递（DHL/FedEx/UPS）：3-7 个工作日
- 空运：7-15 个工作日
- 海运：20-45 天

我们可以提供：
- FOB 离岸价
- CIF 到岸价
- DDP 包税到门

请提供收货地址和产品数量，我们立即为您计算运费！`,
        en: `Here are our shipping options:

Delivery Time:
- Express (DHL/FedEx/UPS): 3-7 business days
- Air freight: 7-15 business days
- Sea freight: 20-45 days

We offer:
- FOB
- CIF
- DDP (door-to-door with tax included)

Please provide your address and quantity for a shipping quote!`,
        fr: `Voici nos options d'expédition :

Délais :
- Express (DHL/FedEx/UPS) : 3-7 jours ouvrables
- Aérien : 7-15 jours ouvrables
- Maritime : 20-45 jours

Nous proposons FOB, CIF et DDP.`,
        es: `Opciones de envío:

Tiempos:
- Express: 3-7 días hábiles
- Aéreo: 7-15 días hábiles
- Marítimo: 20-45 días

Ofrecemos FOB, CIF y DDP. ¡Contáctenos para cotización!`
      },
      'customization': {
        zh: `您好！我们支持定制服务。

定制选项：
- Logo 定制
- 包装定制
- 规格/颜色定制
- 免费设计稿确认

定制起订量：通常 500 件起
定制周期：7-15 天

请告诉我您的具体需求，我们为您提供详细方案！`,
        en: `We support customization services!

Options:
- Logo customization
- Packaging customization
- Size/Color customization
- Free design proof

MOQ: 500+ pieces
Lead time: 7-15 days

Please share your requirements for a detailed proposal!`,
        fr: `Nous proposons des services de personnalisation !

Options :
- Logo personnalisé
- Emballage personnalisé
- Taille/Couleur personnalisée
- Preuve gratuite

MOQ : 500+ pièces | Délai : 7-15 jours`,
        es: `¡Ofrecemos servicios de personalización!

Opciones:
- Logo personalizado
- Empaque personalizado
- Tamaño/Color personalizado
- Muestra gratis

MOQ: 500+ piezas | Tiempo: 7-15 días`
      },
      'after-sales': {
        zh: `非常抱歉给您带来不便！我们非常重视您的问题。

为了尽快解决，请您提供：
1. 产品照片/视频（显示损坏情况）
2. 订单编号
3. 具体问题描述

收到信息后，我们将立即处理：
- 如属运输损坏：安排补发或退款
- 如属质量问题：全额退款或换货

我们承诺给您一个满意的解决方案！`,
        en: `We sincerely apologize for the inconvenience! We take your issue very seriously.

To resolve this quickly, please provide:
1. Photos/Videos showing the damage
2. Order number
3. Detailed issue description

Upon receipt, we will:
- Shipping damage: Arrange replacement or refund
- Quality issues: Full refund or exchange

We promise a satisfactory solution!`,
        fr: `Nous nous excusons sincèrement pour ce désagrément !

Pour résoudre rapidement, veuillez fournir :
1. Photos/Vidéos du dommage
2. Numéro de commande
3. Description détaillée

Nous promettons une solution satisfaisante !`,
        es: `¡Nos disculpamos sinceramente!

Para resolver rápidamente, proporcione:
1. Fotos/Videos del daño
2. Número de pedido
3. Descripción detallada

¡Prometemos una solución satisfactoria!`
      }
    };

    const defaultTemplates = {
      zh: `您好，感谢您的询盘！

我们已收到您的消息，会尽快给您回复。

如有任何问题，请随时联系我们。

祝好，
[您的名字]`,
      en: `Thank you for your inquiry!

We have received your message and will respond as soon as possible.

If you have any questions, please feel free to contact us.

Best regards,
[Your Name]`,
      fr: `Merci pour votre demande !

Nous avons reçu votre message et vous répondrons dans les plus brefs délais.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
[Votre nom]`,
      es: `¡Gracias por su consulta!

Hemos recibido su mensaje y le responderemos lo antes posible.

No dude en contactarnos para cualquier pregunta.

Saludos cordiales,
[Su nombre]`
    };

    return templates[intent]?.[language] || defaultTemplates[language] || defaultTemplates.en;
  }

  /**
   * 检测消息语言
   */
  detectLanguage(messages) {
    // 简单启发式：检查常见语言特征
    const text = Array.isArray(messages) ? messages.map(m => m.content).join(' ').toLowerCase() : messages.toLowerCase();

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
   * 生成回复（基于知识库话术匹配）
   */
  async generateReply(chatHistory, tone = 'professional') {
    // 1. 检测语言
    const language = this.detectLanguage(chatHistory);

    // 2. 分析客户意图
    const intent = this.analyzeIntent(chatHistory);
    console.log(`📝 客户意图：${intent} | 语言：${language}`);

    // 3. 获取话术模板
    const scriptTemplate = this.getScriptTemplate(intent, language);

    // 4. 如果配置了 AI，使用 AI 优化话术
    if (this.client && this.knowledgeBase) {
      try {
        const messages = this.formatChatHistory(chatHistory);
        const systemPrompt = this.getSystemPrompt(tone, language);

        const response = await this.client.chat.completions.create({
          model: this.model,
          max_tokens: 500,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}\n\n以下是销售话术知识库供参考：\n${this.knowledgeBase.substring(0, 2000)}...`
            },
            {
              role: 'user',
              content: `聊天记录:\n${messages}\n\n请根据以上记录和话术库，生成专业回复：`
            }
          ]
        });

        return response.choices[0].message.content;
      } catch (error) {
        console.error('AI 优化失败，使用话术模板:', error.message);
      }
    }

    // 5. 返回话术模板
    return scriptTemplate;
  }

  getFallbackReply(chatHistory) {
    const language = this.detectLanguage(chatHistory);
    return this.getScriptTemplate('general', language);
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
