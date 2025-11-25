/**
 * Diary App - แอปไดอารี่
 * ให้ฟังก์ชันไดอารี่สำหรับ mobile-phone.js แสดงรายการสรุป
 */

// @ts-nocheck
// หลีกเลี่ยงการนิยามซ้ำ
if (typeof window.DiaryApp === 'undefined') {
  class DiaryApp {
    constructor() {
      this.diaryList = []; // รายการไดอารี่
      this.eventListenersSetup = false;

      this.init();
    }

    init() {
      console.log('[Diary App] เริ่มต้นแอปไดอารี่ - เวอร์ชัน 1.0');

      // อ่านข้อมูลไดอารี่จากตัวจัดการตัวแปรทันที
      this.parseDiariesFromContext();

      // เริ่มต้นการตรวจสอบแบบอะซิงโครนัส เพื่อไม่ให้บล็อกการเรนเดอร์หน้าจอ
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Diary App] การเริ่มต้นแอปไดอารี่เสร็จสมบูรณ์');
    }

    // ตั้งค่าการตรวจสอบบริบท
    setupContextMonitor() {
      console.log('[Diary App] ตั้งค่าการตรวจสอบบริบท...');
      this.setupSillyTavernEventListeners();
    }

    // รีเฟรชข้อมูลไดอารี่ด้วยตนเอง
    refreshDiariesData() {
      console.log('[Diary App] 🔄 รีเฟรชข้อมูลไดอารี่ด้วยตนเอง...');
      this.parseDiariesFromContext();
    }

    // ตั้งค่าตัวฟังเหตุการณ์ SillyTavern
    setupSillyTavernEventListeners() {
      // ป้องกันการตั้งค่าซ้ำ
      if (this.eventListenersSetup) {
        return;
      }

      try {
        // ฟังระบบเหตุการณ์ของ SillyTavern
        const eventSource = window['eventSource'];
        const event_types = window['event_types'];

        if (eventSource && event_types) {
          this.eventListenersSetup = true;

          const handleMessageReceived = () => {
            console.log('[Diary App] 📨 ได้รับเหตุการณ์ MESSAGE_RECEIVED รีเฟรชข้อมูลไดอารี่...');
            setTimeout(() => {
              // แยกวิเคราะห์ข้อมูลก่อน
              this.parseDiariesFromContext();

              // ถ้าแอปเปิดใช้งานอยู่ ให้บังคับรีเฟรช UI
              const appContent = document.getElementById('app-content');
              if (appContent && appContent.querySelector('.cd-diary-app')) {
                console.log('[Diary App] 🔄 บังคับรีเฟรช UI แอปไดอารี่...');
                appContent.innerHTML = this.getAppContent();
                this.bindEvents();
              }
            }, 500);
          };

          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
            console.log('[Diary App] ✅ ลงทะเบียนผู้ฟังเหตุการณ์ MESSAGE_RECEIVED แล้ว');
          }

          // ฟังเหตุการณ์การเปลี่ยนแชท
          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
              console.log('[Diary App] 📨 สลับการแชทแล้ว รีเฟรชข้อมูลไดอารี่...');
              setTimeout(() => {
                this.parseDiariesFromContext();
              }, 500);
            });
            console.log('[Diary App] ✅ ลงทะเบียนผู้ฟังเหตุการณ์ CHAT_CHANGED แล้ว');
          }

          // บันทึกการอ้างอิงเพื่อล้างข้อมูลในภายหลัง
          this.messageReceivedHandler = handleMessageReceived;
        } else {
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Diary App] ตั้งค่าตัวฟังเหตุการณ์ SillyTavern ล้มเหลว:', error);
      }
    }

    // แยกวิเคราะห์ข้อมูลไดอารี่จากบริบท
    parseDiariesFromContext() {
      try {
        // รับข้อมูลไดอารี่ปัจจุบัน
        const diaryData = this.getCurrentDiaryData();

        // อัปเดตรายการไดอารี่
        if (diaryData.diaries.length !== this.diaryList.length || this.hasDiariesChanged(diaryData.diaries)) {
          this.diaryList = diaryData.diaries;
          console.log('[Diary App] 📔 ข้อมูลไดอารี่อัปเดตแล้ว จำนวน:', this.diaryList.length);

          // อัปเดต UI เฉพาะเมื่อแอปไดอารี่แสดงอยู่
          if (this.isCurrentlyActive()) {
            console.log('[Diary App] 🎨 แอปไดอารี่ทำงานอยู่ อัปเดต UI...');
            this.updateAppContent();
          } else {
            console.log('[Diary App] 💤 แอปไดอารี่ไม่ได้ใช้งาน ข้อมูลอัปเดตแล้วแต่ UI รอการเรนเดอร์');
          }
        } else {
          console.log('[Diary App] 📊 ข้อมูลไดอารี่ไม่มีการเปลี่ยนแปลง ข้ามการอัปเดต');
        }
      } catch (error) {
        console.error('[Diary App] แยกวิเคราะห์ข้อมูลไดอารี่ล้มเหลว:', error);
      }
    }

    // ตรวจสอบว่าแอปไดอารี่กำลังทำงานอยู่หรือไม่
    isCurrentlyActive() {
      const appContent = document.getElementById('app-content');
      if (!appContent) return false;

      // ตรวจสอบว่ามีองค์ประกอบของแอปไดอารี่หรือไม่
      return appContent.querySelector('.cd-diary-app') !== null;
    }

    /**
     * รับข้อมูลสรุปจากตัวจัดการตัวแปร
     */
    getCurrentDiaryData() {
      try {
        // ใช้ Mvu Framework เพื่อรับตัวแปร
        if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
          // รับ ID ข้อความเป้าหมาย (ค้นหาขึ้นไปหาข้อความ AI ล่าสุด)
          let targetMessageId = 'latest';

          if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
            let currentId = window.getLastMessageId();

            // ค้นหาข้อความ AI ขึ้นไป (ข้ามข้อความผู้ใช้)
            while (currentId >= 0) {
              const message = window.getChatMessages(currentId).at(-1);
              if (message && message.role !== 'user') {
                targetMessageId = currentId;
                if (currentId !== window.getLastMessageId()) {
                  console.log(`[Diary App] 📝 ค้นหาพบข้อความ AI ที่ชั้น ${currentId}`);
                }
                break;
              }
              currentId--;
            }

            if (currentId < 0) {
              targetMessageId = 'latest';
              console.warn('[Diary App] ⚠️ ไม่พบข้อความ AI ใช้ชั้นสุดท้าย');
            }
          }

          console.log('[Diary App] ใช้ข้อความ ID:', targetMessageId);

          // รับตัวแปร
          const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
          console.log('[Diary App] รับข้อมูลตัวแปรจาก Mvu:', mvuData);
          console.log('[Diary App] stat_data มีอยู่:', !!mvuData?.stat_data);
          if (mvuData?.stat_data) {
            console.log('[Diary App] คีย์ของ stat_data:', Object.keys(mvuData.stat_data));
            // '摘要' แปลว่า สรุป/Abstract แต่ต้องคงภาษาจีนไว้ตามคีย์ข้อมูล
            console.log('[Diary App] มีข้อมูลสรุปหรือไม่:', !!mvuData.stat_data['摘要']);
            if (mvuData.stat_data['摘要']) {
              console.log('[Diary App] ข้อมูลดิบสรุป:', mvuData.stat_data['摘要']);
            }
          }

          // พยายามอ่านจาก stat_data
          if (mvuData && mvuData.stat_data && mvuData.stat_data['摘要']) {
            const summaryData = mvuData.stat_data['摘要'];
            console.log('[Diary App] ✅ รับข้อมูลสรุปจาก stat_data:', summaryData);
            return this.parseDiaryData(summaryData);
          }

          // พยายามอ่านจากระดับราก (root level)
          if (mvuData && mvuData['摘要']) {
            const summaryData = mvuData['摘要'];
            console.log('[Diary App] ✅ รับข้อมูลสรุปจากระดับราก:', summaryData);
            return this.parseDiaryData(summaryData);
          }
        }

        console.log('[Diary App] ไม่พบข้อมูลสรุป');
      } catch (error) {
        console.warn('[Diary App] รับข้อมูลสรุปล้มเหลว:', error);
      }

      return { diaries: [] };
    }

    /**
     * แยกวิเคราะห์ข้อมูลตัวแปรไดอารี่
     * โครงสร้างสรุปอาจเป็นหนึ่งในสองแบบนี้:
     * 1. [['$__META_EXTENSIBLE__$', {日期: 'YYYY-MM-DD', 内容: '...'}, ...], 'คำอธิบาย'] (รูปแบบมาตรฐาน Mvu)
     * 2. [{日期: 'YYYY-MM-DD', 内容: '...'}, ...] (รูปแบบอย่างง่าย)
     */
    parseDiaryData(summaryData) {
      const diaries = [];

      try {
        console.log('[Diary App] เริ่มแยกวิเคราะห์ข้อมูลสรุป:', summaryData);
        console.log('[Diary App] ประเภทข้อมูลสรุป:', typeof summaryData);
        console.log('[Diary App] เป็นอาร์เรย์หรือไม่:', Array.isArray(summaryData));

        if (!summaryData || !Array.isArray(summaryData)) {
          console.warn('[Diary App] รูปแบบข้อมูลสรุปไม่ถูกต้อง ไม่ใช่อาร์เรย์');
          return { diaries };
        }

        // พยายามตรวจสอบรูปแบบสรุป
        let summaryArray = summaryData;

        // ถ้าองค์ประกอบแรกเป็นอาร์เรย์ แสดงว่าเป็นรูปแบบมาตรฐาน Mvu [[...], 'คำอธิบาย']
        if (summaryData.length > 0 && Array.isArray(summaryData[0])) {
          console.log('[Diary App] ตรวจพบรูปแบบมาตรฐาน Mvu [[...], "คำอธิบาย"]');
          summaryArray = summaryData[0];
        } else {
          console.log('[Diary App] ตรวจพบรูปแบบอย่างง่าย [{...}, ...]');
        }

        if (!Array.isArray(summaryArray)) {
          console.warn('[Diary App] รูปแบบอาร์เรย์สรุปไม่ถูกต้อง');
          return { diaries };
        }

        console.log('[Diary App] ความยาวอาร์เรย์สรุป:', summaryArray.length);
        console.log('[Diary App] เนื้อหาอาร์เรย์สรุป:', summaryArray);

        // วนลูปสรุปทั้งหมด (ข้ามเครื่องหมาย '$__META_EXTENSIBLE__$')
        for (let i = 0; i < summaryArray.length; i++) {
          const item = summaryArray[i];

          // ข้ามเครื่องหมายส่วนขยาย
          if (item === '$__META_EXTENSIBLE__$') {
            console.log(`[Diary App] ข้ามเครื่องหมายส่วนขยาย ดัชนี ${i}`);
            continue;
          }

          if (item && typeof item === 'object') {
            // คีย์ '日期' (วันที่) และ '内容' (เนื้อหา) ต้องคงภาษาจีนไว้เพื่อให้ตรงกับข้อมูล
            const date = item['日期'] || item.date || 'ไม่ระบุวันที่';
            const content = item['内容'] || item.content || 'ไม่มีเนื้อหา';

            console.log(`[Diary App] แยกวิเคราะห์ไดอารี่ ${i}:`, { date, content: content.substring(0, 50) + '...' });

            diaries.push({
              id: `diary_${i}_${Date.now()}`,
              date: date,
              content: content,
              expanded: false, // ค่าเริ่มต้นคือย่อเก็บ
            });
          } else {
            console.log(`[Diary App] ข้ามองค์ประกอบที่ไม่ใช่วัตถุ ดัชนี ${i}:`, item);
          }
        }

        // เรียงลำดับตามวันที่จากใหม่ไปเก่า
        diaries.sort((a, b) => {
          if (a.date === 'ไม่ระบุวันที่') return 1;
          if (b.date === 'ไม่ระบุวันที่') return -1;
          return b.date.localeCompare(a.date);
        });

        console.log('[Diary App] แยกวิเคราะห์จากสรุปเสร็จสมบูรณ์ จำนวนไดอารี่:', diaries.length);
        if (diaries.length > 0) {
          console.log('[Diary App] ไดอารี่เรื่องแรก:', diaries[0]);
        }
      } catch (error) {
        console.error('[Diary App] แยกวิเคราะห์ข้อมูลไดอารี่ล้มเหลว:', error);
      }

      return { diaries };
    }

    // ตรวจสอบว่าไดอารี่มีการเปลี่ยนแปลงหรือไม่
    hasDiariesChanged(newDiaries) {
      if (newDiaries.length !== this.diaryList.length) {
        return true;
      }

      for (let i = 0; i < newDiaries.length; i++) {
        const newDiary = newDiaries[i];
        const oldDiary = this.diaryList[i];

        if (!oldDiary || newDiary.date !== oldDiary.date || newDiary.content !== oldDiary.content) {
          return true;
        }
      }

      return false;
    }

    // รับเนื้อหาแอป
    getAppContent() {
      console.log('[Diary App] รับเนื้อหาแอปไดอารี่');

      // แยกวิเคราะห์ข้อมูลใหม่ทุกครั้งที่เปิดแอป (เพื่อให้แน่ใจว่าแสดงเนื้อหาล่าสุด)
      const diaryData = this.getCurrentDiaryData();
      if (diaryData.diaries.length !== this.diaryList.length || this.hasDiariesChanged(diaryData.diaries)) {
        this.diaryList = diaryData.diaries;
        console.log('[Diary App] 📔 อัปเดตข้อมูลไดอารี่เมื่อเปิดแอป จำนวน:', this.diaryList.length);
      }

      return this.renderDiaryList();
    }

    // เรนเดอร์รายการไดอารี่
    renderDiaryList() {
      console.log('[Diary App] เรนเดอร์รายการไดอารี่...');

      if (!this.diaryList.length) {
        return `
          <div class="cd-diary-app">
            <div class="cd-diary-header">
              <div class="cd-diary-title">📔 ไดอารี่ของฉัน</div>
            </div>
            <div class="cd-diary-empty">
              <div class="cd-empty-icon">📖</div>
              <div class="cd-empty-title">ยังไม่มีไดอารี่</div>
              <div class="cd-empty-subtitle">เริ่มต้นการผจญภัยของคุณ บันทึกช่วงเวลาที่น่าประทับใจ</div>
            </div>
          </div>
        `;
      }

      const diaryItems = this.diaryList
        .map(
          diary => `
          <div class="cd-diary-item ${diary.expanded ? 'cd-expanded' : 'cd-collapsed'}" data-diary-id="${diary.id}">
            <div class="cd-diary-item-header" data-diary-id="${diary.id}">
              <div class="cd-diary-date">📅 ${diary.date}</div>
              <div class="cd-diary-toggle">${diary.expanded ? '▼' : '▶'}</div>
            </div>
            <div class="cd-diary-item-content ${diary.expanded ? 'cd-show' : 'cd-hide'}">
              <div class="cd-diary-content-text">${diary.content}</div>
            </div>
          </div>
        `,
        )
        .join('');

      return `
        <div class="cd-diary-app">
          <div class="cd-diary-header">
            <div class="cd-diary-title">📔 ไดอารี่ของฉัน</div>
            <div class="cd-diary-count">${this.diaryList.length} เรื่อง</div>
          </div>
          <div class="cd-diary-list">
            ${diaryItems}
          </div>
        </div>
      `;
    }

    // ผูกเหตุการณ์ (Events)
    bindEvents() {
      console.log('[Diary App] ผูกเหตุการณ์...');

      // ผูกเหตุการณ์คลิกรายการไดอารี่ (ขยาย/ย่อ)
      document.querySelectorAll('.cd-diary-item-header').forEach(header => {
        header.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const diaryId = e.currentTarget.getAttribute('data-diary-id');
          this.toggleDiary(diaryId);
        });
      });
    }

    // สลับสถานะขยาย/ย่อไดอารี่
    toggleDiary(diaryId) {
      const diary = this.diaryList.find(d => d.id === diaryId);
      if (!diary) return;

      diary.expanded = !diary.expanded;
      console.log(`[Diary App] สลับสถานะไดอารี่: ${diaryId}, expanded: ${diary.expanded}`);

      // อัปเดต UI
      this.updateAppContent();
    }

    // อัปเดตเนื้อหาแอป
    updateAppContent() {
      const appContent = document.getElementById('app-content');
      if (appContent) {
        appContent.innerHTML = this.getAppContent();
        this.bindEvents();
      }
    }
  }

  // สร้างอินสแตนซ์สากล
  window.DiaryApp = DiaryApp;
  window.diaryApp = new DiaryApp();
} // จบการตรวจสอบคลาส

