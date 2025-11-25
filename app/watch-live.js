/**
 * Watch Live App - แอปดูไลฟ์สด
 * ทำงานบนพื้นฐานของ live-app.js เพื่อเพิ่มฟังก์ชันดูไลฟ์ให้กับ mobile-phone.js
 * ดักจับ Context ของ SillyTavern เพื่อแปลงข้อมูลไลฟ์ แสดงคอมเมนต์และการโต้ตอบแบบเรียลไทม์
 */

// @ts-nocheck
// ป้องกันการประกาศซ้ำ
if (typeof window.WatchLiveApp === 'undefined') {
  /**
   * ตัวดักจับเหตุการณ์ไลฟ์ (Live Event Listener)
   * หน้าที่: ดักจับข้อความจาก SillyTavern และสั่งให้เริ่มแปลงข้อมูล
   */
  class LiveEventListener {
    constructor(liveApp) {
      this.liveApp = liveApp;
      this.isListening = false;
      this.lastMessageCount = 0;
      this.pollingInterval = null;
      this.messageReceivedHandler = this.onMessageReceived.bind(this);
    }

    /**
     * เริ่มดักจับเหตุการณ์จาก SillyTavern
     */
    startListening() {
      if (this.isListening) {
        console.log('[Live App] ตัวดักจับกำลังทำงานอยู่แล้ว');
        return;
      }

      try {
        // ตรวจสอบความพร้อมของ Interface SillyTavern
        console.log('[Live App] ตรวจสอบ Interface ของ SillyTavern:', {
          'window.SillyTavern': !!window?.SillyTavern,
          'window.SillyTavern.getContext': typeof window?.SillyTavern?.getContext,
          eventOn: typeof eventOn,
          tavern_events: typeof tavern_events,
          mobileContextEditor: !!window?.mobileContextEditor,
        });

        // วิธีที่ 1: ใช้ SillyTavern.getContext().eventSource (แนะนำสำหรับ iframe)
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.eventSource && typeof context.eventSource.on === 'function' && context.event_types) {
            console.log('[Live App] ใช้ SillyTavern.getContext().eventSource ดักจับ event MESSAGE_RECEIVED');
            context.eventSource.on(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
            this.isListening = true;
            console.log('[Live App] ✅ เริ่มดักจับข้อความ SillyTavern สำเร็จ (context.eventSource)');
            this.updateMessageCount();
            return;
          }
        }

        // วิธีที่ 2: ลองใช้ฟังก์ชัน Global eventOn (ถ้ามี)
        if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
          console.log('[Live App] ใช้ global eventOn ดักจับ event MESSAGE_RECEIVED');
          eventOn(tavern_events.MESSAGE_RECEIVED, this.messageReceivedHandler);
          this.isListening = true;
          console.log('[Live App] ✅ เริ่มดักจับข้อความ SillyTavern สำเร็จ (eventOn)');
          this.updateMessageCount();
          return;
        }

        // วิธีที่ 3: ลองดึง eventSource จากหน้าต่างแม่ (Parent Window)
        if (
          typeof window !== 'undefined' &&
          window.parent &&
          window.parent.eventSource &&
          typeof window.parent.eventSource.on === 'function'
        ) {
          console.log('[Live App] ใช้ eventSource จาก Parent Window ดักจับ event MESSAGE_RECEIVED');
          if (window.parent.event_types && window.parent.event_types.MESSAGE_RECEIVED) {
            window.parent.eventSource.on(window.parent.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
            this.isListening = true;
            console.log('[Live App] ✅ เริ่มดักจับข้อความ SillyTavern สำเร็จ (parent eventSource)');
            this.updateMessageCount();
            return;
          }
        }

        // ถ้าทุกวิธีล้มเหลว ให้ใช้การ Polling (วนเช็ค) แทน
        console.warn('[Live App] ไม่สามารถตั้งค่า Event Listener ได้ เปลี่ยนไปใช้ระบบ Polling แทน');
        this.startPolling();
      } catch (error) {
        console.error('[Live App] การตั้งค่า Event Listener ล้มเหลว:', error);
        this.startPolling();
      }
    }

    /**
     * หยุดดักจับ
     */
    stopListening() {
      if (!this.isListening) return;

      try {
        // พยายามลบ Event Listener ออก
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.eventSource && typeof context.eventSource.off === 'function' && context.event_types) {
            context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
          }
        }

        // ลบ Polling
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }

        this.isListening = false;
        console.log('[Live App] หยุดดักจับเหตุการณ์ SillyTavern แล้ว');
      } catch (error) {
        console.error('[Live App] การหยุดดักจับล้มเหลว:', error);
      }
    }

    /**
     * เริ่มระบบ Polling (วนเช็คข้อความใหม่เอง)
     */
    startPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }

      this.updateMessageCount();
      this.pollingInterval = setInterval(() => {
        this.checkForNewMessages();
      }, 2000); // เช็คทุก 2 วินาที

      this.isListening = true;
      console.log('[Live App] ✅ เริ่มระบบ Polling เรียบร้อย');
    }

    /**
     * เช็คข้อความใหม่
     */
    checkForNewMessages() {
      const currentMessageCount = this.getCurrentMessageCount();
      if (currentMessageCount > this.lastMessageCount) {
        console.log(`[Live App] Polling พบข้อความใหม่: ${this.lastMessageCount} → ${currentMessageCount}`);
        this.onMessageReceived(currentMessageCount);
      }
    }

    /**
     * จัดการเมื่อได้รับข้อความ AI ใหม่
     * @param {number} messageId - ID ของข้อความที่ได้รับ
     */
    async onMessageReceived(messageId) {
      try {
        console.log(`[Watch Live App] 🎯 ได้รับ Event ข้อความ AI, ID: ${messageId}`);

        // เช็คว่ามีข้อความใหม่จริงไหม
        const currentMessageCount = this.getCurrentMessageCount();
        console.log(
          `[Watch Live App] ตรวจสอบจำนวนข้อความ: ปัจจุบัน=${currentMessageCount}, ล่าสุด=${this.lastMessageCount}`,
        );

        if (currentMessageCount <= this.lastMessageCount) {
          console.log('[Watch Live App] ไม่พบข้อความใหม่ ข้ามการวิเคราะห์ข้อมูล');
          return;
        }

        console.log(
          `[Watch Live App] ✅ พบข้อความใหม่ จำนวนข้อความเพิ่มจาก ${this.lastMessageCount} เป็น ${currentMessageCount}`,
        );
        this.lastMessageCount = currentMessageCount;

        // ถ้ากำลังรอรายการไลฟ์
        if (this.liveApp.isWaitingForLiveList) {
          console.log('[Watch Live App] ได้รับข้อมูลรายการไลฟ์แล้ว กำลังอัปเดต...');
          this.liveApp.isWaitingForLiveList = false;
          this.liveApp.updateAppContent();
          return;
        }

        // เช็คว่าไลฟ์ยัง Active อยู่ไหม
        if (!this.liveApp || !this.liveApp.isLiveActive) {
          console.log('[Watch Live App] ไลฟ์ไม่ได้ Active อยู่ ข้ามการทำงาน');
          return;
        }

        // เริ่มวิเคราะห์ข้อมูล
        console.log('[Watch Live App] เริ่มวิเคราะห์ข้อมูลไลฟ์ใหม่...');
        await this.liveApp.parseNewLiveData();
      } catch (error) {
        console.error('[Watch Live App] เกิดข้อผิดพลาดในการรับข้อความ:', error);
      }
    }

    /**
     * ดึงจำนวนข้อความปัจจุบัน
     */
    getCurrentMessageCount() {
      try {
        // วิธีที่ 1: SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] ดึงข้อมูลผ่าน SillyTavern.getContext().chat ได้ ${count} ข้อความ`);
            return count;
          }
        }

        // วิธีที่ 2: mobileContextEditor (สำรอง)
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            console.log(`[Live App] ดึงข้อมูลผ่าน mobileContextEditor ได้ ${chatData.messages.length} ข้อความ`);
            return chatData.messages.length;
          }
        }

        // วิธีที่ 3: chat variable จาก parent window
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const count = window.parent.chat.length;
          console.log(`[Live App] ดึงข้อมูลผ่าน parent window chat variable ได้ ${count} ข้อความ`);
          return count;
        }

        // วิธีที่ 4: getContext() (ถ้ามี)
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] ดึงข้อมูลผ่าน getContext() ได้ ${count} ข้อความ`);
            return count;
          }
        }

        console.warn('[Live App] ไม่สามารถดึงจำนวนข้อความได้ ใช้ค่าเริ่มต้น 0');
        return 0;
      } catch (error) {
        console.warn('[Live App] ล้มเหลวในการดึงจำนวนข้อความ:', error);
        return 0;
      }
    }

    /**
     * อัปเดตตัวนับข้อความ
     */
    updateMessageCount() {
      this.lastMessageCount = this.getCurrentMessageCount();
      console.log(`[Live App] ค่าเริ่มต้นจำนวนข้อความ: ${this.lastMessageCount}`);
    }
  }

  /**
   * ตัวแปลงข้อมูลไลฟ์ (Live Data Parser)
   * หน้าที่: แกะข้อมูลจากข้อความของ SillyTavern ให้อยู่ในรูปแบบที่เอาไปโชว์ได้
   */
  class LiveDataParser {
    constructor() {
      // รูปแบบ Regex สำหรับดักจับข้อมูล (ห้ามแก้ภาษาจีนตรงนี้ เพราะต้องตรงกับ Prompt ที่สั่ง AI)
      this.patterns = {
        viewerCount: /\[直播\|本场人数\|([^\]]+)\]/g,
        liveContent: /\[直播\|直播内容\|([^\]]+)\]/g,
        normalDanmaku: /\[直播\|([^\|]+)\|弹幕\|([^\]]+)\]/g,
        giftDanmaku: /\[直播\|([^\|]+)\|打赏\|([^\]]+)\]/g,
        recommendedInteraction: /\[直播\|推荐互动\|([^\]]+)\]/g,
      };
    }

    /**
     * แปลงข้อมูลไลฟ์
     * @param {string} content - ข้อความดิบที่จะแปลง
     * @returns {Object} ข้อมูลที่แปลงเสร็จแล้ว
     */
    parseLiveData(content) {
      const liveData = {
        viewerCount: 0,
        liveContent: '',
        danmakuList: [],
        giftList: [],
        recommendedInteractions: [],
      };

      if (!content || typeof content !== 'string') {
        return liveData;
      }

      // 1. แปลงจำนวนคนดู
      liveData.viewerCount = this.parseViewerCount(content);

      // 2. แปลงเนื้อหาไลฟ์
      liveData.liveContent = this.parseLiveContent(content);

      // 3. แปลงคอมเมนต์และของขวัญ (รักษาลำดับเวลา)
      const { danmakuList, giftList } = this.parseAllDanmaku(content);
      liveData.danmakuList = danmakuList;
      liveData.giftList = giftList;

      // 5. แปลงแชทแนะนำ
      liveData.recommendedInteractions = this.parseRecommendedInteractions(content);

      return liveData;
    }

    /**
     * แปลงจำนวนคนดู
     */
    parseViewerCount(content) {
      const matches = [...content.matchAll(this.patterns.viewerCount)];
      if (matches.length === 0) return 0;

      // เอาค่าล่าสุด
      const lastMatch = matches[matches.length - 1];
      const viewerStr = lastMatch[1].trim();

      return this.formatViewerCount(viewerStr);
    }

    /**
     * จัดรูปแบบตัวเลขคนดู
     */
    formatViewerCount(viewerStr) {
      // ลบตัวอักษรที่ไม่ใช่ตัวเลข/อังกฤษออก
      const cleanStr = viewerStr.replace(/[^\d\w]/g, '');

      // ลองแปลงเป็นตัวเลข
      const num = parseInt(cleanStr);
      if (isNaN(num)) return 0;

      // จัดรูปแบบตัวเลขหลักหมื่น/พัน
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'หมื่น'; // แก้จาก W เป็น หมื่น
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }

      return num.toString();
    }

    /**
     * แปลงเนื้อหาไลฟ์
     */
    parseLiveContent(content) {
      const matches = [...content.matchAll(this.patterns.liveContent)];
      if (matches.length === 0) return '';

      // เอาเนื้อหาล่าสุด
      const lastMatch = matches[matches.length - 1];
      return lastMatch[1].trim();
    }

    /**
     * แปลงคอมเมนต์ทั้งหมด (รักษาลำดับ)
     */
    parseAllDanmaku(content) {
      const danmakuList = [];
      const giftList = [];
      const allMatches = [];

      // เก็บ Match แชทปกติ
      const normalMatches = [...content.matchAll(this.patterns.normalDanmaku)];
      normalMatches.forEach(match => {
        allMatches.push({
          type: 'normal',
          match: match,
          index: match.index, // ตำแหน่งในข้อความเดิม
        });
      });

      // เก็บ Match ของขวัญ
      const giftMatches = [...content.matchAll(this.patterns.giftDanmaku)];
      giftMatches.forEach(match => {
        allMatches.push({
          type: 'gift',
          match: match,
          index: match.index, // ตำแหน่งในข้อความเดิม
        });
      });

      // เรียงตามตำแหน่งที่ปรากฏจริง
      allMatches.sort((a, b) => a.index - b.index);

      // วนลูปสร้างรายการ
      allMatches.forEach((item, index) => {
        const match = item.match;
        const username = match[1].trim();
        const content = match[2].trim();
        const timestamp = new Date().toLocaleString();

        if (item.type === 'normal') {
          // แชทปกติ
          danmakuList.push({
            id: Date.now() + index,
            username: username,
            content: content,
            type: 'normal',
            timestamp: timestamp,
          });
        } else if (item.type === 'gift') {
          // แชทของขวัญ
          danmakuList.push({
            id: Date.now() + index + 10000, // ป้องกัน ID ซ้ำ
            username: username,
            content: content,
            type: 'gift',
            timestamp: timestamp,
          });

          // เพิ่มลงรายการของขวัญ
          giftList.push({
            username: username,
            gift: content,
            timestamp: timestamp,
          });
        }
      });

      return { danmakuList, giftList };
    }

    /**
     * แปลงแชทแนะนำ
     */
    parseRecommendedInteractions(content) {
      const interactions = [];
      const matches = [...content.matchAll(this.patterns.recommendedInteraction)];

      console.log(`[Live App] เจอแชทแนะนำทั้งหมด ${matches.length} รายการ`);

      // เอาแค่ 4 อันล่าสุด
      const recentMatches = matches.slice(-4);
      console.log(`[Live App] เลือกใช้ ${recentMatches.length} รายการล่าสุด`);

      recentMatches.forEach((match, index) => {
        const interactionContent = match[1].trim();
        console.log(`[Live App] แชทแนะนำ ${index + 1}: "${interactionContent}"`);
        if (!interactions.includes(interactionContent)) {
          interactions.push(interactionContent);
        }
      });

      console.log(`[Live App] รายการแชทแนะนำสุดท้าย:`, interactions);
      return interactions;
    }

    /**
     * ดึงเนื้อหาแชททั้งหมด
     */
    getChatContent() {
      try {
        // วิธีที่ 1: SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const messages = context.chat;
            if (messages && messages.length > 0) {
              const content = messages.map(msg => msg.mes || '').join('\n');
              console.log(`[Live App] ดึงแชทจาก SillyTavern.getContext().chat ความยาว: ${content.length}`);
              return content;
            }
          }
        }

        // วิธีที่ 2: mobileContextEditor
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            const content = chatData.messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] ดึงแชทจาก mobileContextEditor ความยาว: ${content.length}`);
            return content;
          }
        }

        // วิธีที่ 3: parent window chat
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const messages = window.parent.chat;
          if (messages && messages.length > 0) {
            const content = messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] ดึงแชทจาก parent window ความยาว: ${content.length}`);
            return content;
          }
        }

        // วิธีที่ 4: getContext()
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const messages = context.chat;
            if (messages && messages.length > 0) {
              const content = messages.map(msg => msg.mes || '').join('\n');
              console.log(`[Live App] ดึงแชทจาก getContext() ความยาว: ${content.length}`);
              return content;
            }
          }
        }

        console.warn('[Live App] ไม่สามารถดึงเนื้อหาแชทได้');
        return '';
      } catch (error) {
        console.warn('[Live App] การดึงเนื้อหาแชทล้มเหลว:', error);
        return '';
      }
    }
  }

  /**
   * ตัวจัดการสถานะไลฟ์ (Live State Manager)
   * หน้าที่: เก็บข้อมูลสถานะปัจจุบันและข้อมูลที่จะเอาไปโชว์
   */
  class LiveStateManager {
    constructor() {
      this.isLiveActive = false;
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
    }

    /**
     * เริ่มไลฟ์
     */
    startLive() {
      this.isLiveActive = true;
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
      console.log('[Live App] สถานะไลฟ์: Active');
    }

    /**
     * จบไลฟ์
     */
    endLive() {
      this.isLiveActive = false;
      console.log('[Live App] สถานะไลฟ์: Stopped');
    }

    /**
     * อัปเดตข้อมูลไลฟ์
     * @param {Object} liveData - ข้อมูลที่แปลงมาแล้ว
     */
    updateLiveData(liveData) {
      if (!this.isLiveActive) return;

      // อัปเดตคนดู
      if (liveData.viewerCount !== undefined && liveData.viewerCount !== 0) {
        this.currentViewerCount = liveData.viewerCount;
        console.log(`[Live App] อัปเดตคนดู: ${this.currentViewerCount}`);
      }

      // อัปเดตเนื้อหา
      if (liveData.liveContent && liveData.liveContent.trim() !== '') {
        this.currentLiveContent = liveData.liveContent;
        console.log(`[Live App] อัปเดตเนื้อหา: ${this.currentLiveContent.substring(0, 50)}...`);
      }

      // อัปเดตแชทแนะนำ
      if (liveData.recommendedInteractions && liveData.recommendedInteractions.length > 0) {
        this.recommendedInteractions = liveData.recommendedInteractions;
        console.log(`[Live App] อัปเดตแชทแนะนำ: ${this.recommendedInteractions.length} รายการ`);
      }

      // เพิ่มแชทใหม่ (สะสมไปเรื่อยๆ)
      if (liveData.danmakuList && liveData.danmakuList.length > 0) {
        const newDanmaku = liveData.danmakuList.filter(newItem => {
          return !this.danmakuList.some(
            existingItem =>
              existingItem.username === newItem.username &&
              existingItem.content === newItem.content &&
              existingItem.type === newItem.type,
          );
        });

        if (newDanmaku.length > 0) {
          this.danmakuList = this.danmakuList.concat(newDanmaku);
          console.log(
            `[Watch Live App] เพิ่มแชทใหม่ ${newDanmaku.length} รายการ, รวมทั้งหมด ${this.danmakuList.length}`,
          );
        }
      }

      // เพิ่มของขวัญใหม่
      if (liveData.giftList && liveData.giftList.length > 0) {
        const newGifts = liveData.giftList.filter(newGift => {
          return !this.giftList.some(
            existingGift =>
              existingGift.username === newGift.username &&
              existingGift.gift === newGift.gift &&
              existingGift.timestamp === newGift.timestamp,
          );
        });

        if (newGifts.length > 0) {
          this.giftList = this.giftList.concat(newGifts);
          console.log(`[Live App] เพิ่มของขวัญใหม่ ${newGifts.length} ชิ้น, รวมทั้งหมด ${this.giftList.length}`);
        }
      }
    }

    /**
     * ดึงสถานะปัจจุบัน
     */
    getCurrentState() {
      return {
        isLiveActive: this.isLiveActive,
        viewerCount: this.currentViewerCount,
        liveContent: this.currentLiveContent,
        danmakuList: [...this.danmakuList],
        giftList: [...this.giftList],
        recommendedInteractions: [...this.recommendedInteractions],
      };
    }

    /**
     * ล้างข้อมูลทั้งหมด
     */
    clearAllData() {
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
      console.log('[Live App] ล้างข้อมูลไลฟ์ทั้งหมดแล้ว');
    }
  }

  /**
   * คลาสหลัก Watch Live App
   * ศูนย์กลางการควบคุม
   */
  class WatchLiveApp {
    constructor() {
      this.eventListener = new LiveEventListener(this);
      this.dataParser = new LiveDataParser();
      this.stateManager = new LiveStateManager();
      this.currentView = 'start'; // 'start', 'live'
      this.isInitialized = false;
      this.lastRenderTime = 0;
      this.renderCooldown = 500;
      this.scrollTimeout = null;
      this.typingTimer = null;
      this.isTyping = false;
      this.pendingAppearDanmakuSigs = new Set();
      this.pendingAppearGiftSigs = new Set();
      this.saveTimeout = null;
      this.saveDebounceMs = 2000;

      this.init();
    }

    /**
     * เริ่มต้นแอป
     */
    init() {
      console.log('[Watch Live App] กำลังเริ่มต้น Watch Live App');

      // ตรวจสอบสิทธิ์การแสดงผล
      const renderingRight = this.getRenderingRight();
      console.log('[Watch Live App] สถานะ Rendering Right:', renderingRight);

      if (renderingRight && renderingRight !== 'watch' && renderingRight !== 'end') {
        console.log('[Watch Live App] Rendering Right ไม่ถูกต้อง ข้ามการตรวจสอบ');
        this.isInitialized = true;
        return;
      }

      // ตรวจสอบข้อมูลไลฟ์ที่มีอยู่
      this.detectActiveLive();

      this.isInitialized = true;
      console.log('[Watch Live App] เริ่มต้น Watch Live App เสร็จสมบูรณ์');
    }

    /**
     * ตรวจจับข้อมูลไลฟ์ที่มีอยู่แล้ว
     */
    detectActiveLive() {
      try {
        console.log('[Watch Live App] กำลังค้นหาข้อมูลไลฟ์...');

        const renderingRight = this.getRenderingRight();
        if (renderingRight && renderingRight !== 'watch' && renderingRight !== 'end') {
          console.log(`[Watch Live App] Rendering Right ถูกใช้โดย ${renderingRight}, ข้ามการตรวจสอบ`);
          return;
        }

        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.log('[Watch Live App] ไม่พบเนื้อหาแชท');
          return;
        }

        const hasActiveLive = this.hasActiveLiveFormats(chatContent);

        if (hasActiveLive && renderingRight === 'watch') {
          console.log('[Watch Live App] 🎯 เจอข้อมูลไลฟ์ เข้าสู่โหมดดูไลฟ์อัตโนมัติ');

          this.stateManager.startLive();
          this.currentView = 'live';

          const liveData = this.dataParser.parseLiveData(chatContent);
          this.stateManager.updateLiveData(liveData);

          this.eventListener.startListening();

          console.log('[Watch Live App] ✅ กู้คืนสถานะดูไลฟ์สำเร็จ, ข้อมูล:', {
            viewerCount: this.stateManager.currentViewerCount,
            liveContent: this.stateManager.currentLiveContent
              ? this.stateManager.currentLiveContent.substring(0, 50) + '...'
              : '',
            danmakuCount: this.stateManager.danmakuList.length,
            giftCount: this.stateManager.giftList.length,
            interactionCount: this.stateManager.recommendedInteractions.length,
          });
        } else {
          console.log('[Watch Live App] ไม่พบข้อมูลไลฟ์ที่ Active หรือ Rendering Right ไม่ตรงกัน');
        }
      } catch (error) {
        console.error('[Watch Live App] ตรวจจับข้อมูลไลฟ์ล้มเหลว:', error);
      }
    }

    /**
     * เช็คว่ามีรูปแบบข้อความไลฟ์ไหม
     */
    hasActiveLiveFormats(content) {
      if (!content || typeof content !== 'string') {
        return false;
      }

      // Regex สำหรับเช็ค (ห้ามแก้ภาษาจีนใน Regex)
      const activeLivePatterns = [
        /\[直播\|本场人数\|[^\]]+\]/,
        /\[直播\|直播内容\|[^\]]+\]/,
        /\[直播\|[^|]+\|弹幕\|[^\]]+\]/,
        /\[直播\|[^|]+\|(?:打赏|礼物)\|[^\]]+\]/,
        /\[直播\|推荐互动\|[^\]]+\]/,
      ];

      for (const pattern of activeLivePatterns) {
        if (pattern.test(content)) {
          console.log('[Live App] พบแพทเทิร์นไลฟ์:', pattern.toString());
          return true;
        }
      }

      return false;
    }

    get isLiveActive() {
      return this.stateManager.isLiveActive;
    }

    /**
     * จบการดูไลฟ์
     */
    async endLive() {
      try {
        console.log('[Watch Live App] จบการดูไลฟ์');

        await this.setRenderingRight('end');
        this.eventListener.stopListening();
        await this.convertLiveToHistory();

        this.stateManager.endLive();
        this.stateManager.clearAllData();
        this.currentView = 'start';

        this.isInitialized = false;
        this.lastRenderTime = 0;

        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        }
        if (this.typingTimer) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
        }

        this.updateAppContent();

        this.showToast('ออกจากห้องไลฟ์แล้ว', 'success');
        console.log('[Watch Live App] ออกจากห้องไลฟ์และรีเซ็ตค่าเรียบร้อย');
      } catch (error) {
        console.error('[Watch Live App] ออกจากห้องไลฟ์ล้มเหลว:', error);
        this.showToast('ไม่สามารถออกจากห้องไลฟ์ได้: ' + error.message, 'error');
      }
    }

    /**
     * ส่งข้อความโต้ตอบ
     */
    async continueInteraction(interaction) {
      try {
        console.log('[Live App] ส่งข้อความโต้ตอบ:', interaction);

        if (!this.isLiveActive) {
          console.warn('[Live App] ไลฟ์ไม่ Active ไม่สามารถโต้ตอบได้');
          return;
        }

        // ข้อความคำสั่งสำหรับ AI (ต้องคงภาษาจีนในคำสั่งไว้ เพื่อให้ AI ตอบกลับมาใน Format ที่ Regex อ่านรู้เรื่อง)
        const message = `用户继续直播，互动为（${interaction}），请按照正确的直播格式要求生成本场人数，直播内容，弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动。禁止使用错误格式。`;

        await this.sendToSillyTavern(message);

        console.log('[Live App] ส่งข้อความเรียบร้อย');
      } catch (error) {
        console.error('[Live App] ส่งข้อความล้มเหลว:', error);
        this.showToast('ส่งข้อความล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * วิเคราะห์ข้อมูลใหม่ที่เข้ามา
     */
    async parseNewLiveData() {
      try {
        console.log('[Live App] เริ่มวิเคราะห์ข้อมูลใหม่');

        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.warn('[Live App] ไม่พบเนื้อหาแชท');
          return;
        }

        const existingDanmakuSigs = new Set(
          (this.stateManager.danmakuList || []).map(item => this.createDanmakuSignature(item)),
        );

        const latestFloorText = this.getLatestFloorTextSafe();
        let latestNewDanmaku = [];
        let latestNewGifts = [];
        if (latestFloorText) {
          const { danmakuList: latestDanmakuList, giftList: latestGiftList } =
            this.dataParser.parseAllDanmaku(latestFloorText);
          latestNewDanmaku = latestDanmakuList || [];
          latestNewGifts = latestGiftList || [];
        }

        const liveData = this.dataParser.parseLiveData(chatContent);
        console.log('[Live App] ข้อมูลที่แกะได้:', {
          viewerCount: liveData.viewerCount,
          liveContent: liveData.liveContent ? liveData.liveContent.substring(0, 50) + '...' : '',
          danmakuCount: liveData.danmakuList.length,
          giftCount: liveData.giftList.length,
          interactionCount: liveData.recommendedInteractions.length,
        });

        this.stateManager.updateLiveData(liveData);

        // เช็คว่าต้องเล่น Animation ไหม
        if (latestNewDanmaku.length > 0) {
          latestNewDanmaku.forEach(item => {
            const sig = this.createDanmakuSignature(item);
            if (!existingDanmakuSigs.has(sig)) {
              this.pendingAppearDanmakuSigs.add(sig);
            }
          });
        }

        if (latestNewGifts.length > 0) {
          const existingGiftSigs = new Set(
            (this.stateManager.giftList || []).map(item => this.createGiftSignature(item)),
          );
          latestNewGifts.forEach(item => {
            const sig = this.createGiftSignature(item);
            if (!existingGiftSigs.has(sig)) {
              this.pendingAppearGiftSigs.add(sig);
            }
          });
        }

        this.updateAppContentDebounced();

        setTimeout(() => {
          this.runAppearSequence();
          const danmakuContainer = document.getElementById('danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }, 30);
      } catch (error) {
        console.error('[Live App] วิเคราะห์ข้อมูลล้มเหลว:', error);
      }
    }

    /**
     * อัปเดตหน้าจอ (แบบ Debounce)
     */
    updateAppContentDebounced() {
      const currentTime = Date.now();
      if (currentTime - this.lastRenderTime < this.renderCooldown) {
        return;
      }

      this.lastRenderTime = currentTime;
      this.updateAppContent();
      this.updateHeader();
    }

    /**
     * อัปเดตเนื้อหา UI
     */
    updateAppContent() {
      const content = this.getAppContent();
      const appElement = document.getElementById('app-content');
      if (appElement) {
        appElement.innerHTML = content;
        setTimeout(() => {
          this.bindEvents();
          this.updateHeader();
          if (this.currentView === 'live') {
            const state = this.stateManager.getCurrentState();
            const liveContentEl = document.querySelector('.live-content-text');
            if (liveContentEl) {
              this.applyTypingEffect(liveContentEl, state.liveContent || '');
            }
            this.runAppearSequence();
          }
        }, 50);
      }
    }

    /**
     * เลือกหน้าที่จะแสดง
     */
    getAppContent() {
      switch (this.currentView) {
        case 'start':
          return this.renderStartView();
        case 'list':
          return this.renderListView();
        case 'live':
          return this.renderLiveView();
        default:
          return this.renderStartView();
      }
    }

    /**
     * Render หน้าแรก
     */
    renderStartView() {
      return `
        <div class="live-app">
          <div class="watch-live-container">
            <div class="watch-live-header">
              <h2>Live Center</h2>
              <p>เลือกรูปแบบที่ต้องการเข้าชม</p>
            </div>

            <div class="watch-options">
              <button class="watch-option-btn" id="current-live-list">
                <div class="option-icon">📺</div>
                <div class="option-title">ดูไลฟ์ตอนนี้</div>
              </button>

              <button class="watch-option-btn" id="specific-live-room">
                <div class="option-icon">🔍</div>
                <div class="option-title">เข้าห้องไลฟ์ที่ระบุ</div>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render หน้ารายการไลฟ์
     */
    renderListView() {
      const liveRooms = this.parseLiveRoomList();

      const roomsHtml = liveRooms
        .map(
          room => `
        <div class="live-room-item">
          <div class="room-info">
            <div class="room-name">${room.name}</div>
            <div class="room-details">
              <span class="streamer-name">สตรีมเมอร์：${room.streamer}</span>
              <span class="room-category">หมวดหมู่：${room.category}</span>
              <span class="viewer-count">รับชม：${room.viewers}</span>
            </div>
          </div>
          <button class="watch-room-btn" data-room='${JSON.stringify(room)}'>รับชมไลฟ์</button>
        </div>
      `,
        )
        .join('');

      let listContent = '';

      if (roomsHtml) {
        listContent = roomsHtml;
      }

      if (this.isWaitingForLiveList) {
        const loadingHtml = `
          <div class="live-loading-update">
            <div class="loading-spinner"></div>
            <span>กำลังค้นหาไลฟ์เพิ่มเติม...</span>
          </div>
        `;
        listContent = listContent
          ? listContent + loadingHtml
          : '<div class="live-loading">กำลังโหลดรายการไลฟ์...</div>';
      } else if (!roomsHtml) {
        listContent = '<div class="no-rooms">ยังไม่มีใครไลฟ์ ลองกลับมาดูอีกทีนะ!</div>';
      }

      return `
        <div class="live-app">
          <div class="live-list-container">
            <div class="live-list-header">
              <button class="back-btn" id="back-to-watch-options">←กลับ</button>
              <h2>ไลฟ์สดตอนนี้</h2>
            </div>

            <div class="live-rooms-list">
              ${listContent}
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render หน้าดูไลฟ์
     */
    renderLiveView() {
      const state = this.stateManager.getCurrentState();

      const recommendedButtons = state.recommendedInteractions
        .map(interaction => `<button class="rec-btn" data-interaction="${interaction}">${interaction}</button>`)
        .join('');

      const danmakuItems = state.danmakuList
        .map(danmaku => {
          const sig = this.createDanmakuSignature(danmaku);
          const needAppearClass = this.pendingAppearDanmakuSigs.has(sig) ? ' need-appear' : '';
          if (danmaku.type === 'gift') {
            return `
            <div class="danmaku-item gift${needAppearClass}" data-sig="${sig}">
              <i class="fas fa-gift"></i>
              <span class="username">${danmaku.username}</span>
              <span class="content">ส่งของขวัญ ${danmaku.content}</span>
            </div>
          `;
          } else {
            return `
            <div class="danmaku-item normal${needAppearClass}" data-sig="${sig}">
              <span class="username">${danmaku.username}:</span>
              <span class="content">${danmaku.content}</span>
            </div>
          `;
          }
        })
        .join('');

      return `
        <div class="live-app">
          <div class="live-container">
            <div class="video-placeholder">
              <p class="live-content-text">${state.liveContent || 'กำลังรอเนื้อหาไลฟ์...'}</p>
              <div class="live-status-bottom">
                <div class="live-dot"></div>
                <span>LIVE</span>
              </div>
            </div>

            <div class="interaction-panel">
              <div class="interaction-header">
                <h4>แชทแนะนำ：</h4>
                <div class="watch-actions">
                  <button class="interact-btn" id="send-danmaku-btn">
                    <i class="fas fa-comment"></i> ส่งข้อความ
                  </button>
                  <button class="interact-btn" id="send-gift-btn">
                    <i class="fas fa-gift"></i> ส่งของขวัญ
                  </button>
                </div>
              </div>
              <div class="recommended-interactions">
                ${recommendedButtons || '<p class="no-interactions">กำลังรอแชทแนะนำ...</p>'}
              </div>
            </div>

            <div class="danmaku-container" id="danmaku-container">
              <div class="danmaku-list" id="danmaku-list">
                ${danmakuItems || '<div class="no-danmaku">ยังไม่มีข้อความแชท...</div>'}
              </div>
            </div>
          </div>
<div id="danmaku-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>ส่งข้อความ</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <form id="danmaku-form">
                <textarea id="custom-danmaku-textarea" placeholder="พิมพ์ข้อความของคุณ..." rows="4"></textarea>
                <button type="submit" class="submit-btn">ส่งข้อความ</button>
              </form>
            </div>
          </div>

          <div id="gift-send-modal" class="modal">
            <div class="gift-modal-container">
              <div class="gift-modal-header">
                <div class="gift-modal-title">เลือกของขวัญ</div>
                <button class="gift-modal-close" onclick="watchLiveAppHideModal('gift-send-modal')">&times;</button>
              </div>

              <div class="gift-modal-body">
                <div class="gift-list-container">
                    <div class="gift-card" data-gift="ใจส้ม" data-price="1">
                      <div class="gift-icon">🧡</div>
                      <div class="gift-info">
                        <div class="gift-name">ใจส้ม</div>
                        <div class="gift-price">¥1</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="แมวน้อย" data-price="3">
                      <div class="gift-icon">😺</div>
                      <div class="gift-info">
                        <div class="gift-name">แมวน้อย</div>
                        <div class="gift-price">¥3</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ลิงจั๊กๆ" data-price="5">
                      <div class="gift-icon">🙉</div>
                      <div class="gift-info">
                        <div class="gift-name">ลิงจั๊กๆ</div>
                        <div class="gift-price">¥5</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="รองเท้าพื้นแดง" data-price="6">
                      <div class="gift-icon">👠</div>
                      <div class="gift-info">
                        <div class="gift-name">รองเท้าพื้นแดง</div>
                        <div class="gift-price">¥6</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="เหรียญศีลธรรม" data-price="9">
                      <div class="gift-icon">🪙</div>
                      <div class="gift-info">
                        <div class="gift-name">เหรียญศีลธรรม</div>
                        <div class="gift-price">¥9</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="สมอง" data-price="18">
                      <div class="gift-icon">🧠</div>
                      <div class="gift-info">
                        <div class="gift-name">สมอง</div>
                        <div class="gift-price">¥18</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="บิงซู" data-price="28">
                      <div class="gift-icon">🍧</div>
                      <div class="gift-info">
                        <div class="gift-name">บิงซู</div>
                        <div class="gift-price">¥28</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="อู้ววว! แซ่บ" data-price="38">
                      <div class="gift-icon">🫦</div>
                      <div class="gift-info">
                        <div class="gift-name">อู้ววว! แซ่บ</div>
                        <div class="gift-price">¥38</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="โลมา" data-price="58">
                      <div class="gift-icon">🐬</div>
                      <div class="gift-info">
                        <div class="gift-name">โลมา</div>
                        <div class="gift-price">¥58</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="กระเทียมไล่ผี" data-price="88">
                      <div class="gift-icon">🧄</div>
                      <div class="gift-info">
                        <div class="gift-name">กระเทียมไล่ผี</div>
                        <div class="gift-price">¥88</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Skibidi" data-price="128">
                      <div class="gift-icon">🚽</div>
                      <div class="gift-info">
                        <div class="gift-name">Skibidi</div>
                        <div class="gift-price">¥128</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ไม่ไหวแล้วววว" data-price="188">
                      <div class="gift-icon">💦</div>
                      <div class="gift-info">
                        <div class="gift-name">ไม่ไหวแล้วววว</div>
                        <div class="gift-price">¥188</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="เพตเห็นเพตแทงนะคะ" data-price="288">
                      <div class="gift-icon">🔪</div>
                      <div class="gift-info">
                        <div class="gift-name">เพตเห็นเพตแทงนะคะ</div>
                        <div class="gift-price">¥288</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="แคทเทอรีนยิงมัน" data-price="388">
                      <div class="gift-icon">🔫</div>
                      <div class="gift-info">
                        <div class="gift-name">แคทเทอรีนยิงมัน</div>
                        <div class="gift-price">¥388</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="แชมเปญฉลอง" data-price="488">
                      <div class="gift-icon">🥂</div>
                      <div class="gift-info">
                        <div class="gift-name">แชมเปญฉลอง</div>
                        <div class="gift-price">¥488</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="แว่นกันแดดซุปตาร์" data-price="588">
                      <div class="gift-icon">🕶️</div>
                      <div class="gift-info">
                        <div class="gift-name">แว่นกันแดดซุปตาร์</div>
                        <div class="gift-price">¥588</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="จรวดดันยอดวิว" data-price="666">
                      <div class="gift-icon">🚀</div>
                      <div class="gift-info">
                        <div class="gift-name">จรวดดันยอดวิว</div>
                        <div class="gift-price">¥666</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ยานอวกาศ" data-price="888">
                      <div class="gift-icon">🚁</div>
                      <div class="gift-info">
                        <div class="gift-name">ยานอวกาศ</div>
                        <div class="gift-price">¥888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ถนนสายดวงดาว" data-price="999">
                      <div class="gift-icon">📢</div>
                      <div class="gift-info">
                        <div class="gift-name">ถนนสายดวงดาว</div>
                        <div class="gift-price">¥999</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="บทละครเทพพยากรณ์" data-price="1288">
                      <div class="gift-icon">📜</div>
                      <div class="gift-info">
                        <div class="gift-name">บทละครเทพพยากรณ์</div>
                        <div class="gift-price">¥1288</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ปราสาทลอยฟ้า" data-price="1888">
                      <div class="gift-icon">🏰</div>
                      <div class="gift-info">
                        <div class="gift-name">ปราสาทลอยฟ้า</div>
                        <div class="gift-price">¥1888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ซูเปอร์คาร์ความเร็วแสง" data-price="2888">
                      <div class="gift-icon">🏎️</div>
                      <div class="gift-info">
                        <div class="gift-name">ซูเปอร์คาร์ความเร็วแสง</div>
                        <div class="gift-price">¥2888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ทัวร์รอบจักรวาล" data-price="3888">
                      <div class="gift-icon">🌍</div>
                      <div class="gift-info">
                        <div class="gift-name">ทัวร์รอบจักรวาล</div>
                        <div class="gift-price">¥3888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="เรือสำราญในฝัน" data-price="4888">
                      <div class="gift-icon">🛳️</div>
                      <div class="gift-info">
                        <div class="gift-name">เรือสำราญในฝัน</div>
                        <div class="gift-price">¥4888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="กองยานแห่งดวงดาว" data-price="5888">
                      <div class="gift-icon">🌌</div>
                      <div class="gift-info">
                        <div class="gift-name">กองยานแห่งดวงดาว</div>
                        <div class="gift-price">¥5888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ดาวเคราะห์ส่วนตัว" data-price="6888">
                      <div class="gift-icon">🪐</div>
                      <div class="gift-info">
                        <div class="gift-name">ดาวเคราะห์ส่วนตัว</div>
                        <div class="gift-price">¥6888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="โรงงานปาฏิหาริย์" data-price="7888">
                      <div class="gift-icon">✨</div>
                      <div class="gift-info">
                        <div class="gift-name">โรงงานปาฏิหาริย์</div>
                        <div class="gift-price">¥7888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ดวงดาวนิรันดร์" data-price="8888">
                      <div class="gift-icon">🌠</div>
                      <div class="gift-info">
                        <div class="gift-name">ดวงดาวนิรันดร์</div>
                        <div class="gift-price">¥8888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ผู้บัญชาการดวงดาว" data-price="9999">
                      <div class="gift-icon">🔱</div>
                      <div class="gift-info">
                        <div class="gift-name">ผู้บัญชาการดวงดาว</div>
                        <div class="gift-price">¥9999</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="ตั้งชื่อตามคุณ" data-price="10000">
                      <div class="gift-icon">🔭</div>
                      <div class="gift-info">
                        <div class="gift-name">ตั้งชื่อตามคุณ</div>
                        <div class="gift-price">¥10000</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="gift-message-section">
                  <div class="message-label">💬 ข้อความโดเนท</div>
                  <textarea id="gift-message-input" placeholder="พิมพ์อะไรสักหน่อย..."></textarea>
                </div>

                <div class="gift-summary">
                  <div class="total-amount">
                    <span class="amount-label">ยอดรวม</span>
                    <span class="amount-value">¥<span id="gift-total-amount">0</span></span>
                  </div>
                  <button class="send-gift-btn" id="confirm-send-gift">
                    <span class="btn-icon">🎁</span>
                    <span class="btn-text">ส่งของขวัญ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="gift-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>ประวัติของขวัญ</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <ul class="gift-list">
                ${
                  state.giftList
                    .map(gift => {
                      const gsig = this.createGiftSignature(gift);
                      const needAppearClass = this.pendingAppearGiftSigs.has(gsig) ? ' need-appear' : '';
                      return `<li class="${needAppearClass.trim()}" data-sig="${gsig}"><span class="username">${
                        gift.username
                      }</span>ส่ง <span class="gift-name">${gift.gift}</span></li>`;
                    })
                    .join('') || '<li class="no-gifts">ยังไม่มีของขวัญ</li>'
                }
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      console.log('[Live App] ผูกเหตุการณ์...');

      const appContainer = document.getElementById('app-content');
      if (!appContainer) {
        console.error('[Live App] ไม่พบคอนเทนเนอร์แอพ');
        return;
      }

      try {
        // 观看直播相关事件
        if (this.currentView === 'start') {
          // 当前开播列表按钮
          const currentLiveListBtn = appContainer.querySelector('#current-live-list');
          if (currentLiveListBtn) {
            currentLiveListBtn.addEventListener('click', () => {
              this.requestCurrentLiveList();
            });
          }

          // 进入指定直播间按钮
          const specificLiveRoomBtn = appContainer.querySelector('#specific-live-room');
          if (specificLiveRoomBtn) {
            specificLiveRoomBtn.addEventListener('click', () => {
              this.showSpecificLiveRoomModal();
            });
          }
        }

        // 直播间列表相关事件
        if (this.currentView === 'list') {
          // 返回按钮
          const backBtn = appContainer.querySelector('#back-to-watch-options');
          if (backBtn) {
            backBtn.addEventListener('click', () => {
              // 停止监听并重置状态
              this.eventListener.stopListening();
              this.isWaitingForLiveList = false;
              this.currentView = 'start';
              this.updateAppContent();
            });
          }

          // 观看直播间按钮
          appContainer.querySelectorAll('.watch-room-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const roomData = JSON.parse(btn.dataset.room);
              this.watchSelectedRoom(roomData);
            });
          });
        }

        // 直播中相关事件
        if (this.currentView === 'live') {
          // 推荐弹幕按钮
          appContainer.querySelectorAll('.rec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const danmaku = btn.dataset.interaction;
              if (danmaku) {
                this.sendDanmaku(danmaku);
              }
            });
          });

          // 发送弹幕按钮
          const sendDanmakuBtn = appContainer.querySelector('#send-danmaku-btn');
          if (sendDanmakuBtn) {
            sendDanmakuBtn.addEventListener('click', () => {
              this.showModal('danmaku-modal');
            });
          }

          // 打赏礼物按钮
          const sendGiftBtn = appContainer.querySelector('#send-gift-btn');
          if (sendGiftBtn) {
            sendGiftBtn.addEventListener('click', () => {
              this.showModal('gift-send-modal');
              this.initGiftModal();
            });
          }

          // 发送弹幕表单
          const danmakuForm = appContainer.querySelector('#danmaku-form');
          if (danmakuForm) {
            danmakuForm.addEventListener('submit', e => {
              e.preventDefault();
              const textarea = appContainer.querySelector('#custom-danmaku-textarea');
              const danmaku = textarea ? textarea.value.trim() : '';
              if (danmaku) {
                this.sendCustomDanmaku(danmaku);
                textarea.value = '';
                this.hideAllModals();
              } else {
                this.showToast('กรุณาพิมพ์ข้อความ', 'warning');
              }
            });
          }

          // 打赏礼物表单
          const giftSubmitBtn = appContainer.querySelector('#confirm-send-gift');
          if (giftSubmitBtn) {
            giftSubmitBtn.addEventListener('click', () => {
              this.sendGifts();
            });
          }

          // 弹窗关闭按钮
          appContainer.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              this.hideAllModals();
            });
          });

          // 点击弹窗背景关闭
          appContainer.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
              if (e.target === modal) {
                this.hideAllModals();
              }
            });
          });

          // 自动"跳转"弹幕到底部（瞬时、仅在未在底部时触发）
          const danmakuContainer = appContainer.querySelector('#danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }

        console.log('[Live App] ผูกเหตุการณ์เสร็จสิ้น');
      } catch (error) {
        console.error('[Live App] เกิดข้อผิดพลาดในการผูกเหตุการณ์:', error);
        this.showToast('เกิดข้อผิดพลาดในการผูกเหตุการณ์: ' + error.message, 'error');
      }
    }

    // 若接近底部则保持不动；若不在底部则瞬时跳到底部
    jumpToBottomIfNeeded(container) {
      const threshold = 10; // px判定阈值
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distanceToBottom > threshold) {
        // 瞬间跳转，无动画
        container.scrollTop = container.scrollHeight;
      }
    }

    /**
     * 请求当前开播列表
     */
    async requestCurrentLiveList() {
      try {
        console.log('[Watch Live App] กำลังขอรายการไลฟ์...');

        // 先切换到列表视图
        this.currentView = 'list';
        this.isWaitingForLiveList = false; // 先设为false，立即解析现有内容

        // 立即解析并渲染现有的直播间列表
        console.log('[Watch Live App] กำลังประมวลผลรายการไลฟ์ที่มีอยู่...');
        this.updateAppContent();

        // 检查是否已有直播间数据
        const existingRooms = this.parseLiveRoomList();
        if (existingRooms.length > 0) {
          console.log(`[Watch Live App] พบห้องไลฟ์เดิม ${existingRooms.length} ห้อง เรนเดอร์ทันที`);
        } else {
          console.log('[Watch Live App] ไม่พบข้อมูลห้องไลฟ์เดิม');
        }

        // 然后发送请求获取新的直播间列表
        const message =
          'ผู้ใช้ต้องการรับชมไลฟ์ โปรดสร้างรายการห้องไลฟ์ที่อาจกำลังออกอากาศอยู่ 5-10 ห้องตามรูปแบบที่ถูกต้อง รูปแบบของแต่ละห้องคือ [直播|ชื่อห้องไลฟ์|ชื่อสตรีมเมอร์|หมวดหมู่ไลฟ์|จำนวนผู้ชม] สตรีมเมอร์อาจเป็นตัวละคร NPC หรือคนทั่วไป โปรดเว้นบรรทัดระหว่างแต่ละรูปแบบห้องให้ถูกต้อง';

        // 设置等待状态，准备接收新回复
        this.isWaitingForLiveList = true;

        // 开始监听AI回复
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);

        console.log('[Watch Live App] ส่งคำขอรายการไลฟ์แล้ว รอการตอบกลับ...');
      } catch (error) {
        console.error('[Watch Live App] ขอรายการไลฟ์ล้มเหลว:', error);
        this.showToast('ขอรายการไลฟ์ล้มเหลว: ' + error.message, 'error');
        this.isWaitingForLiveList = false;
      }
    }

    /**
     * 显示指定直播间弹窗
     */
    showSpecificLiveRoomModal() {
      // 创建弹窗HTML
      const modalHtml = `
        <div class="modal-overlay" id="specific-live-modal" style="display: flex;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>เข้าห้องไลฟ์ที่ต้องการ</h3>
              <button class="modal-close" onclick="watchLiveAppHideModal('specific-live-modal')">&times;</button>
            </div>
            <div class="modal-body">
              <div class="input-section">
                <label for="streamer-name-input">พิมพ์ชื่อสตรีมเมอร์ที่ต้องการรับชม：</label>
                <input type="text" id="streamer-name-input" placeholder="พิมพ์ชื่อสตรีมเมอร์..." />
              </div>
              <button class="watch-live-btn" id="watch-specific-live">รับชมไลฟ์</button>
            </div>
          </div>
        </div>
      `;

      // 添加到页面
      const appContainer = document.getElementById('app-content');
      if (appContainer) {
        appContainer.insertAdjacentHTML('beforeend', modalHtml);

        // 绑定观看直播按钮事件
        const watchBtn = document.getElementById('watch-specific-live');
        if (watchBtn) {
          watchBtn.addEventListener('click', () => {
            const input = document.getElementById('streamer-name-input');
            const streamerName = input ? input.value.trim() : '';
            if (streamerName) {
              this.watchSpecificLive(streamerName);
            } else {
              this.showToast('พิมพ์ชื่อสตรีมเมอร์ที่ต้องการรับชม：', 'warning');
            }
          });
        }
      }
    }

    /**
     * 观看指定直播
     */
    async watchSpecificLive(streamerName) {
      try {
        console.log('[Watch Live App] รับชมไลฟ์ของ:', streamerName);

        // 设置渲染权为watch
        await this.setRenderingRight('watch');

        const message = `ผู้ใช้เลือกรับชมไลฟ์ของ ${streamerName} โปรดสร้างข้อมูลตามรูปแบบที่ถูกต้อง: จำนวนผู้ชม เนื้อหาการไลฟ์ ข้อความแชท การโดเนท และการโต้ตอบที่แนะนำ ในการตอบกลับครั้งนี้ให้สร้างรูปแบบจำนวนผู้ชมและเนื้อหาไลฟ์เพียงครั้งเดียว เนื้อหาต้องกระชับ ท้ายสุดให้สร้างข้อความแนะนำ 4 ข้อความ ห้ามใช้รูปแบบที่ผิด ผู้ใช้กำลังดูไลฟ์อยู่ ข้อความแนะนำควรเป็นสิ่งที่ผู้ใช้อาจพิมพ์ส่งไป`;

        // 隐藏弹窗
        this.hideModal('specific-live-modal');

        // 切换到直播间视图
        this.currentView = 'live';
        this.stateManager.startLive();
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);
        this.updateAppContent();

        console.log('[Watch Live App] เข้าสู่ห้องไลฟ์ที่ระบุแล้ว');
      } catch (error) {
        console.error('[Watch Live App] เข้าสู่ห้องไลฟ์ล้มเหลว:', error);
        this.showToast('เข้าสู่ห้องไลฟ์ล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * 解析直播间列表数据
     * 参考live-app的解析方式，支持解析多个直播间格式
     */
    parseLiveRoomList() {
      try {
        // 获取最新的聊天内容
        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.log('[Watch Live App] ไม่พบเนื้อหาแชท');
          return [];
        }

        console.log('[Watch Live App] เริ่มประมวลผลรายการห้องไลฟ์ ความยาวเนื้อหา:', chatContent.length);

        // 匹配直播间格式：[直播|直播间名称|主播用户名|直播类别|观看人数]
        // 使用更严格的正则表达式，确保正确匹配
        const liveRoomRegex = /\[直播\|([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^|\]]+)\]/g;
        const rooms = [];
        let match;
        let matchCount = 0;

        // 重置正则表达式的lastIndex
        liveRoomRegex.lastIndex = 0;

        while ((match = liveRoomRegex.exec(chatContent)) !== null) {
          matchCount++;
          const roomData = {
            name: match[1].trim(),
            streamer: match[2].trim(),
            category: match[3].trim(),
            viewers: match[4].trim(),
          };

          // 验证数据有效性
          if (roomData.name && roomData.streamer && roomData.category && roomData.viewers) {
            rooms.push(roomData);
            console.log(`[Watch Live App] พบห้องไลฟ์ ${matchCount}:`, roomData);
          } else {
            console.warn('[Watch Live App] ข้ามข้อมูลห้องไลฟ์ที่ไม่ถูกต้อง:', roomData);
          }

          // 防止无限循环
          if (matchCount > 50) {
            console.warn('[Watch Live App] ถึงขีดจำกัดการประมวลผล หยุดการทำงาน');
            break;
          }
        }

        console.log(`[Watch Live App] ประมวลผลเสร็จสิ้น พบห้องไลฟ์ที่ถูกต้อง ${rooms.length} ห้อง`);
        return rooms;
      } catch (error) {
        console.error('[Watch Live App] ประมวลผลรายการห้องไลฟ์ล้มเหลว:', error);
        return [];
      }
    }

    /**
     * 观看选中的直播间
     */
    async watchSelectedRoom(roomData) {
      try {
        console.log('[Watch Live App] รับชมห้องไลฟ์ที่เลือก:', roomData);

        // 设置渲染权为watch
        await this.setRenderingRight('watch');

        const message = `ผู้ใช้เลือกรับชมไลฟ์: ชื่อห้องไลฟ์: ${roomData.name}, สตรีมเมอร์: ${roomData.streamer}, หมวดหมู่: ${roomData.category}, จำนวนผู้ชม: ${roomData.viewers} โปรดสร้างข้อมูลตามรูปแบบที่ถูกต้อง: จำนวนผู้ชม เนื้อหาการไลฟ์ ข้อความแชท การโดเนท และการโต้ตอบที่แนะนำ ในการตอบกลับครั้งนี้ให้สร้างรูปแบบจำนวนผู้ชมและเนื้อหาไลฟ์เพียงครั้งเดียว เนื้อหาต้องกระชับ ไลฟ์อาจจะเพิ่งเริ่มหรือดำเนินมาระยะหนึ่งแล้ว ท้ายสุดให้สร้างข้อความแนะนำ 4 ข้อความ ห้ามใช้รูปแบบที่ผิด ผู้ใช้กำลังดูไลฟ์อยู่ ข้อความแนะนำควรเป็นสิ่งที่ผู้ใช้อาจพิมพ์ส่งไป`;

        // 切换到直播间视图
        this.currentView = 'live';
        this.stateManager.startLive();
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);
        this.updateAppContent();

        console.log('[Watch Live App] เข้าสู่ห้องไลฟ์แล้ว');
      } catch (error) {
        console.error('[Watch Live App] เข้าสู่ห้องไลฟ์ล้มเหลว:', error);
        this.showToast('เข้าสู่ห้องไลฟ์ล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * 发送推荐弹幕
     */
    async sendDanmaku(danmaku) {
      try {
        console.log('[Watch Live App] ส่งข้อความแนะนำ:', danmaku);

        const message = `ผู้ใช้กำลังรับชมไลฟ์ และส่งข้อความ "${danmaku}" ห้ามส่งข้อความซ้ำหรือส่งแทนผู้ใช้ โปรดสร้างข้อมูลตามรูปแบบที่ถูกต้อง: จำนวนผู้ชม เนื้อหาการไลฟ์ ข้อความแชทอื่น ๆ การโดเนท และการโต้ตอบที่แนะนำ ในการตอบกลับครั้งนี้ให้สร้างรูปแบบจำนวนผู้ชมและเนื้อหาไลฟ์เพียงครั้งเดียว เนื้อหาต้องกระชับ ท้ายสุดให้สร้างข้อความแนะนำ 4 ข้อความ ซึ่งเป็นสิ่งที่ผู้ใช้อาจพิมพ์ส่งไป ห้ามใช้รูปแบบที่ผิด
[直播|{{user}}|弹幕|${danmaku}]`;

        await this.sendToSillyTavern(message);
        console.log('[Watch Live App] ส่งข้อความแนะนำแล้ว');
      } catch (error) {
        console.error('[Watch Live App] ส่งข้อความแนะนำล้มเหลว:', error);
        this.showToast('ส่งข้อความล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * 发送自定义弹幕
     */
    async sendCustomDanmaku(danmaku) {
      try {
        console.log('[Watch Live App] ส่งข้อความกำหนดเอง:', danmaku);

        const message = `ผู้ใช้กำลังรับชมไลฟ์ และส่งข้อความ "${danmaku}" ห้ามส่งข้อความซ้ำหรือส่งแทนผู้ใช้ โปรดสร้างข้อมูลตามรูปแบบที่ถูกต้อง: จำนวนผู้ชม เนื้อหาการไลฟ์ ข้อความแชทอื่น ๆ การโดเนท และการโต้ตอบที่แนะนำ ในการตอบกลับครั้งนี้ให้สร้างรูปแบบจำนวนผู้ชมและเนื้อหาไลฟ์เพียงครั้งเดียว เนื้อหาต้องกระชับ ท้ายสุดให้สร้างข้อความแนะนำ 4 ข้อความ ซึ่งเป็นสิ่งที่ผู้ใช้อาจพิมพ์ส่งไป ห้ามใช้รูปแบบที่ผิด
[直播|{{user}}|弹幕|${danmaku}]`;

        await this.sendToSillyTavern(message);
        console.log('[Watch Live App] ส่งข้อความกำหนดเองแล้ว');
      } catch (error) {
        console.error('[Watch Live App] ส่งข้อความกำหนดเองล้มเหลว:', error);
        this.showToast('ส่งข้อความล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * 初始化礼物弹窗
     */
    initGiftModal() {
      // 绑定礼物数量调整按钮
      const giftCards = document.querySelectorAll('.gift-card');
      giftCards.forEach(card => {
        const minusBtn = card.querySelector('.qty-btn.minus');
        const plusBtn = card.querySelector('.qty-btn.plus');
        const quantityInput = card.querySelector('.qty-input');

        if (minusBtn && plusBtn && quantityInput) {
          minusBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            if (quantity > 0) {
              quantity--;
              quantityInput.value = quantity;
              this.updateGiftTotal();
              this.updateGiftCardState(card, quantity);
            }
          });

          plusBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            quantity++;
            quantityInput.value = quantity;
            this.updateGiftTotal();
            this.updateGiftCardState(card, quantity);
          });

          // 监听输入框变化
          quantityInput.addEventListener('input', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            if (quantity < 0) {
              quantity = 0;
              quantityInput.value = quantity;
            }
            if (quantity > 999) {
              quantity = 999;
              quantityInput.value = quantity;
            }
            this.updateGiftTotal();
            this.updateGiftCardState(card, quantity);
          });
        }
      });

      // 初始化总金额
      this.updateGiftTotal();
    }

    /**
     * 更新礼物卡片状态
     */
    updateGiftCardState(card, quantity) {
      if (quantity > 0) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    }

    /**
     * 更新礼物总金额
     */
    updateGiftTotal() {
      let total = 0;
      const giftCards = document.querySelectorAll('.gift-card');

      giftCards.forEach(card => {
        const quantity = parseInt(card.querySelector('.qty-input').value) || 0;
        const price = parseInt(card.dataset.price);
        total += quantity * price;
      });

      const totalAmountSpan = document.getElementById('gift-total-amount');
      if (totalAmountSpan) {
        totalAmountSpan.textContent = total;
      }
    }

    /**
     * 发送礼物
     */
    async sendGifts() {
      try {
        const selectedGifts = [];
        const giftCards = document.querySelectorAll('.gift-card');

        giftCards.forEach(card => {
          const quantity = parseInt(card.querySelector('.qty-input').value) || 0;
          if (quantity > 0) {
            const giftName = card.dataset.gift;
            const price = parseInt(card.dataset.price);
            selectedGifts.push({
              name: giftName,
              quantity: quantity,
              price: price,
              total: quantity * price,
            });
          }
        });

        if (selectedGifts.length === 0) {
          this.showToast('กรุณาเลือกของขวัญที่ต้องการส่ง', 'warning');
          return;
        }

        const totalAmount = selectedGifts.reduce((sum, gift) => sum + gift.total, 0);
        const giftMessage = document.getElementById('gift-message-input')?.value.trim() || '';

        console.log('[Watch Live App] ส่งของขวัญ:', selectedGifts);

        // 构建礼物描述
        const giftDescriptions = selectedGifts
          .map(gift => (gift.quantity === 1 ? gift.name : `${gift.name}*${gift.quantity}`))
          .join('，');

        // 构建消息
        let message = `ผู้ใช้กำลังรับชมไลฟ์ และส่งของขวัญ "${giftDescriptions}" มูลค่า "${totalAmount} หยวน"`;
        if (giftMessage) {
          message += ` ข้อความโดเนท: "${giftMessage}"`;
        }
        message += ` ห้ามส่งข้อความซ้ำหรือส่งแทนผู้ใช้ โปรดสร้างข้อมูลตามรูปแบบที่ถูกต้อง: จำนวนผู้ชม เนื้อหาการไลฟ์ ข้อความแชทอื่น ๆ การโดเนท และการโต้ตอบที่แนะนำ ในการตอบกลับครั้งนี้ให้สร้างรูปแบบจำนวนผู้ชมและเนื้อหาไลฟ์เพียงครั้งเดียว เนื้อหาต้องกระชับ ท้ายสุดให้สร้างข้อความแนะนำ 4 ข้อความ ซึ่งเป็นสิ่งที่ผู้ใช้อาจพิมพ์ส่งไป ห้ามใช้รูปแบบที่ผิด
`;

        // 添加打赏格式 - 每种礼物一条记录
        selectedGifts.forEach(gift => {
          const giftFormat = gift.quantity === 1 ? gift.name : `${gift.name}*${gift.quantity}`;
          message += `[直播|{{user}}|打赏|${giftFormat}]\n`;
        });

        // 如果有留言，添加弹幕格式
        if (giftMessage) {
          message += `[直播|{{user}}|弹幕|${giftMessage}]`;
        }

        await this.sendToSillyTavern(message);

        // 重置礼物选择
        this.resetGiftModal();
        this.hideAllModals();

        console.log('[Watch Live App] ส่งของขวัญเรียบร้อยแล้ว');
        this.showToast('ส่งของขวัญสำเร็จ!', 'success');
      } catch (error) {
        console.error('[Watch Live App] ส่งของขวัญล้มเหลว:', error);
        this.showToast('ส่งของขวัญล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * 重置礼物弹窗
     */
    resetGiftModal() {
      const giftCards = document.querySelectorAll('.gift-card');
      giftCards.forEach(card => {
        const quantityInput = card.querySelector('.qty-input');
        if (quantityInput) {
          quantityInput.value = '0';
        }
        card.classList.remove('selected');
      });

      // 清空留言
      const messageInput = document.getElementById('gift-message-input');
      if (messageInput) {
        messageInput.value = '';
      }

      this.updateGiftTotal();
    }

    /**
     * 显示弹窗
     */
    showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }
    }

    /**
     * 隐藏弹窗
     */
    hideModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        // 如果是动态创建的弹窗，移除它
        if (modalId === 'specific-live-modal') {
          modal.remove();
        }
      }
    }

    /**
     * 隐藏所有弹窗
     */
    hideAllModals() {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        modal.classList.remove('active');
      });
    }

    /**
     * 设置渲染权
     */
    async setRenderingRight(type) {
      try {
        console.log(`[Watch Live App] ตั้งค่าสิทธิ์การเรนเดอร์เป็น: ${type}`);

        if (!window.mobileContextEditor) {
          console.warn('[Watch Live App] โปรแกรมแก้ไขบริบทไม่พร้อม ไม่สามารถตั้งค่าสิทธิ์การเรนเดอร์');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Watch Live App] ไม่พบข้อมูลแชท ไม่สามารถตั้งค่าสิทธิ์การเรนเดอร์');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // 检查是否已经包含渲染权标记
        const renderingRightRegex = /([\s\S]*?)/;
        const renderingRightSection = `\n[直播渲染权: ${type}]\n`;

        if (renderingRightRegex.test(originalContent)) {
          // 更新现有的渲染权标记
          originalContent = originalContent.replace(renderingRightRegex, renderingRightSection);
        } else {
          // 在内容开头添加渲染权标记
          originalContent = renderingRightSection + '\n\n' + originalContent;
        }

        // 更新第1楼层
        const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
        if (success) {
          console.log(`[Watch Live App] ✅ ตั้งค่าสิทธิ์การเรนเดอร์สำเร็จ: ${type}`);
          return true;
        } else {
          console.error('[Watch Live App] ตั้งค่าสิทธิ์การเรนเดอร์ล้มเหลว');
          return false;
        }
      } catch (error) {
        console.error('[Watch Live App] เกิดข้อผิดพลาดขณะตั้งค่าสิทธิ์การเรนเดอร์:', error);
        return false;
      }
    }

    /**
     * 获取当前渲染权
     */
    getRenderingRight() {
      try {
        if (!window.mobileContextEditor) {
          return null;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          return null;
        }

        const firstMessage = chatData.messages[0];
        const content = firstMessage.mes || '';

        const renderingRightRegex = /\s*\[直播渲染权:\s*(\w+)\]\s*/;
        const match = content.match(renderingRightRegex);

        return match ? match[1] : null;
      } catch (error) {
        console.error('[Watch Live App] เกิดข้อผิดพลาดขณะดึงสิทธิ์การเรนเดอร์:', error);
        return null;
      }
    }

    /**
     * ล้างสิทธิ์การเรนเดอร์ (Clear Rendering Right)
     */
    async clearRenderingRight() {
      try {
        console.log('[Watch Live App] ล้างสิทธิ์การเรนเดอร์');

        if (!window.mobileContextEditor) {
          console.warn('[Watch Live App] ตัวแก้ไขบริบท (Context Editor) ไม่พร้อม ไม่สามารถล้างสิทธิ์การเรนเดอร์ได้');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Watch Live App] ไม่พบข้อมูลแชท ไม่สามารถล้างสิทธิ์การเรนเดอร์ได้');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // ลบแท็กสิทธิ์การเรนเดอร์ออก
        const renderingRightRegex = /([\s\S]*?)\s*\n*/;
        if (renderingRightRegex.test(originalContent)) {
          originalContent = originalContent.replace(renderingRightRegex, '').trim();

          // อัปเดตข้อความในชั้นที่ 1 (First floor/message)
          const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
          if (success) {
            console.log('[Watch Live App] ✅ ล้างสิทธิ์การเรนเดอร์เรียบร้อยแล้ว');
            return true;
          } else {
            console.error('[Watch Live App] ล้างสิทธิ์การเรนเดอร์ล้มเหลว');
            return false;
          }
        } else {
          console.log('[Watch Live App] ไม่พบเครื่องหมายสิทธิ์การเรนเดอร์');
          return true;
        }
      } catch (error) {
        console.error('[Watch Live App] เกิดข้อผิดพลาดขณะล้างสิทธิ์การเรนเดอร์:', error);
        return false;
      }
    }

    /**
     * ส่งข้อความไปยัง SillyTavern
     */
    async sendToSillyTavern(message) {
      try {
        console.log('[Live App] ส่งข้อความไปยัง SillyTavern:', message);

        // พยายามหากล่องรับข้อความ
        const textarea = document.querySelector('#send_textarea');
        if (!textarea) {
          console.error('[Live App] ไม่พบกล่องข้อความ');
          throw new Error('ไม่พบกล่องข้อความ');
        }

        // กำหนดเนื้อหาข้อความ
        textarea.value = message;
        textarea.focus();

        // กระตุ้น event input
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // กระตุ้นการคลิกปุ่มส่ง
        const sendButton = document.querySelector('#send_but');
        if (sendButton) {
          sendButton.click();
          console.log('[Live App] คลิกปุ่มส่งแล้ว');
          return true;
        }

        throw new Error('ไม่พบปุ่มส่งข้อความ');
      } catch (error) {
        console.error('[Live App] เกิดข้อผิดพลาดขณะส่งข้อความ:', error);
        throw error;
      }
    }

    /**
     * แปลงรูปแบบไลฟ์เป็นรูปแบบประวัติไลฟ์
     * (เพื่อให้ระบบรู้ว่าเป็นไลฟ์ที่จบไปแล้ว)
     */
    async convertLiveToHistory() {
      try {
        console.log('[Watch Live App] เริ่มแปลงรูปแบบไลฟ์เป็นรูปแบบประวัติไลฟ์');

        // ดึงข้อมูลแชทปัจจุบัน
        const contextData = this.getChatData();
        if (!contextData || contextData.length === 0) {
          console.log('[Watch Live App] ไม่พบข้อมูลแชท');
          return;
        }

        // ค้นหาข้อความที่มีเนื้อหาไลฟ์
        let hasLiveContent = false;
        let updatedCount = 0;
        const messagesToUpdate = []; // รวบรวมข้อความที่ต้องอัปเดต

        // รอบที่ 1: รวบรวมข้อความทั้งหมดที่ต้องแปลง
        for (let i = 0; i < contextData.length; i++) {
          const message = contextData[i];
          const content = message.mes || message.content || '';

          if (content.includes('[直播|')) {
            hasLiveContent = true;
            // แปลงรูปแบบ
            const convertedContent = this.convertLiveFormats(content);

            if (convertedContent !== content) {
              messagesToUpdate.push({
                index: i,
                originalContent: content,
                convertedContent: convertedContent,
              });
            }
          }
        }

        if (!hasLiveContent) {
          console.log('[Watch Live App] ไม่พบเนื้อหาไลฟ์ที่ต้องแปลง');
          return;
        }

        // รอบที่ 2: อัปเดตข้อความแบบกลุ่ม ลดการจัดการ DOM และการบันทึกที่บ่อยเกินไป
        console.log(`[Watch Live App] เริ่มอัปเดตข้อความแบบกลุ่มจำนวน ${messagesToUpdate.length} ข้อความ`);

        // ปิดการบันทึกอัตโนมัติชั่วคราว เพื่อป้องกันการบันทึกซ้ำซ้อน
        const originalSaveChatDebounced = window.saveChatDebounced;
        const originalSaveChatConditional = window.saveChatConditional;

        // แทนที่ด้วยฟังก์ชันว่างชั่วคราว
        if (window.saveChatDebounced) {
          window.saveChatDebounced = () => {};
        }
        if (window.saveChatConditional) {
          window.saveChatConditional = () => Promise.resolve();
        }

        try {
          for (const messageUpdate of messagesToUpdate) {
            // ข้ามการบันทึกอัตโนมัติขณะประมวลผลแบบกลุ่ม
            const success = await this.updateMessageContent(messageUpdate.index, messageUpdate.convertedContent, true);
            if (success) {
              updatedCount++;
              console.log(
                `[Watch Live App] แปลงข้อความที่ ${messageUpdate.index} แล้ว, ความยาวเดิม: ${messageUpdate.originalContent.length}, ความยาวใหม่: ${messageUpdate.convertedContent.length}`,
              );
            }
          }
        } finally {
          // คืนค่าฟังก์ชันบันทึกเดิม
          if (originalSaveChatDebounced) {
            window.saveChatDebounced = originalSaveChatDebounced;
          }
          if (originalSaveChatConditional) {
            window.saveChatConditional = originalSaveChatConditional;
          }
        }

        console.log(`[Watch Live App] การแปลงรูปแบบไลฟ์เสร็จสมบูรณ์ อัปเดตไปทั้งหมด ${updatedCount} ข้อความ`);

        // บันทึกข้อมูลแชทเพียงครั้งเดียวในตอนท้าย
        if (updatedCount > 0) {
          await this.saveChatData();
          console.log('[Watch Live App] แปลงเสร็จสิ้นและบันทึกข้อมูลแชทแล้ว');
        }
      } catch (error) {
        console.error('[Watch Live App] แปลงรูปแบบไลฟ์ล้มเหลว:', error);
        this.showToast('แปลงรูปแบบไลฟ์ล้มเหลว: ' + error.message, 'error');
      }
    }

    /**
     * ฟังก์ชันแปลง string รูปแบบไลฟ์
     * หมายเหตุ: ส่วนที่เป็น Regex และ Tag (เช่น [直播|...]) ต้องคงภาษาจีนไว้ตาม Logic เดิมของระบบ
     */
    convertLiveFormats(content) {
      let convertedContent = content;
      let conversionCount = 0;

      // แปลงรูปแบบข้อความวิ่ง (Danmaku): [直播|用户|弹幕|内容] -> [直播历史|用户|弹幕|内容]
      const danmuMatches = convertedContent.match(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g);
      if (danmuMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g, '[直播历史|$1|弹幕|$2]');
        conversionCount += danmuMatches.length;
      }

      // แปลงรูปแบบของขวัญ: [直播|用户|礼物|内容] -> [直播历史|用户|礼物|内容]
      // แปลงรูปแบบการโดเนท: [直播|用户|打赏|内容] -> [直播历史|用户|打赏|内容]
      const giftMatches = convertedContent.match(/\[直播\|([^|]+)\|(?:礼物|打赏)\|([^\]]+)\]/g);
      if (giftMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|礼物\|([^\]]+)\]/g, '[直播历史|$1|礼物|$2]');
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|打赏\|([^\]]+)\]/g, '[直播历史|$1|打赏|$2]');
        conversionCount += giftMatches.length;
      }

      // แปลงรูปแบบการโต้ตอบแนะนำ: [直播|推荐互动|内容] -> [直播历史|推荐互动|内容]
      const recommendMatches = convertedContent.match(/\[直播\|推荐互动\|([^\]]+)\]/g);
      if (recommendMatches) {
        convertedContent = convertedContent.replace(/\[直播\|推荐互动\|([^\]]+)\]/g, '[直播历史|推荐互动|$1]');
        conversionCount += recommendMatches.length;
      }

      // แปลงรูปแบบจำนวนผู้ชม: [直播|本场人数|数字] -> [直播历史|本场人数|数字]
      const audienceMatches = convertedContent.match(/\[直播\|本场人数\|([^\]]+)\]/g);
      if (audienceMatches) {
        convertedContent = convertedContent.replace(/\[直播\|本场人数\|([^\]]+)\]/g, '[直播历史|本场人数|$1]');
        conversionCount += audienceMatches.length;
      }

      // แปลงรูปแบบเนื้อหาไลฟ์: [直播|直播内容|内容] -> [直播历史|直播内容|内容]
      const contentMatches = convertedContent.match(/\[直播\|直播内容\|([^\]]+)\]/g);
      if (contentMatches) {
        convertedContent = convertedContent.replace(/\[直播\|直播内容\|([^\]]+)\]/g, '[直播历史|直播内容|$1]');
        conversionCount += contentMatches.length;
      }

      // แปลงรูปแบบอื่นๆ ที่อาจเป็นไปได้ (รองรับรูปแบบเก่า)
      const otherMatches = convertedContent.match(/\[直播\|([^|]+)\|([^\]]+)\]/g);
      if (otherMatches) {
        // กรองรูปแบบที่ถูกประมวลผลไปแล้วออก
        const filteredMatches = otherMatches.filter(
          match =>
            !match.includes('弹幕|') &&
            !match.includes('礼物|') &&
            !match.includes('打赏|') &&
            !match.includes('推荐互动|') &&
            !match.includes('本场人数|') &&
            !match.includes('直播内容|'),
        );
        if (filteredMatches.length > 0) {
          convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|([^\]]+)\]/g, (match, p1, p2) => {
            if (
              !match.includes('弹幕|') &&
              !match.includes('礼物|') &&
              !match.includes('打赏|') &&
              !match.includes('推荐互动|') &&
              !match.includes('本场人数|') &&
              !match.includes('直播内容|')
            ) {
              return `[直播历史|${p1}|${p2}]`;
            }
            return match;
          });
          conversionCount += filteredMatches.length;
        }
      }

      // ลบ log การแปลงข้อความเดี่ยว เพื่อไม่ให้รก console
      // if (conversionCount > 0) {
      //    console.log(`[Watch Live App] แปลงรูปแบบไลฟ์ไปแล้ว ${conversionCount} รายการ`);
      // }

      return convertedContent;
    }

    /**
     * อัปเดตเนื้อหาข้อความ
     * @param {number} messageIndex - ดัชนีข้อความ
     * @param {string} newContent - เนื้อหาใหม่
     * @param {boolean} skipAutoSave - ข้ามการบันทึกอัตโนมัติหรือไม่ (สำหรับ batch processing)
     */
    async updateMessageContent(messageIndex, newContent, skipAutoSave = false) {
      try {
        // ลด log output เพื่อไม่ให้รก
        console.log(`[Watch Live App] กำลังอัปเดตข้อความที่ ${messageIndex}`);

        // วิธีที่ 1: ใช้ getChatData เพื่อดึง array chat (แนะนำ วิธีนี้จะไม่ trigger auto-save)
        let chat = null;

        // ลองใช้ SillyTavern.getContext().chat ก่อน
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            chat = context.chat;
          }
        }

        // ถ้าไม่เจอ ให้ลองดึงจาก global variable
        if (!chat) {
          chat = window['chat'];
        }

        if (chat && Array.isArray(chat)) {
          // ตรวจสอบขอบเขต
          if (messageIndex < 0 || messageIndex >= chat.length) {
            console.warn(`[Watch Live App] ดัชนีข้อความ ${messageIndex} อยู่นอกขอบเขต, ความยาว chat: ${chat.length}`);
            return false;
          }

          if (!chat[messageIndex]) {
            console.warn(`[Watch Live App] ไม่พบข้อความที่ดัชนี ${messageIndex}`);
            return false;
          }

          const originalContent = chat[messageIndex].mes || '';
          chat[messageIndex].mes = newContent;

          // ถ้าข้อความมี swipes ต้องอัปเดตด้วย
          if (chat[messageIndex].swipes && chat[messageIndex].swipe_id !== undefined) {
            chat[messageIndex].swipes[chat[messageIndex].swipe_id] = newContent;
          }

          // ทำเครื่องหมายว่าข้อมูลแชทมีการเปลี่ยนแปลง
          if (window.chat_metadata) {
            window.chat_metadata.tainted = true;
          }

          console.log(
            `[Watch Live App] อัปเดตข้อความที่ ${messageIndex} แล้ว, ความยาวเดิม:${originalContent.length}, ความยาวใหม่:${newContent.length}`,
          );
          return true;
        }

        // ข้อมูล Debug
        console.warn(
          `[Watch Live App] ไม่สามารถเข้าถึงอาร์เรย์ chat, ประเภท chat: ${typeof chat}, เป็น Array ไหม: ${Array.isArray(
            chat,
          )}`,
        );
        if (chat && Array.isArray(chat)) {
          console.warn(`[Watch Live App] ความยาว chat: ${chat.length}, ดัชนีที่ขอ: ${messageIndex}`);
        }

        // ถ้าวิธีตรงๆ ล้มเหลว ให้ลองวิธีสำรอง (แม้จะเป็น batch processing ก็ตาม)
        // วิธีที่ 2: ลองใช้ mobileContextEditor (อาจ trigger auto-save)
        if (window.mobileContextEditor && window.mobileContextEditor.modifyMessage) {
          try {
            await window.mobileContextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Watch Live App] อัปเดตข้อความ ${messageIndex} ผ่าน mobileContextEditor แล้ว`);
            return true;
          } catch (error) {
            console.warn(`[Watch Live App] mobileContextEditor อัปเดตล้มเหลว:`, error);
          }
        }

        // วิธีที่ 3: ลองใช้ contextEditor (อาจ trigger auto-save)
        if (window.contextEditor && window.contextEditor.modifyMessage) {
          try {
            await window.contextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Watch Live App] อัปเดตข้อความ ${messageIndex} ผ่าน contextEditor แล้ว`);
            return true;
          } catch (error) {
            console.warn(`[Watch Live App] contextEditor อัปเดตล้มเหลว:`, error);
          }
        }

        console.warn('[Watch Live App] ไม่พบวิธีอัปเดตข้อความที่ใช้งานได้');
        return false;
      } catch (error) {
        console.error('[Watch Live App] อัปเดตเนื้อหาข้อความล้มเหลว:', error);
        return false;
      }
    }

    /**
     * บันทึกข้อมูลแชท
     */
    async saveChatData() {
      try {
        console.log('[Live App] เริ่มบันทึกข้อมูลแชท...');

        // วิธีที่ 1: ใช้ฟังก์ชัน save ของ SillyTavern
        if (typeof window.saveChatConditional === 'function') {
          await window.saveChatConditional();
          console.log('[Live App] บันทึกข้อมูลแชทผ่าน saveChatConditional แล้ว');
          return true;
        }

        // วิธีที่ 2: ใช้การบันทึกแบบหน่วงเวลา (Debounced)
        if (typeof window.saveChatDebounced === 'function') {
          window.saveChatDebounced();
          console.log('[Live App] บันทึกข้อมูลแชทผ่าน saveChatDebounced แล้ว');
          // รอสักครู่เพื่อให้แน่ใจว่าบันทึกเสร็จ
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        // วิธีที่ 3: ใช้ฟังก์ชันบันทึกของ Editor
        if (window.mobileContextEditor && typeof window.mobileContextEditor.saveChatData === 'function') {
          await window.mobileContextEditor.saveChatData();
          console.log('[Live App] บันทึกข้อมูลแชทผ่าน mobileContextEditor แล้ว');
          return true;
        }

        // วิธีที่ 4: ใช้ฟังก์ชันบันทึกของ context-editor
        if (window.contextEditor && typeof window.contextEditor.saveChatData === 'function') {
          await window.contextEditor.saveChatData();
          console.log('[Live App] บันทึกข้อมูลแชทผ่าน contextEditor แล้ว');
          return true;
        }

        // วิธีที่ 5: พยายามบันทึกด้วยตัวเอง (Manual AJAX)
        try {
          if (window.jQuery && window.chat && window.this_chid) {
            const response = await window.jQuery.ajax({
              type: 'POST',
              url: '/api/chats/save',
              data: JSON.stringify({
                ch_name: window.characters[window.this_chid]?.name || 'unknown',
                file_name: window.chat_metadata?.file_name || 'default',
                chat: window.chat,
                avatar_url: window.characters[window.this_chid]?.avatar || 'none',
              }),
              cache: false,
              dataType: 'json',
              contentType: 'application/json',
            });
            console.log('[Live App] บันทึกข้อมูลแชทผ่าน Manual AJAX แล้ว');
            return true;
          }
        } catch (ajaxError) {
          console.warn('[Live App] Manual AJAX บันทึกล้มเหลว:', ajaxError);
        }

        console.warn('[Live App] ไม่พบวิธีบันทึกที่ใช้งานได้');
        return false;
      } catch (error) {
        console.error('[Live App] บันทึกข้อมูลแชทล้มเหลว:', error);
        return false;
      }
    }

    /**
     * ดึงข้อมูลแชท
     */
    getChatData() {
      try {
        // ลองใช้ SillyTavern.getContext().chat ก่อน
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            return context.chat;
          }
        }

        // ลองดึงจาก global variable
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        return [];
      } catch (error) {
        console.error('[Live App] ดึงข้อมูลแชทล้มเหลว:', error);
        return [];
      }
    }

    /**
     * อัปเดตส่วนหัว (Header)
     */
    updateHeader() {
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'watch-live', // แก้ไข: ใช้ชื่อแอพที่ถูกต้อง
          title: this.currentView === 'live' ? 'กำลังรับชมไลฟ์' : 'รับชมไลฟ์',
          view: this.currentView,
          viewerCount: this.stateManager.currentViewerCount,
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    /**
     * แสดงข้อความแจ้งเตือน (Toast)
     */
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `live-toast ${type}`;
      toast.textContent = message;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 100);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3000);
    }

    /**
     * เอฟเฟกต์เครื่องพิมพ์ดีด: แสดงข้อความทีละตัวอักษร ความเร็วปานกลาง
     */
    applyTypingEffect(element, fullText) {
      // ถ้ากำลังพิมพ์อยู่ ให้หยุดก่อน
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // ถ้าเนื้อหาเหมือนเดิมและแสดงผลครบแล้ว ไม่ต้องพิมพ์ซ้ำ
      if (element.getAttribute('data-full-text') === fullText && element.textContent === fullText) {
        return;
      }

      element.setAttribute('data-full-text', fullText);
      element.textContent = '';
      // ตรวจสอบให้แน่ใจว่าเริ่มแสดงจากด้านบน
      if (typeof element.scrollTop === 'number') {
        element.scrollTop = 0;
      }
      this.isTyping = true;

      const chars = Array.from(fullText);
      let index = 0;
      const stepMsHead = 35; // 100 ตัวอักษรแรก: ทีละตัว
      const stepMsTailChunk = 18; // ส่วนท้าย: แสดงเป็นกลุ่ม (ไม่ทีละตัว)
      const tailChunkSize = 6; // จำนวนตัวอักษรที่เพิ่มต่อครั้ง (ลื่นไหลแต่ไม่กระตุก)

      // ก่อนเริ่มพิมพ์ ตรวจสอบตำแหน่ง scroll
      const danmakuContainer = document.getElementById('danmaku-container');
      if (danmakuContainer) {
        this.jumpToBottomIfNeeded(danmakuContainer);
      }

      this.typingTimer = setInterval(() => {
        if (index >= chars.length) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
          this.isTyping = false;
          return;
        }

        if (index < 100) {
          // 100 ตัวแรกพิมพ์ทีละตัว
          element.textContent += chars[index++];
        } else {
          // หลังจากนั้นเพิ่มเป็นกลุ่ม
          const end = Math.min(index + tailChunkSize, chars.length);
          const slice = chars.slice(index, end).join('');
          element.textContent += slice;
          index = end;
          // ปรับจังหวะ: หยุดชั่วคราวเพื่อความลื่นไหล
          clearInterval(this.typingTimer);
          this.typingTimer = setInterval(() => {
            if (index >= chars.length) {
              clearInterval(this.typingTimer);
              this.typingTimer = null;
              this.isTyping = false;
              return;
            }
            const end2 = Math.min(index + tailChunkSize, chars.length);
            const slice2 = chars.slice(index, end2).join('');
            element.textContent += slice2;
            index = end2;
            if (index >= chars.length) {
              clearInterval(this.typingTimer);
              this.typingTimer = null;
              this.isTyping = false;
            }
          }, stepMsTailChunk);
        }
      }, stepMsHead);
    }

    /**
     * ทำลายแอพพลิเคชั่น ล้างทรัพยากร
     */
    destroy() {
      console.log('[Live App] ทำลายแอพพลิเคชั่นและล้างทรัพยากร');

      // หยุดการฟังเหตุการณ์
      this.eventListener.stopListening();

      // ล้างตัวจับเวลา (Timer)
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = null;
      }
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // ล้างข้อมูลสถานะ
      this.stateManager.clearAllData();

      // รีเซ็ตสถานะ
      this.isInitialized = false;
      this.currentView = 'start';
    }

    /**
     * ดึงข้อความจากชั้นล่าสุด (ปลอดภัย) - (เน้นใช้ interface getChatMessages)
     */
    getLatestFloorTextSafe() {
      try {
        const gm = (typeof window !== 'undefined' && (window.getChatMessages || globalThis.getChatMessages)) || null;
        if (typeof gm === 'function') {
          // เอาเฉพาะชั้นล่าสุด เน้นบทบาท assistant
          const latestAssistant = gm(-1, { role: 'assistant' });
          if (Array.isArray(latestAssistant) && latestAssistant.length > 0 && latestAssistant[0]?.message) {
            return latestAssistant[0].message;
          }
          // ถอยไปใช้บทบาทใดก็ได้
          const latestAny = gm(-1);
          if (Array.isArray(latestAny) && latestAny.length > 0 && latestAny[0]?.message) {
            return latestAny[0].message;
          }
        }
      } catch (e) {
        console.warn('[Live App] ดึงข้อความชั้นล่าสุดล้มเหลว (getChatMessages):', e);
      }

      // วิธีสำรอง: ดึงจาก array context ตัวสุดท้าย
      try {
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && Array.isArray(context.chat) && context.chat.length > 0) {
            const last = context.chat[context.chat.length - 1];
            return last?.mes || '';
          }
        }
      } catch (e2) {
        console.warn('[Live App] ดึงข้อความชั้นล่าสุดล้มเหลว (chat backup):', e2);
      }
      return '';
    }

    /** สร้างลายเซ็นข้อความวิ่ง (เสถียร, ไม่รวมเวลา) */
    createDanmakuSignature(item) {
      const username = (item && item.username) || '';
      const content = (item && item.content) || '';
      const type = (item && item.type) || '';
      return `${username}|${content}|${type}`;
    }

    /** สร้างลายเซ็นของขวัญ (เสถียร, ไม่รวมเวลา) */
    createGiftSignature(item) {
      const username = (item && item.username) || '';
      const gift = (item && (item.gift || item.content)) || '';
      return `${username}|${gift}`;
    }

    /** แสดงข้อความวิ่งและของขวัญที่ต้องมีแอนิเมชั่นตามลำดับ */
    runAppearSequence() {
      try {
        const danmakuList = document.getElementById('danmaku-list');
        if (danmakuList) {
          const nodes = Array.from(danmakuList.querySelectorAll('.danmaku-item.need-appear'));
          // เรนเดอร์ครั้งแรกซ่อนโหนดที่ต้องมีแอนิเมชั่นก่อน (ใช้ display:none เลี่ยงพื้นที่ว่าง)
          nodes.forEach(el => {
            el.style.display = 'none';
          });
          this.sequentialReveal(nodes);
        }

        const giftList = document.querySelector('.gift-list');
        if (giftList) {
          const giftNodes = Array.from(giftList.querySelectorAll('li.need-appear'));
          giftNodes.forEach(el => {
            el.style.display = 'none';
          });
          this.sequentialReveal(giftNodes);
        }

        // ล้างรายการรอแอนิเมชั่น เพื่อไม่ให้เล่นซ้ำ
        this.pendingAppearDanmakuSigs.clear();
        this.pendingAppearGiftSigs.clear();
      } catch (e) {
        console.warn('[Live App] การรันลำดับแอนิเมชั่นล้มเหลว:', e);
      }
    }

    /** ทยอยแสดงโหนดโดยเพิ่ม appear-init → appear-show (มีระยะห่าง) */
    sequentialReveal(nodes) {
      if (!nodes || nodes.length === 0) return;

      // สถานะเริ่มต้น (ซ่อนก่อน เลี่ยงการกระตุก) แล้วค่อยให้ CSS transition จัดการ
      nodes.forEach(el => {
        el.classList.remove('need-appear', 'appear-show');
        el.classList.add('appear-init');
        // ใช้ display:none เลี่ยงการกินพื้นที่
        el.style.display = 'none';
      });

      // ทยอยแสดง: ประมาณ 700ms ต่อรายการ (ช้าลง), transition เดี่ยว ~300ms (ดู CSS)
      const baseDelay = 150;
      const stepDelay = 700; // ≈ 0.7 วินาที/รายการ
      nodes.forEach((el, idx) => {
        setTimeout(() => {
          // แสดงและเริ่ม transition
          el.style.display = '';
          // บังคับ reflow เพื่อให้ transition ทำงาน
          // eslint-disable-next-line no-unused-expressions
          el.offsetHeight;
          el.classList.add('appear-show');
          // เมื่อแสดงแล้ว ถ้ามีคอนเทนเนอร์ให้เลื่อนลงมาล่างสุด (ทันที, ไม่มีแอนิเมชั่น)
          const container = document.getElementById('danmaku-container');
          if (container && el?.scrollIntoView) {
            el.scrollIntoView({ block: 'end', inline: 'nearest' });
          }
        }, baseDelay + idx * stepDelay);
      });
    }

    async debouncedSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      this.saveTimeout = setTimeout(async () => {
        await this.saveChatData();
        this.saveTimeout = null;
      }, this.saveDebounceMs);
    }
  }

  // สร้างอินสแตนซ์ global
  window.WatchLiveApp = WatchLiveApp;
  window.watchLiveApp = new WatchLiveApp();
} // จบการตรวจสอบคลาส

