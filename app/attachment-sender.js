/**
 * ตัวส่งไฟล์แนบ - จัดการฟังก์ชันอัปโหลดและส่งไฟล์
 * รองรับการอัปโหลดและส่งไฟล์หลายประเภท เช่น รูปภาพ เอกสาร ฯลฯ
 */

// @ts-check
// การประกาศประเภท TypeScript
/**
 * @typedef {Object} UploadResult
 * @property {boolean} success
 * @property {string} fileUrl
 * @property {string} fileName
 * @property {number} fileSize
 * @property {string} fileType
 * @property {string} uploadMethod
 */

/**
 * @typedef {Object} AttachmentSenderGlobal
 * @property {Object} attachmentSender
 * @property {Function} testAttachmentSender
 * @property {Function} checkAttachmentEnvironment
 * @property {Function} testSillyTavernUpload
 * @property {Function} testImageMessageFlow
 * @property {Function} testImageMessageParsing
 * @property {Function} testMultipleImageFormats
 * @property {Function} checkSillyTavernMessages
 */

// ขยาย Window interface
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.AttachmentSender = window.AttachmentSender || undefined;
  // @ts-ignore
  window.attachmentSender = window.attachmentSender || undefined;
}

(function (window) {
  'use strict';

  class AttachmentSender {
    constructor() {
      this.currentChatTarget = null;
      this.currentChatName = null;
      this.isCurrentChatGroup = false;

      // ประเภทไฟล์ที่รองรับ
      this.supportedTypes = {
        images: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/tiff',
          'image/svg+xml',
        ],
        documents: [
          'application/pdf',
          'text/plain',
          'text/csv',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
        video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      };

      // จำกัดขนาดไฟล์ (10MB)
      this.maxFileSize = 10 * 1024 * 1024;

      console.log('[AttachmentSender] เริ่มต้นตัวส่งไฟล์แนบเสร็จสมบูรณ์');
    }

    // ตั้งค่าเป้าหมายแชทปัจจุบัน
    setCurrentChat(targetId, targetName, isGroup = false) {
      console.log(`[AttachmentSender] 🔍 ตั้งค่าเป้าหมายแชท: ${targetName} (${targetId}), แชทกลุ่ม: ${isGroup}`);
      this.currentChatTarget = targetId;
      this.currentChatName = targetName;
      this.isCurrentChatGroup = isGroup;

      console.log(`[AttachmentSender] ✅ ตั้งค่าเป้าหมายแชทเสร็จสมบูรณ์:`, {
        target: this.currentChatTarget,
        name: this.currentChatName,
        isGroup: this.isCurrentChatGroup,
      });
    }

    // ตรวจสอบว่าประเภทไฟล์รองรับหรือไม่
    isFileTypeSupported(file) {
      const allSupportedTypes = [
        ...this.supportedTypes.images,
        ...this.supportedTypes.documents,
        ...this.supportedTypes.archives,
        ...this.supportedTypes.audio,
        ...this.supportedTypes.video,
      ];

      return allSupportedTypes.includes(file.type);
    }

    // รับการจำแนกประเภทไฟล์
    getFileCategory(file) {
      if (this.supportedTypes.images.includes(file.type)) return 'image';
      if (this.supportedTypes.documents.includes(file.type)) return 'document';
      if (this.supportedTypes.archives.includes(file.type)) return 'archive';
      if (this.supportedTypes.audio.includes(file.type)) return 'audio';
      if (this.supportedTypes.video.includes(file.type)) return 'video';
      return 'unknown';
    }

    // จัดรูปแบบขนาดไฟล์
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ตรวจสอบไฟล์
    validateFile(file) {
      const errors = [];

      // ตรวจสอบขนาดไฟล์
      if (file.size > this.maxFileSize) {
        errors.push(`ขนาดไฟล์เกินขีดจำกัด (สูงสุด ${this.formatFileSize(this.maxFileSize)})`);
      }

      // ตรวจสอบประเภทไฟล์
      if (!this.isFileTypeSupported(file)) {
        errors.push('ประเภทไฟล์ไม่รองรับ');
      }

      // ตรวจสอบชื่อไฟล์
      if (!file.name || file.name.trim() === '') {
        errors.push('ชื่อไฟล์ไม่ถูกต้อง');
      }

      return {
        isValid: errors.length === 0,
        errors: errors,
      };
    }

    // สร้างตัวอย่างไฟล์
    createFilePreview(file) {
      const category = this.getFileCategory(file);
      const fileSize = this.formatFileSize(file.size);

      let previewContent = '';
      let icon = '📄';

      switch (category) {
        case 'image':
          icon = '🖼️';
          // สำหรับรูปภาพ สร้างตัวอย่างภาพขนาดย่อ
          const imageUrl = URL.createObjectURL(file);
          previewContent = `
                        <div class="file-preview-image">
                            <img src="${imageUrl}" alt="${file.name}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">
                        </div>
                    `;
          break;
        case 'document':
          icon = '📄';
          break;
        case 'archive':
          icon = '📦';
          break;
        case 'audio':
          icon = '🎵';
          break;
        case 'video':
          icon = '🎬';
          break;
        default:
          icon = '📎';
      }

      return {
        icon,
        category,
        previewContent,
        fileName: file.name,
        fileSize,
        file,
      };
    }

    // อัปโหลดไฟล์ไปยัง SillyTavern
    async uploadFileToSillyTavern(file) {
      try {
        console.log(`[AttachmentSender] 🔍 เริ่มอัปโหลดไฟล์ไปยัง SillyTavern: ${file.name}`);
        console.log(`[AttachmentSender] 🔍 ข้อมูลไฟล์:`, {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        // วิธีที่ 1: ใช้ฟังก์ชัน uploadFileAttachmentToServer ของ SillyTavern
        if (window.uploadFileAttachmentToServer) {
          console.log(`[AttachmentSender] 🔍 ใช้ uploadFileAttachmentToServer อัปโหลด`);

          try {
            const uploadedUrl = await window.uploadFileAttachmentToServer(file, 'chat');
            console.log(`[AttachmentSender] ✅ uploadFileAttachmentToServer อัปโหลดสำเร็จ:`, uploadedUrl);

            return {
              success: true,
              fileUrl: uploadedUrl,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadMethod: 'uploadFileAttachmentToServer',
            };
          } catch (error) {
            console.warn(`[AttachmentSender] ⚠️ uploadFileAttachmentToServer ล้มเหลว:`, error);
          }
        }

        // วิธีที่ 2: ใช้ API อัปโหลดไฟล์ของ SillyTavern
        console.log(`[AttachmentSender] 🔍 ลองใช้ /api/files/upload API`);

        try {
          // แปลงไฟล์เป็น base64
          const base64Data = await this.fileToBase64(file);

          // สร้างชื่อไฟล์ที่ไม่ซ้ำ
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const fileExtension = file.name.split('.').pop() || 'txt';
          const uniqueFileName = `mobile_attachment_${timestamp}_${randomId}.${fileExtension}`;

          console.log(`[AttachmentSender] 🔍 สร้างชื่อไฟล์ที่ไม่ซ้ำ:`, uniqueFileName);

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: uniqueFileName,
              data: base64Data,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`[AttachmentSender] ✅ API อัปโหลดสำเร็จ:`, result);

            return {
              success: true,
              fileUrl: result.path || result.url || uniqueFileName,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadMethod: 'api',
              uploadResult: result,
            };
          } else {
            console.warn(`[AttachmentSender] ⚠️ API อัปโหลดล้มเหลว:`, response.status, response.statusText);
          }
        } catch (error) {
          console.warn(`[AttachmentSender] ⚠️ API อัปโหลดผิดพลาด:`, error);
        }

        // วิธีที่ 3: จำลองการอัปโหลดผ่าน file input ของ SillyTavern
        console.log(`[AttachmentSender] 🔍 ลองจำลองการอัปโหลดผ่าน file input`);

        try {
          const result = await this.simulateFileInputUpload(file);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn(`[AttachmentSender] ⚠️ การจำลองอัปโหลดล้มเหลว:`, error);
        }

        // แผนสำรอง: สร้าง URL ในเครื่อง (แต่จะไม่อัปโหลดไปยัง SillyTavern จริงๆ)
        console.log(`[AttachmentSender] ⚠️ วิธีอัปโหลดทั้งหมดล้มเหลว ใช้แผนสำรอง URL ในเครื่อง`);
        const fileUrl = URL.createObjectURL(file);

        return {
          success: true,
          fileUrl: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isLocalFile: true,
          uploadMethod: 'local',
        };
      } catch (error) {
        console.error(`[AttachmentSender] ❌ อัปโหลดไฟล์ล้มเหลว:`, error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    // แปลงไฟล์เป็น base64
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // ลบ prefix data: เก็บเฉพาะข้อมูล base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // จำลองการอัปโหลดผ่าน file input ของ SillyTavern
    async simulateFileInputUpload(file) {
      try {
        console.log(`[AttachmentSender] 🔍 เริ่มจำลองการอัปโหลดผ่าน file input`);

        // ค้นหา element file input ของ SillyTavern
        const fileInput = document.getElementById('file_form_input');
        if (!fileInput) {
          throw new Error('ไม่พบ element file input ของ SillyTavern');
        }

        console.log(`[AttachmentSender] 🔍 พบ element file input เตรียมตั้งค่าไฟล์`);

        // สร้าง DataTransfer object เพื่อจำลองการเลือกไฟล์
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        // ตั้งค่าไฟล์ไปยัง element input
        fileInput.files = dataTransfer.files;

        // ทริกเกอร์ event change
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        console.log(`[AttachmentSender] 🔍 ทริกเกอร์ event change ของ file input แล้ว`);

        // รอสักครู่ให้ SillyTavern ประมวลผลไฟล์
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ตรวจสอบว่ามีไฟล์ถูกแนบหรือไม่
        const fileAttached = document.querySelector('.file_attached');
        if (fileAttached) {
          console.log(`[AttachmentSender] ✅ ไฟล์ถูก SillyTavern ประมวลผลแล้ว`);

          return {
            success: true,
            fileUrl: 'attached_to_sillytavern',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadMethod: 'simulate',
          };
        } else {
          throw new Error('ไฟล์ไม่ได้ถูก SillyTavern ประมวลผลอย่างถูกต้อง');
        }
      } catch (error) {
        console.error(`[AttachmentSender] ❌ การจำลองอัปโหลดล้มเหลว:`, error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    // ส่งข้อความไฟล์แนบไปยังแชท SillyTavern
    async sendAttachmentMessage(uploadResult, additionalMessages = '') {
      console.log('[AttachmentSender] 🔍 เริ่มส่งข้อความไฟล์แนบ');
      console.log('[AttachmentSender] 🔍 เป้าหมายแชทปัจจุบัน:', {
        target: this.currentChatTarget,
        name: this.currentChatName,
        isGroup: this.isCurrentChatGroup,
      });

      try {
        if (!this.currentChatTarget || !this.currentChatName) {
          throw new Error('ยังไม่ได้ตั้งค่าเป้าหมายแชท');
        }

        const category = this.getFileCategory({ type: uploadResult.fileType });
        const fileSize = this.formatFileSize(uploadResult.fileSize);

        console.log('[AttachmentSender] 🔍 ข้อมูลไฟล์:', {
          category,
          fileSize,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
        });

        // สร้างเนื้อหาข้อความ - ใช้รูปแบบที่ message-app สามารถรู้จักได้
        let messageContent = '';

        if (this.isCurrentChatGroup) {
          // รูปแบบแชทกลุ่ม
          messageContent = `向${this.currentChatName}（${this.currentChatTarget}）发送群聊消息\n\n`;
          messageContent += `请按照线上聊天群聊消息中的要求和格式生成角色回复，回复需要符合角色人设和当前剧情\n\n`;
        } else {
          // รูปแบบแชทส่วนตัว
          messageContent = `向${this.currentChatName}（${this.currentChatTarget}）发送消息\n\n`;
          messageContent += `请按照线上聊天私聊消息中的要求和格式生成角色回复，回复需要符合角色人设和当前剧情\n\n`;
        }

        // ประมวลผลข้อความเพิ่มเติมที่ผู้ใช้ป้อน
        if (additionalMessages && additionalMessages.trim()) {
          console.log('[AttachmentSender] 🔍 ประมวลผลข้อความเพิ่มเติม:', additionalMessages);
          const messageLines = additionalMessages.split('\n').filter(line => line.trim());

          for (const line of messageLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              messageContent += `[我方消息|${this.currentChatName}|${this.currentChatTarget}|文字|${trimmedLine}]\n`;
            }
          }
          messageContent += '\n';
        }

        // เพิ่มรูปแบบข้อความที่แตกต่างตามประเภทไฟล์ - ใช้รูปแบบที่ message-app สามารถแยกวิเคราะห์ได้
        if (category === 'image') {
          messageContent += `[我方消息|${this.currentChatName}|${this.currentChatTarget}|附件|图片: ${uploadResult.fileName}]`;
        } else {
          messageContent += `[我方消息|${this.currentChatName}|${this.currentChatTarget}|附件|附件: ${uploadResult.fileName} (${fileSize})]`;
        }

        console.log('[AttachmentSender] 🔍 เนื้อหาข้อความที่สร้าง:', messageContent);

        // ส่งข้อความไปยัง SillyTavern
        const success = await this.sendToSillyTavern(messageContent, uploadResult);

        if (success) {
          console.log(`[AttachmentSender] ✅ ส่งข้อความไฟล์แนบสำเร็จ`);

          // 🌟 เพิ่มใหม่: รอ SillyTavern ประมวลผลข้อความ จากนั้นดึงข้อมูลรูปภาพ
          if (category === 'image') {
            console.log(`[AttachmentSender] 🔍 รอ SillyTavern ประมวลผลข้อความรูปภาพ...`);
            setTimeout(async () => {
              await this.extractImageFromSillyTavern(uploadResult);
            }, 2000); // รอ 2 วินาทีให้ SillyTavern ประมวลผลข้อความ
          }

          return true;
        } else {
          throw new Error('ส่งข้อความไปยัง SillyTavern ล้มเหลว');
        }
      } catch (error) {
        console.error(`[AttachmentSender] ❌ ส่งข้อความไฟล์แนบล้มเหลว:`, error);
        return false;
      }
    }

    // ส่งข้อความไปยัง SillyTavern
    async sendToSillyTavern(messageContent, uploadResult) {
      console.log('[AttachmentSender] 🔍 เริ่มส่งข้อความไปยัง SillyTavern');
      console.log('[AttachmentSender] 🔍 เนื้อหาข้อความ:', messageContent);
      console.log('[AttachmentSender] 🔍 ผลการอัปโหลด:', uploadResult);

      try {
        // ตรวจสอบสภาพแวดล้อม SillyTavern
        console.log('[AttachmentSender] 🔍 ตรวจสอบสภาพแวดล้อม SillyTavern:');
        console.log('  - send_textarea มีอยู่:', !!document.getElementById('send_textarea'));
        console.log('  - send_but มีอยู่:', !!document.getElementById('send_but'));
        console.log('  - window.Generate มีอยู่:', typeof window.Generate === 'function');
        console.log('  - window.messageSender มีอยู่:', !!window.messageSender);
        console.log('  - window.sendMessageAsUser มีอยู่:', typeof window.sendMessageAsUser === 'function');

        // วิธีที่ 1: ใช้วิธี DOM element มาตรฐาน (อ้างอิงจากการใช้งานของ app อื่น)
        const messageTextarea = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (messageTextarea && sendButton) {
          console.log('[AttachmentSender] 🔍 ใช้วิธีที่ 1: วิธี DOM element');

          // ตรวจสอบสถานะ element
          console.log('[AttachmentSender] 🔍 สถานะช่องป้อนข้อมูล:', {
            disabled: messageTextarea.disabled,
            value: messageTextarea.value,
          });
          console.log('[AttachmentSender] 🔍 สถานะปุ่มส่ง:', {
            disabled: sendButton.disabled,
            classList: Array.from(sendButton.classList),
          });

          // บันทึกเนื้อหาเดิม
          const originalContent = messageTextarea.value;
          console.log('[AttachmentSender] 🔍 เนื้อหาช่องป้อนข้อมูลเดิม:', originalContent);

          // ตรวจสอบว่าช่องป้อนข้อมูลใช้งานได้หรือไม่
          if (messageTextarea.disabled) {
            console.warn('[AttachmentSender] ⚠️ ช่องป้อนข้อมูลถูกปิดใช้งาน');
            return false;
          }

          // ตรวจสอบว่าปุ่มส่งใช้งานได้หรือไม่
          if (sendButton.disabled || sendButton.classList.contains('disabled')) {
            console.warn('[AttachmentSender] ⚠️ ปุ่มส่งถูกปิดใช้งาน');
            return false;
          }

          // ตั้งค่าเนื้อหาข้อความ
          messageTextarea.value = messageContent;
          console.log('[AttachmentSender] 🔍 ตั้งค่าช่องป้อนข้อมูลแล้ว:', messageTextarea.value);

          // ทริกเกอร์ event input
          messageTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          messageTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[AttachmentSender] 🔍 ทริกเกอร์ event input แล้ว');

          // คลิกปุ่มส่งแบบหน่วงเวลา
          await new Promise(resolve => setTimeout(resolve, 300));
          sendButton.click();
          console.log('[AttachmentSender] 🔍 คลิกปุ่มส่งแล้ว');

          // รอสักครู่แล้วคืนค่าเนื้อหาเดิม
          setTimeout(() => {
            if (messageTextarea.value === messageContent) {
              messageTextarea.value = originalContent;
              console.log('[AttachmentSender] 🔍 คืนค่าเนื้อหาช่องป้อนข้อมูลเดิม');
            }
          }, 1000);

          return true;
        } else {
          console.warn('[AttachmentSender] ⚠️ ไม่พบ element send_textarea หรือ send_but');
        }

        // วิธีที่ 2: ใช้ messageSender (ถ้ามี)
        if (window.messageSender && typeof window.messageSender.sendToChat === 'function') {
          console.log('[AttachmentSender] 🔍 ใช้วิธีที่ 2: messageSender.sendToChat');
          const result = await window.messageSender.sendToChat(messageContent);
          console.log('[AttachmentSender] 🔍 ผลลัพธ์ messageSender:', result);
          return result;
        }

        // วิธีที่ 3: ลองเรียก API แชทของ SillyTavern โดยตรง
        if (window.sendMessageAsUser) {
          console.log('[AttachmentSender] 🔍 ใช้วิธีที่ 3: sendMessageAsUser');
          await window.sendMessageAsUser(messageContent);
          return true;
        }

        // วิธีที่ 4: ใช้ฟังก์ชัน Generate (ถ้ามี)
        if (typeof window.Generate === 'function') {
          console.log('[AttachmentSender] 🔍 ใช้วิธีที่ 4: ฟังก์ชัน Generate');
          if (messageTextarea) {
            const originalContent = messageTextarea.value;
            messageTextarea.value = messageContent;
            window.Generate('normal');
            setTimeout(() => {
              if (messageTextarea.value === messageContent) {
                messageTextarea.value = originalContent;
              }
            }, 1000);
            return true;
          }
        }

        console.warn('[AttachmentSender] ❌ ไม่พบวิธีส่งที่เหมาะสม');
        return false;
      } catch (error) {
        console.error(`[AttachmentSender] ส่งไปยัง SillyTavern ล้มเหลว:`, error);
        return false;
      }
    }

    // รับเวลาปัจจุบัน
    getCurrentTime() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // 🌟 เพิ่มใหม่: รับชื่อตัวละครปัจจุบัน
    getCurrentCharacterName() {
      try {
        console.log(`[AttachmentSender] 🔍 เริ่มรับชื่อตัวละคร...`);

        // วิธีที่ 1: รับชื่อตัวละครจากข้อความแชท
        const chatMessages = document.querySelectorAll('#chat .mes');
        if (chatMessages.length > 0) {
          // ค้นหาข้อความ AI ล่าสุด รับชื่อตัวละคร
          for (let i = chatMessages.length - 1; i >= 0; i--) {
            const message = chatMessages[i];
            const isUser = message.getAttribute('is_user') === 'true';
            if (!isUser) {
              const charName = message.getAttribute('ch_name');
              if (charName && charName.trim()) {
                console.log(`[AttachmentSender] ✅ รับชื่อตัวละครจากข้อความ:`, charName);
                return charName.trim();
              }
            }
          }
        }

        // วิธีที่ 2: รับจากชื่อแชทปัจจุบัน (โดยปกติคือชื่อตัวละคร)
        if (this.currentChatName && this.currentChatName !== '秦倦') {
          console.log(`[AttachmentSender] ✅ ใช้ชื่อแชทปัจจุบันเป็นชื่อตัวละคร:`, this.currentChatName);
          return this.currentChatName;
        }

        // วิธีที่ 3: รับจาก URL หรือที่อื่น
        const urlParams = new URLSearchParams(window.location.search);
        const charFromUrl = urlParams.get('char') || urlParams.get('character');
        if (charFromUrl) {
          console.log(`[AttachmentSender] ✅ รับชื่อตัวละครจาก URL:`, charFromUrl);
          return charFromUrl;
        }

        // วิธีที่ 4: รับตัวละครที่ใช้ล่าสุดจาก localStorage
        try {
          const recentChar =
            localStorage.getItem('selected_character') ||
            localStorage.getItem('character_name') ||
            localStorage.getItem('current_character');
          if (recentChar) {
            console.log(`[AttachmentSender] ✅ รับชื่อตัวละครจาก localStorage:`, recentChar);
            return recentChar;
          }
        } catch (e) {
          console.warn(`[AttachmentSender] ⚠️ ไม่สามารถเข้าถึง localStorage:`, e);
        }

        // วิธีที่ 5: แผนสำรองสุดท้าย
        console.warn(`[AttachmentSender] ⚠️ ไม่สามารถรับชื่อตัวละคร ใช้ค่าเริ่มต้น`);
        return 'default';
      } catch (error) {
        console.error(`[AttachmentSender] ❌ รับชื่อตัวละครล้มเหลว:`, error);
        return 'default';
      }
    }

    // 🌟 เพิ่มใหม่: ดึงข้อมูลรูปภาพจาก SillyTavern
    async extractImageFromSillyTavern(uploadResult) {
      try {
        console.log(`[AttachmentSender] 🔍 เริ่มดึงข้อมูลรูปภาพจาก SillyTavern DOM`);

        // ค้นหาข้อความรูปภาพล่าสุดจาก DOM โดยตรง
        const chatMessages = document.querySelectorAll('#chat .mes');
        console.log(`[AttachmentSender] 🔍 พบ ${chatMessages.length} ข้อความ DOM`);

        if (chatMessages.length === 0) {
          console.warn(`[AttachmentSender] ⚠️ ไม่พบ element DOM ข้อความแชท`);
          return null;
        }

        // ค้นหารูปภาพจากข้อความล่าสุดไม่กี่ข้อความ
        const messagesToCheck = Math.min(3, chatMessages.length); // ตรวจสอบ 3 ข้อความล่าสุด
        console.log(`[AttachmentSender] 🔍 ตรวจสอบ ${messagesToCheck} ข้อความล่าสุด...`);

        for (let i = chatMessages.length - messagesToCheck; i < chatMessages.length; i++) {
          const messageElement = chatMessages[i];
          console.log(`[AttachmentSender] 🔍 ตรวจสอบข้อความ ${i + 1}:`, messageElement);

          // ค้นหา element รูปภาพ
          const imgElements = messageElement.querySelectorAll('img.mes_img');
          console.log(`[AttachmentSender] 🔍 จำนวนรูปภาพในข้อความ ${i + 1}:`, imgElements.length);

          if (imgElements.length > 0) {
            // พบรูปภาพ รับรูปสุดท้าย (ล่าสุด)
            const latestImg = imgElements[imgElements.length - 1];
            let imageSrc = latestImg.src;

            console.log(`[AttachmentSender] 🔍 URL รูปภาพต้นฉบับ:`, imageSrc);
            console.log(`[AttachmentSender] 🔍 รายละเอียด element รูปภาพ:`, {
              src: latestImg.src,
              alt: latestImg.alt,
              className: latestImg.className,
              width: latestImg.width,
              height: latestImg.height,
            });

            // 🌟 แก้ไขเส้นทางรูปภาพ: ถ้า URL ไม่สมบูรณ์ ลองรับชื่อไฟล์จริงจากรูปภาพอื่น
            if (imageSrc === 'http://127.0.0.1:8000/' || imageSrc.endsWith('/')) {
              console.log(`[AttachmentSender] ⚠️ URL รูปภาพไม่สมบูรณ์ ลองรับชื่อไฟล์จริงจากรูปภาพอื่น...`);

              const characterName = this.getCurrentCharacterName();
              console.log(`[AttachmentSender] 🔍 ชื่อตัวละครที่ได้:`, characterName);

              // 🌟 ลองรับรูปแบบชื่อไฟล์จริงจากรูปภาพอื่นในหน้า
              const workingImages = document.querySelectorAll('img.mes_img');
              let actualFileName = null;

              console.log(`[AttachmentSender] 🔍 จำนวนรูปภาพในหน้า:`, workingImages.length);

              for (let img of workingImages) {
                if (img.src && img.src.includes('/user/images/') && img.naturalWidth > 0) {
                  // ดึงชื่อไฟล์จริง
                  const urlParts = img.src.split('/');
                  const fileName = urlParts[urlParts.length - 1];
                  console.log(`[AttachmentSender] 🔍 พบรูปภาพที่ใช้งานได้:`, img.src);
                  console.log(`[AttachmentSender] 🔍 ชื่อไฟล์ที่ดึงได้:`, fileName);

                  // ถ้านี่คือรูปภาพล่าสุด (โดยปกติชื่อไฟล์จะมี timestamp)
                  if (fileName && fileName.length > 10) {
                    actualFileName = fileName;
                    break;
                  }
                }
              }

              if (actualFileName) {
                // ใช้ชื่อไฟล์จริงที่พบ
                const encodedCharacterName = encodeURIComponent(characterName);
                const correctPath = `/user/images/${encodedCharacterName}/${actualFileName}`;
                const correctUrl = `http://127.0.0.1:8000${correctPath}`;

                console.log(`[AttachmentSender] 🔍 ใช้ชื่อไฟล์จริง:`, actualFileName);
                console.log(`[AttachmentSender] 🔍 เส้นทางที่ถูกต้องที่สร้าง:`, correctPath);
                console.log(`[AttachmentSender] 🔍 URL เต็ม:`, correctUrl);

                imageSrc = correctUrl;
                console.log(`[AttachmentSender] ✅ ใช้เส้นทางที่สร้างจากชื่อไฟล์จริง:`, imageSrc);
              } else {
                // แผนสำรอง: ใช้ชื่อไฟล์ต้นฉบับ
                const encodedCharacterName = encodeURIComponent(characterName);
                const encodedFileName = encodeURIComponent(uploadResult.fileName);
                const correctPath = `/user/images/${encodedCharacterName}/${encodedFileName}`;
                const correctUrl = `http://127.0.0.1:8000${correctPath}`;

                console.log(`[AttachmentSender] ⚠️ ไม่พบชื่อไฟล์จริง ใช้ชื่อไฟล์ต้นฉบับ:`, uploadResult.fileName);
                console.log(`[AttachmentSender] 🔍 URL สำรอง:`, correctUrl);

                imageSrc = correctUrl;
                console.log(`[AttachmentSender] ⚠️ ใช้เส้นทางสำรอง:`, imageSrc);
              }
            }

            console.log(`[AttachmentSender] ✅ URL รูปภาพสุดท้าย:`, imageSrc);

            // แจ้ง message-app ว่ามีข้อความรูปภาพใหม่
            this.notifyMessageAppNewImage({
              imagePath: imageSrc,
              fileName: uploadResult.fileName,
              fileSize: uploadResult.fileSize,
              fileType: uploadResult.fileType,
              chatTarget: this.currentChatTarget,
              chatName: this.currentChatName,
              isGroup: this.isCurrentChatGroup,
              time: this.getCurrentTime(),
            });

            return imageSrc;
          }
        }

        console.warn(`[AttachmentSender] ⚠️ ไม่พบรูปภาพในข้อความล่าสุด`);
        return null;
      } catch (error) {
        console.error(`[AttachmentSender] ❌ ดึงข้อมูลรูปภาพล้มเหลว:`, error);
        return null;
      }
    }

    // 🌟 เพิ่มใหม่: รับข้อความ SillyTavern
    getSillyTavernMessages() {
      try {
        console.log(`[AttachmentSender] 🔍 ลองรับข้อมูลข้อความ SillyTavern...`);

        // ตรวจสอบแหล่งข้อมูลข้อความที่เป็นไปได้ทั้งหมด
        console.log(`[AttachmentSender] 🔍 ตรวจสอบแหล่งข้อมูล:`, {
          'window.chat': !!window.chat,
          'window.chat.length': window.chat ? window.chat.length : 'N/A',
          'window.context': !!window.context,
          'window.context.chat': !!(window.context && window.context.chat),
          'window.messages': !!window.messages,
        });

        // ลองหลายวิธีเพื่อรับข้อมูลข้อความของ SillyTavern
        if (window.chat && Array.isArray(window.chat)) {
          console.log(`[AttachmentSender] ✅ ใช้ window.chat จำนวนข้อความ:`, window.chat.length);
          return window.chat;
        }

        if (window.context && window.context.chat && Array.isArray(window.context.chat)) {
          console.log(`[AttachmentSender] ✅ ใช้ window.context.chat จำนวนข้อความ:`, window.context.chat.length);
          return window.context.chat;
        }

        if (window.messages && Array.isArray(window.messages)) {
          console.log(`[AttachmentSender] ✅ ใช้ window.messages จำนวนข้อความ:`, window.messages.length);
          return window.messages;
        }

        // ลองรับจาก DOM
        const chatContainer = document.querySelector('#chat');
        if (chatContainer && chatContainer.messages) {
          console.log(`[AttachmentSender] ✅ ใช้ DOM chatContainer.messages`);
          return chatContainer.messages;
        }

        console.warn(`[AttachmentSender] ⚠️ ไม่พบข้อมูลข้อความ SillyTavern`);
        return null;
      } catch (error) {
        console.error(`[AttachmentSender] ❌ รับข้อความ SillyTavern ล้มเหลว:`, error);
        return null;
      }
    }

    // 🌟 เพิ่มใหม่: แจ้ง message-app ว่ามีข้อความรูปภาพใหม่
    notifyMessageAppNewImage(imageInfo) {
      try {
        console.log(`[AttachmentSender] 🔍 แจ้ง message-app ข้อความรูปภาพใหม่:`, imageInfo);

        // ตรวจสอบว่า message-app มีอยู่หรือไม่
        if (!window.messageApp) {
          console.warn(`[AttachmentSender] ⚠️ ไม่พบ message-app`);
          return;
        }

        // เรียกเมธอดของ message-app เพื่อจัดการรูปภาพใหม่
        if (typeof window.messageApp.handleNewImageMessage === 'function') {
          window.messageApp.handleNewImageMessage(imageInfo);
        } else {
          console.warn(`[AttachmentSender] ⚠️ ไม่มีเมธอด message-app.handleNewImageMessage`);

          // แผนสำรอง: ทริกเกอร์การรีเฟรชข้อความ
          if (typeof window.messageApp.refreshCurrentMessages === 'function') {
            console.log(`[AttachmentSender] 🔍 ใช้แผนสำรอง: รีเฟรชรายการข้อความ`);
            setTimeout(() => {
              window.messageApp.refreshCurrentMessages();
            }, 1000);
          }
        }
      } catch (error) {
        console.error(`[AttachmentSender] ❌ แจ้ง message-app ล้มเหลว:`, error);
      }
    }

    // 🌟 แก้ไข: รับที่อยู่เซิร์ฟเวอร์ SillyTavern แบบไดนามิก ใช้เส้นทางสัมพัทธ์เป็นอันดับแรก
    getSillyTavernServerUrl() {
      try {
        // 🌟 ใช้เส้นทางสัมพัทธ์เป็นอันดับแรก เพราะ SillyTavern เองก็จัดการแบบนี้
        console.log(`[AttachmentSender] 🔍 ใช้เส้นทางสัมพัทธ์ (แนะนำ)`);
        return ''; // คืนค่าสตริงว่างหมายถึงใช้เส้นทางสัมพัทธ์

        // แผนสำรอง: ถ้าต้องการ URL เต็ม รับจากหน้าปัจจุบัน
        /*
        const currentUrl = window.location;
        if (currentUrl.hostname && currentUrl.port) {
          const serverUrl = `${currentUrl.protocol}//${currentUrl.hostname}:${currentUrl.port}`;
          console.log(`[AttachmentSender] 🔍 รับที่อยู่เซิร์ฟเวอร์จาก URL ปัจจุบัน:`, serverUrl);
          return serverUrl;
        }

        // วิธีที่ 2: ลองรับจากการตั้งค่าหรือตัวแปร global
        if (window.api_server_url) {
          console.log(`[AttachmentSender] 🔍 รับที่อยู่เซิร์ฟเวอร์จาก window.api_server_url:`, window.api_server_url);
          return window.api_server_url;
        }

        // วิธีที่ 3: ที่อยู่เริ่มต้น (แผนสำรอง)
        const defaultUrl = 'http://127.0.0.1:8000';
        console.warn(`[AttachmentSender] ⚠️ ไม่สามารถรับที่อยู่เซิร์ฟเวอร์ ใช้ที่อยู่เริ่มต้น:`, defaultUrl);
        return defaultUrl;
        */
      } catch (error) {
        console.error(`[AttachmentSender] ❌ รับที่อยู่เซิร์ฟเวอร์ล้มเหลว:`, error);
        return '';
      }
    }

    // 🌟 แก้ไข: แยกวิเคราะห์รูปแบบข้อความรูปภาพใหม่แต่ไม่เรนเดอร์ ให้เฉพาะฟังก์ชันแยกวิเคราะห์
    parseImageMessageFormat(messageContent) {
      try {
        console.log(`[AttachmentSender] 🔍 แยกวิเคราะห์รูปแบบข้อความรูปภาพ:`, messageContent);

        // จับคู่รูปแบบข้อความใหม่: [我方消息|络络|555555|附件|图片: 760e7464a688a0bb.png]
        const imageMessageRegex = /\[我方消息\|([^|]+)\|([^|]+)\|附件\|图片:\s*([^|\]]+)\]/g;

        // ค้นหาข้อความรูปภาพที่ตรงกันทั้งหมด
        const matches = [...messageContent.matchAll(imageMessageRegex)];

        if (matches.length === 0) {
          console.log(`[AttachmentSender] 🔍 ไม่พบรูปแบบข้อความรูปภาพ`);
          return null;
        }

        const parsedImages = [];
        const serverUrl = this.getSillyTavernServerUrl();

        for (const match of matches) {
          const [fullMatch, friendName, friendId, fileName] = match;
          console.log(`[AttachmentSender] 🔍 แยกวิเคราะห์ข้อความรูปภาพได้:`, {
            friendName,
            friendId,
            fileName,
            fullMatch,
          });

          // สร้าง URL รูปภาพ
          const encodedFriendName = encodeURIComponent(friendName);

          // 🌟 จัดการชื่อไฟล์ - อาจต้องค้นหาชื่อไฟล์จริง
          let actualFileName = fileName.trim();

          // ถ้าชื่อไฟล์ดูเหมือน ID (สั้นและไม่มีนามสกุล) ต้องค้นหาชื่อไฟล์จริง
          if (actualFileName.length < 20 && !actualFileName.includes('.')) {
            console.log(`[AttachmentSender] 🔍 ชื่อไฟล์ดูเหมือน ID ลองค้นหาชื่อไฟล์จริง...`);
            actualFileName = this.findActualImageFileName(friendName, actualFileName);
          }

          const imageUrl = `${serverUrl}/user/images/${encodedFriendName}/${actualFileName}`;

          parsedImages.push({
            fullMatch,
            friendName,
            friendId,
            fileName,
            actualFileName,
            imageUrl,
          });
        }

        return parsedImages;
      } catch (error) {
        console.error(`[AttachmentSender] ❌ แยกวิเคราะห์ข้อความรูปภาพล้มเหลว:`, error);
        return null;
      }
    }

    // 🌟 แก้ไข: ใช้เส้นทางสัมพัทธ์สร้าง URL รูปภาพ ให้สอดคล้องกับ SillyTavern
    buildImageUrl(friendName, fileName) {
      try {
        console.log(`[AttachmentSender] 🔍 สร้าง URL รูปภาพ: ${friendName}, ${fileName}`);

        // 🌟 ลองค้นหาชื่อไฟล์จริงก่อน
        let actualFileName = fileName.trim();

        // ถ้าชื่อไฟล์ดูเหมือน ID หรือสั้น ลองค้นหาชื่อไฟล์จริง
        if (actualFileName.length < 30 && !actualFileName.includes('_')) {
          console.log(`[AttachmentSender] 🔍 ชื่อไฟล์สั้น ลองค้นหาชื่อไฟล์จริง...`);
          const foundFileName = this.findActualImageFileName(friendName, actualFileName);
          if (foundFileName && foundFileName !== actualFileName) {
            actualFileName = foundFileName;
            console.log(`[AttachmentSender] ✅ ใช้ชื่อไฟล์จริงที่พบ:`, actualFileName);
          }
        }

        // 🌟 ใช้เส้นทางสัมพัทธ์ ให้สอดคล้องกับ SillyTavern
        const relativePath = `/user/images/${friendName}/${actualFileName}`;
        console.log(`[AttachmentSender] ✅ เส้นทางสัมพัทธ์ที่สร้าง:`, relativePath);

        return relativePath;
      } catch (error) {
        console.error(`[AttachmentSender] ❌ สร้าง URL รูปภาพล้มเหลว:`, error);
        return `/user/images/${friendName}/${fileName}`;
      }
    }

    // 🌟 เพิ่มใหม่: ปรับปรุงตรรกะค้นหาชื่อไฟล์ รับชื่อไฟล์จริงจากรูปภาพจริงในหน้า
    findActualImageFileName(friendName, fileId) {
      try {
        console.log(`[AttachmentSender] 🔍 ค้นหาชื่อไฟล์รูปภาพจริง: ${friendName}, ${fileId}`);

        // วิธีที่ 1: รับจาก element รูปภาพในหน้า (น่าเชื่อถือที่สุด)
        const existingImages = document.querySelectorAll('img.mes_img, img[src*="/user/images/"]');
        console.log(`[AttachmentSender] 🔍 พบ ${existingImages.length} element รูปภาพที่เกี่ยวข้องในหน้า`);

        for (const img of existingImages) {
          const src = img.src;
          console.log(`[AttachmentSender] 🔍 ตรวจสอบรูปภาพ:`, src);

          // ตรวจสอบว่าเป็นไดเรกทอรีรูปภาพของเพื่อนคนเดียวกันหรือไม่
          if (
            src.includes(`/user/images/${encodeURIComponent(friendName)}/`) ||
            src.includes(`/user/images/${friendName}/`)
          ) {
            const urlParts = src.split('/');
            const fileName = urlParts[urlParts.length - 1];

            console.log(`[AttachmentSender] 🔍 พบรูปภาพของ ${friendName}:`, fileName);

            // 🌟 กลยุทธ์ใหม่: คืนค่าชื่อไฟล์รูปภาพล่าสุด (โดยปกติคือใหม่ที่สุด)
            // ถ้าชื่อไฟล์มี timestamp ใช้ timestamp ที่ใหญ่กว่าเป็นอันดับแรก
            if (fileName && fileName.length > 10) {
              console.log(`[AttachmentSender] ✅ พบชื่อไฟล์จริงที่เป็นไปได้:`, fileName);
              return fileName;
            }
          }
        }

        // วิธีที่ 2: ค้นหาจากข้อมูลข้อความ SillyTavern
        if (window.chat && Array.isArray(window.chat)) {
          console.log(`[AttachmentSender] 🔍 ค้นหาจากข้อมูลแชท SillyTavern...`);
          for (const message of window.chat.slice(-10)) {
            // ตรวจสอบ 10 ข้อความล่าสุด
            if (message.extra && message.extra.image) {
              const imagePath = message.extra.image;
              console.log(`[AttachmentSender] 🔍 ตรวจสอบรูปภาพข้อความ:`, imagePath);

              if (imagePath.includes(friendName)) {
                const fileName = imagePath.split('/').pop();
                console.log(`[AttachmentSender] ✅ พบชื่อไฟล์จากข้อมูลแชท:`, fileName);
                return fileName;
              }
            }
          }
        }

        // วิธีที่ 3: ตรวจสอบรูปภาพล่าสุดในหน้า (ตาม timestamp)
        const allImages = Array.from(existingImages)
          .map(img => {
            const src = img.src;
            const fileName = src.split('/').pop();
            const timestampMatch = fileName.match(/(\d{13})/); // จับคู่ timestamp 13 หลัก
            return {
              src,
              fileName,
              timestamp: timestampMatch ? parseInt(timestampMatch[1]) : 0,
            };
          })
          .filter(
            item =>
              item.src.includes(`/user/images/${encodeURIComponent(friendName)}/`) ||
              item.src.includes(`/user/images/${friendName}/`),
          )
          .sort((a, b) => b.timestamp - a.timestamp); // เรียงตาม timestamp จากมากไปน้อย

        if (allImages.length > 0) {
          const newestImage = allImages[0];
          console.log(`[AttachmentSender] ✅ พบไฟล์รูปภาพล่าสุด:`, newestImage.fileName);
          return newestImage.fileName;
        }

        // แผนสำรอง: ใช้ชื่อไฟล์ต้นฉบับ
        console.warn(`[AttachmentSender] ⚠️ ไม่พบชื่อไฟล์จริง ใช้ ID ต้นฉบับ:`, fileId);
        return fileId.includes('.') ? fileId : `${fileId}.png`;
      } catch (error) {
        console.error(`[AttachmentSender] ❌ ค้นหาชื่อไฟล์จริงล้มเหลว:`, error);
        return fileId.includes('.') ? fileId : `${fileId}.png`;
      }
    }

    // จัดการการเลือกไฟล์
    async handleFileSelection(files, additionalMessages = '') {
      console.log('[AttachmentSender] 🔍 เริ่มจัดการการเลือกไฟล์ จำนวนไฟล์:', files.length);
      console.log('[AttachmentSender] 🔍 ข้อความเพิ่มเติม:', additionalMessages);
      const results = [];

      for (const file of files) {
        console.log('[AttachmentSender] 🔍 ประมวลผลไฟล์:', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        });

        const validation = this.validateFile(file);
        console.log('[AttachmentSender] 🔍 ผลการตรวจสอบไฟล์:', validation);

        if (!validation.isValid) {
          console.warn('[AttachmentSender] ❌ การตรวจสอบไฟล์ล้มเหลว:', validation.errors);
          results.push({
            file,
            success: false,
            errors: validation.errors,
          });
          continue;
        }

        // อัปโหลดไฟล์
        console.log('[AttachmentSender] 🔍 เริ่มอัปโหลดไฟล์...');
        const uploadResult = await this.uploadFileToSillyTavern(file);
        console.log('[AttachmentSender] 🔍 ผลการอัปโหลดไฟล์:', uploadResult);

        if (uploadResult.success) {
          // ส่งข้อความ
          console.log('[AttachmentSender] 🔍 เริ่มส่งข้อความไฟล์แนบ...');
          const sendSuccess = await this.sendAttachmentMessage(uploadResult, additionalMessages);
          console.log('[AttachmentSender] 🔍 ผลการส่งข้อความ:', sendSuccess);

          results.push({
            file,
            success: sendSuccess,
            uploadResult,
            errors: sendSuccess ? [] : ['ส่งข้อความล้มเหลว'],
          });
        } else {
          console.error('[AttachmentSender] ❌ อัปโหลดไฟล์ล้มเหลว:', uploadResult.error);
          results.push({
            file,
            success: false,
            errors: [uploadResult.error],
          });
        }
      }

      console.log('[AttachmentSender] 🔍 ประมวลผลไฟล์ทั้งหมดเสร็จสมบูรณ์ ผลลัพธ์:', results);
      return results;
    }
  }

  // ส่งออกไปยัง global
  window.AttachmentSender = AttachmentSender;

  // สร้าง instance global
  if (!window.attachmentSender) {
    window.attachmentSender = new AttachmentSender();
  }

  // เพิ่มฟังก์ชันทดสอบไปยัง global สะดวกสำหรับการดีบักในคอนโซล
  window.testAttachmentSender = async function (testMessage = 'ทดสอบฟังก์ชันส่งไฟล์แนบ') {
    console.log('[AttachmentSender] 🧪 เริ่มทดสอบฟังก์ชันส่ง...');

    if (!window.attachmentSender) {
      console.error('[AttachmentSender] ❌ attachmentSender ยังไม่ได้เริ่มต้น');
      return false;
    }

    // จำลองผลการอัปโหลด
    const mockUploadResult = {
      success: true,
      fileUrl: 'test://mock-file-url',
      fileName: 'test-file.png',
      fileSize: 12345,
      fileType: 'image/png',
    };

    try {
      const result = await window.attachmentSender.sendToSillyTavern(testMessage, mockUploadResult);
      console.log('[AttachmentSender] 🧪 ผลการทดสอบ:', result);
      return result;
    } catch (error) {
      console.error('[AttachmentSender] 🧪 ทดสอบล้มเหลว:', error);
      return false;
    }
  };

  // เพิ่มฟังก์ชันตรวจจับสภาพแวดล้อม
  window.checkAttachmentEnvironment = function () {
    console.log('[AttachmentSender] 🔍 ผลการตรวจจับสภาพแวดล้อม:');
    console.log('  - send_textarea มีอยู่:', !!document.getElementById('send_textarea'));
    console.log('  - send_but มีอยู่:', !!document.getElementById('send_but'));
    console.log('  - window.Generate มีอยู่:', typeof window.Generate === 'function');
    console.log('  - window.messageSender มีอยู่:', !!window.messageSender);
    console.log(
      '  - window.messageSender.sendToChat มีอยู่:',
      !!(window.messageSender && typeof window.messageSender.sendToChat === 'function'),
    );
    console.log('  - window.sendMessageAsUser มีอยู่:', typeof window.sendMessageAsUser === 'function');
    console.log('  - window.attachmentSender มีอยู่:', !!window.attachmentSender);

    // ตรวจสอบฟังก์ชันอัปโหลดของ SillyTavern
    console.log(
      '  - window.uploadFileAttachmentToServer มีอยู่:',
      typeof window.uploadFileAttachmentToServer === 'function',
    );
    console.log('  - #file_form_input มีอยู่:', !!document.getElementById('file_form_input'));
    console.log('  - #attachFile มีอยู่:', !!document.getElementById('attachFile'));
    console.log('  - .file_attached มีอยู่:', !!document.querySelector('.file_attached'));

    // ตรวจสอบสถานะ element
    const textarea = document.getElementById('send_textarea');
    const sendBtn = document.getElementById('send_but');

    if (textarea) {
      console.log('  - สถานะช่องป้อนข้อมูล:', {
        disabled: textarea.disabled,
        value: textarea.value,
        placeholder: textarea.placeholder,
      });
    }

    if (sendBtn) {
      console.log('  - สถานะปุ่มส่ง:', {
        disabled: sendBtn.disabled,
        classList: Array.from(sendBtn.classList),
        textContent: sendBtn.textContent,
      });
    }

    // ตรวจสอบว่าปัจจุบันมีไฟล์แนบหรือไม่
    const fileAttached = document.querySelector('.file_attached');
    if (fileAttached) {
      const fileName = fileAttached.querySelector('.file_name');
      const fileSize = fileAttached.querySelector('.file_size');
      console.log('  - ไฟล์แนบปัจจุบัน:', {
        fileName: fileName ? fileName.textContent : 'ไม่ทราบ',
        fileSize: fileSize ? fileSize.textContent : 'ไม่ทราบ',
      });
    }
  };

  // เพิ่มฟังก์ชันทดสอบอัปโหลด
  window.testSillyTavernUpload = async function () {
    console.log('[AttachmentSender] 🧪 เริ่มทดสอบฟังก์ชันอัปโหลด SillyTavern...');

    // สร้างไฟล์ทดสอบ
    const testContent = 'This is a test file for attachment upload';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test-attachment.txt', { type: 'text/plain' });

    console.log('[AttachmentSender] 🧪 สร้างไฟล์ทดสอบ:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type,
    });

    if (!window.attachmentSender) {
      console.error('[AttachmentSender] ❌ attachmentSender ยังไม่ได้เริ่มต้น');
      return false;
    }

    try {
      const result = await window.attachmentSender.uploadFileToSillyTavern(testFile);
      console.log('[AttachmentSender] 🧪 ผลการทดสอบอัปโหลด:', result);
      return result;
    } catch (error) {
      console.error('[AttachmentSender] 🧪 ทดสอบอัปโหลดล้มเหลว:', error);
      return false;
    }
  };

  // เพิ่มฟังก์ชันทดสอบขั้นตอนเต็ม
  window.testImageMessageFlow = async function () {
    console.log('[AttachmentSender] 🧪 เริ่มทดสอบขั้นตอนข้อความรูปภาพเต็ม...');

    // สร้างไฟล์รูปภาพทดสอบ
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('TEST', 30, 55);

    // แปลงเป็น blob
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        const testFile = new File([blob], 'test-image.png', { type: 'image/png' });

        console.log('[AttachmentSender] 🧪 สร้างไฟล์รูปภาพทดสอบ:', {
          name: testFile.name,
          size: testFile.size,
          type: testFile.type,
        });

        if (!window.attachmentSender) {
          console.error('[AttachmentSender] ❌ attachmentSender ยังไม่ได้เริ่มต้น');
          resolve(false);
          return;
        }

        // ตั้งค่าเป้าหมายแชททดสอบ
        window.attachmentSender.setCurrentChat('test123', 'เพื่อนทดสอบ', false);

        try {
          const results = await window.attachmentSender.handleFileSelection([testFile]);
          console.log('[AttachmentSender] 🧪 ผลการทดสอบขั้นตอนเต็ม:', results);
          resolve(results);
        } catch (error) {
          console.error('[AttachmentSender] 🧪 ทดสอบขั้นตอนเต็มล้มเหลว:', error);
          resolve(false);
        }
      }, 'image/png');
    });
  };

  console.log('[AttachmentSender] โหลดโมดูลตัวส่งไฟล์แนบเสร็จสมบูรณ์');
  // เพิ่มฟังก์ชันตรวจสอบข้อความ SillyTavern
  window.checkSillyTavernMessages = function () {
    console.log('[AttachmentSender] 🔍 ตรวจสอบโครงสร้างข้อมูลข้อความ SillyTavern...');

    // ตรวจสอบ window.chat
    if (window.chat) {
      console.log('[AttachmentSender] 🔍 window.chat มีอยู่ ประเภท:', typeof window.chat);
      console.log('[AttachmentSender] 🔍 window.chat เป็นอาร์เรย์:', Array.isArray(window.chat));
      if (Array.isArray(window.chat)) {
        console.log('[AttachmentSender] 🔍 ความยาว window.chat:', window.chat.length);
        if (window.chat.length > 0) {
          const lastMessage = window.chat[window.chat.length - 1];
          console.log('[AttachmentSender] 🔍 ข้อความสุดท้าย:', lastMessage);
          console.log('[AttachmentSender] 🔍 extra ของข้อความสุดท้าย:', lastMessage.extra);
          if (lastMessage.extra) {
            console.log('[AttachmentSender] 🔍 extra.image:', lastMessage.extra.image);
            console.log('[AttachmentSender] 🔍 extra.file:', lastMessage.extra.file);
          }
        }
      }
    } else {
      console.log('[AttachmentSender] ⚠️ window.chat ไม่มีอยู่');
    }

    // ตรวจสอบแหล่งข้อมูลอื่นที่เป็นไปได้
    console.log('[AttachmentSender] 🔍 แหล่งข้อมูลอื่น:');
    console.log('  - window.context:', !!window.context);
    console.log('  - window.context.chat:', !!(window.context && window.context.chat));

    // ตรวจสอบ element ข้อความใน DOM
    const chatMessages = document.querySelectorAll('#chat .mes');
    console.log('[AttachmentSender] 🔍 จำนวน element ข้อความใน DOM:', chatMessages.length);

    if (chatMessages.length > 0) {
      const lastMsgElement = chatMessages[chatMessages.length - 1];
      console.log('[AttachmentSender] 🔍 element DOM ข้อความสุดท้าย:', lastMsgElement);

      // ตรวจสอบว่ามี element รูปภาพหรือไม่
      const imgElements = lastMsgElement.querySelectorAll('img');
      console.log('[AttachmentSender] 🔍 จำนวน element รูปภาพในข้อความสุดท้าย:', imgElements.length);
      if (imgElements.length > 0) {
        imgElements.forEach((img, index) => {
          console.log(`[AttachmentSender] 🔍 รูปภาพ ${index + 1}:`, {
            src: img.src,
            alt: img.alt,
            className: img.className,
          });
        });
      }
    }
  };

  console.log('[AttachmentSender] 💡 คำสั่งทดสอบที่ใช้ได้:');
  console.log('  - checkAttachmentEnvironment() - ตรวจสอบสถานะสภาพแวดล้อม');
  console.log('  - testAttachmentSender("ข้อความทดสอบ") - ทดสอบฟังก์ชันส่ง');
  console.log('  - testSillyTavernUpload() - ทดสอบฟังก์ชันอัปโหลด SillyTavern');
  console.log('  - testImageMessageFlow() - ทดสอบขั้นตอนข้อความรูปภาพเต็ม');
  console.log('  - checkSillyTavernMessages() - ตรวจสอบโครงสร้างข้อมูลข้อความ SillyTavern');
  console.log('  - testImageMessageParsing() - ทดสอบฟังก์ชันแยกวิเคราะห์ข้อความรูปภาพใหม่');

  // 🌟 เพิ่มใหม่: ทดสอบฟังก์ชันแยกวิเคราะห์ข้อความรูปภาพใหม่
  window.testImageMessageParsing = function (testMessage = '[我方消息|络络|555555|附件|图片: 760e7464a688a0bb.png]') {
    console.log('[AttachmentSender] 🧪 เริ่มทดสอบฟังก์ชันแยกวิเคราะห์ข้อความรูปภาพ...');

    if (!window.attachmentSender) {
      console.error('[AttachmentSender] ❌ attachmentSender ยังไม่ได้เริ่มต้น');
      return false;
    }

    try {
      console.log('[AttachmentSender] 🧪 อินพุตทดสอบ:', testMessage);

      // ทดสอบฟังก์ชันแยกวิเคราะห์
      const result = window.attachmentSender.parseImageMessageFormat(testMessage);
      console.log('[AttachmentSender] 🧪 ผลการแยกวิเคราะห์:', result);

      // ทดสอบการรับที่อยู่เซิร์ฟเวอร์
      const serverUrl = window.attachmentSender.getSillyTavernServerUrl();
      console.log('[AttachmentSender] 🧪 ที่อยู่เซิร์ฟเวอร์:', serverUrl);

      // ทดสอบการสร้าง URL รูปภาพ
      const imageUrl = window.attachmentSender.buildImageUrl('络络', '-_3.png');
      console.log('[AttachmentSender] 🧪 URL รูปภาพที่สร้าง:', imageUrl);

      return {
        success: true,
        originalMessage: testMessage,
        parsedResult: result,
        serverUrl: serverUrl,
        imageUrl: imageUrl,
      };
    } catch (error) {
      console.error('[AttachmentSender] 🧪 ทดสอบล้มเหลว:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // 🌟 เพิ่มใหม่: ทดสอบแบบแบตช์รูปแบบข้อความรูปภาพหลายรูปแบบ
  window.testMultipleImageFormats = function () {
    console.log('[AttachmentSender] 🧪 เริ่มทดสอบแบบแบตช์รูปแบบข้อความรูปภาพหลายรูปแบบ...');

    const testCases = [
      '[我方消息|络络|555555|附件|图片: 760e7464a688a0bb.png]',
      '[我方消息|Alice|123456|附件|图片: image123.jpg]',
      '[我方消息|测试用户|999999|附件|图片: test_image_2024.png]',
      '这是一段包含多个图片的文本 [我方消息|用户1|111|附件|图片: pic1.png] 以及 [我方消息|用户2|222|附件|图片: pic2.jpg] 的消息',
    ];

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`[AttachmentSender] 🧪 กรณีทดสอบ ${i + 1}:`, testCase);

      const result = window.testImageMessageParsing(testCase);
      results.push({
        testCase: i + 1,
        input: testCase,
        result: result,
      });
    }

    console.log('[AttachmentSender] 🧪 ทดสอบแบบแบตช์เสร็จสมบูรณ์ ผลลัพธ์:', results);
    return results;
  };
})(window);
