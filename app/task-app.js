/**
 * Task App - แอปภารกิจ
 * ให้ฟังก์ชันภารกิจสำหรับ mobile-phone.js ตามรูปแบบของ shop-app.js
 */

// @ts-nocheck
// หลีกเลี่ยงการนิยามซ้ำ
if (typeof window.TaskApp === 'undefined') {
  class TaskApp {
    constructor() {
      this.currentView = 'taskList'; // 'taskList', 'inProgress', 'completed'
      this.tasks = [];
      this.acceptedTasks = [];
      this.completedTasks = [];
      this.contextMonitor = null;
      this.lastTaskCount = 0;
      this.isAutoRenderEnabled = true;
      this.lastRenderTime = 0;
      this.renderCooldown = 1000;
      this.eventListenersSetup = false;
      this.contextCheckInterval = null;

      this.init();
    }

    init() {
      console.log('[Task App] เริ่มต้นแอปภารกิจ - เวอร์ชัน 3.0 (ขับเคลื่อนด้วยเหตุการณ์ + เป้าหมายตระกูล)');

      // อ่านเป้าหมายตระกูลจากตัวจัดการตัวแปรทันที
      this.parseTasksFromContext();

      // เริ่มต้นการตรวจสอบแบบอะซิงโครนัส เพื่อไม่ให้บล็อกการเรนเดอร์หน้าจอ
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Task App] การเริ่มต้นแอปภารกิจเสร็จสมบูรณ์ - เวอร์ชัน 3.0');
    }

    // ตั้งค่าการตรวจสอบบริบท
    setupContextMonitor() {
      console.log('[Task App] ตั้งค่าการตรวจสอบบริบท...');

      // ไม่ใช้การตรวจสอบตามช่วงเวลาอีกต่อไป ใช้เฉพาะการฟังเหตุการณ์
      // ฟังระบบเหตุการณ์ของ SillyTavern (MESSAGE_RECEIVED และ CHAT_CHANGED)
      this.setupSillyTavernEventListeners();
    }

    // รีเฟรชข้อมูลภารกิจด้วยตนเอง (เรียกใช้หลังจากการดำเนินการกับตัวแปร)
    refreshTasksData() {
      console.log('[Task App] 🔄 รีเฟรชข้อมูลภารกิจด้วยตนเอง...');
      this.parseTasksFromContext();
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

          // สร้างฟังก์ชันรีเฟรชแบบหน่วงเวลา (รีเฟรชเฉพาะหลังจากได้รับข้อความ)
          const handleMessageReceived = () => {
            console.log('[Task App] 📨 ได้รับเหตุการณ์ MESSAGE_RECEIVED รีเฟรชข้อมูลภารกิจ...');
            setTimeout(() => {
              // แยกวิเคราะห์ข้อมูลก่อน
              this.parseTasksFromContext();

              // ถ้าแอปเปิดใช้งานอยู่ ให้บังคับรีเฟรช UI
              const appContent = document.getElementById('app-content');
              if (appContent && appContent.querySelector('.task-list')) {
                console.log('[Task App] 🔄 บังคับรีเฟรช UI แอปภารกิจ...');
                appContent.innerHTML = this.getAppContent();
                this.bindEvents();
              }
            }, 500);
          };

          // ฟังเฉพาะเหตุการณ์ได้รับข้อความ (หลังจาก AI ตอบกลับ)
          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
            console.log('[Task App] ✅ ลงทะเบียนผู้ฟังเหตุการณ์ MESSAGE_RECEIVED แล้ว');
          }

          // ฟังเหตุการณ์การเปลี่ยนแชท (เมื่อสลับการสนทนา)
          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, () => {
              console.log('[Task App] 📨 สลับการแชทแล้ว รีเฟรชข้อมูลภารกิจ...');
              setTimeout(() => {
                this.parseTasksFromContext();
              }, 500);
            });
            console.log('[Task App] ✅ ลงทะเบียนผู้ฟังเหตุการณ์ CHAT_CHANGED แล้ว');
          }

          // บันทึกการอ้างอิงเพื่อล้างข้อมูลในภายหลัง
          this.messageReceivedHandler = handleMessageReceived;
        } else {
          // ลดความถี่ในการลองใหม่ จาก 2 วินาที เป็น 5 วินาที
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Task App] ตั้งค่าตัวฟังเหตุการณ์ SillyTavern ล้มเหลว:', error);
      }
    }

    // ฟังก์ชัน Debounce
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

    // แยกวิเคราะห์ข้อมูลภารกิจจากบริบท
    parseTasksFromContext() {
      try {
        // รับข้อมูลภารกิจปัจจุบัน
        const taskData = this.getCurrentTaskData();

        // ตรวจสอบว่าสถานะภารกิจมีการเปลี่ยนแปลงหรือไม่
        const tasksChanged = taskData.tasks.length !== this.tasks.length || this.hasTasksChanged(taskData.tasks);
        const acceptedChanged =
          JSON.stringify(taskData.acceptedTasks.sort()) !== JSON.stringify(this.acceptedTasks.sort());
        const completedChanged =
          JSON.stringify(taskData.completedTasks.sort()) !== JSON.stringify(this.completedTasks.sort());

        // หากมีการเปลี่ยนแปลงใดๆ ให้อัปเดตข้อมูล
        if (tasksChanged || acceptedChanged || completedChanged) {
          console.log('[Task App] ตรวจพบการเปลี่ยนแปลงสถานะภารกิจ:', {
            tasksChanged,
            acceptedChanged,
            completedChanged,
            oldAccepted: this.acceptedTasks,
            newAccepted: taskData.acceptedTasks,
            oldCompleted: this.completedTasks,
            newCompleted: taskData.completedTasks,
          });

          this.tasks = taskData.tasks;
          this.acceptedTasks = taskData.acceptedTasks;
          this.completedTasks = taskData.completedTasks;
          console.log('[Task App] 📋 ข้อมูลภารกิจอัปเดตแล้ว');

          // อัปเดต UI เฉพาะเมื่อแอปภารกิจแสดงอยู่
          if (this.isCurrentlyActive()) {
            console.log('[Task App] 🎨 แอปภารกิจทำงานอยู่ อัปเดต UI...');
            this.updateTaskList();
          } else {
            console.log('[Task App] 💤 แอปภารกิจไม่ได้ใช้งาน ข้อมูลอัปเดตแล้วแต่ UI รอการเรนเดอร์');
          }
        }
      } catch (error) {
        console.error('[Task App] แยกวิเคราะห์ข้อมูลภารกิจล้มเหลว:', error);
      }
    }

    // ตรวจสอบว่าแอปภารกิจกำลังทำงานอยู่หรือไม่
    isCurrentlyActive() {
      const appContent = document.getElementById('app-content');
      if (!appContent) return false;

      // ตรวจสอบว่ามีองค์ประกอบของแอปภารกิจหรือไม่
      return appContent.querySelector('.task-tabs') !== null || appContent.querySelector('.task-list') !== null;
    }

    /**
     * รับข้อมูลภารกิจจากตัวจัดการตัวแปร (ใช้ Mvu Framework + ค้นหาชั้นบน)
     */
    getCurrentTaskData() {
      try {
        // วิธีที่ 1: ใช้ Mvu Framework เพื่อรับตัวแปร (เหมือนกับ shop-app: ค้นหาชั้นบนที่มีตัวแปร)
        if (window.Mvu && typeof window.Mvu.getMvuData === 'function') {
          // รับ ID ข้อความเป้าหมาย (ค้นหาขึ้นไปหาข้อความ AI ล่าสุดที่มีตัวแปร)
          let targetMessageId = 'latest';

          if (typeof window.getLastMessageId === 'function' && typeof window.getChatMessages === 'function') {
            let currentId = window.getLastMessageId();

            // ค้นหาข้อความ AI ขึ้นไป (ข้ามข้อความผู้ใช้)
            while (currentId >= 0) {
              const message = window.getChatMessages(currentId).at(-1);
              if (message && message.role !== 'user') {
                targetMessageId = currentId;
                if (currentId !== window.getLastMessageId()) {
                  console.log(`[Task App] 📝 ค้นหาพบข้อความ AI ที่ชั้น ${currentId}`);
                }
                break;
              }
              currentId--;
            }

            if (currentId < 0) {
              targetMessageId = 'latest';
              console.warn('[Task App] ⚠️ ไม่พบข้อความ AI ใช้ชั้นสุดท้าย');
            }
          }

          console.log('[Task App] ใช้ข้อความ ID:', targetMessageId);

          // รับตัวแปร
          const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
          console.log('[Task App] รับข้อมูลตัวแปรจาก Mvu:', mvuData);
          console.log('[Task App] stat_data มีอยู่:', !!mvuData?.stat_data);
          if (mvuData?.stat_data) {
            console.log('[Task App] คีย์ของ stat_data:', Object.keys(mvuData.stat_data));
            // '任务' ต้องคงภาษาจีนไว้ตามคีย์ข้อมูล
            console.log('[Task App] มีภารกิจหรือไม่:', !!mvuData.stat_data['任务']);
            if (mvuData.stat_data['任务']) {
              console.log('[Task App] ข้อมูลภารกิจ:', mvuData.stat_data['任务']);
            }
          }

          // พยายามอ่านจาก stat_data
          if (mvuData && mvuData.stat_data && mvuData.stat_data['任务']) {
            const taskData = mvuData.stat_data['任务'];
            console.log('[Task App] ✅ รับข้อมูลภารกิจจาก stat_data:', taskData);
            return this.parseTaskData(taskData);
          }

          // พยายามอ่านจากระดับราก (ถ้าตัวแปรไม่อยู่ใน stat_data)
          if (mvuData && mvuData['任务']) {
            const taskData = mvuData['任务'];
            console.log('[Task App] ✅ รับข้อมูลภารกิจจากระดับราก:', taskData);
            return this.parseTaskData(taskData);
          }

          // ถ้า stat_data ว่างแต่ variables มีอยู่ ให้พยายามรับจาก variables
          if (mvuData && !mvuData.stat_data && window.SillyTavern) {
            const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
            if (context && context.chatMetadata && context.chatMetadata.variables) {
              const stat_data = context.chatMetadata.variables['stat_data'];
              if (stat_data && stat_data['任务']) {
                console.log('[Task App] รับข้อมูลภารกิจจาก variables.stat_data');
                return this.parseTaskData(stat_data['任务']);
              }
            }
          }
        }

        // วิธีที่ 2: พยายามรับจากบริบทของ SillyTavern (สำรอง)
        if (window.SillyTavern) {
          const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
          if (context && context.chatMetadata && context.chatMetadata.variables) {
            // พยายามรับจาก variables.stat_data
            const stat_data = context.chatMetadata.variables['stat_data'];
            if (stat_data && stat_data['任务']) {
              console.log('[Task App] รับข้อมูลภารกิจจาก context.chatMetadata.variables.stat_data');
              return this.parseTaskData(stat_data['任务']);
            }

            // พยายามรับจาก variables โดยตรง
            const taskData = context.chatMetadata.variables['任务'];
            if (taskData && typeof taskData === 'object') {
              console.log('[Task App] รับข้อมูลภารกิจจาก context.chatMetadata.variables');
              return this.parseTaskData(taskData);
            }
          }
        }

        console.log('[Task App] ไม่พบข้อมูลภารกิจ');
      } catch (error) {
        console.warn('[Task App] รับข้อมูลภารกิจล้มเหลว:', error);
      }

      return { tasks: [], acceptedTasks: [], completedTasks: [] };
    }

    /**
     * แยกวิเคราะห์ข้อมูลภารกิจ
     * โครงสร้างภารกิจ: { t001: {任务名称: [ค่า, ''], 任务状态: [ค่า, ''], 任务描述: [ค่า, ''], 奖励: [ค่า, '']}, ... }
     * สถานะภารกิจ: 未接受 (ยังไม่รับ) / 进行中 (กำลังทำ) / 已完成 (สำเร็จแล้ว)
     */
    parseTaskData(taskData) {
      const tasks = [];
      const acceptedTaskIds = [];
      const completedTaskIds = [];

      try {
        // วนลูปภารกิจทั้งหมดในข้อมูลภารกิจ
        Object.keys(taskData).forEach(taskKey => {
          // ข้ามข้อมูลเมตา
          if (taskKey === '$meta') return;

          const task = taskData[taskKey];
          if (!task || typeof task !== 'object') return;

          // ดึงข้อมูลภารกิจ (รูปแบบตัวแปร: [ค่า, คำอธิบาย])
          // คีย์ภาษาจีนต้องคงไว้เพื่อให้ตรงกับข้อมูล
          const getValue = field => (task[field] && Array.isArray(task[field]) ? task[field][0] : '');

          const taskName = getValue('任务名称') || taskKey;
          const taskDescription = getValue('任务描述') || '';
          const taskStatus = getValue('任务状态') || '未接受';
          const taskReward = getValue('奖励') || '';

          if (!taskName) return;

          // กำหนดสถานะภารกิจตามสถานะ
          let status = 'available';
          if (taskStatus === '进行中') {
            // กำลังทำ
            status = 'inProgress';
            acceptedTaskIds.push(taskKey);
          } else if (taskStatus === '已完成') {
            // สำเร็จแล้ว
            status = 'completed';
            completedTaskIds.push(taskKey);
          }

          tasks.push({
            id: taskKey,
            name: taskName,
            description: taskDescription,
            publisher: 'ระบบ', // แปล '系统' เป็น 'ระบบ'
            reward: taskReward,
            status: status,
            timestamp: new Date().toLocaleString(),
          });
        });

        console.log('[Task App] แยกวิเคราะห์จากภารกิจเสร็จสมบูรณ์ จำนวนภารกิจ:', tasks.length);
        console.log('[Task App] ยังไม่รับ:', tasks.filter(t => t.status === 'available').length);
        console.log('[Task App] กำลังทำ:', acceptedTaskIds.length);
        console.log('[Task App] สำเร็จแล้ว:', completedTaskIds.length);
      } catch (error) {
        console.error('[Task App] แยกวิเคราะห์ข้อมูลภารกิจล้มเหลว:', error);
      }

      return { tasks, acceptedTasks: acceptedTaskIds, completedTasks: completedTaskIds };
    }

    // ตรวจสอบว่าภารกิจมีการเปลี่ยนแปลงหรือไม่
    hasTasksChanged(newTasks) {
      if (newTasks.length !== this.tasks.length) {
        return true;
      }

      for (let i = 0; i < newTasks.length; i++) {
        const newTask = newTasks[i];
        const oldTask = this.tasks[i];

        if (
          !oldTask ||
          newTask.id !== oldTask.id ||
          newTask.name !== oldTask.name ||
          newTask.description !== oldTask.description ||
          newTask.publisher !== oldTask.publisher ||
          newTask.reward !== oldTask.reward
        ) {
          return true;
        }
      }

      return false;
    }

    // รับไอคอนภารกิจ
    getTaskIcon(status) {
      const iconMap = {
        available: '📋',
        inProgress: '⏳',
        completed: '✅',
      };
      return iconMap[status] || iconMap['available'];
    }

    // รับข้อมูลแชท
    getChatData() {
      try {
        // ให้ความสำคัญกับการใช้ mobileContextEditor เพื่อรับข้อมูล
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            return chatData.messages;
          }
        }

        // พยายามรับจากตัวแปร global
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        // พยายามรับจากตำแหน่งอื่นที่เป็นไปได้
        const SillyTavern = window['SillyTavern'];
        if (SillyTavern && SillyTavern.chat) {
          return SillyTavern.chat;
        }

        return [];
      } catch (error) {
        console.error('[Task App] รับข้อมูลแชทล้มเหลว:', error);
        return [];
      }
    }

    // รับเนื้อหาแอป
    getAppContent() {
      // แยกวิเคราะห์ข้อมูลใหม่ทุกครั้งที่เปิดแอป (เพื่อให้แน่ใจว่าแสดงเนื้อหาล่าสุด)
      const taskData = this.getCurrentTaskData();
      if (taskData.tasks.length !== this.tasks.length || this.hasTasksChanged(taskData.tasks)) {
        this.tasks = taskData.tasks;
        console.log('[Task App] 📋 อัปเดตข้อมูลภารกิจเมื่อเปิดแอป จำนวนภารกิจ:', this.tasks.length);
      }

      switch (this.currentView) {
        case 'taskList':
          return this.renderTaskList();
        case 'inProgress':
          return this.renderInProgress();
        case 'completed':
          return this.renderCompleted();
        default:
          return this.renderTaskList();
      }
    }

    // เรนเดอร์รายการภารกิจ
    renderTaskList() {
      console.log('[Task App] เรนเดอร์รายการภารกิจ...');

      const availableTasks = this.tasks.filter(
        task => !this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const inProgressTasks = this.tasks.filter(
        task => this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const completedTasks = this.tasks.filter(task => this.completedTasks.includes(task.id));

      const taskItems = availableTasks
        .map(
          task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-header-row">
                        <div class="task-name">${task.name}</div>
                        <button class="accept-task-btn" data-task-id="${task.id}">
                            รับภารกิจ
                        </button>
                    </div>
                    <div class="task-id">รหัสภารกิจ: ${task.id}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-reward">รางวัล: ${task.reward}</div>
                    <div class="task-publisher">ผู้ประกาศ: ${task.publisher}</div>
                </div>
            </div>
        `,
        )
        .join('');

      const emptyState = `
            <div class="task-empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">ไม่มีภารกิจที่รับได้</div>
            </div>
        `;

      return `
            <div class="task-app">
                <div class="task-tabs">
                    <button class="task-tab ${this.currentView === 'taskList' ? 'active' : ''}" data-view="taskList">
                        ภารกิจ (${availableTasks.length})
                    </button>
                    <button class="task-tab ${
                      this.currentView === 'inProgress' ? 'active' : ''
                    }" data-view="inProgress">
                        กำลังทำ (${inProgressTasks.length})
                    </button>
                    <button class="task-tab ${this.currentView === 'completed' ? 'active' : ''}" data-view="completed">
                        สำเร็จแล้ว (${completedTasks.length})
                    </button>
                </div>

                <div class="task-list">
                    <div class="task-grid">
                        ${availableTasks.length > 0 ? taskItems : emptyState}
                    </div>
                </div>
            </div>
        `;
    }

    // เรนเดอร์ภารกิจที่กำลังทำ
    renderInProgress() {
      console.log('[Task App] เรนเดอร์ภารกิจที่กำลังทำ...');

      const availableTasks = this.tasks.filter(
        task => !this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const inProgressTasks = this.tasks.filter(
        task => this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const completedTasks = this.tasks.filter(task => this.completedTasks.includes(task.id));

      const taskItems = inProgressTasks
        .map(
          task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-header-row">
                        <div class="task-name">${task.name}</div>
                        <div class="task-status">กำลังทำ</div>
                    </div>
                    <div class="task-id">รหัสภารกิจ: ${task.id}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-reward">รางวัล: ${task.reward}</div>
                    <div class="task-publisher">ผู้ประกาศ: ${task.publisher}</div>
                </div>
            </div>
        `,
        )
        .join('');

      const emptyState = `
            <div class="task-empty-state">
                <div class="empty-icon">⏳</div>
                <div class="empty-title">ไม่มีภารกิจที่กำลังทำ</div>
                <div class="empty-subtitle">รีบไปรับภารกิจกันเถอะ</div>
                <button class="back-to-tasks-btn">ดูภารกิจที่รับได้</button>
            </div>
        `;

      return `
            <div class="task-app">
                <div class="task-tabs">
                    <button class="task-tab ${this.currentView === 'taskList' ? 'active' : ''}" data-view="taskList">
                        ภารกิจ (${availableTasks.length})
                    </button>
                    <button class="task-tab ${
                      this.currentView === 'inProgress' ? 'active' : ''
                    }" data-view="inProgress">
                        กำลังทำ (${inProgressTasks.length})
                    </button>
                    <button class="task-tab ${this.currentView === 'completed' ? 'active' : ''}" data-view="completed">
                        สำเร็จแล้ว (${completedTasks.length})
                    </button>
                </div>

                <div class="task-list">
                    <div class="task-grid">
                        ${inProgressTasks.length > 0 ? taskItems : emptyState}
                    </div>
                </div>
            </div>
        `;
    }

    // เรนเดอร์ภารกิจที่สำเร็จแล้ว
    renderCompleted() {
      console.log('[Task App] เรนเดอร์ภารกิจที่สำเร็จแล้ว...');

      const availableTasks = this.tasks.filter(
        task => !this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const inProgressTasks = this.tasks.filter(
        task => this.acceptedTasks.includes(task.id) && !this.completedTasks.includes(task.id),
      );

      const completedTasks = this.tasks.filter(task => this.completedTasks.includes(task.id));

      const taskItems = completedTasks
        .map(
          task => `
            <div class="task-item completed" data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-header-row">
                        <div class="task-name">${task.name}</div>
                        <div class="task-status">สำเร็จแล้ว</div>
                    </div>
                    <div class="task-id">รหัสภารกิจ: ${task.id}</div>
                    <div class="task-description">${task.description}</div>
                    <div class="task-reward">รางวัล: ${task.reward}</div>
                    <div class="task-publisher">ผู้ประกาศ: ${task.publisher}</div>
                </div>
            </div>
        `,
        )
        .join('');

      const emptyState = `
            <div class="task-empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-title">ไม่มีภารกิจที่สำเร็จ</div>
                <div class="empty-subtitle">ภารกิจที่ทำสำเร็จแล้วจะแสดงที่นี่</div>
                <button class="back-to-tasks-btn">ดูภารกิจที่รับได้</button>
            </div>
        `;

      return `
            <div class="task-app">
                <div class="task-tabs">
                    <button class="task-tab ${this.currentView === 'taskList' ? 'active' : ''}" data-view="taskList">
                        ภารกิจ (${availableTasks.length})
                    </button>
                    <button class="task-tab ${
                      this.currentView === 'inProgress' ? 'active' : ''
                    }" data-view="inProgress">
                        กำลังทำ (${inProgressTasks.length})
                    </button>
                    <button class="task-tab ${this.currentView === 'completed' ? 'active' : ''}" data-view="completed">
                        สำเร็จแล้ว (${completedTasks.length})
                    </button>
                </div>

                <div class="task-list">
                    <div class="task-grid">
                        ${completedTasks.length > 0 ? taskItems : emptyState}
                    </div>
                </div>
            </div>
        `;
    }

    // อัปเดตรายการภารกิจ
    updateTaskList() {
      console.log('[Task App] อัปเดตรายการภารกิจ...');
      this.updateAppContent();
    }

    // อัปเดตเนื้อหาแอป
    updateAppContent() {
      const content = this.getAppContent();
      const appElement = document.getElementById('app-content');
      if (appElement) {
        appElement.innerHTML = content;
        // หน่วงเวลาผูก Event เพื่อให้แน่ใจว่า DOM อัปเดตแล้ว
        setTimeout(() => {
          this.bindEvents();
        }, 50);
      }
    }

    // ผูก Event
    bindEvents() {
      console.log('[Task App] ผูก Event...');

      // ค้นหา Element ในคอนเทนเนอร์แอปเพื่อหลีกเลี่ยงความขัดแย้งกับแอปอื่น
      const appContainer = document.getElementById('app-content');
      if (!appContainer) {
        console.error('[Task App] ไม่พบคอนเทนเนอร์แอป');
        return;
      }

      // Event ปุ่มรับภารกิจ
      appContainer.querySelectorAll('.accept-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const taskId = e.target.dataset.taskId;
          console.log('[Task App] คลิกปุ่มรับภารกิจ:', taskId);
          this.acceptTask(taskId);
        });
      });

      // Event ปุ่มกลับไปรายการภารกิจ
      appContainer.querySelectorAll('.back-to-tasks-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Task App] คลิกปุ่มกลับไปรายการภารกิจ');
          this.showTaskList();
        });
      });

      // Event สลับแท็บ
      appContainer.querySelectorAll('.task-tab').forEach(tab => {
        tab.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const view = e.target.dataset.view;
          console.log('[Task App] คลิกแท็บ:', view);
          this.switchView(view);
        });
      });

      // Event ปุ่มรีเฟรชภารกิจ
      appContainer.querySelectorAll('.refresh-tasks-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Task App] คลิกปุ่มรีเฟรชภารกิจ');
          this.refreshTaskList();
          this.showToast('กำลังรีเฟรชสถานะภารกิจ...', 'info');
        });
      });

      console.log(
        '[Task App] ผูก Event เสร็จสิ้น - แท็บ:',
        appContainer.querySelectorAll('.task-tab').length,
        'อัน, ปุ่มรีเฟรช:',
        appContainer.querySelectorAll('.refresh-tasks-btn').length,
        'อัน',
      );
    }

    // รับภารกิจ (จัดการตัวแปรโดยตรง)
    async acceptTask(taskId) {
      console.log('[Task App] รับภารกิจ:', taskId);

      const task = this.tasks.find(t => t.id === taskId && t.status === 'available');
      if (!task) {
        this.showToast('ภารกิจไม่พบหรือถูกรับไปแล้ว', 'warning');
        return;
      }

      try {
        // จัดการตัวแปร Mvu โดยตรง
        await this.acceptTaskDirectly(task);

        this.showToast('รับภารกิจสำเร็จ!', 'success');

        // รีเฟรชรายการภารกิจ
        this.refreshTasksData();
      } catch (error) {
        console.error('[Task App] รับภารกิจล้มเหลว:', error);
        this.showToast('การรับภารกิจล้มเหลว: ' + error.message, 'error');
      }
    }

    // จัดการตัวแปร Mvu โดยตรงเพื่อรับภารกิจ (แก้ไขสถานะภารกิจ)
    async acceptTaskDirectly(task) {
      try {
        console.log('[Task App] เริ่มอัปเดตตัวแปรโดยตรง...');

        // รับ ID ข้อความเป้าหมาย
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

        // รับข้อมูล Mvu
        const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        if (!mvuData || !mvuData.stat_data) {
          throw new Error('ไม่สามารถรับข้อมูลตัวแปร Mvu');
        }

        // ตรวจสอบว่ามีระบบภารกิจอยู่จริง
        if (!mvuData.stat_data['任务']) {
          throw new Error('ไม่พบระบบภารกิจ');
        }

        const taskKey = task.id;

        // 1. แก้ไขสถานะภารกิจเป็น "進行中" (กำลังทำ - ต้องคงค่าภาษาจีนไว้เพื่อให้ระบบทำงานต่อได้)
        await window.Mvu.setMvuVariable(mvuData, `任务.${taskKey}.任务状态[0]`, '进行中', {
          reason: `รับภารกิจ: ${task.name}`,
          is_recursive: false,
        });
        console.log(`[Task App] ✅ อัปเดตสถานะภารกิจ: ${taskKey} -> 进行中 (กำลังทำ)`);

        // 2. ไม่บันทึกประวัติ (ให้ AI สร้างสรุปแทน)
        // การรับภารกิจจะถูกสะท้อนในสรุปที่ AI ตอบกลับ

        // บันทึกการอัปเดต
        await window.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: targetMessageId });

        console.log('[Task App] ✅ อัปเดตตัวแปรเสร็จสมบูรณ์');
      } catch (error) {
        console.error('[Task App] อัปเดตตัวแปรล้มเหลว:', error);
        throw error;
      }
    }

    // รับเวลาในเกมปัจจุบัน (ค้นหาข้อความ AI ชั้นบน)
    getCurrentGameTime() {
      try {
        // ใช้ Mvu Framework เพื่อรับตัวแปร (ค้นหาขึ้นไปหาข้อความ AI)
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
          }

          const mvuData = window.Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
          if (mvuData && mvuData.stat_data && mvuData.stat_data['家族信息']) {
            const familyInfo = mvuData.stat_data['家族信息'];
            if (familyInfo.当前时间 && Array.isArray(familyInfo.当前时间)) {
              const timeValue = familyInfo.当前时间[0];
              if (timeValue) return timeValue;
            }
          }
        }

        // วิธีสำรอง: รับจากบริบทของ SillyTavern
        if (window.SillyTavern) {
          const context = window.SillyTavern.getContext ? window.SillyTavern.getContext() : window.SillyTavern;
          if (context && context.chatMetadata && context.chatMetadata.variables) {
            const familyInfo = context.chatMetadata.variables['家族信息'];
            if (familyInfo && familyInfo.当前时间 && Array.isArray(familyInfo.当前时间)) {
              const timeValue = familyInfo.当前时间[0];
              if (timeValue) return timeValue;
            }
          }
        }
      } catch (error) {
        console.warn('[Task App] รับเวลาในเกมล้มเหลว:', error);
      }
      return 'ไม่ทราบเวลา';
    }

    // สลับมุมมอง
    switchView(view) {
      console.log('[Task App] สลับมุมมอง:', view);
      this.currentView = view;
      this.updateAppContent();
      this.updateHeader();
    }

    // แสดงรายการภารกิจ
    showTaskList() {
      this.switchView('taskList');
    }

    // แสดงภารกิจที่กำลังทำ
    showInProgress() {
      this.switchView('inProgress');
    }

    // แสดงภารกิจที่สำเร็จแล้ว
    showCompleted() {
      this.switchView('completed');
    }

    // ส่งข้อความดูภารกิจ
    sendViewTasksMessage() {
      try {
        console.log('[Task App] ส่งข้อความดูภารกิจ');

        const message =
          '<Request:Meta-instructions：接下来你要，按照当前剧情，输出至少3个任务,注意更新对应变量,不要输出重复的任务，注意更新任务变量>查看任务';

        // ใช้วิธีส่งแบบเดียวกับแอปข้อความ
        this.sendToSillyTavern(message);
      } catch (error) {
        console.error('[Task App] ส่งข้อความดูภารกิจล้มเหลว:', error);
      }
    }

    // ส่งข้อความไปยัง SillyTavern
    async sendToSillyTavern(message) {
      try {
        console.log('[Task App] ส่งข้อความไปยัง SillyTavern:', message);

        // พยายามหากล่องข้อความ
        const textarea = document.querySelector('#send_textarea');
        if (!textarea) {
          console.error('[Task App] ไม่พบกล่องข้อความ');
          return this.sendToSillyTavernBackup(message);
        }

        // ตั้งค่าเนื้อหาข้อความ
        textarea.value = message;
        textarea.focus();

        // Trigger input event
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // คลิกปุ่มส่ง
        const sendButton = document.querySelector('#send_but');
        if (sendButton) {
          sendButton.click();
          console.log('[Task App] คลิกปุ่มส่งแล้ว');
          return true;
        }

        return this.sendToSillyTavernBackup(message);
      } catch (error) {
        console.error('[Task App] เกิดข้อผิดพลาดขณะส่งข้อความ:', error);
        return this.sendToSillyTavernBackup(message);
      }
    }

    // วิธีส่งข้อความสำรอง
    async sendToSillyTavernBackup(message) {
      try {
        console.log('[Task App] ใช้วิธีส่งข้อความสำรอง:', message);

        const textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Task App] วิธีส่งข้อความสำรองล้มเหลว:', error);
        return false;
      }
    }

    // รีเฟรชรายการภารกิจด้วยตนเอง
    refreshTaskList() {
      console.log('[Task App] รีเฟรชรายการภารกิจด้วยตนเอง');

      // บังคับแยกวิเคราะห์ข้อมูลภารกิจใหม่
      this.parseTasksFromContext();

      // อัปเดตหน้าจอ
      this.updateAppContent();

      // แสดงแจ้งเตือนความสำเร็จ
      setTimeout(() => {
        this.showToast('สถานะภารกิจอัปเดตแล้ว', 'success');
      }, 500);
    }

    // ทำลายแอป ล้างทรัพยากร
    destroy() {
      console.log('[Task App] ทำลายแอป ล้างทรัพยากร');

      // ล้าง Event Listener
      if (this.eventListenersSetup && this.messageReceivedHandler) {
        const eventSource = window['eventSource'];
        if (eventSource && eventSource.removeListener) {
          eventSource.removeListener('MESSAGE_RECEIVED', this.messageReceivedHandler);
          console.log('[Task App] 🗑️ ลบผู้ฟังเหตุการณ์ MESSAGE_RECEIVED แล้ว');
        }
      }

      // รีเซ็ตสถานะ
      this.eventListenersSetup = false;
      this.isAutoRenderEnabled = false;

      // ล้างข้อมูล
      this.tasks = [];
      this.acceptedTasks = [];
      this.completedTasks = [];
    }

    // อัปเดต Header
    updateHeader() {
      // แจ้ง mobile-phone ให้อัปเดต Header
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'task',
          title: this.getViewTitle(),
          view: this.currentView,
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    // รับชื่อหัวข้อของมุมมอง
    getViewTitle() {
      switch (this.currentView) {
        case 'taskList':
          return 'โถงภารกิจ';
        case 'inProgress':
          return 'กำลังทำ';
        case 'completed':
          return 'สำเร็จแล้ว';
        default:
          return 'โถงภารกิจ';
      }
    }

    // แสดงข้อความแจ้งเตือน
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `task-toast ${type}`;
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

  // สร้าง Global Instance
  window.TaskApp = TaskApp;
  window.taskApp = new TaskApp();
} // จบการตรวจสอบคลาส