// ฟังก์ชัน Global สำหรับเรียกใช้
window.getWatchLiveAppContent = function () {
  console.log('[Watch Live App] ดึงเนื้อหาแอพรับชมไลฟ์');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] ไม่พบอินสแตนซ์ watchLiveApp');
    return '<div class="error-message">โหลดแอพรับชมไลฟ์ล้มเหลว</div>';
  }

  try {
    // ตรวจสอบสถานะไลฟ์ทุกครั้งที่ดึงเนื้อหา
    window.watchLiveApp.detectActiveLive();
    return window.watchLiveApp.getAppContent();
  } catch (error) {
    console.error('[Watch Live App] ดึงเนื้อหาแอพล้มเหลว:', error);
    return '<div class="error-message">โหลดเนื้อหาแอพรับชมไลฟ์ล้มเหลว</div>';
  }
};

window.bindWatchLiveAppEvents = function () {
  console.log('[Watch Live App] ผูกเหตุการณ์แอพรับชมไลฟ์');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] ไม่พบอินสแตนซ์ watchLiveApp');
    return;
  }

  try {
    // หน่วงเวลาผูกเหตุการณ์เพื่อให้ DOM โหลดเสร็จ
    setTimeout(() => {
      window.watchLiveApp.bindEvents();
      window.watchLiveApp.updateHeader();
    }, 100);
  } catch (error) {
    console.error('[Watch Live App] ผูกเหตุการณ์ล้มเหลว:', error);
  }
};

