/**
 * Status App - แอปสถานะ
 * ให้ฟังก์ชันดูสถานะสำหรับ mobile-phone.js
 */

// @ts-nocheck
// ป้องกันการประกาศซ้ำ
if (typeof window.StatusApp === 'undefined') {
  class StatusApp {
    constructor() {
      this.currentView = 'user'; // 'user', 'npc'
      this.userData = null;
      this.npcList = [];
      this.eventListenersSetup = false;
      this.messageReceivedHandler = null;

      this.init();
    }

    init() {
      console.log('[Status App] เริ่มต้นแอปสถานะ - เวอร์ชัน 2.0');

      // อ่านข้อมูลสถานะจากตัวจัดการตัวแปรทันที
      this.parseStatusFromContext();

      // เริ่มต้นการตรวจสอบแบบ async เพื่อไม่ให้บล็อกการเรนเดอร์ UI
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Status App] เริ่มต้นแอปสถานะเสร็จสมบูรณ์');
    }

    // ตั้งค่าการตรวจสอบบริบท
    setupContextMonitor() {
      console.log('[Status App] ตั้งค่าการตรวจสอบบริบท...');
      this.setupSillyTavernEventListeners();
    }

    // รีเฟรชข้อมูลสถานะด้วยตนเอง
    refreshStatusData() {
      console.log('[Status App] 🔄 รีเฟรชข้อมูลสถานะด้วยตนเอง...');
      this.parseStatusFromContext();
    }

    // ตั้งค่า Event Listener ของ SillyTavern
    setupSillyTavernEventListeners() {
      if (this.eventListenersSetup) {
        return;
      }

      try {
        const eventSource = window['eventSource'];
        const event_types = window['event_types'];

        if (eventSource && event_types) {
          this.eventListenersSetup = true;

          const handleMessageReceived = () => {
            console.log('[Status App] 📨 ได้รับ event MESSAGE_RECEIVED รีเฟรชข้อมูลสถานะ...');
            setTimeout(() => {
              // แยกวิเคราะห์ข้อมูลก่อน
              this.parseStatusFromContext();

              // หากแอปอยู่ในสถานะใช้งาน บังคับรีเฟรช UI
              const appContent = document.getElementById('app-content');
              if (appContent && appContent.querySelector('.cd-status-app')) {
                console.log('[Status App] 🔄 บังคับรีเฟรช UI แอปสถานะ...');
                appContent.innerHTML = this.getAppContent();
                this.bindEvents();
              }
            }, 500);
          };

          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
            console.log('[Status App] ✅ ลงทะเบียน event MESSAGE_RECEIVED แล้ว');
          }

          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
              console.log('[Status App] 📨 แชทถูกเปลี่ยน รีเฟรชข้อมูลสถานะ...');
              setTimeout(() => {
                this.parseStatusFromContext();
              }, 500);
            });
            console.log('[Status App] ✅ ลงทะเบียน event CHAT_CHANGED แล้ว');
          }

          this.messageReceivedHandler = handleMessageReceived;
        } else {
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Status App] ตั้งค่า Event Listener ของ SillyTavern ล้มเหลว:', error);
      }
    }

    // แยกวิเคราะห์ข้อมูลสถานะจากบริบท
    parseStatusFromContext() {
      try {
        const statusData = this.getCurrentStatusData();
        this.userData = statusData.userData;
        this.npcList = statusData.npcList;
        console.log('[Status App] 📊 อัปเดตข้อมูลสถานะแล้ว');

        // อัปเดต UI เฉพาะเมื่อแอปสถานะกำลังแสดงอยู่
        if (this.isCurrentlyActive()) {
          console.log('[Status App] 🎨 แอปสถานะอยู่ในสถานะใช้งาน อัปเดต UI...');
          this.updateAppContent();
        } else {
          console.log('[Status App] 💤 แอปสถานะไม่ได้เปิดใช้งาน ข้อมูลอัปเดตแล้วแต่ UI จะเรนเดอร์ภายหลัง');
        }
      } catch (error) {
        console.error('[Status App] แยกวิเคราะห์ข้อมูลสถานะล้มเหลว:', error);
      }
    }

    // ตรวจสอบว่าแอปสถานะกำลังใช้งานอยู่หรือไม่
    isCurrentlyActive() {
      const appContent = document.getElementById('app-content');
      if (!appContent) return false;

      // ตรวจสอบว่ามี element เฉพาะของแอปสถานะหรือไม่
      return appContent.querySelector('.cd-status-container') !== null;
    }

    /**
     * ดึงข้อมูลสถานะจากตัวจัดการตัวแปร
     */
    getCurrentStatusData() {
      try {
        if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
          let targetMessageId = 'latest';

          if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
            let currentId = window.getLastMessageId();

            while (currentId >= 0) {
              const message = window.getChatMessages(currentId).at(-1);
              if (message && message.role !== 'user') {
                targetMessageId = currentId;
                break;
              }
              currentId--;
            }

            if (currentId < 0) {
              targetMessageId = 'latest';
            }
          }

          const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
          console.log('[Status App] ดึงข้อมูลตัวแปรจาก Mvu:', mvuData);
          console.log('[Status App] stat_data มีอยู่:', !!mvuData?.stat_data);
          if (mvuData?.stat_data) {
            console.log('[Status App] คีย์ของ stat_data:', Object.keys(mvuData.stat_data));
            console.log('[Status App] ข้อมูลผู้ใช้มีอยู่:', !!mvuData.stat_data['用户']);
            console.log('[Status App] ข้อมูล NPC มีอยู่:', !!mvuData.stat_data['NPC']);
            if (mvuData.stat_data['用户']) {
              console.log('[Status App] ข้อมูลผู้ใช้:', mvuData.stat_data['用户']);
            }
            if (mvuData.stat_data['NPC']) {
              console.log('[Status App] ข้อมูล NPC:', mvuData.stat_data['NPC']);
            }
          }

          let userData = null;
          let npcList = [];

          // ลองอ่านข้อมูลผู้ใช้จาก stat_data
          if (mvuData && mvuData.stat_data && mvuData.stat_data['用户']) {
            userData = this.parseUserData(mvuData.stat_data['用户']);
            console.log('[Status App] ✅ ดึงข้อมูลผู้ใช้จาก stat_data ได้:', userData);
          } else if (mvuData && mvuData['用户']) {
            userData = this.parseUserData(mvuData['用户']);
            console.log('[Status App] ✅ ดึงข้อมูลผู้ใช้จากระดับ root ได้:', userData);
          } else {
            console.warn('[Status App] ⚠️ ไม่พบข้อมูลผู้ใช้');
          }

          // ลองอ่านข้อมูล NPC จาก stat_data
          if (mvuData && mvuData.stat_data && mvuData.stat_data['NPC']) {
            npcList = this.parseNPCData(mvuData.stat_data['NPC']);
            console.log('[Status App] ✅ ดึงข้อมูล NPC จาก stat_data ได้ จำนวน:', npcList.length);
          } else if (mvuData && mvuData['NPC']) {
            npcList = this.parseNPCData(mvuData['NPC']);
            console.log('[Status App] ✅ ดึงข้อมูล NPC จากระดับ root ได้ จำนวน:', npcList.length);
          } else {
            console.warn('[Status App] ⚠️ ไม่พบข้อมูล NPC');
          }

          return { userData, npcList };
        }

        // วิธีสำรอง
        if (window.SillyTavern) {
          const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
          if (context && context.chatMetadata && context.chatMetadata.variables) {
            const userData = context.chatMetadata.variables['用户']
              ? this.parseUserData(context.chatMetadata.variables['用户'])
              : null;
            const npcList = context.chatMetadata.variables['NPC']
              ? this.parseNPCData(context.chatMetadata.variables['NPC'])
              : [];
            return { userData, npcList };
          }
        }

        console.log('[Status App] ไม่พบข้อมูลสถานะ');
      } catch (error) {
        console.warn('[Status App] ดึงข้อมูลสถานะล้มเหลว:', error);
      }

      return { userData: null, npcList: [] };
    }

    /**
     * แยกวิเคราะห์ข้อมูลผู้ใช้
     */
    parseUserData(userData) {
      if (!userData || typeof userData !== 'object') return null;

      const getValue = field => (userData[field] && Array.isArray(userData[field]) ? userData[field][0] : null);
      const getClothingValue = field => {
        const clothing = userData['当前着装'];
        if (!clothing || typeof clothing !== 'object') return '';
        const item = clothing[field];
        return item && Array.isArray(item) ? item[0] : '';
      };

      return {
        名称: getValue('名称') || '未知',
        货币: getValue('货币') || 0,
        性别: getValue('性别') || '未知',
        年龄: getValue('年龄') || 0,
        性经验: getValue('性经验') || '未知',
        身高: getValue('身高') || '未知',
        体重: getValue('体重') || '未知',
        性格: getValue('性格') || '未知',
        外貌描述: getValue('外貌描述') || '未知',
        当前着装: {
          头部: getClothingValue('头部'),
          耳朵: getClothingValue('耳朵'),
          上衣: getClothingValue('上衣'),
          下装: getClothingValue('下装'),
          内衣: getClothingValue('内衣'),
          内裤: getClothingValue('内裤'),
          袜子: getClothingValue('袜子'),
          鞋子: getClothingValue('鞋子'),
        },
      };
    }

    /**
     * แยกวิเคราะห์ข้อมูล NPC
     */
    parseNPCData(npcData) {
      if (!npcData || typeof npcData !== 'object') return [];

      const npcList = [];

      Object.keys(npcData).forEach(npcKey => {
        if (npcKey === '$meta') return;

        const npc = npcData[npcKey];
        if (!npc || typeof npc !== 'object') return;

        const getValue = field => (npc[field] && Array.isArray(npc[field]) ? npc[field][0] : null);
        const getClothingValue = field => {
          const clothing = npc['当前着装'];
          if (!clothing || typeof clothing !== 'object') return '';
          const item = clothing[field];
          return item && Array.isArray(item) ? item[0] : '';
        };

        // แยกวิเคราะห์ความทรงจำของตัวละคร
        const memories = [];
        const memoryData = npc['人物记忆'];
        if (memoryData && Array.isArray(memoryData) && memoryData[0] && Array.isArray(memoryData[0])) {
          const memoryArray = memoryData[0];
          memoryArray.forEach(memory => {
            if (memory && memory !== '$__META_EXTENSIBLE__$') {
              memories.push(memory);
            }
          });
        }

        npcList.push({
          id: npcKey,
          名称: getValue('名称') || npcKey,
          好友ID: getValue('好友ID') || '',
          性别: getValue('性别') || '未知',
          年龄: getValue('年龄') || 0,
          好感度: getValue('好感度') || 0,
          性经验: getValue('性经验') || '未知',
          身高: getValue('身高') || '未知',
          体重: getValue('体重') || '未知',
          性格: getValue('性格') || '未知',
          外貌描述: getValue('外貌描述') || '未知',
          内心想法: getValue('内心想法') || '',
          当前着装: {
            头部: getClothingValue('头部'),
            耳朵: getClothingValue('耳朵'),
            上衣: getClothingValue('上衣'),
            下装: getClothingValue('下装'),
            内衣: getClothingValue('内衣'),
            内裤: getClothingValue('内裤'),
            袜子: getClothingValue('袜子'),
            鞋子: getClothingValue('鞋子'),
          },
          人物记忆: memories,
        });
      });

      console.log('[Status App] แยกวิเคราะห์ NPC เสร็จ จำนวน:', npcList.length);
      return npcList;
    }

    // ดึงเนื้อหาแอป
    getAppContent() {
      // แยกวิเคราะห์ข้อมูลใหม่ทุกครั้งที่เปิดแอป (เพื่อให้แน่ใจว่าแสดงเนื้อหาล่าสุด)
      const statusData = this.getCurrentStatusData();
      this.userData = statusData.userData;
      this.npcList = statusData.npcList;
      console.log(
        '[Status App] 📊 อัปเดตข้อมูลสถานะเมื่อเปิดแอป ผู้ใช้:',
        !!this.userData,
        'จำนวน NPC:',
        this.npcList.length,
      );

      return `
        <div class="cd-status-app">
          ${this.renderTabs()}
          <div class="cd-status-content">
            ${this.currentView === 'user' ? this.renderUserStatus() : this.renderNPCList()}
          </div>
        </div>
      `;
    }

    // เรนเดอร์แท็บ
    renderTabs() {
      return `
        <div class="cd-status-tabs">
          <button class="cd-status-tab ${this.currentView === 'user' ? 'cd-active' : ''}" data-view="user">
            สถานะของฉัน
          </button>
          <button class="cd-status-tab ${this.currentView === 'npc' ? 'cd-active' : ''}" data-view="npc">
            สถานะ NPC (${this.npcList.length})
          </button>
        </div>
      `;
    }

    // เรนเดอร์สถานะผู้ใช้
    renderUserStatus() {
      if (!this.userData) {
        return `
          <div class="cd-status-empty">
            <div class="cd-empty-icon">👤</div>
            <div class="cd-empty-text">ยังไม่มีข้อมูลสถานะ</div>
          </div>
        `;
      }

      return `
        <div class="cd-user-status-card">
          <div class="cd-status-header">
            <div class="cd-status-avatar">👤</div>
            <div class="cd-status-name">${this.userData.名称}</div>
            <div class="cd-status-currency">💰 ${this.userData.货币}</div>
          </div>

          <div class="cd-info-section">
            <div class="cd-info-title">ข้อมูลพื้นฐาน</div>
            <div class="cd-info-grid">
              <div class="cd-info-item">
                <span class="cd-info-label">เพศ</span>
                <span class="cd-info-value">${this.userData.性别}</span>
              </div>
              <div class="cd-info-item">
                <span class="cd-info-label">อายุ</span>
                <span class="cd-info-value">${this.userData.年龄} ปี</span>
              </div>
              <div class="cd-info-item">
                <span class="cd-info-label">ส่วนสูง</span>
                <span class="cd-info-value">${this.userData.身高}</span>
              </div>
              <div class="cd-info-item">
                <span class="cd-info-label">น้ำหนัก</span>
                <span class="cd-info-value">${this.userData.体重}</span>
              </div>
              <div class="cd-info-item">
                <span class="cd-info-label">ประสบการณ์ทางเพศ</span>
                <span class="cd-info-value">${this.userData.性经验}</span>
              </div>
            </div>
          </div>

          <div class="cd-info-section">
            <div class="cd-info-title">บุคลิกภาพ</div>
            <div class="cd-info-text">${this.userData.性格}</div>
          </div>

          <div class="cd-info-section">
            <div class="cd-info-title">รูปลักษณ์</div>
            <div class="cd-info-text">${this.userData.外貌描述}</div>
          </div>

          <div class="cd-info-section">
            <div class="cd-info-title">การแต่งกายปัจจุบัน</div>
            <div class="cd-clothing-list">
              ${this.renderClothingItem('头部', this.userData.当前着装.头部, true)}
              ${this.renderClothingItem('耳朵', this.userData.当前着装.耳朵, true)}
              ${this.renderClothingItem('上衣', this.userData.当前着装.上衣, true)}
              ${this.renderClothingItem('下装', this.userData.当前着装.下装, true)}
              ${this.renderClothingItem('内衣', this.userData.当前着装.内衣, true)}
              ${this.renderClothingItem('内裤', this.userData.当前着装.内裤, true)}
              ${this.renderClothingItem('袜子', this.userData.当前着装.袜子, true)}
              ${this.renderClothingItem('鞋子', this.userData.当前着装.鞋子, true)}
            </div>
          </div>
        </div>
      `;
    }

    // เรนเดอร์รายการเสื้อผ้า (isUser=true หมายถึงสามารถสวม/ถอดได้)
    renderClothingItem(slot, item, isUser = false) {
      const isEmpty = !item || item.trim() === '';
      const displayText = isEmpty ? 'ไม่ได้สวมใส่' : item;

      if (isUser) {
        return `
          <div class="cd-clothing-item">
            <div class="cd-clothing-info">
              <span class="cd-clothing-slot">${slot}</span>
              <span class="cd-clothing-name ${isEmpty ? 'cd-empty' : ''}">${displayText}</span>
            </div>
            ${!isEmpty ? `<button class="cd-clothing-btn cd-remove" data-slot="${slot}">ถอด</button>` : ''}
          </div>
        `;
      } else {
        return `
          <div class="cd-clothing-item">
            <span class="cd-clothing-slot">${slot}</span>
            <span class="cd-clothing-name ${isEmpty ? 'cd-empty' : ''}">${displayText}</span>
          </div>
        `;
      }
    }

    // เรนเดอร์รายการ NPC
    renderNPCList() {
      if (!this.npcList.length) {
        return `
          <div class="cd-status-empty">
            <div class="cd-empty-icon">👥</div>
            <div class="cd-empty-text">ยังไม่มีข้อมูล NPC</div>
          </div>
        `;
      }

      const npcCards = this.npcList
        .map(npc => {
          const favorClass = this.getFavorClass(npc.好感度);

          return `
          <div class="cd-npc-card">
            <div class="cd-npc-header" data-npc-id="${npc.id}">
              <div class="cd-npc-avatar">🧑</div>
              <div class="cd-npc-name">${npc.名称}</div>
              <div class="cd-npc-favor ${favorClass}">💕 ${npc.好感度}</div>
                <div class="cd-npc-toggle">▶</div>
            </div>

            <div class="cd-npc-content cd-collapsed">
            <div class="cd-info-section cd-inner-thought-section">
              <div class="cd-info-title">💭 ความคิดในใจ</div>
              <div class="cd-inner-thought">${npc.内心想法 || 'ยังไม่มีความคิด'}</div>
            </div>
            ${
              npc.好友ID
                ? `<div class="cd-info-section">
              <div class="cd-info-title">ID เพื่อน</div>
              <div class="cd-friend-id">${npc.好友ID}</div>
            </div>`
                : ''
            }
            <div class="cd-info-section">
              <div class="cd-info-title">ข้อมูลพื้นฐาน</div>
              <div class="cd-info-grid">
                <div class="cd-info-item">
                  <span class="cd-info-label">เพศ</span>
                  <span class="cd-info-value">${npc.性别}</span>
                </div>
                <div class="cd-info-item">
                  <span class="cd-info-label">อายุ</span>
                  <span class="cd-info-value">${npc.年龄} ปี</span>
                </div>
                <div class="cd-info-item">
                  <span class="cd-info-label">ส่วนสูง</span>
                  <span class="cd-info-value">${npc.身高}</span>
                </div>
                <div class="cd-info-item">
                  <span class="cd-info-label">น้ำหนัก</span>
                  <span class="cd-info-value">${npc.体重}</span>
                </div>
                <div class="cd-info-item">
                  <span class="cd-info-label">ประสบการณ์ทางเพศ</span>
                  <span class="cd-info-value">${npc.性经验}</span>
                </div>
              </div>
            </div>

            <div class="cd-info-section">
              <div class="cd-info-title">บุคลิกภาพ</div>
              <div class="cd-info-text">${npc.性格}</div>
            </div>

            <div class="cd-info-section">
              <div class="cd-info-title">รูปลักษณ์</div>
              <div class="cd-info-text">${npc.外貌描述}</div>
            </div>

            <div class="cd-info-section">
              <div class="cd-info-title">การแต่งกายปัจจุบัน</div>
              <div class="cd-clothing-list">
                ${this.renderClothingItem('头部', npc.当前着装.头部, false)}
                ${this.renderClothingItem('耳朵', npc.当前着装.耳朵, false)}
                ${this.renderClothingItem('上衣', npc.当前着装.上衣, false)}
                ${this.renderClothingItem('下装', npc.当前着装.下装, false)}
                ${this.renderClothingItem('内衣', npc.当前着装.内衣, false)}
                ${this.renderClothingItem('内裤', npc.当前着装.内裤, false)}
                ${this.renderClothingItem('袜子', npc.当前着装.袜子, false)}
                ${this.renderClothingItem('鞋子', npc.当前着装.鞋子, false)}
              </div>
            </div>

            ${
              npc.人物记忆.length > 0
                ? `
              <div class="cd-info-section">
                <div class="cd-info-title">ความทรงจำของตัวละคร</div>
                <div class="cd-memory-list">
                  ${npc.人物记忆
                    .map(
                      memory => `
                    <div class="cd-memory-item">📝 ${memory}</div>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }
            </div>
          </div>
        `;
        })
        .join('');

      return `
        <div class="cd-npc-list">
          ${npcCards}
        </div>
      `;
    }

    // ดึงคลาสสไตล์ความชอบ
    getFavorClass(favor) {
      if (favor >= 60) return 'cd-favor-high';
      if (favor >= 20) return 'cd-favor-mid';
      if (favor >= -20) return 'cd-favor-neutral';
      if (favor >= -60) return 'cd-favor-low';
      return 'cd-favor-hostile';
    }

    // อัปเดตเนื้อหาแอป
    updateAppContent() {
      const appContent = document.getElementById('app-content');
      if (appContent) {
        appContent.innerHTML = this.getAppContent();
        this.bindEvents();
      }
    }

    // ผูก event
    bindEvents() {
      // สลับแท็บ
      document.querySelectorAll('.cd-status-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          const view = e.target.getAttribute('data-view');
          this.switchView(view);
        });
      });

      // ปุ่มถอดอุปกรณ์
      document.querySelectorAll('.cd-clothing-btn.cd-remove').forEach(btn => {
        btn.addEventListener('click', e => {
          const slot = e.target.getAttribute('data-slot');
          this.removeClothing(slot);
        });
      });

      // การ์ด NPC ขยาย/ย่อ
      document.querySelectorAll('.cd-npc-header').forEach(header => {
        header.addEventListener('click', e => {
          // หากคลิกที่ป้ายความชอบ ไม่ทริกเกอร์การขยาย/ย่อ
          if (e.target.classList.contains('cd-npc-favor')) {
            return;
          }

          const npcCard = header.closest('.cd-npc-card');
          const content = npcCard.querySelector('.cd-npc-content');
          const toggle = header.querySelector('.cd-npc-toggle');

          if (content.classList.contains('cd-expanded')) {
            content.classList.remove('cd-expanded');
            content.classList.add('cd-collapsed');
            toggle.textContent = '▶';
          } else {
            content.classList.remove('cd-collapsed');
            content.classList.add('cd-expanded');
            toggle.textContent = '▼';
          }
        });
      });
    }

    // ถอดอุปกรณ์ (และใส่ในกระเป๋า)
    async removeClothing(slot) {
      try {
        console.log('[Status App] ถอดอุปกรณ์:', slot);

        // ดึง ID ข้อความเป้าหมาย
        let targetMessageId = 'latest';
        if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
          let currentId = window.getLastMessageId();
          while (currentId >= 0) {
            const message = window.getChatMessages(currentId).at(-1);
            if (message && message.role !== 'user') {
              targetMessageId = currentId;
              break;
            }
            currentId--;
          }
        }

        // ดึงข้อมูล Mvu
        const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        if (!mvuData || !mvuData.stat_data) {
          throw new Error('ไม่สามารถดึงข้อมูลตัวแปร Mvu ได้');
        }

        // ดึงชื่ออุปกรณ์ปัจจุบัน
        const clothingItem = mvuData.stat_data['用户']?.['当前着装']?.[slot]?.[0];
        if (!clothingItem || clothingItem.trim() === '') {
          throw new Error('ตำแหน่งนี้ไม่มีอุปกรณ์');
        }

        console.log('[Status App] อุปกรณ์ที่ถอด:', clothingItem);

        // 1. ถอดอุปกรณ์ (ล้างช่องเสื้อผ้า)
        await window.Mvu.setMvuVariable(mvuData, `用户.当前着装.${slot}[0]`, '', {
          reason: `ถอด${slot}`,
          is_recursive: false,
        });

        // 2. ใส่ในกระเป๋า (ใส่ในหมวดหมู่ที่ตรงกับประเภทตำแหน่ง)
        const backpackCategory = this.mapSlotToBackpackCategory(slot);
        const backpackPath = `道具.${backpackCategory}`;
        const backpackItems = mvuData.stat_data['道具']?.[backpackCategory] || {};

        // สร้างออบเจ็กต์หมวดหมู่กระเป๋าใหม่
        const newBackpackCategory = { ...backpackItems };

        // ตรวจสอบว่ามีไอเท็มนี้อยู่แล้วหรือไม่
        if (newBackpackCategory[clothingItem]) {
          // มีไอเท็มอยู่แล้ว เพิ่มจำนวน
          const currentCount = newBackpackCategory[clothingItem]['数量']?.[0] || 0;
          newBackpackCategory[clothingItem] = {
            ...newBackpackCategory[clothingItem],
            数量: [currentCount + 1, newBackpackCategory[clothingItem]['数量']?.[1] || ''],
          };
          console.log('[Status App] มีไอเท็มอยู่แล้ว เพิ่มจำนวน:', clothingItem, 'จำนวนใหม่:', currentCount + 1);
        } else {
          // ไอเท็มใหม่ สร้างข้อมูล
          newBackpackCategory[clothingItem] = {
            名称: [clothingItem, ''],
            数量: [1, ''],
            效果: [`${slot}装备`, ''],
            品质: ['普通', ''],
          };
          console.log('[Status App] เพิ่มไอเท็มใหม่ในกระเป๋า:', clothingItem);
        }

        // ตั้งค่าทั้งหมวดหมู่ในครั้งเดียว
        await window.Mvu.setMvuVariable(mvuData, backpackPath, newBackpackCategory, {
          reason: `${clothingItem}ใส่ในกระเป๋า`,
          is_recursive: false,
        });

        // 3. ไม่บันทึกประวัติอีกต่อไป (ใช้สรุปที่ AI สร้างแทน)
        // การถอดอุปกรณ์จะปรากฏในสรุปของการตอบกลับ AI

        // บันทึกการอัปเดต
        await window.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: targetMessageId });

        console.log('[Status App] ✅ ถอดอุปกรณ์สำเร็จ ใส่ในกระเป๋าแล้ว');

        // รีเฟรชการแสดงผล (บังคับรีเฟรช UI)
        setTimeout(() => {
          this.parseStatusFromContext();
          // หากแอปสถานะกำลังใช้งานอยู่ บังคับรีเฟรช UI
          const appContent = document.getElementById('app-content');
          if (appContent && appContent.querySelector('.cd-status-app')) {
            console.log('[Status App] 🔄 บังคับรีเฟรช UI แอปสถานะ (หลังถอดอุปกรณ์)...');
            appContent.innerHTML = this.getAppContent();
            this.bindEvents();
          }
          // แจ้งกระเป๋าให้รีเฟรช
          if (window.backpackApp && typeof window.backpackApp.refreshItemsData === 'function') {
            window.backpackApp.refreshItemsData();
          }
        }, 300);
      } catch (error) {
        console.error('[Status App] ถอดอุปกรณ์ล้มเหลว:', error);
        alert('ถอดอุปกรณ์ล้มเหลว: ' + error.message);
      }
    }

    // แมปตำแหน่งอุปกรณ์ไปยังหมวดหมู่กระเป๋า
    mapSlotToBackpackCategory(slot) {
      const mapping = {
        头部: '装备',
        耳朵: '装备',
        上衣: '装备',
        下装: '装备',
        内衣: '装备',
        内裤: '装备',
        袜子: '装备',
        鞋子: '装备',
      };
      return mapping[slot] || '材料';
    }

    // สลับมุมมอง
    switchView(view) {
      this.currentView = view;
      this.updateAppContent();
    }

    // ทำลายแอป
    destroy() {
      console.log('[Status App] ทำลายแอป ล้างทรัพยากร');

      if (this.eventListenersSetup && this.messageReceivedHandler) {
        const eventSource = window['eventSource'];
        if (eventSource && eventSource.removeListener) {
          eventSource.removeListener('MESSAGE_RECEIVED', this.messageReceivedHandler);
          console.log('[Status App] 🗑️ ลบ event listener MESSAGE_RECEIVED แล้ว');
        }
      }

      this.eventListenersSetup = false;
      this.userData = null;
      this.npcList = [];
    }
  }

  // สร้าง instance ระดับ global
  window.StatusApp = StatusApp;
  window.statusApp = new StatusApp();
}

