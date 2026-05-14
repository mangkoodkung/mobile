// ==SillyTavern Weibo Auto Listener==
// @name         Weibo Auto Listener for Mobile Extension
// @version      1.0.0
// @description  ตัวดักจับอัตโนมัติของ Weibo ดักจับการเปลี่ยนแปลงแชทและทริกเกอร์การสร้าง Weibo อัตโนมัติ
// @author       Assistant

// ป้องกันการโหลดซ้ำ
if (typeof window.WeiboAutoListener !== 'undefined') {
  console.log('[Weibo Auto Listener] มีอยู่แล้ว ข้ามการโหลดซ้ำ');
} else {
  /**
   * คลาสตัวดักจับอัตโนมัติของ Weibo
   * รับผิดชอบดักจับการเปลี่ยนแปลงแชทและทริกเกอร์การสร้างเนื้อหา Weibo อัตโนมัติ
   */
  class WeiboAutoListener {
    constructor() {
      this.isListening = false;
      this.isProcessingRequest = false;
      this.lastProcessedMessageCount = 0;
      this.checkInterval = null;
      this.checkIntervalMs = 3000; // ช่วงเวลาตรวจสอบ: 3 วินาที
      this.settings = {
        enabled: true,
        threshold: 10, // เกณฑ์จำนวนข้อความที่เพิ่มขึ้น
      };

      // ผูกเมธอด
      this.startListening = this.startListening.bind(this);
      this.stopListening = this.stopListening.bind(this);
      this.checkForUpdates = this.checkForUpdates.bind(this);
      this.handleChatUpdate = this.handleChatUpdate.bind(this);

      this.init();
    }

    /**
     * เริ่มต้นตัวดักจับ - อ้างอิงกลไกเริ่มต้นอัจฉริยะของ Forum-App
     */
    init() {
      console.log('[Weibo Auto Listener] เริ่มต้นตัวดักจับอัตโนมัติของ Weibo');
      this.loadSettings();

      // อ้างอิง Forum-App: ตั้งค่า UI Observer แทนการเริ่มต้นอัตโนมัติ
      setTimeout(() => {
        this.setupUIObserver();
      }, 2000);
    }

    /**
     * ตั้งค่า UI Observer - อ้างอิง Forum-App
     */
    setupUIObserver() {
      try {
        console.log('[Weibo Auto Listener] ตั้งค่า UI Observer...');

        // ตรวจสอบสถานะแอป Weibo
        this.checkWeiboAppState();

        // ตั้งค่าตรวจสอบสถานะ UI เป็นระยะ (ลดความถี่)
        setInterval(() => {
          this.checkWeiboAppState();
        }, 10000); // ตรวจสอบสถานะ UI ทุก 10 วินาที
      } catch (error) {
        console.error('[Weibo Auto Listener] ตั้งค่า UI Observer ล้มเหลว:', error);
      }
    }

    /**
     * ตรวจสอบสถานะแอป Weibo - อ้างอิง Forum-App
     */
    checkWeiboAppState() {
      try {
        // ตรวจสอบว่าแอป Weibo ถูกเปิดใช้งานในมุมมองปัจจุบันหรือไม่
        const weiboAppActive = this.isWeiboAppActive();

        if (weiboAppActive && !this.isListening && this.settings.enabled) {
          console.log('[Weibo Auto Listener] ตรวจพบแอป Weibo เปิดใช้งาน เริ่มตัวดักจับ');
          this.startListening();
        } else if (!weiboAppActive && this.isListening) {
          console.log('[Weibo Auto Listener] ตรวจพบแอป Weibo ไม่ได้เปิดใช้งาน หยุดตัวดักจับ');
          this.stopListening();
        }
      } catch (error) {
        console.warn('[Weibo Auto Listener] ตรวจสอบสถานะแอป Weibo ล้มเหลว:', error);
      }
    }

    /**
     * ตรวจสอบว่าแอป Weibo เปิดใช้งานอยู่หรือไม่
     */
    isWeiboAppActive() {
      try {
        // ตรวจสอบว่ามี DOM element ที่เกี่ยวข้องกับ Weibo ที่มองเห็นได้หรือไม่
        const weiboElements = document.querySelectorAll('.weibo-page, .weibo-container, [data-app="weibo"]');
        const hasVisibleWeiboElements = Array.from(weiboElements).some(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        // ตรวจสอบ URL หรือสถานะของหน้าปัจจุบัน
        const urlContainsWeibo = window.location.href.includes('weibo') || window.location.hash.includes('weibo');

        // ตรวจสอบสถานะแอปปัจจุบันของ Mobile Framework
        const mobileFrameworkActive = window.mobileFramework && window.mobileFramework.currentApp === 'weibo';

        return hasVisibleWeiboElements || urlContainsWeibo || mobileFrameworkActive;
      } catch (error) {
        console.warn('[Weibo Auto Listener] ตรวจสอบสถานะการเปิดใช้งานแอป Weibo ล้มเหลว:', error);
        // หากตรวจสอบล้มเหลว ถือว่าเปิดใช้งานอยู่ (กลยุทธ์แบบอนุรักษ์นิยม)
        return true;
      }
    }

    /**
     * โหลดการตั้งค่า
     */
    loadSettings() {
      try {
        const saved = localStorage.getItem('mobile_weibo_auto_listener_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          this.settings = { ...this.settings, ...settings };
          console.log('[Weibo Auto Listener] โหลดการตั้งค่าแล้ว:', this.settings);
        }
      } catch (error) {
        console.warn('[Weibo Auto Listener] โหลดการตั้งค่าล้มเหลว:', error);
      }
    }

    /**
     * บันทึกการตั้งค่า
     */
    saveSettings() {
      try {
        localStorage.setItem('mobile_weibo_auto_listener_settings', JSON.stringify(this.settings));
        console.log('[Weibo Auto Listener] บันทึกการตั้งค่าแล้ว:', this.settings);
      } catch (error) {
        console.warn('[Weibo Auto Listener] บันทึกการตั้งค่าล้มเหลว:', error);
      }
    }

    /**
     * เริ่มดักจับ
     */
    startListening() {
      if (this.isListening) {
        console.log('[Weibo Auto Listener] กำลังดักจับอยู่แล้ว');
        return;
      }

      console.log('[Weibo Auto Listener] 🎧 เริ่มดักจับการเปลี่ยนแปลงแชท...');
      this.isListening = true;

      // ดึงจำนวนข้อความเริ่มต้น
      this.updateLastProcessedCount();

      // เริ่มตรวจสอบตามเวลา
      this.checkInterval = setInterval(this.checkForUpdates, this.checkIntervalMs);

      console.log(`[Weibo Auto Listener] ✅ เริ่มดักจับแล้ว ช่วงเวลาตรวจสอบ: ${this.checkIntervalMs}ms`);
    }

    /**
     * หยุดดักจับ
     */
    stopListening() {
      if (!this.isListening) {
        console.log('[Weibo Auto Listener] ไม่ได้อยู่ในโหมดดักจับ');
        return;
      }

      console.log('[Weibo Auto Listener] 🔇 หยุดดักจับการเปลี่ยนแปลงแชท...');
      this.isListening = false;

      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      console.log('[Weibo Auto Listener] ✅ หยุดดักจับแล้ว');
    }

    /**
     * ตรวจสอบอัปเดต - อ้างอิงการแสดง log อัจฉริยะของ Forum-App
     */
    async checkForUpdates() {
      // หากไม่ได้เปิดใช้งานหรือกำลังประมวลผลคำขอ ข้ามการตรวจสอบ
      if (!this.settings.enabled || this.isProcessingRequest) {
        return;
      }

      // หากตัวจัดการ Weibo กำลังประมวลผล ข้ามการตรวจสอบ
      if (window.weiboManager && window.weiboManager.isProcessing) {
        return; // ลบ log ที่ไม่จำเป็น
      }

      try {
        const chatData = await this.getCurrentChatData();
        if (!chatData || !chatData.messages) {
          return;
        }

        const currentCount = chatData.messages.length;
        const increment = currentCount - this.lastProcessedMessageCount;

        // อ้างอิง Forum-App: แสดง log เฉพาะเมื่อมีข้อความเพิ่มขึ้นจริง
        if (increment > 0) {
          if (window.DEBUG_WEIBO_AUTO_LISTENER) {
            console.log(
              `[Weibo Auto Listener] ตรวจพบข้อความใหม่: +${increment} (${this.lastProcessedMessageCount} -> ${currentCount})`,
            );
          }

          // ตรวจสอบว่าถึงเกณฑ์หรือไม่
          if (increment >= this.settings.threshold) {
            console.log(
              `[Weibo Auto Listener] 🚀 ถึงเกณฑ์แล้ว (${increment}/${this.settings.threshold}) ทริกเกอร์การสร้าง Weibo`,
            );
            await this.handleChatUpdate(currentCount);
          } else {
            if (window.DEBUG_WEIBO_AUTO_LISTENER) {
              console.log(
                `[Weibo Auto Listener] จำนวนข้อความที่เพิ่มยังไม่ถึงเกณฑ์ (${increment}/${this.settings.threshold}) ดักจับต่อ`,
              );
            }
          }
        }
        // หากไม่มีข้อความใหม่ ไม่แสดง log ใดๆ (หลีกเลี่ยงการแสดงผลล้นหน้าจอ)
      } catch (error) {
        // ลดความถี่ของ error log เพื่อหลีกเลี่ยงการแสดงผลล้นหน้าจอ
        if (Math.random() < 0.01) {
          console.error('[Weibo Auto Listener] ตรวจสอบอัปเดตล้มเหลว:', error);
        }
      }
    }

    /**
     * จัดการอัปเดตแชท
     */
    async handleChatUpdate(currentCount) {
      if (this.isProcessingRequest) {
        console.log('[Weibo Auto Listener] กำลังประมวลผลคำขอ ข้าม');
        return;
      }

      try {
        this.isProcessingRequest = true;
        console.log('[Weibo Auto Listener] 📝 เริ่มประมวลผลอัปเดตแชท...');

        // เรียกตัวจัดการ Weibo เพื่อสร้างเนื้อหา
        if (window.weiboManager && window.weiboManager.generateWeiboContent) {
          const success = await window.weiboManager.generateWeiboContent(false); // โหมดไม่บังคับ

          if (success) {
            console.log('[Weibo Auto Listener] ✅ สร้างเนื้อหา Weibo สำเร็จ');
            this.lastProcessedMessageCount = currentCount;

            // ซิงค์ไปยังตัวจัดการ Weibo
            if (window.weiboManager) {
              window.weiboManager.lastProcessedCount = currentCount;
            }
          } else {
            console.log('[Weibo Auto Listener] ⚠️ สร้างเนื้อหา Weibo ล้มเหลวหรือถูกข้าม');
          }
        } else {
          console.warn('[Weibo Auto Listener] ตัวจัดการ Weibo ยังไม่พร้อม');
        }
      } catch (error) {
        console.error('[Weibo Auto Listener] ประมวลผลอัปเดตแชทล้มเหลว:', error);
      } finally {
        // หน่วงเวลารีเซ็ตสถานะการประมวลผล เพื่อหลีกเลี่ยงการทริกเกอร์ซ้ำ
        setTimeout(() => {
          this.isProcessingRequest = false;
          console.log('[Weibo Auto Listener] 🔄 รีเซ็ตสถานะการประมวลผลแล้ว');
        }, 2000);
      }
    }

    /**
     * ดึงข้อมูลแชทปัจจุบัน - อ้างอิงการจัดการข้อผิดพลาดของ Forum-App
     */
    async getCurrentChatData() {
      try {
        if (window.mobileContextEditor) {
          return window.mobileContextEditor.getCurrentChatData();
        } else if (window.MobileContext) {
          return await window.MobileContext.loadChatToEditor();
        } else {
          // จัดการแบบเงียบ หลีกเลี่ยงการแสดงผลล้นหน้าจอ
          return null;
        }
      } catch (error) {
        // อ้างอิง Forum-App: แสดง error log เฉพาะในเงื่อนไขที่กำหนด
        if (!this._lastErrorTime || Date.now() - this._lastErrorTime > 60000) {
          // แสดง error log ได้มากสุดนาทีละครั้ง
          console.warn('[Weibo Auto Listener] ดึงข้อมูลแชทล้มเหลว:', error.message);
          this._lastErrorTime = Date.now();
        }
        return null;
      }
    }

    /**
     * อัปเดตจำนวนข้อความที่ประมวลผลล่าสุด
     */
    async updateLastProcessedCount() {
      try {
        const chatData = await this.getCurrentChatData();
        if (chatData && chatData.messages) {
          this.lastProcessedMessageCount = chatData.messages.length;
          console.log(`[Weibo Auto Listener] จำนวนข้อความเริ่มต้น: ${this.lastProcessedMessageCount}`);
        }
      } catch (error) {
        console.warn('[Weibo Auto Listener] อัปเดตจำนวนข้อความล้มเหลว:', error);
      }
    }

    /**
     * เปิดใช้งานการดักจับอัตโนมัติ
     */
    enable() {
      this.settings.enabled = true;
      this.saveSettings();

      if (!this.isListening) {
        this.startListening();
      }

      console.log('[Weibo Auto Listener] ✅ เปิดใช้งานการดักจับอัตโนมัติแล้ว');
    }

    /**
     * ปิดใช้งานการดักจับอัตโนมัติ
     */
    disable() {
      this.settings.enabled = false;
      this.saveSettings();

      if (this.isListening) {
        this.stopListening();
      }

      console.log('[Weibo Auto Listener] ❌ ปิดใช้งานการดักจับอัตโนมัติแล้ว');
    }

    /**
     * ตั้งค่าเกณฑ์ข้อความ
     */
    setThreshold(threshold) {
      if (typeof threshold === 'number' && threshold > 0) {
        this.settings.threshold = threshold;
        this.saveSettings();
        console.log(`[Weibo Auto Listener] ตั้งค่าเกณฑ์เป็น: ${threshold}`);
      } else {
        console.warn('[Weibo Auto Listener] เกณฑ์ไม่ถูกต้อง:', threshold);
      }
    }

    /**
     * ตั้งค่าช่วงเวลาตรวจสอบ
     */
    setCheckInterval(intervalMs) {
      if (typeof intervalMs === 'number' && intervalMs >= 1000) {
        this.checkIntervalMs = intervalMs;

        // หากกำลังดักจับอยู่ รีสตาร์ทเพื่อใช้ช่วงเวลาใหม่
        if (this.isListening) {
          this.stopListening();
          setTimeout(() => {
            this.startListening();
          }, 100);
        }

        console.log(`[Weibo Auto Listener] ตั้งค่าช่วงเวลาตรวจสอบเป็น: ${intervalMs}ms`);
      } else {
        console.warn('[Weibo Auto Listener] ช่วงเวลาตรวจสอบไม่ถูกต้อง:', intervalMs);
      }
    }

    /**
     * ทริกเกอร์การตรวจสอบด้วยตนเอง
     */
    async manualCheck() {
      console.log('[Weibo Auto Listener] 🔍 ทริกเกอร์การตรวจสอบด้วยตนเอง...');

      try {
        // เปิดใช้งานการประมวลผลชั่วคราว แม้ว่าจะถูกปิดใช้งานอยู่
        const originalEnabled = this.settings.enabled;
        this.settings.enabled = true;

        await this.checkForUpdates();

        // คืนค่าการตั้งค่าเดิม
        this.settings.enabled = originalEnabled;

        console.log('[Weibo Auto Listener] ✅ ตรวจสอบด้วยตนเองเสร็จสิ้น');
      } catch (error) {
        console.error('[Weibo Auto Listener] ตรวจสอบด้วยตนเองล้มเหลว:', error);
      }
    }

    /**
     * รีเซ็ตสถานะตัวดักจับ
     */
    reset() {
      console.log('[Weibo Auto Listener] 🔄 รีเซ็ตสถานะตัวดักจับ...');

      // หยุดดักจับ
      this.stopListening();

      // รีเซ็ตสถานะ
      this.isProcessingRequest = false;
      this.lastProcessedMessageCount = 0;

      // อัปเดตจำนวนข้อความ
      this.updateLastProcessedCount();

      // หากเปิดใช้งาน เริ่มดักจับใหม่
      if (this.settings.enabled) {
        setTimeout(() => {
          this.startListening();
        }, 1000);
      }

      console.log('[Weibo Auto Listener] ✅ รีเซ็ตสถานะตัวดักจับแล้ว');
    }

    /**
     * ดึงสถานะตัวดักจับ
     */
    getStatus() {
      return {
        isListening: this.isListening,
        isProcessingRequest: this.isProcessingRequest,
        lastProcessedMessageCount: this.lastProcessedMessageCount,
        settings: { ...this.settings },
        checkIntervalMs: this.checkIntervalMs,
      };
    }

    /**
     * ดึงข้อมูลดีบัก
     */
    getDebugInfo() {
      const status = this.getStatus();

      return {
        ...status,
        hasWeiboManager: !!window.weiboManager,
        hasContextEditor: !!window.mobileContextEditor,
        hasMobileContext: !!window.MobileContext,
        timestamp: new Date().toISOString(),
      };
    }

    /**
     * บังคับซิงค์จำนวนข้อความ
     */
    async forceSyncMessageCount() {
      console.log('[Weibo Auto Listener] 🔄 บังคับซิงค์จำนวนข้อความ...');

      try {
        const chatData = await this.getCurrentChatData();
        if (chatData && chatData.messages) {
          const oldCount = this.lastProcessedMessageCount;
          this.lastProcessedMessageCount = chatData.messages.length;

          // ซิงค์ไปยังตัวจัดการ Weibo
          if (window.weiboManager) {
            window.weiboManager.lastProcessedCount = this.lastProcessedMessageCount;
          }

          console.log(
            `[Weibo Auto Listener] ✅ ซิงค์จำนวนข้อความแล้ว: ${oldCount} -> ${this.lastProcessedMessageCount}`,
          );
        } else {
          console.warn('[Weibo Auto Listener] ไม่สามารถดึงข้อมูลแชทได้');
        }
      } catch (error) {
        console.error('[Weibo Auto Listener] บังคับซิงค์จำนวนข้อความล้มเหลว:', error);
      }
    }

    /**
     * ตรวจสอบ dependency
     */
    checkDependencies() {
      const deps = {
        weiboManager: !!window.weiboManager,
        mobileContextEditor: !!window.mobileContextEditor,
        mobileContext: !!window.MobileContext,
      };

      // แสดง log เฉพาะเมื่อสถานะ dependency เปลี่ยนแปลง
      const depsString = JSON.stringify(deps);
      if (this._lastDepsString !== depsString) {
        console.log('[Weibo Auto Listener] สถานะ dependency เปลี่ยนแปลง:', deps);
        this._lastDepsString = depsString;
      }

      const allReady = Object.values(deps).some(ready => ready);
      if (!allReady && (!this._lastWarnTime || Date.now() - this._lastWarnTime > 300000)) {
        // แจ้งเตือนได้มากสุดทุก 5 นาที
        console.warn('[Weibo Auto Listener] ⚠️ dependency สำคัญยังไม่พร้อม');
        this._lastWarnTime = Date.now();
      }

      return deps;
    }

    /**
     * ตรวจสอบให้ตัวดักจับทำงานต่อเนื่อง - อ้างอิงกลไกกู้คืนสถานะของ Forum-App
     */
    ensureContinuousListening() {
      // หากสถานะการประมวลผลค้าง ให้รีเซ็ต
      if (this.isProcessingRequest) {
        const now = Date.now();
        const timeSinceLastCheck = now - (this._lastCheckTime || 0);

        // หากเกิน 30 วินาทียังอยู่ในสถานะประมวลผล ถือว่าค้าง
        if (timeSinceLastCheck > 30000) {
          console.warn('[Weibo Auto Listener] ตรวจพบสถานะการประมวลผลค้าง รีเซ็ตสถานะ...');
          this.isProcessingRequest = false;
          this._lastCheckTime = now;
        }
      }

      // ตรวจสอบว่า timer ยังทำงานอยู่หรือไม่ (หากตัวดักจับเริ่มทำงานแล้ว)
      if (this.isListening && !this.checkInterval) {
        console.warn('[Weibo Auto Listener] ตรวจพบ timer หายไป ตั้งค่าใหม่...');
        this.checkInterval = setInterval(this.checkForUpdates, this.checkIntervalMs);
      }
    }
  }

  // สร้าง instance ระดับ global - อ้างอิงวิธีการเริ่มต้นของ Forum-App
  if (typeof window !== 'undefined') {
    // ตั้งค่าคลาสและ instance ให้สอดคล้องกับ forum-auto-listener.js
    window.WeiboAutoListener = WeiboAutoListener;
    window.weiboAutoListener = new WeiboAutoListener();
    console.log('[Weibo Auto Listener] ✅ สร้างตัวดักจับอัตโนมัติของ Weibo แล้ว');

    // อ้างอิง Forum-App: ตั้งค่ากลไกตรวจสุขภาพ (ลดความถี่)
    setTimeout(() => {
      if (window.weiboAutoListener) {
        // ตรวจสอบสถานะทุก 5 นาที แทนที่จะตรวจบ่อย
        setInterval(() => {
          try {
            window.weiboAutoListener.ensureContinuousListening();
          } catch (error) {
            console.error('[Weibo Auto Listener] ตรวจสุขภาพล้มเหลว:', error);
          }
        }, 300000); // 5 นาที
      }
    }, 10000); // เริ่มตรวจสุขภาพหลังจาก 10 วินาที
  }
} // จบการตรวจสอบป้องกันการโหลดซ้ำ