// ฟังก์ชัน Global อื่นๆ
window.watchLiveAppEndLive = function () {
  if (window.watchLiveApp) {
    window.watchLiveApp.endLive();
  }
};

window.watchLiveAppShowModal = function (modalId) {
  if (window.watchLiveApp) {
    window.watchLiveApp.showModal(modalId);
  }
};

window.watchLiveAppHideModal = function (modalId) {
  if (window.watchLiveApp) {
    window.watchLiveApp.hideModal(modalId);
  }
};

window.watchLiveAppDestroy = function () {
  if (window.watchLiveApp) {
    window.watchLiveApp.destroy();
    console.log('[Watch Live App] แอพถูกทำลายแล้ว');
  }
};

window.watchLiveAppDetectActive = function () {
  if (window.watchLiveApp) {
    console.log('[Watch Live App] 🔍 ตรวจสอบสถานะไลฟ์แบบ manual...');
    window.watchLiveApp.detectActiveLive();

    // อัปเดต UI
    if (typeof window.bindWatchLiveAppEvents === 'function') {
      window.bindWatchLiveAppEvents();
    }

    console.log('[Watch Live App] ✅ ตรวจสอบเสร็จสิ้น, สถานะปัจจุบัน:', {
      view: window.watchLiveApp.currentView,
      isLiveActive: window.watchLiveApp.isLiveActive,
    });
  } else {
    console.error('[Watch Live App] ไม่พบอินสแตนซ์ watchLiveApp');
  }
};

