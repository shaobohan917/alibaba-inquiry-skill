/**
 * AI 回复生成器
 * 调用大模型 API 生成专业回复
 */

import { LLM_CONFIG } from '../config/default-config.js';
import { SCRIPT_TEMPLATES, detectLanguage, analyzeIntent } from './knowledge-base.js';

export class AIReplier {
  constructor() {
    this.config = LLM_CONFIG;
    this.knowledgeBase = null;
  }

  /**
   * 生成回复
   * @param {Array} chatHistory - 聊天记录 [{sender: 'buyer'|'seller', content: string}]
   * @param {string} tone - 语气：professional | friendly
   * @returns {Promise<string>} AI 生成的回复
   */
  async generateReply(chatHistory, tone = 'professional') {
    try {
      // 1. 检测语言
      const language = detectLanguage(chatHistory);

      // 2. 分析意图
      const intent = analyzeIntent(chatHistory);

      // 3. 调用 AI API
      const reply = await this.callLLM(chatHistory, language, intent, tone);

      return reply;
    } catch (error) {
      console.error('AI 回复生成失败，使用话术模板:', error.message);
      // 降级到本地话术模板
      return this.getFallbackReply(chatHistory);
    }
  }

  /**
   * 调用大模型 API
   * @param {Array} chatHistory - 聊天记录
   * @param {string} language - 语言代码
   * @param {string} intent - 意图类型
   * @param {string} tone - 语气
   * @returns {Promise<string>}
   */
  async callLLM(chatHistory, language, intent, tone) {
    const messages = this.formatMessages(chatHistory, language);

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 500,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 格式化消息
   * @param {Array} chatHistory - 聊天记录
   * @param {string} language - 语言代码
   * @returns {Array} 格式化后的消息数组
   */
  formatMessages(chatHistory, language) {
    const systemPrompt = this.getSystemPrompt(language);

    const formattedHistory = chatHistory.map(msg => ({
      role: msg.sender === 'buyer' ? 'user' : 'assistant',
      content: msg.content
    }));

    return [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: '请生成专业回复：' }
    ];
  }

  /**
   * 获取系统提示
   * @param {string} language - 语言代码
   * @returns {string} 系统提示词
   */
  getSystemPrompt(language) {
    const prompts = {
      zh: '你是一名专业的阿里巴巴销售代表，正在回复客户咨询。语气专业、友好、乐于助人。直接回应客户关心的问题，简洁明了，使用专业的结尾，不使用表情符号。',
      en: 'You are a professional sales representative responding to customer inquiries on Alibaba. Tone: Professional, friendly, and helpful. Address customer concerns directly, be concise, include a professional closing, do not use emojis.',
      es: 'Eres un representante de ventas profesional respondiendo consultas de clientes en Alibaba. Tono: Profesional, amable y servicial.',
      fr: 'Vous êtes un représentant commercial professionnel répondant aux demandes de renseignements sur Alibaba. Ton: Professionnel, amical et serviable.'
    };

    return prompts[language] || prompts.en;
  }

  /**
   * 获取降级回复（话术模板）
   * @param {Array} chatHistory - 聊天记录
   * @returns {string} 降级回复文本
   */
  getFallbackReply(chatHistory) {
    const language = detectLanguage(chatHistory);
    const intent = analyzeIntent(chatHistory);

    return SCRIPT_TEMPLATES[intent]?.[language] ||
      SCRIPT_TEMPLATES.general[language] ||
      SCRIPT_TEMPLATES.general.en;
  }
}

// 导出单例
export const aiReplier = new AIReplier();
