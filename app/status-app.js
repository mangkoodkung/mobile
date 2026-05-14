/**
 * Status App - 状态应用
 * 为mobile-phone.js提供状态查看功能
 */

// @ts-nocheck
// 避免重复定义
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
      console.log('[Status App] 状态应用初始化开始 - 版本 2.0');

      // 立即从变量管理器读取一次状态信息
      this.parseStatusFromContext();

      // 异步初始化监控，避免阻塞界面渲染
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Status App] 状态应用初始化完成');
    }

    // 设置上下文监控
    setupContextMonitor() {
      console.log('[Status App] 设置上下文监控...');
      this.setupSillyTavernEventListeners();
    }

    // 手动刷新状态数据
    refreshStatusData() {
      console.log('[Status App] 🔄 手动刷新状态数据...');
      this.parseStatusFromContext();
    }

    // 设置SillyTavern事件监听器
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
            console.log('[Status App] 📨 收到 MESSAGE_RECEIVED 事件，刷新状态数据...');
            setTimeout(() => {
              // 先解析数据
              this.parseStatusFromContext();

              // 如果应用当前处于活动状态，强制刷新UI
              const appContent = document.getElementById('app-content');
              if (appContent && appContent.querySelector('.cd-status-app')) {
                console.log('[Status App] 🔄 强制刷新状态应用UI...');
                appContent.innerHTML = this.getAppContent();
                this.bindEvents();
              }
            }, 500);
          };

          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
            console.log('[Status App] ✅ 已注册 MESSAGE_RECEIVED 事件监听');
          }

          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
              console.log('[Status App] 📨 聊天已切换，刷新状态数据...');
              setTimeout(() => {
                this.parseStatusFromContext();
              }, 500);
            });
            console.log('[Status App] ✅ 已注册 CHAT_CHANGED 事件监听');
          }

          this.messageReceivedHandler = handleMessageReceived;
        } else {
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Status App] 设置SillyTavern事件监听器失败:', error);
      }
    }

    // 从上下文解析状态信息
    parseStatusFromContext() {
      try {
        const statusData = this.getCurrentStatusData();
        this.userData = statusData.userData;
        this.npcList = statusData.npcList;
        console.log('[Status App] 📊 状态数据已更新');

        // 只有在当前显示状态应用时才更新UI
        if (this.isCurrentlyActive()) {
          console.log('[Status App] 🎨 状态应用处于活动状态，更新UI...');
          this.updateAppContent();
        } else {
          console.log('[Status App] 💤 状态应用未激活，数据已更新但UI延迟渲染');
        }
      } catch (error) {
        console.error('[Status App] 解析状态信息失败:', error);
      }
    }

    // 检查状态应用是否当前活动
    isCurrentlyActive() {
      const appContent = document.getElementById('app-content');
      if (!appContent) return false;

      // 检查是否包含状态应用的特征元素
      return appContent.querySelector('.cd-status-container') !== null;
    }

    /**
     * 从变量管理器获取状态数据
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
          console.log('[Status App] 从 Mvu 获取变量数据:', mvuData);
          console.log('[Status App] stat_data 存在:', !!mvuData?.stat_data);
          if (mvuData?.stat_data) {
            console.log('[Status App] stat_data 的键:', Object.keys(mvuData.stat_data));
            console.log('[Status App] 用户是否存在:', !!mvuData.stat_data['用户']);
            console.log('[Status App] NPC是否存在:', !!mvuData.stat_data['NPC']);
            if (mvuData.stat_data['用户']) {
              console.log('[Status App] 用户数据:', mvuData.stat_data['用户']);
            }
            if (mvuData.stat_data['NPC']) {
              console.log('[Status App] NPC数据:', mvuData.stat_data['NPC']);
            }
          }

          let userData = null;
          let npcList = [];

          // 尝试从 stat_data 读取用户数据
          if (mvuData && mvuData.stat_data && mvuData.stat_data['用户']) {
            userData = this.parseUserData(mvuData.stat_data['用户']);
            console.log('[Status App] ✅ 从 stat_data 获取到用户数据:', userData);
          } else if (mvuData && mvuData['用户']) {
            userData = this.parseUserData(mvuData['用户']);
            console.log('[Status App] ✅ 从根级别获取到用户数据:', userData);
          } else {
            console.warn('[Status App] ⚠️ 未找到用户数据');
          }

          // 尝试从 stat_data 读取NPC数据
          if (mvuData && mvuData.stat_data && mvuData.stat_data['NPC']) {
            npcList = this.parseNPCData(mvuData.stat_data['NPC']);
            console.log('[Status App] ✅ 从 stat_data 获取到NPC数据，数量:', npcList.length);
          } else if (mvuData && mvuData['NPC']) {
            npcList = this.parseNPCData(mvuData['NPC']);
            console.log('[Status App] ✅ 从根级别获取到NPC数据，数量:', npcList.length);
          } else {
            console.warn('[Status App] ⚠️ 未找到NPC数据');
          }

          return { userData, npcList };
        }

        // 备用方法
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

        console.log('[Status App] 未找到状态数据');
      } catch (error) {
        console.warn('[Status App] 获取状态数据失败:', error);
      }

      return { userData: null, npcList: [] };
    }

    /**
     * 解析用户数据
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
     * 解析NPC数据
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

        // 解析人物记忆
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

      console.log('[Status App] 解析NPC完成，数量:', npcList.length);
      return npcList;
    }

    // 获取应用内容
    getAppContent() {
      // 每次打开应用时重新解析一次数据（确保显示最新内容）
      const statusData = this.getCurrentStatusData();
      this.userData = statusData.userData;
      this.npcList = statusData.npcList;
      console.log('[Status App] 📊 打开应用时更新状态数据，用户:', !!this.userData, 'NPC数:', this.npcList.length);

      return `
        <div class="cd-status-app">
          ${this.renderTabs()}
          <div class="cd-status-content">
            ${this.currentView === 'user' ? this.renderUserStatus() : this.renderNPCList()}
          </div>
        </div>
      `;
    }

    // 渲染标签页
    renderTabs() {
      return `
        <div class="cd-status-tabs">
          <button class="cd-status-tab ${this.currentView === 'user' ? 'cd-active' : ''}" data-view="user">
            我的状态
          </button>
          <button class="cd-status-tab ${this.currentView === 'npc' ? 'cd-active' : ''}" data-view="npc">
            NPC状态 (${this.npcList.length})
          </button>
        </div>
      `;
    }

    // 渲染用户状态
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
                <span class="cd-info-value">${this.userData.年龄}岁</span>
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

    // 渲染服装项（isUser=true表示可以穿脱）
    renderClothingItem(slot, item, isUser = false) {
      const isEmpty = !item || item.trim() === '';
      const displayText = isEmpty ? '未穿戴' : item;

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

    // 渲染NPC列表
    renderNPCList() {
      if (!this.npcList.length) {
        return `
          <div class="cd-status-empty">
            <div class="cd-empty-icon">👥</div>
            <div class="cd-empty-text">暂无NPC数据</div>
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
              <div class="cd-info-title">💭 内心想法</div>
              <div class="cd-inner-thought">${npc.内心想法 || '暂无想法'}</div>
            </div>
            ${
              npc.好友ID
                ? `<div class="cd-info-section">
              <div class="cd-info-title">好友ID</div>
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
                  <span class="cd-info-value">${npc.年龄}岁</span>
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

    // 获取好感度样式类
    getFavorClass(favor) {
      if (favor >= 60) return 'cd-favor-high';
      if (favor >= 20) return 'cd-favor-mid';
      if (favor >= -20) return 'cd-favor-neutral';
      if (favor >= -60) return 'cd-favor-low';
      return 'cd-favor-hostile';
    }

    // 更新应用内容
    updateAppContent() {
      const appContent = document.getElementById('app-content');
      if (appContent) {
        appContent.innerHTML = this.getAppContent();
        this.bindEvents();
      }
    }

    // 绑定事件
    bindEvents() {
      // 标签页切换
      document.querySelectorAll('.cd-status-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          const view = e.target.getAttribute('data-view');
          this.switchView(view);
        });
      });

      // 脱下装备按钮
      document.querySelectorAll('.cd-clothing-btn.cd-remove').forEach(btn => {
        btn.addEventListener('click', e => {
          const slot = e.target.getAttribute('data-slot');
          this.removeClothing(slot);
        });
      });

      // NPC卡片展开/收起
      document.querySelectorAll('.cd-npc-header').forEach(header => {
        header.addEventListener('click', e => {
          // 如果点击的是好感度标签，不触发展开收起
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

    // 脱下装备（并放入背包）
    async removeClothing(slot) {
      try {
        console.log('[Status App] 脱下装备:', slot);

        // 获取目标消息ID
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

        // 获取Mvu数据
        const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        if (!mvuData || !mvuData.stat_data) {
          throw new Error('无法获取Mvu变量数据');
        }

        // 获取当前装备名称
        const clothingItem = mvuData.stat_data['用户']?.['当前着装']?.[slot]?.[0];
        if (!clothingItem || clothingItem.trim() === '') {
          throw new Error('该部位没有装备');
        }

        console.log('[Status App] 脱下的装备:', clothingItem);

        // 1. 脱下装备（清空着装栏）
        await window.Mvu.setMvuVariable(mvuData, `用户.当前着装.${slot}[0]`, '', {
          reason: `脱下${slot}`,
          is_recursive: false,
        });

        // 2. 放入背包（根据部位类型放入对应分类）
        const backpackCategory = this.mapSlotToBackpackCategory(slot);
        const backpackPath = `道具.${backpackCategory}`;
        const backpackItems = mvuData.stat_data['道具']?.[backpackCategory] || {};

        // 创建新的背包分类对象
        const newBackpackCategory = { ...backpackItems };

        // 检查是否已有该物品
        if (newBackpackCategory[clothingItem]) {
          // 已有物品，增加数量
          const currentCount = newBackpackCategory[clothingItem]['数量']?.[0] || 0;
          newBackpackCategory[clothingItem] = {
            ...newBackpackCategory[clothingItem],
            数量: [currentCount + 1, newBackpackCategory[clothingItem]['数量']?.[1] || ''],
          };
          console.log('[Status App] 已有物品，增加数量:', clothingItem, '新数量:', currentCount + 1);
        } else {
          // 新物品，创建数据
          newBackpackCategory[clothingItem] = {
            名称: [clothingItem, ''],
            数量: [1, ''],
            效果: [`${slot}装备`, ''],
            品质: ['普通', ''],
          };
          console.log('[Status App] 新物品添加到背包:', clothingItem);
        }

        // 一次性设置整个分类
        await window.Mvu.setMvuVariable(mvuData, backpackPath, newBackpackCategory, {
          reason: `${clothingItem}放入背包`,
          is_recursive: false,
        });

        // 3. 不再记录历史（由AI生成摘要代替）
        // 脱装备操作将在AI回复的摘要中体现

        // 保存更新
        await window.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: targetMessageId });

        console.log('[Status App] ✅ 脱下装备成功，已放入背包');

        // 刷新显示（强制刷新UI）
        setTimeout(() => {
          this.parseStatusFromContext();
          // 如果状态app当前活动，强制刷新UI
          const appContent = document.getElementById('app-content');
          if (appContent && appContent.querySelector('.cd-status-app')) {
            console.log('[Status App] 🔄 强制刷新状态应用UI（脱装备后）...');
            appContent.innerHTML = this.getAppContent();
            this.bindEvents();
          }
          // 通知背包刷新
          if (window.backpackApp && typeof window.backpackApp.refreshItemsData === 'function') {
            window.backpackApp.refreshItemsData();
          }
        }, 300);
      } catch (error) {
        console.error('[Status App] 脱下装备失败:', error);
        alert('ถอดอุปกรณ์ล้มเหลว: ' + error.message);
      }
    }

    // 映射装备部位到背包分类
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

    // 切换视图
    switchView(view) {
      this.currentView = view;
      this.updateAppContent();
    }

    // 销毁应用
    destroy() {
      console.log('[Status App] 销毁应用，清理资源');

      if (this.eventListenersSetup && this.messageReceivedHandler) {
        const eventSource = window['eventSource'];
        if (eventSource && eventSource.removeListener) {
          eventSource.removeListener('MESSAGE_RECEIVED', this.messageReceivedHandler);
          console.log('[Status App] 🗑️ 已移除 MESSAGE_RECEIVED 事件监听');
        }
      }

      this.eventListenersSetup = false;
      this.userData = null;
      this.npcList = [];
    }
  }

  // 创建全局实例
  window.StatusApp = StatusApp;
  window.statusApp = new StatusApp();
}

// 全局函数供mobile-phone.js调用
window.getStatusAppContent = function () {
  console.log('[Status App] 获取状态应用内容');

  if (!window.statusApp) {
    console.error('[Status App] statusApp实例不存在');
    return '<div class="error-message">โหลดแอปสถานะล้มเหลว</div>';
  }

  try {
    return window.statusApp.getAppContent();
  } catch (error) {
    console.error('[Status App] 获取应用内容失败:', error);
    return '<div class="error-message">ดึงข้อมูลล้มเหลว</div>';
  }
};

window.bindStatusAppEvents = function () {
  console.log('[Status App] 绑定状态应用事件');

  if (!window.statusApp) {
    console.error('[Status App] statusApp实例不存在');
    return;
  }

  try {
    window.statusApp.bindEvents();
  } catch (error) {
    console.error('[Status App] 绑定事件失败:', error);
  }
};

// 调试功能
window.statusAppRefresh = function () {
  if (window.statusApp) {
    window.statusApp.refreshStatusData();
  }
};

window.statusAppDestroy = function () {
  if (window.statusApp) {
    window.statusApp.destroy();
    console.log('[Status App] 应用已销毁');
  }
};

window.statusAppDebugInfo = function () {
  if (window.statusApp) {
    console.log('[Status App Debug] ===== 调试信息 =====');
    console.log('[Status App Debug] 当前视图:', window.statusApp.currentView);
    console.log('[Status App Debug] 用户数据:', window.statusApp.userData);
    console.log('[Status App Debug] NPC列表:', window.statusApp.npcList);
    console.log('[Status App Debug] NPC数量:', window.statusApp.npcList.length);

    // 测试变量获取
    console.log('[Status App Debug] ===== 测试变量获取 =====');
    console.log('[Status App Debug] Mvu 框架存在:', !!window.Mvu);
    console.log('[Status App Debug] Mvu.getMvuData 函数存在:', typeof window.Mvu?.getMvuData === 'function');
    console.log('[Status App Debug] getLastMessageId 函数存在:', typeof window.getLastMessageId === 'function');
    console.log('[Status App Debug] getChatMessages 函数存在:', typeof window.getChatMessages === 'function');

    if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
      try {
        let targetMessageId = 'latest';

        if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
          let currentId = window.getLastMessageId();
          console.log('[Status App Debug] 最新消息索引:', currentId);

          // 向上查找AI消息
          let searchCount = 0;
          while (currentId >= 0 && searchCount < 20) {
            const message = window.getChatMessages(currentId).at(-1);
            console.log(`[Status App Debug] 检查第 ${currentId} 层:`, message ? `role=${message.role}` : '无消息');

            if (message && message.role !== 'user') {
              targetMessageId = currentId;
              console.log(`[Status App Debug] ✅ 找到AI消息楼层: ${currentId} (向上查找 ${searchCount} 层)`);
              break;
            }

            currentId--;
            searchCount++;
          }

          if (currentId < 0) {
            console.warn('[Status App Debug] ⚠️ 向上查找所有楼层都是用户消息，使用 latest');
          }
        }

        console.log('[Status App Debug] 使用消息ID:', targetMessageId);

        // 测试获取 Mvu 变量
        const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        console.log('[Status App Debug] Mvu 变量数据:', mvuData);

        if (mvuData && mvuData.stat_data) {
          console.log('[Status App Debug] stat_data 变量列表:', Object.keys(mvuData.stat_data));

          if (mvuData.stat_data['用户']) {
            console.log('[Status App Debug] 用户数据:', mvuData.stat_data['用户']);
          } else {
            console.warn('[Status App Debug] ❌ 未找到用户数据');
          }

          if (mvuData.stat_data['NPC']) {
            const npcData = mvuData.stat_data['NPC'];
            console.log('[Status App Debug] NPC数据:', npcData);
            const npcKeys = Object.keys(npcData).filter(k => k !== '$meta');
            console.log('[Status App Debug] NPC键列表:', npcKeys);
            npcKeys.forEach(key => {
              console.log(`[Status App Debug] - NPC ${key}:`, npcData[key]);
            });
          } else {
            console.warn('[Status App Debug] ❌ 未找到NPC数据');
          }
        } else {
          console.error('[Status App Debug] ❌ stat_data 为空或不存在');
        }
      } catch (error) {
        console.error('[Status App Debug] 获取 Mvu 变量失败:', error);
      }
    } else {
      console.warn('[Status App Debug] Mvu 框架未加载');
    }

    // 测试 SillyTavern context（备用方法）
    if (window.SillyTavern) {
      const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
      console.log('[Status App Debug] SillyTavern context 存在:', !!context);
      if (context && context.chatMetadata) {
        console.log('[Status App Debug] chatMetadata 存在:', !!context.chatMetadata);
        console.log('[Status App Debug] variables 存在:', !!context.chatMetadata.variables);
        if (context.chatMetadata.variables) {
          console.log('[Status App Debug] 变量列表:', Object.keys(context.chatMetadata.variables));
        }
      }
    }
  }
};

// 初始化
console.log('[Status App] 状态应用模块加载完成 - 版本 2.0 (详细信息 + 穿脱功能)');
console.log('[Status App] 💡 调试提示：在控制台运行 statusAppDebugInfo() 查看详细调试信息');
