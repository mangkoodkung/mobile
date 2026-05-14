// ==SillyTavern Weibo Manager==
// @name         Weibo Manager for Mobile Extension
// @version      1.0.0
// @description  ตัวจัดการอัปเดตอัตโนมัติของ Weibo
// @author       Assistant

// ป้องกันการโหลดซ้ำ
if (typeof window.WeiboManager !== 'undefined') {
  console.log('[Weibo Manager] มีอยู่แล้ว ข้ามการโหลดซ้ำ');
} else {
  /**
   * คลาสตัวจัดการ Weibo
   * รับผิดชอบการจัดการสร้างเนื้อหา Weibo, การเรียก API และการรวมกับตัวแก้ไขบริบท
   */
  class WeiboManager {
    constructor() {
      this.isInitialized = false;
      this.currentSettings = {
        enabled: true,
        autoUpdate: true,
        threshold: 10,
        apiConfig: {
          url: '',
          apiKey: '',
          model: '',
        },
      };
      this.isProcessing = false;
      this.lastProcessedCount = 0;

      // การจัดการบัญชีผู้ใช้
      this.currentAccount = {
        isMainAccount: true, // true=บัญชีหลัก, false=บัญชีรอง
        mainAccountName: '{{user}}', // ชื่อผู้ใช้บัญชีหลัก
        aliasAccountName: 'Alias', // ชื่อผู้ใช้บัญชีรอง
        currentPage: 'hot', // หน้าปัจจุบัน: hot, ranking, user
      };

      // การตรวจสอบสถานะการสร้าง
      this.isMonitoringGeneration = false;
      this.pendingInsertions = [];
      this.generationCheckInterval = null;
      this.statusUpdateTimer = null;
      this.maxWaitTime = 300000; // เวลารอสูงสุด: 5 นาที

      // การตั้งค่ากลไกลองใหม่ - ปิดใช้งานการลองใหม่อัตโนมัติ
      this.retryConfig = {
        maxRetries: 0, // ปิดใช้งานการลองใหม่อัตโนมัติ
        retryDelay: 60000, // หน่วงเวลาลองใหม่: 1 นาที (เก็บค่าไว้แต่ไม่ใช้)
        currentRetryCount: 0, // จำนวนครั้งที่ลองใหม่ปัจจุบัน
        lastFailTime: null, // เวลาที่ล้มเหลวล่าสุด
        autoRetryEnabled: false, // ปิดใช้งานการลองใหม่อัตโนมัติอย่างชัดเจน
      };

      // ผูกเมธอด
      this.initialize = this.initialize.bind(this);
      this.generateWeiboContent = this.generateWeiboContent.bind(this);
      this.updateContextWithWeibo = this.updateContextWithWeibo.bind(this);
      this.checkGenerationStatus = this.checkGenerationStatus.bind(this);
      this.waitForGenerationComplete = this.waitForGenerationComplete.bind(this);
      this.processInsertionQueue = this.processInsertionQueue.bind(this);
      this.scheduleRetry = this.scheduleRetry.bind(this);
    }

    /**
     * เริ่มต้นตัวจัดการ Weibo
     */
    async initialize() {
      try {
        console.log('[Weibo Manager] เริ่มต้นการทำงาน...');

        // โหลดการตั้งค่า
        this.loadSettings();

        // รอโมดูลอื่นเริ่มต้นเสร็จ
        await this.waitForDependencies();

        // โหลดการตั้งค่าบัญชี
        this.loadAccountSettings();

        this.isInitialized = true;
        console.log('[Weibo Manager] ✅ เริ่มต้นเสร็จสมบูรณ์');

        // ตรวจจับเบราว์เซอร์และแสดงคำแนะนำความเข้ากันได้
        this.detectBrowserAndShowTips();
      } catch (error) {
        console.error('[Weibo Manager] เริ่มต้นล้มเหลว:', error);
      }
    }

    /**
     * ตรวจจับเบราว์เซอร์และแสดงคำแนะนำความเข้ากันได้
     */
    detectBrowserAndShowTips() {
      const userAgent = navigator.userAgent;
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isVia = /Via/.test(userAgent);

      if (isSafari || isVia) {
        console.log('%c🍎 คำแนะนำความเข้ากันได้ Safari/Via', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');
        console.log(
          '%cหากพบปัญหาปุ่มไม่ตอบสนอง กรุณาเรียกใช้: MobileContext.fixBrowserCompatibility()',
          'color: #4ecdc4; font-size: 12px;',
        );
        console.log('%cข้อมูลวินิจฉัยเพิ่มเติม: MobileContext.quickDiagnosis()', 'color: #45b7d1; font-size: 12px;');
      }
    }

    /**
     * รอโมดูลที่ต้องพึ่งพาโหลดเสร็จ - เวอร์ชันปรับปรุง ลดการแสดงผลซ้ำ
     */
    async waitForDependencies() {
      return new Promise(resolve => {
        let checkCount = 0;
        const maxChecks = 20; // ลดเหลือ 20 ครั้ง (10 วินาที)
        let lastLogTime = 0;

        const checkDeps = () => {
          checkCount++;
          const contextEditorReady = window.mobileContextEditor !== undefined;
          const customAPIReady = window.mobileCustomAPIConfig !== undefined;
          let weiboStylesReady = window.weiboStyles !== undefined;

          // 🔧 หาก weiboStyles ยังไม่ถูกกำหนด ลองโหลดและสร้าง
          if (!weiboStylesReady) {
            if (typeof window.WeiboStyles !== 'undefined') {
              console.log(
                '[Weibo Manager] 🔧 ตรวจพบคลาส WeiboStyles มีอยู่แต่ยังไม่สร้างอินสแตนซ์ ลองสร้างด้วยตนเอง...',
              );
              try {
                window.weiboStyles = new window.WeiboStyles();
                weiboStylesReady = true;
                console.log('[Weibo Manager] ✅ สร้างอินสแตนซ์ weiboStyles ด้วยตนเองสำเร็จ');
              } catch (error) {
                console.error('[Weibo Manager] ❌ สร้างอินสแตนซ์ weiboStyles ด้วยตนเองล้มเหลว:', error);
              }
            } else {
              // คลาส WeiboStyles ไม่มีอยู่ ลองโหลดแบบไดนามิก
              console.log('[Weibo Manager] 🔄 คลาส WeiboStyles ไม่มีอยู่ ลองโหลด weibo-styles.js แบบไดนามิก...');
              try {
                const script = document.createElement('script');
                script.src = './scripts/extensions/third-party/mobile/app/weibo-app/weibo-styles.js';
                script.async = false; // โหลดแบบซิงโครนัส

                // ใช้ Promise รอการโหลดเสร็จ
                const loadPromise = new Promise(resolve => {
                  script.onload = () => {
                    console.log('[Weibo Manager] ✅ โหลด weibo-styles.js แบบไดนามิกสำเร็จ');
                    if (typeof window.weiboStyles !== 'undefined') {
                      weiboStylesReady = true;
                      console.log('[Weibo Manager] ✅ สร้างอินสแตนซ์ weiboStyles แล้ว');
                    }
                    resolve();
                  };
                  script.onerror = () => {
                    console.error('[Weibo Manager] ❌ โหลด weibo-styles.js แบบไดนามิกล้มเหลว');
                    resolve();
                  };
                });

                document.head.appendChild(script);

                // รอสักครู่ให้สคริปต์ทำงาน (แบบซิงโครนัส)
                setTimeout(() => {
                  weiboStylesReady = window.weiboStyles !== undefined;
                }, 100);
              } catch (error) {
                console.error('[Weibo Manager] ❌ กระบวนการโหลดแบบไดนามิกล้มเหลว:', error);
              }
            }
          }

          if (contextEditorReady && customAPIReady && weiboStylesReady) {
            console.log('[Weibo Manager] ✅ โมดูลที่ต้องพึ่งพาทั้งหมดพร้อมแล้ว');
            resolve();
            return;
          }

          if (checkCount >= maxChecks) {
            console.warn('[Weibo Manager] ⚠️ รอโมดูลหมดเวลา ดำเนินการเริ่มต้นต่อ (บางฟังก์ชันอาจถูกจำกัด)');
            console.log('[Weibo Manager] 🔍 สถานะโมดูลสุดท้าย:', {
              contextEditor: contextEditorReady,
              customAPI: customAPIReady,
              weiboStyles: weiboStylesReady,
              weiboStylesType: typeof window.weiboStyles,
              weiboStylesClass: typeof window.WeiboStyles,
              allWeiboKeys: Object.keys(window).filter(key => key.toLowerCase().includes('weibo')),
            });
            resolve();
            return;
          }

          // ลดการแสดง log อย่างมาก: แสดงเฉพาะครั้งที่ 1, 5, 10, 15
          const shouldLog = checkCount === 1 || checkCount === 5 || checkCount === 10 || checkCount === 15;
          if (shouldLog) {
            console.log(`[Weibo Manager] รอโมดูลที่ต้องพึ่งพา (${checkCount}/${maxChecks})...`, {
              contextEditor: contextEditorReady,
              customAPI: customAPIReady,
              weiboStyles: weiboStylesReady,
              weiboStylesType: typeof window.weiboStyles,
              weiboStylesClass: typeof window.WeiboStyles,
            });
          }

          setTimeout(checkDeps, 500);
        };

        checkDeps();
      });
    }

    /**
     * โหลดการตั้งค่า
     */
    loadSettings() {
      try {
        const saved = localStorage.getItem('mobile_weibo_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          this.currentSettings = { ...this.currentSettings, ...settings };
          console.log('[Weibo Manager] โหลดการตั้งค่าแล้ว:', this.currentSettings);
        }
      } catch (error) {
        console.warn('[Weibo Manager] โหลดการตั้งค่าล้มเหลว:', error);
      }
    }

    /**
     * บันทึกการตั้งค่า
     */
    saveSettings() {
      try {
        localStorage.setItem('mobile_weibo_settings', JSON.stringify(this.currentSettings));
        console.log('[Weibo Manager] บันทึกการตั้งค่าแล้ว:', this.currentSettings);
      } catch (error) {
        console.warn('[Weibo Manager] บันทึกการตั้งค่าล้มเหลว:', error);
      }
    }

    /**
     * โหลดการตั้งค่าบัญชี
     */
    loadAccountSettings() {
      try {
        const saved = localStorage.getItem('mobile_weibo_account');
        if (saved) {
          const account = JSON.parse(saved);
          this.currentAccount = { ...this.currentAccount, ...account };
          console.log('[Weibo Manager] โหลดการตั้งค่าบัญชีแล้ว:', this.currentAccount);
        }
      } catch (error) {
        console.warn('[Weibo Manager] โหลดการตั้งค่าบัญชีล้มเหลว:', error);
      }
    }

    /**
     * บันทึกการตั้งค่าบัญชี
     */
    saveAccountSettings() {
      try {
        localStorage.setItem('mobile_weibo_account', JSON.stringify(this.currentAccount));
        console.log('[Weibo Manager] บันทึกการตั้งค่าบัญชีแล้ว:', this.currentAccount);
      } catch (error) {
        console.warn('[Weibo Manager] บันทึกการตั้งค่าบัญชีล้มเหลว:', error);
      }
    }

    /**
     * สลับบัญชี (บัญชีหลัก/บัญชีรอง)
     */
    switchAccount() {
      this.currentAccount.isMainAccount = !this.currentAccount.isMainAccount;
      this.saveAccountSettings();

      // อัปเดตค่าแสดงผลในตัวแก้ไขบริบท
      this.updateAccountStatusInContext();

      console.log('[Weibo Manager] สลับบัญชีแล้ว:', this.currentAccount.isMainAccount ? '大号' : '小号');
      return this.currentAccount.isMainAccount;
    }

    /**
     * ตั้งค่าชื่อผู้ใช้
     */
    setUsername(username, isMainAccount = null) {
      if (isMainAccount === null) {
        isMainAccount = this.currentAccount.isMainAccount;
      }

      if (isMainAccount) {
        this.currentAccount.mainAccountName = username || '{{user}}';
      } else {
        this.currentAccount.aliasAccountName = username || 'Alias';
      }

      this.saveAccountSettings();
      console.log('[Weibo Manager] อัปเดตชื่อผู้ใช้แล้ว:', {
        isMainAccount,
        username: isMainAccount ? this.currentAccount.mainAccountName : this.currentAccount.aliasAccountName,
      });
    }

    /**
     * รับชื่อผู้ใช้ปัจจุบัน
     */
    getCurrentUsername() {
      return this.currentAccount.isMainAccount
        ? this.currentAccount.mainAccountName
        : this.currentAccount.aliasAccountName;
    }

    /**
     * ตั้งค่าหน้าปัจจุบัน
     */
    setCurrentPage(page) {
      if (['hot', 'ranking', 'user'].includes(page)) {
        this.currentAccount.currentPage = page;
        this.saveAccountSettings();
        console.log('[Weibo Manager] ตั้งค่าหน้าปัจจุบันแล้ว:', page);
      }
    }

    /**
     * อัปเดตค่าแสดงผลสถานะบัญชีในตัวแก้ไขบริบท
     */
    async updateAccountStatusInContext() {
      try {
        if (!window.mobileContextEditor) {
          console.warn('[Weibo Manager] ตัวแก้ไขบริบทยังไม่พร้อม ไม่สามารถอัปเดตสถานะบัญชี');
          return;
        }

        const accountStatus = this.currentAccount.isMainAccount ? '大号' : '小号';
        const renderValue = `บัญชี Weibo ปัจจุบัน: ${accountStatus}`;

        // ต้องเรียกเมธอดของตัวแก้ไขบริบทเพื่อฉีดค่าแสดงผล
        // การใช้งานจริงต้องปรับตาม API ของตัวแก้ไขบริบท
        console.log('[Weibo Manager] ค่าแสดงผลสถานะบัญชี:', renderValue);
      } catch (error) {
        console.error('[Weibo Manager] อัปเดตสถานะบัญชีล้มเหลว:', error);
      }
    }

    /**
     * สร้างเนื้อหา Weibo
     */
    async generateWeiboContent(force = false) {
      // บันทึกแหล่งที่เรียก
      const caller = force ? 'สร้างด้วยตนเอง' : 'ตรวจสอบอัตโนมัติ';
      console.log(`[Weibo Manager] 📞 แหล่งที่เรียก: ${caller}`);

      // 🔧 ตรวจสอบการตั้งค่า API เพิ่มเติม - แก้ไขปัญหาป๊อปอัปต่อเนื่อง
      if (!this.isAPIConfigValid()) {
        const errorMsg = 'กรุณาตั้งค่า API ก่อน';
        console.warn(`[Weibo Manager] ❌ การตั้งค่า API ไม่ถูกต้อง: ${errorMsg}`);

        // หากเป็นการตรวจสอบอัตโนมัติ ล้มเหลวแบบเงียบ ไม่แสดงป๊อปอัป
        if (!force) {
          console.log('[Weibo Manager] โหมดตรวจสอบอัตโนมัติ API ไม่ถูกต้อง ข้ามแบบเงียบ ไม่แสดงป๊อปอัป');
          // ปิดใช้งาน auto-listener ชั่วคราว หลีกเลี่ยงการทริกเกอร์ต่อเนื่อง
          if (window.weiboAutoListener) {
            window.weiboAutoListener.disable();
            console.log('[Weibo Manager] ปิดใช้งาน auto-listener ชั่วคราวแล้ว หลีกเลี่ยงความล้มเหลวต่อเนื่อง');
          }
          return false;
        }

        // แสดงข้อผิดพลาดเฉพาะเมื่อสร้างด้วยตนเอง
        this.updateStatus(`สร้างล้มเหลว: ${errorMsg}`, 'error');
        if (window.showMobileToast) {
          window.showMobileToast(`❌ สร้าง Weibo ล้มเหลว: ${errorMsg}`, 'error');
        }
        return false;
      }

      // หากเป็นโหมดบังคับ หยุด auto-listener ทันที
      if (force && window.weiboAutoListener) {
        if (window.weiboAutoListener.isProcessingRequest) {
          console.log('[Weibo Manager] ⚠️ auto-listener กำลังประมวลผล แต่การสร้างแบบบังคับมีความสำคัญกว่า');
        }
        window.weiboAutoListener.isProcessingRequest = true;
        console.log('[Weibo Manager] 🚫 บล็อก auto-listener ไม่ให้รบกวนแล้ว');
      }

      // การป้องกันคำขอซ้ำอย่างเข้มงวด - เพิ่มความเข้ากันได้กับ Safari
      if (this.isProcessing) {
        console.log('[Weibo Manager] ตรวจพบกำลังประมวลผลอยู่ ตรวจสอบว่าเป็นปัญหาความเข้ากันได้ของ Safari หรือไม่...');

        // การจัดการความเข้ากันได้ Safari: หากเป็นโหมดบังคับ ให้โอกาสรีเซ็ตสถานะ
        if (force) {
          console.log('[Weibo Manager] 🍎 โหมดเข้ากันได้ Safari: บังคับรีเซ็ตสถานะ');
          this.isProcessing = false;
          if (window.weiboAutoListener) {
            window.weiboAutoListener.isProcessingRequest = false;
          }
          // ดำเนินการต่อ ไม่ return false
        } else {
          console.log('[Weibo Manager] กำลังประมวลผลอยู่ ข้ามคำขอซ้ำ');
          this.updateStatus('กำลังประมวลผล กรุณารอสักครู่...', 'warning');

          // หากเป็นโหมดบังคับ คืนค่าสถานะ auto-listener
          if (force && window.weiboAutoListener) {
            window.weiboAutoListener.isProcessingRequest = false;
          }
          return false;
        }
      }

      // หากเป็นโหมดบังคับ หยุด auto-listener ชั่วคราว
      let autoListenerPaused = false;
      if (force && window.weiboAutoListener && window.weiboAutoListener.isListening) {
        autoListenerPaused = true;
        // ตั้งค่าล็อกการประมวลผล บล็อก auto-listener ไม่ให้ทริกเกอร์
        window.weiboAutoListener.isProcessingRequest = true;
        console.log('[Weibo Manager] 🔄 หยุด auto-listener ชั่วคราว (ตั้งค่าล็อกการประมวลผล)');
      }

      // ตรวจสอบว่ามีการเปลี่ยนแปลงข้อความเพียงพอหรือไม่
      try {
        const chatData = await this.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.log('[Weibo Manager] ไม่มีข้อมูลแชท ข้ามการสร้าง');
          return false;
        }

        // ตรวจสอบจำนวนข้อความเพิ่มเฉพาะในโหมดไม่บังคับ
        if (!force) {
          // ตรวจสอบว่ามีข้อความใหม่เพียงพอหรือไม่
          const currentCount = chatData.messages.length;
          const increment = currentCount - this.lastProcessedCount;

          if (increment < this.currentSettings.threshold) {
            console.log(
              `[Weibo Manager] [ตรวจสอบอัตโนมัติ] จำนวนข้อความเพิ่มไม่เพียงพอ (${increment}/${this.currentSettings.threshold}) ข้ามการสร้าง`,
            );
            return false;
          }
        } else {
          console.log('[Weibo Manager] 🚀 โหมดสร้างแบบบังคับ ข้ามการตรวจสอบจำนวนข้อความเพิ่ม');
        }

        // เริ่มประมวลผล
        this.isProcessing = true;
        this.updateStatus('กำลังสร้างเนื้อหา Weibo...', 'info');

        const currentCount = chatData.messages.length;
        const increment = currentCount - this.lastProcessedCount;
        console.log(
          `[Weibo Manager] เริ่มสร้างเนื้อหา Weibo (จำนวนข้อความ: ${currentCount}, เพิ่ม: ${increment}, โหมดบังคับ: ${force})`,
        );

        // เรียก API สร้างเนื้อหา Weibo
        const weiboContent = await this.callWeiboAPI(chatData);
        if (!weiboContent) {
          throw new Error('API ส่งคืนเนื้อหาว่าง');
        }

        // อัปเดตอย่างปลอดภัยไปยังชั้น 1 ผ่านตัวแก้ไขบริบท (พร้อมตรวจสอบสถานะการสร้าง)
        const success = await this.safeUpdateContextWithWeibo(weiboContent);
        if (success) {
          this.updateStatus('เพิ่มเนื้อหา Weibo ไปยังชั้น 1 แล้ว', 'success');
          this.lastProcessedCount = currentCount;

          // ซิงค์ไปยัง auto-listener
          if (window.weiboAutoListener) {
            window.weiboAutoListener.lastProcessedMessageCount = currentCount;
          }

          // รีเฟรช UI ของ Weibo เพื่อแสดงเนื้อหาใหม่
          this.clearWeiboUICache();

          console.log(`[Weibo Manager] ✅ สร้างเนื้อหา Weibo สำเร็จ`);
          return true;
        } else {
          throw new Error('อัปเดตบริบทล้มเหลว');
        }
      } catch (error) {
        // 🔧 การจัดการข้อผิดพลาดเพิ่มเติม - ป้องกันป๊อปอัปต่อเนื่อง
        console.error('[Weibo Manager] สร้างเนื้อหา Weibo ล้มเหลว:', error);
        this.updateStatus(`สร้างล้มเหลว: ${error.message}`, 'error');

        // หากเป็นข้อผิดพลาดการตั้งค่า API ปิดใช้งาน auto-listener ชั่วคราวเพื่อหลีกเลี่ยงความล้มเหลวต่อเนื่อง
        if (error.message.includes('กรุณาตั้งค่า API') || error.message.includes('API')) {
          if (window.weiboAutoListener && !force) {
            window.weiboAutoListener.disable();
            console.log('[Weibo Manager] ข้อผิดพลาดการตั้งค่า API ปิดใช้งาน auto-listener ชั่วคราวแล้ว');
          }
        }

        // แสดงป๊อปอัปข้อผิดพลาดเฉพาะเมื่อสร้างด้วยตนเอง
        if (force && window.showMobileToast) {
          window.showMobileToast(`❌ สร้าง Weibo ล้มเหลว: ${error.message}`, 'error');
        } else if (!force) {
          console.log('[Weibo Manager] สร้างอัตโนมัติล้มเหลว ไม่แสดงป๊อปอัป หลีกเลี่ยงการรบกวนผู้ใช้');
        }

        // รีเซ็ตตัวนับการลองใหม่
        this.resetRetryConfig();

        console.log(
          '[Weibo Manager] ⏳ ยกเลิกการลองใหม่อัตโนมัติ จะรอจนกว่าเกณฑ์การเปลี่ยนแปลงชั้นครั้งถัดไปจะถึงแล้วลองใหม่',
        );
        return false;
      } finally {
        // ให้แน่ใจว่าสถานะถูกรีเซ็ต
        this.isProcessing = false;

        // คืนค่า auto-listener
        if (autoListenerPaused && force) {
          setTimeout(() => {
            if (window.weiboAutoListener) {
              window.weiboAutoListener.isProcessingRequest = false;
              console.log('[Weibo Manager] 🔄 คืนค่า auto-listener (ปลดล็อกการประมวลผล)');
            }
          }, 2000); // คืนค่าหลัง 2 วินาที ให้แน่ใจว่าการดำเนินการด้วยตนเองเสร็จ
        }

        // บังคับรีเซ็ตสถานะ ป้องกันการค้าง
        setTimeout(() => {
          if (this.isProcessing) {
            console.warn('[Weibo Manager] บังคับรีเซ็ตสถานะการประมวลผล');
            this.isProcessing = false;
          }
        }, 5000);

        // แจ้ง auto-listener ว่าประมวลผลเสร็จ
        if (window.weiboAutoListener) {
          window.weiboAutoListener.isProcessingRequest = false;
        }
      }
    }

    /**
     * รับข้อมูลแชทปัจจุบัน
     */
    async getCurrentChatData() {
      try {
        if (window.mobileContextEditor) {
          return window.mobileContextEditor.getCurrentChatData();
        } else if (window.MobileContext) {
          return await window.MobileContext.loadChatToEditor();
        } else {
          throw new Error('ตัวแก้ไขบริบทยังไม่พร้อม');
        }
      } catch (error) {
        console.error('[Weibo Manager] รับข้อมูลแชทล้มเหลว:', error);
        throw error;
      }
    }

    /**
     * ตรวจสอบว่าการตั้งค่า API ถูกต้องหรือไม่ (แก้ไขปัญหาการตรวจสอบ URL ของ Gemini)
     */
    isAPIConfigValid() {
      if (!window.mobileCustomAPIConfig) {
        console.warn('[Weibo Manager] ไม่พบ mobileCustomAPIConfig');
        return false;
      }

      const config = window.mobileCustomAPIConfig;
      const settings = config.currentSettings;

      // ตรวจสอบการตั้งค่าพื้นฐาน
      if (!settings.enabled) {
        console.warn('[Weibo Manager] API ยังไม่เปิดใช้งาน');
        return false;
      }

      if (!settings.model) {
        console.warn('[Weibo Manager] ยังไม่ได้เลือกโมเดล');
        return false;
      }

      // ตรวจสอบ API key (หากจำเป็น)
      const providerConfig = config.supportedProviders[settings.provider];
      if (providerConfig?.requiresKey && !settings.apiKey) {
        console.warn('[Weibo Manager] ขาด API key');
        return false;
      }

      // ตรวจสอบ API URL - แก้ไขปัญหาการตรวจสอบ URL ของ Gemini
      let apiUrl;
      if (settings.provider === 'gemini') {
        // Gemini ใช้ URL ในตัว
        apiUrl = config.geminiUrl || config.supportedProviders.gemini.defaultUrl;
      } else {
        // ผู้ให้บริการอื่นใช้ URL จากการตั้งค่า
        apiUrl = settings.apiUrl || providerConfig?.defaultUrl;
      }

      if (!apiUrl) {
        console.warn('[Weibo Manager] ขาด API URL');
        return false;
      }

      console.log('[Weibo Manager] ✅ ตรวจสอบการตั้งค่า API ผ่าน:', {
        provider: settings.provider,
        hasApiKey: !!settings.apiKey,
        hasModel: !!settings.model,
        hasUrl: !!apiUrl,
        enabled: settings.enabled,
      });

      return true;
    }

    /**
     * เรียก API ของ Weibo
     */
    async callWeiboAPI(chatData) {
      try {
        console.log('🚀 [Weibo API] ===== เริ่มสร้างเนื้อหา Weibo =====');

        // ใช้การตรวจสอบการตั้งค่า API แบบเพิ่มเติม
        if (!this.isAPIConfigValid()) {
          throw new Error('กรุณาตั้งค่า API ก่อน');
        }

        // สร้างข้อมูลบริบท
        const contextInfo = this.buildContextInfo(chatData);

        // รับพรอมต์สไตล์ (สร้างเนื้อหา Weibo ทันที)
        const stylePrompt = window.weiboStyles
          ? window.weiboStyles.getStylePrompt(
              'generate',
              this.currentAccount.isMainAccount,
              this.currentAccount.currentPage,
            )
          : '';

        console.log('📋 [Weibo API] พรอมต์ระบบ (สร้างเนื้อหา Weibo ทันที):');
        console.log(stylePrompt);
        console.log('\n📝 [Weibo API] เนื้อหาข้อความผู้ใช้:');
        console.log(`กรุณาสร้างเนื้อหา Weibo จากประวัติแชทต่อไปนี้:\n\n${contextInfo}`);

        // สร้างคำขอ API
        const messages = [
          {
            role: 'system',
            content: `${stylePrompt}\n\n🎯 【หมายเหตุพิเศษ】:\n- ให้ความสำคัญกับเนื้อหาที่ผู้ใช้โพสต์และตอบกลับ ซึ่งมีเครื่องหมาย⭐และคำอธิบายพิเศษ\n- สืบต่อสไตล์ภาษา ความชอบหัวข้อ และนิสัยการโต้ตอบของผู้ใช้\n- ให้เนื้อหา Weibo สะท้อนลักษณะการมีส่วนร่วมและรูปแบบพฤติกรรมของผู้ใช้\n- หากผู้ใช้มีมุมมองหรือความสนใจเฉพาะ กรุณาสะท้อนใน Weibo อย่างเหมาะสม`,
          },
          {
            role: 'user',
            content: `🎯 กรุณาสร้างเนื้อหา Weibo จากประวัติแชทต่อไปนี้ โดยเฉพาะรูปแบบการโพสต์และตอบกลับของผู้ใช้:\n\n${contextInfo}`,
          },
        ];

        console.log('📡 [Weibo API] คำขอ API ฉบับเต็ม:');
        console.log(JSON.stringify(messages, null, 2));

        // เรียก API
        const response = await window.mobileCustomAPIConfig.callAPI(messages, {
          temperature: 0.8,
          max_tokens: 2000,
        });

        console.log('📥 [Weibo API] เนื้อหาที่โมเดลส่งคืน:');
        console.log(response);

        if (response && response.content) {
          console.log('✅ [Weibo API] เนื้อหา Weibo ที่สร้างแล้ว:');
          console.log(response.content);
          console.log('🏁 [Weibo API] ===== สร้างเนื้อหา Weibo เสร็จสมบูรณ์ =====\n');
          return response.content;
        } else {
          throw new Error('รูปแบบที่ API ส่งคืนไม่ถูกต้อง');
        }
      } catch (error) {
        console.error('❌ [Weibo API] เรียก API ล้มเหลว:', error);
        console.log('🏁 [Weibo API] ===== สร้างเนื้อหา Weibo ล้มเหลว =====\n');
        throw error;
      }
    }

    /**
     * สร้างข้อมูลบริบท (ส่งเฉพาะ 5 ชั้นสุดท้ายและชั้น 1)
     */
    buildContextInfo(chatData) {
      let contextInfo = `ตัวละคร: ${chatData.characterName || 'ไม่ทราบ'}\n`;
      contextInfo += `จำนวนข้อความ: ${chatData.messages.length}\n`;
      contextInfo += `บัญชีปัจจุบัน: ${this.currentAccount.isMainAccount ? '大号' : '小号'}\n`;
      contextInfo += `ชื่อผู้ใช้ปัจจุบัน: ${this.getCurrentUsername()}\n`;
      contextInfo += `หน้าปัจจุบัน: ${this.currentAccount.currentPage}\n\n`;

      const messages = chatData.messages;
      const selectedMessages = [];

      // 1. หากมีชั้น 1 (ดัชนี 0) และมีเนื้อหา เพิ่มไปยังรายการที่เลือก
      if (messages.length > 0 && messages[0].mes && messages[0].mes.trim()) {
        let firstFloorContent = messages[0].mes;

        // ตรวจสอบว่ามีเนื้อหา Weibo หรือไม่
        const weiboRegex = /<!-- WEIBO_CONTENT_START -->([\s\S]*?)<!-- WEIBO_CONTENT_END -->/;
        const weiboMatch = firstFloorContent.match(weiboRegex);
        const hasWeiboContent = !!weiboMatch;

        // หากมีเนื้อหา Weibo ดึงเฉพาะเนื้อหาภายในเครื่องหมาย Weibo
        if (hasWeiboContent) {
          firstFloorContent = weiboMatch[1].trim(); // เก็บเฉพาะเนื้อหาภายในเครื่องหมาย
          console.log('📋 [สร้างบริบท] ชั้น 1: ดึงเนื้อหาเครื่องหมาย Weibo');
          console.log('เนื้อหาที่ดึง:', firstFloorContent);
        } else {
          console.log('📋 [สร้างบริบท] ชั้น 1: ไม่มีเครื่องหมาย Weibo เก็บเนื้อหาทั้งหมด');
        }

        selectedMessages.push({
          ...messages[0],
          mes: firstFloorContent,
          floor: 1,
          isFirstFloor: true,
          hasWeiboContent: hasWeiboContent,
        });
      }

      // 2. ดึง 3 ข้อความสุดท้าย (ไม่รวมชั้น 1 เพื่อหลีกเลี่ยงการซ้ำ)
      const lastThreeMessages = messages.slice(-3);
      lastThreeMessages.forEach((msg, index) => {
        // ข้ามชั้น 1 (ประมวลผลแล้วข้างบน)
        if (messages.indexOf(msg) !== 0) {
          selectedMessages.push({
            ...msg,
            floor: messages.indexOf(msg) + 1,
            isRecentMessage: true,
          });
        }
      });

      // 3. ลบรายการซ้ำและเรียงตามชั้น
      const uniqueMessages = [];
      const addedIndices = new Set();

      selectedMessages.forEach(msg => {
        const originalIndex = messages.findIndex(m => m === msg || (m.mes === msg.mes && m.is_user === msg.is_user));
        if (!addedIndices.has(originalIndex)) {
          addedIndices.add(originalIndex);
          uniqueMessages.push({
            ...msg,
            originalIndex,
          });
        }
      });

      // เรียงตามดัชนีเดิม
      uniqueMessages.sort((a, b) => a.originalIndex - b.originalIndex);

      // 4. วิเคราะห์รูปแบบการมีส่วนร่วมของผู้ใช้
      const userMessages = uniqueMessages.filter(msg => msg.is_user);
      const userWeiboPosts = [];
      const userReplies = [];

      userMessages.forEach(msg => {
        if (msg.isFirstFloor && msg.hasWeiboContent) {
          userWeiboPosts.push(msg);
        } else if (msg.mes && msg.mes.trim()) {
          userReplies.push(msg);
        }
      });

      // 5. สร้างเนื้อหาที่เน้นความสนใจ
      contextInfo += 'เนื้อหาบทสนทนาที่เลือก:\n';

      // ทำเครื่องหมายพิเศษสำหรับพฤติกรรมการมีส่วนร่วม Weibo ของผู้ใช้
      if (userWeiboPosts.length > 0 || userReplies.length > 0) {
        contextInfo += '\n⭐ 【จุดสนใจหลัก: รูปแบบการมีส่วนร่วม Weibo ของผู้ใช้】\n';

        if (userWeiboPosts.length > 0) {
          contextInfo += '👤 เนื้อหาที่ผู้ใช้โพสต์:\n';
          userWeiboPosts.forEach(msg => {
            contextInfo += `  📝 [โพสต์ของผู้ใช้] ${msg.mes}\n`;
          });
          contextInfo += '\n';
        }

        if (userReplies.length > 0) {
          contextInfo += '💬 เนื้อหาที่ผู้ใช้ตอบกลับ:\n';
          userReplies.forEach(msg => {
            contextInfo += `  💭 [ตอบกลับของผู้ใช้] ${msg.mes}\n`;
          });
          contextInfo += '\n';
        }

        contextInfo +=
          '⚠️ เมื่อสร้างเนื้อหา Weibo กรุณาให้ความสำคัญเป็นพิเศษกับการสืบต่อและสะท้อนสไตล์การโพสต์ ความชอบหัวข้อ และรูปแบบการโต้ตอบของผู้ใช้!\n\n';
      }

      contextInfo += 'บันทึกบทสนทนาฉบับเต็ม:\n';
      uniqueMessages.forEach(msg => {
        const speaker = msg.is_user ? '👤ผู้ใช้' : `🤖${chatData.characterName || 'ตัวละคร'}`;
        let floorInfo = '';
        let attentionMark = '';

        if (msg.isFirstFloor) {
          floorInfo = msg.hasWeiboContent ? '[ชั้น 1-มี Weibo]' : '[ชั้น 1]';
        } else if (msg.isRecentMessage) {
          floorInfo = '[ข้อความล่าสุด]';
        }

        // เพิ่มเครื่องหมายความสนใจพิเศษสำหรับข้อความของผู้ใช้
        if (msg.is_user) {
          attentionMark = '⭐ ';
        }

        contextInfo += `${attentionMark}${speaker}${floorInfo}: ${msg.mes}\n`;
      });

      console.log('📋 [สร้างบริบท] ===== สร้างข้อมูลบริบทเสร็จสมบูรณ์ =====');
      console.log(`[สร้างบริบท] จำนวนข้อความทั้งหมด: ${chatData.messages.length}`);
      console.log(`[สร้างบริบท] จำนวนข้อความที่เลือก: ${uniqueMessages.length}`);
      console.log(`[สร้างบริบท] รวมชั้น 1: ${uniqueMessages.some(m => m.isFirstFloor)}`);
      console.log(
        `[สร้างบริบท] ชั้น 1 มีเนื้อหา Weibo: ${uniqueMessages.some(m => m.isFirstFloor && m.hasWeiboContent)}`,
      );
      console.log(`[สร้างบริบท] จำนวนข้อความล่าสุด: ${uniqueMessages.filter(m => m.isRecentMessage).length}`);
      console.log('📝 [สร้างบริบท] ข้อมูลบริบทฉบับเต็มที่สร้าง:');
      console.log(contextInfo);
      console.log('🏁 [สร้างบริบท] ===== สร้างข้อมูลบริบทเสร็จสมบูรณ์ =====\n');

      return contextInfo;
    }

    /**
     * อัปเดตบริบทอย่างปลอดภัย (พร้อมตรวจสอบสถานะการสร้าง)
     */
    async safeUpdateContextWithWeibo(weiboContent) {
      try {
        console.log('[Weibo Manager] 🔒 เริ่มอัปเดตเนื้อหา Weibo ไปยังชั้น 1 อย่างปลอดภัย...');

        // ตรวจสอบว่ากำลังสร้างอยู่หรือไม่
        if (this.checkGenerationStatus()) {
          console.log('[Weibo Manager] ⚠️ ตรวจพบ SillyTavern กำลังสร้างการตอบกลับ เพิ่มเนื้อหาเข้าคิว...');
          return this.queueInsertion('weibo', weiboContent, { weiboContent });
        }

        return await this.updateContextWithWeibo(weiboContent);
      } catch (error) {
        console.error('[Weibo Manager] อัปเดตเนื้อหา Weibo อย่างปลอดภัยล้มเหลว:', error);
        return false;
      }
    }

    /**
     * อัปเดตไปยังชั้น 1 ผ่านตัวแก้ไขบริบท
     */
    async updateContextWithWeibo(weiboContent) {
      try {
        console.log('[Weibo Manager] เริ่มเพิ่มเนื้อหา Weibo ต่อท้ายชั้น 1...');

        // ให้แน่ใจว่าตัวแก้ไขบริบทพร้อมใช้งาน
        if (!window.mobileContextEditor) {
          throw new Error('ตัวแก้ไขบริบทยังไม่พร้อม');
        }

        // รับข้อมูลแชทปัจจุบัน
        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          throw new Error('ไม่มีข้อมูลแชทให้อัปเดต');
        }

        // สร้างรูปแบบเนื้อหา Weibo (ห่อด้วยเครื่องหมายพิเศษ)
        const weiboSection = `\n\n<!-- WEIBO_CONTENT_START -->\n【Weibo ยอดนิยม】\n\n${weiboContent}\n\n---\n[สร้างอัตโนมัติโดยตัวจัดการ Weibo]\n<!-- WEIBO_CONTENT_END -->`;

        // ตรวจสอบว่าชั้น 1 มีอยู่หรือไม่
        if (chatData.messages.length >= 1) {
          const firstMessage = chatData.messages[0];
          let originalContent = firstMessage.mes || '';

          // ตรวจสอบว่ามีเนื้อหา Weibo อยู่แล้วหรือไม่
          const existingWeiboRegex = /<!-- WEIBO_CONTENT_START -->[\s\S]*?<!-- WEIBO_CONTENT_END -->/;
          if (existingWeiboRegex.test(originalContent)) {
            // หากมีเนื้อหา Weibo อยู่แล้ว รวมเนื้อหาเก่าและใหม่อย่างชาญฉลาด
            console.log('[Weibo Manager] ตรวจพบเนื้อหา Weibo ที่มีอยู่ เริ่มรวมอย่างชาญฉลาด...');

            // ดึงเนื้อหา Weibo ที่มีอยู่
            const existingWeiboMatch = originalContent.match(existingWeiboRegex);
            const existingWeiboContent = existingWeiboMatch ? existingWeiboMatch[0] : '';

            // รวมเนื้อหา Weibo อย่างชาญฉลาด
            const mergedWeiboContent = await this.mergeWeiboContent(existingWeiboContent, weiboContent);

            // ลบเนื้อหา Weibo เก่า เก็บเนื้อหาอื่นไว้
            originalContent = originalContent.replace(existingWeiboRegex, '').trim();

            // ใช้เนื้อหาที่รวมแล้ว
            const mergedWeiboSection = `\n\n<!-- WEIBO_CONTENT_START -->\n【Weibo ยอดนิยม】\n\n${mergedWeiboContent}\n\n---\n[สร้างอัตโนมัติโดยตัวจัดการ Weibo]\n<!-- WEIBO_CONTENT_END -->`;

            // เพิ่มเนื้อหา Weibo ที่รวมแล้วต่อท้ายเนื้อหาเดิม
            const newContent = originalContent + mergedWeiboSection;

            // อัปเดตชั้น 1
            const success = await window.mobileContextEditor.modifyMessage(0, newContent);
            if (success) {
              console.log('[Weibo Manager] ✅ รวมเนื้อหา Weibo อย่างชาญฉลาดสำเร็จ');
              return true;
            } else {
              throw new Error('modifyMessage คืนค่า false');
            }
          }

          // เพิ่มเนื้อหา Weibo ใหม่ต่อท้ายเนื้อหาเดิม
          const newContent = originalContent + weiboSection;

          // อัปเดตชั้น 1
          const success = await window.mobileContextEditor.modifyMessage(0, newContent);
          if (success) {
            console.log('[Weibo Manager] ✅ เพิ่มเนื้อหา Weibo ต่อท้ายชั้น 1 สำเร็จ');
            return true;
          } else {
            throw new Error('modifyMessage คืนค่า false');
          }
        } else {
          // หากไม่มีข้อความ สร้างข้อความใหม่ (มีเฉพาะเนื้อหา Weibo)
          const messageIndex = await window.mobileContextEditor.addMessage(weiboSection.trim(), false, 'ระบบ Weibo');
          if (messageIndex >= 0) {
            console.log('[Weibo Manager] ✅ สร้างชั้น 1 ใหม่ (มีเนื้อหา Weibo) สำเร็จ');
            return true;
          } else {
            throw new Error('addMessage คืนค่าลบ');
          }
        }
      } catch (error) {
        console.error('[Weibo Manager] อัปเดตชั้น 1 ล้มเหลว:', error);
        return false;
      }
    }

    /**
     * รวมเนื้อหา Weibo อย่างชาญฉลาด
     */
    async mergeWeiboContent(existingWeiboContent, newWeiboContent) {
      try {
        console.log('[Weibo Manager] 🔄 เริ่มรวมเนื้อหา Weibo อย่างชาญฉลาด...');

        // ดึงเนื้อหา Weibo ที่มีอยู่ (ลบเครื่องหมาย)
        const existingContentMatch = existingWeiboContent.match(
          /<!-- WEIBO_CONTENT_START -->\s*【Weibo ยอดนิยม】\s*([\s\S]*?)\s*---\s*\[สร้างอัตโนมัติโดยตัวจัดการ Weibo\]\s*<!-- WEIBO_CONTENT_END -->/,
        );
        const existingContent = existingContentMatch ? existingContentMatch[1].trim() : '';

        console.log('[Weibo Manager] 📋 เนื้อหา Weibo ที่มีอยู่:');
        console.log(existingContent);
        console.log('[Weibo Manager] 📋 เนื้อหา Weibo ที่สร้างใหม่:');
        console.log(newWeiboContent);

        // แยกวิเคราะห์เนื้อหาที่มีอยู่
        const existingData = this.parseWeiboContent(existingContent);
        console.log('[Weibo Manager] 📊 แยกวิเคราะห์เนื้อหาที่มีอยู่:', existingData);

        // แยกวิเคราะห์เนื้อหาใหม่
        const newData = this.parseWeiboContent(newWeiboContent);
        console.log('[Weibo Manager] 📊 แยกวิเคราะห์เนื้อหาใหม่:', newData);
        console.log('[Weibo Manager] 📊 รายละเอียดคอมเมนต์เนื้อหาใหม่:', JSON.stringify(newData.comments, null, 2));

        // 🔧 แผนปรับปรุงเวอร์ชัน 5: ตรวจจับการเปลี่ยนแปลงประเภทข้อมูลพิเศษ
        const hasNewHotSearches = /\[热搜\|/.test(newWeiboContent);
        const hasNewRankings = /\[榜单\|/.test(newWeiboContent) || /\[榜单项\|/.test(newWeiboContent);
        const hasNewRankingPosts = /\[博文\|[^|]+\|r\d+\|/.test(newWeiboContent);
        const hasNewUserStats = /\[粉丝数\|/.test(newWeiboContent);

        console.log('[Weibo Manager] 🔍 ตรวจจับการเปลี่ยนแปลงข้อมูลพิเศษ:', {
          hasNewHotSearches,
          hasNewRankings,
          hasNewRankingPosts,
          hasNewUserStats,
        });

        // ตรรกะการรวม
        const mergedPosts = new Map();
        const mergedComments = new Map();
        let mergedRankingPosts = []; // โพสต์อันดับจัดการแยก

        // 1. เพิ่มโพสต์ที่มีอยู่ทั้งหมดก่อน (ไม่รวมโพสต์อันดับ)
        existingData.posts.forEach(post => {
          if (!post.id.startsWith('r')) {
            // ไม่ใช่โพสต์อันดับ
            mergedPosts.set(post.id, post);
            mergedComments.set(post.id, existingData.comments[post.id] || []);
          }
        });

        // 1.1 จัดการโพสต์อันดับที่มีอยู่
        if (!hasNewRankingPosts) {
          // หากไม่มีโพสต์อันดับใหม่ เก็บของเดิมไว้
          mergedRankingPosts = existingData.posts.filter(post => post.id.startsWith('r'));
          console.log('[Weibo Manager] 📊 เก็บโพสต์อันดับที่มีอยู่:', mergedRankingPosts.length, 'รายการ');
        }

        // 2. ประมวลผลเนื้อหาใหม่
        const currentTime = new Date();
        newData.posts.forEach(newPost => {
          if (newPost.id.startsWith('r')) {
            // โพสต์อันดับ: หากมีโพสต์อันดับใหม่ แทนที่ของเก่าทั้งหมด
            if (hasNewRankingPosts) {
              mergedRankingPosts.push(newPost);
              console.log(`[Weibo Manager] 📊 เพิ่มโพสต์อันดับใหม่: ${newPost.id}`);
            }
          } else {
            // โพสต์ทั่วไป: โหมดสะสม
            if (mergedPosts.has(newPost.id)) {
              // หากเป็นโพสต์ที่มีอยู่ ไม่เขียนทับ รวมเฉพาะคอมเมนต์
              console.log(`[Weibo Manager] 📝 พบเนื้อหาสำหรับโพสต์ที่มีอยู่ ${newPost.id} กำลังรวมคอมเมนต์...`);
            } else {
              // หากเป็นโพสต์ใหม่ เพิ่มโดยตรงและตั้งค่า timestamp ปัจจุบัน
              console.log(`[Weibo Manager] ✨ เพิ่มโพสต์ใหม่: ${newPost.id}`);
              newPost.timestamp = currentTime.toLocaleString();
              newPost.latestActivityTime = currentTime; // ตั้งเป็น Date object สำหรับการเรียงลำดับ
              mergedPosts.set(newPost.id, newPost);
              mergedComments.set(newPost.id, []);
            }
          }
        });

        // หากมีโพสต์อันดับใหม่ ล้างของเก่า
        if (hasNewRankingPosts && mergedRankingPosts.length > 0) {
          console.log('[Weibo Manager] ✅ แทนที่โพสต์อันดับแล้ว จำนวนใหม่:', mergedRankingPosts.length);
        }

        // 3. รวมคอมเมนต์ - แก้ไข: ประมวลผลคอมเมนต์ใหม่ทั้งหมด ไม่ใช่แค่คอมเมนต์ของโพสต์ใหม่
        // ประมวลผลคอมเมนต์ของโพสต์ใหม่ก่อน
        newData.posts.forEach(newPost => {
          const newPostComments = newData.comments[newPost.id] || [];
          const existingComments = mergedComments.get(newPost.id) || [];

          // รวมคอมเมนต์ หลีกเลี่ยงการซ้ำ
          const allComments = [...existingComments];
          newPostComments.forEach(newComment => {
            // ตรวจจับการซ้ำอย่างง่าย: ผู้เขียนเดียวกันและเนื้อหาคล้ายกัน
            const isDuplicate = allComments.some(
              existingComment =>
                existingComment.author === newComment.author &&
                existingComment.content.includes(newComment.content.substring(0, 20)),
            );

            if (!isDuplicate) {
              // ตั้งค่า timestamp ปัจจุบันสำหรับคอมเมนต์ใหม่ ให้แน่ใจว่าอยู่ด้านบน
              newComment.timestamp = currentTime.toLocaleString();
              newComment.sortTimestamp = currentTime.getTime(); // timestamp ตัวเลขสำหรับการเรียงลำดับ

              allComments.push(newComment);
              console.log(`[Weibo Manager] 💬 เพิ่มคอมเมนต์ใหม่ไปยังโพสต์ ${newPost.id}: ${newComment.author}`);

              // หากเป็นคอมเมนต์ใหม่สำหรับโพสต์ที่มีอยู่ อัปเดตเวลากิจกรรมล่าสุดของโพสต์
              if (mergedPosts.has(newPost.id)) {
                const existingPost = mergedPosts.get(newPost.id);
                existingPost.latestActivityTime = currentTime;
                existingPost.timestamp = currentTime.toLocaleString(); // อัปเดต timestamp ที่แสดงด้วย
                console.log(`[Weibo Manager] 📝 อัปเดตเวลากิจกรรมล่าสุดของโพสต์ ${newPost.id}`);
              }
            }
          });

          mergedComments.set(newPost.id, allComments);
        });

        // แก้ไข: ประมวลผลคอมเมนต์ใหม่สำหรับโพสต์ที่มีอยู่ (แม้ว่าเนื้อหาใหม่จะไม่มีโพสต์ที่ตรงกัน)
        Object.keys(newData.comments).forEach(postId => {
          // ข้ามโพสต์ใหม่ที่ประมวลผลแล้วข้างบน
          if (newData.posts.some(post => post.id === postId)) {
            return;
          }

          // ตรวจสอบว่า ID โพสต์นี้มีอยู่ในโพสต์ที่มีอยู่หรือไม่
          if (mergedPosts.has(postId)) {
            const newPostComments = newData.comments[postId] || [];
            const existingComments = mergedComments.get(postId) || [];

            console.log(
              `[Weibo Manager] 🔄 ประมวลผลคอมเมนต์ใหม่สำหรับโพสต์ที่มีอยู่ ${postId} จำนวน: ${newPostComments.length}`,
            );

            // รวมคอมเมนต์ หลีกเลี่ยงการซ้ำ
            const allComments = [...existingComments];
            newPostComments.forEach(newComment => {
              console.log(
                `[Weibo Manager] 🔍 ตรวจสอบคอมเมนต์ใหม่: ${newComment.author} - ${newComment.content.substring(0, 50)}...`,
              );

              // ตรวจจับการซ้ำอย่างง่าย: ผู้เขียนเดียวกันและเนื้อหาคล้ายกัน
              // หมายเหตุ: เนื้อหาในรูปแบบตอบกลับมักขึ้นต้นด้วย "ตอบกลับXXX:" ต้องจัดการพิเศษ
              const newContentForCheck = newComment.content.substring(0, 30);
              const isDuplicate = allComments.some(existingComment => {
                const authorMatch = existingComment.author === newComment.author;
                const contentMatch =
                  existingComment.content.includes(newContentForCheck) ||
                  newComment.content.includes(existingComment.content.substring(0, 20));
                console.log(`[Weibo Manager] 🔍 เปรียบเทียบคอมเมนต์:
                  ที่มีอยู่: ${existingComment.author} - ${existingComment.content.substring(0, 30)}...
                  ใหม่: ${newComment.author} - ${newContentForCheck}...
                  ผู้เขียนตรง: ${authorMatch}, เนื้อหาตรง: ${contentMatch}`);
                return authorMatch && contentMatch;
              });

              console.log(`[Weibo Manager] 🔍 ผลการตรวจจับซ้ำ: ${isDuplicate ? 'ซ้ำ' : 'ไม่ซ้ำ'}`);

              if (!isDuplicate) {
                // ตั้งค่า timestamp ปัจจุบันสำหรับคอมเมนต์ใหม่ ให้แน่ใจว่าอยู่ด้านบน
                newComment.timestamp = currentTime.toLocaleString();
                newComment.sortTimestamp = currentTime.getTime(); // timestamp ตัวเลขสำหรับการเรียงลำดับ

                allComments.push(newComment);
                console.log(`[Weibo Manager] 💬 เพิ่มคอมเมนต์ใหม่ไปยังโพสต์ที่มีอยู่ ${postId}: ${newComment.author}`);

                // อัปเดตเวลากิจกรรมล่าสุดของโพสต์
                const existingPost = mergedPosts.get(postId);
                existingPost.latestActivityTime = currentTime;
                existingPost.timestamp = currentTime.toLocaleString(); // อัปเดต timestamp ที่แสดงด้วย
                console.log(`[Weibo Manager] 📝 อัปเดตเวลากิจกรรมล่าสุดของโพสต์ ${postId}`);
              } else {
                console.log(`[Weibo Manager] ⚠️ ข้ามคอมเมนต์ซ้ำ: ${newComment.author}`);
              }
            });

            mergedComments.set(postId, allComments);
          } else {
            console.log(`[Weibo Manager] ⚠️ พบคอมเมนต์สำหรับโพสต์ ${postId} ที่ไม่มีอยู่ ข้าม`);
          }
        });

        // 4. จัดการการแทนที่แบบเพิ่มทีละน้อยของประเภทข้อมูลพิเศษ
        let finalHotSearches = existingData.hotSearches || [];
        let finalRankings = existingData.rankings || [];
        let finalUserStats = existingData.userStats;

        if (hasNewHotSearches && newData.hotSearches && newData.hotSearches.length > 0) {
          finalHotSearches = newData.hotSearches;
          console.log('[Weibo Manager] ✅ แทนที่ข้อมูลหัวข้อยอดนิยมแล้ว จำนวนใหม่:', finalHotSearches.length);
        }

        if (hasNewRankings && newData.rankings && newData.rankings.length > 0) {
          finalRankings = newData.rankings;
          console.log('[Weibo Manager] ✅ แทนที่ข้อมูลอันดับแล้ว จำนวนใหม่:', finalRankings.length);
        }

        if (hasNewUserStats && newData.userStats) {
          finalUserStats = newData.userStats;
          console.log(
            '[Weibo Manager] ✅ แทนที่ข้อมูลแฟนแล้ว - บัญชีหลัก:',
            finalUserStats.mainAccountFans,
            'บัญชีรอง:',
            finalUserStats.aliasAccountFans,
          );
        }

        // 5. สร้างเนื้อหา Weibo ใหม่ (รวมประเภทข้อมูลพิเศษ)
        const mergedContent = this.buildWeiboContent(
          mergedPosts,
          mergedComments,
          mergedRankingPosts,
          finalHotSearches,
          finalRankings,
          finalUserStats,
        );

        console.log('[Weibo Manager] ✅ รวมเนื้อหา Weibo เสร็จสมบูรณ์');
        console.log('[Weibo Manager] 📋 เนื้อหาหลังรวม:');
        console.log(mergedContent);

        return mergedContent;
      } catch (error) {
        console.error('[Weibo Manager] ❌ รวมเนื้อหา Weibo ล้มเหลว:', error);
        // หากรวมล้มเหลว คืนค่าเนื้อหาใหม่
        return newWeiboContent;
      }
    }

    /**
     * แยกวิเคราะห์เนื้อหา Weibo
     */
    parseWeiboContent(weiboContent) {
      const posts = [];
      const comments = {};

      if (!weiboContent || weiboContent.trim() === '') {
        return { posts, comments };
      }

      // แยกวิเคราะห์รูปแบบโพสต์: [博文|ชื่อเล่นผู้โพสต์|รหัสโพสต์|เนื้อหาโพสต์]
      const postRegex = /\[博文\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      // แยกวิเคราะห์รูปแบบคอมเมนต์: [评论|ชื่อเล่นผู้แสดงความคิดเห็น|รหัสโพสต์|เนื้อหาคอมเมนต์]
      const commentRegex = /\[评论\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      // แยกวิเคราะห์รูปแบบตอบกลับ: [回复|ชื่อเล่นผู้ตอบกลับ|รหัสโพสต์|ตอบกลับผู้แสดงความคิดเห็น:เนื้อหาตอบกลับ]
      const replyRegex = /\[回复\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

      let match;

      // แยกวิเคราะห์โพสต์
      let postIndex = 0;
      while ((match = postRegex.exec(weiboContent)) !== null) {
        // ตั้งค่า timestamp แบบเพิ่มทีละน้อยสำหรับโพสต์ที่มีอยู่ รักษาลำดับเดิม
        const baseTime = new Date('2024-01-01 10:00:00');
        const postTime = new Date(baseTime.getTime() + postIndex * 60000); // แต่ละโพสต์ห่างกัน 1 นาที

        const post = {
          id: match[2],
          author: match[1],
          content: match[3],
          timestamp: postTime.toLocaleString(),
          latestActivityTime: postTime, // เวลากิจกรรมเริ่มต้นเท่ากับเวลาโพสต์
        };

        posts.push(post);
        comments[post.id] = [];
        postIndex++;
      }

      // แยกวิเคราะห์คอมเมนต์ทั่วไป
      let commentIndex = 0;
      while ((match = commentRegex.exec(weiboContent)) !== null) {
        // ตั้งค่า timestamp แบบเพิ่มทีละน้อยสำหรับคอมเมนต์ที่มีอยู่ รักษาลำดับเดิม
        const baseTime = new Date('2024-01-01 11:00:00');
        const commentTime = new Date(baseTime.getTime() + commentIndex * 30000); // แต่ละคอมเมนต์ห่างกัน 30 วินาที

        const comment = {
          id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          postId: match[2],
          author: match[1],
          content: match[3],
          timestamp: commentTime.toLocaleString(),
          type: 'comment',
          replies: [],
        };

        // แก้ไข: ให้แน่ใจว่าอาร์เรย์คอมเมนต์มีอยู่ แม้ไม่มีโพสต์ที่ตรงกัน
        if (!comments[comment.postId]) {
          comments[comment.postId] = [];
        }

        comments[comment.postId].push(comment);
        console.log(`[Weibo Manager] 📝 แยกวิเคราะห์คอมเมนต์ไปยังโพสต์ ${comment.postId}: ${comment.author}`);

        // อัปเดตเวลากิจกรรมล่าสุดของโพสต์ที่ตรงกัน
        const post = posts.find(p => p.id === comment.postId);
        if (post && commentTime > post.latestActivityTime) {
          post.latestActivityTime = commentTime;
        }
        commentIndex++;
      }

      // แยกวิเคราะห์การตอบกลับ
      let replyIndex = 0;
      while ((match = replyRegex.exec(weiboContent)) !== null) {
        // ตั้งค่า timestamp แบบเพิ่มทีละน้อยสำหรับการตอบกลับที่มีอยู่
        const baseTime = new Date('2024-01-01 12:00:00');
        const replyTime = new Date(baseTime.getTime() + replyIndex * 15000); // แต่ละการตอบกลับห่างกัน 15 วินาที

        const reply = {
          id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          postId: match[2],
          author: match[1],
          content: match[3],
          timestamp: replyTime.toLocaleString(),
          type: 'reply',
        };

        // ค้นหาคอมเมนต์แม่และเพิ่มไปยังการตอบกลับ
        // แก้ไข: ให้แน่ใจว่าอาร์เรย์คอมเมนต์มีอยู่ แม้ไม่มีโพสต์ที่ตรงกัน
        if (!comments[reply.postId]) {
          comments[reply.postId] = [];
        }

        // จัดการอย่างง่าย: ถือว่าการตอบกลับเป็นคอมเมนต์ทั่วไป
        reply.type = 'comment';
        reply.replies = [];
        comments[reply.postId].push(reply);
        console.log(`[Weibo Manager] 📝 แยกวิเคราะห์การตอบกลับไปยังโพสต์ ${reply.postId}: ${reply.author}`);

        // อัปเดตเวลากิจกรรมล่าสุดของโพสต์ที่ตรงกัน
        const post = posts.find(p => p.id === reply.postId);
        if (post && replyTime > post.latestActivityTime) {
          post.latestActivityTime = replyTime;
        }
        replyIndex++;
      }

      // แยกวิเคราะห์ประเภทข้อมูลพิเศษ (หัวข้อยอดนิยม, อันดับ, ข้อมูลแฟน)
      const hotSearches = [];
      const rankings = [];
      let userStats = null;

      // แยกวิเคราะห์รูปแบบหัวข้อยอดนิยม: [热搜|อันดับ|ชื่อหัวข้อ|ค่าความนิยม]
      const hotSearchRegex = /\[热搜\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      let hotSearchMatch;
      while ((hotSearchMatch = hotSearchRegex.exec(weiboContent)) !== null) {
        hotSearches.push({
          rank: parseInt(hotSearchMatch[1]),
          title: hotSearchMatch[2],
          heat: hotSearchMatch[3],
        });
      }

      // แยกวิเคราะห์รูปแบบอันดับ: [榜单|ชื่ออันดับ|ประเภทอันดับ] และ [榜单项|อันดับ|ชื่อ|ค่าความนิยม]
      const rankingTitleRegex = /\[榜单\|([^|]+)\|([^\]]+)\]/g;
      const rankingItemRegex = /\[榜单项\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

      let rankingTitleMatch;
      while ((rankingTitleMatch = rankingTitleRegex.exec(weiboContent)) !== null) {
        rankings.push({
          title: rankingTitleMatch[1],
          type: rankingTitleMatch[2],
          items: [],
        });
      }

      let rankingItemMatch;
      while ((rankingItemMatch = rankingItemRegex.exec(weiboContent)) !== null) {
        const item = {
          rank: parseInt(rankingItemMatch[1]),
          name: rankingItemMatch[2],
          heat: rankingItemMatch[3],
        };

        // เพิ่มไปยังอันดับล่าสุด
        if (rankings.length > 0) {
          rankings[rankings.length - 1].items.push(item);
        }
      }

      // แยกวิเคราะห์รูปแบบจำนวนแฟน: [粉丝数|จำนวนแฟนบัญชีหลัก|จำนวนแฟนบัญชีรอง]
      const fansRegex = /\[粉丝数\|([^|]+)\|([^\]]+)\]/g;
      let fansMatch;
      while ((fansMatch = fansRegex.exec(weiboContent)) !== null) {
        userStats = {
          mainAccountFans: fansMatch[1], // จำนวนแฟนบัญชีหลัก
          aliasAccountFans: fansMatch[2], // จำนวนแฟนบัญชีรอง
          following: '100', // จำนวนติดตามคงที่
          posts: posts.length,
        };
        break; // ดึงเฉพาะจำนวนแฟนที่ตรงกันรายการแรก
      }

      return { posts, comments, hotSearches, rankings, userStats };
    }

    /**
     * สร้างเนื้อหา Weibo (รองรับประเภทข้อมูลพิเศษ)
     */
    buildWeiboContent(postsMap, commentsMap, rankingPosts = [], hotSearches = [], rankings = [], userStats = null) {
      let content = '';

      // คำนวณเวลากิจกรรมล่าสุดของแต่ละโพสต์ (รวมเวลาคอมเมนต์)
      const postsWithActivity = Array.from(postsMap.values()).map(post => {
        const postComments = commentsMap.get(post.id) || [];
        let latestActivityTime = new Date(post.timestamp);

        // ตรวจสอบเวลาของคอมเมนต์ทั้งหมด หาเวลาล่าสุด
        postComments.forEach(comment => {
          const commentTime = new Date(comment.timestamp);
          if (commentTime > latestActivityTime) {
            latestActivityTime = commentTime;
          }

          // ตรวจสอบเวลาของการตอบกลับ
          if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
              const replyTime = new Date(reply.timestamp);
              if (replyTime > latestActivityTime) {
                latestActivityTime = replyTime;
              }
            });
          }
        });

        return {
          ...post,
          latestActivityTime: latestActivityTime,
        };
      });

      // สร้างเนื้อหาประเภทข้อมูลพิเศษ
      // 1. ข้อมูลหัวข้อยอดนิยม
      if (hotSearches && hotSearches.length > 0) {
        hotSearches.forEach(hotSearch => {
          content += `[热搜|${hotSearch.rank}|${hotSearch.title}|${hotSearch.heat}]\n`;
        });
        content += '\n';
      }

      // 2. ข้อมูลอันดับ
      if (rankings && rankings.length > 0) {
        rankings.forEach(ranking => {
          content += `[榜单|${ranking.title}|${ranking.type}]\n`;
          if (ranking.items && ranking.items.length > 0) {
            ranking.items.forEach(item => {
              content += `[榜单项|${item.rank}|${item.name}|${item.heat}]\n`;
            });
          }
        });
        content += '\n';
      }

      // เรียงตามเวลากิจกรรมล่าสุด (โพสต์ที่มีกิจกรรมล่าสุดอยู่ก่อน)
      const allPosts = [...postsWithActivity];

      // เพิ่มโพสต์อันดับไปยังรายการเรียงลำดับ
      if (rankingPosts && rankingPosts.length > 0) {
        rankingPosts.forEach(rankingPost => {
          // ตั้งค่าเวลากิจกรรมสำหรับโพสต์อันดับ
          if (!rankingPost.latestActivityTime) {
            rankingPost.latestActivityTime = new Date(rankingPost.timestamp || new Date());
          }
          allPosts.push(rankingPost);
        });
      }

      const sortedPosts = allPosts.sort((a, b) => {
        return new Date(b.latestActivityTime) - new Date(a.latestActivityTime);
      });

      sortedPosts.forEach(post => {
        // เพิ่มโพสต์
        content += `[博文|${post.author}|${post.id}|${post.content}]\n\n`;

        // เพิ่มคอมเมนต์ (เรียงตามเวลา ใหม่สุดอยู่ก่อน)
        const postComments = commentsMap.get(post.id) || [];
        const sortedComments = postComments.sort((a, b) => {
          // ใช้ sortTimestamp สำหรับการเรียงลำดับ หากไม่มีให้ใช้ timestamp
          const aTime = a.sortTimestamp || new Date(a.timestamp).getTime();
          const bTime = b.sortTimestamp || new Date(b.timestamp).getTime();
          return bTime - aTime; // เรียงจากมากไปน้อย ใหม่สุดอยู่ก่อน
        });

        sortedComments.forEach(comment => {
          content += `[评论|${comment.author}|${comment.postId}|${comment.content}]\n`;

          // เพิ่มการตอบกลับ
          if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
              content += `[回复|${reply.author}|${reply.postId}|${reply.content}]\n`;
            });
          }
        });

        content += '\n';
      });

      // 3. ข้อมูลแฟน (วางไว้ท้ายสุด)
      if (userStats && (userStats.mainAccountFans || userStats.aliasAccountFans)) {
        const mainFans = userStats.mainAccountFans || '0';
        const aliasFans = userStats.aliasAccountFans || '0';
        content += `[粉丝数|${mainFans}|${aliasFans}]\n`;
      }

      return content.trim();
    }

    /**
     * ล้างเนื้อหา Weibo
     */
    async clearWeiboContent() {
      try {
        this.updateStatus('กำลังล้างเนื้อหา Weibo...', 'info');

        if (!window.mobileContextEditor) {
          throw new Error('ตัวแก้ไขบริบทยังไม่พร้อม');
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          throw new Error('ไม่มีข้อมูลให้ล้าง');
        }

        // ตรวจสอบว่าชั้น 1 มีเครื่องหมายเนื้อหา Weibo หรือไม่
        const firstMessage = chatData.messages[0];
        if (firstMessage && firstMessage.mes) {
          const originalContent = firstMessage.mes;
          const weiboRegex = /<!-- WEIBO_CONTENT_START -->[\s\S]*?<!-- WEIBO_CONTENT_END -->/;

          if (weiboRegex.test(originalContent)) {
            // ลบเครื่องหมายเนื้อหา Weibo และเนื้อหาที่อยู่ภายใน
            const cleanedContent = originalContent.replace(weiboRegex, '').trim();

            if (cleanedContent === '') {
              // หากข้อความว่างหลังล้างเนื้อหา Weibo ลบข้อความทั้งหมด
              const success = await window.mobileContextEditor.deleteMessage(0);
              if (success) {
                this.updateStatus('ล้างเนื้อหา Weibo แล้ว (ลบข้อความแล้ว)', 'success');
                console.log('[Weibo Manager] ✅ ล้างเนื้อหา Weibo ชั้น 1 แล้ว ลบข้อความแล้ว');
              } else {
                throw new Error('ลบข้อความว่างล้มเหลว');
              }
            } else {
              // หากยังมีเนื้อหาอื่น อัปเดตเฉพาะเนื้อหาข้อความ
              const success = await window.mobileContextEditor.modifyMessage(0, cleanedContent);
              if (success) {
                this.updateStatus('ล้างเนื้อหา Weibo แล้ว (เก็บเนื้อหาเดิมไว้)', 'success');
                console.log('[Weibo Manager] ✅ ล้างเนื้อหา Weibo ชั้น 1 แล้ว เก็บเนื้อหาเดิมไว้');
              } else {
                throw new Error('อัปเดตข้อความล้มเหลว');
              }
            }
          } else {
            this.updateStatus('ไม่พบเครื่องหมายเนื้อหา Weibo ในชั้น 1', 'warning');
            console.log('[Weibo Manager] ไม่พบเครื่องหมายเนื้อหา Weibo ในชั้น 1');
          }
        } else {
          this.updateStatus('ข้อความชั้น 1 ว่างเปล่า', 'warning');
        }

        // รีเซ็ตสถานะการประมวลผลทันที - เข้ากันได้กับ Safari
        this.isProcessing = false;

        // รีเซ็ตสถานะ auto-listener - ให้แน่ใจว่าจะไม่ถูกบล็อก
        if (window.weiboAutoListener) {
          window.weiboAutoListener.isProcessingRequest = false;
        }

        // รีเฟรช UI ของ Weibo เพื่อสะท้อนการเปลี่ยนแปลงข้อมูล
        this.clearWeiboUICache();

        console.log('[Weibo Manager] 🔄 ล้างเสร็จสมบูรณ์ รีเซ็ตสถานะแล้ว (เข้ากันได้กับ Safari)');
      } catch (error) {
        console.error('[Weibo Manager] ล้างเนื้อหา Weibo ล้มเหลว:', error);
        this.updateStatus(`ล้างล้มเหลว: ${error.message}`, 'error');

        // ให้แน่ใจว่าสถานะถูกรีเซ็ต - รีเซ็ตทันที ไม่พึ่ง setTimeout
        this.isProcessing = false;
        if (window.weiboAutoListener) {
          window.weiboAutoListener.isProcessingRequest = false;
        }
      } finally {
        // ความเข้ากันได้ Safari: รีเซ็ตทันทีแทนที่จะรีเซ็ตแบบหน่วงเวลา
        this.isProcessing = false;
        if (window.weiboAutoListener) {
          window.weiboAutoListener.isProcessingRequest = false;
        }

        // ประกันเพิ่มเติม: ยังคงเก็บการรีเซ็ตแบบหน่วงเวลาเป็นมาตรการสุดท้าย
        setTimeout(() => {
          this.isProcessing = false;
          if (window.weiboAutoListener) {
            window.weiboAutoListener.isProcessingRequest = false;
          }
          console.log('[Weibo Manager] 🛡️ รีเซ็ตสถานะแบบหน่วงเวลาเสร็จสมบูรณ์ (มาตรการสุดท้าย)');
        }, 500); // ลดเหลือ 500ms เพิ่มความเร็วในการตอบสนอง
      }
    }

    /**
     * รีเฟรช UI ของ Weibo
     */
    clearWeiboUICache() {
      try {
        // รีเฟรช UI ของ Weibo
        if (window.weiboUI && window.weiboUI.refreshWeiboList) {
          window.weiboUI.refreshWeiboList();
          console.log('[Weibo Manager] ✅ รีเฟรช UI ของ Weibo แล้ว');
        }

        // ล้างข้อมูลที่เกี่ยวกับ Weibo ใน localStorage (หากมี)
        const weiboDataKeys = ['mobile_weibo_posts', 'mobile_weibo_comments', 'mobile_weibo_cache'];

        weiboDataKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[Weibo Manager] ✅ ล้าง ${key} ใน localStorage แล้ว`);
          }
        });
      } catch (error) {
        console.warn('[Weibo Manager] เกิดคำเตือนขณะรีเฟรช UI ของ Weibo:', error);
      }
    }

    /**
     * อัปเดตการแสดงสถานะ
     */
    updateStatus(message, type = 'info') {
      console.log(`[Weibo Manager] อัปเดตสถานะ [${type}]: ${message}`);

      // หากมีองค์ประกอบแสดงสถานะ อัปเดตมัน
      const statusElement = document.getElementById('weibo-status');
      if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
      }
    }

    /**
     * อัปเดตสถานะการสร้าง (สำหรับ mobile-phone.js เรียกใช้)
     */
    updateGenerationStatus(message) {
      console.log(`[Weibo Manager] สถานะการสร้าง: ${message}`);
      this.updateStatus(message, 'info');
    }

    /**
     * ตรวจสอบสถานะการสร้าง
     */
    checkGenerationStatus() {
      // ที่นี่ควรตรวจสอบว่า SillyTavern กำลังสร้างอยู่หรือไม่
      // การใช้งานจริงต้องปรับตาม API ของ SillyTavern
      return false;
    }

    /**
     * เพิ่มเข้าคิว
     */
    queueInsertion(type, content, data) {
      this.pendingInsertions.push({
        type,
        content,
        data,
        timestamp: Date.now(),
      });
      console.log(`[Weibo Manager] เพิ่มเนื้อหาเข้าคิวแล้ว: ${type}`);
      return true;
    }

    /**
     * ประมวลผลคิวการแทรก
     */
    async processInsertionQueue() {
      if (this.pendingInsertions.length === 0) {
        return;
      }

      console.log(`[Weibo Manager] เริ่มประมวลผลคิวการแทรก ทั้งหมด ${this.pendingInsertions.length} รายการ`);

      while (this.pendingInsertions.length > 0) {
        const insertion = this.pendingInsertions.shift();
        try {
          await this.updateContextWithWeibo(insertion.content);
          console.log(`[Weibo Manager] ประมวลผลรายการคิวสำเร็จ: ${insertion.type}`);
        } catch (error) {
          console.error(`[Weibo Manager] ประมวลผลรายการคิวล้มเหลว: ${insertion.type}`, error);
        }
      }
    }

    /**
     * รอการสร้างเสร็จสมบูรณ์
     */
    async waitForGenerationComplete() {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.checkGenerationStatus()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);

        // การป้องกันหมดเวลา
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, this.maxWaitTime);
      });
    }

    /**
     * ส่งโพสต์ผู้ใช้ไปยัง API
     */
    async sendPostToAPI(content) {
      try {
        console.log('🚀 [Weibo API] ===== เริ่มส่งโพสต์ผู้ใช้ =====');

        // ใช้การตรวจสอบการตั้งค่า API แบบปรับปรุง
        if (!this.isAPIConfigValid()) {
          throw new Error('กรุณาตั้งค่า API ก่อน');
        }

        // สร้างข้อมูลบริบท
        const chatData = await this.getCurrentChatData();
        const contextInfo = this.buildContextInfo(chatData);

        // ดึง prompt สไตล์ (โพสต์ผู้ใช้)
        const stylePrompt = window.weiboStyles
          ? window.weiboStyles.getStylePrompt(
              'post',
              this.currentAccount.isMainAccount,
              this.currentAccount.currentPage,
            )
          : '';

        console.log('📋 [Weibo API] System prompt (โพสต์ผู้ใช้):');
        console.log(stylePrompt);
        console.log('\n📝 [Weibo API] เนื้อหาโพสต์ผู้ใช้:');
        console.log(content);

        // สร้างคำขอ API
        const messages = [
          {
            role: 'system',
            content: stylePrompt,
          },
          {
            role: 'user',
            content: `用户发布了一条微博：${content}\n\n请根据以下聊天记录生成相应的微博内容：\n\n${contextInfo}`,
          },
        ];

        console.log('📡 [Weibo API] คำขอ API ทั้งหมด:');
        console.log(JSON.stringify(messages, null, 2));

        // เรียก API
        const response = await window.mobileCustomAPIConfig.callAPI(messages, {
          temperature: 0.8,
          max_tokens: 2000,
        });

        console.log('📥 [Weibo API] เนื้อหาที่โมเดลส่งกลับ:');
        console.log(response);

        if (response && response.content) {
          console.log('✅ [Weibo API] สร้างโพสต์ผู้ใช้สำเร็จ:');
          console.log(response.content);

          // อัปเดตบริบท
          const success = await this.safeUpdateContextWithWeibo(response.content);
          if (success) {
            console.log('✅ [Weibo API] เพิ่มโพสต์ผู้ใช้ลงในบริบทแล้ว');
          }

          console.log('🏁 [Weibo API] ===== ส่งโพสต์ผู้ใช้เสร็จสมบูรณ์ =====\n');
          return response.content;
        } else {
          throw new Error('รูปแบบการตอบกลับ API ไม่ถูกต้อง');
        }
      } catch (error) {
        console.error('❌ [Weibo API] ส่งโพสต์ผู้ใช้ล้มเหลว:', error);
        console.log('🏁 [Weibo API] ===== ส่งโพสต์ผู้ใช้ล้มเหลว =====\n');
        throw error;
      }
    }

    /**
     * ส่งการตอบกลับผู้ใช้ไปยัง API
     */
    async sendReplyToAPI(replyContent) {
      try {
        console.log('🚀 [Weibo API] ===== เริ่มส่งการตอบกลับผู้ใช้ =====');

        // ใช้การตรวจสอบการตั้งค่า API แบบปรับปรุง
        if (!this.isAPIConfigValid()) {
          throw new Error('กรุณาตั้งค่า API ก่อน');
        }

        // สร้างข้อมูลบริบท
        const chatData = await this.getCurrentChatData();
        const contextInfo = this.buildContextInfo(chatData);

        // ดึง prompt สไตล์ (การตอบกลับผู้ใช้)
        const stylePrompt = window.weiboStyles
          ? window.weiboStyles.getStylePrompt(
              'reply',
              this.currentAccount.isMainAccount,
              this.currentAccount.currentPage,
            )
          : '';

        console.log('📋 [Weibo API] System prompt (การตอบกลับผู้ใช้):');
        console.log(stylePrompt);
        console.log('\n📝 [Weibo API] เนื้อหาการตอบกลับผู้ใช้:');
        console.log(replyContent);

        // สร้างคำขอ API
        const messages = [
          {
            role: 'system',
            content: stylePrompt,
          },
          {
            role: 'user',
            content: `用户发表了回复：${replyContent}\n\n请根据以下聊天记录生成相应的微博回复内容：\n\n${contextInfo}`,
          },
        ];

        console.log('📡 [Weibo API] คำขอ API ทั้งหมด:');
        console.log(JSON.stringify(messages, null, 2));

        // เรียก API
        const response = await window.mobileCustomAPIConfig.callAPI(messages, {
          temperature: 0.8,
          max_tokens: 1500,
        });

        console.log('📥 [Weibo API] เนื้อหาที่โมเดลส่งกลับ:');
        console.log(response);

        if (response && response.content) {
          console.log('✅ [Weibo API] สร้างการตอบกลับผู้ใช้สำเร็จ:');
          console.log(response.content);

          // อัปเดตบริบท
          const success = await this.safeUpdateContextWithWeibo(response.content);
          if (success) {
            console.log('✅ [Weibo API] เพิ่มการตอบกลับผู้ใช้ลงในบริบทแล้ว');
          }

          console.log('🏁 [Weibo API] ===== ส่งการตอบกลับผู้ใช้เสร็จสมบูรณ์ =====\n');
          return response.content;
        } else {
          throw new Error('รูปแบบการตอบกลับ API ไม่ถูกต้อง');
        }
      } catch (error) {
        console.error('❌ [Weibo API] ส่งการตอบกลับผู้ใช้ล้มเหลว:', error);
        console.log('🏁 [Weibo API] ===== ส่งการตอบกลับผู้ใช้ล้มเหลว =====\n');
        throw error;
      }
    }

    /**
     * ตรวจสอบว่าต้องสร้างเนื้อหา Weibo อัตโนมัติหรือไม่
     */
    async checkAutoGenerate() {
      // ตรวจสอบเงื่อนไขพื้นฐาน
      if (!this.currentSettings.autoUpdate || this.isProcessing) {
        return false;
      }

      // ตรวจสอบว่า auto-listener กำลังประมวลผลอยู่หรือไม่
      if (window.weiboAutoListener && window.weiboAutoListener.isProcessingRequest) {
        console.log('[Weibo Manager] Auto-listener กำลังประมวลผล ข้ามการตรวจสอบ');
        return false;
      }

      try {
        const chatData = await this.getCurrentChatData();
        if (!chatData || !chatData.messages) {
          return false;
        }

        const currentCount = chatData.messages.length;
        const increment = currentCount - this.lastProcessedCount;

        console.log(
          `[Weibo Manager] ตรวจสอบเงื่อนไขสร้างอัตโนมัติ: จำนวนข้อความปัจจุบัน=${currentCount}, ประมวลผลแล้ว=${this.lastProcessedCount}, เพิ่มขึ้น=${increment}, เกณฑ์=${this.currentSettings.threshold}`,
        );

        if (increment >= this.currentSettings.threshold) {
          console.log(`[Weibo Manager] ตรงเงื่อนไขสร้างอัตโนมัติ เริ่มสร้างเนื้อหา Weibo`);
          return await this.generateWeiboContent(false);
        }

        return false;
      } catch (error) {
        console.error('[Weibo Manager] ตรวจสอบการสร้างอัตโนมัติล้มเหลว:', error);
        return false;
      }
    }

    /**
     * ตรวจสอบว่าต้องลองใหม่หรือไม่ - ปิดใช้งานการลองใหม่อัตโนมัติแล้ว
     */
    shouldRetry(error) {
      // การลองใหม่อัตโนมัติถูกปิดใช้งานทั้งหมด คืนค่า false เสมอ
      console.log(
        `[Weibo Manager] ⏳ การลองใหม่อัตโนมัติถูกปิดใช้งาน จะรอจนกว่าจำนวนข้อความถึงเกณฑ์ครั้งถัดไปแล้วลองใหม่ ข้อผิดพลาด: ${error.message}`,
      );
      return false;
    }

    /**
     * กำหนดเวลาลองใหม่แบบหน่วงเวลา
     */
    scheduleRetry(force = false) {
      // อัปเดตการตั้งค่าลองใหม่
      this.retryConfig.currentRetryCount++;
      this.retryConfig.lastFailTime = Date.now();

      console.log(
        `[Weibo Manager] 🔄 กำหนดเวลาลองใหม่ครั้งที่ ${this.retryConfig.currentRetryCount} จะดำเนินการใน ${this.retryConfig.retryDelay / 1000} วินาที`,
      );

      // ตั้งค่าลองใหม่แบบหน่วงเวลา
      setTimeout(async () => {
        try {
          console.log(`[Weibo Manager] 🔄 เริ่มลองใหม่ครั้งที่ ${this.retryConfig.currentRetryCount}`);
          this.updateStatus(
            `กำลังลองสร้างเนื้อหา Weibo ใหม่... (${this.retryConfig.currentRetryCount}/${this.retryConfig.maxRetries})`,
            'info',
          );

          const success = await this.generateWeiboContent(force);
          if (success) {
            console.log(`[Weibo Manager] ✅ ลองใหม่ครั้งที่ ${this.retryConfig.currentRetryCount} สำเร็จ`);
            this.resetRetryConfig();
          }
        } catch (error) {
          console.error(`[Weibo Manager] ❌ ลองใหม่ครั้งที่ ${this.retryConfig.currentRetryCount} ล้มเหลว:`, error);
        }
      }, this.retryConfig.retryDelay);
    }

    /**
     * รีเซ็ตการตั้งค่าลองใหม่
     */
    resetRetryConfig() {
      this.retryConfig.currentRetryCount = 0;
      this.retryConfig.lastFailTime = null;
      console.log('[Weibo Manager] 🔄 รีเซ็ตการตั้งค่าลองใหม่แล้ว');
    }

    /**
     * เมื่อการตั้งค่า API ถูกแก้ไข เปิดใช้งาน auto-listener อีกครั้ง
     */
    enableAutoListenerIfConfigValid() {
      if (this.isAPIConfigValid() && window.weiboAutoListener && !window.weiboAutoListener.settings.enabled) {
        console.log('[Weibo Manager] 🔄 การตั้งค่า API ถูกแก้ไขแล้ว เปิดใช้งาน auto-listener อีกครั้ง');
        window.weiboAutoListener.enable();
      }
    }
  }

  // สร้าง instance ระดับ global - อ้างอิงการเริ่มต้นอัจฉริยะของ Forum-App
  if (typeof window !== 'undefined') {
    window.WeiboManager = WeiboManager;
    window.weiboManager = new WeiboManager();

    // การเริ่มต้นอัจฉริยะ: ตรวจสอบให้ตัวจัดการ Weibo เริ่มต้นหลังจากโมดูลที่ต้องพึ่งพาทั้งหมดโหลดเสร็จ
    function initializeWeiboManager() {
      if (window.weiboManager && !window.weiboManager.isInitialized) {
        console.log('[Weibo Manager] เริ่มต้นตัวจัดการ Weibo...');
        window.weiboManager.initialize();
      }
    }

    // เริ่มต้นแบบหน่วงเวลา รอโมดูลอื่นโหลดเสร็จ
    function delayedInitialization() {
      // ตรวจสอบว่า dependency สำคัญโหลดแล้วหรือไม่
      const contextEditorReady = window.mobileContextEditor !== undefined;
      const customAPIReady = window.mobileCustomAPIConfig !== undefined;
      const weiboStylesReady = window.weiboStyles !== undefined;

      // ข้อมูลดีบัก dependency โดยละเอียด
      console.log('[Weibo Manager] 🔍 ตรวจสอบ dependency โดยละเอียด:', {
        contextEditor: contextEditorReady,
        customAPI: customAPIReady,
        weiboStyles: weiboStylesReady,
        weiboStylesType: typeof window.weiboStyles,
        weiboStylesClass: typeof window.WeiboStyles,
        allWeiboKeys: Object.keys(window).filter(key => key.toLowerCase().includes('weibo')),
      });

      // หาก weiboStyles ไม่ถูกกำหนด ลองตรวจสอบว่ามีออบเจ็กต์ที่เกี่ยวข้องอื่นหรือไม่
      if (!weiboStylesReady) {
        console.log('[Weibo Manager] 🔍 weiboStyles ไม่ถูกกำหนด ตรวจสอบสาเหตุที่เป็นไปได้:');
        console.log('- คลาส window.WeiboStyles:', typeof window.WeiboStyles);

        // ลองสร้าง instance ด้วยตนเอง
        if (typeof window.WeiboStyles !== 'undefined') {
          console.log('[Weibo Manager] 🔧 ลองสร้าง instance weiboStyles ด้วยตนเอง');
          try {
            window.weiboStyles = new window.WeiboStyles();
            console.log('[Weibo Manager] ✅ สร้าง instance weiboStyles ด้วยตนเองสำเร็จ');
          } catch (error) {
            console.error('[Weibo Manager] ❌ สร้าง instance weiboStyles ด้วยตนเองล้มเหลว:', error);
          }
        }
      }

      // ตรวจสอบสถานะ dependency อีกครั้ง
      const finalWeiboStylesReady = window.weiboStyles !== undefined;

      if (contextEditorReady && customAPIReady && finalWeiboStylesReady) {
        // dependency ทั้งหมดพร้อมแล้ว เริ่มต้นทันที
        console.log('[Weibo Manager] ✅ dependency ทั้งหมดพร้อมแล้ว เริ่มต้นทันที');
        initializeWeiboManager();
      } else {
        // dependency ยังไม่พร้อม เริ่มต้นแบบหน่วงเวลา (ไม่แสดง log ล้นหน้าจอ)
        console.log('[Weibo Manager] ⏳ dependency ยังไม่พร้อมทั้งหมด เริ่มต้นแบบหน่วงเวลา');
        setTimeout(initializeWeiboManager, 2000); // เริ่มต้นหลัง 2 วินาที ให้ logic รอ dependency จัดการ
      }
    }

    // หาก DOM โหลดเสร็จแล้ว เริ่มต้นแบบหน่วงเวลา มิฉะนั้นรอ DOMContentLoaded
    if (document.readyState === 'loading') {
      console.log('[Weibo Manager] DOM กำลังโหลด รอ event DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(delayedInitialization, 1000); // ตรวจสอบ dependency หลัง DOM โหลดเสร็จ 1 วินาที
      });
    } else {
      console.log('[Weibo Manager] DOM โหลดเสร็จแล้ว เริ่มต้นแบบหน่วงเวลา');
      // ใช้ setTimeout เพื่อให้แน่ใจว่าโมดูลโหลดเสร็จสมบูรณ์ก่อนเริ่มต้น
      setTimeout(delayedInitialization, 1000);
    }

    console.log('[Weibo Manager] ✅ สร้างตัวจัดการ Weibo แล้ว');
  }
} // จบการตรวจสอบป้องกันการโหลดซ้ำ
