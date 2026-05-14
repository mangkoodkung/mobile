// ==SillyTavern Forum Auto Listener==
// @name         Forum Auto Listener for Mobile Extension
// @version      1.0.1
// @description  ตัวฟังอัตโนมัติฟอรัม ฟังการเปลี่ยนแปลงแชทและทริกเกอร์การสร้างฟอรัมอัตโนมัติ
// @author       Assistant

/**
 * คลาสตัวฟังอัตโนมัติฟอรัม
 * ฟังการเปลี่ยนแปลงแชท เมื่อตรงตามเงื่อนไขจะสร้างเนื้อหาฟอรัมอัตโนมัติ
 *
 * คำอธิบายการตั้งค่า：
 * - checkIntervalMs: ช่วงเวลาตรวจสอบ（มิลลิวินาที ค่าเริ่มต้น 5000）
 * - debounceMs: เวลาหน่วง debounce（มิลลิวินาที ค่าเริ่มต้น 500）
 * - immediateOnThreshold: เมื่อถึงเกณฑ์จะดำเนินการทันทีหรือไม่（ค่าเริ่มต้น true）
 * - enabled: เปิดใช้งานการฟังหรือไม่（ค่าเริ่มต้น true）
 * - maxRetries: จำนวนครั้งสูงสุดในการลองใหม่（ค่าเริ่มต้น 3）
 * - autoStartWithUI: เริ่ม/หยุดอัตโนมัติตาม UI หรือไม่（ค่าเริ่มต้น true）
 */
class ForumAutoListener {
  constructor() {
    this.isListening = false;
    this.lastMessageCount = 0;
    this.lastCheckTime = Date.now();
    this.checkInterval = null; // เริ่มต้นเป็น null ไม่สร้าง timer อัตโนมัติ
    this.debounceTimer = null;
    this.isProcessingRequest = false; // เพิ่มใหม่: ล็อคการประมวลผลคำขอ
    this.lastProcessedMessageCount = 0; // เพิ่มใหม่: จำนวนข้อความที่ประมวลผลล่าสุด
    this.currentStatus = 'สแตนด์บาย'; // เพิ่มใหม่: สถานะปัจจุบัน
    this.statusElement = null; // เพิ่มใหม่: อิลิเมนต์แสดงสถานะ
    this.lastGenerationTime = null; // เพิ่มใหม่: เวลาสร้างล่าสุด
    this.generationCount = 0; // เพิ่มใหม่: สถิติจำนวนครั้งที่สร้าง
    this.uiObserver = null; // เพิ่มใหม่: ตัวสังเกตการณ์ UI
    this.settings = {
      enabled: true,
      checkIntervalMs: 5000, // ตรวจสอบทุก 5 วินาที
      debounceMs: 500, // debounce 0.5 วินาที（ลดจาก 2 วินาทีเป็น 0.5 วินาที）
      immediateOnThreshold: true, // เพิ่มใหม่: ดำเนินการทันทีเมื่อถึงเกณฑ์
      maxRetries: 3,
      autoStartWithUI: true, // เพิ่มใหม่: เริ่ม/หยุดอัตโนมัติตาม UI หรือไม่
    };

    // ผูกเมธอด
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.checkForChanges = this.checkForChanges.bind(this);
    this.safeDebounceAutoGenerate = this.safeDebounceAutoGenerate.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.initStatusDisplay = this.initStatusDisplay.bind(this);
    this.setupUIObserver = this.setupUIObserver.bind(this); // เพิ่มใหม่: ตั้งค่าตัวสังเกตการณ์ UI
    this.checkForumAppState = this.checkForumAppState.bind(this); // เพิ่มใหม่: ตรวจสอบสถานะแอปฟอรัม
  }

  /**
   * เริ่มฟัง
   */
  start() {
    if (this.isListening) {
      console.log('[Forum Auto Listener] กำลังฟังอยู่แล้ว');
      return;
    }

    try {
      console.log('[Forum Auto Listener] เริ่มฟังการเปลี่ยนแปลงแชท...');

      // เริ่มต้นการแสดงสถานะ
      this.initStatusDisplay();

      // อัปเดตสถานะ
      this.updateStatus('กำลังเริ่มต้น', 'info');

      // เริ่มต้นจำนวนข้อความปัจจุบัน
      this.initializeMessageCount();

      // ตั้งค่าการตรวจสอบตามเวลา
      this.checkInterval = setInterval(this.checkForChanges, this.settings.checkIntervalMs);

      // ฟังอีเวนต์ SillyTavern（ถ้ามี）
      this.setupEventListeners();

      this.isListening = true;
      this.updateStatus('กำลังฟัง', 'success');
      console.log('[Forum Auto Listener] ✅ เริ่มฟังแล้ว');
    } catch (error) {
      console.error('[Forum Auto Listener] เริ่มฟังล้มเหลว:', error);
      this.updateStatus('เริ่มต้นล้มเหลว', 'error');
    }
  }

  /**
   * หยุดฟัง
   */
  stop() {
    if (!this.isListening) {
      console.log('[Forum Auto Listener] ไม่ได้อยู่ในโหมดฟัง');
      return;
    }

    try {
      console.log('[Forum Auto Listener] หยุดฟัง...');
      this.updateStatus('กำลังหยุด', 'warning');

      // ล้าง timer
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      // ล้าง debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // ลบ event listener
      this.removeEventListeners();

      // รีเซ็ตสถานะ
      this.isProcessingRequest = false;

      this.isListening = false;
      this.updateStatus('หยุดแล้ว', 'offline');
      console.log('[Forum Auto Listener] ✅ หยุดฟังแล้ว');
    } catch (error) {
      console.error('[Forum Auto Listener] หยุดฟังล้มเหลว:', error);
      this.updateStatus('หยุดล้มเหลว', 'error');
    }
  }

  /**
   * เริ่มต้นจำนวนข้อความปัจจุบัน
   */
  async initializeMessageCount() {
    try {
      if (window.forumManager) {
        const chatData = await window.forumManager.getCurrentChatData();
        if (chatData && chatData.messages) {
          this.lastMessageCount = chatData.messages.length;
          // แก้ไข: ลบการเริ่มต้น lastProcessedMessageCount เพื่อหลีกเลี่ยงการรบกวนการตรวจจับข้อความ
          // this.lastProcessedMessageCount = chatData.messages.length;
          console.log(`[Forum Auto Listener] จำนวนข้อความเริ่มต้น: ${this.lastMessageCount}`);
        }
      } else {
        // แผนสำรอง: ดึงจาก SillyTavern โดยตรง
        const chatData = this.getCurrentChatDataDirect();
        if (chatData && chatData.messages) {
          this.lastMessageCount = chatData.messages.length;
          console.log(`[Forum Auto Listener] จำนวนข้อความเริ่มต้น(สำรอง): ${this.lastMessageCount}`);
        }
      }
    } catch (error) {
      console.warn('[Forum Auto Listener] เริ่มต้นจำนวนข้อความล้มเหลว:', error);
    }
  }

