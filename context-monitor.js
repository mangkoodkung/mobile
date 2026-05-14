/**
 * SillyTavern ตัวตรวจสอบบริบทบนมือถือ
 * คลาสตัวตรวจสอบอิสระ สำหรับตรวจสอบและดึงข้อมูลการเปลี่ยนแปลงบริบทแบบเรียลไทม์
 */

class ContextMonitor {
  constructor(settings = {}) {
    // รับการกำหนดค่าประสิทธิภาพ
    const performanceConfig = window.MOBILE_PERFORMANCE_CONFIG?.monitoring || {};

    this.settings = {
      logLevel: 'info',
      monitorInterval: performanceConfig.contextMonitorInterval || 5000, // ปรับปรุง: เปลี่ยนจาก 3 วินาทีเป็น 5 วินาที
      enableEventLogging: performanceConfig.enableSmartMonitoring !== false,
      enableContextLogging: true,
      enableAutoSave: false,
      historyLimit: performanceConfig.maxHistoryRecords || 100, // ปรับปรุง: เพิ่มขีดจำกัดประวัติแต่เพิ่มการล้างข้อมูล
      debounceDelay: performanceConfig.debounceDelay || 500, // ใหม่: ดีเลย์ debounce
      enableSmartMonitoring: performanceConfig.enableSmartMonitoring !== false, // ใหม่: การตรวจสอบอัจฉริยะ
      ...settings,
    };

    this.isRunning = false;
    this.eventStats = {};
    this.contextHistory = [];
    this.lastContext = null;
    this.intervalId = null;
    this.startTime = null;
    this.logs = [];
    this.eventListeners = new Map();

    // ปรับปรุง: เพิ่มคุณสมบัติที่เกี่ยวข้องกับ debounce และการตรวจสอบอัจฉริยะ
    this.debounceTimer = null;
    this.lastActivity = Date.now();
    this.idleThreshold = 30000; // 30 วินาทีไม่มีกิจกรรมจะลดความถี่การตรวจสอบ
    this.performanceMonitor = window.mobilePerformanceMonitor;

    // ปรับปรุง: ฟังเหตุการณ์การล้างหน่วยความจำ
    this.setupMemoryCleanupListener();

    this.log('info', 'ContextMonitor เริ่มต้นแล้ว (เวอร์ชันปรับปรุง)', this.settings);
  }

  init() {
    this.setupEventListeners();
    this.log('info', 'ContextMonitor เริ่มต้นเสร็จสมบูรณ์');
  }

  setupEventListeners() {
    // ตรวจสอบว่ามีแหล่งเหตุการณ์พร้อมใช้งานหรือไม่
    if (!window.eventSource) {
      this.log('warn', 'eventSource ไม่พร้อมใช้งาน จะข้ามการฟังเหตุการณ์');
      return;
    }

    const events = [
      'message_sent',
      'message_received',
      'message_edited',
      'message_deleted',
      'message_swiped',
      'chat_id_changed',
      'character_selected',
      'generation_started',
      'generation_stopped',
      'generation_ended',
      'settings_loaded',
      'extension_settings_loaded',
    ];

    events.forEach(eventType => {
      try {
        const listener = (...args) => {
          this.handleEvent(eventType, ...args);
        };

        window.eventSource.on(eventType, listener);
        this.eventListeners.set(eventType, listener);

        this.log('debug', `ลงทะเบียนตัวฟังเหตุการณ์แล้ว: ${eventType}`);
      } catch (error) {
        this.log('warn', `ลงทะเบียนตัวฟังเหตุการณ์ล้มเหลว: ${eventType}`, error);
      }
    });
  }

  start() {
    if (this.isRunning) {
      this.log('warn', 'ตัวตรวจสอบกำลังทำงานอยู่แล้ว');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.lastContext = this.getCurrentContext();
    this.lastActivity = Date.now();

    // ปรับปรุง: เริ่มการตรวจสอบตามกำหนดเวลาอัจฉริยะ
    this.startSmartMonitoring();

    this.log('info', 'การตรวจสอบบริบทเริ่มต้นแล้ว (โหมดอัจฉริยะ)');
  }

  // ปรับปรุง: การตรวจสอบอัจฉริยะ ปรับความถี่การตรวจสอบตามกิจกรรม
  startSmartMonitoring() {
    const baseInterval = this.settings.monitorInterval;
    let currentInterval = baseInterval;

    const adjustedCheck = () => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;

      // หากเปิดใช้งานการตรวจสอบอัจฉริยะ ปรับความถี่ตามกิจกรรม
      if (this.settings.enableSmartMonitoring) {
        if (timeSinceLastActivity > this.idleThreshold) {
          // เมื่อว่างลดความถี่การตรวจสอบ
          currentInterval = baseInterval * 2;
        } else {
          // เมื่อใช้งานอยู่คงความถี่ปกติ
          currentInterval = baseInterval;
        }
      }

      // ดำเนินการตรวจสอบ
      this.checkContextChanges();

      // ตั้งค่าการตรวจสอบครั้งถัดไป
      if (this.isRunning) {
        this.intervalId = setTimeout(adjustedCheck, currentInterval);
      }
    };

    // เริ่มการตรวจสอบครั้งแรกทันที
    this.intervalId = setTimeout(adjustedCheck, currentInterval);
  }

  stop() {
    if (!this.isRunning) {
      this.log('warn', 'ตัวตรวจสอบไม่ได้ทำงานอยู่');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId); // ปรับปรุง: ใช้ clearTimeout แทน clearInterval
      this.intervalId = null;
    }

    // ล้างตัวจับเวลา debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // ลบตัวฟังเหตุการณ์
    this.eventListeners.forEach((listener, eventType) => {
      try {
        if (window.eventSource) {
          window.eventSource.off(eventType, listener);
        }
      } catch (error) {
        this.log('warn', `ลบตัวฟังเหตุการณ์ล้มเหลว: ${eventType}`, error);
      }
    });
    this.eventListeners.clear();