// ฟังก์ชัน Global สำหรับเรียกใช้งาน
window.getTaskAppContent = function () {
  console.log('[Task App] รับเนื้อหาแอปภารกิจ');

  if (!window.taskApp) {
    console.error('[Task App] อินสแตนซ์ taskApp ไม่มีอยู่');
    return '<div class="error-message">โหลดแอปภารกิจล้มเหลว</div>';
  }

  try {
    return window.taskApp.getAppContent();
  } catch (error) {
    console.error('[Task App] รับเนื้อหาแอปล้มเหลว:', error);
    return '<div class="error-message">โหลดเนื้อหาแอปภารกิจล้มเหลว</div>';
  }
};

window.bindTaskAppEvents = function () {
  console.log('[Task App] ผูก Event แอปภารกิจ');

  if (!window.taskApp) {
    console.error('[Task App] อินสแตนซ์ taskApp ไม่มีอยู่');
    return;
  }

  try {
    // หน่วงเวลาผูก เพื่อให้แน่ใจว่า DOM โหลดเสร็จสมบูรณ์
    setTimeout(() => {
      window.taskApp.bindEvents();
    }, 100);
  } catch (error) {
    console.error('[Task App] ผูก Event ล้มเหลว:', error);
  }
};

window.taskAppShowInProgress = function () {
  if (window.taskApp) {
    window.taskApp.showInProgress();
  }
};

