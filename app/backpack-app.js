/**
 * Backpack App - แอปกระเป๋า
 * ให้ฟังก์ชันกระเป๋าสำหรับ mobile-phone.js
 * อิงจากลอจิกของ shop-app เฉพาะสำหรับจัดการไอเทมในกระเป๋า
 */

// @ts-nocheck
// หลีกเลี่ยงการกำหนดซ้ำ
if (typeof window.BackpackApp === 'undefined') {
  class BackpackApp {
    constructor() {
      this.items = [];
      this.contextMonitor = null;
      this.lastItemCount = 0;
      this.isAutoRenderEnabled = true;
      this.lastRenderTime = 0;
      this.renderCooldown = 1000;
      this.eventListenersSetup = false;
      this.contextCheckInterval = null;

      // คุณสมบัติที่เกี่ยวข้องกับหมวดหมู่และการค้นหา
      this.currentItemType = 'all'; // ประเภทไอเทมที่เลือกปัจจุบัน
      this.showCategories = false; // แสดงแถบหมวดหมู่หรือไม่
      this.showSearchBar = false; // แสดงแถบค้นหาหรือไม่
      this.searchQuery = ''; // คำค้นหา
      this.searchDebounceTimer = null; // timer debounce การค้นหา

      this.init();
    }

    init() {
      console.log('[Backpack App] เริ่มต้นแอปกระเป๋า - เวอร์ชัน 2.1 (รีเฟรชแบบ event-driven)');

      // แยกวิเคราะห์ข้อมูลกระเป๋าทันที
      this.parseItemsFromContext();

      // เริ่มต้นการมอนิเตอร์แบบ async เพื่อไม่บล็อกการเรนเดอร์ UI
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Backpack App] เริ่มต้นแอปกระเป๋าเสร็จ - เวอร์ชัน 2.1');
    }

    // ตั้งค่าการมอนิเตอร์บริบท
    setupContextMonitor() {
      console.log('[Backpack App] ตั้งค่าการมอนิเตอร์บริบท...');

      // ไม่ใช้การตรวจสอบตามเวลาอีกต่อไป ใช้เฉพาะ event listener
      // ฟังระบบอีเวนต์ของ SillyTavern（MESSAGE_RECEIVED และ CHAT_CHANGED）
      this.setupSillyTavernEventListeners();
    }

    // รีเฟรชข้อมูลกระเป๋าด้วยตนเอง（เรียกหลังจากดำเนินการตัวแปร）
    refreshItemsData() {
      console.log('[Backpack App] 🔄 รีเฟรชข้อมูลกระเป๋าด้วยตนเอง...');
      this.parseItemsFromContext();
    }

    // ตั้งค่า event listener ของ SillyTavern
    setupSillyTavernEventListeners() {
      // ป้องกันการตั้งค่าซ้ำ
      if (this.eventListenersSetup) {
        return;
      }

      try {
        // ฟังระบบอีเวนต์ของ SillyTavern
        const eventSource = window['eventSource'];
        const event_types = window['event_types'];

        if (eventSource && event_types) {
          this.eventListenersSetup = true;

          // สร้างฟังก์ชันรีเฟรชแบบหน่วง（รีเฟรชเฉพาะหลังรับข้อความ）
          const handleMessageReceived = () => {
            console.log('[Backpack App] 📨 ได้รับอีเวนต์ MESSAGE_RECEIVED รีเฟรชข้อมูลกระเป๋า...');
            setTimeout(() => {
              // แยกวิเคราะห์ข้อมูลก่อน
              this.parseItemsFromContext();

              // ถ้าแอปอยู่ในสถานะใช้งาน บังคับรีเฟรช UI
              const appContent = document.getElementById('app-content');
              if (appContent && appContent.querySelector('.backpack-item-list')) {
                console.log('[Backpack App] 🔄 บังคับรีเฟรช UI แอปกระเป๋า...');
                appContent.innerHTML = this.getAppContent();
                this.bindEvents();
              }
            }, 500);
          };

          // ฟังเฉพาะอีเวนต์รับข้อความ（หลัง AI ตอบ）
          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
            console.log('[Backpack App] ✅ ลงทะเบียน event listener MESSAGE_RECEIVED แล้ว');
          }

          // ฟังอีเวนต์เปลี่ยนแชท（เมื่อสลับบทสนทนา）
          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
              console.log('[Backpack App] 📨 แชทถูกสลับ รีเฟรชข้อมูลกระเป๋า...');
              setTimeout(() => {
                this.parseItemsFromContext();
              }, 500);
            });
            console.log('[Backpack App] ✅ ลงทะเบียน event listener CHAT_CHANGED แล้ว');
          }

          // บันทึกการอ้างอิงเพื่อทำความสะอาดภายหลัง
          this.messageReceivedHandler = handleMessageReceived;
        } else {
          // ลดความถี่ในการลองใหม่ จาก 2 วินาทีเป็น 5 วินาที
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Backpack App] ตั้งค่า event listener ของ SillyTavern ล้มเหลว:', error);
      }
    }

    // ฟังก์ชัน debounce
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // แยกวิเคราะห์ข้อมูลไอเทมกระเป๋าจากบริบท
    parseItemsFromContext() {
      try {
        // ดึงข้อมูลกระเป๋าปัจจุบัน
        const backpackData = this.getCurrentBackpackData();

        // อัปเดตรายการไอเทม
        if (backpackData.items.length !== this.items.length || this.hasItemsChanged(backpackData.items)) {
          this.items = backpackData.items;
          console.log('[Backpack App] 📦 อัปเดตข้อมูลกระเป๋าแล้ว จำนวนไอเทม:', this.items.length);

          // อัปเดต UI เฉพาะเมื่อแอปกระเป๋าแสดงอยู่
          if (this.isCurrentlyActive()) {
            console.log('[Backpack App] 🎨 แอปกระเป๋าอยู่ในสถานะใช้งาน อัปเดต UI...');
            this.updateItemList();
          } else {
            console.log('[Backpack App] 💤 แอปกระเป๋าไม่ได้ใช้งาน ข้อมูลอัปเดตแล้วแต่เลื่อนการเรนเดอร์ UI');
          }
        }
      } catch (error) {
        console.error('[Backpack App] แยกวิเคราะห์ข้อมูลไอเทมกระเป๋าล้มเหลว:', error);
      }
    }

    // ตรวจสอบว่าแอปกระเป๋าใช้งานอยู่หรือไม่
    isCurrentlyActive() {
      const appContent = document.getElementById('app-content');
      if (!appContent) return false;

      // ตรวจสอบว่ามีอิลิเมนต์เฉพาะของแอปกระเป๋าหรือไม่
      return appContent.querySelector('.backpack-item-list') !== null;
    }

    /**
     * ดึงข้อมูลกระเป๋าจากตัวจัดการตัวแปร（อ้างอิงเมธอด getCurrentShopData ของ shop-app）
     */
    getCurrentBackpackData() {
      try {
        // วิธีที่ 1: ใช้เฟรมเวิร์ก Mvu ดึงตัวแปร（เหมือน shop-app: ค้นหาขึ้นไปหาชั้นที่มีตัวแปร）
        if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
          // ดึง ID ข้อความเป้าหมาย（ค้นหาขึ้นไปหาข้อความ AI ล่าสุดที่มีตัวแปร）
          let targetMessageId = 'latest';

          if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
            let currentId = window.getLastMessageId();

            // ค้นหาข้อความ AI ขึ้นไป（ข้ามข้อความผู้ใช้）
            while (currentId >= 0) {
              const message = window.getChatMessages(currentId).at(-1);
              if (message && message.role !== 'user') {
                targetMessageId = currentId;
                if (currentId !== window.getLastMessageId()) {
                  console.log(`[Backpack App] 📝 ค้นหาขึ้นไปพบข้อความ AI ที่ชั้น ${currentId}`);
                }
                break;
              }
              currentId--;
            }

            if (currentId < 0) {
              targetMessageId = 'latest';
              console.warn('[Backpack App] ⚠️ ไม่พบข้อความ AI ใช้ชั้นสุดท้าย');
            }
          }

          console.log('[Backpack App] ใช้ ID ข้อความ:', targetMessageId);

          // ดึงตัวแปร
          const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
          console.log('[Backpack App] ดึงข้อมูลตัวแปรจาก Mvu:', mvuData);
          console.log('[Backpack App] stat_data มีอยู่:', !!mvuData?.stat_data);
          if (mvuData?.stat_data) {
            console.log('[Backpack App] คีย์ของ stat_data:', Object.keys(mvuData.stat_data));
            console.log('[Backpack App] 道具 มีอยู่หรือไม่:', !!mvuData.stat_data['道具']);
            if (mvuData.stat_data['道具']) {
              console.log('[Backpack App] ข้อมูล 道具:', mvuData.stat_data['道具']);
            }
          }

          // พยายามอ่านจาก stat_data
          if (mvuData && mvuData.stat_data && mvuData.stat_data['道具']) {
            const backpackData = mvuData.stat_data['道具'];
            console.log('[Backpack App] ✅ ดึงข้อมูลไอเทมจาก stat_data:', backpackData);
            return this.parseBackpackData(backpackData);
          }

          // พยายามอ่านจากระดับราก（ถ้าตัวแปรไม่อยู่ใน stat_data）
          if (mvuData && mvuData['道具']) {
            const backpackData = mvuData['道具'];
            console.log('[Backpack App] ✅ ดึงข้อมูลไอเทมจากระดับราก:', backpackData);
            return this.parseBackpackData(backpackData);
          }

          // ถ้า stat_data ว่างแต่ variables มีอยู่ พยายามดึงจาก variables
          if (mvuData && !mvuData.stat_data && window.SillyTavern) {
            const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
            if (context && context.chatMetadata && context.chatMetadata.variables) {
              const stat_data = context.chatMetadata.variables['stat_data'];
              if (stat_data && stat_data['道具']) {
                console.log('[Backpack App] ดึงข้อมูลไอเทมจาก variables.stat_data');
                return this.parseBackpackData(stat_data['道具']);
              }
            }
          }
        }

        // วิธีที่ 2: พยายามดึงจากบริบทของ SillyTavern（สำรอง）
        if (window.SillyTavern) {
          const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
          if (context && context.chatMetadata && context.chatMetadata.variables) {
            // พยายามดึงจาก variables.stat_data
            const stat_data = context.chatMetadata.variables['stat_data'];
            if (stat_data && stat_data['道具']) {
              console.log('[Backpack App] ดึงข้อมูลไอเทมจาก context.chatMetadata.variables.stat_data');
              return this.parseBackpackData(stat_data['道具']);
            }

            // พยายามดึงจาก variables โดยตรง
            const backpackData = context.chatMetadata.variables['道具'];
            if (backpackData && typeof backpackData === 'object') {
              console.log('[Backpack App] ดึงข้อมูลไอเทมจาก context.chatMetadata.variables');
              return this.parseBackpackData(backpackData);
            }
          }
        }

        console.log('[Backpack App] ไม่พบข้อมูลไอเทม');
      } catch (error) {
        console.warn('[Backpack App] ดึงข้อมูลกระเป๋าล้มเหลว:', error);
      }

      return { items: [] };
    }

    /**
     * แยกวิเคราะห์ข้อมูลตัวแปรกระเป๋า（อ่านหมวดหมู่ทั้งหมดแบบไดนามิก）
     * โครงสร้างไอเทม：{ 消耗品: {...}, 装备: {...}, 材料: {...}, ... }
     * โครงสร้างแต่ละไอเทม：{ 名称: [ค่า, ''], 数量: [ค่า, ''], 效果: [ค่า, ''], 品质: [ค่า, ''], ... }
     */
    parseBackpackData(backpackData) {
      const items = [];

      try {
        // วนซ้ำหมวดหมู่ทั้งหมดแบบไดนามิก（ไม่กำหนดล่วงหน้า อ่านคีย์ทั้งหมดในข้อมูลโดยตรง）
        Object.keys(backpackData).forEach(category => {
          // ข้ามเมตาดาต้า
          if (category === '$meta') return;

          const categoryData = backpackData[category];
          if (!categoryData || typeof categoryData !== 'object') return;

          // วนซ้ำไอเทมทั้งหมดในหมวดหมู่นี้
          Object.keys(categoryData).forEach(itemKey => {
            // ข้ามเมตาดาต้า
            if (itemKey === '$meta') return;

            const item = categoryData[itemKey];
            if (!item || typeof item !== 'object') return;

            // ดึงข้อมูลไอเทม（รูปแบบตัวแปร：[ค่า, คำอธิบาย]）
            const getName = field => (item[field] && Array.isArray(item[field]) ? item[field][0] : '');
            const getNumber = field => {
              const val = item[field] && Array.isArray(item[field]) ? item[field][0] : 0;
              return typeof val === 'number' ? val : parseFloat(val) || 0;
            };

            const name = getName('名称') || itemKey;
            const quantity = getNumber('数量');

            // ข้ามไอเทมที่ไม่ถูกต้อง（ไม่มีชื่อหรือจำนวนเป็น 0）
            if (!name || quantity <= 0) return;

            // ลองฟิลด์คำอธิบายหลายตัว
            const description =
              getName('效果') || getName('描述') || getName('作用') || getName('说明') || 'ยังไม่มีคำอธิบาย';
            const quality = getName('品质') || 'ธรรมดา';

            const newItem = {
              id: `${category}_${itemKey}_${Date.now()}`,
              name: name,
              type: category, // ใช้หมวดหมู่เป็นประเภท
              description: description,
              quantity: quantity,
              image: this.getItemImage(category),
              quality: quality, // คุณภาพ
              category: category, // หมวดหมู่ดั้งเดิม
              itemKey: itemKey, // บันทึกชื่อคีย์สำหรับอัปเดตภายหลัง
              timestamp: new Date().toLocaleString(),
            };

            items.push(newItem);
          });
        });

        console.log('[Backpack App] แยกวิเคราะห์ไอเทมเสร็จ จำนวนไอเทม:', items.length);
        if (items.length > 0) {
          console.log('[Backpack App] หมวดหมู่ไอเทม:', [...new Set(items.map(i => i.type))]);
        }
      } catch (error) {
        console.error('[Backpack App] แยกวิเคราะห์ข้อมูลไอเทมล้มเหลว:', error);
      }

      return { items };
    }

    /**
     * แยกวิเคราะห์เนื้อหากระเป๋าจากข้อความแบบเรียลไทม์（เก็บไว้เป็นวิธีสำรอง）
     */
    parseBackpackContent(content) {
      const items = [];

      // แยกวิเคราะห์รูปแบบกระเป๋า: [背包|ชื่อสินค้า|ประเภทสินค้า|คำอธิบายสินค้า|จำนวน]（'背包' เป็นตัวระบุคงที่）
      const itemRegex = /\[背包\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\]]+)\]/g;

      let itemMatch;
      while ((itemMatch = itemRegex.exec(content)) !== null) {
        const [fullMatch, name, type, description, quantity] = itemMatch;

        // ตรวจสอบว่ามีไอเทมเดียวกันอยู่แล้วหรือไม่（ตัดสินจากชื่อและประเภท）
        const existingItem = items.find(p => p.name.trim() === name.trim() && p.type.trim() === type.trim());

        if (existingItem) {
          // ถ้ามีอยู่แล้ว สะสมจำนวน
          existingItem.quantity += parseInt(quantity.trim()) || 1;
        } else {
          const newItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            type: type.trim(),
            description: description.trim(),
            quantity: parseInt(quantity.trim()) || 1,
            image: this.getItemImage(type.trim()),
            timestamp: new Date().toLocaleString(),
          };
          items.push(newItem);
        }
      }

      console.log('[Backpack App] แยกวิเคราะห์เสร็จ จำนวนไอเทม:', items.length);
      return { items };
    }

    // ตรวจสอบว่าไอเทมมีการเปลี่ยนแปลงหรือไม่（วิธีเปรียบเทียบที่มีประสิทธิภาพมากขึ้น）
    hasItemsChanged(newItems) {
      if (newItems.length !== this.items.length) {
        return true;
      }

      for (let i = 0; i < newItems.length; i++) {
        const newItem = newItems[i];
        const oldItem = this.items[i];

        if (
          !oldItem ||
          newItem.name !== oldItem.name ||
          newItem.type !== oldItem.type ||
          newItem.description !== oldItem.description ||
          newItem.quantity !== oldItem.quantity
        ) {
          return true;
        }
      }

      return false;
    }

    // ดึงรูปภาพไอเทม（รองรับหมวดหมู่ไอเทม）
    getItemImage(type) {
      const imageMap = {
        // หมวดหมู่ระบบมือถือ
        消耗品: '💊',
        装备: '⚔️',
        材料: '📦',
        道具: '✨',
        // หมวดหมู่ Xuanjian Xianzu
        灵资: '💎',
        法器: '⚔️',
        杂物: '📦',
        功法: '📜',
        法术: '✨',
        丹药: '💊',
        // หมวดหมู่ทั่วไปอื่นๆ
        食品: '🍎',
        食物: '🍎',
        饮料: '🥤',
        服装: '👔',
        数码: '📱',
        家居: '🏠',
        美妆: '💄',
        运动: '⚽',
        图书: '📚',
        玩具: '🧸',
        音乐: '🎵',
        工具: '🔧',
        武器: '⚔️',
        药品: '💊',
        宝石: '💎',
        钥匙: '🔑',
        金币: '🪙',
        默认: '📦',
      };
      return imageMap[type] || imageMap['默认'];
    }

    // ดึงข้อมูลแชท
    getChatData() {
      try {
        // ใช้ mobileContextEditor ดึงข้อมูลเป็นอันดับแรก
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            return chatData.messages;
          }
        }

        // พยายามดึงจากตัวแปรทั่วไป
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        // พยายามดึงจากตำแหน่งอื่นที่เป็นไปได้
        const SillyTavern = window['SillyTavern'];
        if (SillyTavern && SillyTavern.chat) {
          return SillyTavern.chat;
        }

        return [];
      } catch (error) {
        console.error('[Backpack App] ดึงข้อมูลแชทล้มเหลว:', error);
        return [];
      }
    }

    // ดึงเนื้อหาแอป
    getAppContent() {
      // แยกวิเคราะห์ข้อมูลใหม่ทุกครั้งที่เปิดแอป（ให้แน่ใจว่าแสดงเนื้อหาล่าสุด）
      const backpackData = this.getCurrentBackpackData();
      if (backpackData.items.length !== this.items.length || this.hasItemsChanged(backpackData.items)) {
        this.items = backpackData.items;
        console.log('[Backpack App] 📦 อัปเดตข้อมูลกระเป๋าเมื่อเปิดแอป จำนวนไอเทม:', this.items.length);
      }

      return this.renderItemList();
    }

    // เรนเดอร์รายการไอเทม
    renderItemList() {
      console.log('[Backpack App] เรนเดอร์รายการไอเทม...');

      if (!this.items.length) {
        return `
                <div class="backpack-empty-state">
                    <div class="empty-icon" style="color: #333;">🎒</div>
                    <div class="empty-title" style="color: #333;">กระเป๋าว่างเปล่า</div>
                </div>
            `;
      }

      // คำนวณจำนวนไอเทมทั้งหมด
      const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);

      // ดึงประเภทไอเทมทั้งหมด
      const allTypes = ['all', ...new Set(this.items.map(item => item.type))];

      // กรองไอเทม（ตามหมวดหมู่และการค้นหา）
      const filteredItems = this.getFilteredItems();

      const itemCards = filteredItems
        .map(item => {
          // ตรวจสอบว่าเป็นไอเทมประเภทอุปกรณ์หรือไม่（สวมใส่ได้）
          const isEquipment = item.type === '装备';
          const actionButton = isEquipment
            ? `<button class="equip-item-btn" data-item-id="${item.id}" data-item-name="${item.name}">สวมใส่</button>`
            : `<button class="use-item-btn" data-item-id="${item.id}">ใช้</button>`;

          return `
            <div class="backpack-item" data-item-id="${item.id}">
                <div class="backpack-item-info">
                    <div class="backpack-item-header">
                        <div class="backpack-item-name">${item.name}</div>
                        <div class="backpack-item-type">${item.type}</div>
                    </div>
                    <div class="backpack-item-description">${item.description}</div>
                    <div class="backpack-item-footer">
                        <div class="backpack-item-quantity">จำนวน: ${item.quantity}</div>
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;
        })
        .join('');

      // เรนเดอร์แถบหมวดหมู่（พับได้）
      const categoryTabsHtml = this.showCategories
        ? `
          <div class="backpack-type-tabs">
              ${allTypes
                .map(
                  type => `
                  <button class="backpack-type-tab ${this.currentItemType === type ? 'active' : ''}"
                          data-type="${type}">
                      ${type === 'all' ? 'ทั้งหมด' : type}
                  </button>
              `,
                )
                .join('')}
          </div>
      `
        : '';

      // เรนเดอร์แถบค้นหา（พับได้）
      const searchBarHtml = this.showSearchBar
        ? `
          <div class="backpack-search-bar">
              <input type="text"
                     class="backpack-search-input"
                     placeholder="ค้นหาชื่อหรือคำอธิบายของไอเทม..."
                     value="${this.searchQuery}"
                     id="backpackSearchInput">
              <button class="backpack-search-clear" id="backpackSearchClear">✕</button>
          </div>
      `
        : '';

      return `
            <div class="backpack-item-list">
                <div class="backpack-header">
                    <div class="backpack-title">กระเป๋าของฉัน</div>
                    <div class="backpack-stats">มี ${this.items.length} ชนิด รวม ${totalItems} ชิ้น</div>
                </div>
                ${categoryTabsHtml}
                ${searchBarHtml}
                <div class="backpack-grid">
                    ${itemCards}
                </div>
            </div>
        `;
    }

    // ดึงรายการไอเทมที่กรองแล้ว
    getFilteredItems() {
      let filteredItems = this.items;

      // กรองตามหมวดหมู่
      if (this.currentItemType !== 'all') {
        filteredItems = filteredItems.filter(item => item.type === this.currentItemType);
      }

      // กรองตามคำค้นหา
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim();
        filteredItems = filteredItems.filter(
          item => item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
        );
      }

      return filteredItems;
    }

    // สลับการแสดงหมวดหมู่
    toggleCategories() {
      console.log('[Backpack App] สลับการแสดงหมวดหมู่:', !this.showCategories);
      this.showCategories = !this.showCategories;
      this.updateAppContent();
    }

    // สลับการแสดงแถบค้นหา
    toggleSearchBar() {
      console.log('[Backpack App] สลับการแสดงแถบค้นหา:', !this.showSearchBar);
      this.showSearchBar = !this.showSearchBar;
      if (!this.showSearchBar) {
        this.searchQuery = ''; // ล้างการค้นหาเมื่อซ่อนแถบค้นหา
      }
      this.updateAppContent();

      // ถ้าแสดงแถบค้นหา ให้โฟกัสที่ช่องป้อนข้อมูล
      if (this.showSearchBar) {
        setTimeout(() => {
          const searchInput = document.getElementById('backpackSearchInput');
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    }

    // สลับประเภทไอเทม
    switchItemType(type) {
      console.log('[Backpack App] สลับประเภทไอเทม:', type);
      this.currentItemType = type;
      this.updateAppContent();
    }

    // ดำเนินการค้นหา（มี debounce）
    performSearch(query) {
      console.log('[Backpack App] ดำเนินการค้นหา:', query);

      // ล้าง debounce timer ก่อนหน้า
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      // ตั้ง debounce timer ใหม่
      this.searchDebounceTimer = setTimeout(() => {
        this.searchQuery = query;
        this.updateItemListOnly(); // อัปเดตเฉพาะรายการไอเทม หลีกเลี่ยงการเรนเดอร์แถบค้นหาใหม่
      }, 300); // หน่วง debounce 300ms
    }

    // ดำเนินการค้นหาทันที（ไม่ใช้ debounce）
    performSearchImmediate(query) {
      console.log('[Backpack App] ดำเนินการค้นหาทันที:', query);
      this.searchQuery = query;
      this.updateItemListOnly(); // อัปเดตเฉพาะรายการไอเทม ไม่เรนเดอร์ทั้งหน้าใหม่
    }

    // อัปเดตเฉพาะรายการไอเทม（หลีกเลี่ยงการเรนเดอร์แถบค้นหาใหม่ที่ทำให้เสียโฟกัส）
    updateItemListOnly() {
      const backpackGrid = document.querySelector('.backpack-grid');
      if (!backpackGrid) {
        // ถ้าหาคอนเทนเนอร์กริดไม่พบ ให้อัปเดตทั้งหมด
        this.updateAppContent();
        return;
      }

      // ดึงไอเทมที่กรองแล้ว
      const filteredItems = this.getFilteredItems();

      // สร้าง HTML การ์ดไอเทมใหม่
      const itemCards = filteredItems
        .map(
          item => `
            <div class="backpack-item" data-item-id="${item.id}">
                <div class="backpack-item-info">
                    <div class="backpack-item-header">
                        <div class="backpack-item-name">${item.name}</div>
                        <div class="backpack-item-type">${item.type}</div>
                    </div>
                    <div class="backpack-item-description">${item.description}</div>
                    <div class="backpack-item-footer">
                        <div class="backpack-item-quantity">จำนวน: ${item.quantity}</div>
                        <button class="use-item-btn" data-item-id="${item.id}">ใช้</button>
                    </div>
                </div>
            </div>
        `,
        )
        .join('');

      // อัปเดตเนื้อหากริดไอเทม
      backpackGrid.innerHTML = itemCards;

      // ผูกอีเวนต์ปุ่มใช้ใหม่
      this.bindUseItemEvents();
    }

    // ผูกอีเวนต์ปุ่มใช้ไอเทมแยก
    bindUseItemEvents() {
      document.querySelectorAll('.use-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const itemId = e.target?.getAttribute('data-item-id');
          this.useItem(itemId);
        });
      });
    }

    // ล้างการค้นหา
    clearSearch() {
      console.log('[Backpack App] ล้างการค้นหา');

      // ล้าง debounce timer
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchQuery = '';
      this.updateAppContent();

      // โฟกัสที่ช่องค้นหา
      setTimeout(() => {
        const searchInput = document.getElementById('backpackSearchInput');
        if (searchInput) {
          searchInput.value = ''; // ให้แน่ใจว่าช่องป้อนข้อมูลถูกล้างด้วย
          searchInput.focus();
        }
      }, 100);
    }

    // อัปเดตการแสดงรายการไอเทม
    updateItemList() {
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

    // ผูกอีเวนต์
    bindEvents() {
      console.log('[Backpack App] ผูกอีเวนต์...');

      // ปุ่มใช้ไอเทม
      document.querySelectorAll('.use-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation(); // ป้องกัน event bubbling
          const itemId = e.target?.getAttribute('data-item-id');
          this.useItem(itemId);
        });
      });

      // ปุ่มสวมใส่ไอเทม
      document.querySelectorAll('.equip-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation(); // ป้องกัน event bubbling
          const itemId = e.target?.getAttribute('data-item-id');
          const itemName = e.target?.getAttribute('data-item-name');
          this.equipItem(itemId, itemName);
        });
      });

      // สลับแท็บประเภทไอเทม
      document.querySelectorAll('.backpack-type-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const type = e.target?.getAttribute('data-type');
          this.switchItemType(type);
        });
      });

      // อีเวนต์ช่องค้นหา
      const searchInput = document.getElementById('backpackSearchInput');
      if (searchInput) {
        // ค้นหาแบบเรียลไทม์（ใช้ debounce）
        searchInput.addEventListener('input', e => {
          this.performSearch(e.target.value);
        });

        // ค้นหาเมื่อกด Enter（ดำเนินการทันที）
        searchInput.addEventListener('keypress', e => {
          if (e.key === 'Enter') {
            // ล้าง debounce timer ดำเนินการค้นหาทันที
            if (this.searchDebounceTimer) {
              clearTimeout(this.searchDebounceTimer);
            }
            this.performSearchImmediate(e.target.value);
          }
        });

        // ป้องกันปัญหาเมื่อช่องป้อนข้อมูลเสียโฟกัส
        searchInput.addEventListener('blur', e => {
          // หน่วงเล็กน้อยก่อนดำเนินการ เพื่อหลีกเลี่ยงความขัดแย้งกับอีเวนต์อื่น
          setTimeout(() => {
            if (this.searchQuery !== e.target.value) {
              this.performSearchImmediate(e.target.value);
            }
          }, 100);
        });
      }

      // ปุ่มล้างการค้นหา
      const clearBtn = document.getElementById('backpackSearchClear');
      if (clearBtn) {
        clearBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.clearSearch();
        });
      }
    }

    // ใช้ไอเทม
    useItem(itemId) {
      const item = this.items.find(p => p.id === itemId);
      if (!item) return;

      this.showUseItemModal(item);
    }

    // สวมใส่ไอเทม（ใส่บนตัว）
    async equipItem(itemId, itemName) {
      try {
        console.log('[Backpack App] สวมใส่ไอเทม:', itemName);

        // แสดงกล่องโต้ตอบเลือกตำแหน่งสวมใส่
        const slot = await this.showEquipSlotModal(itemName);
        if (!slot) {
          console.log('[Backpack App] ผู้ใช้ยกเลิกการสวมใส่');
          return;
        }

        console.log('[Backpack App] เลือกสวมใส่ที่:', slot);

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

        // 1. ตรวจสอบว่าตำแหน่งนั้นมีอุปกรณ์อยู่แล้วหรือไม่
        const currentEquipment = mvuData.stat_data['用户']?.['当前着装']?.[slot]?.[0];
        if (currentEquipment && currentEquipment.trim() !== '') {
          const confirm = window.confirm(
            `ตำแหน่งนี้สวมใส่ "${currentEquipment}" อยู่แล้ว ต้องการแทนที่หรือไม่?\n(อุปกรณ์เก่าจะกลับเข้ากระเป๋า)`,
          );
          if (!confirm) {
            console.log('[Backpack App] ผู้ใช้ยกเลิกการเปลี่ยน');
            return;
          }

          // อุปกรณ์เก่ากลับเข้ากระเป๋า
          const backpackCategory = '装备';
          const backpackPath = `道具.${backpackCategory}`;
          const backpackItems = mvuData.stat_data['道具']?.[backpackCategory] || {};
          const newBackpackCategory = { ...backpackItems };

          if (newBackpackCategory[currentEquipment]) {
            const currentCount = newBackpackCategory[currentEquipment]['数量']?.[0] || 0;
            newBackpackCategory[currentEquipment] = {
              ...newBackpackCategory[currentEquipment],
              数量: [currentCount + 1, newBackpackCategory[currentEquipment]['数量']?.[1] || ''],
            };
          } else {
            newBackpackCategory[currentEquipment] = {
              名称: [currentEquipment, ''],
              数量: [1, ''],
              效果: [`${slot}อุปกรณ์`, ''],
              品质: ['ธรรมดา', ''],
            };
          }

          await window.Mvu.setMvuVariable(mvuData, backpackPath, newBackpackCategory, {
            reason: `${currentEquipment}กลับเข้ากระเป๋า`,
            is_recursive: false,
          });
          console.log('[Backpack App] อุปกรณ์เก่ากลับเข้ากระเป๋าแล้ว:', currentEquipment);
        }

        // 2. สวมใส่อุปกรณ์ใหม่
        await window.Mvu.setMvuVariable(mvuData, `用户.当前着装.${slot}[0]`, itemName, {
          reason: `สวมใส่${itemName}`,
          is_recursive: false,
        });
        console.log('[Backpack App] สวมใส่ที่', slot, 'แล้ว');

        // 3. ลบออกจากกระเป๋า（จำนวน -1）
        const item = this.items.find(p => p.id === itemId);
        if (item) {
          const backpackCategory = item.type;
          const backpackPath = `道具.${backpackCategory}`;
          const backpackItems = mvuData.stat_data['道具']?.[backpackCategory] || {};
          const newBackpackCategory = { ...backpackItems };

          if (newBackpackCategory[itemName]) {
            const currentCount = newBackpackCategory[itemName]['数量']?.[0] || 0;
            if (currentCount <= 1) {
              // จำนวนเป็น 1 ลบโดยตรง
              delete newBackpackCategory[itemName];
              console.log('[Backpack App] ไอเทมหมดแล้ว ลบออกจากกระเป๋า:', itemName);
            } else {
              // จำนวนลด 1
              newBackpackCategory[itemName] = {
                ...newBackpackCategory[itemName],
                数量: [currentCount - 1, newBackpackCategory[itemName]['数量']?.[1] || ''],
              };
              console.log('[Backpack App] จำนวนไอเทม -1:', itemName, 'เหลือ:', currentCount - 1);
            }

            await window.Mvu.setMvuVariable(mvuData, backpackPath, newBackpackCategory, {
              reason: `สวมใส่${itemName}`,
              is_recursive: false,
            });
          }
        }

        // 4. ไม่บันทึกประวัติอีกต่อไป（แทนที่ด้วยสรุปที่ AI สร้าง）
        // การดำเนินการสวมใส่จะแสดงในสรุปของการตอบ AI

        // บันทึกการอัปเดต
        await window.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: targetMessageId });

        console.log('[Backpack App] ✅ สวมใส่สำเร็จ');
        alert(`สวมใส่ "${itemName}" ที่ ${slot} แล้ว`);

        // รีเฟรชการแสดงผล
        setTimeout(() => {
          this.refreshItemsData();
          // แจ้งแถบสถานะให้รีเฟรช
          if (window.statusApp && typeof window.statusApp.refreshStatusData === 'function') {
            window.statusApp.refreshStatusData();
          }
        }, 300);
      } catch (error) {
        console.error('[Backpack App] สวมใส่ล้มเหลว:', error);
        alert('สวมใส่ล้มเหลว: ' + error.message);
      }
    }

    // แสดงกล่องโต้ตอบเลือกตำแหน่งสวมใส่
    showEquipSlotModal(itemName) {
      return new Promise(resolve => {
        const slots = ['头部', '耳朵', '上衣', '下装', '内衣', '内裤', '袜子', '鞋子'];

        // สร้าง HTML โมดอล
        const modalHtml = `
          <div class="backpack-equip-modal-overlay" id="equipModalOverlay">
            <div class="backpack-equip-modal">
              <div class="backpack-equip-modal-header">
                <h3>เลือกตำแหน่งสวมใส่</h3>
                <button class="backpack-equip-modal-close" id="equipModalClose">✕</button>
              </div>
              <div class="backpack-equip-modal-body">
                <p>สวมใส่ "${itemName}" ที่：</p>
                <div class="backpack-equip-slot-list">
                  ${slots
                    .map(
                      slot => `
                    <button class="backpack-equip-slot-btn" data-slot="${slot}">${slot}</button>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;

        // เพิ่มลงในหน้า
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // ผูกอีเวนต์
        const overlay = document.getElementById('equipModalOverlay');
        const closeBtn = document.getElementById('equipModalClose');

        // คลิกปุ่มตำแหน่ง
        document.querySelectorAll('.backpack-equip-slot-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            const slot = e.target.getAttribute('data-slot');
            modalContainer.remove();
            resolve(slot);
          });
        });

        // ปุ่มปิด
        closeBtn.addEventListener('click', () => {
          modalContainer.remove();
          resolve(null);
        });

        // คลิกที่ overlay เพื่อปิด
        overlay.addEventListener('click', e => {
          if (e.target === overlay) {
            modalContainer.remove();
            resolve(null);
          }
        });
      });
    }

    // แสดงป๊อปอัพใช้ไอเทม
    showUseItemModal(item) {
      const modal = document.createElement('div');
      modal.className = 'custom-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">ใช้ไอเทม：${item.name}</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">กรุณาใส่ผู้ที่จะใช้ไอเทมนี้:</label>
              <input type="text" class="form-input" id="useTarget" placeholder="เช่น: ตัวเอง, เพื่อนร่วมทีม, ศัตรู ฯลฯ">
            </div>
            <div class="form-group">
              <label class="form-label">กรุณาใส่วิธีใช้ไอเทมนี้:</label>
              <input type="text" class="form-input" id="useMethod" placeholder="เช่น: กินตรงๆ, ขว้าง, ทา ฯลฯ">
            </div>
            <div class="form-group">
              <label class="form-label">จำนวนที่ใช้：</label>
              <div class="quantity-control">
                <button class="quantity-btn" id="decreaseBtn">-</button>
                <div class="quantity-display" id="quantityDisplay">1</div>
                <button class="quantity-btn" id="increaseBtn">+</button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-btn btn-primary" id="confirmUse">ใช้</button>
              <button class="modal-btn btn-secondary" id="cancelUse">ยกเลิก</button>
            </div>
          </div>
        </div>
      `;

      // เพิ่มในคอนเทนเนอร์ app-content แทน document.body
      const appContent = document.getElementById('app-content');
      if (appContent) {
        appContent.appendChild(modal);
      } else {
        console.warn('[Backpack App] ไม่พบคอนเทนเนอร์ app-content เพิ่มลงใน body');
        document.body.appendChild(modal);
      }

      // ผูกอีเวนต์
      let currentQuantity = 1;
      const maxQuantity = item.quantity;

      const quantityDisplay = modal.querySelector('#quantityDisplay');
      const decreaseBtn = modal.querySelector('#decreaseBtn');
      const increaseBtn = modal.querySelector('#increaseBtn');
      const confirmBtn = modal.querySelector('#confirmUse');
      const cancelBtn = modal.querySelector('#cancelUse');

      // อัปเดตการแสดงจำนวน
      const updateQuantity = () => {
        quantityDisplay.textContent = currentQuantity;
        decreaseBtn.disabled = currentQuantity <= 1;
        increaseBtn.disabled = currentQuantity >= maxQuantity;
      };

      // ลดจำนวน
      decreaseBtn.addEventListener('click', () => {
        if (currentQuantity > 1) {
          currentQuantity--;
          updateQuantity();
        }
      });

      // เพิ่มจำนวน
      increaseBtn.addEventListener('click', () => {
        if (currentQuantity < maxQuantity) {
          currentQuantity++;
          updateQuantity();
        }
      });

      // ยืนยันการใช้
      confirmBtn.addEventListener('click', async () => {
        const target = modal.querySelector('#useTarget').value.trim();
        const method = modal.querySelector('#useMethod').value.trim();

        try {
          // สร้างข้อความ
          const message = await this.generateUseMessageWithContext(item, target, method, currentQuantity);
          this.sendToSillyTavern(message);

          this.showToast(`ใช้ ${currentQuantity} ${item.name} แล้ว`, 'success');

          // ปิดป๊อปอัพ
          modal.remove();

          // รีเฟรชรายการไอเทมเพื่อสะท้อนการเปลี่ยนแปลงจำนวน
          setTimeout(() => {
            this.parseItemsFromContext();
          }, 500);
        } catch (error) {
          console.error('[Backpack App] ใช้ไอเทมล้มเหลว:', error);
          this.showToast('ใช้ไอเทมล้มเหลว: ' + error.message, 'error');
        }
      });

      // ยกเลิกการใช้
      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });

      // คลิกพื้นหลังเพื่อปิดป๊อปอัพ
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      // เริ่มต้นการแสดงจำนวน
      updateQuantity();
    }

    // สร้างข้อความใช้ไอเทม（พร้อมแก้ไขบริบท）
    async generateUseMessageWithContext(item, target, method, quantity) {
      try {
        // อัปเดตรูปแบบกระเป๋าในบริบทก่อน（ทำเครื่องหมายไอเทมเดิมว่าใช้แล้ว）
        await this.updateBackpackItemInContext(item, quantity);

        // สร้างข้อความพื้นฐาน
        let message = this.generateUseMessage(item, target, method, quantity);

        // ถ้าใช้แล้วยังเหลือ เพิ่มข้อมูลจำนวนที่เหลือและรูปแบบกระเป๋าใหม่
        const remainingQuantity = item.quantity - quantity;
        if (remainingQuantity > 0) {
          message += `。ไอเทมนี้เหลือในกระเป๋า：${remainingQuantity}，[背包|${item.name}|${item.type}|${item.description}|${remainingQuantity}]`;
        }

        return message;
      } catch (error) {
        console.error('[Backpack App] สร้างข้อความใช้ไอเทมล้มเหลว:', error);
        // ลดระดับไปใช้การสร้างข้อความแบบเดิม
        return this.generateUseMessage(item, target, method, quantity);
      }
    }

    // สร้างข้อความใช้ไอเทม（วิธีดั้งเดิม）
    generateUseMessage(item, target, method, quantity) {
      let message = '';

      // จัดการว่าใช้กับใคร
      if (target) {
        message += `ผู้ใช้เลือกใช้${item.name}กับ${target}`;
        if (quantity > 1) {
          message += `，จำนวนที่ใช้${quantity}`;
        }
      }

      // จัดการวิธีใช้
      if (method) {
        if (message) {
          message += '。';
        }
        message += `ผู้ใช้ใช้ไอเทม${item.name}，วิธีใช้คือ${method}`;
        if (quantity > 1 && !target) {
          message += `。จำนวนที่ใช้${quantity}`;
        }
      }

      // ถ้าไม่ได้กรอกทั้งสองอย่าง ใช้ข้อความเริ่มต้น
      if (!target && !method) {
        message = `ผู้ใช้ใช้${item.name}`;
        if (quantity > 1) {
          message += `，จำนวนที่ใช้${quantity}`;
        }
      }

      return message;
    }

    // อัปเดตรูปแบบไอเทมกระเป๋าในบริบท
    async updateBackpackItemInContext(item, usedQuantity) {
      try {
        console.log('[Backpack App] เริ่มอัปเดตรูปแบบไอเทมกระเป๋าในบริบท');

        // ดึงข้อมูลแชทปัจจุบัน
        const contextData = this.getChatData();
        if (!contextData || contextData.length === 0) {
          console.log('[Backpack App] ไม่พบข้อมูลแชท');
          return;
        }

        // ค้นหาข้อความที่มีไอเทมนี้
        let hasUpdated = false;
        const targetPattern = new RegExp(
          `\\[背包\\|${this.escapeRegex(item.name)}\\|([^\\|]+)\\|([^\\|]+)\\|(\\d+)\\]`,
          'g',
        );

        for (let i = 0; i < contextData.length; i++) {
          const message = contextData[i];
          const content = message.mes || message.content || '';

          if (content.includes(`[背包|${item.name}|`)) {
            // แปลงรูปแบบ
            const convertedContent = this.convertBackpackFormat(content, item, usedQuantity);

            if (convertedContent !== content) {
              // อัปเดตเนื้อหาข้อความ
              const success = await this.updateMessageContent(i, convertedContent);
              if (success) {
                hasUpdated = true;
                console.log(`[Backpack App] อัปเดตข้อความ ${i} แล้ว ไอเทม: ${item.name}`);
                break; // อัปเดตเฉพาะข้อความแรกที่พบ
              }
            }
          }
        }

        if (hasUpdated) {
          // บันทึกข้อมูลแชท
          await this.saveChatData();
          console.log('[Backpack App] อัปเดตรูปแบบไอเทมกระเป๋าเสร็จและบันทึกแล้ว');
        } else {
          console.log('[Backpack App] ไม่พบไอเทมกระเป๋าที่ต้องอัปเดต');
        }
      } catch (error) {
        console.error('[Backpack App] อัปเดตรูปแบบไอเทมกระเป๋าล้มเหลว:', error);
        throw error;
      }
    }

    // แปลงรูปแบบกระเป๋า
    convertBackpackFormat(content, item, usedQuantity) {
      // สร้าง regex เพื่อจับคู่ไอเทมเฉพาะ
      const itemPattern = new RegExp(
        `\\[背包\\|${this.escapeRegex(item.name)}\\|([^\\|]+)\\|([^\\|]+)\\|(\\d+)\\]`,
        'g',
      );

      let convertedContent = content;

      // ไม่ว่าจะเหลือหรือไม่ ทำเครื่องหมายไอเทมในบริบทว่าใช้แล้ว เพื่อหลีกเลี่ยงการดึงซ้ำ
      convertedContent = convertedContent.replace(itemPattern, (match, type, description, quantity) => {
        return `[已使用|${item.name}|${type}|${description}|${usedQuantity}]`;
      });

      return convertedContent;
    }

    // escape อักขระพิเศษของ regex
    escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // อัปเดตเนื้อหาข้อความ
    async updateMessageContent(messageIndex, newContent) {
      try {
        console.log(`[Backpack App] กำลังอัปเดตข้อความ ${messageIndex}:`, newContent.substring(0, 100) + '...');

        // วิธีที่ 1: ใช้อาร์เรย์ chat ทั่วไปอัปเดตโดยตรง
        const chat = window['chat'];
        if (chat && Array.isArray(chat) && chat[messageIndex]) {
          const originalContent = chat[messageIndex].mes;
          chat[messageIndex].mes = newContent;

          // ถ้าข้อความมี swipes ต้องอัปเดตด้วย
          if (chat[messageIndex].swipes && chat[messageIndex].swipe_id !== undefined) {
            chat[messageIndex].swipes[chat[messageIndex].swipe_id] = newContent;
          }

          // ทำเครื่องหมายว่าข้อมูลแชทถูกแก้ไข
          if (window.chat_metadata) {
            window.chat_metadata.tainted = true;
          }

          console.log(
            `[Backpack App] อัปเดตข้อความ ${messageIndex} แล้ว ความยาวเดิม:${originalContent.length} ความยาวใหม่:${newContent.length}`,
          );
          return true;
        }

        // วิธีที่ 2: พยายามอัปเดตผ่านฟังก์ชันตัวแก้ไข
        if (window.mobileContextEditor && window.mobileContextEditor.modifyMessage) {
          await window.mobileContextEditor.modifyMessage(messageIndex, newContent);
          return true;
        }

        // วิธีที่ 3: พยายามอัปเดตผ่าน context-editor
        if (window.contextEditor && window.contextEditor.modifyMessage) {
          await window.contextEditor.modifyMessage(messageIndex, newContent);
          return true;
        }

        console.warn('[Backpack App] ไม่พบวิธีอัปเดตข้อความที่ใช้ได้');
        return false;
      } catch (error) {
        console.error('[Backpack App] อัปเดตเนื้อหาข้อความล้มเหลว:', error);
        return false;
      }
    }

    // บันทึกข้อมูลแชท
    async saveChatData() {
      try {
        console.log('[Backpack App] เริ่มบันทึกข้อมูลแชท...');

        // วิธีที่ 1: ใช้ฟังก์ชันบันทึกของ SillyTavern
        if (typeof window.saveChatConditional === 'function') {
          await window.saveChatConditional();
          console.log('[Backpack App] บันทึกข้อมูลแชทผ่าน saveChatConditional แล้ว');
          return true;
        }

        // วิธีที่ 2: ใช้การบันทึกแบบหน่วง
        if (typeof window.saveChatDebounced === 'function') {
          window.saveChatDebounced();
          console.log('[Backpack App] บันทึกข้อมูลแชทผ่าน saveChatDebounced แล้ว');
          // รอสักครู่ให้แน่ใจว่าบันทึกเสร็จ
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        // วิธีที่ 3: ใช้ฟังก์ชันบันทึกของตัวแก้ไข
        if (window.mobileContextEditor && typeof window.mobileContextEditor.saveChatData === 'function') {
          await window.mobileContextEditor.saveChatData();
          console.log('[Backpack App] บันทึกข้อมูลแชทผ่าน mobileContextEditor แล้ว');
          return true;
        }

        // วิธีที่ 4: ใช้ฟังก์ชันบันทึกของ context-editor
        if (window.contextEditor && typeof window.contextEditor.saveChatData === 'function') {
          await window.contextEditor.saveChatData();
          console.log('[Backpack App] บันทึกข้อมูลแชทผ่าน contextEditor แล้ว');
          return true;
        }

        console.warn('[Backpack App] ไม่พบวิธีบันทึกที่ใช้ได้');
        return false;
      } catch (error) {
        console.error('[Backpack App] บันทึกข้อมูลแชทล้มเหลว:', error);
        return false;
      }
    }

    // เมธอดส่งข้อความแบบรวม（อ้างอิงวิธีส่งของ shop-app）
    async sendToSillyTavern(message) {
      try {
        console.log('[Backpack App] 🔄 ส่งข้อความไปยัง SillyTavern:', message);

        // วิธีที่ 1: ใช้อิลิเมนต์ DOM โดยตรง（เหมือนกับแอปข้อความ）
        const originalInput = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (!originalInput || !sendButton) {
          console.error('[Backpack App] ไม่พบอิลิเมนต์ช่องป้อนข้อมูลหรือปุ่มส่ง');
          return this.sendToSillyTavernBackup(message);
        }

        // ตรวจสอบว่าช่องป้อนข้อมูลใช้ได้หรือไม่
        if (originalInput.disabled) {
          console.warn('[Backpack App] ช่องป้อนข้อมูลถูกปิดใช้งาน');
          return false;
        }

        // ตรวจสอบว่าปุ่มส่งใช้ได้หรือไม่
        if (sendButton.classList.contains('disabled')) {
          console.warn('[Backpack App] ปุ่มส่งถูกปิดใช้งาน');
          return false;
        }

        // ตั้งค่า
        originalInput.value = message;
        console.log('[Backpack App] ตั้งค่าช่องป้อนข้อมูลแล้ว:', originalInput.value);

        // ทริกเกอร์อีเวนต์ input
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));

        // คลิกปุ่มส่งแบบหน่วง
        await new Promise(resolve => setTimeout(resolve, 300));
        sendButton.click();
        console.log('[Backpack App] คลิกปุ่มส่งแล้ว');

        return true;
      } catch (error) {
        console.error('[Backpack App] ส่งข้อความผิดพลาด:', error);
        return this.sendToSillyTavernBackup(message);
      }
    }

    // วิธีส่งสำรอง
    async sendToSillyTavernBackup(message) {
      try {
        console.log('[Backpack App] พยายามวิธีส่งสำรอง:', message);

        // พยายามค้นหาช่องป้อนข้อมูลอื่นที่เป็นไปได้
        const textareas = document.querySelectorAll('textarea');

        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          // จำลองอีเวนต์คีย์บอร์ด
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Backpack App] วิธีส่งสำรองล้มเหลว:', error);
        return false;
      }
    }

    // รีเฟรชรายการไอเทมด้วยตนเอง
    refreshItemList() {
      console.log('[Backpack App] รีเฟรชรายการไอเทมด้วยตนเอง');
      this.parseItemsFromContext();
      this.updateAppContent();
    }

    // ทำลายแอป ทำความสะอาดทรัพยากร
    destroy() {
      console.log('[Backpack App] ทำลายแอป ทำความสะอาดทรัพยากร');

      // ทำความสะอาด event listener
      if (this.eventListenersSetup && this.messageReceivedHandler) {
        const eventSource = window['eventSource'];
        if (eventSource && eventSource.removeListener) {
          eventSource.removeListener('MESSAGE_RECEIVED', this.messageReceivedHandler);
          console.log('[Backpack App] 🗑️ ลบ event listener MESSAGE_RECEIVED แล้ว');
        }
      }

      // ทำความสะอาด debounce timer การค้นหา
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }

      // รีเซ็ตสถานะ
      this.eventListenersSetup = false;
      this.isAutoRenderEnabled = false;

      // ล้างข้อมูล
      this.items = [];
    }

    // อัปเดต header
    updateHeader() {
      // แจ้ง mobile-phone ให้อัปเดต header
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'backpack',
          title: 'กระเป๋าของฉัน',
          view: 'itemList',
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    // แสดงข้อความแจ้งเตือน
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `backpack-toast ${type}`;
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
  }

  // สร้างอินสแตนซ์ทั่วไป
  window.BackpackApp = BackpackApp;
  window.backpackApp = new BackpackApp();
} // สิ้นสุดการตรวจสอบนิยามคลาส