  /**
   * ตรวจสอบการเปลี่ยนแปลงแชท - ทริกเกอร์ผ่าน timer เท่านั้น
   */
  async checkForChanges() {
    // ถ้ายังไม่ได้เริ่มฟัง ให้ return ทันที
    if (!this.isListening || !this.settings.enabled) {
      return;
    }

    // ตรวจสอบว่า SillyTavern กำลังสร้างข้อความอยู่หรือไม่ ถ้าใช่ให้รอ
    if (this.isSillyTavernBusy()) {
      console.log('[Forum Auto Listener] SillyTavern กำลังสร้างข้อความ รอให้เสร็จ...');
      return;
    }

    // ถ้ากำลังประมวลผลคำขออยู่ ให้ข้ามการตรวจสอบครั้งนี้
    if (this.isProcessingRequest) {
      console.log('[Forum Auto Listener] กำลังประมวลผลคำขอ ข้ามการตรวจสอบครั้งนี้');
      return;
    }

    try {
      // ดึงข้อมูลแชทปัจจุบัน - ใช้แผนสำรอง
      let chatData = null;
      if (window.forumManager && window.forumManager.getCurrentChatData) {
        chatData = await window.forumManager.getCurrentChatData();
      } else {
        // แผนสำรอง: ดึงจาก SillyTavern โดยตรง
        chatData = this.getCurrentChatDataDirect();
      }

      if (!chatData || !chatData.messages) {
        return;
      }

      const currentMessageCount = chatData.messages.length;

      // ตรวจสอบว่าจำนวนข้อความเปลี่ยนแปลงหรือไม่（แก้ไข: ใช้ lastMessageCount แทน lastProcessedMessageCount）
      const messageIncrement = currentMessageCount - this.lastMessageCount;

      if (messageIncrement > 0) {
        console.log(
          `[Forum Auto Listener] ตรวจพบข้อความใหม่: +${messageIncrement} (${this.lastMessageCount} -> ${currentMessageCount})`,
        );

        // ดึงค่าเกณฑ์（ใช้จากตัวจัดการฟอรัมก่อน ไม่งั้นใช้ค่าเริ่มต้น）
        const threshold =
          window.forumManager && window.forumManager.currentSettings
            ? window.forumManager.currentSettings.threshold
            : 1; // ค่าเกณฑ์เริ่มต้นคือ 1

        console.log(`[Forum Auto Listener] เกณฑ์ปัจจุบัน: ${threshold}`);

        // อัปเดตตัวนับ（แก้ไข: อัปเดต lastMessageCount ทันที）
        this.lastMessageCount = currentMessageCount;
        this.lastCheckTime = Date.now();

        // ตรวจสอบว่าถึงเกณฑ์หรือไม่
        if (messageIncrement >= threshold) {
          console.log(`[Forum Auto Listener] ถึงเกณฑ์แล้ว ทริกเกอร์การสร้างอัตโนมัติทันที`);
          this.updateStatus(`กำลังสร้าง (เกณฑ์:${threshold})`, 'processing');

          // ดีบัก: ตรวจสอบสถานะ forumManager
          console.log(`[Forum Auto Listener] ดีบัก - forumManager มีอยู่: ${!!window.forumManager}`);
          console.log(
            `[Forum Auto Listener] ดีบัก - checkAutoGenerate มีอยู่: ${!!(
              window.forumManager && window.forumManager.checkAutoGenerate
            )}`,
          );
          console.log(`[Forum Auto Listener] ดีบัก - isProcessingRequest: ${this.isProcessingRequest}`);

          // แจ้งตัวจัดการฟอรัมให้ตรวจสอบว่าต้องสร้างอัตโนมัติหรือไม่
          if (window.forumManager && window.forumManager.checkAutoGenerate) {
            console.log(`[Forum Auto Listener] เริ่มเรียก safeDebounceAutoGenerate(true)`);
            try {
              // เมื่อถึงเกณฑ์ให้ดำเนินการทันที ไม่ใช้ debounce
              this.safeDebounceAutoGenerate(true);
              console.log(`[Forum Auto Listener] เรียก safeDebounceAutoGenerate เสร็จแล้ว`);
            } catch (error) {
              console.error(`[Forum Auto Listener] เรียก safeDebounceAutoGenerate ล้มเหลว:`, error);
              this.updateStatus('สร้างล้มเหลว', 'error');
            }
          } else {
            console.warn(
              `[Forum Auto Listener] ไม่สามารถเรียกการสร้างอัตโนมัติ - forumManager: ${!!window.forumManager}, checkAutoGenerate: ${!!(
                window.forumManager && window.forumManager.checkAutoGenerate
              )}`,
            );
            this.updateStatus('ตัวจัดการฟอรัมไม่พร้อมใช้งาน', 'warning');
          }
        } else {
          console.log(`[Forum Auto Listener] ส่วนเพิ่ม ${messageIncrement} ยังไม่ถึงเกณฑ์ ${threshold}`);
          this.updateStatus(`กำลังฟัง (${messageIncrement}/${threshold})`, 'info');
        }
      } else if (messageIncrement === 0) {
        // ไม่มีข้อความใหม่
        if (window.DEBUG_FORUM_AUTO_LISTENER) {
          console.log(`[Forum Auto Listener] ไม่มีข้อความใหม่ (ปัจจุบัน: ${currentMessageCount})`);
        }
      }
    } catch (error) {
      console.error('[Forum Auto Listener] ตรวจสอบการเปลี่ยนแปลงล้มเหลว:', error);
    }
  }

  /**
   * การสร้างอัตโนมัติแบบ debounce ที่ปลอดภัย - มีล็อคคำขอ
   * @param {boolean} immediate - ดำเนินการทันทีหรือไม่ ไม่ใช้ debounce
   */
  safeDebounceAutoGenerate(immediate = false) {
    // ถ้ากำลังประมวลผลคำขอ ให้ข้าม
    if (this.isProcessingRequest) {
      console.log('[Forum Auto Listener] กำลังประมวลผลคำขอ ข้ามทริกเกอร์ใหม่');
      return;
    }

    // ถ้าตั้งค่าให้ดำเนินการทันที ให้ดำเนินการเลย
    if (immediate || this.settings.immediateOnThreshold) {
      console.log('[Forum Auto Listener] ดำเนินการตรวจสอบการสร้างอัตโนมัติทันที...');
      this.executeAutoGenerate();
      return;
    }

    // ล้าง timer ก่อนหน้า
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // ตั้ง timer ใหม่
    this.debounceTimer = setTimeout(async () => {
      this.executeAutoGenerate();
    }, this.settings.debounceMs);
  }