    this.log('info', 'การตรวจสอบบริบทหยุดแล้ว');
  }

  handleEvent(eventType, ...args) {
    try {
      // อัปเดตเวลากิจกรรม
      this.lastActivity = Date.now();

      // อัปเดตสถิติ
      this.eventStats[eventType] = (this.eventStats[eventType] || 0) + 1;

      if (this.settings.enableEventLogging) {
        this.log('debug', `เหตุการณ์ถูกทริกเกอร์: ${eventType}`, args);
      }

      // ตรวจสอบบริบททันทีหลังเหตุการณ์เฉพาะ (เพิ่ม debounce)
      const immediateCheckEvents = ['message_sent', 'message_received', 'chat_id_changed', 'character_selected'];

      if (immediateCheckEvents.includes(eventType)) {
        this.debouncedContextCheck();
      }
    } catch (error) {
      this.log('error', `จัดการเหตุการณ์ล้มเหลว: ${eventType}`, error);
    }
  }

  // ปรับปรุง: การตรวจสอบบริบทแบบ debounce
  debouncedContextCheck() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.checkContextChanges();
    }, this.settings.debounceDelay);
  }

  checkContextChanges() {
    try {
      const currentContext = this.getCurrentContext();

      if (this.hasContextChanged(this.lastContext, currentContext)) {
        const differences = this.getContextDifferences(this.lastContext, currentContext);

        if (this.settings.enableContextLogging) {
          this.log('info', 'บริบทมีการเปลี่ยนแปลง', {
            differences,
            context: currentContext,
          });
        }

        // บันทึกลงประวัติ
        this.contextHistory.push({
          timestamp: Date.now(),
          context: currentContext,
          differences: differences,
        });

        // ปรับปรุง: ล้างประวัติอัจฉริยะ
        this.cleanupHistoryRecords();

        this.lastContext = currentContext;

        // บันทึกอัตโนมัติ
        if (this.settings.enableAutoSave) {
          this.saveToStorage();
        }
      }
    } catch (error) {
      this.log('error', 'ตรวจสอบการเปลี่ยนแปลงบริบทล้มเหลว', error);
    }
  }

  getCurrentContext() {
    try {
      // รับข้อมูลผ่าน SillyTavern API บริบทอย่างเป็นทางการ
      const stContext = window.SillyTavern?.getContext();

      let context;
      if (stContext) {
        // ใช้ API บริบทอย่างเป็นทางการ
        const currentChat = stContext.chat || [];
        const isGroup = !!stContext.groupId;

        context = {
          // ข้อมูลพื้นฐาน
          timestamp: new Date(),
          chatId: stContext.chatId || null,
          characterId: stContext.characterId || null,

          // ข้อมูลแชท
          chat: {
            length: currentChat.length || 0,
            lastMessage:
              currentChat.length > 0
                ? {
                    id: currentChat.length - 1,
                    name: currentChat[currentChat.length - 1].name || 'Unknown',
                    mes:
                      (currentChat[currentChat.length - 1].mes || '').substring(0, 100) +
                      (currentChat[currentChat.length - 1].mes && currentChat[currentChat.length - 1].mes.length > 100
                        ? '...'
                        : ''),
                    is_user: currentChat[currentChat.length - 1].is_user,
                    send_date: currentChat[currentChat.length - 1].send_date,
                  }
                : null,
            metadata: stContext.chatMetadata ? Object.keys(stContext.chatMetadata) : [],
          },

          // ข้อมูลตัวละคร
          character:
            stContext.characterId && stContext.characters[stContext.characterId]
              ? {
                  id: stContext.characterId,
                  name: stContext.characters[stContext.characterId].name,
                  avatar: stContext.characters[stContext.characterId].avatar,
                  create_date: stContext.characters[stContext.characterId].create_date,
                  description:
                    (stContext.characters[stContext.characterId].description || '').substring(0, 100) + '...',
                }
              : null,

          // ข้อมูลกลุ่ม
          group:
            isGroup && stContext.groups
              ? {
                  id: stContext.groupId,
                  name: stContext.groups.find(x => x.id == stContext.groupId)?.name || stContext.groupId,
                }
              : null,

          // สถานะระบบ
          system: {
            isGenerating: !!stContext.streamingProcessor,
            isStreamingEnabled: !!stContext.streamingProcessor,
            currentAPI: stContext.mainApi || 'unknown',
          },
        };
      } else {
        // ลดระดับใช้วิธีเดิม
        const getCurrentChatId = this.safeGetGlobal('getCurrentChatId');
        const chat = this.safeGetGlobal('chat');
        const characters = this.safeGetGlobal('characters');
        const this_chid = this.safeGetGlobal('this_chid');
        const chat_metadata = this.safeGetGlobal('chat_metadata');
        const selected_group = this.safeGetGlobal('selected_group');
        const groups = this.safeGetGlobal('groups');
        const main_api = this.safeGetGlobal('main_api');
        const is_send_press = this.safeGetGlobal('is_send_press');
        const is_generation_stopped = this.safeGetGlobal('is_generation_stopped');

        context = {
          // ข้อมูลพื้นฐาน
          timestamp: new Date(),
          chatId: typeof getCurrentChatId === 'function' ? getCurrentChatId() : null,
          characterId: this_chid !== undefined ? this_chid : null,

          // ข้อมูลแชท
          chat: {
            length:
              chat && Array.isArray(chat) ? chat.length : chat && typeof chat.length === 'number' ? chat.length : 0,
            lastMessage:
              chat && Array.isArray(chat) && chat.length > 0
                ? {
                    id: chat.length - 1,
                    name: chat[chat.length - 1].name || 'Unknown',
                    mes:
                      (chat[chat.length - 1].mes || '').substring(0, 100) +
                      (chat[chat.length - 1].mes && chat[chat.length - 1].mes.length > 100 ? '...' : ''),
                    is_user: chat[chat.length - 1].is_user,
                    send_date: chat[chat.length - 1].send_date,
                  }
                : null,
            metadata: chat_metadata ? Object.keys(chat_metadata) : [],
          },

          // ข้อมูลตัวละคร
          character:
            this_chid !== undefined && characters && characters[this_chid]
              ? {
                  id: this_chid,
                  name: characters[this_chid].name,
                  avatar: characters[this_chid].avatar,
                  create_date: characters[this_chid].create_date,
                  description: (characters[this_chid].description || '').substring(0, 100) + '...',
                }
              : null,

          // ข้อมูลกลุ่ม
          group:
            selected_group && groups
              ? {
                  id: selected_group,
                  name: groups.find ? groups.find(x => x.id == selected_group)?.name || selected_group : selected_group,
                }
              : null,

          // สถานะระบบ
          system: {
            isGenerating: is_send_press || is_generation_stopped === false,
            isStreamingEnabled: this.safeGetGlobal('isStreamingEnabled')?.() || false,
            currentAPI: main_api || this.safeGetMainAPI() || 'unknown',
          },
        };
      }

      return context;
    } catch (error) {
      this.log('error', 'รับบริบทล้มเหลว', error);
      return null;
    }
  }

  hasContextChanged(oldContext, newContext) {
    if (!oldContext || !newContext) {
      return true;
    }

    // ตรวจสอบว่าฟิลด์สำคัญมีการเปลี่ยนแปลงหรือไม่
    const keyFields = ['chatId', 'characterId', 'chat.length', 'character.name', 'group.id'];

    for (const field of keyFields) {
      const oldValue = this.getNestedValue(oldContext, field);
      const newValue = this.getNestedValue(newContext, field);

      if (oldValue !== newValue) {
        return true;
      }
    }

    // ตรวจสอบว่าข้อความล่าสุดมีการเปลี่ยนแปลงหรือไม่
    const oldLastMessage = oldContext.chat?.lastMessage;
    const newLastMessage = newContext.chat?.lastMessage;

    if (oldLastMessage?.id !== newLastMessage?.id) {
      return true;
    }

    return false;
  }

  getContextDifferences(oldContext, newContext) {
    const differences = [];

    if (!oldContext) {
      differences.push({ type: 'initial', description: 'บริบทเริ่มต้น' });
      return differences;
    }

    if (!newContext) {
      differences.push({ type: 'error', description: 'ไม่สามารถรับบริบทใหม่ได้' });
      return differences;
    }

    // การเปลี่ยนแปลง ID แชท
    if (oldContext.chatId !== newContext.chatId) {
      differences.push({
        type: 'chat_changed',
        description: 'สลับแชท',
        old: oldContext.chatId,
        new: newContext.chatId,
      });
    }

    // การเปลี่ยนแปลงตัวละคร
    if (oldContext.characterId !== newContext.characterId) {
      differences.push({
        type: 'character_changed',
        description: 'สลับตัวละคร',
        old: oldContext.character?.name,
        new: newContext.character?.name,
      });
    }

    // การเปลี่ยนแปลงจำนวนข้อความ
    if (oldContext.chat?.length !== newContext.chat?.length) {
      differences.push({
        type: 'message_count_changed',
        description: 'จำนวนข้อความเปลี่ยนแปลง',
        old: oldContext.chat?.length,
        new: newContext.chat?.length,
      });
    }

    // ข้อความใหม่
    if (oldContext.chat?.lastMessage?.id !== newContext.chat?.lastMessage?.id) {
      differences.push({
        type: 'new_message',
        description: 'ข้อความใหม่',
        message: newContext.chat?.lastMessage,
      });
    }

    return differences;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  safeGetGlobal(name) {
    try {
      return window[name] || null;
    } catch (error) {
      this.log('warn', `ไม่สามารถเข้าถึงตัวแปรส่วนกลาง: ${name}`, error);
      return null;
    }
  }

  safeGetMainAPI() {
    try {
      // ลองรับค่าจากองค์ประกอบ DOM
      const mainApiSelect = document.getElementById('main_api');
      if (mainApiSelect && mainApiSelect.value) {
        return mainApiSelect.value;
      }

      // ลองรับจากตัวแปรส่วนกลาง
      const main_api = this.safeGetGlobal('main_api');
      if (main_api && typeof main_api === 'string') {
        return main_api;
      }

      // ลองรับจาก jQuery
      if (window.$ && window.$('#main_api').length > 0) {
        const value = window.$('#main_api').val();
        if (value && typeof value === 'string') {
          return value;
        }
      }

      return 'unknown';
    } catch (error) {
      this.log('warn', 'ไม่สามารถรับข้อมูล API หลักได้', error);
      return 'unknown';
    }
  }

  getHistory(limit = 10) {
    return this.contextHistory.slice(-limit);
  }

  getStats() {
    const runtime = this.startTime ? Date.now() - this.startTime : 0;
    return {
      isRunning: this.isRunning,
      runtime: runtime,
      runtimeFormatted: this.formatDuration(runtime),
      totalEvents: Object.values(this.eventStats).reduce((sum, count) => sum + count, 0),
      eventStats: this.eventStats,
      contextHistoryLength: this.contextHistory.length,
      settings: this.settings,
    };
  }

  async getCurrentChatJsonl() {
    try {
      // แผน 1: ลองรับจากตัวแปร chat ส่วนกลางโดยตรง (เชื่อถือได้ที่สุด)
      if (window.chat && Array.isArray(window.chat) && window.chat.length > 0) {
        const currentChatId = window.characters?.[window.this_chid]?.chat || 'current_chat';

        // สร้างข้อมูลรูปแบบ JSONL
        const jsonlLines = window.chat.map(message => JSON.stringify(message));

        this.log('info', `รับข้อมูล JSONL จากตัวแปร chat ส่วนกลาง: ${jsonlLines.length} รายการ`);

        return {
          chatId: currentChatId,
          jsonlData: jsonlLines.join('\n'),
          lines: jsonlLines,
          count: jsonlLines.length,
          source: 'global_chat',
        };
      }

      // แผน 2: ลองรับผ่าน SillyTavern API
      const context = window.SillyTavern?.getContext();
      if (!context) {
        this.log('error', 'ไม่มีข้อมูล chat ส่วนกลางและบริบท SillyTavern ยังไม่ได้เริ่มต้น');
        return null;
      }

      const { getCurrentChatId, getRequestHeaders, characters, characterId, groupId } = context;

      if (!getCurrentChatId || !getRequestHeaders) {
        this.log('error', 'ไม่สามารถรับฟังก์ชันบริบทที่จำเป็นได้');
        return null;
      }

      const currentChatId = getCurrentChatId();
      if (!currentChatId) {
        this.log('error', 'ไม่มีแชทที่ใช้งานอยู่ในปัจจุบัน');
        return null;
      }

      // สร้าง request body
      const body = {
        is_group: !!groupId,
        avatar_url: groupId ? undefined : characters[characterId]?.avatar,
        file: `${currentChatId}.jsonl`,
        exportfilename: `${currentChatId}.jsonl`,
        format: 'jsonl',
      };

      const headers = getRequestHeaders();

      this.log('debug', 'JSONL API คำขอ:', body);

      const response = await fetch('/api/chats/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonlData = await response.text();
      const lines = jsonlData.split('\n').filter(line => line.trim());

      // ตรวจสอบรูปแบบข้อมูลที่ส่งกลับ
      if (lines.length === 1 && lines[0].includes('"message"') && lines[0].includes('"result"')) {
        // นี่คือ wrapper ของ API response ต้องแยกวิเคราะห์ result ภายใน
        try {
          const apiResponse = JSON.parse(lines[0]);
          if (apiResponse.result) {
            const actualJsonl = apiResponse.result;
            const actualLines = actualJsonl.split('\n').filter(line => line.trim());

            this.log('info', `แยกวิเคราะห์ข้อมูล JSONL จาก API response: ${actualLines.length} รายการ`);

            return {
              chatId: currentChatId,
              jsonlData: actualJsonl,
              lines: actualLines,
              count: actualLines.length,
              source: 'api_parsed',
            };
          }
        } catch (parseError) {
          this.log('warn', 'แยกวิเคราะห์ API response ล้มเหลว', parseError);
        }
      }

      this.log('info', `รับข้อมูล JSONL แชทสำเร็จ: ${lines.length} รายการ`);

      return {
        chatId: currentChatId,
        jsonlData: jsonlData,
        lines: lines,
        count: lines.length,
        source: 'api_direct',
      };
    } catch (error) {
      this.log('error', 'รับข้อมูล JSONL แชทล้มเหลว', error);
      return null;
    }
  }

  async getCurrentChatMessages() {
    try {
      // แผน 1: ลองรับผ่านบริบทอย่างเป็นทางการของ SillyTavern
      let context = window.SillyTavern?.getContext();
      let fallbackMode = false;

      if (!context) {
        this.log('warn', 'บริบทอย่างเป็นทางการของ SillyTavern ไม่พร้อมใช้งาน ใช้แผนสำรอง');
        fallbackMode = true;

        // แผน 2: ใช้ตัวแปรส่วนกลางโดยตรง
        context = {
          getCurrentChatId: () => {
            // ลองหลายวิธีเพื่อรับ ID แชทปัจจุบัน
            if (window.selected_group) {
              return window.selected_group;
            } else if (window.characters && window.this_chid !== undefined) {
              return window.characters[window.this_chid]?.chat;
            }
            return null;
          },
          getRequestHeaders: () => {
            // header คำขอพื้นฐาน
            return {
              'Content-Type': 'application/json',
            };
          },
          characters: window.characters,
          characterId: window.this_chid,
          groupId: window.selected_group,
        };
      }

      const { getCurrentChatId, getRequestHeaders, characters, characterId, groupId } = context;

      if (!getCurrentChatId) {
        this.log('error', 'ไม่สามารถรับฟังก์ชัน ID แชทได้');
        return null;
      }

      const currentChatId = getCurrentChatId();
      if (!currentChatId) {
        this.log('error', 'ไม่มีแชทที่ใช้งานอยู่ในปัจจุบัน');
        return null;
      }

      // สร้างพารามิเตอร์คำขอ
      const isGroupChat = !!groupId;
      const endpoint = isGroupChat ? '/api/chats/group/get' : '/api/chats/get';

      let requestBody;
      if (isGroupChat) {
        requestBody = JSON.stringify({ id: currentChatId });
      } else {
        if (!characters || characterId === undefined || !characters[characterId]) {
          this.log('error', 'ข้อมูลตัวละครไม่พร้อมใช้งาน');
          return null;
        }

        const character = characters[characterId];
        requestBody = JSON.stringify({
          ch_name: character.name,
          file_name: String(currentChatId).replace('.jsonl', ''),
          avatar_url: character.avatar,
        });
      }

      const headers = getRequestHeaders ? getRequestHeaders() : {};

      this.log('debug', `ขอข้อความแชท: ${endpoint}`, {
        currentChatId,
        isGroupChat,
        fallbackMode,
        requestBody: JSON.parse(requestBody),
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // SillyTavern API ส่งคืนอาร์เรย์ข้อความโดยตรง
      let messages = Array.isArray(data) ? data : [];

      // สำหรับแชทส่วนตัว องค์ประกอบแรกเป็นเมตาดาต้า ต้องลบออก
      if (!isGroupChat && messages.length > 0 && messages[0].user_name && messages[0].character_name) {
        messages = messages.slice(1);
      }

      // แก้ไข: เพิ่มการจำกัดอัตราล็อก แสดงผลเฉพาะเมื่อจำนวนข้อความเปลี่ยนหรือหลังจาก 10 วินาที
      const now = Date.now();
      if (!this.lastLogTime) this.lastLogTime = 0;
      if (!this.lastMessageCount) this.lastMessageCount = 0;

      if (now - this.lastLogTime > 10000 || messages.length !== this.lastMessageCount) {
        this.log('info', `รับข้อความแชทสำเร็จ: ${messages.length} รายการ`, {
          chatId: currentChatId,
          isGroup: isGroupChat,
          fallbackMode,
        });
        this.lastLogTime = now;
        this.lastMessageCount = messages.length;
      }

      return {
        chatId: currentChatId,
        messages: messages,
        count: messages.length,
      };
    } catch (error) {
      this.log('error', 'รับข้อความแชทล้มเหลว', error);
      return null;
    }
  }

  showStatus() {
    const stats = this.getStats();
    const currentContext = this.getCurrentContext();

    console.log('=== สถานะ Mobile Context Monitor ===');
    console.log('สถานะการทำงาน:', stats.isRunning ? '✅ กำลังทำงาน' : '❌ หยุดแล้ว');
    console.log('เวลาทำงาน:', stats.runtimeFormatted);
    console.log('จำนวนเหตุการณ์ทั้งหมด:', stats.totalEvents);
    console.log('ประวัติบริบท:', stats.contextHistoryLength);
    console.log('บริบทปัจจุบัน:', currentContext);
    console.log('สถิติเหตุการณ์:', stats.eventStats);
  }

  clearLogs() {
    this.logs = [];
    this.log('info', 'ล็อกถูกล้างแล้ว');
  }

  saveToStorage() {
    try {
      const data = {
        settings: this.settings,
        stats: this.getStats(),
        history: this.contextHistory,
        logs: this.logs.slice(-100), // บันทึกเฉพาะ 100 รายการล่าสุด
      };

      localStorage.setItem('mobile-context-monitor', JSON.stringify(data));
      this.log('debug', 'บันทึกข้อมูลลง localStorage แล้ว');
    } catch (error) {
      this.log('error', 'บันทึกข้อมูลลง localStorage ล้มเหลว', error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('mobile-context-monitor');
      if (data) {
        const parsed = JSON.parse(data);
        this.settings = { ...this.settings, ...parsed.settings };
        this.contextHistory = parsed.history || [];
        this.logs = parsed.logs || [];
        this.log('info', 'โหลดข้อมูลจาก localStorage สำเร็จ');
      }
    } catch (error) {
      this.log('error', 'โหลดข้อมูลจาก localStorage ล้มเหลว', error);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.log('info', 'อัปเดตการตั้งค่าแล้ว', newSettings);
  }

  setLogLevel(level) {
    this.settings.logLevel = level;
    this.log('info', `ระดับล็อกถูกตั้งค่าเป็น: ${level}`);
  }

  log(level, message, data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.settings.logLevel] || 1;

    if (levels[level] >= currentLevel) {
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[Mobile Context ${timestamp}] ${message}`;

      // บันทึกลงล็อกภายใน
      this.logs.push({
        timestamp: Date.now(),
        level,
        message,
        data,
      });

      // จำกัดจำนวนล็อก
      if (this.logs.length > 200) {
        this.logs = this.logs.slice(-150);
      }

      // แสดงผลไปยังคอนโซล
      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.info(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // ===========================================
  // ฟังก์ชันตัวดึงข้อมูล
  // ===========================================

  /**
   * การกำหนดค่าการประมวลผลไฟล์ขนาดใหญ่
   */
  getLargeFileConfig() {
    return {
      // ขนาดชิ้นส่วน (จำนวนข้อความ)
      chunkSize: 100,
      // ดีเลย์ระหว่างแต่ละชุด (มิลลิวินาที)
      processingDelay: 50,
      // เกณฑ์การล้างหน่วยความจำ (MB)
      memoryThreshold: 100,
      // เวลาประมวลผลสูงสุด (วินาที)
      maxProcessingTime: 300,
      // เปิดใช้งานการประมวลผลแบบสตรีม
      enableStreaming: true,
      // เปิดใช้งาน Web Worker (ถ้ามี)
      enableWebWorker: typeof Worker !== 'undefined',
    };
  }

  /**
   * รูปแบบการดึงข้อมูลที่กำหนดไว้ล่วงหน้า
   * จัดการรูปแบบ regex ทั้งหมดแบบรวมศูนย์ เพื่อความสะดวกในการบำรุงรักษา
   */
  getExtractorFormats() {
    return {
      // รูปแบบข้อความฝั่งเรา: [我方消息|角色名|数字|消息类型|消息内容]
      myMessage: {
        name: '我方消息',
        regex: /\[我方消息\|([^|]*)\|(\d+)\|([^|]*)\|([^\]]*)\]/g,
        fields: ['character', 'number', 'messageType', 'content'],
        description: 'ดึงรูปแบบข้อความฝั่งเรา: [我方消息|ชื่อตัวละคร|ID ตัวเลข|ประเภทข้อความ|เนื้อหาข้อความ]',
      },

      // รูปแบบข้อความฝั่งตรงข้าม: [对方消息|角色名|数字|消息类型|消息内容]
      otherMessage: {
        name: '对方消息',
        regex: /\[对方消息\|([^|]*)\|(\d+)\|([^|]*)\|([^\]]*)\]/g,
        fields: ['character', 'number', 'messageType', 'content'],
        description: 'ดึงรูปแบบข้อความฝั่งตรงข้าม: [对方消息|ชื่อตัวละคร|ID ตัวเลข|ประเภทข้อความ|เนื้อหาข้อความ]',
      },

      // รูปแบบเพื่อน: [好友id|角色名|数字]
      friend: {
        name: '好友',
        regex: /\[好友id\|([^|]*)\|(\d+)\]/g,
        fields: ['character', 'number'],
        description: 'ดึงรูปแบบเพื่อน: [好友id|ชื่อตัวละคร|ID ตัวเลข]',
      },

      // รูปแบบข้อความทั่วไป: [消息类型|角色名|数字|消息分类|消息内容] (ยืดหยุ่นกว่า)
      universalMessage: {
        name: '通用消息',
        regex: /\[(我方消息|对方消息|群聊消息|我方群聊消息)\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
        fields: ['type', 'character', 'number', 'messageType', 'content'],
        description: 'ดึงรูปแบบข้อความทั่วไป: [ประเภทข้อความ|ชื่อตัวละคร|ตัวเลข|หมวดหมู่ข้อความ|เนื้อหาข้อความ]',
      },

      // รูปแบบข้อความกลุ่ม: [群聊消息|群ID|发送者|消息类型|消息内容]
      groupMessage: {
        name: '群聊消息',
        regex: /\[群聊消息\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
        fields: ['number', 'sender', 'messageType', 'content'], // แก้ไข: number ใช้สำหรับจับคู่ ID กลุ่ม
        description: 'ดึงรูปแบบข้อความกลุ่ม: [群聊消息|ID กลุ่ม|ผู้ส่ง|ประเภทข้อความ|เนื้อหาข้อความ]',
      },

      // รูปแบบข้อความกลุ่มฝั่งเรา: [我方群聊消息|我|群ID|消息类型|消息内容]
      myGroupMessage: {
        name: '我方群聊消息',
        regex: /\[我方群聊消息\|我\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
        fields: ['number', 'messageType', 'content'], // แก้ไข: number ใช้สำหรับจับคู่ ID กลุ่ม
        description: 'ดึงรูปแบบข้อความกลุ่มฝั่งเรา: [我方群聊消息|我|ID กลุ่ม|ประเภทข้อความ|เนื้อหาข้อความ]',
      },

      // รูปแบบเลข QQ: [qq号|姓名|号码|ID]
      qqNumber: {
        name: 'QQ号',
        regex: /\[qq号\|([^|]*)\|(\d+)\|(\d+)\]/g,
        fields: ['name', 'number', 'id'],
        description: 'ดึงรูปแบบเลข QQ: [qq号|ชื่อ|หมายเลข|ID]',
      },

      // รูปแบบแชทกลุ่ม: [群聊|群名|群ID|描述]
      groupChat: {
        name: '群聊',
        regex: /\[群聊\|([^|]*)\|(\d+)\|([^|]*)\]/g,
        fields: ['groupName', 'groupId', 'description'],
        description: 'ดึงรูปแบบแชทกลุ่ม: [群聊|ชื่อกลุ่ม|ID กลุ่ม|สมาชิกกลุ่ม]',
      },

      // รูปแบบสร้างแชทกลุ่ม: [创建群聊|群ID|群名|描述]
      createGroupChat: {
        name: '创建群聊',
        regex: /\[创建群聊\|(\d+)\|([^|]*)\|([^|]*)\]/g,
        fields: ['groupId', 'groupName', 'description'],
        description: 'ดึงรูปแบบสร้างแชทกลุ่ม: [创建群聊|ID กลุ่ม|ชื่อกลุ่ม|คำอธิบาย]',
      },

      // รูปแบบอวาตาร์: [头像|用户类型|头像数据]
      avatar: {
        name: '头像',
        regex: /\[头像\|([^|]*)\|([^\]]*)\]/g,
        fields: ['userType', 'avatarData'],
        description: 'ดึงรูปแบบอวาตาร์: [头像|ประเภทผู้ใช้|ข้อมูลอวาตาร์]',
      },

      // รูปแบบเหตุการณ์ระบบ: [系统|事件|数据]
      systemEvent: {
        name: '系统事件',
        regex: /\[系统\|([^|]*)\|([^|]*)\]/g,
        fields: ['event', 'data'],
        description: 'ดึงรูปแบบเหตุการณ์ระบบ: [系统|เหตุการณ์|ข้อมูล]',
      },

      // รูปแบบข้อความศัตรู: [敌方消息|内容|伤害]
      enemyMessage: {
        name: '敌方消息',
        regex: /\[敌方消息\|([^|]*)\|(\d+)\]/g,
        fields: ['content', 'damage'],
        description: 'ดึงรูปแบบข้อความศัตรู: [敌方消息|เนื้อหา|ความเสียหาย]',
      },
    };
  }

  /**
   * ลบเนื้อหาที่ห่อด้วยแท็ก thinking
   * @param {string} text - ข้อความต้นฉบับ
   * @returns {string} ข้อความหลังลบแท็ก thinking
   */
  removeThinkingTags(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // ลบแท็ก <think>...</think> และ <thinking>...</thinking> พร้อมเนื้อหา
    const thinkingTagRegex = /<think>[\s\S]*?<\/think>|<thinking>[\s\S]*?<\/thinking>/gi;
    return text.replace(thinkingTagRegex, '');
  }

  /**
   * ตรวจสอบว่าเครื่องหมายรูปแบบอยู่ภายในแท็ก thinking หรือไม่
   * @param {string} text - ข้อความต้นฉบับ
   * @param {number} patternStart - ตำแหน่งเริ่มต้นของเครื่องหมายรูปแบบ
   * @param {number} patternEnd - ตำแหน่งสิ้นสุดของเครื่องหมายรูปแบบ
   * @returns {boolean} อยู่ภายในแท็ก thinking หรือไม่
   */
  isPatternInsideThinkingTags(text, patternStart, patternEnd) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const thinkingTagRegex = /<think>[\s\S]*?<\/think>|<thinking>[\s\S]*?<\/thinking>/gi;
    let match;

    while ((match = thinkingTagRegex.exec(text)) !== null) {
      const thinkStart = match.index;
      const thinkEnd = match.index + match[0].length;

      // ตรวจสอบว่าเครื่องหมายรูปแบบอยู่ภายในแท็ก thinking ทั้งหมดหรือไม่
      if (patternStart >= thinkStart && patternEnd <= thinkEnd) {
        return true;
      }
    }

    return false;
  }

  /**
   * ลบเฉพาะเครื่องหมายรูปแบบที่ไม่อยู่ภายในแท็ก thinking
   * @param {string} text - ข้อความต้นฉบับ
   * @param {RegExp} pattern - regex ของเครื่องหมายรูปแบบ
   * @returns {string} ข้อความหลังลบเครื่องหมายรูปแบบที่ระบุ
   */
  removePatternOutsideThinkingTags(text, pattern) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // สร้างอินสแตนซ์ regex ใหม่ เพื่อหลีกเลี่ยงปัญหา lastIndex
    const newPattern = new RegExp(pattern.source, pattern.flags);
    let result = text;
    const replacements = [];
    let match;

    // ค้นหาการจับคู่ทั้งหมด
    while ((match = newPattern.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // ตรวจสอบว่าการจับคู่นี้อยู่ภายในแท็ก thinking หรือไม่
      if (!this.isPatternInsideThinkingTags(text, matchStart, matchEnd)) {
        replacements.push({
          start: matchStart,
          end: matchEnd,
          text: match[0],
        });
      }
    }

    // แทนที่จากหลังไปหน้า เพื่อหลีกเลี่ยงปัญหาดัชนี
    replacements.reverse().forEach(replacement => {
      result = result.substring(0, replacement.start) + result.substring(replacement.end);
    });

    return result;
  }

  /**
   * ดึงข้อมูลรูปแบบที่ระบุจากข้อความ
   * @param {string} text - ข้อความที่จะดึงข้อมูล
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {Array} อาร์เรย์ผลลัพธ์การดึงข้อมูล
   */
  extractDataFromText(text, formatName) {
    const formats = this.getExtractorFormats();
    const format = formats[formatName];

    if (!format) {
      this.log('error', `ไม่พบรูปแบบ: ${formatName}`);
      return [];
    }

    const results = [];
    let match;

    // รีเซ็ต lastIndex ของ regex
    format.regex.lastIndex = 0;

    while ((match = format.regex.exec(text)) !== null) {
      const extracted = {
        fullMatch: match[0],
        index: match.index,
        timestamp: new Date(),
      };

      // เพิ่มฟิลด์ที่มีชื่อ
      format.fields.forEach((fieldName, index) => {
        extracted[fieldName] = match[index + 1] || '';
      });

      results.push(extracted);
    }

    // แก้ไข: แสดงรายละเอียดข้อมูลที่ดึงเฉพาะในโหมดดีบัก
    if (window.DEBUG_CONTEXT_MONITOR) {
      this.log('info', `ดึงข้อมูล ${format.name} จำนวน ${results.length} รายการจากข้อความ`);
    }
    return results;
  }

  /**
   * ดึงข้อมูลจากข้อความแชทปัจจุบัน
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async extractFromCurrentChat(formatName) {
    try {
      const chatData = await this.getCurrentChatMessages();
      if (!chatData || !chatData.messages) {
        this.log('error', 'ไม่สามารถรับข้อความแชทได้');
        return null;
      }

      const allExtractions = [];
      let totalMessageCount = 0;
      let globalExtractionIndex = 0; // ดัชนีการดึงข้อมูลส่วนกลาง

      // 🔥 แก้ไข: เรียงลำดับตามลำดับที่ปรากฏในข้อความต้นฉบับ ไม่ใช่ตาม timestamp
      // คงลำดับข้อความเดิม เพื่อให้การสนทนาต่อเนื่อง
      const originalMessages = [...chatData.messages];

      this.log('info', `คงลำดับข้อความเดิม รวม ${originalMessages.length} รายการ`);

      originalMessages.forEach((message, messageIndex) => {
        if (message.mes) {
          // ลบแท็ก thinking ก่อนดึงข้อมูล เพื่อหลีกเลี่ยงการดึงเนื้อหาภายใน thinking
          const messageForExtraction = this.removeThinkingTags(message.mes);
          const extractions = this.extractDataFromText(messageForExtraction, formatName);

          // เพิ่มบริบทข้อความและดัชนีส่วนกลางให้แต่ละผลลัพธ์
          extractions.forEach(extraction => {
            extraction.messageIndex = messageIndex;
            extraction.globalIndex = globalExtractionIndex++; // ดัชนีลำดับส่วนกลาง
            extraction.messageId = message.id || messageIndex;
            extraction.messageName = message.name || 'Unknown';
            extraction.messageTimestamp = message.send_date || message.timestamp;
            extraction.isUser = message.is_user || false;
            // 🔥 เพิ่มข้อมูล name และ extra ของข้อความต้นฉบับ สำหรับการตรวจสอบความสอดคล้อง
            extraction.originalMessageName = message.name;
            extraction.originalMessageExtra = message.extra;
            extraction.originalMessageIndex = messageIndex;
          });

          allExtractions.push(...extractions);
          totalMessageCount++;
        }
      });

      const result = {
        formatName: formatName,
        chatId: chatData.chatId,
        totalMessages: totalMessageCount,
        extractedCount: allExtractions.length,
        extractions: allExtractions,
        extractedAt: new Date(),
      };

      this.log('info', `ดึงข้อมูล ${allExtractions.length} รายการจาก ${totalMessageCount} ข้อความ`, result);
      return result;
    } catch (error) {
      this.log('error', 'ดึงข้อมูลจากแชทล้มเหลว', error);
      return null;
    }
  }

  /**
   * 🚀 เวอร์ชันปรับปรุง: ดึงข้อมูลแบบแบ่งชิ้นจากข้อความแชทปัจจุบัน (เหมาะสำหรับไฟล์ขนาดใหญ่)
   * @param {string} formatName - ชื่อรูปแบบ
   * @param {Object} options - ตัวเลือกการดึงข้อมูล
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async extractFromCurrentChatOptimized(formatName, options = {}) {
    const config = { ...this.getLargeFileConfig(), ...options };
    const controller = new AbortController();
    const startTime = Date.now();

    try {
      const chatData = await this.getCurrentChatMessages();
      if (!chatData || !chatData.messages) {
        this.log('error', 'ไม่สามารถรับข้อความแชทได้');
        return null;
      }

      const originalMessages = [...chatData.messages];
      const totalMessages = originalMessages.length;

      // ตรวจสอบว่าต้องใช้การประมวลผลแบบปรับปรุงหรือไม่
      const shouldUseOptimization = totalMessages > 1000 || this.estimateDataSize(originalMessages) > 10 * 1024 * 1024; // 10MB

      if (!shouldUseOptimization) {
        this.log('info', 'ข้อมูลมีขนาดเล็ก ใช้วิธีดึงข้อมูลมาตรฐาน');
        return await this.extractFromCurrentChat(formatName);
      }

      this.log('info', `เริ่มการดึงข้อมูลแบบปรับปรุง: ${totalMessages} ข้อความ ใช้ขนาดชิ้นส่วน ${config.chunkSize}`);

      const allExtractions = [];
      let globalExtractionIndex = 0;
      let processedMessages = 0;

      // ประมวลผลข้อความเป็นชิ้นส่วน
      for (let chunkStart = 0; chunkStart < totalMessages; chunkStart += config.chunkSize) {
        // ตรวจสอบว่าถูกยกเลิกหรือไม่
        if (controller.signal.aborted) {
          throw new Error('การดึงข้อมูลถูกยกเลิก');
        }

        // ตรวจสอบเวลาประมวลผล
        if (Date.now() - startTime > config.maxProcessingTime * 1000) {
          throw new Error('การดึงข้อมูลหมดเวลา');
        }

        const chunkEnd = Math.min(chunkStart + config.chunkSize, totalMessages);
        const chunk = originalMessages.slice(chunkStart, chunkEnd);

        this.log(
          'debug',
          `ประมวลผลชิ้นส่วน ${Math.floor(chunkStart / config.chunkSize) + 1}/${Math.ceil(totalMessages / config.chunkSize)}`,
        );

        // ประมวลผลชิ้นส่วนปัจจุบัน
        const chunkExtractions = await this.processMessageChunk(chunk, formatName, chunkStart, globalExtractionIndex);
        allExtractions.push(...chunkExtractions);
        globalExtractionIndex += chunkExtractions.length;
        processedMessages += chunk.length;

        // ทริกเกอร์ callback ความคืบหน้า
        if (options.onProgress) {
          const progress = {
            processed: processedMessages,
            total: totalMessages,
            percentage: Math.round((processedMessages / totalMessages) * 100),
            extractedCount: allExtractions.length,
            currentChunk: Math.floor(chunkStart / config.chunkSize) + 1,
            totalChunks: Math.ceil(totalMessages / config.chunkSize),
          };
          await options.onProgress(progress);
        }

        // การจัดการหน่วยความจำ: ล้างข้อมูลเป็นระยะและแนะนำ garbage collection
        if (chunkStart > 0 && chunkStart % (config.chunkSize * 10) === 0) {
          await this.performMemoryOptimization();
        }

        // เพิ่มดีเลย์ เพื่อหลีกเลี่ยงการบล็อก UI
        if (config.processingDelay > 0) {
          await this.sleep(config.processingDelay);
        }
      }

      const result = {
        formatName: formatName,
        chatId: chatData.chatId,
        totalMessages: processedMessages,
        extractedCount: allExtractions.length,
        extractions: allExtractions,
        extractedAt: new Date(),
        processingTime: Date.now() - startTime,
        optimized: true,
        chunks: Math.ceil(totalMessages / config.chunkSize),
      };

      this.log(
        'info',
        `การดึงข้อมูลแบบปรับปรุงเสร็จสมบูรณ์: ${processedMessages} ข้อความ, ${allExtractions.length} รายการข้อมูล, ใช้เวลา ${result.processingTime}ms`,
      );
      return result;
    } catch (error) {
      this.log('error', 'การดึงข้อมูลแบบปรับปรุงล้มเหลว', error);

      // หากเป็นการยกเลิก ส่งคืนผลลัพธ์บางส่วน
      if (error.message.includes('ยกเลิก')) {
        return {
          formatName: formatName,
          extractedCount: 0,
          extractions: [],
          cancelled: true,
          error: error.message,
        };
      }

      return null;
    }
  }

  /**
   * ประมวลผลชิ้นส่วนข้อความ
   */
  async processMessageChunk(messages, formatName, startIndex, globalStartIndex) {
    const chunkExtractions = [];
    let localExtractionIndex = globalStartIndex;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageIndex = startIndex + i;

      if (message.mes) {
        // ลบแท็ก thinking ก่อนดึงข้อมูล
        const messageForExtraction = this.removeThinkingTags(message.mes);
        const extractions = this.extractDataFromText(messageForExtraction, formatName);

        // เพิ่มบริบทข้อความให้แต่ละผลลัพธ์
        extractions.forEach(extraction => {
          extraction.messageIndex = messageIndex;
          extraction.globalIndex = localExtractionIndex++;
          extraction.messageId = message.id || messageIndex;
          extraction.messageName = message.name || 'Unknown';
          extraction.messageTimestamp = message.send_date || message.timestamp;
          extraction.isUser = message.is_user || false;
          extraction.originalMessageName = message.name;
          extraction.originalMessageExtra = message.extra;
          extraction.originalMessageIndex = messageIndex;
        });

        chunkExtractions.push(...extractions);
      }
    }

    return chunkExtractions;
  }

  /**
   * ประมาณขนาดข้อมูล (ไบต์)
   */
  estimateDataSize(messages) {
    let totalSize = 0;
    for (const message of messages) {
      if (message.mes) {
        totalSize += message.mes.length * 2; // สมมติว่าแต่ละอักขระใช้ 2 ไบต์
      }
    }
    return totalSize;
  }

  /**
   * ดำเนินการปรับปรุงหน่วยความจำ
   */
  async performMemoryOptimization() {
    // ทริกเกอร์คำแนะนำ garbage collection
    if (window.gc) {
      window.gc();
    }

    // ล้างแคชที่ไม่จำเป็น
    this.performMemoryCleanup();

    // ดีเลย์สั้นๆ เพื่อให้ garbage collection ทำงาน
    await this.sleep(10);
  }

  /**
   * ฟังก์ชันพักเวลา
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ดึงข้อมูลจาก JSONL
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async extractFromCurrentChatJsonl(formatName) {
    try {
      const jsonlData = await this.getCurrentChatJsonl();
      if (!jsonlData || !jsonlData.lines) {
        this.log('error', 'ไม่สามารถรับข้อมูล JSONL ได้');
        return null;
      }

      const allExtractions = [];
      let processedLines = 0;

      // 🔥 แก้ไข: คงลำดับเดิมของข้อความ JSONL ไม่เรียงตาม timestamp
      // ให้แน่ใจว่าข้อความถูกประมวลผลตามลำดับที่ปรากฏในไฟล์
      const originalLines = [...jsonlData.lines];

      this.log('info', `คงลำดับเดิมของข้อความ JSONL รวม ${originalLines.length} รายการ`);

      originalLines.forEach((line, lineIndex) => {
        try {
          const messageObj = JSON.parse(line);
          if (messageObj.mes) {
            const extractions = this.extractDataFromText(messageObj.mes, formatName);

            // เพิ่มบริบท JSONL ให้แต่ละผลลัพธ์
            extractions.forEach(extraction => {
              extraction.lineIndex = lineIndex;
              extraction.messageId = messageObj.id || lineIndex;
              extraction.messageName = messageObj.name || 'Unknown';
              extraction.messageTimestamp = messageObj.send_date || messageObj.timestamp;
              extraction.isUser = messageObj.is_user || false;
              // 🔥 เพิ่มข้อมูล name และ extra ของข้อความต้นฉบับ สำหรับการตรวจสอบความสอดคล้อง
              extraction.originalMessageName = messageObj.name;
              extraction.originalMessageExtra = messageObj.extra;
              extraction.originalLineIndex = lineIndex;
            });

            allExtractions.push(...extractions);
            processedLines++;
          }
        } catch (error) {
          this.log('warn', `แยกวิเคราะห์บรรทัด JSONL ล้มเหลว: ${lineIndex}`, error);
        }
      });

      const result = {
        formatName: formatName,
        chatId: jsonlData.chatId,
        totalLines: processedLines,
        extractedCount: allExtractions.length,
        extractions: allExtractions,
        extractedAt: new Date(),
      };

      this.log('info', `ดึงข้อมูล ${allExtractions.length} รายการจาก ${processedLines} บรรทัด JSONL`, result);
      return result;
    } catch (error) {
      this.log('error', 'ดึงข้อมูลจาก JSONL ล้มเหลว', error);
      return null;
    }
  }

  /**
   * 🚀 เวอร์ชันปรับปรุง: ดึงข้อมูลแบบแบ่งชิ้นจาก JSONL (เหมาะสำหรับไฟล์ขนาดใหญ่)
   * @param {string} formatName - ชื่อรูปแบบ
   * @param {Object} options - ตัวเลือกการดึงข้อมูล
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async extractFromCurrentChatJsonlOptimized(formatName, options = {}) {
    const config = { ...this.getLargeFileConfig(), ...options };
    const controller = new AbortController();
    const startTime = Date.now();

    try {
      const jsonlData = await this.getCurrentChatJsonl();
      if (!jsonlData || !jsonlData.lines) {
        this.log('error', 'ไม่สามารถรับข้อมูล JSONL ได้');
        return null;
      }

      const originalLines = [...jsonlData.lines];
      const totalLines = originalLines.length;

      // ตรวจสอบว่าต้องใช้การประมวลผลแบบปรับปรุงหรือไม่
      const estimatedSize = this.estimateJsonlSize(originalLines);
      const shouldUseOptimization = totalLines > 1000 || estimatedSize > 10 * 1024 * 1024; // 10MB

      if (!shouldUseOptimization) {
        this.log('info', 'ข้อมูล JSONL มีขนาดเล็ก ใช้วิธีดึงข้อมูลมาตรฐาน');
        return await this.extractFromCurrentChatJsonl(formatName);
      }

      this.log(
        'info',
        `เริ่มการดึงข้อมูล JSONL แบบปรับปรุง: ${totalLines} บรรทัด, ขนาดประมาณ ${this.formatBytes(estimatedSize)}`,
      );

      const allExtractions = [];
      let processedLines = 0;

      // ประมวลผลบรรทัด JSONL เป็นชิ้นส่วน
      for (let chunkStart = 0; chunkStart < totalLines; chunkStart += config.chunkSize) {
        // ตรวจสอบว่าถูกยกเลิกหรือไม่
        if (controller.signal.aborted) {
          throw new Error('การดึงข้อมูล JSONL ถูกยกเลิก');
        }

        // ตรวจสอบเวลาประมวลผล
        if (Date.now() - startTime > config.maxProcessingTime * 1000) {
          throw new Error('การดึงข้อมูล JSONL หมดเวลา');
        }

        const chunkEnd = Math.min(chunkStart + config.chunkSize, totalLines);
        const chunk = originalLines.slice(chunkStart, chunkEnd);

        this.log(
          'debug',
          `ประมวลผลชิ้นส่วน JSONL ${Math.floor(chunkStart / config.chunkSize) + 1}/${Math.ceil(totalLines / config.chunkSize)}`,
        );

        // ประมวลผลชิ้นส่วนปัจจุบัน
        const chunkExtractions = await this.processJsonlChunk(chunk, formatName, chunkStart);
        allExtractions.push(...chunkExtractions);
        processedLines += chunk.length;

        // ทริกเกอร์ callback ความคืบหน้า
        if (options.onProgress) {
          const progress = {
            processed: processedLines,
            total: totalLines,
            percentage: Math.round((processedLines / totalLines) * 100),
            extractedCount: allExtractions.length,
            currentChunk: Math.floor(chunkStart / config.chunkSize) + 1,
            totalChunks: Math.ceil(totalLines / config.chunkSize),
          };
          await options.onProgress(progress);
        }

        // การจัดการหน่วยความจำ
        if (chunkStart > 0 && chunkStart % (config.chunkSize * 10) === 0) {
          await this.performMemoryOptimization();
        }

        // เพิ่มดีเลย์ เพื่อหลีกเลี่ยงการบล็อก UI
        if (config.processingDelay > 0) {
          await this.sleep(config.processingDelay);
        }
      }

      const result = {
        formatName: formatName,
        chatId: jsonlData.chatId,
        totalLines: processedLines,
        extractedCount: allExtractions.length,
        extractions: allExtractions,
        extractedAt: new Date(),
        processingTime: Date.now() - startTime,
        optimized: true,
        chunks: Math.ceil(totalLines / config.chunkSize),
        estimatedSize: estimatedSize,
      };

      this.log(
        'info',
        `การดึงข้อมูล JSONL แบบปรับปรุงเสร็จสมบูรณ์: ${processedLines} บรรทัด, ${allExtractions.length} รายการข้อมูล, ใช้เวลา ${result.processingTime}ms`,
      );
      return result;
    } catch (error) {
      this.log('error', 'การดึงข้อมูล JSONL แบบปรับปรุงล้มเหลว', error);

      if (error.message.includes('ยกเลิก')) {
        return {
          formatName: formatName,
          extractedCount: 0,
          extractions: [],
          cancelled: true,
          error: error.message,
        };
      }

      return null;
    }
  }

  /**
   * ประมวลผลชิ้นส่วน JSONL
   */
  async processJsonlChunk(lines, formatName, startIndex) {
    const chunkExtractions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = startIndex + i;

      try {
        const messageObj = JSON.parse(line);
        if (messageObj.mes) {
          // ลบแท็ก thinking ก่อนดึงข้อมูล
          const messageForExtraction = this.removeThinkingTags(messageObj.mes);
          const extractions = this.extractDataFromText(messageForExtraction, formatName);

          // เพิ่มบริบท JSONL ให้แต่ละผลลัพธ์
          extractions.forEach(extraction => {
            extraction.lineIndex = lineIndex;
            extraction.messageId = messageObj.id || lineIndex;
            extraction.messageName = messageObj.name || 'Unknown';
            extraction.messageTimestamp = messageObj.send_date || messageObj.timestamp;
            extraction.isUser = messageObj.is_user || false;
            extraction.originalMessageName = messageObj.name;
            extraction.originalMessageExtra = messageObj.extra;
            extraction.originalLineIndex = lineIndex;
          });

          chunkExtractions.push(...extractions);
        }
      } catch (error) {
        this.log('warn', `แยกวิเคราะห์บรรทัด JSONL ล้มเหลว: ${lineIndex}`, error);
      }
    }

    return chunkExtractions;
  }

  /**
   * ประมาณขนาดข้อมูล JSONL
   */
  estimateJsonlSize(lines) {
    let totalSize = 0;
    for (const line of lines) {
      totalSize += line.length * 2; // สมมติว่าแต่ละอักขระใช้ 2 ไบต์
    }
    return totalSize;
  }

  /**
   * จัดรูปแบบจำนวนไบต์เป็นสตริงที่อ่านได้
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * เพิ่มรูปแบบการดึงข้อมูลที่กำหนดเอง
   * @param {string} name - ชื่อรูปแบบ
   * @param {Object} format - การกำหนดค่ารูปแบบ
   */
  addExtractorFormat(name, format) {
    if (!format.regex || !format.fields || !Array.isArray(format.fields)) {
      this.log('error', 'การกำหนดค่ารูปแบบไม่ถูกต้อง', format);
      return false;
    }

    // จัดเก็บรูปแบบที่กำหนดเองลงในอินสแตนซ์
    if (!this.customFormats) {
      this.customFormats = {};
    }

    this.customFormats[name] = {
      name: format.name || name,
      regex: format.regex,
      fields: format.fields,
      description: format.description || `รูปแบบที่กำหนดเอง: ${name}`,
      isCustom: true,
    };

    this.log('info', `เพิ่มรูปแบบที่กำหนดเองแล้ว: ${name}`, this.customFormats[name]);
    return true;
  }

  /**
   * รับรูปแบบทั้งหมดที่พร้อมใช้งาน (รวมรูปแบบที่กำหนดเอง)
   */
  getAllExtractorFormats() {
    const predefined = this.getExtractorFormats();
    const custom = this.customFormats || {};
    return { ...predefined, ...custom };
  }

  /**
   * แสดงรายการรูปแบบการดึงข้อมูลทั้งหมดที่พร้อมใช้งาน
   */
  listExtractorFormats() {
    const formats = this.getAllExtractorFormats();

    console.group('=== รูปแบบการดึงข้อมูลที่พร้อมใช้งาน ===');
    Object.entries(formats).forEach(([key, format]) => {
      console.log(`${key}: ${format.name}`);
      console.log(`  คำอธิบาย: ${format.description}`);
      console.log(`  ฟิลด์: [${format.fields.join(', ')}]`);
      console.log(`  regex: ${format.regex}`);
      if (format.isCustom) {
        console.log('  ประเภท: รูปแบบที่กำหนดเอง');
      }
      console.log('');
    });
    console.groupEnd();

    return formats;
  }

  /**
   * ส่งออกผลลัพธ์การดึงข้อมูลเป็น JSON
   * @param {Object} extractionResult - ผลลัพธ์การดึงข้อมูล
   * @returns {string} สตริง JSON
   */
  exportExtractions(extractionResult) {
    return JSON.stringify(extractionResult, null, 2);
  }

  // ===========================================
  // วิธีอำนวยความสะดวกสำหรับการประมวลผลไฟล์ขนาดใหญ่
  // ===========================================

  /**
   * วิธีดึงข้อมูลอัจฉริยะ - เลือกกลยุทธ์การดึงข้อมูลที่ดีที่สุดโดยอัตโนมัติ
   * @param {string} formatName - ชื่อรูปแบบ
   * @param {Object} options - ตัวเลือกการดึงข้อมูล
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async smartExtract(formatName, options = {}) {
    const startTime = Date.now();

    try {
      // ลองรับข้อมูลแชทก่อน
      const chatData = await this.getCurrentChatMessages();

      if (!chatData || !chatData.messages) {
        this.log('warn', 'ไม่สามารถรับข้อความแชทได้ ลองวิธี JSONL');

        // หากรับข้อความแชทล้มเหลว ลอง JSONL
        const jsonlData = await this.getCurrentChatJsonl();
        if (!jsonlData || !jsonlData.lines) {
          this.log('error', 'ไม่สามารถรับข้อมูลแชทใดๆ ได้');
          return null;
        }

        // ใช้การดึงข้อมูล JSONL แบบปรับปรุง
        return await this.extractFromCurrentChatJsonlOptimized(formatName, options);
      }

      // ประมาณปริมาณข้อมูล ตัดสินใจว่าจะใช้วิธีใด
      const messageCount = chatData.messages.length;
      const estimatedSize = this.estimateDataSize(chatData.messages);

      this.log(
        'info',
        `การวิเคราะห์การดึงข้อมูลอัจฉริยะ: ${messageCount} ข้อความ, ขนาดประมาณ ${this.formatBytes(estimatedSize)}`,
      );

      // ตัดสินว่าต้องใช้วิธีปรับปรุงหรือไม่
      if (messageCount > 1000 || estimatedSize > 10 * 1024 * 1024) {
        this.log('info', 'ใช้วิธีดึงข้อมูลแบบปรับปรุงสำหรับไฟล์ขนาดใหญ่');
        return await this.extractFromCurrentChatOptimized(formatName, options);
      } else {
        this.log('info', 'ใช้วิธีดึงข้อมูลมาตรฐานสำหรับไฟล์ขนาดเล็ก');
        return await this.extractFromCurrentChat(formatName);
      }
    } catch (error) {
      this.log('error', 'การดึงข้อมูลอัจฉริยะล้มเหลว', error);
      return null;
    }
  }

  /**
   * วิธีดึงข้อมูลพร้อมแสดงความคืบหน้า
   * @param {string} formatName - ชื่อรูปแบบ
   * @param {Function} progressCallback - ฟังก์ชัน callback ความคืบหน้า
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูล
   */
  async extractWithProgress(formatName, progressCallback) {
    const options = {
      onProgress: async progress => {
        this.log('debug', `ความคืบหน้าการดึงข้อมูล: ${progress.percentage}% (${progress.processed}/${progress.total})`);

        if (progressCallback && typeof progressCallback === 'function') {
          await progressCallback(progress);
        }
      },
    };

    return await this.smartExtract(formatName, options);
  }

  /**
   * ตรวจสอบขนาดไฟล์และความซับซ้อนอย่างรวดเร็ว
   * @returns {Promise<Object>} ผลลัพธ์การวิเคราะห์ไฟล์
   */
  async analyzeFileComplexity() {
    const startTime = Date.now();

    try {
      const chatData = await this.getCurrentChatMessages();

      if (!chatData || !chatData.messages) {
        return { error: 'ไม่สามารถรับข้อมูลแชทได้' };
      }

      const messages = chatData.messages;
      const messageCount = messages.length;
      const estimatedSize = this.estimateDataSize(messages);

      // วิเคราะห์การกระจายประเภทข้อความ
      let userMessages = 0;
      let botMessages = 0;
      let avgMessageLength = 0;
      let maxMessageLength = 0;
      let totalTextLength = 0;

      messages.forEach(message => {
        if (message.mes) {
          const length = message.mes.length;
          totalTextLength += length;
          maxMessageLength = Math.max(maxMessageLength, length);

          if (message.is_user) {
            userMessages++;
          } else {
            botMessages++;
          }
        }
      });

      avgMessageLength = messageCount > 0 ? Math.round(totalTextLength / messageCount) : 0;

      // คำนวณคะแนนความซับซ้อน
      let complexityScore = 0;
      if (messageCount > 5000) complexityScore += 3;
      else if (messageCount > 1000) complexityScore += 2;
      else if (messageCount > 500) complexityScore += 1;

      if (estimatedSize > 50 * 1024 * 1024)
        complexityScore += 3; // 50MB+
      else if (estimatedSize > 10 * 1024 * 1024)
        complexityScore += 2; // 10MB+
      else if (estimatedSize > 5 * 1024 * 1024) complexityScore += 1; // 5MB+

      if (avgMessageLength > 2000) complexityScore += 2;
      else if (avgMessageLength > 1000) complexityScore += 1;

      // กำหนดกลยุทธ์ที่แนะนำ
      let recommendedStrategy = 'standard';
      if (complexityScore >= 5) {
        recommendedStrategy = 'optimized';
      } else if (complexityScore >= 3) {
        recommendedStrategy = 'smart';
      }

      const result = {
        messageCount,
        estimatedSize,
        formattedSize: this.formatBytes(estimatedSize),
        userMessages,
        botMessages,
        avgMessageLength,
        maxMessageLength,
        complexityScore,
        recommendedStrategy,
        analysisTime: Date.now() - startTime,
        recommendations: this.generateRecommendations(complexityScore, messageCount, estimatedSize),
      };

      this.log('info', 'การวิเคราะห์ความซับซ้อนของไฟล์เสร็จสมบูรณ์', result);
      return result;
    } catch (error) {
      this.log('error', 'การวิเคราะห์ความซับซ้อนของไฟล์ล้มเหลว', error);
      return { error: error.message };
    }
  }

  /**
   * สร้างคำแนะนำการประมวลผล
   */
  generateRecommendations(complexityScore, messageCount, estimatedSize) {
    const recommendations = [];

    if (complexityScore >= 5) {
      recommendations.push('แนะนำให้ใช้วิธี extractFromCurrentChatOptimized()');
      recommendations.push('แนะนำให้ตั้งค่าขนาดชิ้นส่วนเล็ก (chunkSize: 50-100)');
      recommendations.push('แนะนำให้เพิ่มดีเลย์การประมวลผลเพื่อหลีกเลี่ยงการบล็อก UI');
      recommendations.push('แนะนำให้ตรวจสอบการใช้หน่วยความจำ');
    } else if (complexityScore >= 3) {
      recommendations.push('แนะนำให้ใช้วิธี smartExtract() เลือกกลยุทธ์อัตโนมัติ');
      recommendations.push('สามารถพิจารณาเปิดใช้งาน callback ความคืบหน้า');
    } else {
      recommendations.push('สามารถใช้วิธีมาตรฐาน extractFromCurrentChat()');
      recommendations.push('ข้อมูลมีขนาดเล็ก ความเร็วการประมวลผลควรจะเร็ว');
    }

    if (messageCount > 10000) {
      recommendations.push('⚠️  จำนวนข้อความเกิน 10000 รายการ แนะนำให้ประมวลผลเป็นชุด');
    }

    if (estimatedSize > 100 * 1024 * 1024) {
      recommendations.push('⚠️  ขนาดไฟล์เกิน 100MB แนะนำให้พิจารณาการประมวลผลล่วงหน้าหรือกรอง');
    }

    return recommendations;
  }

  /**
   * การดึงข้อมูลหลายรูปแบบ (เวอร์ชันปรับปรุง)
   * @param {Array} formatNames - อาร์เรย์ชื่อรูปแบบ
   * @param {Object} options - ตัวเลือกการดึงข้อมูล
   * @returns {Promise<Object>} ผลลัพธ์การดึงข้อมูลแบบชุด
   */
  async batchExtractOptimized(formatNames, options = {}) {
    const startTime = Date.now();
    const results = {};

    try {
      // วิเคราะห์ความซับซ้อนของไฟล์ก่อน
      const complexity = await this.analyzeFileComplexity();

      if (complexity.error) {
        return { error: complexity.error };
      }

      this.log(
        'info',
        `เริ่มการดึงข้อมูลแบบชุด ${formatNames.length} รูปแบบ, กลยุทธ์ที่แนะนำ: ${complexity.recommendedStrategy}`,
      );

      let totalExtracted = 0;
      let processedFormats = 0;

      for (const formatName of formatNames) {
        try {
          this.log('debug', `กำลังดึงรูปแบบ: ${formatName}`);

          const formatOptions = {
            ...options,
            onProgress: async progress => {
              // คำนวณความคืบหน้าโดยรวม
              const overallProgress = {
                currentFormat: formatName,
                formatProgress: progress,
                processedFormats,
                totalFormats: formatNames.length,
                overallPercentage: Math.round(
                  ((processedFormats + progress.percentage / 100) / formatNames.length) * 100,
                ),
              };

              if (options.onProgress && typeof options.onProgress === 'function') {
                await options.onProgress(overallProgress);
              }
            },
          };

          // เลือกกลยุทธ์ตามความซับซ้อน
          let result;
          if (complexity.recommendedStrategy === 'optimized') {
            result = await this.extractFromCurrentChatOptimized(formatName, formatOptions);
          } else {
            result = await this.smartExtract(formatName, formatOptions);
          }

          if (result) {
            results[formatName] = result;
            totalExtracted += result.extractedCount || 0;
          } else {
            results[formatName] = { error: 'การดึงข้อมูลล้มเหลว' };
          }

          processedFormats++;

          // เพิ่มช่วงเวลา เพื่อหลีกเลี่ยงการใช้ทรัพยากรมากเกินไป
          if (formatNames.length > 5) {
            await this.sleep(100);
          }
        } catch (error) {
          this.log('error', `ดึงรูปแบบ ${formatName} ล้มเหลว`, error);
          results[formatName] = { error: error.message };
          processedFormats++;
        }
      }

      const batchResult = {
        results,
        summary: {
          totalFormats: formatNames.length,
          successfulFormats: Object.keys(results).filter(key => !results[key].error).length,
          totalExtracted,
          processingTime: Date.now() - startTime,
          complexity: complexity.complexityScore,
          strategy: complexity.recommendedStrategy,
        },
      };

      this.log('info', `การดึงข้อมูลแบบชุดเสร็จสมบูรณ์`, batchResult.summary);
      return batchResult;
    } catch (error) {
      this.log('error', 'การดึงข้อมูลแบบชุดล้มเหลว', error);
      return { error: error.message };
    }
  }

  // ===========================================
  // วิธีช่วยเหลืออำนวยความสะดวก
  // ===========================================

  /**
   * รับ regex ของรูปแบบเฉพาะ
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {RegExp|null} อ็อบเจกต์ regex
   */
  getRegexForFormat(formatName) {
    const formats = this.getAllExtractorFormats();
    const format = formats[formatName];
    if (!format) {
      this.log('warn', `ไม่พบรูปแบบ: ${formatName}`);
      return null;
    }
    // ส่งคืนอ็อบเจกต์ regex ใหม่ เพื่อหลีกเลี่ยงปัญหา lastIndex
    return new RegExp(format.regex.source, format.regex.flags);
  }

  /**
   * สร้างตัวจับคู่ข้อความตาม friendId เฉพาะ
   * @param {string|number} friendId - ID เพื่อน
   * @returns {Object} อ็อบเจกต์ที่มีตัวจับคู่ข้อความประเภทต่างๆ
   */
  createFriendMessageMatchers(friendId) {
    const escapeRegex = str => str.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFriendId = escapeRegex(friendId);

    return {
      // จับคู่ข้อมูลเพื่อน
      friend: new RegExp(`\\[好友id\\|([^|]*)\\|${escapedFriendId}\\]`, 'g'),

      // จับคู่ข้อความฝั่งเรา
      myMessage: new RegExp(`\\[我方消息\\|[^|]*\\|${escapedFriendId}\\|[^|]*\\|[^\\]]*\\]`, 'g'),

      // จับคู่ข้อความฝั่งตรงข้าม
      otherMessage: new RegExp(`\\[对方消息\\|[^|]*\\|${escapedFriendId}\\|[^|]*\\|[^\\]]*\\]`, 'g'),

      // จับคู่ข้อความทั่วไป
      universalMessage: new RegExp(`\\[(我方消息|对方消息)\\|[^|]*\\|${escapedFriendId}\\|[^|]*\\|[^\\]]*\\]`, 'g'),
    };
  }

  /**
   * สร้างตัวจับคู่ตามชื่อเพื่อนเฉพาะ
   * @param {string} friendName - ชื่อเพื่อน
   * @returns {RegExp} ตัวจับคู่เพื่อน
   */
  createFriendNameMatcher(friendName) {
    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFriendName = escapeRegex(friendName);

    return new RegExp(`\\[好友id\\|${escapedFriendName}\\|(\\d+)\\]`, 'g');
  }

  /**
   * ทดสอบว่าข้อความมีรูปแบบเฉพาะหรือไม่
   * @param {string} text - ข้อความที่จะทดสอบ
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {boolean} มีรูปแบบนั้นหรือไม่
   */
  testFormat(text, formatName) {
    const regex = this.getRegexForFormat(formatName);
    return regex ? regex.test(text) : false;
  }

  /**
   * รับประเภทรูปแบบทั้งหมดที่ตรงกัน
   * @param {string} text - ข้อความที่จะตรวจสอบ
   * @returns {Array} อาร์เรย์ประเภทรูปแบบที่ตรงกัน
   */
  getMatchingFormats(text) {
    const formats = this.getAllExtractorFormats();
    const matchingFormats = [];

    Object.keys(formats).forEach(formatName => {
      if (this.testFormat(text, formatName)) {
        matchingFormats.push(formatName);
      }
    });

    return matchingFormats;
  }

  /**
   * ดึงข้อมูลเพื่อนอย่างรวดเร็ว
   * @param {string} text - ข้อความที่จะดึงข้อมูล
   * @returns {Array} อาร์เรย์ข้อมูลเพื่อน
   */
  extractFriends(text) {
    return this.extractDataFromText(text, 'friend');
  }

  /**
   * ดึงข้อความฝั่งเราอย่างรวดเร็ว
   * @param {string} text - ข้อความที่จะดึงข้อมูล
   * @returns {Array} อาร์เรย์ข้อความฝั่งเรา
   */
  extractMyMessages(text) {
    return this.extractDataFromText(text, 'myMessage');
  }

  /**
   * ดึงข้อความฝั่งตรงข้ามอย่างรวดเร็ว
   * @param {string} text - ข้อความที่จะดึงข้อมูล
   * @returns {Array} อาร์เรย์ข้อความฝั่งตรงข้าม
   */
  extractOtherMessages(text) {
    return this.extractDataFromText(text, 'otherMessage');
  }

  /**
   * ดึงข้อมูลหลายรูปแบบพร้อมกัน
   * @param {string} text - ข้อความที่จะดึงข้อมูล
   * @param {Array} formatNames - อาร์เรย์ชื่อรูปแบบ
   * @returns {Object} ผลลัพธ์การดึงข้อมูลจัดกลุ่มตามชื่อรูปแบบ
   */
  extractMultipleFormats(text, formatNames) {
    const results = {};

    formatNames.forEach(formatName => {
      results[formatName] = this.extractDataFromText(text, formatName);
    });

    return results;
  }

  /**
   * นับจำนวนรูปแบบต่างๆ ในข้อความ
   * @param {string} text - ข้อความที่จะนับ
   * @returns {Object} สถิติจำนวนรูปแบบ
   */
  countFormats(text) {
    const formats = this.getAllExtractorFormats();
    const counts = {};

    Object.keys(formats).forEach(formatName => {
      const extractions = this.extractDataFromText(text, formatName);
      counts[formatName] = extractions.length;
    });

    return counts;
  }

  /**
   * รีเซ็ต lastIndex ของ regex ทุกรูปแบบ
   * ใช้เพื่อหลีกเลี่ยงปัญหาสถานะของ regex ส่วนกลาง
   */
  resetRegexStates() {
    const formats = this.getAllExtractorFormats();
    Object.values(formats).forEach(format => {
      if (format.regex && format.regex.global) {
        format.regex.lastIndex = 0;
      }
    });
  }

  // ===========================================
  // วิธีเครื่องมือขั้นสูง
  // ===========================================

  /**
   * สร้างตัวตรวจสอบรูปแบบ
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {Function} ฟังก์ชันตรวจสอบ
   */
  createFormatValidator(formatName) {
    const regex = this.getRegexForFormat(formatName);
    if (!regex) {
      return () => false;
    }

    return text => {
      const testRegex = new RegExp(regex.source, regex.flags);
      return testRegex.test(text);
    };
  }

  /**
   * สร้างตัวดึงข้อมูลรูปแบบ
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {Function} ฟังก์ชันดึงข้อมูล
   */
  createFormatExtractor(formatName) {
    return text => {
      return this.extractDataFromText(text, formatName);
    };
  }

  /**
   * สร้างเครื่องมือรูปแบบแบบชุด
   * @param {Array} formatNames - อาร์เรย์ชื่อรูปแบบ
   * @returns {Object} อ็อบเจกต์เครื่องมือ
   */
  createFormatTools(formatNames = []) {
    const tools = {};

    formatNames.forEach(formatName => {
      tools[formatName] = {
        validator: this.createFormatValidator(formatName),
        extractor: this.createFormatExtractor(formatName),
        regex: this.getRegexForFormat(formatName),
        format: this.getAllExtractorFormats()[formatName],
      };
    });

    return tools;
  }

  /**
   * รับชุดเครื่องมือของทุกรูปแบบ
   * @returns {Object} ชุดเครื่องมือที่สมบูรณ์
   */
  getAllFormatTools() {
    const formats = this.getAllExtractorFormats();
    return this.createFormatTools(Object.keys(formats));
  }

  /**
   * การวิเคราะห์ข้อความอัจฉริยะ
   * @param {string} text - ข้อความที่จะวิเคราะห์
   * @returns {Object} ผลลัพธ์การวิเคราะห์
   */
  analyzeText(text) {
    const analysis = {
      text: text,
      length: text.length,
      formats: {},
      totalMatches: 0,
      matchingFormats: [],
      summary: {},
    };

    const formats = this.getAllExtractorFormats();

    Object.keys(formats).forEach(formatName => {
      const extractions = this.extractDataFromText(text, formatName);

      if (extractions.length > 0) {
        analysis.formats[formatName] = {
          count: extractions.length,
          extractions: extractions,
          format: formats[formatName],
        };
        analysis.totalMatches += extractions.length;
        analysis.matchingFormats.push(formatName);
      }
    });

    // สร้างสรุป
    analysis.summary = {
      hasMatches: analysis.totalMatches > 0,
      formatCount: analysis.matchingFormats.length,
      mostCommonFormat: this.getMostCommonFormat(analysis.formats),
      textType: this.guessTextType(analysis.matchingFormats),
    };

    return analysis;
  }

  /**
   * รับรูปแบบที่พบบ่อยที่สุด
   * @param {Object} formats - สถิติรูปแบบ
   * @returns {string|null} ชื่อรูปแบบที่พบบ่อยที่สุด
   */
  getMostCommonFormat(formats) {
    let maxCount = 0;
    let mostCommon = null;

    Object.entries(formats).forEach(([formatName, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostCommon = formatName;
      }
    });

    return mostCommon;
  }

  /**
   * คาดเดาประเภทข้อความ
   * @param {Array} matchingFormats - อาร์เรย์รูปแบบที่ตรงกัน
   * @returns {string} ประเภทข้อความ
   */
  guessTextType(matchingFormats) {
    if (matchingFormats.length === 0) {
      return 'unknown';
    }

    if (matchingFormats.includes('friend')) {
      return 'friend-list';
    }

    if (matchingFormats.includes('myMessage') || matchingFormats.includes('otherMessage')) {
      return 'chat-conversation';
    }

    if (matchingFormats.includes('groupMessage') || matchingFormats.includes('myGroupMessage')) {
      return 'group-chat';
    }

    if (matchingFormats.includes('systemEvent')) {
      return 'system-log';
    }

    return 'mixed';
  }

  /**
   * จัดรูปแบบผลลัพธ์การดึงข้อมูลเป็นข้อความที่อ่านได้
   * @param {Array} extractions - ผลลัพธ์การดึงข้อมูล
   * @param {string} formatName - ชื่อรูปแบบ
   * @returns {string} ข้อความที่จัดรูปแบบแล้ว
   */
  formatExtractionsAsText(extractions, formatName) {
    if (!extractions || extractions.length === 0) {
      return `ไม่พบข้อมูลรูปแบบ ${formatName}`;
    }

    const format = this.getAllExtractorFormats()[formatName];
    if (!format) {
      return 'รูปแบบไม่รู้จัก';
    }

    const lines = [`${format.name} (${extractions.length} รายการ):`];

    extractions.forEach((extraction, index) => {
      const fieldTexts = format.fields
        .map(field => {
          return `${field}: ${extraction[field] || 'N/A'}`;
        })
        .join(', ');

      lines.push(`  ${index + 1}. ${fieldTexts}`);
    });

    return lines.join('\n');
  }

  /**
   * ส่งออกการกำหนดค่ารูปแบบ
   * @returns {Object} อ็อบเจกต์การกำหนดค่ารูปแบบ
   */
  exportFormatConfig() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      formats: this.getAllExtractorFormats(),
      customFormats: this.customFormats || {},
    };
  }

  /**
   * นำเข้าการกำหนดค่ารูปแบบ
   * @param {Object} config - อ็อบเจกต์การกำหนดค่ารูปแบบ
   * @returns {boolean} นำเข้าสำเร็จหรือไม่
   */
  importFormatConfig(config) {
    try {
      if (config.customFormats) {
        this.customFormats = { ...this.customFormats, ...config.customFormats };
      }

      this.log('info', 'นำเข้าการกำหนดค่ารูปแบบสำเร็จ', config);
      return true;
    } catch (error) {
      this.log('error', 'นำเข้าการกำหนดค่ารูปแบบล้มเหลว', error);
      return false;
    }
  }

  // ปรับปรุง: ตั้งค่าตัวฟังการล้างหน่วยความจำ
  setupMemoryCleanupListener() {
    window.addEventListener('mobile-memory-cleanup', event => {
      this.performMemoryCleanup();
    });
  }

  // ปรับปรุง: ดำเนินการล้างหน่วยความจำ
  performMemoryCleanup() {
    const beforeCleanup = {
      contextHistory: this.contextHistory.length,
      logs: this.logs.length,
      eventStats: Object.keys(this.eventStats).length,
    };

    // ล้างประวัติ (เก็บครึ่งล่าสุดไว้)
    const keepCount = Math.floor(this.settings.historyLimit / 2);
    if (this.contextHistory.length > keepCount) {
      this.contextHistory = this.contextHistory.slice(-keepCount);
    }

    // ล้างล็อก (เก็บ 100 รายการล่าสุด)
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // รีเซ็ตสถิติเหตุการณ์ (เก็บเหตุการณ์สำคัญ)
    const importantEvents = ['message_sent', 'message_received', 'chat_id_changed'];
    const filteredStats = {};
    importantEvents.forEach(event => {
      if (this.eventStats[event]) {
        filteredStats[event] = this.eventStats[event];
      }
    });
    this.eventStats = filteredStats;

    const afterCleanup = {
      contextHistory: this.contextHistory.length,
      logs: this.logs.length,
      eventStats: Object.keys(this.eventStats).length,
    };

    this.log('info', 'การล้างหน่วยความจำเสร็จสมบูรณ์', { beforeCleanup, afterCleanup });
  }

  // ปรับปรุง: ล้างประวัติอัจฉริยะ
  cleanupHistoryRecords() {
    if (this.contextHistory.length <= this.settings.historyLimit) {
      return;
    }

    // หากเกินขีดจำกัด ลบรายการเก่าที่สุด
    const excess = this.contextHistory.length - this.settings.historyLimit;
    this.contextHistory.splice(0, excess);

    this.log('debug', `ล้างประวัติ ${excess} รายการ`);
  }

  // ปรับปรุง: รับสถิติประสิทธิภาพ
  getPerformanceStats() {
    const memoryUsage = this.performanceMonitor?.getMetrics()?.memoryUsage || 0;
    const runtime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      runtime,
      memoryUsage,
      contextHistorySize: this.contextHistory.length,
      logsSize: this.logs.length,
      eventStatsSize: Object.keys(this.eventStats).length,
      isRunning: this.isRunning,
      lastActivity: this.lastActivity,
      timeSinceLastActivity: Date.now() - this.lastActivity,
    };
  }
}

// ส่งออกคลาส
window.ContextMonitor = ContextMonitor;

// สร้างอินสแตนซ์ส่วนกลาง
window.contextMonitor = new ContextMonitor();

// เริ่มต้นอัตโนมัติ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.contextMonitor.init();
    console.log('[Context Monitor] ตัวตรวจสอบบริบทเริ่มต้นอัตโนมัติแล้ว');
  });
} else {
  window.contextMonitor.init();
  console.log('[Context Monitor] ตัวตรวจสอบบริบทเริ่มต้นอัตโนมัติแล้ว');
}

// ===========================================
// ตัวอย่างการใช้งานการประมวลผลไฟล์ขนาดใหญ่แบบปรับปรุง
// ===========================================

/**
 * 🚀 ตัวอย่างการประมวลผลไฟล์ขนาดใหญ่
 *
 * ต่อไปนี้คือโค้ดตัวอย่างสำหรับการใช้ฟังก์ชันปรับปรุงใหม่ในการประมวลผลไฟล์ 30MB+:
 *
 * # 1. การดึงข้อมูลอัจฉริยะ - เลือกกลยุทธ์ที่ดีที่สุดอัตโนมัติ
 * ```javascript
 * // ใช้งานง่าย
 * const result = await window.contextMonitor.smartExtract('myMessage');
 *
 * // พร้อม callback ความคืบหน้า
 * const result = await window.contextMonitor.extractWithProgress('myMessage', (progress) => {
 *   console.log(`ความคืบหน้า: ${progress.percentage}% (${progress.processed}/${progress.total})`);
 * });
 * ```
 *
 * # 2. การดึงข้อมูลแบบปรับปรุงด้วยตนเอง - ควบคุมเต็มที่
 * ```javascript
 * const result = await window.contextMonitor.extractFromCurrentChatOptimized('myMessage', {
 *   chunkSize: 50,           // ขนาดชิ้นส่วน
 *   processingDelay: 100,    // ดีเลย์การประมวลผล (มิลลิวินาที)
 *   onProgress: async (progress) => {
 *     console.log(`ความคืบหน้าชิ้นส่วน: ${progress.currentChunk}/${progress.totalChunks}`);
 *     console.log(`ความคืบหน้าข้อความ: ${progress.percentage}% (${progress.processed}/${progress.total})`);
 *     console.log(`ดึงข้อมูลแล้ว: ${progress.extractedCount} รายการ`);
 *   }
 * });
 * ```
 *
 * # 3. การวิเคราะห์ความซับซ้อนของไฟล์
 * ```javascript
 * const analysis = await window.contextMonitor.analyzeFileComplexity();
 * console.log('ผลการวิเคราะห์ไฟล์:', analysis);
 * console.log('กลยุทธ์ที่แนะนำ:', analysis.recommendedStrategy);
 * console.log('คำแนะนำการประมวลผล:', analysis.recommendations);
 * ```
 *
 * # 4. การดึงข้อมูลหลายรูปแบบ
 * ```javascript
 * const batchResult = await window.contextMonitor.batchExtractOptimized(
 *   ['myMessage', 'otherMessage', 'friend'],
 *   {
 *     onProgress: (progress) => {
 *       console.log(`ความคืบหน้าแบบชุด: ${progress.overallPercentage}%`);
 *       console.log(`รูปแบบปัจจุบัน: ${progress.currentFormat}`);
 *     }
 *   }
 * );
 * ```
 *
 * # 5. การดึงข้อมูล JSONL แบบปรับปรุง
 * ```javascript
 * const jsonlResult = await window.contextMonitor.extractFromCurrentChatJsonlOptimized('myMessage', {
 *   chunkSize: 100,
 *   onProgress: (progress) => {
 *     console.log(`ความคืบหน้าการประมวลผล JSONL: ${progress.percentage}%`);
 *   }
 * });
 * ```
 *
 * # 6. การกำหนดค่าที่กำหนดเอง
 * ```javascript
 * const customConfig = {
 *   chunkSize: 200,           // ชิ้นส่วนใหญ่ขึ้น (เหมาะสำหรับอุปกรณ์ประสิทธิภาพสูง)
 *   processingDelay: 10,      // ดีเลย์สั้นลง (ประมวลผลเร็วขึ้น)
 *   maxProcessingTime: 600,   // หมดเวลา 10 นาที
 *   memoryThreshold: 200      // เกณฑ์หน่วยความจำ 200MB
 * };
 *
 * const result = await window.contextMonitor.extractFromCurrentChatOptimized('myMessage', customConfig);
 * ```
 *
 * # การเปรียบเทียบประสิทธิภาพ:
 * - 🐌 วิธีเดิม: ไฟล์ 30MB อาจใช้เวลา 10-30 วินาที เสี่ยงทำให้เบราว์เซอร์ค้าง
 * - 🚀 วิธีปรับปรุง: ไฟล์ 30MB มักเสร็จใน 2-5 วินาที UI ยังคงตอบสนอง
 * - 📊 การใช้หน่วยความจำ: จากจุดสูงสุด 300MB+ ลดลงเหลือ 50-100MB ที่เสถียร
 * - ⚡ การตอบสนอง: การประมวลผลเป็นชิ้นส่วนทำให้ UI ไม่ถูกบล็อก
 *
 * # สถานการณ์การใช้งานที่แนะนำ:
 * - 📁 ขนาดไฟล์ > 10MB: ใช้ `smartExtract()`
 * - 💾 ขนาดไฟล์ > 30MB: ใช้ `extractFromCurrentChatOptimized()`
 * - 🔄 การประมวลผลแบบชุด: ใช้ `batchExtractOptimized()`
 * - 📈 ต้องการแสดงความคืบหน้า: ใช้ `extractWithProgress()`
 * - 🔍 ไม่แน่ใจขนาดไฟล์: รัน `analyzeFileComplexity()` ก่อน
 */

console.log(`
🚀 โหลดฟังก์ชันปรับปรุงไฟล์ขนาดใหญ่ของ Context Monitor แล้ว!

เริ่มต้นอย่างรวดเร็ว:
• การดึงข้อมูลอัจฉริยะ: window.contextMonitor.smartExtract('formatName')
• การวิเคราะห์ไฟล์: window.contextMonitor.analyzeFileComplexity()
• การดึงข้อมูลพร้อมความคืบหน้า: window.contextMonitor.extractWithProgress('formatName', callback)

ดูตัวอย่างเพิ่มเติมในเอกสารคอมเมนต์ของซอร์สโค้ด
`);