// ฟังก์ชันทั่วไปสำหรับ mobile-phone.js เรียกใช้
window.getBackpackAppContent = function () {
  console.log('[Backpack App] ดึงเนื้อหาแอปกระเป๋า');

  if (!window.backpackApp) {
    console.error('[Backpack App] อินสแตนซ์ backpackApp ไม่มีอยู่');
    return '<div class="error-message">โหลดแอปกระเป๋าล้มเหลว</div>';
  }

  try {
    return window.backpackApp.getAppContent();
  } catch (error) {
    console.error('[Backpack App] ดึงเนื้อหาแอปล้มเหลว:', error);
    return '<div class="error-message">ดึงข้อมูลล้มเหลว</div>';
  }
};

window.bindBackpackAppEvents = function () {
  console.log('[Backpack App] ผูกอีเวนต์แอปกระเป๋า');

  if (!window.backpackApp) {
    console.error('[Backpack App] อินสแตนซ์ backpackApp ไม่มีอยู่');
    return;
  }

  try {
    window.backpackApp.bindEvents();
  } catch (error) {
    console.error('[Backpack App] ผูกอีเวนต์ล้มเหลว:', error);
  }
};

// ฟังก์ชันดีบักและทดสอบ
window.backpackAppRefresh = function () {
  if (window.backpackApp) {
    window.backpackApp.refreshItemList();
  }
};

