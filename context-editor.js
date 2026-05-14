// ==Mobile Context Editor==
// @name         Mobile Context Editor
// @version      2.0.0
// @description  ตัวแก้ไขบริบทบนมือถือของ SillyTavern - ใช้ API ดั้งเดิม
// @author       cd
// @license      MIT

/**
 * ตัวแก้ไขบริบทบนมือถือของ SillyTavern v2.2 - เวอร์ชันปรับแต่งประสิทธิภาพ
 * ใช้ SillyTavern.getContext() API และโครงสร้างข้อมูล
 * เพิ่มใหม่: โหลดแบบแบ่งหน้า, virtual scroll, lazy load และการปรับแต่งประสิทธิภาพอื่น ๆ
 */
class MobileContextEditor {
  constructor() {
    this.initialized = false;
    this.currentChatData = null;
    this.isModified = false;

    // การตั้งค่าที่เกี่ยวกับการปรับแต่งประสิทธิภาพ
    this.pageSize = 20; // จำนวนข้อความที่แสดงต่อหน้า
    this.currentPage = 0; // หมายเลขหน้าปัจจุบัน
    this.totalPages = 0; // จำนวนหน้าทั้งหมด
    this.messageCache = new Map(); // แคชข้อความ
    this.renderCache = new Map(); // แคชการเรนเดอร์
    this.isLoading = false; // สถานะการโหลด
    this.virtualScrollEnabled = true; // สวิตช์ virtual scroll

    this.log('info', 'MobileContextEditor v2.2 เริ่มต้นการเริ่มต้น - เวอร์ชันปรับแต่งประสิทธิภาพ');

    // เริ่มต้นทันที
    this.initialize();
  }

  /**
   * รอให้ SillyTavern โหลดเสร็จสมบูรณ์ - ฟังเหตุการณ์ APP_READY
   */
  async waitForSillyTavern() {
    // ตรวจสอบว่ามีเหตุการณ์ APP_READY แล้วหรือไม่
    if (window.eventSource && window.event_types) {
      console.log('[Mobile Context Editor] กำลังฟังเหตุการณ์ APP_READY...');
      window.eventSource.on(window.event_types.APP_READY, () => {
        console.log('[Mobile Context Editor] ✅ เหตุการณ์ APP_READY ทำงาน เริ่มต้นการเริ่มต้น');
        this.initialize();
      });
    } else {
      // ทางเลือกสำรอง: รอให้ระบบเหตุการณ์โหลด
      const checkInterval = setInterval(() => {
        if (window.eventSource && window.event_types) {
          clearInterval(checkInterval);
          console.log('[Mobile Context Editor] ระบบเหตุการณ์โหลดแล้ว กำลังฟัง APP_READY...');
          window.eventSource.on(window.event_types.APP_READY, () => {
            console.log('[Mobile Context Editor] ✅ เหตุการณ์ APP_READY ทำงาน เริ่มต้นการเริ่มต้น');
            this.initialize();
          });
        } else if (this.isSillyTavernReady()) {
          // หาก SillyTavern โหลดสมบูรณ์แล้ว ให้เริ่มต้นทันที
          clearInterval(checkInterval);
          console.log('[Mobile Context Editor] ✅ SillyTavern พร้อมแล้ว เริ่มต้นทันที');
          this.initialize();
        }
      }, 500);
    }
  }