  /**
   * ลอจิกหลักของการดำเนินการสร้างอัตโนมัติ
   */
  async executeAutoGenerate() {
    if (this.isProcessingRequest) {
      console.log('[Forum Auto Listener] คำขอกำลังประมวลผลอยู่ ข้าม');
      return;
    }

    console.log('[Forum Auto Listener] ทริกเกอร์การตรวจสอบการสร้างอัตโนมัติ...');

    try {
      // พยายามเริ่มต้นตัวจัดการฟอรัม（ถ้าไม่มี）
      if (!window.forumManager) {
        console.log('[Forum Auto Listener] ตัวจัดการฟอรัมไม่มีอยู่ พยายามเริ่มต้น...');
        this.updateStatus('กำลังเริ่มต้นตัวจัดการฟอรัม', 'processing');
        await this.initializeForumManager();
      }

      // ตรวจสอบสถานะตัวจัดการฟอรัม
      if (window.forumManager && window.forumManager.isProcessing) {
        console.log('[Forum Auto Listener] ตัวจัดการฟอรัมกำลังประมวลผล ข้าม');
        this.updateStatus('รอตัวจัดการฟอรัม', 'waiting');
        return;
      }

      // ตั้งค่าสถานะการประมวลผล - ตั้งก่อนเรียกตัวจัดการฟอรัม
      this.isProcessingRequest = true;

      // ดำเนินการสร้างอัตโนมัติ - ล้างสถานะการประมวลผลทั้งหมดเพื่อหลีกเลี่ยงความขัดแย้ง
      if (window.forumManager && window.forumManager.checkAutoGenerate) {
        console.log('[Forum Auto Listener] เรียก checkAutoGenerate ของตัวจัดการฟอรัม...');
        this.updateStatus('กำลังเรียกตัวจัดการฟอรัม', 'processing');

        // ล้างสถานะทั้งหมดที่อาจทำให้เกิดความขัดแย้งชั่วคราว
        const originalProcessingState = this.isProcessingRequest;
        this.isProcessingRequest = false;

        // ตั้งค่าแฟล็กบอกตัวจัดการฟอรัมว่านี่คือการเรียกที่ถูกต้อง
        window.forumAutoListener._allowForumManagerCall = true;

        try {
          await window.forumManager.checkAutoGenerate();
          console.log('[Forum Auto Listener] เรียกตัวจัดการฟอรัมเสร็จแล้ว');
          this.generationCount++;
          this.lastGenerationTime = new Date();
          this.updateStatus(`สร้างเสร็จ (#${this.generationCount})`, 'success');
        } finally {
          // กู้คืนสถานะ
          this.isProcessingRequest = originalProcessingState;
          delete window.forumAutoListener._allowForumManagerCall;
        }
      } else {
        // ถ้าตัวจัดการฟอรัมยังไม่พร้อมใช้งาน พยายามสร้างโดยตรง
        console.log('[Forum Auto Listener] ตัวจัดการฟอรัมไม่พร้อมใช้งาน พยายามสร้างเนื้อหาฟอรัมโดยตรง...');
        this.updateStatus('สร้างเนื้อหาฟอรัมโดยตรง', 'processing');
        await this.directForumGenerate();
        this.generationCount++;
        this.lastGenerationTime = new Date();
        this.updateStatus(`สร้างโดยตรงเสร็จ (#${this.generationCount})`, 'success');
      }

      // อัปเดตจำนวนข้อความที่ประมวลผลแล้ว
      // แก้ไข: ลบบรรทัดนี้เพราะจะทำให้ตัวฟังทำงานได้แค่ครั้งเดียว
      // this.lastProcessedMessageCount = this.lastMessageCount;
      console.log(`[Forum Auto Listener] สร้างเสร็จ ฟังข้อความใหม่ต่อ`);

      // กู้คืนสถานะการฟัง
      setTimeout(() => {
        if (this.isListening) {
          this.updateStatus('กำลังฟัง', 'success');
        }
      }, 2000);
    } catch (error) {
      console.error('[Forum Auto Listener] ตรวจสอบการสร้างอัตโนมัติล้มเหลว:', error);
      this.updateStatus('ตรวจสอบการสร้างล้มเหลว', 'error');
    } finally {
      this.isProcessingRequest = false;
    }
  }

  /**
   * เริ่มต้นตัวจัดการฟอรัม
   */
  async initializeForumManager() {
    try {
      console.log('[Forum Auto Listener] พยายามโหลดตัวจัดการฟอรัม...');

      // พยายามโหลดสคริปต์ที่เกี่ยวข้องกับฟอรัม
      const forumScripts = [
        '/scripts/extensions/third-party/mobile/app/forum-app/forum-manager.js',
        '/scripts/extensions/third-party/mobile/app/forum-app/forum-app.js',
      ];

      for (const scriptPath of forumScripts) {
        if (!document.querySelector(`script[src*="${scriptPath}"]`)) {
          console.log(`[Forum Auto Listener] โหลดสคริปต์: ${scriptPath}`);
          await this.loadScript(scriptPath);
        }
      }

      // รอสักครู่ให้สคริปต์เริ่มต้น
      await new Promise(resolve => setTimeout(resolve, 1000));

      // พยายามสร้างอินสแตนซ์ตัวจัดการฟอรัม
      if (window.ForumManager && !window.forumManager) {
        console.log('[Forum Auto Listener] สร้างอินสแตนซ์ตัวจัดการฟอรัม...');
        window.forumManager = new window.ForumManager();
        if (window.forumManager.initialize) {
          await window.forumManager.initialize();
        }
      }

      if (window.forumManager) {
        console.log('[Forum Auto Listener] ✅ เริ่มต้นตัวจัดการฟอรัมสำเร็จ');
      } else {
        console.warn('[Forum Auto Listener] ⚠️ เริ่มต้นตัวจัดการฟอรัมล้มเหลว');
      }
    } catch (error) {
      console.error('[Forum Auto Listener] เริ่มต้นตัวจัดการฟอรัมล้มเหลว:', error);
    }
  }