// ฟังก์ชัน global สำหรับ mobile-phone.js เรียกใช้
window.getStatusAppContent = function () {
  console.log('[Status App] ดึงเนื้อหาแอปสถานะ');

  if (!window.statusApp) {
    console.error('[Status App] instance statusApp ไม่มีอยู่');
    return '<div class="error-message">โหลดแอปสถานะล้มเหลว</div>';
  }

  try {
    return window.statusApp.getAppContent();
  } catch (error) {
    console.error('[Status App] ดึงเนื้อหาแอปล้มเหลว:', error);
    return '<div class="error-message">ดึงข้อมูลล้มเหลว</div>';
  }
};

window.bindStatusAppEvents = function () {
  console.log('[Status App] ผูก event แอปสถานะ');

  if (!window.statusApp) {
    console.error('[Status App] instance statusApp ไม่มีอยู่');
    return;
  }

  try {
    window.statusApp.bindEvents();
  } catch (error) {
    console.error('[Status App] ผูก event ล้มเหลว:', error);
  }
};

// ฟังก์ชันดีบัก
window.statusAppRefresh = function () {
  if (window.statusApp) {
    window.statusApp.refreshStatusData();
  }
};

window.statusAppDestroy = function () {
  if (window.statusApp) {
    window.statusApp.destroy();
    console.log('[Status App] แอปถูกทำลายแล้ว');
  }
};