  /**
   * ตรวจสอบว่า SillyTavern พร้อมใช้งานหรือไม่
   */
  isSillyTavernReady() {
    try {
      // ตรวจสอบ SillyTavern API ใหม่
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        return !!(context && context.chat && Array.isArray(context.chat));
      }

      // ลดระดับลงไปตรวจสอบตัวแปร global เดิม
      return !!(window.SillyTavern && window.chat && window.characters && window.this_chid !== undefined);
    } catch (error) {
      return false;
    }
  }

  /**
   * เริ่มต้นตัวแก้ไข
   */
  initialize() {
    try {
      this.initialized = true;
      this.setupUI();
      this.bindEvents();
      console.log('[Mobile Context Editor] v2.0 เริ่มต้นเสร็จสิ้น - ใช้ API ดั้งเดิม');
    } catch (error) {
      console.error('[Mobile Context Editor] เริ่มต้นล้มเหลว:', error);
    }
  }

  /**
   * เริ่มต้นแบบบังคับ - สร้างอินเทอร์เฟซแม้ว่า SillyTavern จะยังไม่พร้อมสมบูรณ์
   */
  forceInitialize() {
    try {
      console.log('[Mobile Context Editor] 🔧 เริ่มต้นอินเทอร์เฟซตัวแก้ไขแบบบังคับ');
      this.setupUI();
      this.bindEvents();
      this.showEditor();
      return true;
    } catch (error) {
      console.error('[Mobile Context Editor] เริ่มต้นแบบบังคับล้มเหลว:', error);
      return false;
    }
  }

  /**
   * ดึงข้อมูลแชทปัจจุบัน - เวอร์ชันที่ปรับแต่งแล้ว รองรับการแบ่งหน้าและแคช
   */
  getCurrentChatData(useCache = true) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      // หากเปิดใช้แคชและมีแคชอยู่แล้ว ส่งคืนทันที
      if (useCache && this.currentChatData) {
        return this.currentChatData;
      }

      let chatData;

      // ใช้ SillyTavern API ใหม่เป็นอันดับแรก
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        const currentCharacter = context.characters[context.characterId];

        chatData = {
          header: {
            user_name: context.name1 || 'User',
            character_name: context.name2 || currentCharacter?.name || 'Assistant',
            create_date: context.chatCreateDate || Date.now(),
            chat_metadata: context.chatMetadata || {},
          },
          messages: context.chat, // อ้างอิง chat array ของ SillyTavern โดยตรง
          fileName: currentCharacter?.chat,
          characterName: currentCharacter?.name || 'Assistant',
          userName: context.name1 || 'User',
          avatarUrl: currentCharacter?.avatar,
        };
      } else {
        // ลดระดับลงไปใช้ตัวแปร global เดิม
        const character = window.characters[window.this_chid];
        if (!character) {
          throw new Error('ไม่พบตัวละครปัจจุบัน');
        }

        chatData = {
          header: {
            user_name: window.name1 || 'User',
            character_name: window.name2 || character.name,
            create_date: window.chat_create_date || Date.now(),
            chat_metadata: window.chat_metadata || {},
          },
          messages: window.chat,
          fileName: character.chat,
          characterName: character.name,
          userName: window.name1 || 'User',
          avatarUrl: character.avatar,
        };
      }

      this.currentChatData = chatData;

      // คำนวณข้อมูลการแบ่งหน้า
      this.totalPages = Math.ceil(chatData.messages.length / this.pageSize);
      this.currentPage = Math.max(0, this.totalPages - 1); // แสดงหน้าสุดท้ายเป็นค่าเริ่มต้น

      this.log(
        'info',
        `โหลดข้อมูลแชทสำเร็จ: ${chatData.messages.length} ข้อความ (${chatData.characterName}), แบ่งเป็น ${this.totalPages} หน้า`,
      );

      return chatData;
    } catch (error) {
      this.log('error', 'ดึงข้อมูลแชทล้มเหลว', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลข้อความของหน้าที่ระบุ
   */
  getPageMessages(pageIndex = this.currentPage) {
    if (!this.currentChatData) {
      return [];
    }

    const messages = this.currentChatData.messages;
    const startIndex = pageIndex * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, messages.length);

    return messages.slice(startIndex, endIndex).map((msg, index) => ({
      ...msg,
      globalIndex: startIndex + index, // ดัชนีรวมทั้งหมด
      pageIndex: index, // ดัชนีภายในหน้า
    }));
  }

  /**
   * ล้างแคช
   */
  clearCache() {
    this.messageCache.clear();
    this.renderCache.clear();
    this.currentChatData = null;
    this.log('info', 'ล้างแคชแล้ว');
  }

  /**
   * ใช้ API แบ่งหน้าฝั่งเซิร์ฟเวอร์เพื่อโหลดข้อมูลแชท - เหมาะกับไฟล์ขนาดใหญ่
   */
  async loadChatDataWithPagination(page = 0, pageSize = this.pageSize, searchQuery = '') {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      let character, avatarUrl, fileName;

      // ดึงข้อมูลตัวละครปัจจุบัน
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        character = context.characters[context.characterId];
        avatarUrl = character?.avatar;
        fileName = character?.chat;
      } else {
        character = window.characters[window.this_chid];
        avatarUrl = character?.avatar;
        fileName = character?.chat;
      }

      if (!character || !fileName) {
        throw new Error('ไม่พบตัวละครปัจจุบันหรือไฟล์แชท');
      }

      this.log('info', `ใช้ API แบ่งหน้าโหลดข้อมูลแชท: หน้า ${page + 1}, ${pageSize} ข้อความต่อหน้า`);

      const response = await fetch('/api/chats/get-paginated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
          file_name: fileName.replace('.jsonl', ''),
          page: page,
          pageSize: pageSize,
          searchQuery: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`เซิร์ฟเวอร์ผิดพลาด: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // อัปเดตข้อมูลการแบ่งหน้า
      this.currentPage = data.currentPage;
      this.totalPages = data.totalPages;
      this.pageSize = data.pageSize;

      this.log(
        'info',
        `โหลดข้อมูลแบ่งหน้าสำเร็จ: ${data.messages.length} ข้อความ, รวมทั้งหมด ${data.totalCount} ข้อความ, ขนาดไฟล์ ${data.fileSize}`,
      );

      return {
        messages: data.messages,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        pageSize: data.pageSize,
        hasMore: data.hasMore,
        fileSize: data.fileSize,
        characterName: character.name,
        userName: window.name1 || 'User',
      };
    } catch (error) {
      this.log('error', 'โหลดข้อมูลแชทแบบแบ่งหน้าล้มเหลว', error);
      throw error;
    }
  }

  /**
   * เลือกวิธีโหลดอัจฉริยะ - ตัดสินใจระหว่างโหลดในหน่วยความจำหรือแบบแบ่งหน้าตามขนาดไฟล์
   */
  async smartLoadChatData() {
    try {
      // ลองดึงข้อมูลแชทพื้นฐานก่อนเพื่อประเมินขนาด
      const basicData = this.getCurrentChatData(false);
      const messageCount = basicData.messages.length;

      // หากจำนวนข้อความเกินค่าขีดจำกัด ให้ใช้ API แบ่งหน้า
      const LARGE_CHAT_THRESHOLD = 500; // เกิน 500 ข้อความถือว่าเป็นไฟล์ขนาดใหญ่

      if (messageCount > LARGE_CHAT_THRESHOLD) {
        this.log('info', `ตรวจพบไฟล์แชทขนาดใหญ่ (${messageCount} ข้อความ) ใช้โหมดแบ่งหน้า`);
        this.usePaginationMode = true;

        // ใช้ API แบ่งหน้าโหลดหน้าสุดท้าย
        const lastPage = Math.max(0, Math.ceil(messageCount / this.pageSize) - 1);
        return await this.loadChatDataWithPagination(lastPage, this.pageSize);
      } else {
        this.log('info', `ไฟล์แชทขนาดปกติ (${messageCount} ข้อความ) ใช้โหมดหน่วยความจำ`);
        this.usePaginationMode = false;
        return basicData;
      }
    } catch (error) {
      this.log('error', 'โหลดอัจฉริยะล้มเหลว ย้อนกลับสู่โหมดพื้นฐาน', error);
      this.usePaginationMode = false;
      return this.getCurrentChatData(false);
    }
  }

  /**
   * แก้ไขเนื้อหาข้อความ (ใช้ SillyTavern API)
   */
  async modifyMessage(messageIndex, newContent, newName = null) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      const context = window.SillyTavern.getContext();
      const chat = context.chat;

      if (messageIndex < 0 || messageIndex >= chat.length) {
        throw new Error(`ดัชนีข้อความไม่ถูกต้อง: ${messageIndex} (รวม ${chat.length} ข้อความ)`);
      }

      // แก้ไขข้อความใน chat array
      const message = chat[messageIndex];
      const oldContent = message.mes;

      message.mes = newContent;
      if (newName !== null) {
        message.name = newName;
      }

      // ใช้ context API ของ SillyTavern เพื่อบันทึกและรีเฟรช
      await context.saveChat();
      //   await context.reloadCurrentChat(); // โหลดแชทปัจจุบันใหม่

      this.isModified = true;
      console.log(
        `[Mobile Context Editor] แก้ไขข้อความ ${messageIndex}: "${oldContent.substring(
          0,
          30,
        )}..." → "${newContent.substring(0, 30)}..."`,
      );

      return true;
    } catch (error) {
      console.error('[Mobile Context Editor] แก้ไขข้อความล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * เพิ่มข้อความใหม่ (ใช้ API ดั้งเดิมของ SillyTavern)
   */
  async addMessage(content, isUser = false, name = null, extra = {}) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      const context = window.SillyTavern.getContext();

      // สร้างออบเจกต์ข้อความ (ตามรูปแบบข้อความของ SillyTavern)
      const message = {
        name: name || (isUser ? context.name1 || 'User' : context.name2 || 'Assistant'),
        is_user: true,
        is_system: false,
        force_avatar: false,
        mes: content,
        send_date: Date.now(),
        extra: extra,
        ...(!isUser && { gen_started: Date.now(), gen_finished: Date.now() }),
      };

      // หากไม่ใช่ข้อความผู้ใช้ ให้เพิ่มฟิลด์ที่เกี่ยวกับการสร้าง
      if (!isUser) {
        message.swipe_id = 0;
        message.swipes = [content];
      }

      // เพิ่มเข้า chat array
      context.chat.push(message);

      // ใช้ context API ของ SillyTavern เพื่อเพิ่มข้อความ
      context.addOneMessage(message);

      // บันทึกแชท
      await context.saveChat();

      this.isModified = true;
      console.log(
        `[Mobile Context Editor] เพิ่มข้อความ${isUser ? 'ผู้ใช้' : 'ผู้ช่วย'}ใหม่: "${content.substring(0, 50)}..."`,
      );

      return context.chat.length - 1; // ส่งคืนดัชนีของข้อความใหม่
    } catch (error) {
      console.error('[Mobile Context Editor] เพิ่มข้อความล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * ลบข้อความ - เวอร์ชันปรับปรุง
   */
  async deleteMessage(messageIndex) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      let chatArray;

      // ดึง chat array
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        chatArray = context.chat;
      } else {
        chatArray = window.chat;
      }

      if (!chatArray || !Array.isArray(chatArray)) {
        throw new Error('ข้อมูลแชทไม่พร้อมใช้งาน');
      }

      if (messageIndex < 0 || messageIndex >= chatArray.length) {
        throw new Error(`ดัชนีข้อความไม่ถูกต้อง: ${messageIndex}, จำนวนข้อความรวม: ${chatArray.length}`);
      }

      const messageToDelete = chatArray[messageIndex];
      this.log(
        'info',
        `เตรียมลบข้อความ ${messageIndex}: ${messageToDelete.name}: ${messageToDelete.mes.substring(0, 50)}...`,
      );

      // ลบออกจาก chat array โดยตรง
      const deletedMessage = chatArray.splice(messageIndex, 1)[0];
      this.isModified = true;

      this.log('info', `ลบข้อความ ${messageIndex} สำเร็จ`);

      // บันทึกและรีเฟรชทันที
      await this.saveChatData();
      await this.refreshChatDisplay();

      return deletedMessage;
    } catch (error) {
      this.log('error', 'ลบข้อความล้มเหลว', error);
      throw error;
    }
  }

  /**
   * บันทึกข้อมูลแชท - เวอร์ชันปรับปรุง
   */
  async saveChatData() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      this.log('info', 'เริ่มบันทึกข้อมูลแชท...');

      // วิธีที่ 1: ใช้ SillyTavern.getContext().saveChat (API ใหม่)
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        try {
          const context = window.SillyTavern.getContext();
          if (context && typeof context.saveChat === 'function') {
            this.log('info', 'บันทึกด้วย SillyTavern.getContext().saveChat...');
            await context.saveChat();
            this.log('info', 'SillyTavern.getContext().saveChat บันทึกสำเร็จ');
            this.isModified = false;
            return true;
          }
        } catch (error) {
          this.log('warn', 'SillyTavern.getContext().saveChat ล้มเหลว ลองวิธีอื่น', error);
        }
      }

      // วิธีที่ 2: ใช้ฟังก์ชันบันทึกดั้งเดิมของ SillyTavern
      if (typeof window.saveChat === 'function') {
        this.log('info', 'บันทึกด้วย window.saveChat...');
        await window.saveChat();
        this.log('info', 'window.saveChat บันทึกสำเร็จ');
        this.isModified = false;
        return true;
      }

      // วิธีที่ 3: ใช้ saveChatConditional
      if (typeof window.saveChatConditional === 'function') {
        this.log('info', 'บันทึกด้วย window.saveChatConditional...');
        await window.saveChatConditional();
        this.log('info', 'window.saveChatConditional บันทึกสำเร็จ');
        this.isModified = false;
        return true;
      }

      // วิธีที่ 4: เรียก API ด้วยตนเอง (เข้ากันได้กับเวอร์ชันเก่า)
      let character, chatData, userName, characterName;

      // ดึงข้อมูลตัวละครและแชท
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        character = context.characters[context.characterId];
        chatData = context.chat;
        userName = context.name1 || 'User';
        characterName = context.name2 || character?.name || 'Assistant';
      } else {
        character = window.characters?.[window.this_chid];
        chatData = window.chat;
        userName = window.name1 || 'User';
        characterName = window.name2 || character?.name || 'Assistant';
      }

      if (character && chatData) {
        this.log('info', 'บันทึกด้วยการเรียก API ด้วยตนเอง...');

        const saveData = [
          {
            user_name: userName,
            character_name: characterName,
            create_date: window.chat_create_date || Date.now(),
            chat_metadata: window.chat_metadata || {},
          },
          ...chatData,
        ];

        const response = await fetch('/api/chats/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ch_name: character.name,
            file_name: character.chat,
            chat: saveData,
            avatar_url: character.avatar,
          }),
        });

        if (!response.ok) {
          throw new Error(`บันทึกล้มเหลว: ${response.status} ${response.statusText}`);
        }

        this.log('info', 'เรียก API ด้วยตนเองบันทึกสำเร็จ');
        this.isModified = false;
        return true;
      }

      throw new Error('ไม่มีวิธีบันทึกที่ใช้ได้หรือข้อมูลตัวละครหายไป');
    } catch (error) {
      this.log('error', 'บันทึกข้อมูลแชทล้มเหลว', error);
      throw error;
    }
  }

  /**
   * รีเฟรชการแสดงผลแชท
   */
  async refreshChatDisplay() {
    try {
      if (typeof window.printMessages === 'function') {
        this.log('info', 'กำลังรีเฟรชการแสดงผลแชท...');
        await window.printMessages();
        this.log('info', 'รีเฟรชการแสดงผลแชทสำเร็จ');
      } else {
        this.log('warn', 'ฟังก์ชัน printMessages ไม่พร้อมใช้งาน');
      }
    } catch (error) {
      this.log('error', 'รีเฟรชการแสดงผลแชทล้มเหลว', error);
    }
  }

  /**
   * ส่งออกข้อมูลแชทเป็นรูปแบบ JSONL
   */
  exportToJsonl() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      const context = window.SillyTavern.getContext();

      // สร้างข้อมูล JSONL (ตามรูปแบบของ SillyTavern)
      const header = {
        user_name: context.name1 || 'User',
        character_name: context.name2 || 'Assistant',
        create_date: context.chat_create_date || Date.now(),
        chat_metadata: context.chatMetadata || {},
      };

      const saveData = [header, ...context.chat];
      const jsonlData = saveData.map(JSON.stringify).join('\n');

      // ดาวน์โหลดไฟล์
      const blob = new Blob([jsonlData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_edited_${Date.now()}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('[Mobile Context Editor] ส่งออก JSONL เสร็จสิ้น');
      return jsonlData;
    } catch (error) {
      console.error('[Mobile Context Editor] ส่งออกล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลสถิติ
   */
  getStatistics() {
    try {
      if (!this.isSillyTavernReady()) return null;

      const context = window.SillyTavern.getContext();
      const messages = context.chat;
      const userMessages = messages.filter(msg => msg.is_user);
      const botMessages = messages.filter(msg => !msg.is_user);
      const totalCharacters = messages.reduce((sum, msg) => sum + (msg.mes || '').length, 0);

      return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        botMessages: botMessages.length,
        totalCharacters: totalCharacters,
        averageMessageLength: Math.round(totalCharacters / messages.length),
        characterName: context.characters[context.characterId]?.name || context.name2 || 'Unknown',
        isGroup: !!context.groupId,
        sillyTavernReady: this.isSillyTavernReady(),
      };
    } catch (error) {
      console.error('[Mobile Context Editor] ดึงข้อมูลสถิติล้มเหลว:', error);
      return null;
    }
  }

  /**
   * ดีบักสถานะ SillyTavern
   */
  debugSillyTavernStatus() {
    console.log('=== ดีบักสถานะ SillyTavern ===');
    console.log('ออบเจกต์ SillyTavern:', !!window.SillyTavern);
    console.log('chat array:', !!window.chat, window.chat?.length);
    console.log('characters array:', !!window.characters, window.characters?.length);
    console.log('this_chid:', window.this_chid);
    console.log('ฟังก์ชัน saveChat:', typeof window.saveChat);
    console.log('ฟังก์ชัน printMessages:', typeof window.printMessages);
    console.log('ฟังก์ชัน saveChatConditional:', typeof window.saveChatConditional);
    console.log('สถานะความพร้อม:', this.isSillyTavernReady());
  }

  /**
   * รอให้ SillyTavern พร้อมใช้งาน
   */
  async waitForSillyTavernReady(timeout = 30000) {
    console.log('[Mobile Context Editor] กำลังรอให้ SillyTavern พร้อมใช้งาน...');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.isSillyTavernReady()) {
        console.log('[Mobile Context Editor] ✅ SillyTavern พร้อมใช้งานแล้ว');
        return true;
      }

      // รอ 500ms แล้วลองใหม่
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.warn('[Mobile Context Editor] ⚠️ หมดเวลารอ SillyTavern อาจยังโหลดไม่เสร็จสมบูรณ์');
    return false;
  }

  /**
   * ตั้งค่าอินเทอร์เฟซ UI บนมือถือ - เวอร์ชันปรับแต่งแล้ว เพิ่มการควบคุมการแบ่งหน้า
   */
  setupUI() {
    // รอให้ jQuery โหลด
    if (typeof $ === 'undefined') {
      setTimeout(() => this.setupUI(), 1000);
      return;
    }

    // สร้างปุ่มตัวแก้ไขบนมือถือ (วางที่มุมขวาล่าง ให้สอดคล้องกับปุ่ม mobile อื่น ๆ)
    const buttonHtml = `
            <button id="mobile-context-editor-btn" style="position: fixed; bottom: 80px; right: 20px; z-index: 9997; background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; border: none; padding: 12px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: all 0.3s ease; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                🛠️
            </button>
        `;

    $('body').append(buttonHtml);

    // เอฟเฟกต์ hover
    $('#mobile-context-editor-btn').hover(
      function () {
        $(this).css('transform', 'scale(1.1)');
      },
      function () {
        $(this).css('transform', 'scale(1)');
      },
    );

    // สร้าง modal ตัวแก้ไขที่ปรับแต่งสำหรับมือถือ
    const modalHtml = `
            <div id="mobile-context-editor-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999; overflow-y: auto;">

                <div style="background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0; font-size: 18px;">🛠️ ตัวแก้ไขบริบท v2.2</h3>
                    <button id="mobile-context-editor-close" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 15px; cursor: pointer; font-size: 14px;">✖️ ปิด</button>
                </div>

                <div style="padding: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-load-chat-btn" style="background: #4CAF50; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">📂 โหลดแชท</button>
                        <button id="mobile-save-chat-btn" style="background: #2196F3; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>💾 บันทึก</button>
                        <button id="mobile-add-message-btn" style="background: #FF9800; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>➕ เพิ่ม</button>
                        <button id="mobile-stats-btn" style="background: #795548; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>📊 สถิติ</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-refresh-btn" style="background: #607D8B; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>🔄 รีเฟรช</button>
                        <button id="mobile-export-btn" style="background: #E91E63; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>📤 ส่งออก</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-quick-edit-btn" style="background: #9C27B0; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>⚡ แก้ไขด่วน</button>
                        <button id="mobile-test-api-btn" style="background: #00BCD4; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>🔧 ทดสอบ API</button>
                    </div>

                    <!-- เพิ่มใหม่: พื้นที่ควบคุมการแบ่งหน้า -->
                    <div id="mobile-pagination-controls" style="display: none; margin-bottom: 15px; padding: 10px; background: #e8f5e8; border-radius: 8px; border: 1px solid #4CAF50;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span id="mobile-page-info" style="font-size: 14px; color: #333; font-weight: bold;">หน้า 1 จาก 1</span>
                            <div>
                                <label style="font-size: 12px; color: #666;">แสดงต่อหน้า:</label>
                                <select id="mobile-page-size" style="padding: 4px; border-radius: 4px; border: 1px solid #ddd; font-size: 12px;">
                                    <option value="10">10 ข้อความ</option>
                                    <option value="20" selected>20 ข้อความ</option>
                                    <option value="50">50 ข้อความ</option>
                                    <option value="100">100 ข้อความ</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button id="mobile-first-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⏮️</button>
                            <button id="mobile-prev-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">◀️</button>
                            <button id="mobile-next-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">▶️</button>
                            <button id="mobile-last-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⏭️</button>
                        </div>
                    </div>

                    <div id="mobile-context-editor-status" style="margin-bottom: 15px; padding: 12px; background: #f5f5f5; border-radius: 8px; color: #333; min-height: 20px; font-size: 14px; border-left: 4px solid #2196F3;"></div>

                    <div id="mobile-context-editor-content" style="border: 1px solid #ddd; border-radius: 8px; background: #fafafa; min-height: 300px; max-height: 400px; overflow-y: auto;">
                        <p style="text-align: center; padding: 40px 20px; color: #666; margin: 0; font-size: 16px;">คลิก "โหลดแชท" เพื่อเริ่มแก้ไข</p>
                    </div>

                    <!-- เพิ่มใหม่: ตัวบ่งชี้การโหลด -->
                    <div id="mobile-loading-indicator" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; text-align: center; z-index: 10000;">
                        <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                        <div>กำลังโหลด...</div>
                    </div>
                </div>
            </div>
        `;

    $('body').append(modalHtml);
  }

  /**
   * เชื่อมโยงเหตุการณ์บนมือถือ
   */
  bindEvents() {
    if (typeof $ === 'undefined') {
      setTimeout(() => this.bindEvents(), 1000);
      return;
    }

    // เปิด/ปิดตัวแก้ไข
    $(document).on('click', '#mobile-context-editor-btn', () => this.showEditor());
    $(document).on('click', '#mobile-context-editor-close', () => this.hideEditor());

    // ปุ่มฟังก์ชัน
    $(document).on('click', '#mobile-load-chat-btn', async () => {
      try {
        this.showLoadingIndicator(true);
        this.updateStatus('🔄 กำลังตรวจสอบสถานะ SillyTavern...');

        // รอให้ SillyTavern พร้อม
        const isReady = await this.waitForSillyTavernReady(10000);
        if (!isReady) {
          this.updateStatus('❌ SillyTavern ยังไม่พร้อมใช้งาน กรุณารอให้หน้าโหลดเสร็จแล้วลองใหม่');
          this.showLoadingIndicator(false);
          return;
        }

        this.updateStatus('🔄 กำลังวิเคราะห์ขนาดไฟล์แชท...');

        // ใช้การโหลดอัจฉริยะ
        const chatData = await this.smartLoadChatData();

        if (this.usePaginationMode) {
          // โหมดแบ่งหน้า
          this.currentChatData = {
            messages: [], // ในโหมดแบ่งหน้าจะไม่แคชข้อความทั้งหมด
            characterName: chatData.characterName,
            userName: chatData.userName,
          };
          this.totalPages = chatData.totalPages;
          this.currentPage = chatData.currentPage;

          this.updateStatus(`🔄 กำลังเรนเดอร์ข้อความ (โหมดแบ่งหน้า)...`);
          await this.renderPaginatedMessages(chatData.messages);

          this.updateStatus(
            `✅ โหลดไฟล์แชทขนาดใหญ่สำเร็จ! รวม ${chatData.totalCount} ข้อความ (${chatData.characterName}) - โหมดแบ่งหน้า [${chatData.fileSize}]`,
          );
        } else {
          // โหมดหน่วยความจำ
          this.currentChatData = chatData;
          this.totalPages = Math.ceil(chatData.messages.length / this.pageSize);
          this.currentPage = Math.max(0, this.totalPages - 1);

          this.updateStatus(`🔄 กำลังเรนเดอร์ข้อความ (โหมดหน่วยความจำ)...`);
          await this.renderMobileChatMessages();

          this.updateStatus(
            `✅ โหลดข้อมูลแชทสำเร็จ! รวม ${chatData.messages.length} ข้อความ (${chatData.characterName}) - โหมดหน่วยความจำ`,
          );
        }

        // แสดงการควบคุมการแบ่งหน้า
        this.showPaginationControls(true);
        this.updatePaginationInfo();
        this.updateMobileButtonStates();
        this.showLoadingIndicator(false);
      } catch (error) {
        this.updateStatus(`❌ โหลดล้มเหลว: ${error.message}`);
        this.showLoadingIndicator(false);
      }
    });

    $(document).on('click', '#mobile-save-chat-btn', async () => {
      try {
        await this.saveChatData();
        this.updateStatus('✅ บันทึกสำเร็จ!');
      } catch (error) {
        this.updateStatus(`❌ บันทึกล้มเหลว: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-add-message-btn', async () => {
      const content = prompt('กรุณาใส่เนื้อหาข้อความใหม่:');
      if (content) {
        const isUser = confirm(
          'นี่เป็นข้อความของผู้ใช้หรือไม่?\nคลิก "ตกลง" = ข้อความผู้ใช้\nคลิก "ยกเลิก" = ข้อความตัวละคร',
        );
        try {
          await this.addMessage(content, isUser);
          this.renderMobileChatMessages();
          this.updateStatus(`➕ เพิ่มข้อความ${isUser ? 'ผู้ใช้' : 'ตัวละคร'}ใหม่แล้ว`);
          this.updateMobileButtonStates();
        } catch (error) {
          this.updateStatus(`❌ เพิ่มล้มเหลว: ${error.message}`);
        }
      }
    });

    $(document).on('click', '#mobile-stats-btn', () => {
      const stats = this.getStatistics();
      if (stats) {
        const statsText = `📊 รวม ${stats.totalMessages} ข้อความ | ผู้ใช้ ${stats.userMessages} | ตัวละคร ${stats.botMessages} | ${stats.totalCharacters} ตัวอักษร | ${stats.characterName}`;
        this.updateStatus(statsText);
      }
    });

    $(document).on('click', '#mobile-refresh-btn', async () => {
      try {
        await this.refreshChatDisplay();
        this.renderMobileChatMessages();
        this.updateStatus('🔄 รีเฟรชอินเทอร์เฟซเสร็จสิ้น');
      } catch (error) {
        this.updateStatus(`❌ รีเฟรชล้มเหลว: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-export-btn', () => {
      try {
        this.exportToJsonl();
        this.updateStatus('📤 ส่งออกไฟล์ JSONL สำเร็จ');
      } catch (error) {
        this.updateStatus(`❌ ส่งออกล้มเหลว: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-quick-edit-btn', async () => {
      try {
        this.updateStatus('⚡ เริ่มแก้ไขด่วน...');
        await this.quickEditLastMessage();
      } catch (error) {
        this.updateStatus(`❌ แก้ไขด่วนล้มเหลว: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-test-api-btn', async () => {
      try {
        this.updateStatus('🔧 กำลังทดสอบการเชื่อมต่อ API...');
        await this.testApiConnection();
      } catch (error) {
        this.updateStatus(`❌ ทดสอบ API ล้มเหลว: ${error.message}`);
      }
    });

    // เหตุการณ์ควบคุมการแบ่งหน้า
    $(document).on('click', '#mobile-first-page', () => this.goToPage(0));
    $(document).on('click', '#mobile-prev-page', () => this.goToPage(this.currentPage - 1));
    $(document).on('click', '#mobile-next-page', () => this.goToPage(this.currentPage + 1));
    $(document).on('click', '#mobile-last-page', () => this.goToPage(this.totalPages - 1));

    $(document).on('change', '#mobile-page-size', async e => {
      const newPageSize = parseInt(e.target.value);
      await this.changePageSize(newPageSize);
    });

    // การจัดการข้อความ
    $(document).on('click', '.mobile-edit-message-btn', async e => {
      const messageIndex = parseInt($(e.target).data('index'));
      await this.editMobileMessage(messageIndex);
    });

    $(document).on('click', '.mobile-delete-message-btn', async e => {
      if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้?')) {
        const messageIndex = parseInt($(e.target).data('index'));
        try {
          await this.deleteMessage(messageIndex);

          // คำนวณการแบ่งหน้าใหม่และรีเฟรชการแสดงผล
          this.clearCache();
          this.getCurrentChatData(false);
          this.updatePaginationInfo();
          await this.renderMobileChatMessages();

          this.updateStatus(`🗑️ ลบข้อความ ${messageIndex} แล้ว`);
          this.updateMobileButtonStates();
        } catch (error) {
          this.updateStatus(`❌ ลบล้มเหลว: ${error.message}`);
        }
      }
    });
  }

  showEditor() {
    // ตรวจสอบให้แน่ใจว่า UI ถูกสร้างแล้ว
    if (!$('#mobile-context-editor-modal').length) {
      this.setupUI();
    }

    $('#mobile-context-editor-modal').show();

    // ตรวจสอบสถานะ SillyTavern และแสดงอินเทอร์เฟซที่เหมาะสม
    if (!this.isSillyTavernReady()) {
      this.showWaitingInterface();
    } else {
      const context = window.SillyTavern.getContext();
      if (context && context.chat && context.chat.length > 0) {
        this.renderMobileChatMessages();
        this.updateStatus('✅ ข้อมูลแชทพร้อมแล้ว สามารถเริ่มแก้ไขได้');
      } else {
        this.updateStatus('⚠️ กรุณาโหลดข้อมูลแชทก่อน');
      }
    }

    this.updateMobileButtonStates();
  }

  /**
   * แสดงอินเทอร์เฟซรอ SillyTavern โหลด
   */
  showWaitingInterface() {
    const waitingHtml = `
            <div style="text-align: center; padding: 30px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                <h3 style="margin: 0 0 15px 0; color: #333;">SillyTavern กำลังโหลด...</h3>
                <p style="margin: 0 0 20px 0;">กรุณารอให้ SillyTavern โหลดเสร็จก่อนใช้ฟีเจอร์แก้ไข</p>

                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
                    <strong>📊 สถานะการโหลด:</strong><br>
                    <div id="waiting-status-details" style="margin-top: 10px; font-family: monospace; font-size: 12px;"></div>
                </div>

                <div style="margin: 20px 0;">
                    <button onclick="window.mobileContextEditor.checkAndRefresh()" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; border: none; padding: 12px 24px; border-radius: 25px;
                        font-size: 16px; cursor: pointer; margin: 5px;
                    ">🔄 ตรวจสอบอีกครั้ง</button>

                    <button onclick="window.mobileContextEditor.forceMode()" style="
                        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
                        color: white; border: none; padding: 12px 24px; border-radius: 25px;
                        font-size: 16px; cursor: pointer; margin: 5px;
                    ">🛠️ โหมดบังคับ</button>
                </div>

                <div style="margin: 20px 0; font-size: 14px; color: #888;">
                    <p>💡 เคล็ดลับ: การโหลดครั้งแรกอาจใช้เวลา 1-2 นาที</p>
                    <p>🔧 หากโหลดไม่ได้เป็นเวลานาน ลองรีเฟรชหน้า</p>
                </div>
            </div>
        `;

    $('#mobile-context-editor-content').html(waitingHtml);
    this.updateStatus('⏳ กำลังรอ SillyTavern โหลดเสร็จ...');
    this.updateWaitingStatus();
  }

  /**
   * ตรวจสอบและรีเฟรชสถานะ
   */
  checkAndRefresh() {
    console.log('[Mobile Context Editor] กำลังตรวจสอบสถานะ SillyTavern อีกครั้ง...');

    if (this.isSillyTavernReady()) {
      this.updateStatus('✅ SillyTavern พร้อมแล้ว! กำลังโหลดข้อมูลแชท...');
      this.renderMobileChatMessages();
      this.updateMobileButtonStates();
    } else {
      this.updateWaitingStatus();
      this.updateStatus('⏳ SillyTavern ยังโหลดอยู่ กรุณารอสักครู่...');
    }
  }

  /**
   * อัปเดตรายละเอียดสถานะการรอ
   */
  updateWaitingStatus() {
    const statusDetails = document.getElementById('waiting-status-details');
    if (statusDetails) {
      const status = this.debugSillyTavernStatus();
      const details = [
        `ข้อมูลแชท (window.chat): ${status.chatLoaded ? '✅ โหลดแล้ว' : '❌ ยังไม่โหลด'}`,
        `ข้อมูลตัวละคร (window.characters): ${status.charactersLoaded ? '✅ โหลดแล้ว' : '❌ ยังไม่โหลด'}`,
        `ตัวละครปัจจุบัน (window.this_chid): ${status.currentCharacter ? '✅ เลือกแล้ว' : '❌ ยังไม่เลือก'}`,
        `ฟังก์ชันบันทึก (saveChatConditional): ${status.saveFunctionAvailable ? '✅ พร้อมใช้' : '❌ ไม่พร้อม'}`,
        `ฟังก์ชันเรนเดอร์ (printMessages): ${status.renderFunctionAvailable ? '✅ พร้อมใช้' : '❌ ไม่พร้อม'}`,
      ];
      statusDetails.innerHTML = details.join('<br>');
    }
  }

  /**
   * โหมดบังคับ - ให้ฟังก์ชันพื้นฐานแม้ว่า SillyTavern จะยังไม่พร้อมสมบูรณ์
   */
  forceMode() {
    const forceHtml = `
            <div style="padding: 20px; color: #333;">
                <h3 style="margin: 0 0 15px 0; color: #FF6B6B;">🛠️ โหมดบังคับ</h3>
                <p style="margin: 0 0 15px 0;">SillyTavern ยังโหลดอยู่ แต่คุณสามารถใช้ฟีเจอร์ต่อไปนี้:</p>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>⚠️ หมายเหตุ:</strong> ในโหมดนี้ บางฟีเจอร์อาจทำงานไม่ปกติ แนะนำให้รอโหลดเสร็จก่อนใช้งาน
                </div>

                <div style="background: #e7f3ff; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>📝 คำสั่งคอนโซลที่ใช้ได้:</strong><br>
                    <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; display: block; margin: 8px 0; font-family: monospace;">
                        MobileContext.debugSillyTavernStatus() // ตรวจสอบสถานะ<br>
                        MobileContext.smartLoadChat() // โหลดอัจฉริยะ<br>
                        MobileContext.showContextEditor() // เปิดตัวแก้ไขอีกครั้ง
                    </code>
                </div>

                <div style="background: #d1ecf1; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>🔄 ลองใหม่อัตโนมัติ:</strong><br>
                    ตัวแก้ไขจะตรวจสอบสถานะ SillyTavern ทุก 30 วินาที
                </div>

                <div style="margin: 20px 0;">
                    <button onclick="window.mobileContextEditor.checkAndRefresh()" style="
                        background: #007bff; color: white; border: none; padding: 10px 20px;
                        border-radius: 20px; cursor: pointer; margin: 5px;
                    ">🔄 ลองใหม่ทันที</button>

                    <button onclick="window.mobileContextEditor.hideEditor()" style="
                        background: #6c757d; color: white; border: none; padding: 10px 20px;
                        border-radius: 20px; cursor: pointer; margin: 5px;
                    ">❌ ปิดตัวแก้ไข</button>
                </div>
            </div>
        `;

    $('#mobile-context-editor-content').html(forceHtml);
    this.updateStatus('🛠️ โหมดบังคับเปิดใช้งานแล้ว - กรุณาใช้คำสั่งคอนโซล');

    // เริ่มลองใหม่อัตโนมัติ
    this.startAutoRetry();
  }

  /**
   * เริ่มการตรวจสอบลองใหม่อัตโนมัติ
   */
  startAutoRetry() {
    if (this.autoRetryInterval) {
      clearInterval(this.autoRetryInterval);
    }

    this.autoRetryInterval = setInterval(() => {
      if (this.isSillyTavernReady()) {
        console.log('[Mobile Context Editor] ลองใหม่อัตโนมัติสำเร็จ SillyTavern พร้อมแล้ว!');
        clearInterval(this.autoRetryInterval);
        this.checkAndRefresh();
      } else {
        console.log('[Mobile Context Editor] กำลังตรวจสอบลองใหม่อัตโนมัติ...');
      }
    }, 30000); // ตรวจสอบทุก 30 วินาที
  }

  hideEditor() {
    $('#mobile-context-editor-modal').hide();
  }

  updateStatus(message) {
    $('#mobile-context-editor-status').html(message);
  }

  updateMobileButtonStates() {
    let hasData = false;
    if (this.isSillyTavernReady()) {
      const context = window.SillyTavern.getContext();
      hasData = context && context.chat && context.chat.length > 0;
    }

    $('#mobile-save-chat-btn').prop('disabled', !hasData);
    $('#mobile-add-message-btn').prop('disabled', !hasData);
    $('#mobile-stats-btn').prop('disabled', !hasData);
    $('#mobile-refresh-btn').prop('disabled', !hasData);
    $('#mobile-export-btn').prop('disabled', !hasData);
    $('#mobile-quick-edit-btn').prop('disabled', !hasData);
    $('#mobile-test-api-btn').prop('disabled', !this.isSillyTavernReady()); // ทดสอบ API ต้องการเพียง SillyTavern พร้อม
  }

  /**
   * เรนเดอร์ข้อความแชทบนมือถือ - เวอร์ชันปรับแต่ง รองรับการแบ่งหน้าและ virtual scroll
   */
  async renderMobileChatMessages() {
    if (!this.isSillyTavernReady()) return;

    if (!this.currentChatData) {
      this.updateStatus('⚠️ กรุณาโหลดข้อมูลแชทก่อน');
      return;
    }

    this.showLoadingIndicator(true);

    try {
      // ดึงข้อความของหน้าปัจจุบัน
      const pageMessages = this.getPageMessages();

      if (pageMessages.length === 0) {
        $('#mobile-context-editor-content').html(`
          <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
            <p style="margin: 0; font-size: 16px;">หน้าปัจจุบันไม่มีข้อความ</p>
          </div>
        `);
        this.showLoadingIndicator(false);
        return;
      }

      let html = '<div style="padding: 10px;">';

      // เรนเดอร์ข้อความเป็นชุดเพื่อหลีกเลี่ยงการบล็อก UI
      for (let i = 0; i < pageMessages.length; i++) {
        const message = pageMessages[i];
        const messageHtml = this.renderSingleMessage(message);
        html += messageHtml;

        // ทุก ๆ 5 ข้อความให้คืนการควบคุมเพื่อหลีกเลี่ยงการบล็อก UI
        if (i % 5 === 4) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      html += '</div>';
      $('#mobile-context-editor-content').html(html);

      this.showLoadingIndicator(false);
    } catch (error) {
      this.log('error', 'เรนเดอร์ข้อความล้มเหลว', error);
      this.updateStatus(`❌ เรนเดอร์ล้มเหลว: ${error.message}`);
      this.showLoadingIndicator(false);
    }
  }

  /**
   * เรนเดอร์ข้อความเดียว
   */
  renderSingleMessage(message) {
    const isUser = message.is_user;
    const name = message.name || (isUser ? 'ผู้ใช้' : 'ผู้ช่วย');
    const globalIndex = message.globalIndex;

    // ตัดทอนเนื้อหาข้อความอย่างชาญฉลาด
    let content = message.mes || '';
    const maxLength = 200;
    let displayContent = content;

    if (content.length > maxLength) {
      displayContent = content.substring(0, maxLength) + '...';
    }

    // เอสเคปอักขระพิเศษ HTML
    displayContent = this.escapeHtml(displayContent);

    return `
      <div style="margin-bottom: 15px; padding: 12px; border: 2px solid ${
        isUser ? '#4CAF50' : '#2196F3'
      }; border-radius: 10px; background: ${isUser ? '#f1f8e9' : '#e3f2fd'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #333; font-size: 14px;">${
            isUser ? '👤' : '🤖'
          } ${this.escapeHtml(name)} (#${globalIndex})</strong>
          <div>
            <button class="mobile-edit-message-btn" data-index="${globalIndex}" style="margin-right: 5px; padding: 4px 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">✏️</button>
            <button class="mobile-delete-message-btn" data-index="${globalIndex}" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
          </div>
        </div>
        <div style="color: #555; white-space: pre-wrap; background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; font-size: 13px; line-height: 1.4;">${displayContent}</div>
        ${content.length > maxLength ? `<div style="margin-top: 8px;"><button class="mobile-expand-message-btn" data-index="${globalIndex}" style="padding: 4px 8px; background: #607D8B; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📖 ดูทั้งหมด</button></div>` : ''}
      </div>
    `;
  }

  /**
   * เรนเดอร์ข้อความในโหมดแบ่งหน้า
   */
  async renderPaginatedMessages(messages) {
    if (!messages || messages.length === 0) {
      $('#mobile-context-editor-content').html(`
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
          <p style="margin: 0; font-size: 16px;">หน้าปัจจุบันไม่มีข้อความ</p>
        </div>
      `);
      return;
    }

    let html = '<div style="padding: 10px;">';

    // เรนเดอร์ข้อความเป็นชุดเพื่อหลีกเลี่ยงการบล็อก UI
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageHtml = this.renderSingleMessage({
        ...message,
        globalIndex: message.index, // ใช้ดัชนีรวมที่ส่งมาจากเซิร์ฟเวอร์
        pageIndex: i,
      });
      html += messageHtml;

      // ทุก ๆ 3 ข้อความให้คืนการควบคุมเพื่อหลีกเลี่ยงการบล็อก UI
      if (i % 3 === 2) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    html += '</div>';
    $('#mobile-context-editor-content').html(html);
  }

  /**
   * เอสเคปอักขระพิเศษ HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async editMobileMessage(messageIndex) {
    if (!this.isSillyTavernReady()) return;

    const context = window.SillyTavern.getContext();
    if (messageIndex >= context.chat.length) return;

    const message = context.chat[messageIndex];
    const newContent = prompt('แก้ไขเนื้อหาข้อความ:', message.mes);

    if (newContent !== null) {
      try {
        await this.modifyMessage(messageIndex, newContent);
        this.renderMobileChatMessages();
        this.updateStatus(`✏️ แก้ไขข้อความ ${messageIndex} แล้ว`);
        this.updateMobileButtonStates();
      } catch (error) {
        this.updateStatus(`❌ แก้ไขล้มเหลว: ${error.message}`);
      }
    }
  }

  /**
   * แก้ไขข้อความสุดท้ายแบบด่วน
   */
  async quickEditLastMessage() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern ยังไม่พร้อมใช้งาน');
      }

      const context = window.SillyTavern.getContext();
      if (!context.chat || context.chat.length === 0) {
        throw new Error('ไม่มีข้อความที่สามารถแก้ไขได้');
      }

      const lastIndex = context.chat.length - 1;
      const lastMessage = context.chat[lastIndex];

      // สร้างอินเทอร์เฟซแก้ไขด่วน
      const quickEditHtml = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">⚡ แก้ไขข้อความสุดท้ายแบบด่วน</h4>

                    <div style="margin-bottom: 15px;">
                        <strong>ผู้ส่งข้อความ:</strong> ${
                          lastMessage.name || (lastMessage.is_user ? 'ผู้ใช้' : 'ตัวละคร')
                        } <br>
                        <strong>ประเภทข้อความ:</strong> ${lastMessage.is_user ? 'ข้อความผู้ใช้' : 'การตอบกลับตัวละคร'} <br>
                        <strong>ดัชนีข้อความ:</strong> ${lastIndex}
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">แก้ไขเนื้อหา:</label>
                        <textarea id="quick-edit-content" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;">${
                          lastMessage.mes
                        }</textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">แก้ไขชื่อผู้ส่ง (ไม่บังคับ):</label>
                        <input type="text" id="quick-edit-name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="เว้นว่างเพื่อคงเดิม" value="${
                          lastMessage.name || ''
                        }">
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.mobileContextEditor.executeQuickEdit(${lastIndex})" style="
                            background: #28a745; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; flex: 1;
                        ">✅ บันทึกการแก้ไข</button>

                        <button onclick="window.mobileContextEditor.renderMobileChatMessages()" style="
                            background: #6c757d; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; flex: 1;
                        ">❌ ยกเลิก</button>
                    </div>
                </div>
            `;

      $('#mobile-context-editor-content').html(quickEditHtml);
      this.updateStatus('⚡ โหมดแก้ไขด่วนเปิดใช้งานแล้ว');
    } catch (error) {
      console.error('[Mobile Context Editor] แก้ไขด่วนล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * ดำเนินการแก้ไขด่วน
   */
  async executeQuickEdit(messageIndex) {
    try {
      const newContent = document.getElementById('quick-edit-content').value;
      const newName = document.getElementById('quick-edit-name').value.trim();

      if (!newContent.trim()) {
        alert('เนื้อหาข้อความต้องไม่ว่างเปล่า');
        return;
      }

      this.updateStatus('💾 กำลังบันทึกการแก้ไข...');

      // ดำเนินการแก้ไข
      await this.modifyMessage(messageIndex, newContent, newName || null);

      // เรนเดอร์รายการข้อความใหม่
      this.renderMobileChatMessages();
      this.updateStatus('✅ แก้ไขด่วนเสร็จสิ้นและบันทึกแล้ว!');
      this.updateMobileButtonStates();
    } catch (error) {
      console.error('[Mobile Context Editor] ดำเนินการแก้ไขด่วนล้มเหลว:', error);
      this.updateStatus(`❌ บันทึกล้มเหลว: ${error.message}`);
    }
  }

  /**
   * ทดสอบการเชื่อมต่อ API
   */
  async testApiConnection() {
    try {
      this.updateStatus('🔧 กำลังทดสอบการเชื่อมต่อ API...');

      // สร้างอินเทอร์เฟซผลการทดสอบ
      const testResultHtml = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🔧 ทดสอบการเชื่อมต่อ API</h4>

                    <div id="api-test-results" style="font-family: monospace; font-size: 12px; background: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #ddd; max-height: 300px; overflow-y: auto;">
                        <div style="color: #007bff;">📊 กำลังรันการทดสอบ...</div>
                    </div>

                    <div style="margin-top: 15px;">
                        <button onclick="window.mobileContextEditor.renderMobileChatMessages()" style="
                            background: #007bff; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; width: 100%;
                        ">🔙 กลับไปยังรายการข้อความ</button>
                    </div>
                </div>
            `;

      $('#mobile-context-editor-content').html(testResultHtml);

      // รันการทดสอบ
      const results = [];
      const addResult = (test, result, details = '') => {
        results.push(`${result === 'PASS' ? '✅' : '❌'} ${test}: ${result} ${details}`);
        document.getElementById('api-test-results').innerHTML = results.join('<br>');
      };

      // ทดสอบ 1: ออบเจกต์พื้นฐาน SillyTavern
      addResult('SillyTavern Object', window.SillyTavern ? 'PASS' : 'FAIL');

      // ทดสอบ 2: ดึงคอนเท็กซ์
      let context = null;
      try {
        context = window.SillyTavern.getContext();
        addResult('Get Context', context ? 'PASS' : 'FAIL');
      } catch (error) {
        addResult('Get Context', 'FAIL', `- ${error.message}`);
      }

      if (context) {
        // ทดสอบ 3: ข้อมูลแชท
        addResult('Chat Data', Array.isArray(context.chat) ? 'PASS' : 'FAIL', `- ${context.chat?.length || 0} ข้อความ`);

        // ทดสอบ 4: ข้อมูลตัวละคร
        addResult(
          'Character Data',
          Array.isArray(context.characters) ? 'PASS' : 'FAIL',
          `- ${context.characters?.length || 0} ตัวละคร`,
        );

        // ทดสอบ 5: ตัวละครปัจจุบัน
        addResult(
          'Current Character',
          context.characterId !== undefined ? 'PASS' : 'FAIL',
          `- ID: ${context.characterId}`,
        );

        // ทดสอบ 6: ชื่อผู้ใช้
        addResult('Username', context.name1 ? 'PASS' : 'FAIL', `- ${context.name1}`);

        // ทดสอบ 7: ชื่อตัวละคร
        addResult('Character Name', context.name2 ? 'PASS' : 'FAIL', `- ${context.name2}`);

        // ทดสอบ 8: ฟังก์ชันบันทึก
        addResult('Save Function', typeof context.saveChat === 'function' ? 'PASS' : 'FAIL');

        // ทดสอบ 9: ฟังก์ชันโหลดซ้ำ
        addResult('Reload Function', typeof context.reloadCurrentChat === 'function' ? 'PASS' : 'FAIL');

        // ทดสอบ 10: ฟังก์ชันเพิ่มข้อความ
        addResult('Add Message Function', typeof context.addOneMessage === 'function' ? 'PASS' : 'FAIL');

        // ทดสอบ 11: ลองดึงข้อมูลแชท
        try {
          const chatData = this.getCurrentChatData();
          addResult('Get Chat Data', chatData ? 'PASS' : 'FAIL', `- ${chatData?.messages?.length || 0} ข้อความ`);
        } catch (error) {
          addResult('Get Chat Data', 'FAIL', `- ${error.message}`);
        }

        // ทดสอบ 12: ลองดึงข้อมูลสถิติ
        try {
          const stats = this.getStatistics();
          addResult('Get Statistics', stats ? 'PASS' : 'FAIL', `- ${stats?.totalMessages || 0} ข้อความ`);
        } catch (error) {
          addResult('Get Statistics', 'FAIL', `- ${error.message}`);
        }
      }

      // เพิ่มสรุป
      const passCount = results.filter(r => r.includes('✅')).length;
      const totalCount = results.length;
      results.push('');
      results.push(`📊 สรุปการทดสอบ: ${passCount}/${totalCount} รายการผ่าน`);
      results.push('');
      results.push('🔧 หากมีการทดสอบล้มเหลว กรุณาตรวจสอบว่า SillyTavern โหลดสมบูรณ์หรือไม่');

      document.getElementById('api-test-results').innerHTML = results.join('<br>');
      this.updateStatus(`🔧 ทดสอบ API เสร็จสิ้น - ${passCount}/${totalCount} รายการผ่าน`);
    } catch (error) {
      console.error('[Mobile Context Editor] ทดสอบ API ล้มเหลว:', error);
      this.updateStatus(`❌ ทดสอบ API ล้มเหลว: ${error.message}`);
    }
  }

  /**
   * วิธีการควบคุมการแบ่งหน้า
   */

  /**
   * ข้ามไปยังหน้าที่ระบุ
   */
  async goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.totalPages) {
      return;
    }

    this.showLoadingIndicator(true);
    this.currentPage = pageIndex;
    this.updatePaginationInfo();

    try {
      if (this.usePaginationMode) {
        // โหมดแบ่งหน้า: โหลดหน้าที่ระบุจากเซิร์ฟเวอร์
        const chatData = await this.loadChatDataWithPagination(pageIndex, this.pageSize);
        await this.renderPaginatedMessages(chatData.messages);
      } else {
        // โหมดหน่วยความจำ: เรนเดอร์โดยตรง
        await this.renderMobileChatMessages();
      }

      this.updateStatus(`📄 ข้ามไปยังหน้า ${pageIndex + 1} แล้ว`);
    } catch (error) {
      this.updateStatus(`❌ ข้ามล้มเหลว: ${error.message}`);
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  /**
   * เปลี่ยนจำนวนที่แสดงต่อหน้า
   */
  async changePageSize(newPageSize) {
    if (newPageSize === this.pageSize) return;

    this.showLoadingIndicator(true);
    this.pageSize = newPageSize;

    try {
      if (this.usePaginationMode) {
        // โหมดแบ่งหน้า: โหลดหน้าปัจจุบันใหม่
        const chatData = await this.loadChatDataWithPagination(this.currentPage, newPageSize);
        this.totalPages = chatData.totalPages;
        this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
        await this.renderPaginatedMessages(chatData.messages);
      } else {
        // โหมดหน่วยความจำ: คำนวณการแบ่งหน้าใหม่
        if (this.currentChatData) {
          this.totalPages = Math.ceil(this.currentChatData.messages.length / this.pageSize);
          this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
        }
        await this.renderMobileChatMessages();
      }

      this.updatePaginationInfo();
      this.updateStatus(`📄 เปลี่ยนการแสดงต่อหน้าเป็น ${newPageSize} ข้อความแล้ว`);
    } catch (error) {
      this.updateStatus(`❌ เปลี่ยนขนาดหน้าล้มเหลว: ${error.message}`);
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  /**
   * แสดง/ซ่อนการควบคุมการแบ่งหน้า
   */
  showPaginationControls(show) {
    $('#mobile-pagination-controls').toggle(show);
  }

  /**
   * อัปเดตการแสดงข้อมูลการแบ่งหน้า
   */
  updatePaginationInfo() {
    if (!this.currentChatData) return;

    const totalMessages = this.currentChatData.messages.length;
    const startIndex = this.currentPage * this.pageSize + 1;
    const endIndex = Math.min((this.currentPage + 1) * this.pageSize, totalMessages);

    $('#mobile-page-info').text(
      `หน้า ${this.currentPage + 1} จาก ${this.totalPages} (${startIndex}-${endIndex}/${totalMessages})`,
    );

    // อัปเดตสถานะปุ่ม
    $('#mobile-first-page, #mobile-prev-page').prop('disabled', this.currentPage === 0);
    $('#mobile-next-page, #mobile-last-page').prop('disabled', this.currentPage === this.totalPages - 1);

    // อัปเดต selector ขนาดหน้า
    $('#mobile-page-size').val(this.pageSize);
  }

  /**
   * แสดง/ซ่อนตัวบ่งชี้การโหลด
   */
  showLoadingIndicator(show) {
    $('#mobile-loading-indicator').toggle(show);
  }

  /**
   * บันทึกล็อก
   */
  log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[Mobile Context Editor v2.2] ${message}`;

    switch (level) {
      case 'info':
        // แก้ไข: แสดงล็อกระดับ info เฉพาะในโหมดดีบัก
        if (window.DEBUG_CONTEXT_EDITOR) {
          console.log(logMessage, data);
        }
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
      default:
        if (window.DEBUG_CONTEXT_EDITOR) {
          console.log(logMessage, data);
        }
    }
  }
}

// สร้างอินสแตนซ์ระดับ global
window.mobileContextEditor = new MobileContextEditor();

// เพิ่มการจัดการเหตุการณ์ขยายข้อความ
$(document).on('click', '.mobile-expand-message-btn', function (e) {
  const messageIndex = parseInt($(e.target).data('index'));
  const editor = window.mobileContextEditor;

  if (editor.currentChatData && editor.currentChatData.messages[messageIndex]) {
    const message = editor.currentChatData.messages[messageIndex];
    const fullContent = message.mes || '';

    // สร้าง modal แสดงข้อความเต็ม
    const fullTextModal = `
      <div id="mobile-full-text-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; margin: 20px; padding: 20px; border-radius: 10px; max-width: 90%; max-height: 80%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            <h4 style="margin: 0; color: #333;">ข้อความเต็ม (#${messageIndex})</h4>
            <button onclick="$('#mobile-full-text-modal').remove()" style="background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">✖️ ปิด</button>
          </div>
          <div style="white-space: pre-wrap; color: #333; line-height: 1.6; font-size: 14px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">${editor.escapeHtml(fullContent)}</div>
        </div>
      </div>
    `;

    $('body').append(fullTextModal);
  }
});

console.log('[Mobile Context Editor] v2.2 ตัวแก้ไขบริบทบนมือถือโหลดเสร็จสิ้น - เวอร์ชันปรับแต่งประสิทธิภาพ');