  /**
   * โหลดไฟล์สคริปต์
   */
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * สร้างเนื้อหาฟอรัมโดยตรง（เมื่อตัวจัดการฟอรัมไม่พร้อมใช้งาน）
   */
  async directForumGenerate() {
    try {
      console.log('[Forum Auto Listener] สร้างเนื้อหาฟอรัมโดยตรง...');

      // ดึงข้อมูลแชทปัจจุบัน
      const context = window.getContext ? window.getContext() : null;
      if (!context || !context.chat) {
        console.warn('[Forum Auto Listener] ไม่สามารถดึงบริบทแชทได้');
        return;
      }

      // สร้าง prompt สำหรับการสร้างฟอรัม
      const forumPrompt = this.buildForumPrompt(context.chat);

      // ใช้การสร้างแบบเงียบ
      if (window.generateQuietPrompt) {
        console.log('[Forum Auto Listener] ใช้ generateQuietPrompt สร้างเนื้อหาฟอรัม...');
        const forumContent = await window.generateQuietPrompt(forumPrompt, false, false);

        if (forumContent) {
          console.log('[Forum Auto Listener] ✅ สร้างเนื้อหาฟอรัมสำเร็จ');
          // สามารถเพิ่มลอจิกบันทึกหรือแสดงเนื้อหาฟอรัมที่นี่
          this.displayForumContent(forumContent);
        } else {
          console.warn('[Forum Auto Listener] เนื้อหาฟอรัมที่สร้างว่างเปล่า');
        }
      } else {
        console.warn('[Forum Auto Listener] generateQuietPrompt ไม่พร้อมใช้งาน');
      }
    } catch (error) {
      console.error('[Forum Auto Listener] สร้างเนื้อหาฟอรัมโดยตรงล้มเหลว:', error);
    }
  }

  /**
   * สร้าง prompt สำหรับการสร้างฟอรัม
   */
  buildForumPrompt(chatMessages) {
    const recentMessages = chatMessages.slice(-10); // ดึง 10 ข้อความล่าสุด

    let prompt = 'จากเนื้อหาแชทต่อไปนี้ สร้างโพสต์สนทนาในฟอรัม กรุณาระบุประเด็นหลักและจุดสนทนาสำคัญ：\n\n';

    recentMessages.forEach((msg, index) => {
      if (!msg.is_system) {
        prompt += `${msg.name || 'ผู้ใช้'}: ${msg.mes}\n`;
      }
    });

    prompt += '\nกรุณาสร้างเนื้อหาสนทนาฟอรัม：';

    return prompt;
  }

  /**
   * แสดงเนื้อหาฟอรัม
   */
  displayForumContent(content) {
    try {
      // พยายามแสดงเนื้อหาในแชทหรือแจ้งผู้ใช้
      console.log('[Forum Auto Listener] สร้างเนื้อหาฟอรัมแล้ว:', content);

      // สามารถเพิ่มในแชทเป็นข้อความระบบ
      if (window.sendSystemMessage) {
        window.sendSystemMessage('GENERIC', `🏛️ สร้างเนื้อหาฟอรัมแล้ว：\n\n${content}`);
      } else {
        // หรือแสดงการแจ้งเตือน
        if (window.toastr) {
          window.toastr.success('สร้างเนื้อหาฟอรัมอัตโนมัติแล้ว', 'ตัวฟังฟอรัม');
        }
      }
    } catch (error) {
      console.error('[Forum Auto Listener] แสดงเนื้อหาฟอรัมล้มเหลว:', error);
    }
  }

  /**
   * ตรวจสอบว่า SillyTavern กำลังยุ่งหรือไม่（กำลังสร้างข้อความ）
   */
  isSillyTavernBusy() {
    try {
      // ตรวจสอบว่ากำลังส่งข้อความหรือไม่
      if (typeof window.is_send_press !== 'undefined' && window.is_send_press) {
        return true;
      }

      // ตรวจสอบว่ากำลังสร้างข้อความหรือไม่
      if (typeof window.is_generating !== 'undefined' && window.is_generating) {
        return true;
      }

      // ตรวจสอบสถานะ streaming processor
      if (window.streamingProcessor && !window.streamingProcessor.isFinished) {
        return true;
      }

      // ตรวจสอบสถานะการสร้างกลุ่ม
      if (typeof window.is_group_generating !== 'undefined' && window.is_group_generating) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('[Forum Auto Listener] ตรวจสอบสถานะ SillyTavern ล้มเหลว:', error);
      return false; // ถ้าตรวจสอบล้มเหลว สมมติว่าไม่ยุ่ง
    }
  }

  /**
   * ดึงข้อมูลแชทจาก SillyTavern โดยตรง
   */
  getCurrentChatDataDirect() {
    try {
      // พยายามดึงจากตัวแปร chat ทั่วไป
      if (typeof window.chat !== 'undefined' && Array.isArray(window.chat)) {
        return {
          messages: window.chat,
          characterName: window.name2 || 'ตัวละคร',
          chatId: window.getCurrentChatId ? window.getCurrentChatId() : 'unknown',
        };
      }

      // พยายามดึงจาก context
      if (window.getContext) {
        const context = window.getContext();
        if (context && context.chat) {
          return {
            messages: context.chat,
            characterName: context.name2 || 'ตัวละคร',
            chatId: context.chatId || 'unknown',
          };
        }
      }

      console.warn('[Forum Auto Listener] ไม่สามารถดึงข้อมูลแชทโดยตรงได้');
      return null;
    } catch (error) {
      console.error('[Forum Auto Listener] ดึงข้อมูลแชทโดยตรงล้มเหลว:', error);
      return null;
    }
  }

  /**
   * การสร้างอัตโนมัติแบบ debounce - รักษาความเข้ากันได้ย้อนหลัง
   */
  debounceAutoGenerate() {
    this.safeDebounceAutoGenerate();
  }

