/**
 * ตัวเรนเดอร์แบบเพิ่มส่วน - Incremental Renderer
 * ใช้สำหรับการเรนเดอร์ข้อความแบบเพิ่มส่วนโดยเฉพาะ เพื่อหลีกเลี่ยงการกระตุกของอินเทอร์เฟซ
 * เรนเดอร์เฉพาะข้อความในชั้นล่าสุดเท่านั้น ข้อความประวัติจะใช้แคช
 */

class IncrementalRenderer {
  constructor() {
    this.processedMessageIds = new Set(); // ID ข้อความที่ประมวลผลแล้ว
    this.cachedRenderedMessages = new Map(); // แคช HTML ของข้อความที่เรนเดอร์แล้ว
    this.lastProcessedMessageIndex = -1; // ดัชนีข้อความที่ประมวลผลล่าสุด
    this.lastFloorCount = 0; // จำนวนชั้นล่าสุด
    this.floorMonitor = null; // อินสแตนซ์ตัวตรวจสอบชั้น
    this.isEnabled = true;
    this.renderingInProgress = false; // ป้องกันการเรนเดอร์ซ้ำ

    // ใช้ตัวจัดการ Regular Expression แบบรวม
    this.contextMonitor =
      window['contextMonitor'] || (window['ContextMonitor'] ? new window['ContextMonitor']() : null);

    if (this.contextMonitor) {
      // รับการตั้งค่ารูปแบบจากตัวจัดการแบบรวม
      const formats = this.contextMonitor.getAllExtractorFormats();
      this.formatMatchers = {
        friend: {
          regex: formats.friend.regex,
          type: 'friend',
          fields: formats.friend.fields,
        },
        myMessage: {
          regex: formats.myMessage.regex,
          type: 'myMessage',
          fields: formats.myMessage.fields,
        },
        theirMessage: {
          regex: formats.otherMessage.regex,
          type: 'theirMessage',
          fields: formats.otherMessage.fields,
        },
        groupMessage: {
          regex: formats.groupMessage.regex,
          type: 'groupMessage',
          fields: formats.groupMessage.fields,
        },
        myGroupMessage: {
          regex: formats.myGroupMessage.regex,
          type: 'myGroupMessage',
          fields: formats.myGroupMessage.fields,
        },
      };
    } else {
      console.warn('[ตัวเรนเดอร์แบบเพิ่มส่วน] ตัวตรวจสอบบริบทไม่ได้ถูกเริ่มต้น ใช้ตัวจับคู่รูปแบบเริ่มต้น');
      // เก็บการตั้งค่าตัวจับคู่รูปแบบเดิมไว้เป็นสำรอง
      this.formatMatchers = {
        friend: {
          regex: /\[好友id\|([^|]+)\|([^|]+)\]/g,
          type: 'friend',
          fields: ['name', 'number'],
        },
        myMessage: {
          regex: /\[我方消息\|([^|]+)\|([^|]+)\|([^\]]+)\]/g,
          type: 'myMessage',
          fields: ['receiver', 'number', 'content'],
        },
        theirMessage: {
          regex: /\[对方消息\|([^|]+)\|([^|]+)\|([^\]]+)\]/g,
          type: 'theirMessage',
          fields: ['sender', 'number', 'content'],
        },
        groupMessage: {
          regex: /\[群聊消息\|([^|]+)\|([^|]+)\|([^\]]+)\]/g,
          type: 'groupMessage',
          fields: ['groupId', 'sender', 'content'],
        },
        myGroupMessage: {
          regex: /\[我方群聊消息\|([^|]+)\|我\|([^\]]+)\]/g,
          type: 'myGroupMessage',
          fields: ['groupId', 'content'],
        },
      };
    }

    this.init();
  }

  init() {
    console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] กำลังเริ่มต้น...');
    this.setupFloorMonitor();
    this.initializeCache();
  }

  // ตั้งค่าตัวตรวจสอบชั้น
  setupFloorMonitor() {
    try {
      // ใช้ตัวตรวจสอบชั้นที่มีอยู่
      if (window.MobileContext && window.MobileContext.addFloorListener) {
        // ฟังเหตุการณ์การเพิ่มชั้น
        window.MobileContext.addFloorListener('onFloorAdded', data => {
          this.handleNewFloor(data);
        });

        // เริ่มต้นการตรวจสอบชั้น
        if (window.MobileContext.startFloorMonitor) {
          window.MobileContext.startFloorMonitor();
        }

        console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ ตั้งค่าตัวตรวจสอบชั้นเรียบร้อยแล้ว');
      } else {
        console.warn('[ตัวเรนเดอร์แบบเพิ่มส่วน] ตัวตรวจสอบชั้นใช้งานไม่ได้ ใช้วิธีสำรอง');
        this.setupFallbackMonitor();
      }
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] การตั้งค่าตัวตรวจสอบชั้นล้มเหลว:', error);
      this.setupFallbackMonitor();
    }
  }

  // แผนการตรวจสอบสำรอง
  setupFallbackMonitor() {
    setInterval(() => {
      this.checkForNewMessages();
    }, 2000); // ตรวจสอบทุก 2 วินาที ความถี่ต่ำกว่าเดิม
  }

  // ตรวจสอบข้อความใหม่ (แผนสำรอง)
  checkForNewMessages() {
    try {
      const currentMessages = this.getCurrentMessages();
      if (currentMessages.length > this.lastProcessedMessageIndex + 1) {
        const newMessages = currentMessages.slice(this.lastProcessedMessageIndex + 1);
        this.processNewMessages(newMessages);
      }
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] ตรวจสอบข้อความใหม่ล้มเหลว:', error);
    }
  }

  // เริ่มต้นแคช
  initializeCache() {
    try {
      // โหลดข้อความที่มีอยู่ลงในแคช
      const existingMessages = this.getCurrentMessages();
      this.lastProcessedMessageIndex = existingMessages.length - 1;

      // สร้างรายการแคชสำหรับข้อความที่มีอยู่ (แต่ยังไม่เรนเดอร์จริง)
      existingMessages.forEach((message, index) => {
        if (message.id || message.send_date) {
          const messageId = this.generateMessageId(message, index);
          this.processedMessageIds.add(messageId);
        }
      });

      console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] แคชเริ่มต้นแล้ว ประมวลผลแล้ว ${this.processedMessageIds.size} ข้อความ`);
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] การเริ่มต้นแคชล้มเหลว:', error);
    }
  }

  // จัดการชั้นใหม่
  handleNewFloor(floorData) {
    if (!this.isEnabled || this.renderingInProgress) {
      return;
    }

    console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] ตรวจพบชั้นใหม่:', floorData);

    // รับข้อความที่เพิ่มใหม่
    const newMessages = this.getNewMessages();
    if (newMessages.length > 0) {
      this.processNewMessages(newMessages);
    }
  }

  // รับข้อความใหม่
  getNewMessages() {
    try {
      const currentMessages = this.getCurrentMessages();
      const newMessages = [];

      // เริ่มตรวจสอบจากดัชนีที่ประมวลผลล่าสุด
      for (let i = this.lastProcessedMessageIndex + 1; i < currentMessages.length; i++) {
        const message = currentMessages[i];
        const messageId = this.generateMessageId(message, i);

        if (!this.processedMessageIds.has(messageId)) {
          newMessages.push({
            ...message,
            index: i,
            id: messageId,
          });
        }
      }

      return newMessages;
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] รับข้อความใหม่ล้มเหลว:', error);
      return [];
    }
  }

  // ประมวลผลข้อความใหม่
  async processNewMessages(newMessages) {
    if (this.renderingInProgress) {
      return;
    }

    this.renderingInProgress = true;

    try {
      console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ประมวลผล ${newMessages.length} ข้อความใหม่`);

      for (const message of newMessages) {
        await this.processMessage(message);

        // อัปเดตสถานะการประมวลผล
        this.processedMessageIds.add(message.id);
        this.lastProcessedMessageIndex = Math.max(this.lastProcessedMessageIndex, message.index);
      }

      // ทริกเกอร์การอัปเดตอินเทอร์เฟซ (อัปเดตเฉพาะส่วนที่เพิ่มใหม่)
      this.updateInterface();
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] ประมวลผลข้อความใหม่ล้มเหลว:', error);
    } finally {
      this.renderingInProgress = false;
    }
  }

  // ประมวลผลข้อความเดียว
  async processMessage(message) {
    try {
      if (!message.mes) {
        return;
      }

      // ตรวจสอบว่าข้อความมีรูปแบบที่ต้องเรนเดอร์หรือไม่
      const extractedData = this.extractFormatsFromMessage(message.mes);

      if (extractedData.length > 0) {
        console.log(
          `[ตัวเรนเดอร์แบบเพิ่มส่วน] ข้อความ ${message.index} ประกอบด้วย ${extractedData.length} รูปแบบ:`,
          extractedData,
        );

        // ประมวลผลแต่ละรูปแบบที่แยกออกมา
        for (const data of extractedData) {
          await this.renderFormat(data, message);
        }

        // แคชผลลัพธ์การเรนเดอร์
        this.cacheMessageRender(message, extractedData);
      }
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] ประมวลผลข้อความล้มเหลว:', error);
    }
  }

  // แยกรูปแบบออกจากข้อความ
  extractFormatsFromMessage(messageText) {
    const extractedData = [];

    Object.entries(this.formatMatchers).forEach(([formatName, matcher]) => {
      const regex = new RegExp(matcher.regex.source, matcher.regex.flags);
      let match;

      while ((match = regex.exec(messageText)) !== null) {
        const data = {
          type: matcher.type,
          fullMatch: match[0],
          index: match.index,
          fields: {},
        };

        // เติมฟิลด์
        matcher.fields.forEach((fieldName, index) => {
          data.fields[fieldName] = match[index + 1] || '';
        });

        extractedData.push(data);
      }
    });

    return extractedData;
  }

  // เรนเดอร์รูปแบบ
  async renderFormat(formatData, message) {
    try {
      switch (formatData.type) {
        case 'friend':
          await this.renderFriend(formatData.fields, message);
          break;
        case 'myMessage':
          await this.renderMyMessage(formatData.fields, message);
          break;
        case 'theirMessage':
          await this.renderTheirMessage(formatData.fields, message);
          break;
        case 'groupMessage':
          await this.renderGroupMessage(formatData.fields, message);
          break;
        case 'myGroupMessage':
          await this.renderMyGroupMessage(formatData.fields, message);
          break;
        default:
          console.warn('[ตัวเรนเดอร์แบบเพิ่มส่วน] ประเภทรูปแบบที่ไม่รู้จัก:', formatData.type);
      }
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] เรนเดอร์รูปแบบล้มเหลว:', error);
    }
  }

  // เรนเดอร์ข้อมูลเพื่อน
  async renderFriend(fields, message) {
    if (window.friendRenderer) {
      await window.friendRenderer.addFriend(fields.name, fields.number);
    }
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ เพิ่มเพื่อนแล้ว: ${fields.name} (${fields.number})`);
  }

  // เรนเดอร์ข้อความฝ่ายเรา
  async renderMyMessage(fields, message) {
    if (window.messageSender) {
      await window.messageSender.addMyMessage(fields.receiver, fields.number, fields.content);
    }
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ เพิ่มข้อความฝ่ายเราแล้ว: ถึง ${fields.receiver} (${fields.number})`);
  }

  // เรนเดอร์ข้อความฝ่ายตรงข้าม
  async renderTheirMessage(fields, message) {
    if (window.messageSender) {
      await window.messageSender.addTheirMessage(fields.sender, fields.number, fields.content);
    }
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ เพิ่มข้อความฝ่ายตรงข้ามแล้ว: จาก ${fields.sender} (${fields.number})`);
  }

  // เรนเดอร์ข้อความกลุ่ม
  async renderGroupMessage(fields, message) {
    if (window.groupRenderer) {
      await window.groupRenderer.addGroupMessage(fields.groupId, fields.sender, fields.content);
    }
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ เพิ่มข้อความกลุ่มแล้ว: กลุ่ม ${fields.groupId}, ผู้ส่ง ${fields.sender}`);
  }

  // เรนเดอร์ข้อความกลุ่มฝ่ายเรา
  async renderMyGroupMessage(fields, message) {
    if (window.groupRenderer) {
      await window.groupRenderer.addMyGroupMessage(fields.groupId, fields.content);
    }
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ✅ เพิ่มข้อความกลุ่มฝ่ายเราแล้ว: กลุ่ม ${fields.groupId}`);
  }

  // แคชผลลัพธ์การเรนเดอร์ข้อความ
  cacheMessageRender(message, extractedData) {
    const cacheKey = message.id;
    this.cachedRenderedMessages.set(cacheKey, {
      message: message,
      extractedData: extractedData,
      renderedAt: Date.now(),
      html: this.generateMessageHTML(extractedData),
    });
  }

  // สร้าง HTML ของข้อความ
  generateMessageHTML(extractedData) {
    return extractedData
      .map(data => {
        return `<div class="rendered-format ${data.type}">${data.fullMatch}</div>`;
      })
      .join('');
  }

  // อัปเดตอินเทอร์เฟซ (อัปเดตแบบเพิ่มส่วน)
  updateInterface() {
    try {
      // อัปเดตเฉพาะส่วนที่ระบุของ MessageApp แทนการรีเฟรชทั้งหมด
      if (window.messageApp) {
        // ทริกเกอร์การอัปเดตอินเทอร์เฟซแบบเบา
        this.updateMessageAppIncremental();
      }

      // ส่งเหตุการณ์การอัปเดตแบบเพิ่มส่วน
      this.dispatchIncrementalUpdateEvent();
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] อัปเดตอินเทอร์เฟซล้มเหลว:', error);
    }
  }

  // การอัปเดต MessageApp แบบเพิ่มส่วน
  updateMessageAppIncremental() {
    try {
      // อัปเดตเฉพาะจำนวนที่ยังไม่ได้อ่านและตัวอย่างข้อความล่าสุดของรายชื่อเพื่อน
      if (window.messageApp.currentView === 'list') {
        this.updateFriendListIncremental();
      }

      // หากอยู่ในหน้ารายละเอียดข้อความ ให้เพิ่มเฉพาะข้อความใหม่
      if (window.messageApp.currentView === 'messageDetail') {
        this.updateMessageDetailIncremental();
      }
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] การอัปเดต MessageApp แบบเพิ่มส่วนล้มเหลว:', error);
    }
  }

  // อัปเดตรายชื่อเพื่อนแบบเพิ่มส่วน
  updateFriendListIncremental() {
    // อัปเดตเฉพาะจำนวนที่ยังไม่ได้อ่านและตัวอย่างข้อความล่าสุด ไม่เรนเดอร์รายการใหม่ทั้งหมด
    const friendItems = document.querySelectorAll('.message-item');

    friendItems.forEach(item => {
      const friendId = item.getAttribute('data-friend-id');
      if (friendId) {
        // อัปเดตจำนวนที่ยังไม่ได้อ่าน
        this.updateUnreadCount(item, friendId);

        // อัปเดตตัวอย่างข้อความล่าสุด
        this.updateLastMessagePreview(item, friendId);
      }
    });
  }

  // อัปเดตรายละเอียดข้อความแบบเพิ่มส่วน
  updateMessageDetailIncremental() {
    // ในหน้ารายละเอียดข้อความ เพิ่มเฉพาะข้อความใหม่ ไม่เรนเดอร์ข้อความประวัติใหม่
    const messageContainer = document.querySelector('.message-detail-content');
    if (messageContainer && window.messageApp.currentFriendId) {
      // เพิ่มบับเบิ้ลข้อความใหม่ไปที่ท้ายคอนเทนเนอร์เท่านั้น
      this.appendNewMessageBubbles(messageContainer, window.messageApp.currentFriendId);
    }
  }

  // เพิ่มบับเบิ้ลข้อความใหม่
  appendNewMessageBubbles(container, friendId) {
    // รับข้อความล่าสุดที่ยังไม่ได้เรนเดอร์
    const recentMessages = this.getRecentMessagesForFriend(friendId);

    recentMessages.forEach(message => {
      const messageBubble = this.createMessageBubble(message);
      container.appendChild(messageBubble);
    });
  }

  // สร้างบับเบิ้ลข้อความ
  createMessageBubble(messageData) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${messageData.type}`;
    bubble.innerHTML = messageData.html;
    return bubble;
  }

  // รับข้อความปัจจุบัน
  getCurrentMessages() {
    try {
      // รับข้อความจาก window.chat
      if (window.chat && Array.isArray(window.chat)) {
        return window.chat;
      }

      // รับจากบริบทของ SillyTavern
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        return context.chat || [];
      }

      return [];
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] รับข้อความปัจจุบันล้มเหลว:', error);
      return [];
    }
  }

  // สร้าง ID ข้อความ
  generateMessageId(message, index) {
    // พยายามใช้วิธีต่างๆ เพื่อสร้าง ID ที่ไม่ซ้ำกัน
    if (message.id) {
      return `msg_${message.id}`;
    }
    if (message.send_date) {
      return `msg_${message.send_date}_${index}`;
    }
    // ใช้แฮชของเนื้อหาข้อความเป้นทางเลือก
    const content = message.mes || '';
    const hash = this.simpleHash(content, index);
    return `msg_${contentHash}_${index}`;
  }

  // ฟังก์ชันแฮชอย่างง่าย
  simpleHash(str, seed = 0) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  // ส่งเหตุการณ์การอัปเดตแบบเพิ่มส่วน
  dispatchIncrementalUpdateEvent() {
    try {
      const event = new CustomEvent('incrementalRenderUpdate', {
        detail: {
          timestamp: Date.now(),
          processedCount: this.processedMessageIds.size,
          lastIndex: this.lastProcessedMessageIndex,
          cacheSize: this.cachedRenderedMessages.size,
        },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('[ตัวเรนเดอร์แบบเพิ่มส่วน] ส่งเหตุการณ์ล้มเหลว:', error);
    }
  }

  // เปิด/ปิดใช้งานการเรนเดอร์แบบเพิ่มส่วน
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`[ตัวเรนเดอร์แบบเพิ่มส่วน] ${enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`);
  }

  // ล้างแคช
  clearCache() {
    this.processedMessageIds.clear();
    this.cachedRenderedMessages.clear();
    this.lastProcessedMessageIndex = -1;
    console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] ล้างแคชแล้ว');
  }

  // รับสถานะ
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      renderingInProgress: this.renderingInProgress,
      processedCount: this.processedMessageIds.size,
      cachedCount: this.cachedRenderedMessages.size,
      lastProcessedIndex: this.lastProcessedMessageIndex,
      hasFloorMonitor: !!this.floorMonitor,
    };
  }

  // บังคับประมวลผลข้อความทั้งหมด
  async forceProcessAll() {
    console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] บังคับประมวลผลข้อความทั้งหมด...');
    this.clearCache();
    this.initializeCache();

    const allMessages = this.getCurrentMessages();
    const newMessages = allMessages.map((msg, index) => ({
      ...msg,
      index: index,
      id: this.generateMessageId(msg, index),
    }));

    await this.processNewMessages(newMessages);
  }

  // ประมวลผลข้อความใหม่ (รูปแบบ SillyTavern)
  processNewMessages(sillyTavernMessages) {
    if (!Array.isArray(sillyTavernMessages)) {
      console.warn('[Incremental Renderer] อาร์เรย์ข้อความไม่ถูกต้อง');
      return;
    }

    console.log(`[Incremental Renderer] ประมวลผล ${sillyTavernMessages.length} ข้อความ SillyTavern`);

    let newMessagesFound = 0;

    sillyTavernMessages.forEach((message, index) => {
      const messageId = this.generateMessageId(message, index);

      // ตรวจสอบว่าเป็นข้อความใหม่หรือไม่
      if (!this.processedMessageIds.has(messageId)) {
        // แปลงรูปแบบข้อความ SillyTavern
        const convertedMessage = this.convertSillyTavernMessage(message, index);

        if (convertedMessage) {
          // ประมวลผลข้อความใหม่
          this.processMessage(convertedMessage);
          newMessagesFound++;
        }
      }
    });

    if (newMessagesFound > 0) {
      console.log(`[Incremental Renderer] ✅ พบและประมวลผล ${newMessagesFound} ข้อความใหม่`);

      // ทริกเกอร์เหตุการณ์อัปเดต
      this.dispatchUpdateEvent({
        type: 'sillytavern_messages',
        newMessageCount: newMessagesFound,
        totalMessages: sillyTavernMessages.length,
      });
    }
  }

  // แปลงรูปแบบข้อความ SillyTavern
  convertSillyTavernMessage(sillyMessage, index) {
    try {
      // โครงสร้างออบเจกต์ข้อความ SillyTavern:
      // {
      //   mes: "เนื้อหาข้อความ",
      //   name: "ชื่อผู้ส่ง",
      //   is_user: boolean,
      //   send_date: timestamp,
      //   extra: { ... }
      // }

      const messageText = sillyMessage.mes || '';

      // แยกรูปแบบ QQ ต่างๆ
      const formats = this.extractAllFormats(messageText);

      if (formats.length === 0) {
        // หากไม่มีรูปแบบ QQ ให้บันทึกข้อความนี้เพื่อหลีกเลี่ยงการประมวลผลซ้ำ
        return {
          id: this.generateMessageId(sillyMessage, index),
          type: 'plain_text',
          content: messageText,
          sender: sillyMessage.name || 'Unknown',
          isUser: sillyMessage.is_user || false,
          timestamp: sillyMessage.send_date || Date.now(),
          formats: [],
        };
      }

      return {
        id: this.generateMessageId(sillyMessage, index),
        type: 'qq_format',
        content: messageText,
        sender: sillyMessage.name || 'Unknown',
        isUser: sillyMessage.is_user || false,
        timestamp: sillyMessage.send_date || Date.now(),
        formats: formats,
      };
    } catch (error) {
      console.error('[Incremental Renderer] แปลงข้อความ SillyTavern ล้มเหลว:', error);
      return null;
    }
  }

  // สร้าง ID ที่ไม่ซ้ำกันสำหรับข้อความ SillyTavern
  generateMessageId(sillyMessage, index) {
    // พยายามใช้วิธีต่างๆ เพื่อสร้าง ID ที่ไม่ซ้ำกัน
    if (sillyMessage.send_date) {
      return `st_${sillyMessage.send_date}_${index}`;
    }

    if (sillyMessage.id) {
      return `st_${sillyMessage.id}`;
    }

    // สร้างแฮชตามเนื้อหาและดัชนี
    const content = sillyMessage.mes || '';
    const hash = this.simpleHash(content + index + (sillyMessage.name || ''));
    return `st_${hash}_${index}`;
  }

  // ฟังก์ชันแฮชอย่างง่าย
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // แปลงเป็น integer 32-bit
    }
    return Math.abs(hash).toString(36);
  }
}

// สร้างอินสแตนซ์ทั่วโลก
window.IncrementalRenderer = IncrementalRenderer;

// จัดเตรียมอินเทอร์เฟซสำหรับโมดูลอื่น
window.createIncrementalRenderer = function () {
  if (!window.incrementalRenderer) {
    window.incrementalRenderer = new IncrementalRenderer();
  }
  return window.incrementalRenderer;
};

console.log('[ตัวเรนเดอร์แบบเพิ่มส่วน] โหลดโมดูลเสร็จสมบูรณ์');

// ส่งออกคลาส
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IncrementalRenderer;
}
