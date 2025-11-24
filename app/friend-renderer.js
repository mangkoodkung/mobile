/**
 * Friend Renderer - ตัวแสดงผลรายชื่อเพื่อน
 * ดึงข้อมูลเพื่อนจากบริบทและแสดงผลเป็นรายการข้อความ
 */

// ป้องกันการนิยามซ้ำ
if (typeof window.FriendRenderer === 'undefined') {
  class FriendRenderer {
    constructor() {
      // ใช้ตัวจัดการ Regular Expression แบบรวมศูนย์
      this.contextMonitor =
        window['contextMonitor'] || (window['ContextMonitor'] ? new window['ContextMonitor']() : null);
      if (!this.contextMonitor) {
        console.warn('[Friend Renderer] ตัวตรวจสอบบริบทไม่ได้เริ่มต้น, ใช้ Regular Expression เริ่มต้น');
        this.friendPattern = /\[好友id\|([^|]+)\|(\d+)\]/g;
      } else {
        this.friendPattern = this.contextMonitor.getRegexForFormat('friend');
      }
      this.extractedFriends = [];
      this.lastChatRecord = '';
      this.init();
    }

    init() {
      console.log('[Friend Renderer] ตัวแสดงผลรายชื่อเพื่อนเริ่มต้นเสร็จสมบูรณ์');
    }

    /**
     * ดึงข้อมูลเพื่อนและกลุ่มแชททั้งหมดจากบริบท
     */
    extractFriendsFromContext() {
      this.extractedFriends = [];

      // ตรวจสอบว่าตัวแก้ไขบริบทมือถือใช้งานได้หรือไม่
      if (!window.mobileContextEditor) {
        console.warn('[Friend Renderer] ตัวแก้ไขบริบทมือถือไม่ได้โหลด');
        return [];
      }

      // ตรวจสอบว่า SillyTavern พร้อมใช้งานหรือไม่
      if (!window.mobileContextEditor.isSillyTavernReady()) {
        console.warn('[Friend Renderer] SillyTavern ยังไม่พร้อม');
        return [];
      }

      try {
        // รับข้อมูลบริบท
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat || !Array.isArray(context.chat)) {
          console.warn('[Friend Renderer] ข้อมูลแชทไม่พร้อมใช้งาน');
          return [];
        }

        // วนซ้ำทุกข้อความ, ดึงข้อมูลเพื่อนและกลุ่มแชท
        const friendsMap = new Map();
        const groupsMap = new Map();

        // นิยาม Regular Expression
        const friendPattern = /\[好友id\|([^|]+)\|(\d+)\]/g;
        const groupPattern = /\[群聊\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

        // เพิ่มเติม: รองรับรูปแบบข้อความกลุ่มเพื่อดึงข้อมูลกลุ่ม
        const groupMessagePattern = /\[群聊消息\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
        // เพิ่มเติม: รองรับรูปแบบข้อความกลุ่มของเรา
        const myGroupMessagePattern = /\[我方群聊消息\|我\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

        context.chat.forEach((message, index) => {
          if (message.mes && typeof message.mes === 'string') {
            // ลบแท็ก thinking ออกก่อนทำการจับคู่ เพื่อหลีกเลี่ยงการดึงเนื้อหาภายใน thinking
            const messageForMatching = this.removeThinkingTags(message.mes);

            // ดึงข้อมูลเพื่อน
            const friendMatches = [...messageForMatching.matchAll(friendPattern)];
            friendMatches.forEach(match => {
              const friendName = match[1];
              const friendNumber = match[2];
              const friendKey = `friend_${friendName}_${friendNumber}`;

              if (!friendsMap.has(friendKey) || friendsMap.get(friendKey).messageIndex < index) {
                friendsMap.set(friendKey, {
                  type: 'friend',
                  name: friendName,
                  number: friendNumber,
                  messageIndex: index,
                  addTime: message.send_date || Date.now(),
                  isGroup: false,
                });
              }
            });

            // ดึงข้อมูลกลุ่มแชท (รูปแบบเดิม)
            const groupMatches = [...messageForMatching.matchAll(groupPattern)];
            groupMatches.forEach(match => {
              const groupName = match[1];
              const groupId = match[2];
              const groupMembers = match[3];
              const groupKey = `group_${groupId}`; // ใช้ ID กลุ่มเป็น key เดียวกัน

              if (!groupsMap.has(groupKey) || groupsMap.get(groupKey).messageIndex < index) {
                groupsMap.set(groupKey, {
                  type: 'group',
                  name: groupName,
                  number: groupId,
                  members: groupMembers,
                  messageIndex: index,
                  addTime: message.send_date || Date.now(),
                  isGroup: true,
                });
              }
            });

            // จัดการรูปแบบข้อความกลุ่ม
            const groupMessageMatches = [...messageForMatching.matchAll(groupMessagePattern)];
            groupMessageMatches.forEach(match => {
              const groupId = match[1];
              const senderName = match[2];
              const messageType = match[3];
              const messageContent = match[4];

              const groupKey = `group_${groupId}`; // ใช้ ID กลุ่มเป็น key เดียวกัน

              if (!groupsMap.has(groupKey)) {
                // หากกลุ่มแชทไม่มีอยู่, สร้างบันทึกกลุ่มตามข้อความ
                groupsMap.set(groupKey, {
                  type: 'group',
                  name: `กลุ่มแชท${groupId}`, // Translated: 群聊${groupId} -> กลุ่มแชท${groupId}
                  number: groupId,
                  members: senderName,
                  messageIndex: index,
                  addTime: message.send_date || Date.now(),
                  isGroup: true,
                });
              } else {
                // หากมีอยู่แล้ว, อัปเดตรายการสมาชิกและดัชนีข้อความล่าสุด
                const existingGroup = groupsMap.get(groupKey);
                if (existingGroup.members && !existingGroup.members.includes(senderName)) {
                  existingGroup.members += `、${senderName}`;
                }
                if (existingGroup.messageIndex < index) {
                  existingGroup.messageIndex = index;
                  existingGroup.addTime = message.send_date || Date.now();
                }
              }
            });

            // จัดการรูปแบบข้อความกลุ่มของเรา
            const myGroupMessageMatches = [...messageForMatching.matchAll(myGroupMessagePattern)];
            myGroupMessageMatches.forEach(match => {
              const groupId = match[1];
              const messageType = match[2];
              const messageContent = match[3];

              const groupKey = `group_${groupId}`; // ใช้ ID กลุ่มเป็น key เดียวกัน

              if (!groupsMap.has(groupKey)) {
                // หากกลุ่มแชทไม่มีอยู่, สร้างบันทึกกลุ่มตามข้อความ
                groupsMap.set(groupKey, {
                  type: 'group',
                  name: `กลุ่มแชท${groupId}`, // Translated: 群聊${groupId} -> กลุ่มแชท${groupId}
                  number: groupId,
                  members: '我',
                  messageIndex: index,
                  addTime: message.send_date || Date.now(),
                  isGroup: true,
                });
              } else {
                // หากมีอยู่แล้ว, อัปเดตดัชนีข้อความล่าสุด
                const existingGroup = groupsMap.get(groupKey);
                if (!existingGroup.members.includes('我')) {
                  existingGroup.members += '、我';
                }
                if (existingGroup.messageIndex < index) {
                  existingGroup.messageIndex = index;
                  existingGroup.addTime = message.send_date || Date.now();
                }
              }
            });
          }
        });

        // รวมเพื่อนและกลุ่มแชท, จัดเรียงตามเวลาที่เพิ่ม
        const allContacts = [...Array.from(friendsMap.values()), ...Array.from(groupsMap.values())].sort(
          (a, b) => b.addTime - a.addTime,
        );

        // ค้นหาข้อความสุดท้ายสำหรับผู้ติดต่อแต่ละราย
        this.extractedFriends = allContacts.map(contact => {
          const lastMessage = this.getLastMessageForContact(context.chat, contact);
          return {
            ...contact,
            lastMessage: lastMessage,
          };
        });

        // แสดงผลลัพธ์การบันทึกเฉพาะเมื่อจำนวนผู้ติดต่อเปลี่ยนแปลง เพื่อหลีกเลี่ยงการแสดงผลซ้ำ
        if (!this.lastContactCount || this.lastContactCount !== this.extractedFriends.length) {
          console.log(`[Friend Renderer] ดึงผู้ติดต่อ ${this.extractedFriends.length} รายการ (เพื่อน+กลุ่ม) จากบริบท`); // Translated: 从上下文中提取到 ${this.extractedFriends.length} 个联系人 (好友+群聊)
          this.lastContactCount = this.extractedFriends.length;
        }

        return this.extractedFriends;
      } catch (error) {
        console.error('[Friend Renderer] ดึงข้อมูลผู้ติดต่อล้มเหลว:', error); // Translated: 提取联系人信息失败
        return [];
      }
    }

    /**
     * รับข้อความสุดท้ายสำหรับผู้ติดต่อที่ระบุ
     */
    getLastMessageForContact(chatMessages, contact) {
      if (!chatMessages || chatMessages.length === 0) {
        return 'ไม่มีบันทึกการแชท'; // Translated: 暂无聊天记录
      }

      // สร้างรูปแบบการจับคู่
      let messagePatterns = [];

      if (contact.isGroup) {
        // รูปแบบข้อความกลุ่มแชท
        messagePatterns = [
          // ข้อความกลุ่มแชทของเรา: [我方群聊消息|我|群ID|消息类型|消息内容]
          new RegExp(`\\[我方群聊消息\\|我\\|${this.escapeRegex(contact.number)}\\|[^|]+\\|([^\\]]+)\\]`, 'g'),
          // รูปแบบข้อความกลุ่มแชท: [群聊消息|群ID|发送者|消息类型|消息内容]
          new RegExp(`\\[群聊消息\\|${this.escapeRegex(contact.number)}\\|[^|]+\\|[^|]+\\|([^\\]]+)\\]`, 'g'),
          // ความเข้ากันได้ของรูปแบบเดิม (ถ้ายังมีอยู่)
          new RegExp(
            `\\[我方群聊消息\\|${this.escapeRegex(contact.name)}\\|${this.escapeRegex(
              contact.number,
            )}\\|[^|]+\\|([^|]+)\\|[^\\]]+\\]`,
            'g',
          ),
          new RegExp(
            `\\[对方群聊消息\\|${this.escapeRegex(contact.name)}\\|${this.escapeRegex(
              contact.number,
            )}\\|[^|]+\\|[^|]+\\|([^\\]]+)\\]`,
            'g',
          ),
        ];
      } else {
        // รูปแบบข้อความส่วนตัว
        messagePatterns = [
          // ข้อความของเรา: [我方消息|我|好友号|消息内容|时间]
          new RegExp(`\\[我方消息\\|我\\|${this.escapeRegex(contact.number)}\\|([^|]+)\\|[^\\]]+\\]`, 'g'),
          // ข้อความของอีกฝ่าย: [对方消息|好友名|好友号|消息类型|消息内容]
          new RegExp(
            `\\[对方消息\\|${this.escapeRegex(contact.name)}\\|${this.escapeRegex(
              contact.number,
            )}\\|[^|]+\\|([^\\]]+)\\]`,
            'g',
          ),
        ];
      }

      // ค้นหาย้อนกลับจากข้อความสุดท้าย
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const message = chatMessages[i];
        if (message.mes && typeof message.mes === 'string') {
          for (const pattern of messagePatterns) {
            const matches = [...message.mes.matchAll(pattern)];
            if (matches.length > 0) {
              // พบข้อความที่ตรงกันล่าสุด, ดึงเนื้อหา
              const lastMatch = matches[matches.length - 1];
              if (lastMatch[1]) {
                const content = lastMatch[1].trim();
                return content.length > 50 ? content.substring(0, 50) + '...' : content;
              }
            }
            pattern.lastIndex = 0; // รีเซ็ต Regular Expression
          }
        }
      }

      return contact.isGroup ? 'ไม่มีบันทึกกลุ่มแชท' : 'ไม่มีบันทึกการแชท'; // Translated: 暂无群聊记录, 暂无聊天记录
    }

    /**
     * Escape อักขระพิเศษของ Regular Expression
     */
    escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * รับบันทึกการแชทล่าสุด (คงความเข้ากันได้)
     */
    getLastChatRecord(chatMessages) {
      if (!chatMessages || chatMessages.length === 0) {
        return 'ไม่มีบันทึกการแชท'; // Translated: 暂无聊天记录
      }

      // ค้นหาย้อนกลับจากข้อความสุดท้าย, หาข้อความที่ไม่ใช่การเพิ่มเพื่อน/เพิ่มกลุ่ม
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const message = chatMessages[i];
        if (message.mes && typeof message.mes === 'string') {
          // หากไม่ใช่ข้อความรูปแบบการเพิ่มเพื่อนหรือกลุ่ม ให้ถือเป็นบันทึกการแชทล่าสุด
          const friendPattern = /\[好友id\|[^|]+\|\d+\]/;
          const groupPattern = /\[群聊\|[^|]+\|[^|]+\|[^\]]+\]/;

          if (!friendPattern.test(message.mes) && !groupPattern.test(message.mes)) {
            // ดึงเนื้อหาข้อความจริง
            const actualContent = this.extractActualMessageContent(message.mes);
            return actualContent.length > 50 ? actualContent.substring(0, 50) + '...' : actualContent;
          }
        }
      }

      return 'ไม่มีบันทึกการแชท'; // Translated: 暂无聊天记录
    }

    /**
     * ดึงเนื้อหาข้อความจริง (กรองกระบวนการคิด, ดึงข้อความรูปแบบ QQ)
     */
    extractActualMessageContent(messageText) {
      try {
        // 1. ลบแท็ก <thinking> และเนื้อหาภายใน
        let cleanedText = messageText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

        // 2. ลองดึงข้อความรูปแบบ QQ
        const qqMessagePatterns = [
          // รูปแบบข้อความของเรา: [我方消息|好友名|好友号|消息内容|时间]
          /\[我方消息\|[^|]+\|[^|]+\|([^|]+)\|[^\]]+\]/g,
          // รูปแบบข้อความกลุ่มของเรา: [我方群聊消息|群名|群号|我|消息内容|时间]
          /\[我方群聊消息\|[^|]+\|[^|]+\|[^|]+\|([^|]+)\|[^\]]+\]/g,
          // รูปแบบข้อความของอีกฝ่าย: [对方消息|角色名|数字id|消息类型|消息内容]
          /\[对方消息\|[^|]+\|[^|]+\|[^|]+\|([^\]]+)\]/g,
          // รูปแบบข้อความกลุ่มของอีกฝ่าย: [对方群聊消息|群名|群号|发言者|消息类型|消息内容]
          /\[对方群聊消息\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|([^\]]+)\]/g,
          // เพิ่มเติม: รูปแบบข้อความกลุ่ม: [群聊消息|群ID|发送者|消息类型|消息内容]
          /\[群聊消息\|[^|]+\|[^|]+\|[^|]+\|([^\]]+)\]/g,
          // รูปแบบสติกเกอร์: [表情包|文件名|ไฟล์พาธ]
          /\[表情包\|[^|]+\|[^\]]+\]/g,
          // รูปแบบเสียง: [语音|ระยะเวลา|เนื้อหา]
          /\[语音\|[^|]+\|([^\]]+)\]/g,
          // รูปแบบอั่งเปา: [红包|จำนวนเงิน|คำอวยพร]
          /\[红包\|([^|]+)\|[^\]]+\]/g,
        ];

        // ค้นหาข้อความที่ตรงกันทั้งหมด
        const extractedMessages = [];

        for (const pattern of qqMessagePatterns) {
          let match;
          while ((match = pattern.exec(cleanedText)) !== null) {
            if (match[1]) {
              let content = match[1];

              // ตรวจสอบว่ามีแท็ก HTML หรือไม่
              if (content.includes('<img')) {
                content = '[รูปภาพ]'; // Translated: [图片]
              } else if (content.includes('<video')) {
                content = '[วิดีโอ]'; // Translated: [视频]
              } else if (content.includes('<audio')) {
                content = '[เสียง]'; // Translated: [音频]
              } else if (/<[^>]+>/.test(content)) {
                // ลบแท็ก HTML อื่นๆ ออก, คงไว้เฉพาะเนื้อหาข้อความ
                content = content.replace(/<[^>]*>/g, '').trim();
                if (!content) {
                  content = '[ข้อความ Rich Text]'; // Translated: [富文本消息]
                }
              }

              // สำหรับอั่งเปา, แสดง "อั่งเปา: จำนวนเงิน"
              if (pattern.source.includes('红包')) {
                extractedMessages.push(`อั่งเปา: ${content}`); // Translated: 红包：${content}
              } else if (pattern.source.includes('表情包')) {
                extractedMessages.push('สติกเกอร์'); // Translated: 表情包
              } else if (pattern.source.includes('语音')) {
                extractedMessages.push(`เสียง: ${content}`); // Translated: 语音：${content}
              } else {
                extractedMessages.push(content);
              }
            } else if (match[0]) {
              // สำหรับสติกเกอร์ที่ไม่มีเนื้อหาที่ดึงออกมา ให้แสดงประเภทโดยตรง
              if (pattern.source.includes('表情包')) {
                extractedMessages.push('สติกเกอร์'); // Translated: 表情包
              }
            }
          }
          pattern.lastIndex = 0; // รีเซ็ต Regular Expression
        }

        // หากดึงข้อความได้ ให้ส่งคืนข้อความสุดท้าย
        if (extractedMessages.length > 0) {
          return extractedMessages[extractedMessages.length - 1];
        }

        // 3. หากไม่พบรูปแบบ QQ, ลองใช้รูปแบบทั่วไปอื่นๆ
        cleanedText = cleanedText.trim();

        // ลบช่องว่างบรรทัดที่เกินมา
        cleanedText = cleanedText.replace(/\n\s*\n/g, '\n');

        // หากยังยาวอยู่, ใช้บรรทัดแรกเป็นการแสดงตัวอย่าง
        if (cleanedText.length > 50) {
          const firstLine = cleanedText.split('\n')[0];
          return firstLine || 'เนื้อหาข้อความ'; // Translated: 消息内容
        }

        return cleanedText || 'เนื้อหาข้อความ'; // Translated: 消息内容
      } catch (error) {
        console.error('[Friend Renderer] ดึงเนื้อหาข้อความล้มเหลว:', error); // Translated: 提取消息内容失败
        return 'เนื้อหาข้อความ'; // Translated: 消息内容
      }
    }

    /**
     * ฟังก์ชัน Escape HTML
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * แสดงผล HTML ของรายการเพื่อนและกลุ่มแชท
     */
    renderFriendsHTML() {
      // ดึงข้อมูลเพื่อนและกลุ่มแชทก่อน
      const contacts = this.extractFriendsFromContext();

      if (contacts.length === 0) {
        return `
          <div class="empty-state">
            <div class="empty-icon">💬</div>
            <div class="empty-text">ไม่มีผู้ติดต่อ</div>
            <div class="empty-hint">คลิกปุ่ม "เพิ่ม" ที่มุมขวาบนเพื่อเพิ่มเพื่อนหรือสร้างกลุ่มแชท</div>
          </div>
        `; // Translated: 暂无联系人, 点击右上角"添加"按钮添加好友或创建群聊
      }

      // แสดงผลรายการผู้ติดต่อ
      const contactsHTML = contacts
        .map(contact => {
          const lastMessage = this.escapeHtml(contact.lastMessage || 'ไม่มีข้อความ'); // Translated: 暂无消息

          if (contact.isGroup) {
            // รายการกลุ่มแชท
            return `
              <div class="message-item group-item" data-friend-id="${contact.number}" data-is-group="true">
                <div class="message-avatar group-avatar"></div>
                <div class="message-content">
                  <div class="message-name">
                    ${contact.name}
                    <span class="group-badge">กลุ่ม</span>
                  </div>
                  <div class="message-text">${lastMessage}</div>
                </div>
                <div class="group-members-info">
                  <span class="member-count">${this.getMemberCount(contact.members)}</span>
                </div>
              </div>
            `; // Translated: 群聊 -> กลุ่ม
          } else {
            // รายการเพื่อนส่วนตัว
            const avatar = this.getRandomAvatar();
            return `
              <div class="message-item friend-item" data-friend-id="${contact.number}" data-is-group="false">
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">
                  <div class="message-name">${contact.name}</div>
                  <div class="message-text">${lastMessage}</div>
                </div>
              </div>
            `;
          }
        })
        .join('');

      return contactsHTML;
    }

    /**
     * รับจำนวนสมาชิกกลุ่ม
     */
    getMemberCount(membersString) {
      if (!membersString) return 0;
      // รูปแบบสมาชิกกลุ่ม: 我、张三、李四、王五
      const members = membersString.split('、').filter(m => m.trim());
      return members.length;
    }

    /**
     * รับอวาตาร์แบบสุ่ม
     */
    getRandomAvatar() {
      // ส่งคืนสตริงว่าง, ไม่แสดงอีโมจิ, แสดงเฉพาะภาพพื้นหลัง
      return '';
    }

    /**
     * จัดรูปแบบเวลา
     */
    formatTime(timestamp) {
      // จัดการรูปแบบ timestamp ที่เป็นไปได้ทั้งหมด
      let date;

      if (!timestamp) {
        // หากไม่มี timestamp, ใช้เวลาปัจจุบัน
        date = new Date();
      } else if (typeof timestamp === 'string') {
        // หากเป็นสตริง, ลองแยกวิเคราะห์
        date = new Date(timestamp);
        // หากแยกวิเคราะห์ล้มเหลว, ใช้เวลาปัจจุบัน
        if (isNaN(date.getTime())) {
          date = new Date();
        }
      } else if (typeof timestamp === 'number') {
        // หากเป็นตัวเลข, ใช้โดยตรง
        date = new Date(timestamp);
        // ตรวจสอบว่าเป็น timestamp ที่ถูกต้องหรือไม่
        if (isNaN(date.getTime())) {
          date = new Date();
        }
      } else {
        // กรณีอื่น, ใช้เวลาปัจจุบัน
        date = new Date();
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      // หากความแตกต่างของเวลามากเกินไป (เกิน 1 ปี), อาจเป็นปัญหาของรูปแบบ timestamp, แสดงรูปแบบง่ายๆ
      if (Math.abs(diffDays) > 365) {
        return date.toLocaleDateString('th-TH', {
          // Changed to th-TH locale
          month: 'short',
          day: 'numeric',
        });
      }

      if (diffMins < 1) {
        return 'เมื่อกี้'; // Translated: 刚刚
      } else if (diffMins < 60) {
        return `${diffMins} นาทีที่แล้ว`; // Translated: 分钟前
      } else if (diffHours < 24) {
        return `${diffHours} ชั่วโมงที่แล้ว`; // Translated: 小时前
      } else if (diffDays < 7) {
        return `${diffDays} วันที่แล้ว`; // Translated: 天前
      } else {
        return date.toLocaleDateString('th-TH', {
          // Changed to th-TH locale
          month: 'short',
          day: 'numeric',
        });
      }
    }

    /**
     * รับจำนวนเพื่อน
     */
    getFriendCount() {
      return this.extractedFriends.length;
    }

    /**
     * รับข้อมูลเพื่อนตาม ID
     */
    getFriendById(friendId) {
      return this.extractedFriends.find(friend => friend.number === friendId);
    }

    /**
     * รีเฟรชรายการเพื่อน
     */
    refresh() {
      this.extractFriendsFromContext();
      console.log('[Friend Renderer] รายการเพื่อนถูกรีเฟรชแล้ว'); // Translated: 好友列表已刷新
    }

    /**
     * ดึงข้อมูลเพื่อน (ชื่อเมธอดที่เข้ากันได้)
     */
    extractFriends() {
      return this.extractFriendsFromContext();
    }

    /**
     * ลบเนื้อหาที่ถูกล้อมรอบด้วยแท็ก thinking
     */
    removeThinkingTags(text) {
      if (!text || typeof text !== 'string') {
        return text;
      }

      // ลบแท็ก <think>...</think> และ <thinking>...</thinking> และเนื้อหาภายใน
      const thinkingTagRegex = /<think>[\s\S]*?<\/think>|<thinking>[\s\S]*?<\/thinking>/gi;
      return text.replace(thinkingTagRegex, '');
    }

    /**
     * ตรวจสอบว่าเครื่องหมายรูปแบบอยู่ภายในแท็ก thinking หรือไม่
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
     * ลบเครื่องหมายรูปแบบที่ไม่ได้อยู่ภายในแท็ก thinking เท่านั้น
     */
    removePatternOutsideThinkingTags(text, pattern) {
      if (!text || typeof text !== 'string') {
        return text;
      }

      // สร้าง Regular Expression ใหม่เพื่อหลีกเลี่ยงปัญหา lastIndex
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

      // แทนที่จากด้านหลังไปด้านหน้าเพื่อหลีกเลี่ยงปัญหาดัชนี
      replacements.reverse().forEach(replacement => {
        result = result.substring(0, replacement.start) + result.substring(replacement.end);
      });

      return result;
    }

    /**
     * แสดงผลลัพธ์การดีบัก
     */
    debug() {
      // แก้ไข: แสดงผลเฉพาะในโหมดดีบักเท่านั้น
      if (window.DEBUG_FRIEND_RENDERER) {
        console.group('[Friend Renderer] ข้อมูลการดีบัก'); // Translated: 调试信息
        console.log('จำนวนเพื่อนที่ดึงมา:', this.extractedFriends.length); // Translated: 提取的好友数量
        console.log('รายการเพื่อน:', this.extractedFriends); // Translated: 好友列表
        console.log('บันทึกการแชทล่าสุด:', this.lastChatRecord); // Translated: 最后聊天记录
        console.log('Regular Expression:', this.friendPattern); // Translated: 正则表达式
        console.groupEnd();
      }
    }
  }

  // สร้างอินสแตนซ์ส่วนกลาง
  window.FriendRenderer = FriendRenderer;
  window.friendRenderer = new FriendRenderer();

  // อินเทอร์เฟซสำหรับ message-app
  window.renderFriendsFromContext = function () {
    return window.friendRenderer.renderFriendsHTML();
  };

  window.refreshFriendsList = function () {
    window.friendRenderer.refresh();
  };

  console.log('[Friend Renderer] โมดูลตัวแสดงผลรายชื่อเพื่อนโหลดเสร็จสมบูรณ์'); // Translated: 好友渲染器模块加载完成
} // 结束 if (typeof window.FriendRenderer === 'undefined') 检查