  /**
   * ทริกเกอร์การสร้างฟอรัมด้วยตนเอง（ไม่มีความขัดแย้งของสถานะ）
   */
  async manualTrigger() {
    console.log('[Forum Auto Listener] ทริกเกอร์การสร้างฟอรัมด้วยตนเอง...');
    this.updateStatus('ทริกเกอร์การสร้างด้วยตนเอง', 'processing');

    try {
      // พยายามเริ่มต้นตัวจัดการฟอรัม（ถ้าไม่มี）
      if (!window.forumManager) {
        console.log('[Forum Auto Listener] ตัวจัดการฟอรัมไม่มีอยู่ พยายามเริ่มต้น...');
        this.updateStatus('กำลังเริ่มต้นตัวจัดการฟอรัม', 'processing');
        await this.initializeForumManager();
      }

      // เรียกตัวจัดการฟอรัมโดยตรง ล้างสถานะเพื่อหลีกเลี่ยงความขัดแย้ง
      if (window.forumManager && window.forumManager.checkAutoGenerate) {
        console.log('[Forum Auto Listener] เรียกตัวจัดการฟอรัมโดยตรง...');
        this.updateStatus('กำลังเรียกตัวจัดการฟอรัม', 'processing');

        // ตั้งค่าแฟล็กบอกตัวจัดการฟอรัมว่านี่คือการเรียกด้วยตนเองที่ถูกต้อง
        window.forumAutoListener._allowForumManagerCall = true;

        try {
          await window.forumManager.checkAutoGenerate();
          console.log('[Forum Auto Listener] ✅ เรียกตัวจัดการฟอรัมเสร็จแล้ว');
          this.generationCount++;
          this.lastGenerationTime = new Date();
          this.updateStatus(`สร้างด้วยตนเองเสร็จ (#${this.generationCount})`, 'success');
        } finally {
          delete window.forumAutoListener._allowForumManagerCall;
        }
      } else if (window.forumManager && window.forumManager.manualGenerate) {
        console.log('[Forum Auto Listener] เรียกเมธอดสร้างด้วยตนเอง...');
        this.updateStatus('เรียกการสร้างด้วยตนเอง', 'processing');

        // ตั้งค่าแฟล็ก
        window.forumAutoListener._allowForumManagerCall = true;

        try {
          await window.forumManager.manualGenerate();
          console.log('[Forum Auto Listener] ✅ สร้างด้วยตนเองเสร็จ');
          this.generationCount++;
          this.lastGenerationTime = new Date();
          this.updateStatus(`สร้างด้วยตนเองเสร็จ (#${this.generationCount})`, 'success');
        } finally {
          delete window.forumAutoListener._allowForumManagerCall;
        }
      } else {
        // ถ้าตัวจัดการฟอรัมไม่พร้อมใช้งาน พยายามสร้างโดยตรง
        console.log('[Forum Auto Listener] ตัวจัดการฟอรัมไม่พร้อมใช้งาน พยายามสร้างเนื้อหาฟอรัมโดยตรง...');
        this.updateStatus('สร้างเนื้อหาฟอรัมโดยตรง', 'processing');
        await this.directForumGenerate();
        this.generationCount++;
        this.lastGenerationTime = new Date();
        this.updateStatus(`สร้างโดยตรงเสร็จ (#${this.generationCount})`, 'success');
      }

      // กู้คืนสถานะการฟัง
      setTimeout(() => {
        if (this.isListening) {
          this.updateStatus('กำลังฟัง', 'success');
        }
      }, 2000);
    } catch (error) {
      console.error('[Forum Auto Listener] ทริกเกอร์ด้วยตนเองล้มเหลว:', error);
      this.updateStatus('ทริกเกอร์ด้วยตนเองล้มเหลว', 'error');
    }
  }