window.watchLiveAppForceReload = function () {
  console.log('[Watch Live App] 🔄 บังคับรีโหลดแอพ...');

  // ทำลายอินสแตนซ์เก่าก่อน
  if (window.watchLiveApp) {
    window.watchLiveApp.destroy();
  }

  // สร้างอินสแตนซ์ใหม่
  window.watchLiveApp = new WatchLiveApp();
  console.log('[Watch Live App] ✅ รีโหลดแอพเรียบร้อยแล้ว');
};

// ทดสอบฟังก์ชันการแปลง
window.watchLiveAppTestConversion = function () {
  console.log('[Watch Live App] 🧪 ทดสอบฟังก์ชันการแปลง...');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] ไม่พบอินสแตนซ์ watchLiveApp');
    return;
  }

  // ข้อความทดสอบ (ต้องคง Tag ภาษาจีนไว้ทดสอบ Logic)
  const testContent = `นี่คือข้อความทดสอบ
[直播|小明|弹幕|主播你好！今天吃的什么呀？]
[直播|小红|礼物|璀璨火箭*2]
[直播|推荐互动|回答小明的弹幕问题]
[直播|推荐互动|感谢小红的礼物]
[直播|本场人数|55535]
[直播|直播内容|你微笑着调整了一下耳机，准备开始今天的杂谈直播。]
จบการทดสอบ`;

  console.log('เนื้อหาต้นฉบับ:', testContent);
  const converted = window.watchLiveApp.convertLiveFormats(testContent);
  console.log('เนื้อหาหลังแปลง:', converted);

  return converted;
};

