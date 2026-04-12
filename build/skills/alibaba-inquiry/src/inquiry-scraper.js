const { delay } = require('./config');

class InquiryScraper {
  constructor(page, config) {
    this.page = page;
    this.config = config;
  }

  /**
   * 获取询盘列表
   * 返回：[{ id, sender, subject, time, preview, unread }]
   */
  async getInquiryList() {
    try {
      // 等待列表加载 - 阿里巴巴使用 .ui2-list-body 作为列表容器
      await this.page.waitForSelector('.ui2-list-body, .inquiry-list, .aui-inquirylist-grid-container', {
        timeout: 10000
      }).catch(() => null);

      const inquiries = await this.page.evaluate(() => {
        // 阿里巴巴国际站实际使用的选择器
        const selectors = [
          '.ui2-list-body .inquiry-item',
          '.inquiry-list .inquiry-item',
          '.aui-inquirylist-grid-container .inquiry-item',
          '._l1ListWrap_-uoFL- .inquiry-item'
        ];

        let items = [];
        for (const selector of selectors) {
          items = document.querySelectorAll(selector);
          if (items.length > 0) break;
        }

        return Array.from(items).map((item, index) => {
          return {
            index,
            sender: item.querySelector('.buyer-name, .contact-name, .member-name')?.textContent?.trim() ||
                    item.querySelector('[class*="buyer"]')?.textContent?.trim() || 'Unknown',
            subject: item.querySelector('.subject, .title, .inquiry-subject')?.textContent?.trim() ||
                     item.querySelector('[class*="subject"]')?.textContent?.trim() || 'No Subject',
            time: item.querySelector('.time, .date, .inquiry-time')?.textContent?.trim() ||
                  item.querySelector('[class*="time"]')?.textContent?.trim() || '',
            preview: item.querySelector('.preview, .summary, .content')?.textContent?.trim() || '',
            unread: item.classList.contains('unread') ||
                    item.classList.contains('inquiry-recent') ||
                    item.querySelector('.unread') !== null ||
                    item.querySelector('[class*="unread"]') !== null
          };
        });
      });

      return inquiries;
    } catch (error) {
      console.error('获取询盘列表失败:', error.message);
      return [];
    }
  }

  /**
   * 点击第一个询盘
   * @param {number} initialPageCount - 点击前的标签页数量，用于检测是否打开新标签页
   */
  async clickFirstInquiry(initialPageCount = 1) {
    try {
      const currentUrl = this.page.url();

      // 使用 Playwright 的 click
      await this.page.click('.ui2-list-body .inquiry-item:first-child');

      // 等待 URL 变化（当前标签页内跳转）
      try {
        await this.page.waitForFunction(
          (initialUrl) => window.location.href !== initialUrl,
          currentUrl,
          { timeout: 3000 }
        );
        console.log('✓ URL 已变化（当前标签页内跳转）');
      } catch (e) {
        // URL 没变化，可能是打开了新标签页
        console.log('⚠️  URL 未变化，可能是打开了新标签页');
      }

      // 等待详情页内容加载
      await this.page.waitForSelector('.buyer-chat-msg, .chat-message', { timeout: 5000 })
        .catch(() => console.log('⚠️  未检测到聊天消息元素'));

      await delay(2000, 4000);
      return true;
    } catch (error) {
      console.error('点击询盘失败:', error.message);
      // 尝试备用选择器
      try {
        await this.page.click('.inquiry-list .inquiry-item:first-child');
        await delay(2000, 4000);
        return true;
      } catch (e2) {
        console.error('备用点击也失败:', e2.message);
        return false;
      }
    }
  }

  /**
   * 获取聊天历史记录
   * 返回：[{ sender: 'buyer' | 'seller', content, time }]
   */
  async getChatHistory() {
    try {
      // 等待聊天内容加载 - 阿里巴巴使用 .buyer-chat-msg 作为消息项
      await this.page.waitForSelector('.buyer-chat-msg, .chat-message, .message-list', {
        timeout: 10000
      }).catch(() => null);

      const history = await this.page.evaluate(() => {
        // 阿里巴巴国际站实际使用的选择器
        const selectors = [
          '.buyer-chat-msg',
          '.chat-message',
          '.message-list .message',
          '.conversation .message-item',
          '[class*="chat-msg"]',
          '[class*="message-item"]'
        ];

        let messages = [];
        for (const selector of selectors) {
          messages = document.querySelectorAll(selector);
          if (messages.length > 0) break;
        }

        return Array.from(messages).map(msg => {
          // 检查是否是买家消息
          const isBuyer = msg.classList.contains('buyer-chat-msg') ||
                          msg.classList.contains('buyer') ||
                          msg.classList.contains('customer') ||
                          msg.querySelector('.buyer-chat-msg') !== null ||
                          msg.querySelector('.buyer') !== null;

          // 获取消息内容
          let content = msg.textContent?.trim() || '';

          // 移除可能的图标文本和其他非内容元素
          content = content.replace(/^\s+/, '').replace(/\s+$/, '');

          return {
            sender: isBuyer ? 'buyer' : 'seller',
            content: content,
            time: msg.querySelector('.time, .timestamp, [class*="time"]')?.textContent?.trim() || ''
          };
        });
      });

      return history;
    } catch (error) {
      console.error('获取聊天记录失败:', error.message);
      return [];
    }
  }

  /**
   * 填充回复内容到输入框
   */
  async fillReply(content) {
    try {
      // 先点击 .mock-reply 激活编辑器
      await this.page.click('.mock-reply');
      await delay(500, 1000);

      // 使用 TinyMCE API 填充内容
      const success = await this.page.evaluate((text) => {
        if (!window.tinymce) {
          console.log('TinyMCE 不存在');
          return false;
        }

        // 获取编辑器实例
        const editor = window.tinymce.get('normal-im-send');
        if (!editor) {
          console.log('未找到编辑器实例 normal-im-send');
          // 尝试找第一个编辑器
          const editors = window.tinymce.editors;
          if (editors && Object.keys(editors).length > 0) {
            const firstEditor = editors[Object.keys(editors)[0]];
            if (firstEditor) {
              firstEditor.setContent(text);
              console.log('使用第一个编辑器设置内容');
              return true;
            }
          }
          return false;
        }

        // 设置内容
        editor.setContent(text);

        // 触发事件
        editor.fire('change');
        editor.fire('input');

        // 同时更新底层 textarea
        const textarea = document.querySelector('#normal-im-send');
        if (textarea) {
          textarea.value = text;
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        console.log('回复已填充到 TinyMCE 编辑器');
        return true;
      }, content);

      if (!success) {
        console.warn('未找到回复输入框');
        console.log('💡 提示：请先在浏览器中点击回复区域，激活输入框');
        return false;
      }

      console.log('✓ 回复内容已填充到输入框');
      return true;
    } catch (error) {
      console.error('填充回复失败:', error.message);
      return false;
    }
  }

  /**
   * 获取当前页面 URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * 检查是否在询盘详情页
   */
  async isInquiryDetail() {
    const url = this.getCurrentUrl();
    return url.includes('detail') || url.includes('message') || url.includes('conversation');
  }
}

module.exports = InquiryScraper;