  /**
   * ตั้งค่า event listener
   */
  setupEventListeners() {
    try {
      // ฟังอีเวนต์ข้อความของ SillyTavern（ถ้ามี）
      if (window.eventSource && window.event_types) {
        // ฟังอีเวนต์รับข้อความ
        if (window.event_types.MESSAGE_RECEIVED) {
          this.messageReceivedHandler = this.onMessageReceived.bind(this);
          window.eventSource.on(window.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
        }

        // ฟังอีเวนต์ส่งข้อความ
        if (window.event_types.MESSAGE_SENT) {
          this.messageSentHandler = this.onMessageSent.bind(this);
          window.eventSource.on(window.event_types.MESSAGE_SENT, this.messageSentHandler);
        }

        console.log('[Forum Auto Listener] ตั้งค่า event listener ของ SillyTavern แล้ว');
      } else {
        console.log('[Forum Auto Listener] ระบบอีเวนต์ SillyTavern ไม่พร้อมใช้งาน ใช้เฉพาะ timer ตรวจสอบ');
      }

      // ไม่ตั้งค่า DOM observer อีกต่อไป เพื่อหลีกเลี่ยงการทริกเกอร์ซ้ำ
      // this.setupDOMObserver();
    } catch (error) {
      console.warn('[Forum Auto Listener] ตั้งค่า event listener ล้มเหลว:', error);
    }
  }

  /**
   * ลบ event listener
   */
  removeEventListeners() {
    try {
      // ลบ event listener ของ SillyTavern
      if (window.eventSource) {
        if (this.messageReceivedHandler) {
          window.eventSource.off(window.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
        }
        if (this.messageSentHandler) {
          window.eventSource.off(window.event_types.MESSAGE_SENT, this.messageSentHandler);
        }
      }

      // ลบ DOM observer
      if (this.domObserver) {
        this.domObserver.disconnect();
        this.domObserver = null;
      }

      console.log('[Forum Auto Listener] ลบ event listener แล้ว');
    } catch (error) {
      console.warn('[Forum Auto Listener] ลบ event listener ล้มเหลว:', error);
    }
  }

  /**
   * การจัดการอีเวนต์รับข้อความ - แก้ไข: ไม่เพิ่มตัวนับโดยตรงอีกต่อไป
   */
  onMessageReceived(data) {
    console.log('[Forum Auto Listener] ได้รับอีเวนต์ข้อความ:', data);
    // ไม่เพิ่มตัวนับโดยตรงอีกต่อไป ให้ timer ตรวจสอบจัดการ
    // this.lastMessageCount++;
    // ทริกเกอร์การตรวจสอบ แต่ไม่เพิ่มตัวนับทันที
    this.safeDebounceAutoGenerate();
  }

  /**
   * การจัดการอีเวนต์ส่งข้อความ - แก้ไข: ไม่เพิ่มตัวนับโดยตรงอีกต่อไป
   */
  onMessageSent(data) {
    console.log('[Forum Auto Listener] อีเวนต์ส่งข้อความ:', data);
    // ไม่เพิ่มตัวนับโดยตรงอีกต่อไป ให้ timer ตรวจสอบจัดการ
    // this.lastMessageCount++;
    // ทริกเกอร์การตรวจสอบ แต่ไม่เพิ่มตัวนับทันที
    this.safeDebounceAutoGenerate();
  }

  /**
   * ตั้งค่า DOM observer（ปิดใช้งานชั่วคราว เพื่อหลีกเลี่ยงการทริกเกอร์ซ้ำ）
   */
  setupDOMObserver() {
    // ปิดใช้งาน DOM observer ชั่วคราวเพื่อหลีกเลี่ยงการทริกเกอร์ซ้ำ
    console.log('[Forum Auto Listener] ปิดใช้งาน DOM observer เพื่อหลีกเลี่ยงการทริกเกอร์ซ้ำ');
    return;

    try {
      // สังเกตการเปลี่ยนแปลงของคอนเทนเนอร์แชท
      const chatContainer =
        document.querySelector('#chat') ||
        document.querySelector('.chat-container') ||
        document.querySelector('[data-testid="chat"]');

      if (chatContainer) {
        this.domObserver = new MutationObserver(mutations => {
          let hasNewMessage = false;

          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // ตรวจสอบว่ามีโหนดข้อความใหม่หรือไม่
              mutation.addedNodes.forEach(node => {
                if (
                  node.nodeType === Node.ELEMENT_NODE &&
                  (node.classList.contains('message') ||
                    node.querySelector('.message') ||
                    node.classList.contains('mes'))
                ) {
                  hasNewMessage = true;
                }
              });
            }
          });

          if (hasNewMessage) {
            console.log('[Forum Auto Listener] DOM ตรวจพบข้อความใหม่');
            this.safeDebounceAutoGenerate();
          }
        });

        this.domObserver.observe(chatContainer, {
          childList: true,
          subtree: true,
        });

        console.log('[Forum Auto Listener] ตั้งค่า DOM observer แล้ว');
      } else {
        console.warn('[Forum Auto Listener] ไม่พบคอนเทนเนอร์แชท ไม่สามารถตั้งค่า DOM observer');
      }
    } catch (error) {
      console.warn('[Forum Auto Listener] ตั้งค่า DOM observer ล้มเหลว:', error);
    }
  }

  /**
   * ตั้งค่าตัวสังเกตการณ์ UI - ฟังการแสดงและซ่อนของ UI ฟอรัม
   */
  setupUIObserver() {
    if (!this.settings.autoStartWithUI) {
      console.log('[Forum Auto Listener] การเริ่ม/หยุดอัตโนมัติตาม UI ถูกปิดใช้งาน');
      return;
    }

    try {
      console.log('[Forum Auto Listener] ตั้งค่าตัวสังเกตการณ์ UI...');

      // ไม่ตรวจสอบสถานะปัจจุบันเริ่มต้นอีกต่อไป เริ่มเฉพาะเมื่อคลิกปุ่ม

      // ลบ event listener เก่า
      document.removeEventListener('click', this._clickHandler);

      // สร้างฟังก์ชันจัดการอีเวนต์คลิกใหม่
      this._clickHandler = event => {
        // ตรวจสอบว่าคลิกปุ่มแอปฟอรัมหรือไม่
        const forumAppButton = event.target.closest('[data-app="forum"]');
        if (forumAppButton) {
          console.log('[Forum Auto Listener] ตรวจพบการคลิกปุ่มแอปฟอรัม');
          // ให้ DOM เวลาโหลดก่อนเริ่มฟัง
          setTimeout(() => {
            if (!this.isListening) {
              console.log('[Forum Auto Listener] เริ่มฟัง');
              this.start();
            }
          }, 300);
        }

        // ตรวจสอบว่าคลิกปุ่มย้อนกลับหรือปิด UI มือถือหรือไม่
        const backButton = event.target.closest('.back-button');
        const closeButton = event.target.closest(
          '.mobile-phone-overlay, .close-button, .drawer-close, [data-action="close"]',
        );
        if (backButton || closeButton) {
          console.log('[Forum Auto Listener] ตรวจพบการคลิกปุ่มย้อนกลับหรือปุ่มปิด');
          // หยุดฟัง
          if (this.isListening) {
            console.log('[Forum Auto Listener] หยุดฟัง');
            this.stop();
          }
        }
      };

      // เพิ่ม event listener คลิก
      document.addEventListener('click', this._clickHandler);

      console.log('[Forum Auto Listener] ตั้งค่าตัวสังเกตการณ์ UI แล้ว - เริ่มเฉพาะเมื่อคลิกปุ่มฟอรัม');

      // ไม่ใช้ MutationObserver ตรวจสอบสถานะต่อเนื่องอีกต่อไป
      if (this.uiObserver) {
        this.uiObserver.disconnect();
        this.uiObserver = null;
      }
    } catch (error) {
      console.error('[Forum Auto Listener] ตั้งค่าตัวสังเกตการณ์ UI ล้มเหลว:', error);
    }
  }

  /**
   * ตรวจสอบสถานะแอปฟอรัม - ตรวจสอบว่า UI ฟอรัมแสดงอยู่หรือไม่
   */
  checkForumAppState() {
    // ไม่ตรวจสอบสถานะเชิงรุกอีกต่อไป เปลี่ยนเป็นตอบสนองเฉพาะอีเวนต์คลิก
    console.log('[Forum Auto Listener] การตรวจสอบสถานะเปลี่ยนเป็นตอบสนองเฉพาะอีเวนต์คลิก');
  }

  /**
   * ตั้งค่าว่าจะเริ่ม/หยุดอัตโนมัติตาม UI หรือไม่
   * @param {boolean} enabled - เปิดใช้งานหรือไม่
   */
  setAutoStartWithUI(enabled) {
    this.settings.autoStartWithUI = enabled;
    console.log(`[Forum Auto Listener] อัปเดตการตั้งค่าเริ่ม/หยุดอัตโนมัติตาม UI: ${enabled}`);

    if (enabled) {
      this.setupUIObserver();
      // ตรวจสอบสถานะปัจจุบันทันที
      this.checkForumAppState();
    } else if (this.uiObserver) {
      // ถ้าปิดใช้งาน ให้ตัดการเชื่อมต่อ observer
      this.uiObserver.disconnect();
      this.uiObserver = null;
    }
  }

  /**
   * อัปเดตการตั้งค่า
   */
  updateSettings(newSettings) {
    const oldAutoStartWithUI = this.settings.autoStartWithUI;

    this.settings = { ...this.settings, ...newSettings };

    // ถ้าอัปเดตช่วงเวลาตรวจสอบ ให้รีสตาร์ท timer
    if (newSettings.checkIntervalMs && this.isListening) {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      this.checkInterval = setInterval(this.checkForChanges, this.settings.checkIntervalMs);
    }

    // ถ้าอัปเดตการตั้งค่าเริ่ม/หยุดอัตโนมัติ
    if (newSettings.autoStartWithUI !== undefined && newSettings.autoStartWithUI !== oldAutoStartWithUI) {
      this.setAutoStartWithUI(newSettings.autoStartWithUI);
    }
  }

  /**
   * ตั้งค่าว่าจะดำเนินการทันทีหรือไม่（เมื่อถึงเกณฑ์）
   * @param {boolean} immediate - ดำเนินการทันทีหรือไม่
   */
  setImmediateOnThreshold(immediate) {
    this.settings.immediateOnThreshold = immediate;
    console.log(`[Forum Auto Listener] อัปเดตการตั้งค่าดำเนินการทันที: ${immediate}`);
  }

  /**
   * ตั้งค่าเวลาหน่วง debounce
   * @param {number} delayMs - เวลาหน่วง（มิลลิวินาที）
   */
  setDebounceDelay(delayMs) {
    this.settings.debounceMs = delayMs;
    console.log(`[Forum Auto Listener] อัปเดตเวลาหน่วง debounce: ${delayMs}ms`);
  }

  /**
   * ดึงสถานะ
   */
  getStatus() {
    return {
      isListening: this.isListening,
      isProcessingRequest: this.isProcessingRequest,
      lastMessageCount: this.lastMessageCount,
      lastProcessedMessageCount: this.lastProcessedMessageCount,
      lastCheckTime: this.lastCheckTime,
      settings: this.settings,
    };
  }

  /**
   * ดึงข้อมูลดีบัก
   */
  getDebugInfo() {
    return {
      ...this.getStatus(),
      hasCheckInterval: !!this.checkInterval,
      hasDebounceTimer: !!this.debounceTimer,
      hasMessageReceivedHandler: !!this.messageReceivedHandler,
      hasMessageSentHandler: !!this.messageSentHandler,
      hasDOMObserver: !!this.domObserver,
      timeSinceLastCheck: Date.now() - this.lastCheckTime,
    };
  }

  /**
   * บังคับตรวจสอบ
   */
  async forceCheck() {
    console.log('[Forum Auto Listener] บังคับตรวจสอบ...');
    await this.checkForChanges();
  }

  /**
   * รีเซ็ตสถานะ
   */
  reset() {
    this.lastMessageCount = 0;
    this.lastProcessedMessageCount = 0;
    this.lastCheckTime = Date.now();
    this.isProcessingRequest = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    console.log('[Forum Auto Listener] รีเซ็ตสถานะแล้ว');
  }

  /**
   * ตรวจสอบให้แน่ใจว่าตัวฟังทำงานต่อเนื่อง - กลไกกู้คืนสถานะ
   */
  ensureContinuousListening() {
    // ไม่เริ่มตัวฟังอัตโนมัติอีกต่อไป แก้ไขเฉพาะปัญหาสถานะที่อาจเกิดขึ้น

    // ถ้าสถานะการประมวลผลค้าง ให้รีเซ็ต
    if (this.isProcessingRequest) {
      const now = Date.now();
      const timeSinceLastCheck = now - this.lastCheckTime;

      // ถ้าเกิน 30 วินาทียังอยู่ในสถานะประมวลผล ถือว่าค้าง
      if (timeSinceLastCheck > 30000) {
        console.warn('[Forum Auto Listener] ตรวจพบสถานะการประมวลผลค้าง รีเซ็ตสถานะ...');
        this.isProcessingRequest = false;
        this.lastCheckTime = now;
      }
    }

    // ตรวจสอบว่า timer ยังทำงานอยู่หรือไม่（ถ้าตัวฟังเริ่มแล้ว）
    if (this.isListening && !this.checkInterval) {
      console.warn('[Forum Auto Listener] ตรวจพบ timer หายไป ตั้งค่าใหม่...');
      this.checkInterval = setInterval(this.checkForChanges, this.settings.checkIntervalMs);
    }
  }

  /**
   * ตรวจสอบว่าอนุญาตให้เรียกตัวจัดการฟอรัมหรือไม่ - สำหรับตัวจัดการฟอรัมใช้
   * @returns {boolean} อนุญาตให้เรียกหรือไม่
   */
  isForumManagerCallAllowed() {
    // ตรวจสอบว่ามีแฟล็กการเรียกที่ถูกต้องหรือไม่
    if (window.forumAutoListener && window.forumAutoListener._allowForumManagerCall) {
      return true;
    }

    // ถ้าตัวฟังไม่ได้อยู่ในการประมวลผล ก็อนุญาตให้เรียก
    return !this.isProcessingRequest;
  }

  /**
   * wrapper การเรียกที่ปลอดภัยสำหรับตัวจัดการฟอรัม
   */
  async safeForumManagerCall(callback) {
    if (!callback || typeof callback !== 'function') {
      throw new Error('ต้องมีฟังก์ชัน callback');
    }

    // ตั้งค่าแฟล็กการเรียกที่ถูกต้อง
    window.forumAutoListener._allowForumManagerCall = true;

    // ล้างสถานะการประมวลผลชั่วคราว
    const originalState = this.isProcessingRequest;
    this.isProcessingRequest = false;

    try {
      console.log('[Forum Auto Listener] ดำเนินการเรียกตัวจัดการฟอรัมอย่างปลอดภัย...');
      const result = await callback();
      console.log('[Forum Auto Listener] การเรียกอย่างปลอดภัยเสร็จแล้ว');
      return result;
    } finally {
      // กู้คืนสถานะ
      this.isProcessingRequest = originalState;
      delete window.forumAutoListener._allowForumManagerCall;
    }
  }

  /**
   * เริ่มต้นการแสดงสถานะ
   */
  initStatusDisplay() {
    try {
      // พยายามค้นหาคอนเทนเนอร์สถานะที่มีอยู่
      let statusContainer = document.getElementById('forum-auto-listener-status');

      if (!statusContainer) {
        // สร้างคอนเทนเนอร์แสดงสถานะ
        statusContainer = document.createElement('div');
        statusContainer.id = 'forum-auto-listener-status';
        statusContainer.className = 'forum-status-container';

        // สร้างเนื้อหาสถานะ
        statusContainer.innerHTML = `
                    <div class="forum-status-header">
                        <span class="forum-status-icon">🤖</span>
                        <span class="forum-status-title">ตัวฟังอัตโนมัติฟอรัม</span>
                    </div>
                    <div class="forum-status-content">
                        <div class="forum-status-line">
                            <span class="forum-status-label">สถานะ:</span>
                            <span class="forum-status-value" id="forum-listener-status">กำลังเริ่มต้น</span>
                            <span class="forum-status-indicator" id="forum-listener-indicator"></span>
                        </div>
                        <div class="forum-status-line">
                            <span class="forum-status-label">จำนวนครั้งที่สร้าง:</span>
                            <span class="forum-status-value" id="forum-listener-count">0</span>
                        </div>
                        <div class="forum-status-line">
                            <span class="forum-status-label">สร้างล่าสุด:</span>
                            <span class="forum-status-value" id="forum-listener-time">ไม่เคย</span>
                        </div>
                    </div>
                `;

        // เพิ่มสไตล์
        const style = document.createElement('style');
        style.textContent = `
                    .forum-status-container {
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 8px;
                        padding: 12px;
                        margin: 8px;
                        color: #e2e8f0;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 12px;
                        max-width: 300px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);display: none !important;
                    }
                    .forum-status-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 8px;
                        font-weight: bold;
                        border-bottom: 1px solid #4a5568;
                        padding-bottom: 6px;
                    }
                    .forum-status-icon {
                        margin-right: 6px;
                        font-size: 14px;
                    }
                    .forum-status-title {
                        color: #63b3ed;
                    }
                    .forum-status-line {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin: 4px 0;
                    }
                    .forum-status-label {
                        color: #a0aec0;
                        flex-shrink: 0;
                        margin-right: 8px;
                    }
                    .forum-status-value {
                        flex-grow: 1;
                        text-align: right;
                        margin-right: 6px;
                    }
                    .forum-status-indicator {
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    .status-success { background-color: #48bb78; }
                    .status-error { background-color: #f56565; }
                    .status-warning { background-color: #ed8936; }
                    .status-info { background-color: #4299e1; }
                    .status-processing { background-color: #9f7aea; }
                    .status-waiting { background-color: #ecc94b; }
                    .status-offline { background-color: #718096; }
                `;

        if (!document.head.querySelector('#forum-auto-listener-styles')) {
          style.id = 'forum-auto-listener-styles';
          document.head.appendChild(style);
        }

        // พยายามเพิ่มในตำแหน่งที่เหมาะสม
        const targetContainer =
          document.getElementById('extensions_settings') ||
          document.getElementById('floatingPrompt') ||
          document.getElementById('left-nav-panel') ||
          document.body;

        targetContainer.appendChild(statusContainer);
        console.log('[Forum Auto Listener] เริ่มต้นการแสดงสถานะแล้ว');
      }

      this.statusElement = statusContainer;
    } catch (error) {
      console.warn('[Forum Auto Listener] เริ่มต้นการแสดงสถานะล้มเหลว:', error);
    }
  }

  /**
   * อัปเดตการแสดงสถานะ
   * @param {string} status - ข้อความสถานะ
   * @param {string} type - ประเภทสถานะ (success, error, warning, info, processing, waiting, offline)
   */
  updateStatus(status, type = 'info') {
    try {
      this.currentStatus = status;

      // อัปเดตการแสดงผลหน้า
      const statusValueElement = document.getElementById('forum-listener-status');
      const statusIndicatorElement = document.getElementById('forum-listener-indicator');
      const countElement = document.getElementById('forum-listener-count');
      const timeElement = document.getElementById('forum-listener-time');

      if (statusValueElement) {
        statusValueElement.textContent = status;
      }

      if (statusIndicatorElement) {
        // ล้างคลาสสถานะทั้งหมด
        statusIndicatorElement.className = 'forum-status-indicator';
        // เพิ่มคลาสสถานะใหม่
        statusIndicatorElement.classList.add(`status-${type}`);
      }

      if (countElement) {
        countElement.textContent = this.generationCount.toString();
      }

      if (timeElement && this.lastGenerationTime) {
        timeElement.textContent = this.lastGenerationTime.toLocaleTimeString();
      }

      // บันทึกคอนโซล
      const statusIcon = this.getStatusIcon(type);
      console.log(`[Forum Auto Listener] ${statusIcon} ${status}`);
    } catch (error) {
      console.warn('[Forum Auto Listener] อัปเดตการแสดงสถานะล้มเหลว:', error);
    }
  }

  /**
   * ดึงไอคอนสถานะ
   * @param {string} type - ประเภทสถานะ
   * @returns {string} ไอคอนสถานะ
   */
  getStatusIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      processing: '⏳',
      waiting: '⏸️',
      offline: '⭕',
    };
    return icons[type] || 'ℹ️';
  }

  /**
   * ดึงข้อมูลสถานะโดยละเอียด
   */
  getDetailedStatus() {
    return {
      ...this.getStatus(),
      currentStatus: this.currentStatus,
      generationCount: this.generationCount,
      lastGenerationTime: this.lastGenerationTime,
      hasStatusDisplay: !!this.statusElement,
    };
  }
}