// ทดสอบความสูง Layout
window.watchLiveAppTestLayout = function () {
  console.log('[Watch Live App] 📐 ทดสอบความสูง Layout...');

  const appContent = document.getElementById('app-content');
  if (!appContent) {
    console.error('[Watch Live App] ไม่พบองค์ประกอบ app-content');
    return;
  }

  const liveContainer = appContent.querySelector('.live-container');
  if (!liveContainer) {
    console.error('[Live App] ไม่พบองค์ประกอบ live-container');
    return;
  }

  const videoBox = liveContainer.querySelector('.video-placeholder');
  const interactionPanel = liveContainer.querySelector('.interaction-panel');
  const danmakuContainer = liveContainer.querySelector('.danmaku-container');

  const measurements = {
    appContent: {
      height: appContent.offsetHeight,
      scrollHeight: appContent.scrollHeight,
      clientHeight: appContent.clientHeight,
    },
    liveContainer: {
      height: liveContainer.offsetHeight,
      scrollHeight: liveContainer.scrollHeight,
      clientHeight: liveContainer.clientHeight,
    },
    videoBox: videoBox
      ? {
          height: videoBox.offsetHeight,
          scrollHeight: videoBox.scrollHeight,
          clientHeight: videoBox.clientHeight,
        }
      : null,
    interactionPanel: interactionPanel
      ? {
          height: interactionPanel.offsetHeight,
          scrollHeight: interactionPanel.scrollHeight,
          clientHeight: interactionPanel.clientHeight,
        }
      : null,
    danmakuContainer: danmakuContainer
      ? {
          height: danmakuContainer.offsetHeight,
          scrollHeight: danmakuContainer.scrollHeight,
          clientHeight: danmakuContainer.clientHeight,
        }
      : null,
  };

  console.log('[Live App] 📐 ผลการวัด Layout:', measurements);

  // ตรวจสอบว่าล้นหรือไม่
  const hasOverflow = measurements.liveContainer.scrollHeight > measurements.liveContainer.clientHeight;
  const danmakuCanScroll =
    measurements.danmakuContainer &&
    measurements.danmakuContainer.scrollHeight > measurements.danmakuContainer.clientHeight;

  console.log('[Watch Live App] 📐 ตรวจสอบ Layout:');
  console.log(`- คอนเทนเนอร์ล้นหรือไม่: ${hasOverflow ? '❌ ใช่' : '✅ ไม่'}`);
  console.log(`- ข้อความวิ่งเลื่อนได้หรือไม่: ${danmakuCanScroll ? '✅ ได้' : '❌ ไม่ได้'}`);

  return measurements;
};