window.statusAppDebugInfo = function () {
  if (window.statusApp) {
    console.log('[Status App Debug] ===== ข้อมูลดีบัก =====');
    console.log('[Status App Debug] มุมมองปัจจุบัน:', window.statusApp.currentView);
    console.log('[Status App Debug] ข้อมูลผู้ใช้:', window.statusApp.userData);
    console.log('[Status App Debug] รายการ NPC:', window.statusApp.npcList);
    console.log('[Status App Debug] จำนวน NPC:', window.statusApp.npcList.length);

    // ทดสอบการดึงตัวแปร
    console.log('[Status App Debug] ===== ทดสอบการดึงตัวแปร =====');
    console.log('[Status App Debug] เฟรมเวิร์ก Mvu มีอยู่:', !!window.Mvu);
    console.log('[Status App Debug] ฟังก์ชัน Mvu.getMvuData มีอยู่:', typeof window.Mvu?.getMvuData === 'function');
    console.log('[Status App Debug] ฟังก์ชัน getLastMessageId มีอยู่:', typeof window.getLastMessageId === 'function');
    console.log('[Status App Debug] ฟังก์ชัน getChatMessages มีอยู่:', typeof window.getChatMessages === 'function');

    if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
      try {
        let targetMessageId = 'latest';

        if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
          let currentId = window.getLastMessageId();
          console.log('[Status App Debug] ดัชนีข้อความล่าสุด:', currentId);

          // ค้นหาข้อความ AI ย้อนขึ้นไป
          let searchCount = 0;
          while (currentId >= 0 && searchCount < 20) {
            const message = window.getChatMessages(currentId).at(-1);
            console.log(
              `[Status App Debug] ตรวจสอบชั้นที่ ${currentId}:`,
              message ? `role=${message.role}` : 'ไม่มีข้อความ',
            );

            if (message && message.role !== 'user') {
              targetMessageId = currentId;
              console.log(`[Status App Debug] ✅ พบชั้นข้อความ AI: ${currentId} (ค้นหาย้อนขึ้น ${searchCount} ชั้น)`);
              break;
            }

            currentId--;
            searchCount++;
          }

          if (currentId < 0) {
            console.warn('[Status App Debug] ⚠️ ค้นหาย้อนขึ้นทุกชั้นเป็นข้อความผู้ใช้ ใช้ latest');
          }
        }

        console.log('[Status App Debug] ใช้ ID ข้อความ:', targetMessageId);

        // ทดสอบดึงตัวแปร Mvu
        const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        console.log('[Status App Debug] ข้อมูลตัวแปร Mvu:', mvuData);

        if (mvuData && mvuData.stat_data) {
          console.log('[Status App Debug] รายการตัวแปร stat_data:', Object.keys(mvuData.stat_data));

          if (mvuData.stat_data['用户']) {
            console.log('[Status App Debug] ข้อมูลผู้ใช้:', mvuData.stat_data['用户']);
          } else {
            console.warn('[Status App Debug] ❌ ไม่พบข้อมูลผู้ใช้');
          }

          if (mvuData.stat_data['NPC']) {
            const npcData = mvuData.stat_data['NPC'];
            console.log('[Status App Debug] ข้อมูล NPC:', npcData);
            const npcKeys = Object.keys(npcData).filter(k => k !== '$meta');
            console.log('[Status App Debug] รายการคีย์ NPC:', npcKeys);
            npcKeys.forEach(key => {
              console.log(`[Status App Debug] - NPC ${key}:`, npcData[key]);
            });
          } else {
            console.warn('[Status App Debug] ❌ ไม่พบข้อมูล NPC');
          }
        } else {
          console.error('[Status App Debug] ❌ stat_data ว่างเปล่าหรือไม่มีอยู่');
        }
      } catch (error) {
        console.error('[Status App Debug] ดึงตัวแปร Mvu ล้มเหลว:', error);
      }
    } else {
      console.warn('[Status App Debug] เฟรมเวิร์ก Mvu ยังไม่ถูกโหลด');
    }

    // ทดสอบ SillyTavern context (วิธีสำรอง)
    if (window.SillyTavern) {
      const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
      console.log('[Status App Debug] SillyTavern context มีอยู่:', !!context);
      if (context && context.chatMetadata) {
        console.log('[Status App Debug] chatMetadata มีอยู่:', !!context.chatMetadata);
        console.log('[Status App Debug] variables มีอยู่:', !!context.chatMetadata.variables);
        if (context.chatMetadata.variables) {
          console.log('[Status App Debug] รายการตัวแปร:', Object.keys(context.chatMetadata.variables));
        }
      }
    }
  }
};

// เริ่มต้น
console.log('[Status App] โหลดโมดูลแอปสถานะเสร็จสมบูรณ์ - เวอร์ชัน 2.0 (ข้อมูลละเอียด + ฟังก์ชันสวม/ถอด)');
console.log('[Status App] 💡 คำแนะนำดีบัก: รัน statusAppDebugInfo() ในคอนโซลเพื่อดูข้อมูลดีบักโดยละเอียด');