// สร้างอินสแตนซ์ทั่วไป
window.ForumAutoListener = ForumAutoListener;
window.forumAutoListener = new ForumAutoListener();

// เพิ่มเมธอดทั่วไปสำหรับดูสถานะอย่างรวดเร็ว
window.showForumAutoListenerStatus = () => {
  const status = window.forumAutoListener.getDetailedStatus();
  console.table(status);
  return status;
};

// ส่งออกคลาส
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ForumAutoListener;
}

// ตั้งค่าตัวสังเกตการณ์ UI
setTimeout(() => {
  try {
    console.log('[Forum Auto Listener] ตั้งค่าตัวสังเกตการณ์ UI...');
    if (window.forumAutoListener) {
      // ตรวจสอบให้แน่ใจว่าจะไม่เริ่ม timer อัตโนมัติ
      if (window.forumAutoListener.checkInterval) {
        clearInterval(window.forumAutoListener.checkInterval);
        window.forumAutoListener.checkInterval = null;
        console.log('[Forum Auto Listener] ล้าง timer ที่อาจมีอยู่แล้ว');
      }

      window.forumAutoListener.setupUIObserver();

      // เริ่มตัวฟังอัตโนมัติ
      console.log('[Forum Auto Listener] เริ่มตัวฟังอัตโนมัติ...');
      if (!window.forumAutoListener.isListening) {
        window.forumAutoListener.start();
        console.log('[Forum Auto Listener] ✅ เริ่มอัตโนมัติสำเร็จ');
      }
    }
  } catch (error) {
    console.error('[Forum Auto Listener] ตั้งค่าตัวสังเกตการณ์ UI ล้มเหลว:', error);
  }
}, 2000); // รอ 2 วินาทีให้ DOM โหลดเสร็จ

