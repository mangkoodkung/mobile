/**
 * Message Sender - ตัวจัดการส่งข้อความ
 * จัดการรูปแบบและ logic การส่งข้อความโดยเฉพาะ อ้างอิงฟังก์ชันส่งของ qq-app.js
 */

// ป้องกันการประกาศซ้ำ
if (typeof window.MessageSender === 'undefined') {
  class MessageSender {
    constructor() {
      this.currentFriendId = null;
      this.currentFriendName = null;
      this.isGroup = false;
      this.contextEditor = null;
      this.init();
    }

    init() {
      console.log('[Message Sender] เริ่มต้นตัวส่งข้อความเสร็จสมบูรณ์');
      this.loadContextEditor();
    }

    /**
     * ตรวจสอบว่าเปิดใช้งานการคลิกปุ่มส่งแบบหน่วงเวลาหรือไม่
     */
    isDelayClickEnabled() {
      try {
        const settings = localStorage.getItem('messageSenderSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          // หากตั้งค่า delayClickEnabled ไว้ชัดเจน ใช้ค่านั้น มิฉะนั้นค่าเริ่มต้นเป็น true
          return parsed.delayClickEnabled === undefined ? true : parsed.delayClickEnabled;
        }
        return true; // เปิดใช้งานเป็นค่าเริ่มต้น
      } catch (error) {
        console.warn('[Message Sender] ดึงการตั้งค่าคลิกแบบหน่วงเวลาล้มเหลว:', error);
        return true; // เปิดใช้งานเป็นค่าเริ่มต้น
      }
    }

    /**
     * ตั้งค่าว่าจะเปิดใช้งานการคลิกปุ่มส่งแบบหน่วงเวลาหรือไม่
     */
    setDelayClickEnabled(enabled) {
      try {
        let settings = {};
        const existing = localStorage.getItem('messageSenderSettings');
        if (existing) {
          settings = JSON.parse(existing);
        }
        settings.delayClickEnabled = enabled;
        localStorage.setItem('messageSenderSettings', JSON.stringify(settings));
        console.log('[Message Sender] บันทึกการตั้งค่าคลิกแบบหน่วงเวลาแล้ว:', enabled);
      } catch (error) {
        console.error('[Message Sender] บันทึกการตั้งค่าคลิกแบบหน่วงเวลาล้มเหลว:', error);
      }
    }

    /**
     * ตรวจสอบว่าเปิดใช้งานฟังก์ชันห้ามเนื้อหาหลักหรือไม่
     */
    isDisableBodyTextEnabled() {
      try {
        // ลองดึงจาก extension_settings ของ SillyTavern
        if (window.SillyTavern && window.SillyTavern.getContext) {
          const context = window.SillyTavern.getContext();
          if (context.extensionSettings && context.extensionSettings.mobile_context) {
            return context.extensionSettings.mobile_context.disableBodyText || false;
          }
        }

        // ย้อนกลับไปใช้ extension_settings ระดับ global
        if (window.extension_settings && window.extension_settings.mobile_context) {
          return window.extension_settings.mobile_context.disableBodyText || false;
        }

        return false; // ไม่เปิดใช้งานเป็นค่าเริ่มต้น
      } catch (error) {
        console.warn('[Message Sender] ดึงการตั้งค่าห้ามเนื้อหาหลักล้มเหลว:', error);
        return false; // ไม่เปิดใช้งานเป็นค่าเริ่มต้น
      }
    }

    /**
     * โหลดตัวแก้ไขบริบท
     */
    loadContextEditor() {
      // ตรวจสอบว่าตัวแก้ไขบริบท mobile พร้อมใช้งานหรือไม่
      if (window.mobileContextEditor) {
        this.contextEditor = window.mobileContextEditor;
        console.log('[Message Sender] เชื่อมต่อตัวแก้ไขบริบท Mobile แล้ว');
      } else {
        console.warn('[Message Sender] ไม่พบตัวแก้ไขบริบท Mobile ลองใหม่แบบหน่วงเวลา...');
        setTimeout(() => this.loadContextEditor(), 1000);
      }
    }

    /**
     * ตั้งค่าเป้าหมายแชทปัจจุบัน
     */
    setCurrentChat(friendId, friendName, isGroup = false) {
      this.currentFriendId = friendId;
      this.currentFriendName = friendName;
      this.isGroup = isGroup;

      console.log(`[Message Sender] ตั้งค่าเป้าหมายแชทปัจจุบัน:`, {
        friendId,
        friendName,
        isGroup,
      });
    }

    /**
     * ส่งข้อความไปยัง SillyTavern
     * อ้างอิงเมธอด sendToChat ของ qq-app.js
     */
    async sendToChat(message) {
      try {
        console.log('[Message Sender] กำลังส่งข้อความไปยัง SillyTavern:', message);

        // วิธีที่ 1: ใช้ DOM element โดยตรง
        const originalInput = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (!originalInput || !sendButton) {
          console.error('[Message Sender] ไม่พบ element ของกล่องอินพุตหรือปุ่มส่ง');
          return await this.sendToChatBackup(message);
        }

        // ตรวจสอบว่ากล่องอินพุตพร้อมใช้งานหรือไม่
        if (originalInput.disabled) {
          console.warn('[Message Sender] กล่องอินพุตถูกปิดใช้งาน');
          return false;
        }

        // ตรวจสอบว่าปุ่มส่งพร้อมใช้งานหรือไม่
        if (sendButton.classList.contains('disabled')) {
          console.warn('[Message Sender] ปุ่มส่งถูกปิดใช้งาน');
          return false;
        }

        // ต่อท้ายข้อความเข้ากับเนื้อหาที่มีอยู่
        const existingValue = originalInput.value;
        const newValue = existingValue ? existingValue + '\n' + message : message;
        originalInput.value = newValue;
        console.log('[Message Sender] ต่อท้ายข้อความเข้ากล่องอินพุตแล้ว:', {
          เนื้อหาเดิม: existingValue,
          เนื้อหาที่เพิ่ม: message,
          เนื้อหาสุดท้าย: newValue,
        });

        // กระตุ้นเหตุการณ์อินพุต
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));

        // ตัดสินใจตามการตั้งค่าว่าจะคลิกปุ่มส่งแบบหน่วงเวลาหรือไม่
        if (this.isDelayClickEnabled()) {
          // คลิกปุ่มส่งแบบหน่วงเวลา
          await new Promise(resolve => setTimeout(resolve, 300));
          sendButton.click();
          console.log('[Message Sender] คลิกปุ่มส่งแบบหน่วงเวลาแล้ว');
        } else {
        }

        return true;
      } catch (error) {
        console.error('[Message Sender] เกิดข้อผิดพลาดขณะส่งข้อความ:', error);
        return await this.sendToChatBackup(message);
      }
    }

    /**
     * วิธีส่งสำรอง
     */
    async sendToChatBackup(message) {
      try {
        console.log('[Message Sender] กำลังลองวิธีส่งสำรอง:', message);

        // ลองค้นหากล่องอินพุตอื่นที่เป็นไปได้
        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"]');

        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          // จำลองเหตุการณ์คีย์บอร์ด
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Message Sender] วิธีส่งสำรองล้มเหลว:', error);
        return false;
      }
    }

    /**
     * สร้างรูปแบบข้อความและส่ง
     * อ้างอิงเมธอด buildAndSendQQMessage ของ qq-app.js
     */
    async buildAndSendMessage(message) {
      if (!this.currentFriendId || !this.currentFriendName) {
        throw new Error('ยังไม่ได้ตั้งค่าเป้าหมายแชทปัจจุบัน');
      }

      // แยกข้อความตามบรรทัด กรองบรรทัดว่างออก
      const messageLines = message.split('\n').filter(line => line.trim());

      if (messageLines.length === 0) {
        throw new Error('เนื้อหาข้อความต้องไม่ว่างเปล่า');
      }

      console.log(`[Message Sender] กำลังประมวลผล ${messageLines.length} ข้อความ:`, messageLines);

      // 🌟 เพิ่มใหม่: ตรวจสอบว่าเป็นข้อความพิเศษที่จัดรูปแบบแล้วหรือไม่ (เสียง, ซองแดง, สติกเกอร์)
      const voiceMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/;
      const redpackMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/;
      const stickerMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/;
      const hasSpecialMessages = messageLines.some(line => {
        const trimmed = line.trim();
        return (
          voiceMessageRegex.test(trimmed) || redpackMessageRegex.test(trimmed) || stickerMessageRegex.test(trimmed)
        );
      });

      if (hasSpecialMessages) {
        // หากมีข้อความเสียงที่จัดรูปแบบแล้ว ต้องประมวลผลข้อความผสมแยกกัน
        const processedMessages = [];

        messageLines.forEach((line, index) => {
          const trimmedLine = line.trim();

          if (voiceMessageRegex.test(trimmedLine)) {
            // คงรูปแบบข้อความเสียงไว้โดยตรง
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] รายการที่ ${index + 1}: คงรูปแบบข้อความเสียง:`, trimmedLine);
          } else if (redpackMessageRegex.test(trimmedLine)) {
            // คงรูปแบบข้อความซองแดงไว้โดยตรง
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] รายการที่ ${index + 1}: คงรูปแบบข้อความซองแดง:`, trimmedLine);
          } else if (stickerMessageRegex.test(trimmedLine)) {
            // 🌟 เพิ่มใหม่: คงรูปแบบข้อความสติกเกอร์ไว้โดยตรง
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] รายการที่ ${index + 1}: คงรูปแบบข้อความสติกเกอร์:`, trimmedLine);
          } else if (trimmedLine) {
            // ข้อความตัวอักษรปกติต้องจัดให้อยู่ในรูปแบบที่ถูกต้อง
            const formattedMessage = this.isGroup
              ? `[我方消息|我|${this.currentFriendId}|文字|${trimmedLine}]`
              : `[我方消息|我|${this.currentFriendId}|文字|${trimmedLine}]`;

            processedMessages.push(formattedMessage);
            console.log(`[Message Sender] รายการที่ ${index + 1}: จัดรูปแบบข้อความตัวอักษร:`, formattedMessage);
          }
        });

        const targetPrefix = this.isGroup
          ? `ส่งแชทกลุ่มถึง ${this.currentFriendName} (${this.currentFriendId})`
          : `ส่งข้อความถึง ${this.currentFriendName} (${this.currentFriendId})`;

        // ตรวจสอบว่าเปิดใช้งานฟังก์ชันห้ามเนื้อหาหลักหรือไม่
        let finalMessage;
        if (this.isDisableBodyTextEnabled()) {
          finalMessage = `<Request:เน้นย้ำ! เมื่อผู้ใช้ส่งเฉพาะข้อความออนไลน์ ให้ตอบกลับเฉพาะข้อความออนไลน์เท่านั้น ห้ามตอบกลับเนื้อหาหลัก>\nกรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${processedMessages.join('\n')}`;
          console.log('[Message Sender] เปิดใช้งานโหมดห้ามเนื้อหาหลักแล้ว เพิ่มคำนำหน้าพิเศษ');
        } else {
          finalMessage = `กรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${processedMessages.join('\n')}`;
        }

        console.log('[Message Sender] ส่งข้อความผสม (รวมรูปแบบพิเศษ):', finalMessage);

        const success = await this.sendToChat(finalMessage);

        if (success) {
          const voiceCount = processedMessages.filter(msg => voiceMessageRegex.test(msg)).length;
          const redpackCount = processedMessages.filter(msg => redpackMessageRegex.test(msg)).length;
          const stickerCount = processedMessages.filter(msg => stickerMessageRegex.test(msg)).length;
          const textCount = processedMessages.length - voiceCount - redpackCount - stickerCount;

          let summaryMessage = '';
          const parts = [];

          if (textCount > 0) parts.push(`${textCount} ข้อความตัวอักษร`);
          if (voiceCount > 0) parts.push(`${voiceCount} ข้อความเสียง`);
          if (redpackCount > 0) parts.push(`${redpackCount} ซองแดง`);
          if (stickerCount > 0) parts.push(`${stickerCount} สติกเกอร์`);

          if (parts.length > 1) {
            summaryMessage = parts.join(' + ');
          } else if (parts.length === 1) {
            summaryMessage = parts[0];
          } else {
            summaryMessage = `${processedMessages.length} ข้อความ`;
          }

          this.showSendSuccessToast(summaryMessage);
        }

        return success;
      }

      // ตรวจสอบว่าเป็นข้อความสติกเกอร์ทั้งหมดหรือไม่
      const stickerRegex = /^\[表情包\|([^\|]+)\|([^\]]+)\]$/;
      const allStickers = messageLines.every(line => stickerRegex.test(line.trim()));

      if (allStickers && messageLines.length > 0) {
        return await this.sendStickerMessages(messageLines);
      }

      // ประมวลผลข้อความปกติ
      return await this.sendNormalMessages(messageLines);
    }

    /**
     * ส่งข้อความสติกเกอร์
     */
    async sendStickerMessages(messageLines) {
      const targetPrefix = this.isGroup
        ? `ส่งแชทกลุ่มถึง ${this.currentFriendName} (${this.currentFriendId})`
        : `ส่งข้อความถึง ${this.currentFriendName} (${this.currentFriendId})`;

      // ตรวจสอบว่าเปิดใช้งานฟังก์ชันห้ามเนื้อหาหลักหรือไม่
      let finalMessage;
      if (this.isDisableBodyTextEnabled()) {
        finalMessage = `<Request:เน้นย้ำ! เมื่อผู้ใช้ส่งเฉพาะข้อความออนไลน์ ให้ตอบกลับเฉพาะข้อความออนไลน์เท่านั้น ห้ามตอบกลับเนื้อหาหลัก>\nกรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${messageLines.join('\n')}`;
        console.log('[Message Sender] เปิดใช้งานโหมดห้ามเนื้อหาหลักแล้ว เพิ่มคำนำหน้าพิเศษ');
      } else {
        finalMessage = `กรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${messageLines.join('\n')}`;
      }

      console.log('[Message Sender] ส่งข้อความสติกเกอร์ล้วน:', finalMessage);

      const success = await this.sendToChat(finalMessage);

      if (success) {
        const summaryMessage = messageLines.length > 1 ? `${messageLines.length} สติกเกอร์` : '1 สติกเกอร์';

        this.showSendSuccessToast(summaryMessage);
      }

      return success;
    }

    /**
     * ส่งข้อความปกติ
     */
    async sendNormalMessages(messageLines) {
      const formattedMessages = [];

      messageLines.forEach((line, index) => {
        // สร้าง timestamp อิสระสำหรับแต่ละข้อความ (ห่างกัน 1 วินาที)
        const messageTime = new Date(Date.now() + index * 1000);
        const currentTime = messageTime.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        let messageContent = line.trim();
        let singleMessage;

        // ตรวจสอบว่ามีรูปแบบพิเศษหรือไม่
        if (this.isSpecialFormat(messageContent)) {
          // ประมวลผลข้อความรูปแบบพิเศษ
          singleMessage = this.formatSpecialMessage(messageContent, currentTime);
        } else {
          // ประมวลผลข้อความตัวอักษรปกติ
          singleMessage = this.formatNormalMessage(messageContent, currentTime);
        }

        formattedMessages.push(singleMessage);
        console.log(`[Message Sender] รูปแบบข้อความที่ ${index + 1}:`, singleMessage);
      });

      // ตรวจสอบความถูกต้องของรูปแบบข้อความ
      const validatedMessages = this.validateMessages(formattedMessages);

      // สร้างข้อความสุดท้าย
      let targetPrefix;
      if (this.isGroup) {
        // ดึงรายชื่อสมาชิกของแชทกลุ่ม
        const groupMembers = this.getCurrentGroupMembers();
        const membersText = groupMembers.length > 0 ? ` สมาชิกในกลุ่มมี ${groupMembers.join('、')}` : '';

        targetPrefix = `ส่งแชทกลุ่มถึง ${this.currentFriendName} (${this.currentFriendId})${membersText} กรุณาสร้างการตอบกลับของตัวละครในกลุ่มตามข้อกำหนดและรูปแบบในข้อความแชทกลุ่มออนไลน์ การตอบกลับต้องสอดคล้องกับการตั้งค่าตัวละครทั้งหมดและเนื้อเรื่องปัจจุบัน`;
      } else {
        targetPrefix = `ส่งข้อความถึง ${this.currentFriendName} (${this.currentFriendId}) กรุณาสร้างการตอบกลับของตัวละครตามข้อกำหนดและรูปแบบในข้อความแชทส่วนตัวออนไลน์ การตอบกลับต้องสอดคล้องกับการตั้งค่าตัวละครและเนื้อเรื่องปัจจุบัน`;
      }

      // ตรวจสอบว่าเปิดใช้งานฟังก์ชันห้ามเนื้อหาหลักหรือไม่
      let finalMessage;
      if (this.isDisableBodyTextEnabled()) {
        finalMessage = `<Request:เน้นย้ำ! เมื่อผู้ใช้ส่งเฉพาะข้อความออนไลน์ ให้ตอบกลับเฉพาะข้อความออนไลน์เท่านั้น ห้ามตอบกลับเนื้อหาหลัก>\nกรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${validatedMessages.join('\n')}`;
        console.log('[Message Sender] เปิดใช้งานโหมดห้ามเนื้อหาหลักแล้ว เพิ่มคำนำหน้าพิเศษ');
      } else {
        finalMessage = `กรุณาใช้รูปแบบที่กำหนด ${targetPrefix}\n${validatedMessages.join('\n')}`;
      }

      console.log('[Message Sender] ข้อความสุดท้าย:', finalMessage);

      const success = await this.sendToChat(finalMessage);

      if (success) {
        const summaryMessage =
          messageLines.length > 1
            ? `${messageLines.length} ข้อความ: ${messageLines[0].substring(0, 10)}...`
            : messageLines[0];

        this.showSendSuccessToast(summaryMessage);
      }

      return success;
    }

    /**
     * ตรวจสอบว่าเป็นรูปแบบพิเศษหรือไม่ (สติกเกอร์, เสียง, ซองแดง ฯลฯ)
     */
    isSpecialFormat(content) {
      const specialFormats = [
        /^\[表情包\|([^\|]+)\|([^\]]+)\]$/, // รูปแบบสติกเกอร์เก่า
        /^\[语音\|([^\|]+)\|([^\]]+)\]$/, // รูปแบบเสียงเก่า
        /^\[红包\|([^\|]+)\|([^\]]+)\]$/, // รูปแบบซองแดงเก่า
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/, // รูปแบบข้อความเสียงใหม่
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/, // รูปแบบข้อความซองแดงใหม่
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/, // รูปแบบข้อความสติกเกอร์ใหม่
        /^语音：/, // คำนำหน้าเสียง
        /^红包：/, // คำนำหน้าซองแดง
      ];

      return specialFormats.some(regex => regex.test(content));
    }

    /**
     * จัดรูปแบบข้อความพิเศษ
     */
    formatSpecialMessage(content, currentTime) {
      // 🌟 ตรวจสอบว่าเป็นข้อความเสียงที่จัดรูปแบบแล้วหรือไม่ ถ้าใช่ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      const voiceMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/;
      if (voiceMessageRegex.test(content)) {
        console.log(`[Message Sender] ตรวจพบข้อความเสียงที่จัดรูปแบบแล้ว ส่งคืนโดยตรง:`, content);
        return content; // ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      }

      // 🌟 ตรวจสอบว่าเป็นข้อความซองแดงที่จัดรูปแบบแล้วหรือไม่ ถ้าใช่ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      const redpackMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/;
      if (redpackMessageRegex.test(content)) {
        console.log(`[Message Sender] ตรวจพบข้อความซองแดงที่จัดรูปแบบแล้ว ส่งคืนโดยตรง:`, content);
        return content; // ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      }

      // 🌟 ตรวจสอบว่าเป็นข้อความสติกเกอร์ที่จัดรูปแบบแล้วหรือไม่ ถ้าใช่ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      const stickerMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/;
      if (stickerMessageRegex.test(content)) {
        console.log(`[Message Sender] ตรวจพบข้อความสติกเกอร์ที่จัดรูปแบบแล้ว ส่งคืนโดยตรง:`, content);
        return content; // ส่งคืนโดยตรง ไม่ต้องห่อหุ้มอีก
      }

      // หากเป็นรูปแบบพิเศษที่สมบูรณ์แล้ว ห่อหุ้มโดยตรง
      if (content.startsWith('[') && content.endsWith(']')) {
        return this.isGroup
          ? `[我方消息|${this.currentFriendName}|${this.currentFriendId}|我|${content}|${currentTime}]`
          : `[我方消息|${this.currentFriendName}|${this.currentFriendId}|${content}|${currentTime}]`;
      }

      // ประมวลผลรูปแบบคำนำหน้าอย่างง่าย
      if (content.startsWith('语音：')) {
        content = `语音：${content.substring(3)}`;
      } else if (content.startsWith('红包：')) {
        content = `红包：${content.substring(3)}`;
      }

      return this.isGroup
        ? `[我方消息|${this.currentFriendName}|${this.currentFriendId}|我|${content}|${currentTime}]`
        : `[我方消息|${this.currentFriendName}|${this.currentFriendId}|${content}|${currentTime}]`;
    }

    /**
     * จัดรูปแบบข้อความปกติ
     */
    formatNormalMessage(content, currentTime) {
      return this.isGroup
        ? `[我方消息|我|${this.currentFriendId}|文字|${content}]`
        : `[我方消息|我|${this.currentFriendId}|文字|${content}]`;
    }

    /**
     * ตรวจสอบความถูกต้องของรูปแบบข้อความ
     */
    validateMessages(messages) {
      return messages.map((msg, index) => {
        if (!msg.trim().endsWith(']')) {
          console.warn(`[Message Sender] รูปแบบข้อความที่ ${index + 1} ไม่สมบูรณ์:`, msg);
          return msg.trim() + ']';
        }
        return msg.trim();
      });
    }

    /**
     * แสดง toast แจ้งเตือนเมื่อส่งสำเร็จ
     */
    showSendSuccessToast(message) {
      const toast = document.createElement('div');
      toast.className = 'send-status-toast success';
      toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">✅ ส่งข้อความแล้ว</div>
            <div style="font-size: 12px; opacity: 0.9;">
                ส่งถึง: ${this.currentFriendName}<br>
                เนื้อหา: ${message.length > 20 ? message.substring(0, 20) + '...' : message}
            </div>
        `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 2000);
    }

    /**
     * แสดง toast แจ้งเตือนเมื่อส่งล้มเหลว
     */
    showSendErrorToast(error) {
      const toast = document.createElement('div');
      toast.className = 'send-status-toast error';
      toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">❌ ส่งล้มเหลว</div>
            <div style="font-size: 12px; opacity: 0.9;">
                ข้อผิดพลาด: ${error}
            </div>
        `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    /**
     * จัดการการกด Enter เพื่อส่ง
     */
    handleEnterSend(event, textareaElement) {
      if (event.key === 'Enter' && !event.shiftKey) {
        // ไม่บล็อก default behavior แล้ว ให้ปุ่ม Enter ขึ้นบรรทัดใหม่ตามปกติ
        // event.preventDefault();

        // ปรับความสูง textarea ใหม่หลังขึ้นบรรทัด
        setTimeout(() => {
          this.adjustTextareaHeight(textareaElement);
        }, 0);
      }
    }

    /**
     * เมธอดหลักสำหรับส่งข้อความ
     */
    async sendMessage(message) {
      if (!message.trim()) {
        this.showSendErrorToast('เนื้อหาข้อความต้องไม่ว่างเปล่า');
        return false;
      }

      if (!this.currentFriendId) {
        this.showSendErrorToast('กรุณาเลือกเป้าหมายแชท');
        return false;
      }

      try {
        // แสดงสถานะกำลังส่ง
        this.setSendingState(true);

        const success = await this.buildAndSendMessage(message);

        if (!success) {
          this.showSendErrorToast('ส่งล้มเหลว กรุณาลองใหม่');
        }

        return success;
      } catch (error) {
        console.error('[Message Sender] ส่งข้อความล้มเหลว:', error);
        this.showSendErrorToast(error.message || 'ส่งล้มเหลว');
        return false;
      } finally {
        this.setSendingState(false);
      }
    }

    /**
     * ตั้งค่าสถานะกำลังส่ง
     */
    setSendingState(isSending) {
      const sendButton = document.getElementById('send-message-btn');
      const textareaElement = document.getElementById('message-send-input');

      if (sendButton) {
        if (isSending) {
          sendButton.classList.add('sending');
          sendButton.disabled = true;
          sendButton.textContent = 'กำลังส่ง...';
        } else {
          sendButton.classList.remove('sending');
          sendButton.disabled = false;
          sendButton.textContent = 'ส่ง';
        }
      }

      if (textareaElement) {
        textareaElement.disabled = isSending;
      }
    }

    /**
     * ปรับความสูง textarea อัตโนมัติ
     */
    adjustTextareaHeight(textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = Math.min(textareaElement.scrollHeight, 100) + 'px';
    }

    /**
     * แทรกรูปแบบพิเศษเข้ากล่องอินพุต
     */
    insertSpecialFormat(format, params) {
      const textareaElement = document.getElementById('message-send-input');
      if (!textareaElement) return;

      let specialText = '';

      switch (format) {
        case 'sticker':
          specialText = `[表情包|${params.filename}|${params.filepath}]`;
          break;
        case 'voice':
          specialText = `[语音|${params.duration}|${params.content}]`;
          break;
        case 'redpack':
          specialText = `[红包|${params.amount}|${params.message}]`;
          break;
        case 'emoji':
          specialText = params.emoji;
          break;
        default:
          return;
      }

      // ดึงค่าปัจจุบันของกล่องอินพุตและตำแหน่งเคอร์เซอร์
      const currentValue = textareaElement.value;
      const cursorPosition = textareaElement.selectionStart;

      // หากกล่องอินพุตไม่ว่างและตัวอักษรก่อนเคอร์เซอร์ไม่ใช่ขึ้นบรรทัดใหม่ ให้เพิ่มขึ้นบรรทัดใหม่
      let newValue;
      if (currentValue && cursorPosition > 0 && currentValue[cursorPosition - 1] !== '\n') {
        newValue = currentValue.slice(0, cursorPosition) + '\n' + specialText + currentValue.slice(cursorPosition);
      } else {
        newValue = currentValue.slice(0, cursorPosition) + specialText + currentValue.slice(cursorPosition);
      }

      // ตั้งค่าใหม่
      textareaElement.value = newValue;

      // ปรับความสูง
      this.adjustTextareaHeight(textareaElement);

      // ตั้งตำแหน่งเคอร์เซอร์
      const newCursorPosition = cursorPosition + specialText.length + (newValue !== currentValue + specialText ? 1 : 0);
      textareaElement.setSelectionRange(newCursorPosition, newCursorPosition);
      textareaElement.focus();
    }

    /**
     * ดึงข้อมูลเป้าหมายแชทปัจจุบัน
     */
    getCurrentChatInfo() {
      return {
        friendId: this.currentFriendId,
        friendName: this.currentFriendName,
        isGroup: this.isGroup,
      };
    }

    /**
     * ล้างเป้าหมายแชทปัจจุบัน
     */
    clearCurrentChat() {
      this.currentFriendId = null;
      this.currentFriendName = null;
      this.isGroup = false;
    }

    /**
     * ดึงรายชื่อสมาชิกของแชทกลุ่มปัจจุบัน
     */
    getCurrentGroupMembers() {
      if (!this.isGroup || !this.currentFriendId) {
        return [];
      }

      try {
        // วิธีที่ 1: ค้นหาข้อมูลแชทกลุ่มล่าสุดจากประวัติแชท
        const messageElements = document.querySelectorAll('.mes_text, .mes_block');
        let latestGroupInfo = null;

        // สร้าง regex เพื่อจับคู่ข้อมูลกลุ่มนี้: [群聊|ชื่อกลุ่ม|รหัสกลุ่ม|รายชื่อสมาชิก] หรือ [创建群聊|รหัสกลุ่ม|ชื่อกลุ่ม|รายชื่อสมาชิก]
        const groupRegex1 = new RegExp(`\\[群聊\\|([^\\|]+)\\|${this.currentFriendId}\\|([^\\]]+)\\]`, 'g');
        const groupRegex2 = new RegExp(`\\[创建群聊\\|${this.currentFriendId}\\|([^\\|]+)\\|([^\\]]+)\\]`, 'g');

        // ค้นหาจากข้อความล่าสุด
        for (let i = messageElements.length - 1; i >= 0; i--) {
          const messageText = messageElements[i].textContent || '';

          // รีเซ็ต index ของ regex
          groupRegex1.lastIndex = 0;
          groupRegex2.lastIndex = 0;

          // ลองจับคู่รูปแบบที่ 1: [群聊|ชื่อกลุ่ม|รหัสกลุ่ม|รายชื่อสมาชิก]
          let match = groupRegex1.exec(messageText);
          if (match) {
            latestGroupInfo = {
              groupName: match[1],
              members: match[2],
            };
            console.log('[Message Sender] พบข้อมูลแชทกลุ่ม (รูปแบบ 1):', latestGroupInfo);
            break;
          }

          // ลองจับคู่รูปแบบที่ 2: [创建群聊|รหัสกลุ่ม|ชื่อกลุ่ม|รายชื่อสมาชิก]
          match = groupRegex2.exec(messageText);
          if (match) {
            latestGroupInfo = {
              groupName: match[1],
              members: match[2],
            };
            console.log('[Message Sender] พบข้อมูลแชทกลุ่ม (รูปแบบ 2):', latestGroupInfo);
            break;
          }
        }

        if (latestGroupInfo) {
          // แยกรายชื่อสมาชิก
          const members = latestGroupInfo.members
            .split(/[、,，]/)
            .map(name => name.trim())
            .filter(name => name);

          console.log('[Message Sender] แยกสมาชิกแชทกลุ่มได้:', members);
          return members;
        } else {
          console.log('[Message Sender] ไม่พบข้อมูลสมาชิกแชทกลุ่ม ส่งคืน array ว่าง');
          return [];
        }
      } catch (error) {
        console.error('[Message Sender] ดึงสมาชิกแชทกลุ่มล้มเหลว:', error);
        return [];
      }
    }

    /**
     * เมธอดดีบัก
     */
    debug() {
      console.log('[Message Sender] ข้อมูลดีบัก:', {
        currentFriendId: this.currentFriendId,
        currentFriendName: this.currentFriendName,
        isGroup: this.isGroup,
        contextEditor: !!this.contextEditor,
      });
    }
  }

  // สร้าง instance ระดับ global
  window.MessageSender = MessageSender;

  // หากเพจโหลดแล้ว สร้าง instance ทันที
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.messageSender = new MessageSender();
      console.log('[Message Sender] สร้าง instance ระดับ global แล้ว');
    });
  } else {
    window.messageSender = new MessageSender();
    console.log('[Message Sender] สร้าง instance ระดับ global แล้ว');
  }
} // สิ้นสุดการตรวจสอบ if (typeof window.MessageSender === 'undefined')