window.taskAppShowCompleted = function () {
  if (window.taskApp) {
    window.taskApp.showCompleted();
  }
};

window.taskAppRefresh = function () {
  if (window.taskApp) {
    window.taskApp.refreshTaskList();
  }
};

window.taskAppSendViewMessage = function () {
  if (window.taskApp) {
    window.taskApp.sendViewTasksMessage();
  }
};

window.taskAppDebugInfo = function () {
  if (window.taskApp) {
    console.log('[Task App Debug] จำนวนภารกิจปัจจุบัน:', window.taskApp.tasks.length);
    console.log('[Task App Debug] รายการภารกิจ:', window.taskApp.tasks);
    console.log('[Task App Debug] ภารกิจที่รับแล้ว:', window.taskApp.acceptedTasks);
    console.log('[Task App Debug] ภารกิจที่สำเร็จแล้ว:', window.taskApp.completedTasks);
    console.log('[Task App Debug] มุมมองปัจจุบัน:', window.taskApp.currentView);
    console.log('[Task App Debug] การตั้งค่า Event Listener:', window.taskApp.eventListenersSetup);
    console.log('[Task App Debug] เปิดใช้งานการเรนเดอร์อัตโนมัติ:', window.taskApp.isAutoRenderEnabled);
  }
};

window.taskAppDestroy = function () {
  if (window.taskApp) {
    window.taskApp.destroy();
    console.log('[Task App] แอปถูกทำลายแล้ว');
  }
};