// ลบ timer ตรวจสุขภาพ เพราะอาจทำให้ตัวฟังรีสตาร์ทอัตโนมัติ
// ไม่ต้องการฟังก์ชันกู้คืนการฟังอัตโนมัติอีกต่อไป เพราะต้องการเริ่มเฉพาะเมื่อผู้ใช้คลิกอย่างชัดเจน

console.log('[Forum Auto Listener] โหลดโมดูลตัวฟังอัตโนมัติฟอรัมเสร็จแล้ว');
console.log('[Forum Auto Listener] 🔧 การปรับปรุงสำคัญ:');
console.log('[Forum Auto Listener]   ✅ เริ่มอัตโนมัติ: เริ่มฟังอัตโนมัติหลังโหลดหน้า');
console.log('[Forum Auto Listener]   ✅ หยุดอัตโนมัติ: หยุดอัตโนมัติเมื่อคลิกปุ่มย้อนกลับหรือปิด');
console.log('[Forum Auto Listener]   ✅ กลไกคิว: รอให้ SillyTavern ว่างก่อนสร้าง');
console.log('[Forum Auto Listener]   ✅ ดำเนินการทันที: ทริกเกอร์ทันทีเมื่อถึงเกณฑ์');
console.log('[Forum Auto Listener]   ✅ แก้ไขความขัดแย้งของสถานะ: หลีกเลี่ยงปัญหา "Auto-listener กำลังประมวลผล"');
console.log('[Forum Auto Listener]   ✅ แสดงสถานะ: แสดงสถานะการทำงานของตัวฟังแบบเรียลไทม์');
console.log('[Forum Auto Listener] 💡 คำสั่งทดสอบ: window.forumAutoListener.manualTrigger()');
console.log('[Forum Auto Listener] 📊 ดูสถานะ: window.showForumAutoListenerStatus()');
console.log('[Forum Auto Listener] 🔧 ตรวจสอบสถานะ: window.forumAutoListener.isForumManagerCallAllowed()');
console.log('[Forum Auto Listener] 📊 แผงสถานะ: จะแสดงการ์ดสถานะ "ตัวฟังอัตโนมัติฟอรัม" ใน UI');
console.log(
  '[Forum Auto Listener] 🚀 ตัวฟังจะเริ่มอัตโนมัติ เนื้อหาฟอรัมจะถูกสร้างอัตโนมัติ! ดูสถานะแบบเรียลไทม์ได้ใน UI!',
);