// ฟังก์ชันทดสอบ
window.watchLiveAppTest = function () {
  console.log('[Watch Live App] 🧪 เริ่มทดสอบแอพรับชมไลฟ์...');

  const tests = [
    {
      name: 'ตรวจสอบว่ามีคลาส WatchLiveApp',
      test: () => typeof window.WatchLiveApp === 'function',
    },
    {
      name: 'ตรวจสอบว่ามีอินสแตนซ์ watchLiveApp',
      test: () => window.watchLiveApp instanceof window.WatchLiveApp,
    },
    {
      name: 'ตรวจสอบฟังก์ชัน Global',
      test: () =>
        typeof window.getWatchLiveAppContent === 'function' && typeof window.bindWatchLiveAppEvents === 'function',
    },
    {
      name: 'ตรวจสอบตัวแปลงข้อมูล (Data Parser)',
      test: () => {
        const parser = new window.WatchLiveApp().dataParser;
        // คง string จีนไว้ทดสอบ parser
        const testData = parser.parseLiveData('[直播|本场人数|1234][直播|直播内容|测试内容][直播|用户1|弹幕|测试弹幕]');
        return (
          testData.viewerCount === '1.2K' && testData.liveContent === '测试内容' && testData.danmakuList.length === 1
        );
      },
    },
    {
      name: 'ตรวจสอบการสร้างเนื้อหาแอพ',
      test: () => {
        const content = window.getWatchLiveAppContent();
        return typeof content === 'string' && content.includes('live-app');
      },
    },
    {
      name: 'ตรวจสอบการตรวจจับไลฟ์สด',
      test: () => {
        const app = new window.WatchLiveApp();
        const testContent1 = '[直播|本场人数|1234][直播|直播内容|测试内容]';
        const testContent2 = '[直播历史|本场人数|1234][直播历史|直播内容|测试内容]';
        const testContent3 = 'แชทปกติที่ไม่มีเนื้อหาไลฟ์';

        return (
          app.hasActiveLiveFormats(testContent1) === true &&
          app.hasActiveLiveFormats(testContent2) === false &&
          app.hasActiveLiveFormats(testContent3) === false
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = test.test();
      if (result) {
        console.log(`✅ ${test.name}: ผ่าน`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ล้มเหลว`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ผิดพลาด - ${error.message}`);
      failed++;
    }
  });

  console.log(`[Watch Live App] 🧪 ทดสอบเสร็จสิ้น: ผ่าน ${passed}, ล้มเหลว ${failed}`);

  if (failed === 0) {
    console.log('[Watch Live App] 🎉 การทดสอบทั้งหมดผ่าน! แอพรับชมไลฟ์พร้อมใช้งาน');
  } else {
    console.log('[Watch Live App] ⚠️ การทดสอบบางรายการล้มเหลว โปรดตรวจสอบฟังก์ชันที่เกี่ยวข้อง');
  }

  return { passed, failed, total: tests.length };
};

console.log('[Watch Live App] โหลดโมดูลแอพรับชมไลฟ์เสร็จสมบูรณ์');
console.log('[Watch Live App] 💡 ฟังก์ชันที่ใช้งานได้:');
console.log('[Watch Live App] - watchLiveAppTest() ทดสอบฟังก์ชันแอพ');
console.log('[Watch Live App] - watchLiveAppTestConversion() ทดสอบฟังก์ชันแปลงรูปแบบ');
console.log('[Watch Live App] - watchLiveAppTestLayout() ทดสอบความสูง Layout');
console.log('[Watch Live App] - watchLiveAppDetectActive() ตรวจสอบสถานะไลฟ์แบบ manual');
console.log('[Watch Live App] - watchLiveAppForceReload() บังคับรีโหลดแอพ');