// ฟังก์ชันสากลสำหรับให้ mobile-phone.js เรียกใช้
window.getDiaryAppContent = function () {
  console.log('[Diary App] รับเนื้อหาแอปไดอารี่');

  if (!window.diaryApp) {
    console.error('[Diary App] อินสแตนซ์ diaryApp ไม่มีอยู่');
    return '<div class="error-message">โหลดแอปไดอารี่ล้มเหลว</div>';
  }

  try {
    return window.diaryApp.getAppContent();
  } catch (error) {
    console.error('[Diary App] รับเนื้อหาแอปล้มเหลว:', error);
    return '<div class="error-message">รับเนื้อหาล้มเหลว</div>';
  }
};

window.bindDiaryAppEvents = function () {
  console.log('[Diary App] ผูกเหตุการณ์แอปไดอารี่');

  if (!window.diaryApp) {
    console.error('[Diary App] อินสแตนซ์ diaryApp ไม่มีอยู่');
    return;
  }

  try {
    window.diaryApp.bindEvents();
  } catch (error) {
    console.error('[Diary App] ผูกเหตุการณ์ล้มเหลว:', error);
  }
};

// ฟังก์ชันดีบัก
window.diaryAppDebugInfo = function () {
  if (window.diaryApp) {
    console.log('[Diary App Debug] จำนวนไดอารี่ปัจจุบัน:', window.diaryApp.diaryList.length);
    console.log('[Diary App Debug] รายการไดอารี่:', window.diaryApp.diaryList);
  }
};

// เริ่มต้น
console.log('[Diary App] โมดูลแอปไดอารี่โหลดเสร็จสมบูรณ์ - เวอร์ชัน 1.0');