window.taskAppForceReload = function () {
  console.log('[Task App] 🔄 บังคับโหลดแอปใหม่...');

  // ทำลายอินสแตนซ์เก่าก่อน
  if (window.taskApp) {
    window.taskApp.destroy();
  }

  // สร้างอินสแตนซ์ใหม่
  window.taskApp = new TaskApp();
  console.log('[Task App] ✅ แอปโหลดใหม่แล้ว - เวอร์ชัน 3.0');
};

window.taskAppForceRefresh = function () {
  console.log('[Task App] 🔄 บังคับรีเฟรชสถานะภารกิจ...');

  if (window.taskApp) {
    // บังคับแยกวิเคราะห์ใหม่
    window.taskApp.parseTasksFromContext();
    window.taskApp.updateAppContent();
    window.taskApp.showToast('บังคับรีเฟรชเสร็จสมบูรณ์', 'success');
  } else {
    console.error('[Task App] อินสแตนซ์ taskApp ไม่มีอยู่');
  }
};

window.taskAppTestTabs = function () {
  console.log('[Task App] 🧪 ทดสอบ Event คลิกแท็บ...');

  const tabs = document.querySelectorAll('.task-tab');
  console.log('[Task App] พบแท็บจำนวน:', tabs.length);

  tabs.forEach((tab, index) => {
    console.log(`[Task App] แท็บ ${index + 1}:`, {
      text: tab.textContent.trim(),
      view: tab.dataset.view,
      active: tab.classList.contains('active'),
    });
  });

  if (tabs.length > 0) {
    console.log('[Task App] ลองคลิกแท็บที่สอง...');
    const secondTab = tabs[1];
    if (secondTab) {
      secondTab.click();
      console.log('[Task App] ทริกเกอร์ Event คลิกแล้ว');
    }
  }
};

console.log(
  '[Task App] โมดูลแอปภารกิจโหลดเสร็จสมบูรณ์ - เวอร์ชัน 3.0 (ขับเคลื่อนด้วยเหตุการณ์ + เป้าหมายตระกูล + จัดการตัวแปรโดยตรง)',
);