window.backpackAppToggleCategories = function () {
  if (window.backpackApp) {
    window.backpackApp.toggleCategories();
  }
};

window.backpackAppToggleSearch = function () {
  if (window.backpackApp) {
    window.backpackApp.toggleSearchBar();
  }
};

window.backpackAppDebugInfo = function () {
  if (window.backpackApp) {
    console.log('[Backpack App Debug] จำนวนไอเทมปัจจุบัน:', window.backpackApp.items.length);
    console.log('[Backpack App Debug] รายการไอเทม:', window.backpackApp.items);
    console.log('[Backpack App Debug] ตั้งค่า event listener:', window.backpackApp.eventListenersSetup);
    console.log('[Backpack App Debug] เปิดใช้งานการเรนเดอร์อัตโนมัติ:', window.backpackApp.isAutoRenderEnabled);
  }
};

// การเพิ่มประสิทธิภาพ: ทำลายอินสแตนซ์แอป
window.backpackAppDestroy = function () {
  if (window.backpackApp) {
    window.backpackApp.destroy();
    console.log('[Backpack App] ทำลายแอปแล้ว');
  }
};

// บังคับโหลดแอปใหม่（ล้างแคช）
window.backpackAppForceReload = function () {
  console.log('[Backpack App] 🔄 บังคับโหลดแอปใหม่...');

  // ทำลายอินสแตนซ์ที่มีอยู่
  if (window.backpackApp) {
    window.backpackApp.destroy();
  }

  // สร้างอินสแตนซ์ใหม่
  window.backpackApp = new BackpackApp();
  console.log('[Backpack App] ✅ โหลดแอปใหม่แล้ว - เวอร์ชัน 2.1');
};

// เริ่มต้น
console.log('[Backpack App] โหลดโมดูลแอปกระเป๋าเสร็จ - เวอร์ชัน 2.1 (รีเฟรชแบบ event-driven + อ่านจากตัวจัดการตัวแปร)');
