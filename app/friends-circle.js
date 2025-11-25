/**
 * Friends Circle - ฟีเจอร์วงเพื่อน
 * ให้ฟีเจอร์วงเพื่อนสำหรับ mobile-phone.js โดยจำลองมาจาก Qzone และ WeChat Moments
 */

// ป้องกันการนิยามซ้ำ
if (typeof window.FriendsCircle === 'undefined') {
  /**
   * ตัวจัดการข้อมูลวงเพื่อน
   * รับผิดชอบในการแยกวิเคราะห์, จัดเก็บ และจัดการข้อมูลวงเพื่อน
   */
  class FriendsCircleManager {
    constructor() {
      this.friendsCircleData = new Map(); // จัดเก็บข้อมูลวงเพื่อน
      this.likesData = new Map(); // จัดเก็บข้อมูลการกดถูกใจ
      this.lastProcessedMessageId = null;
      this.lastProcessedMessageIndex = -1; // บันทึกดัชนีข้อความที่ประมวลผลล่าสุด

      // Regular Expression รูปแบบวงเพื่อน - การจับคู่ที่แม่นยำยิ่งขึ้น, หลีกเลี่ยงการจับคู่ข้ามบรรทัด
      this.patterns = {
        // วงเพื่อนแบบข้อความ: [朋友圈|角色名|好友ID|w楼层ID|内容]
        textCircle: /\[朋友圈\|([^|\]]+)\|([^|\]]+)\|(w\d+)\|([^\]]+?)\]/g,
        // วงเพื่อนแบบภาพ (มีข้อความ): [朋友圈|角色名|好友ID|s楼层ID|图片描述|文字内容]
        visualCircle: /\[朋友圈\|([^|\]]+)\|([^|\]]+)\|(s\d+)\|([^|]+?)\|([^\]]+?)\]/g,
        // วงเพื่อนแบบภาพ (ไม่มีข้อความ): [朋友圈|角色名|好友ID|s楼层ID|图片描述]
        visualCircleNoText: /\[朋友圈\|([^|\]]+)\|([^|\]]+)\|(s\d+)\|([^\]]+?)\]/g,
        // 🌟 ใหม่: รูปแบบวงเพื่อนรูปภาพที่ผู้ใช้ส่ง (6 ส่วน): [朋友圈|角色名|好友ID|s楼层ID|图片描述|文字内容]
        userVisualCircle: /\[朋友圈\|([^|\]]+)\|([^|\]]+)\|(s\d+)\|我的图片:\s*([^|]+?)\|([^\]]+?)\]/g,
        // การตอบกลับวงเพื่อน
        circleReply: /\[朋友圈回复\|([^|\]]+)\|([^|\]]+)\|([ws]\d+)\|([^\]]+?)\]/g,
      };

      console.log('[Friends Circle] ตัวจัดการข้อมูลวงเพื่อนเริ่มต้นเสร็จสมบูรณ์'); // Translated: 朋友圈数据管理器初始化完成
    }

    /**
     * ตรวจสอบว่าเนื้อหาวงเพื่อนสมเหตุสมผลหรือไม่
     * @param {string} content - เนื้อหาที่จะตรวจสอบ
     * @returns {boolean} ว่าเป็นเนื้อหาวงเพื่อนที่สมเหตุสมผลหรือไม่
     */
    isValidCircleContent(content) {
      if (!content || typeof content !== 'string') {
        return false;
      }

      // ตรวจสอบว่ามีเนื้อหาที่ไม่ใช่วงเพื่อนที่ชัดเจนหรือไม่
      const invalidPatterns = [
        /^\s*-\s*序号:/, // รูปแบบลำดับเลข (序号格式)
        /^\s*\|\s*名字\s*\|/, // ส่วนหัวตาราง (表格头)
        /^\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|/, // แถวตาราง (表格行)
        /剧情总结:/, // สรุปเนื้อเรื่อง (剧情总结)
        /^\s*<[^>]+>/, // แท็ก HTML (HTML标签)
        /^\s*\[好友id\|/, // รูปแบบ ID เพื่อน (好友ID格式)
        /^\s*<UpdateVariable>/, // การอัปเดตตัวแปร (变量更新)
        /^\s*<content>/, // แท็ก content (content标签)
        /^\s*<apple>/, // แท็ก apple (apple标签)
      ];

      // หากตรงกับรูปแบบที่ไม่ถูกต้องใดๆ ให้ส่งคืน false
      for (const pattern of invalidPatterns) {
        if (pattern.test(content)) {
          console.log(
            `[Friends Circle] ❌ การตรวจสอบเนื้อหาล้มเหลว, ตรงกับรูปแบบที่ไม่ถูกต้อง: ${pattern}`,
            content.substring(0, 100),
          ); // Translated: 内容验证失败，匹配到无效模式
          return false;
        }
      }

      // ตรวจสอบความยาวของเนื้อหาว่าสมเหตุสมผลหรือไม่ (ยาวเกินไปอาจมีเนื้อหาอื่นรวมอยู่ด้วย)
      if (content.length > 1000) {
        console.log(`[Friends Circle] ❌ เนื้อหายาวเกินไป, อาจมีเนื้อหาที่ไม่เกี่ยวข้อง: ${content.length} อักขระ`); // Translated: 内容过长，可能包含无关内容
        return false;
      }

      return true;
    }

    /**
     * แยกวิเคราะห์ข้อมูลวงเพื่อน
     * @param {string} chatContent - เนื้อหาการแชท
     * @param {number} startIndex - ดัชนีข้อความเริ่มต้นการแยกวิเคราะห์ (สำหรับอัปเดตแบบเพิ่มหน่วย)
     * @returns {Map} ข้อมูลวงเพื่อนที่แยกวิเคราะห์แล้ว
     */
    parseFriendsCircleData(chatContent, startIndex = 0) {
      const circles = new Map();

      if (!chatContent || typeof chatContent !== 'string') {
        return circles;
      }

      // แยกเนื้อหาการแชทเป็นอาร์เรย์ข้อความ เพื่อใช้ในการคำนวณตำแหน่งข้อความ
      const messages = chatContent.split('\n');

      // แยกวิเคราะห์วงเพื่อนแบบข้อความ
      let match;
      this.patterns.textCircle.lastIndex = 0;
      while ((match = this.patterns.textCircle.exec(chatContent)) !== null) {
        const [, author, friendId, floorId, content] = match;

        // ตรวจสอบความสมเหตุสมผลของเนื้อหา (ไม่รวมรูปแบบตารางหรือเนื้อหาที่ไม่เกี่ยวข้องอื่นๆ)
        if (this.isValidCircleContent(content) && !circles.has(floorId)) {
          // ค้นหาตำแหน่งของข้อความนี้ในการแชท
          const messageIndex = this.findMessageIndex(messages, match[0], startIndex);

          const circleData = {
            id: floorId,
            author: author,
            friendId: friendId,
            type: 'text',
            content: content,
            messageIndex: messageIndex,
            latestActivityIndex: messageIndex,
            replies: [],
            likes: this.getLikeCount(floorId),
            isLiked: this.isLiked(floorId),
          };

          circles.set(floorId, circleData);
        }
      }

      // แยกวิเคราะห์วงเพื่อนแบบภาพ (มีข้อความ)
      this.patterns.visualCircle.lastIndex = 0;
      while ((match = this.patterns.visualCircle.exec(chatContent)) !== null) {
        const [, author, friendId, floorId, imageDescription, textContent] = match;

        // ตรวจสอบความสมเหตุสมผลของคำอธิบายภาพและเนื้อหาข้อความ
        if (
          this.isValidCircleContent(imageDescription) &&
          this.isValidCircleContent(textContent) &&
          !circles.has(floorId)
        ) {
          // ค้นหาตำแหน่งของข้อความนี้ในการแชท
          const messageIndex = this.findMessageIndex(messages, match[0], startIndex);

          // 🌟 วิธีที่ 1: ค้นหาข้อความ SillyTavern ที่สอดคล้องและดึงข้อมูลภาพ
          const imageInfo = this.extractImageFromMessage(match[0], imageDescription, author);

          const circleData = {
            id: floorId,
            author: author,
            friendId: friendId,
            type: 'visual',
            imageDescription: imageDescription,
            imageUrl: imageInfo.imageUrl, // 🌟 เพิ่ม URL ภาพจริง
            imageFileName: imageInfo.fileName, // 🌟 เพิ่มชื่อไฟล์จริง
            content: textContent,
            messageIndex: messageIndex,
            latestActivityIndex: messageIndex,
            replies: [],
            likes: this.getLikeCount(floorId),
            isLiked: this.isLiked(floorId),
          };

          circles.set(floorId, circleData);
        }
      }

      // แยกวิเคราะห์วงเพื่อนแบบภาพ (ไม่มีข้อความ)
      this.patterns.visualCircleNoText.lastIndex = 0;
      while ((match = this.patterns.visualCircleNoText.exec(chatContent)) !== null) {
        const [, author, friendId, floorId, imageDescription] = match;

        // ตรวจสอบความสมเหตุสมผลของคำอธิบายภาพ และชั้นยังไม่ได้รับการประมวลผล
        if (this.isValidCircleContent(imageDescription) && !circles.has(floorId)) {
          // ค้นหาตำแหน่งของข้อความนี้ในการแชท
          const messageIndex = this.findMessageIndex(messages, match[0], startIndex);

          // 🌟 วิธีที่ 1: ค้นหาข้อความ SillyTavern ที่สอดคล้องและดึงข้อมูลภาพ
          const imageInfo = this.extractImageFromMessage(match[0], imageDescription, author);

          const circleData = {
            id: floorId,
            author: author,
            friendId: friendId,
            type: 'visual',
            imageDescription: imageDescription,
            imageUrl: imageInfo.imageUrl, // 🌟 เพิ่ม URL ภาพจริง
            imageFileName: imageInfo.fileName, // 🌟 เพิ่มชื่อไฟล์จริง
            content: '', // ไม่มีเนื้อหาข้อความ
            messageIndex: messageIndex,
            latestActivityIndex: messageIndex,
            replies: [],
            likes: this.getLikeCount(floorId),
            isLiked: this.isLiked(floorId),
          };

          circles.set(floorId, circleData);
        }
      }

      // 🌟 ใหม่: แยกวิเคราะห์รูปแบบวงเพื่อนรูปภาพที่ผู้ใช้ส่ง
      this.patterns.userVisualCircle.lastIndex = 0;
      while ((match = this.patterns.userVisualCircle.exec(chatContent)) !== null) {
        const [, author, friendId, floorId, fileName, textContent] = match;

        // ตรวจสอบความสมเหตุสมผลของเนื้อหา และชั้นยังไม่ได้รับการประมวลผล
        if (this.isValidCircleContent(textContent) && !circles.has(floorId)) {
          // ค้นหาตำแหน่งของข้อความนี้ในการแชท
          const messageIndex = this.findMessageIndex(messages, match[0], startIndex);

          // 🌟 วิธีที่ 1: ค้นหาข้อความ SillyTavern ที่สอดคล้องและดึงข้อมูลภาพ
          const imageInfo = this.extractImageFromMessage(match[0], fileName, author);

          const circleData = {
            id: floorId,
            author: author,
            friendId: friendId,
            type: 'visual',
            imageDescription: `รูปภาพของฉัน: ${fileName}`, // Translated: 我的图片: ${fileName} -> รูปภาพของฉัน
            imageUrl: imageInfo.imageUrl, // 🌟 เพิ่ม URL ภาพจริง
            imageFileName: imageInfo.fileName || fileName, // 🌟 เพิ่มชื่อไฟล์จริง
            content: textContent,
            messageIndex: messageIndex,
            latestActivityIndex: messageIndex,
            replies: [],
            likes: this.getLikeCount(floorId),
            isLiked: this.isLiked(floorId),
          };

          circles.set(floorId, circleData);
        }
      }

      // แยกวิเคราะห์การตอบกลับ
      this.patterns.circleReply.lastIndex = 0;
      while ((match = this.patterns.circleReply.exec(chatContent)) !== null) {
        const [, replyAuthor, replyFriendId, floorId, replyContent] = match;

        if (circles.has(floorId)) {
          const circle = circles.get(floorId);

          // ตรวจสอบว่ามีการตอบกลับที่ซ้ำกันหรือไม่ (การล้างข้อมูลซ้ำ)
          const existingReply = circle.replies.find(r => r.author === replyAuthor && r.content === replyContent);

          if (!existingReply) {
            // ค้นหาตำแหน่งของข้อความตอบกลับในการแชท
            const replyMessageIndex = this.findMessageIndex(messages, match[0], startIndex);

            circle.replies.push({
              id: `reply_${replyMessageIndex}_${Math.random().toString(36).substring(2, 11)}`,
              author: replyAuthor,
              friendId: replyFriendId,
              content: replyContent,
              messageIndex: replyMessageIndex,
              likes: 0,
              isLiked: false,
            });

            // อัปเดตตำแหน่งกิจกรรมล่าสุดของวงเพื่อน (มีการตอบกลับใหม่)
            circle.latestActivityIndex = Math.max(circle.latestActivityIndex, replyMessageIndex);

            console.log(
              `[Friends Circle] ✅ แยกวิเคราะห์การตอบกลับ: ${replyAuthor} -> ${floorId} ที่ดัชนี ${replyMessageIndex}`,
            ); // Translated: 解析到回复
          }
        }
      }

      console.log(`[Friends Circle] แยกวิเคราะห์วงเพื่อนได้ ${circles.size} รายการ`); // Translated: 解析到 ${circles.size} 条朋友圈
      return circles;
    }

    /**
     * 🌟 วิธีที่ 1: ดึงข้อมูลภาพจากข้อความ SillyTavern
     * @param {string} circleContent - เนื้อหาวงเพื่อน
     * @param {string} fileName - ชื่อไฟล์
     * @param {string} author - ผู้เขียน
     * @returns {Object} ข้อมูลภาพ {imageUrl, fileName}
     */
    extractImageFromMessage(circleContent, fileName, author) {
      try {
        // รับข้อมูลการแชท SillyTavern
        let chatMessages = null;

        // ให้ความสำคัญกับการใช้ SillyTavern.getContext().chat ก่อน
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            chatMessages = context.chat;
          }
        }

        // ทางเลือกสำรอง: รับจากตัวแปรส่วนกลาง
        if (!chatMessages && window.chat && Array.isArray(window.chat)) {
          chatMessages = window.chat;
        }

        if (!chatMessages) {
          console.warn('[Friends Circle] ไม่สามารถรับข้อมูลการแชท SillyTavern ได้'); // Translated: 无法获取SillyTavern聊天数据
          return { imageUrl: null, fileName: fileName };
        }

        // 🌟 กุญแจสำคัญ: ค้นหาข้อความที่มีเนื้อหาวงเพื่อน
        const targetMessage = chatMessages.find(message => {
          const content = message.mes || message.content || '';
          return content.includes(circleContent.trim());
        });

        if (!targetMessage) {
          console.warn('[Friends Circle] ไม่พบข้อความ SillyTavern ที่สอดคล้อง'); // Translated: 未找到对应的SillyTavern消息
          return { imageUrl: null, fileName: fileName };
        }

        // 🌟 วิธีที่ 1: ดึง URL ภาพจาก message.extra.image
        if (targetMessage.extra && targetMessage.extra.image) {
          const imageUrl = targetMessage.extra.image;
          const realFileName = imageUrl.split('/').pop();

          return { imageUrl: imageUrl, fileName: realFileName };
        }

        // 🌟 วิธีที่ 2: ดึงแท็ก <img> จาก detailedContent
        if (targetMessage.detailedContent) {
          const imgMatch = targetMessage.detailedContent.match(/<img[^>]+src="([^"]+)"/);
          if (imgMatch) {
            const imageUrl = imgMatch[1];
            const realFileName = imageUrl.split('/').pop();

            return { imageUrl: imageUrl, fileName: realFileName };
          }
        }

        // 🌟 วิธีที่ 3: ใช้ AttachmentSender สร้าง URL ภาพ
        if (window.attachmentSender && typeof window.attachmentSender.buildImageUrl === 'function') {
          const imageUrl = window.attachmentSender.buildImageUrl(author, fileName);

          return { imageUrl: imageUrl, fileName: fileName };
        }

        console.warn('[Friends Circle] ทุกวิธีไม่สามารถรับ URL ภาพได้, ใช้ตัวยึดตำแหน่ง'); // Translated: 所有方法都无法获取图片URL，使用占位符
        return { imageUrl: null, fileName: fileName };
      } catch (error) {
        console.error('[Friends Circle] ดึงข้อมูลภาพล้มเหลว:', error); // Translated: 提取图片信息失败
        return { imageUrl: null, fileName: fileName };
      }
    }

    /**
     * ค้นหาดัชนีตำแหน่งของข้อความในการแชท
     * @param {Array} messages - อาร์เรย์ข้อความ
     * @param {string} targetMessage - เนื้อหาข้อความเป้าหมาย
     * @param {number} startIndex - ดัชนีเริ่มต้นการค้นหา
     * @returns {number} ดัชนีตำแหน่งข้อความ
     */
    findMessageIndex(messages, targetMessage, startIndex = 0) {
      // เริ่มต้นค้นหาจากตำแหน่งที่ระบุ หาบรรทัดที่มีข้อความเป้าหมาย
      for (let i = startIndex; i < messages.length; i++) {
        if (messages[i].includes(targetMessage)) {
          return i;
        }
      }

      // หากไม่พบ ให้เริ่มค้นหาตั้งแต่ต้น (การจัดการความเข้ากันได้)
      for (let i = 0; i < startIndex; i++) {
        if (messages[i].includes(targetMessage)) {
          return i;
        }
      }

      // หากยังไม่พบ ให้ส่งคืนดัชนีตามเวลาปัจจุบัน
      return messages.length + (Math.floor(Date.now() / 1000) % 1000);
    }

    /**
     * แยกวิเคราะห์ข้อมูลวงเพื่อนแบบเพิ่มหน่วย (ใช้สำหรับการอัปเดตแบบเพิ่มหน่วยโดยเฉพาะ)
     * @param {string} fullChatContent - เนื้อหาการแชทฉบับเต็ม
     * @param {number} lastProcessedIndex - ดัชนีข้อความที่ประมวลผลล่าสุด
     * @returns {Map} ข้อมูลวงเพื่อนที่เพิ่มหรืออัปเดตใหม่
     */
    parseIncrementalData(fullChatContent, lastProcessedIndex) {
      const circles = new Map();
      const messages = fullChatContent.split('\n');

      console.log(
        `[Friends Circle] การแยกวิเคราะห์แบบเพิ่มหน่วย: ข้อความรวม ${messages.length}, ประมวลผลล่าสุดที่ ${lastProcessedIndex}`,
      ); // Translated: 增量解析：总消息数 ${messages.length}，上次处理到 ${lastProcessedIndex}

      // ค้นหาวงเพื่อนใหม่เฉพาะในข้อความที่เพิ่มใหม่เท่านั้น (การเผยแพร่วงเพื่อนดั้งเดิม)
      for (let i = lastProcessedIndex; i < messages.length; i++) {
        const message = messages[i];

        // ตรวจสอบว่าเป็นการเผยแพร่วงเพื่อนใหม่หรือไม่
        const textMatch = this.patterns.textCircle.exec(message);
        if (textMatch) {
          const [, author, friendId, floorId, content] = textMatch;
          if (this.isValidCircleContent(content) && !circles.has(floorId)) {
            circles.set(floorId, {
              id: floorId,
              author: author,
              friendId: friendId,
              type: 'text',
              content: content,
              messageIndex: i,
              latestActivityIndex: i,
              replies: [],
              likes: this.getLikeCount(floorId),
              isLiked: this.isLiked(floorId),
            });
            console.log(
              `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบวงเพื่อนแบบข้อความใหม่: ${author} (${floorId}) ที่ดัชนี ${i}`,
            ); // Translated: 增量解析到新文字朋友圈
          }
        }

        // รีเซ็ต Regular Expression
        this.patterns.textCircle.lastIndex = 0;

        // ตรวจสอบวงเพื่อนแบบภาพ (มีข้อความ)
        const visualMatch = this.patterns.visualCircle.exec(message);
        if (visualMatch) {
          const [, author, friendId, floorId, imageDescription, textContent] = visualMatch;
          if (
            this.isValidCircleContent(imageDescription) &&
            this.isValidCircleContent(textContent) &&
            !circles.has(floorId)
          ) {
            circles.set(floorId, {
              id: floorId,
              author: author,
              friendId: friendId,
              type: 'visual',
              imageDescription: imageDescription,
              content: textContent,
              messageIndex: i,
              latestActivityIndex: i,
              replies: [],
              likes: this.getLikeCount(floorId),
              isLiked: this.isLiked(floorId),
            });
            console.log(
              `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบวงเพื่อนแบบภาพใหม่: ${author} (${floorId}) ที่ดัชนี ${i}`,
            ); // Translated: 增量解析到新视觉朋友圈
          }
        }

        // รีเซ็ต Regular Expression
        this.patterns.visualCircle.lastIndex = 0;

        // ตรวจสอบวงเพื่อนแบบภาพ (ไม่มีข้อความ)
        const visualNoTextMatch = this.patterns.visualCircleNoText.exec(message);
        if (visualNoTextMatch) {
          const [, author, friendId, floorId, imageDescription] = visualNoTextMatch;
          if (this.isValidCircleContent(imageDescription) && !circles.has(floorId)) {
            circles.set(floorId, {
              id: floorId,
              author: author,
              friendId: friendId,
              type: 'visual',
              imageDescription: imageDescription,
              content: '',
              messageIndex: i,
              latestActivityIndex: i,
              replies: [],
              likes: this.getLikeCount(floorId),
              isLiked: this.isLiked(floorId),
            });
            console.log(
              `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบวงเพื่อนแบบภาพใหม่ (ไม่มีข้อความ): ${author} (${floorId}) ที่ดัชนี ${i}`,
            ); // Translated: 增量解析到新视觉朋友圈(无文字)
          }
        }

        // รีเซ็ต Regular Expression
        this.patterns.visualCircleNoText.lastIndex = 0;

        // 🌟 ใหม่: ตรวจสอบรูปแบบวงเพื่อนรูปภาพที่ผู้ใช้ส่ง
        const userVisualMatch = this.patterns.userVisualCircle.exec(message);
        if (userVisualMatch) {
          const [, author, friendId, floorId, fileName, textContent] = userVisualMatch;
          if (this.isValidCircleContent(textContent) && !circles.has(floorId)) {
            circles.set(floorId, {
              id: floorId,
              author: author,
              friendId: friendId,
              type: 'visual',
              imageDescription: `รูปภาพของฉัน: ${fileName}`, // Translated: 我的图片: ${fileName} -> รูปภาพของฉัน
              content: textContent,
              messageIndex: i,
              latestActivityIndex: i,
              replies: [],
              likes: this.getLikeCount(floorId),
              isLiked: this.isLiked(floorId),
            });
            console.log(
              `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบวงเพื่อนรูปภาพผู้ใช้: ${author} (${floorId}) - ${fileName} ที่ดัชนี ${i}`, // Translated: 增量解析到用户图片朋友圈
            );
          }
        }

        // รีเซ็ต Regular Expression
        this.patterns.userVisualCircle.lastIndex = 0;
      }

      // ประมวลผลการตอบกลับทั้งหมด (รวมถึงการตอบกลับใหม่ต่อวงเพื่อนที่มีอยู่แล้ว)
      this.patterns.circleReply.lastIndex = 0;
      let replyMatch;
      while ((replyMatch = this.patterns.circleReply.exec(fullChatContent)) !== null) {
        const [, replyAuthor, replyFriendId, floorId, replyContent] = replyMatch;

        // ค้นหาตำแหน่งของการตอบกลับในข้อความ
        const replyMessageIndex = this.findMessageIndex(messages, replyMatch[0], 0);

        // ประมวลผลเฉพาะการตอบกลับในข้อความที่เพิ่มใหม่
        if (replyMessageIndex >= lastProcessedIndex) {
          // ตรวจสอบว่าเป็นการตอบกลับต่อวงเพื่อนใหม่หรือไม่
          if (circles.has(floorId)) {
            const circle = circles.get(floorId);
            const existingReply = circle.replies.find(r => r.author === replyAuthor && r.content === replyContent);

            if (!existingReply) {
              circle.replies.push({
                id: `reply_${replyMessageIndex}_${Math.random().toString(36).substring(2, 11)}`,
                author: replyAuthor,
                friendId: replyFriendId,
                content: replyContent,
                messageIndex: replyMessageIndex,
                likes: 0,
                isLiked: false,
              });

              circle.latestActivityIndex = Math.max(circle.latestActivityIndex, replyMessageIndex);
              console.log(
                `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบการตอบกลับใหม่: ${replyAuthor} -> ${floorId} ที่ดัชนี ${replyMessageIndex}`, // Translated: 增量解析到新回复
              );
            }
          } else {
            // นี่คือการตอบกลับใหม่ต่อวงเพื่อนที่มีอยู่แล้ว, ต้องจัดการเป็นพิเศษ
            // สร้างรายการอัปเดตพิเศษ
            const updateKey = `update_${floorId}`;
            if (!circles.has(updateKey)) {
              circles.set(updateKey, {
                id: floorId,
                isUpdate: true, // ทำเครื่องหมายว่าเป็นรายการอัปเดต
                newReplies: [],
                latestActivityIndex: replyMessageIndex,
              });
            }

            const updateEntry = circles.get(updateKey);
            updateEntry.newReplies.push({
              id: `reply_${replyMessageIndex}_${Math.random().toString(36).substring(2, 11)}`,
              author: replyAuthor,
              friendId: replyFriendId,
              content: replyContent,
              messageIndex: replyMessageIndex,
              likes: 0,
              isLiked: false,
            });

            updateEntry.latestActivityIndex = Math.max(updateEntry.latestActivityIndex, replyMessageIndex);
            console.log(
              `[Friends Circle] แยกวิเคราะห์แบบเพิ่มหน่วยพบการตอบกลับใหม่ต่อวงเพื่อนที่มีอยู่แล้ว: ${replyAuthor} -> ${floorId} ที่ดัชนี ${replyMessageIndex}`, // Translated: 增量解析到对已存在朋友圈的新回复
            );
          }
        }
      }

      console.log(
        `[Friends Circle] การแยกวิเคราะห์แบบเพิ่มหน่วยเสร็จสมบูรณ์, พบ ${circles.size} รายการที่เพิ่ม/อัปเดต`,
      ); // Translated: 增量解析完成，发现 ${circles.size} 个新增/更新项
      return circles;
    }

    /**
     * ทดสอบการแยกวิเคราะห์วงเพื่อนแบบภาพ
     * @param {string} testContent - เนื้อหาทดสอบ
     */
    testVisualCircleParsing(testContent) {
      console.log('[Friends Circle] กำลังทดสอบการแยกวิเคราะห์วงเพื่อน...'); // Translated: 测试朋友圈解析
      console.log('เนื้อหาทดสอบ:', testContent); // Translated: 测试内容

      // ทดสอบวงเพื่อนแบบข้อความ
      this.patterns.textCircle.lastIndex = 0;
      let match;
      while ((match = this.patterns.textCircle.exec(testContent)) !== null) {
        const [, author, friendId, floorId, content] = match;
        console.log('การจับคู่วงเพื่อนแบบข้อความ:', { author, friendId, floorId, content }); // Translated: 文字朋友圈匹配
      }

      // ทดสอบวงเพื่อนแบบภาพ (มีข้อความ)
      this.patterns.visualCircle.lastIndex = 0;
      while ((match = this.patterns.visualCircle.exec(testContent)) !== null) {
        const [, author, friendId, floorId, imageDescription, textContent] = match;
        console.log('การจับคู่วงเพื่อนแบบภาพ:', { author, friendId, floorId, imageDescription, textContent }); // Translated: 视觉朋友圈匹配
      }

      // ทดสอบวงเพื่อนแบบภาพ (ไม่มีข้อความ)
      this.patterns.visualCircleNoText.lastIndex = 0;
      while ((match = this.patterns.visualCircleNoText.exec(testContent)) !== null) {
        const [, author, friendId, floorId, imageDescription] = match;
        console.log('การจับคู่วงเพื่อนแบบภาพ (ไม่มีข้อความ):', { author, friendId, floorId, imageDescription }); // Translated: 视觉朋友圈(无文字)匹配
      }

      // ทดสอบการตอบกลับ
      this.patterns.circleReply.lastIndex = 0;
      while ((match = this.patterns.circleReply.exec(testContent)) !== null) {
        const [, replyAuthor, replyFriendId, floorId, replyContent] = match;
        console.log('การจับคู่การตอบกลับวงเพื่อน:', { replyAuthor, replyFriendId, floorId, replyContent }); // Translated: 朋友圈回复匹配
      }
    }

    /**
     * รับรายการวงเพื่อนที่จัดเรียงแล้ว
     * @returns {Array} อาร์เรย์วงเพื่อนที่จัดเรียงตามตำแหน่งกิจกรรมล่าสุดจากมากไปน้อย
     */
    getSortedFriendsCircles() {
      const circles = Array.from(this.friendsCircleData.values());

      // คำนวณตำแหน่งกิจกรรมล่าสุดของวงเพื่อนแต่ละรายการ (รวมถึงตำแหน่งตอบกลับ)
      const circlesWithActivity = circles.map(circle => {
        let latestActivityIndex = circle.latestActivityIndex || circle.messageIndex || 0;

        // ตรวจสอบตำแหน่งการตอบกลับทั้งหมด, ค้นหาตำแหน่งล่าสุด
        if (circle.replies && circle.replies.length > 0) {
          circle.replies.forEach(reply => {
            if (reply.messageIndex && reply.messageIndex > latestActivityIndex) {
              latestActivityIndex = reply.messageIndex;
            }
          });
        }

        return {
          ...circle,
          latestActivityIndex: latestActivityIndex,
        };
      });

      // จัดเรียงตามตำแหน่งกิจกรรมล่าสุดจากมากไปน้อย (ตำแหน่งยิ่งมากยิ่งใหม่, ยิ่งอยู่ข้างหน้า)
      return circlesWithActivity.sort((a, b) => b.latestActivityIndex - a.latestActivityIndex);
    }

    /**
     * สลับสถานะการกดถูกใจ
     * @param {string} circleId - ID วงเพื่อน
     * @returns {Object} ข้อมูลการกดถูกใจ
     */
    toggleLike(circleId) {
      const currentLikes = this.getLikeCount(circleId);
      const isCurrentlyLiked = this.isLiked(circleId);

      if (isCurrentlyLiked) {
        this.likesData.set(circleId, { likes: currentLikes - 1, isLiked: false });
      } else {
        this.likesData.set(circleId, { likes: currentLikes + 1, isLiked: true });
      }

      // อัปเดตข้อมูลการกดถูกใจในข้อมูลวงเพื่อน
      if (this.friendsCircleData.has(circleId)) {
        const circle = this.friendsCircleData.get(circleId);
        const likeData = this.likesData.get(circleId);
        circle.likes = likeData.likes;
        circle.isLiked = likeData.isLiked;
      }

      return this.likesData.get(circleId);
    }

    /**
     * รับจำนวนการกดถูกใจ
     * @param {string} circleId - ID วงเพื่อน
     * @returns {number} จำนวนการกดถูกใจ
     */
    getLikeCount(circleId) {
      if (this.likesData.has(circleId)) {
        return this.likesData.get(circleId).likes;
      }
      // เริ่มต้นด้วยจำนวนการกดถูกใจแบบสุ่ม
      const initialLikes = Math.floor(Math.random() * 20) + 5;
      this.likesData.set(circleId, { likes: initialLikes, isLiked: false });
      return initialLikes;
    }

    /**
     * ตรวจสอบว่าได้กดถูกใจแล้วหรือไม่
     * @param {string} circleId - ID วงเพื่อน
     * @returns {boolean} ได้กดถูกใจแล้วหรือไม่
     */
    isLiked(circleId) {
      return this.likesData.get(circleId)?.isLiked || false;
    }

    /**
     * อัปเดตข้อมูลวงเพื่อน (รองรับการอัปเดตแบบเพิ่มหน่วย)
     * @param {Map} newCircles - ข้อมูลวงเพื่อนใหม่
     * @param {boolean} isIncremental - เป็นการอัปเดตแบบเพิ่มหน่วยหรือไม่
     */
    updateFriendsCircleData(newCircles, isIncremental = false) {
      if (isIncremental) {
        // อัปเดตแบบเพิ่มหน่วย: รวมข้อมูลใหม่เข้ากับข้อมูลที่มีอยู่
        let addedCount = 0;
        let updatedCount = 0;

        for (const [key, newData] of newCircles) {
          if (newData.isUpdate) {
            // นี่คือรายการอัปเดต, จัดการการตอบกลับต่อวงเพื่อนที่มีอยู่แล้ว
            const circleId = newData.id;
            if (this.friendsCircleData.has(circleId)) {
              const existingCircle = this.friendsCircleData.get(circleId);
              const existingReplies = existingCircle.replies || [];

              // เพิ่มการตอบกลับใหม่ (การล้างข้อมูลซ้ำ)
              for (const newReply of newData.newReplies) {
                const exists = existingReplies.some(
                  r => r.author === newReply.author && r.content === newReply.content,
                );
                if (!exists) {
                  existingReplies.push(newReply);
                }
              }

              // อัปเดตตำแหน่งกิจกรรมล่าสุด
              existingCircle.replies = existingReplies;
              existingCircle.latestActivityIndex = Math.max(
                existingCircle.latestActivityIndex || existingCircle.messageIndex,
                newData.latestActivityIndex,
              );

              updatedCount++;
              console.log(
                `[Friends Circle] อัปเดตการตอบกลับของวงเพื่อนที่มีอยู่ ${circleId}, เพิ่มการตอบกลับใหม่ ${newData.newReplies.length} รายการ`, // Translated: 更新已存在朋友圈 ${circleId} 的回复，新增 ${newData.newReplies.length} 条回复
              );
            }
          } else {
            // นี่คือวงเพื่อนใหม่หรือการตอบกลับต่อวงเพื่อนใหม่
            const circleId = newData.id;
            if (this.friendsCircleData.has(circleId)) {
              // วงเพื่อนที่มีอยู่แล้ว, รวมการตอบกลับ
              const existingCircle = this.friendsCircleData.get(circleId);
              const existingReplies = existingCircle.replies || [];
              const newReplies = newData.replies || [];

              for (const newReply of newReplies) {
                const exists = existingReplies.some(
                  r => r.author === newReply.author && r.content === newReply.content,
                );
                if (!exists) {
                  existingReplies.push(newReply);
                }
              }

              // อัปเดตตำแหน่งกิจกรรมล่าสุด
              existingCircle.replies = existingReplies;
              existingCircle.latestActivityIndex = Math.max(
                existingCircle.latestActivityIndex || existingCircle.messageIndex,
                newData.latestActivityIndex || newData.messageIndex,
              );

              updatedCount++;
            } else {
              // วงเพื่อนใหม่, เพิ่มโดยตรง
              this.friendsCircleData.set(circleId, newData);
              addedCount++;
            }
          }
        }

        console.log(
          `[Friends Circle] การอัปเดตแบบเพิ่มหน่วยเสร็จสมบูรณ์: เพิ่ม ${addedCount} รายการ, อัปเดต ${updatedCount} รายการ, รวมทั้งหมด ${this.friendsCircleData.size} รายการ`, // Translated: 增量更新完成：新增 ${addedCount} 条，更新 ${updatedCount} 条，总计 ${this.friendsCircleData.size} 条
        );
      } else {
        // การอัปเดตแบบเต็ม: แทนที่โดยตรง
        this.friendsCircleData = newCircles;
        console.log(`[Friends Circle] การอัปเดตแบบเต็มเสร็จสมบูรณ์, รวม ${newCircles.size} รายการ`); // Translated: 全量更新完成，共 ${newCircles.size} 条
      }
    }

    /**
     * รีเฟรชข้อมูลวงเพื่อน (ใช้สำหรับการเรียกจากตัวฟังเหตุการณ์)
     * @param {boolean} forceFullRefresh - บังคับให้รีเฟรชแบบเต็มหรือไม่
     */
    async refreshData(forceFullRefresh = false) {
      try {
        // รับเนื้อหาการแชท
        const chatContent = await this.getChatContent();

        if (!chatContent) {
          console.log('[Friends Circle] ไม่มีเนื้อหาการแชท, ข้ามการรีเฟรช'); // Translated: 没有聊天内容，跳过刷新
          return;
        }

        const messages = chatContent.split('\n');
        const currentMessageCount = messages.length;

        // ตัดสินใจว่าจะใช้การอัปเดตแบบเพิ่มหน่วยหรือไม่
        const shouldUseIncremental =
          !forceFullRefresh &&
          this.lastProcessedMessageIndex >= 0 &&
          currentMessageCount > this.lastProcessedMessageIndex &&
          this.friendsCircleData.size > 0; // ตรวจสอบให้แน่ใจว่ามีข้อมูลประวัติ

        if (shouldUseIncremental) {
          // การอัปเดตแบบเพิ่มหน่วย: แยกวิเคราะห์เฉพาะข้อความที่เพิ่มใหม่
          console.log(
            `[Friends Circle] ดำเนินการอัปเดตแบบเพิ่มหน่วย: จากดัชนีข้อความ ${this.lastProcessedMessageIndex} ถึง ${currentMessageCount}`, // Translated: 执行增量更新：从消息索引 ${this.lastProcessedMessageIndex} 到 ${currentMessageCount}
          );

          // ใช้วิธีการแยกวิเคราะห์แบบเพิ่มหน่วยใหม่
          const newCircles = this.parseIncrementalData(chatContent, this.lastProcessedMessageIndex);

          // อัปเดตข้อมูลแบบเพิ่มหน่วย
          if (newCircles.size > 0) {
            this.updateFriendsCircleData(newCircles, true);
            console.log(
              `[Friends Circle] การอัปเดตแบบเพิ่มหน่วยสำเร็จ, ประมวลผล ${newCircles.size} รายการที่เพิ่ม/อัปเดต`,
            ); // Translated: 增量更新成功，处理了 ${newCircles.size} 个新增/更新项
          } else {
            console.log('[Friends Circle] การอัปเดตแบบเพิ่มหน่วย: ไม่พบข้อมูลวงเพื่อนใหม่'); // Translated: 增量更新：没有发现新的朋友圈数据
          }
        } else {
          // การอัปเดตแบบเต็ม: แยกวิเคราะห์ข้อความทั้งหมด
          console.log('[Friends Circle] ดำเนินการอัปเดตแบบเต็ม'); // Translated: 执行全量更新

          // แยกวิเคราะห์ข้อมูลวงเพื่อนทั้งหมด
          const newCircles = this.parseFriendsCircleData(chatContent, 0);

          // อัปเดตข้อมูลแบบเต็ม
          this.updateFriendsCircleData(newCircles, false);
        }

        // อัปเดตดัชนีข้อความที่ประมวลผลแล้ว
        this.lastProcessedMessageIndex = currentMessageCount;

        console.log('[Friends Circle] การรีเฟรชข้อมูลเสร็จสมบูรณ์'); // Translated: 数据刷新完成
      } catch (error) {
        console.error('[Friends Circle] การรีเฟรชข้อมูลล้มเหลว:', error); // Translated: 刷新数据失败
      }
    }

    /**
     * รับเนื้อหาการแชท (ใช้สำหรับการรีเฟรชข้อมูล)
     */
    async getChatContent() {
      try {
        // วิธีที่ 1: ใช้ SillyTavern.getContext
        if (window.SillyTavern?.getContext) {
          const context = window.SillyTavern.getContext();
          if (context?.chat && Array.isArray(context.chat)) {
            return context.chat.map(msg => msg.mes || '').join('\n');
          }
        }

        // วิธีที่ 2: ใช้ chat ของ window แม่
        if (window.parent?.chat && Array.isArray(window.parent.chat)) {
          return window.parent.chat.map(msg => msg.mes || '').join('\n');
        }

        // วิธีที่ 3: ใช้ contextMonitor
        if (window.contextMonitor?.getCurrentChatMessages) {
          const chatData = await window.contextMonitor.getCurrentChatMessages();
          if (chatData?.messages) {
            return chatData.messages.map(msg => msg.mes || '').join('\n');
          }
        }

        return '';
      } catch (error) {
        console.error('[Friends Circle] รับเนื้อหาการแชทล้มเหลว:', error); // Translated: 获取聊天内容失败
        return '';
      }
    }
  }

  /**
   * ตัวฟังเหตุการณ์วงเพื่อน
   * ใช้กลไกการตรวจจับอัจฉริยะของ live-app ซ้ำ
   */
  class FriendsCircleEventListener {
    constructor(friendsCircle) {
      this.friendsCircle = friendsCircle;
      this.isListening = false;
      this.lastMessageCount = 0;
      this.pollingInterval = null;
      this.messageReceivedHandler = this.onMessageReceived.bind(this);
    }

    /**
     * เริ่มฟังเหตุการณ์ SillyTavern
     */
    startListening() {
      if (this.isListening) {
        console.log('[Friends Circle] ตัวฟังกำลังทำงานอยู่แล้ว'); // Translated: 监听器已经在运行中
        return;
      }

      console.log('[Friends Circle] เริ่มตั้งค่าตัวฟังเหตุการณ์...'); // Translated: 开始设置事件监听
      let eventListenerSet = false;

      try {
        // วิธีที่ 1: ให้ความสำคัญกับการใช้ SillyTavern.getContext().eventSource (แนะนำสำหรับสภาพแวดล้อม iframe)
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.eventSource && typeof context.eventSource.on === 'function' && context.event_types) {
            console.log('[Friends Circle] ใช้ SillyTavern.getContext().eventSource ฟังเหตุการณ์ MESSAGE_RECEIVED'); // Translated: 使用SillyTavern.getContext().eventSource监听MESSAGE_RECEIVED事件
            context.eventSource.on(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
            this.isListening = true;
            eventListenerSet = true;
            console.log('[Friends Circle] ✅ เริ่มฟังเหตุการณ์ข้อความ SillyTavern สำเร็จ (context.eventSource)'); // Translated: 成功开始监听SillyTavern消息事件
            this.updateMessageCount();
            return;
          }
        }

        // วิธีที่ 2: ลองใช้ฟังก์ชัน eventOn ทั่วโลก (หากใช้งานได้)
        if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
          console.log('[Friends Circle] ใช้ eventOn ทั่วโลกฟังเหตุการณ์ MESSAGE_RECEIVED'); // Translated: 使用全局eventOn监听MESSAGE_RECEIVED事件
          eventOn(tavern_events.MESSAGE_RECEIVED, this.messageReceivedHandler);
          this.isListening = true;
          eventListenerSet = true;
          console.log('[Friends Circle] ✅ เริ่มฟังเหตุการณ์ข้อความ SillyTavern สำเร็จ (eventOn)'); // Translated: 成功开始监听SillyTavern消息事件
          this.updateMessageCount();
          return;
        }

        // วิธีที่ 3: ลองใช้ระบบเหตุการณ์ของ window แม่
        if (typeof window.parent !== 'undefined' && window.parent !== window) {
          try {
            const parentEventSource = window.parent.eventSource;
            const parentEventTypes = window.parent.event_types;
            if (parentEventSource && parentEventTypes && parentEventTypes.MESSAGE_RECEIVED) {
              console.log('[Friends Circle] ใช้ระบบเหตุการณ์ของ window แม่ฟังเหตุการณ์ MESSAGE_RECEIVED'); // Translated: 使用父窗口事件系统监听MESSAGE_RECEIVED事件
              parentEventSource.on(parentEventTypes.MESSAGE_RECEIVED, this.messageReceivedHandler);
              this.isListening = true;
              eventListenerSet = true;
              console.log('[Friends Circle] ✅ เริ่มฟังเหตุการณ์ข้อความ SillyTavern สำเร็จ (parent)'); // Translated: 成功开始监听SillyTavern消息事件
              this.updateMessageCount();
              return;
            }
          } catch (parentError) {
            console.warn('[Friends Circle] ไม่สามารถเข้าถึงระบบเหตุการณ์ของ window แม่:', parentError); // Translated: 无法访问父窗口事件系统
          }
        }

        // วิธีที่ 4: ลองใช้ window.eventSource
        if (typeof window.eventSource !== 'undefined' && typeof window.event_types !== 'undefined') {
          try {
            if (window.eventSource.on && window.event_types.MESSAGE_RECEIVED) {
              console.log('[Friends Circle] ใช้ window.eventSource ฟังเหตุการณ์ MESSAGE_RECEIVED'); // Translated: 使用window.eventSource监听MESSAGE_RECEIVED事件
              window.eventSource.on(window.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
              this.isListening = true;
              eventListenerSet = true;
              console.log('[Friends Circle] ✅ เริ่มฟังเหตุการณ์ข้อความ SillyTavern สำเร็จ (window.eventSource)'); // Translated: 成功开始监听SillyTavern消息事件
              this.updateMessageCount();
              return;
            }
          } catch (windowError) {
            console.warn('[Friends Circle] ไม่สามารถใช้ window.eventSource ได้:', windowError); // Translated: 无法使用window.eventSource
          }
        }
      } catch (error) {
        console.error('[Friends Circle] เกิดข้อผิดพลาดขณะตั้งค่าตัวฟังเหตุการณ์:', error); // Translated: 设置事件监听时发生错误
      }

      // หากวิธีการฟังเหตุการณ์ทั้งหมดล้มเหลว ให้ใช้แผนสำรองแบบ Polling
      if (!eventListenerSet) {
        console.warn('[Friends Circle] ไม่พบระบบเหตุการณ์ SillyTavern, ใช้แผนสำรองแบบ Polling'); // Translated: 无法找到SillyTavern事件系统，使用轮询备用方案
        this.startPolling();
      }
    }

    /**
     * จัดการเหตุการณ์การรับข้อความ
     * @param {number} messageId - ID ข้อความ
     */
    async onMessageReceived(messageId) {
      try {
        console.log(`[Friends Circle] ได้รับเหตุการณ์ MESSAGE_RECEIVED: ${messageId}`); // Translated: 收到MESSAGE_RECEIVED事件

        // รับจำนวนข้อความปัจจุบัน
        const currentMessageCount = this.getCurrentMessageCount();
        console.log(
          `[Friends Circle] ตรวจสอบจำนวนข้อความ: ปัจจุบัน=${currentMessageCount}, ล่าสุด=${this.lastMessageCount}, messageId=${messageId}`, // Translated: 消息计数检查: 当前=${currentMessageCount}, 上次=${this.lastMessageCount}
        );

        if (currentMessageCount <= this.lastMessageCount) {
          console.log('[Friends Circle] จำนวนข้อความไม่เพิ่มขึ้น, ข้ามการประมวลผล'); // Translated: 消息数量未增加，跳过处理
          console.log('[Friends Circle] ข้อมูลดีบัก: สาเหตุที่เป็นไปได้คือวิธีการนับข้อความส่งคืนค่าที่ไม่ถูกต้อง'); // Translated: 调试信息: 可能的原因是消息计数方法返回了错误的值

          // บังคับตรวจสอบจำนวนข้อความจริง
          if (window.SillyTavern?.getContext) {
            const context = window.SillyTavern.getContext();
            console.log('[Friends Circle] SillyTavern context.chat.length:', context?.chat?.length);
          }

          // แม้ว่าจำนวนข้อความจะดูเหมือนไม่เพิ่มขึ้น ให้ลองรีเฟรชหนึ่งครั้ง (อาจเป็นปัญหาของวิธีการนับ)
          console.log('[Friends Circle] บังคับดำเนินการรีเฟรชข้อมูล...'); // Translated: 强制执行一次数据刷新
          if (this.friendsCircle) {
            await this.friendsCircle.manager.refreshData();

            // หากรีเฟรชแล้วมีข้อมูลใหม่ ให้อัปเดตจำนวนข้อความ
            const newCount = this.getCurrentMessageCount();
            if (newCount > this.lastMessageCount) {
              console.log(
                `[Friends Circle] พบข้อความใหม่หลังการรีเฟรชแบบบังคับ: ${this.lastMessageCount} → ${newCount}`,
              ); // Translated: 强制刷新后发现新消息
              this.lastMessageCount = newCount;
            }
          }
          return;
        }

        console.log(
          `[Friends Circle] ✅ ตรวจพบข้อความใหม่, จำนวนข้อความเพิ่มขึ้นจาก ${this.lastMessageCount} เป็น ${currentMessageCount}`, // Translated: 检测到新消息，消息数量从 ${this.lastMessageCount} 增加到 ${currentMessageCount}
        );
        this.lastMessageCount = currentMessageCount;

        // อัปเดตข้อมูลวงเพื่อน
        if (this.friendsCircle) {
          console.log('[Friends Circle] เริ่มอัปเดตข้อมูลวงเพื่อน...'); // Translated: 开始更新朋友圈数据
          await this.friendsCircle.manager.refreshData();

          // หากหน้าวงเพื่อนอยู่ในสถานะทำงาน ให้รีบอัปเดต UI ทันที
          if (this.friendsCircle.isActive) {
            console.log('[Friends Circle] หน้าวงเพื่อนอยู่ในสถานะทำงาน, อัปเดต UI ทันที'); // Translated: 朋友圈页面处于活跃状态，立即更新界面
            this.friendsCircle.updateDisplay();
          } else {
            console.log(
              '[Friends Circle] หน้าวงเพื่อนไม่ได้เปิดใช้งาน, ข้อมูลได้รับการอัปเดตแล้ว, จะแสดงเนื้อหาใหม่ในการเปิดครั้งถัดไป',
            ); // Translated: 朋友圈页面未激活，数据已更新，下次打开时会显示新内容
          }
        }
      } catch (error) {
        console.error('[Friends Circle] จัดการเหตุการณ์การรับข้อความล้มเหลว:', error); // Translated: 处理消息接收事件失败
      }
    }

    /**
     * รับจำนวนข้อความปัจจุบัน
     * @returns {number} จำนวนข้อความ
     */
    getCurrentMessageCount() {
      try {
        // วิธีที่ 1: ใช้ SillyTavern.getContext().chat
        if (window.SillyTavern?.getContext) {
          const context = window.SillyTavern.getContext();
          if (context?.chat && Array.isArray(context.chat)) {
            return context.chat.length;
          }
        }

        // วิธีที่ 2: ใช้ mobileContextEditor
        if (window.mobileContextEditor?.getCurrentChatData) {
          const chatData = window.mobileContextEditor.getCurrentChatData();
          if (chatData?.messages && Array.isArray(chatData.messages)) {
            return chatData.messages.length;
          }
        }

        // วิธีที่ 3: ใช้ตัวแปร chat ของ window แม่
        if (window.parent?.chat && Array.isArray(window.parent.chat)) {
          return window.parent.chat.length;
        }

        return 0;
      } catch (error) {
        console.warn('[Friends Circle] รับจำนวนข้อความล้มเหลว:', error); // Translated: 获取消息数量失败
        return 0;
      }
    }

    /**
     * อัปเดตจำนวนข้อความ
     */
    updateMessageCount() {
      this.lastMessageCount = this.getCurrentMessageCount();
      console.log(`[Friends Circle] เริ่มต้นจำนวนข้อความ: ${this.lastMessageCount}`); // Translated: 初始化消息计数
    }

    /**
     * เริ่มแผนสำรองแบบ Polling
     */
    startPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }

      this.updateMessageCount();
      this.pollingInterval = setInterval(() => {
        this.checkForNewMessages();
      }, 1000); // เปลี่ยนเป็นตรวจสอบทุก 1 วินาที เพื่อความทันเวลา

      this.isListening = true;
      console.log('[Friends Circle] ✅ เริ่มแผนสำรองแบบ Polling (ตรวจสอบทุก 1 วินาที)'); // Translated: 启动轮询监听方案 (每1秒检查一次)
    }

    /**
     * ตรวจสอบข้อความใหม่
     */
    async checkForNewMessages() {
      try {
        const currentMessageCount = this.getCurrentMessageCount();
        console.log(
          `[Friends Circle Debug] ตรวจสอบข้อความ: ปัจจุบัน=${currentMessageCount}, ล่าสุด=${this.lastMessageCount}`,
        ); // Translated: 检查消息: 当前=${currentMessageCount}, 上次=${this.lastMessageCount}

        if (currentMessageCount > this.lastMessageCount) {
          console.log(`[Friends Circle] Polling ตรวจพบข้อความใหม่: ${this.lastMessageCount} → ${currentMessageCount}`); // Translated: 轮询检测到新消息
          await this.onMessageReceived(currentMessageCount);
        } else {
          console.log(`[Friends Circle Debug] ไม่มีข้อความใหม่`); // Translated: 没有新消息
        }
      } catch (error) {
        console.error('[Friends Circle] Polling ตรวจสอบข้อความล้มเหลว:', error); // Translated: 轮询检查消息失败
      }
    }

    /**
     * กระตุ้นเหตุการณ์ข้อความด้วยตนเอง (สำหรับทดสอบ)
     */
    triggerTestMessage() {
      console.log('[Friends Circle Debug] กระตุ้นเหตุการณ์ข้อความทดสอบด้วยตนเอง...'); // Translated: 手动触发测试消息事件
      const fakeMessageId = Date.now();
      this.onMessageReceived(fakeMessageId);
    }

    /**
     * หยุดฟัง
     */
    stopListening() {
      if (!this.isListening) return;

      try {
        // ลองลบตัวฟังเหตุการณ์
        if (window.SillyTavern?.getContext) {
          const context = window.SillyTavern.getContext();
          if (context?.eventSource?.off && context.event_types) {
            context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
          }
        }

        // ล้าง Polling
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }

        this.isListening = false;
        console.log('[Friends Circle] หยุดฟังเหตุการณ์แล้ว'); // Translated: 已停止监听事件
      } catch (error) {
        console.error('[Friends Circle] หยุดฟังล้มเหลว:', error); // Translated: 停止监听失败
      }
    }
  }

  /**
   * ตัวแสดงผล UI วงเพื่อน
   * รับผิดชอบในการแสดงผลและการโต้ตอบของอินเทอร์เฟซวงเพื่อน
   */
  class FriendsCircleRenderer {
    constructor(friendsCircle) {
      this.friendsCircle = friendsCircle;
      this.publishModal = null;
    }

    /**
     * แสดงผลหน้าวงเพื่อน
     * @returns {string} HTML ของหน้าวงเพื่อน
     */
    renderFriendsCirclePage() {
      const userInfo = this.renderUserInfo();
      const circlesList = this.renderCirclesList();

      return `
      <div class="friends-circle-page">
        <div class="friends-circle-content">
          ${userInfo}
          <div class="circles-container">
            ${circlesList}
          </div>
        </div>
      </div>
    `;
    }

    /**
     * แสดงผลส่วนข้อมูลผู้ใช้
     * @returns {string} HTML ข้อมูลผู้ใช้
     */
    renderUserInfo() {
      const userName = this.getCurrentUserName();
      const userAvatar = this.getCurrentUserAvatar();
      const userSignature = this.friendsCircle.getUserSignature();

      return `
      <div class="user-info-section">
        <div class="user-cover">
          <div class="user-avatar">
            <img src="${userAvatar}" alt="${userName}" />
          </div>
          <div class="user-details">
            <div class="user-name">${userName}</div>
            <div class="user-signature" onclick="window.friendsCircle?.editUserSignature()">
              <span class="signature-text">${userSignature}</span>
              <i class="fas fa-edit signature-edit-icon"></i>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * 🌟 วิธีที่ B+C: แสดงผลรายการวงเพื่อนเป็นชุด (Lazy Loading)
     * @returns {string} HTML รายการวงเพื่อน
     */
    renderCirclesList() {
      if (!this.friendsCircle.manager) {
        return '<div class="empty-circles"><i class="fas fa-heart"></i><span>ไม่มีวงเพื่อน</span></div>'; // Translated: 暂无朋友圈
      }

      const circles = this.friendsCircle.manager.getSortedFriendsCircles();

      if (circles.length === 0) {
        return '<div class="empty-circles"><i class="fas fa-heart"></i><span>ไม่มีวงเพื่อน</span></div>'; // Translated: 暂无朋友圈
      }

      // 🌟 วิธีที่ B: เรียกใช้การรับข้อมูลพื้นฐานเป็นชุดแบบซิงโครนัส เพื่อหลีกเลี่ยงการเรียกซ้ำ
      try {
        // เรียกใช้การรับข้อมูลเป็นชุดแบบซิงโครนัส, หากแคชหมดอายุจะทำการอัปเดต
        this.friendsCircle.batchGetBasicInfo();
      } catch (error) {
        console.warn('[Friends Circle] รับข้อมูลพื้นฐานเป็นชุดล้มเหลว, ใช้การลดระดับ:', error); // Translated: 批量获取基础信息失败，使用降级处理
      }

      // 🌟 วิธีที่ C: Lazy Loading - แสดงผลเฉพาะ 10 รายการแรกเท่านั้น
      const visibleCircles = circles.slice(0, 10);
      const remainingCount = circles.length - 10;

      let html = visibleCircles.map(circle => this.renderSingleCircle(circle)).join('');

      // หากมีวงเพื่อนเพิ่มเติม ให้เพิ่มปุ่มโหลดเพิ่มเติม
      if (remainingCount > 0) {
        html += `
        <div class="load-more-container" data-remaining="${remainingCount}" style="text-align: center; padding: 20px;">
          <button class="load-more-btn" onclick="window.friendsCircle.loadMoreCircles()"
              style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 14px;">
            <i class="fas fa-chevron-down" style="margin-right: 5px;"></i>
            โหลดเพิ่มเติม (เหลืออีก ${remainingCount} รายการ)
          </button>
        </div>
      `; // Translated: 加载更多 (还有${remainingCount}条)
      }

      return html;
    }

    /**
     * แสดงผลวงเพื่อนเดียว
     * @param {Object} circle - ข้อมูลวงเพื่อน
     * @returns {string} HTML วงเพื่อนเดียว
     */
    renderSingleCircle(circle) {
      // 🌟 วิธีที่ B: ใช้ข้อมูลที่แคชไว้เป็นชุด เพื่อเพิ่มประสิทธิภาพ
      let friendAvatar;
      const cache = this.friendsCircle.batchCache;
      const currentUserName = cache.userName || this.getCurrentUserName();

      if (circle.author === currentUserName || circle.friendId === '483920') {
        // วงเพื่อนของผู้ใช้เอง ใช้รูปประจำตัวผู้ใช้ที่แคชไว้
        friendAvatar = cache.userAvatar || this.getCurrentUserAvatar();
      } else {
        // วงเพื่อนของเพื่อนคนอื่น ใช้รูปประจำตัวเพื่อนที่แคชไว้
        friendAvatar = cache.friendAvatars.get(circle.friendId) || this.getFriendAvatar(circle.friendId);
      }

      const timeStr = this.formatTime(circle.messageIndex || 0);
      const contentHtml = this.renderCircleContent(circle);
      const repliesHtml = this.renderCircleReplies(circle.replies, circle.id);
      const actionsHtml = this.renderCircleActions(circle);

      return `
      <div class="circle-item" data-circle-id="${circle.id}">
        <div class="circle-header">
          <div class="friend-avatar">
            <img src="${friendAvatar}" alt="${circle.author}" />
          </div>
          <div class="friend-info">
            <div class="friend-name">${circle.author}</div>
            <div class="circle-time">${timeStr}</div>
          </div>
        </div>

        <div class="circle-content">
          ${contentHtml}
        </div>

        <div class="circle-actions">
          ${actionsHtml}
        </div>

        ${repliesHtml}

        <div class="reply-input-container" id="reply-input-${circle.id}" style="display: none;">
          <input type="text" class="reply-input" placeholder="เขียนความคิดของคุณ..." />
          <button class="reply-send-btn" onclick="window.friendsCircle?.sendCircleReply('${circle.id}')">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `; // Translated: 写下你的想法...
    }

    /**
     * แสดงผลเนื้อหาวงเพื่อน
     * @param {Object} circle - ข้อมูลวงเพื่อน
     * @returns {string} HTML เนื้อหาวงเพื่อน
     */
    renderCircleContent(circle) {
      if (circle.type === 'visual') {
        // ตรวจสอบว่ามี URL ภาพจริงหรือไม่
        const hasRealImage = circle.imageUrl && circle.imageUrl.trim();

        let imageHtml;
        if (hasRealImage) {
          // แสดงภาพจริง
          imageHtml = `
          <div class="circle-image-container">
            <img src="${circle.imageUrl}"
                alt="${circle.imageDescription || 'รูปภาพวงเพื่อน'}"
                class="circle-image"
                onclick="this.style.transform=this.style.transform?'':'scale(2)'; setTimeout(()=>this.style.transform='', 3000);"
                loading="lazy"
                onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-image\\'></i><span class=\\'image-description\\'>${
                  circle.imageDescription || 'โหลดรูปภาพล้มเหลว'
                }</span></div>'">
          </div>
        `; // Translated: 朋友圈图片, 图片加载失败
        } else {
          // แสดงตัวยึดตำแหน่ง
          imageHtml = `
          <div class="image-placeholder">
            <i class="fas fa-image"></i>
            <span class="image-description">${circle.imageDescription || 'ไม่มีคำอธิบายรูปภาพ'}</span>
          </div>
        `; // Translated: 图片描述缺失
        }

        const visualHtml = `
        <div class="visual-circle-content">
          ${circle.content ? `<div class="text-content">${circle.content}</div>` : ''}
          ${imageHtml}
        </div>
      `;
        return visualHtml;
      } else {
        const textHtml = `<div class="text-circle-content">${circle.content}</div>`;
        return textHtml;
      }
    }

    /**
     * แสดงผลปุ่มการกระทำวงเพื่อน
     * @param {Object} circle - ข้อมูลวงเพื่อน
     * @returns {string} HTML ปุ่มการกระทำ
     */
    renderCircleActions(circle) {
      const likeIcon = circle.isLiked ? 'fas fa-heart liked' : 'far fa-heart';

      return `
      <div class="actions-bar">
        <button class="action-btn like-btn" onclick="window.friendsCircle?.toggleCircleLike('${circle.id}')">
          <i class="${likeIcon}"></i>
          <span class="like-count">${circle.likes}</span>
        </button>
        <button class="action-btn reply-btn" onclick="window.friendsCircle?.toggleReplyInput('${circle.id}')">
          <i class="fas fa-comment"></i>
          <span>ตอบกลับ</span>
        </button>
      </div>
    `; // Translated: 回复
    }

    /**
     * แสดงผลการตอบกลับวงเพื่อน
     * @param {Array} replies - อาร์เรย์การตอบกลับ
     * @param {string} circleId - ID วงเพื่อน
     * @returns {string} HTML การตอบกลับ
     */
    renderCircleReplies(replies, circleId) {
      if (!replies || replies.length === 0) {
        return '';
      }

      const repliesHtml = replies
        .map(reply => {
          // 🔧 แก้ไขปัญหาการแสดงรูปประจำตัวของผู้ใช้ในการตอบกลับ + ใช้แคชแบบกลุ่มเพื่อเพิ่มประสิทธิภาพ
          let replyAvatar;
          const cache = this.friendsCircle.batchCache;
          const currentUserName = cache.userName || this.getCurrentUserName();

          if (reply.author === currentUserName || reply.friendId === '483920') {
            // การตอบกลับของผู้ใช้เอง ใช้รูปประจำตัวผู้ใช้ที่แคชไว้
            replyAvatar = cache.userAvatar || this.getCurrentUserAvatar();
          } else {
            // การตอบกลับของเพื่อนคนอื่น ใช้รูปประจำตัวเพื่อนที่แคชไว้
            replyAvatar = cache.friendAvatars.get(reply.friendId) || this.getFriendAvatar(reply.friendId);
          }

          const timeStr = this.formatTime(reply.messageIndex || 0);

          return `
          <div class="circle-reply" data-reply-id="${reply.id}" data-reply-author="${reply.author}">
            <div class="reply-avatar">
              <img src="${replyAvatar}" alt="${reply.author}" />
            </div>
            <div class="reply-content">
              <div class="reply-header">
                <span class="reply-author">${reply.author}</span>
                <span class="reply-time">${timeStr}</span>
                <button class="reply-to-comment-btn" onclick="window.friendsCircle?.showReplyToComment('${circleId}', '${reply.id}', '${reply.author}')">
                  <i class="fas fa-reply"></i>
                </button>
              </div>
              <div class="reply-text">${reply.content}</div>
            </div>
          </div>
        `;
        })
        .join('');

      return `
      <div class="replies-section">
        <div class="replies-list">
          ${repliesHtml}
        </div>
      </div>
    `;
    }

    /**
     * รับรูปประจำตัวเพื่อน
     * @param {string} friendId - ID เพื่อน
     * @returns {string} URL รูปประจำตัว
     */
    getFriendAvatar(friendId) {
      // ลองรับการกำหนดค่ารูปประจำตัวจาก StyleConfigManager
      if (window.styleConfigManager) {
        try {
          const config = window.styleConfigManager.getConfig();
          if (config && config.messageReceivedAvatars) {
            // ค้นหาการกำหนดค่ารูปประจำตัวเพื่อนที่ตรงกัน
            const avatarConfig = config.messageReceivedAvatars.find(avatar => avatar.friendId === friendId);

            if (avatarConfig) {
              const imageUrl = avatarConfig.backgroundImage || avatarConfig.backgroundImageUrl;
              if (imageUrl) {
                return imageUrl;
              }
            }
          }
        } catch (error) {
          console.warn('[Friends Circle] รับการกำหนดค่ารูปประจำตัวล้มเหลว:', error); // Translated: 获取头像配置失败
        }
      }

      // แผนสำรอง: ใช้รูปประจำตัวเริ่มต้น
      return this.getDefaultAvatar(friendId);
    }

    /**
     * รับรูปประจำตัวเริ่มต้น
     * @param {string} friendId - ID เพื่อน
     * @returns {string} URL รูปประจำตัวเริ่มต้น
     */
    getDefaultAvatar(friendId) {
      // สร้างรูปประจำตัวเริ่มต้นที่มีสีต่างกันตาม ID เพื่อน
      const colors = [
        '#FF6B9D',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E9',
      ];

      const colorIndex = friendId
        ? friendId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
        : 0;
      const color = colors[colorIndex];

      // สร้างรูปประจำตัว SVG
      const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="${color}"/>
        <circle cx="20" cy="16" r="6" fill="white" opacity="0.9"/>
        <path d="M10 32C10 26.4771 14.4771 22 19 22H21C25.5229 22 30 26.4771 30 32V34H10V32Z" fill="white" opacity="0.9"/>
      </svg>
    `;

      return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    /**
     * รับข้อมูลผู้ใช้ปัจจุบัน
     * @returns {string} ชื่อผู้ใช้
     */
    getCurrentUserName() {
      try {
        // วิธีที่ 1: ลองรับชื่อตัวละครผู้ใช้ที่เลือกอยู่ในปัจจุบันจากระบบ persona ของ SillyTavern
        const selectedPersona = this.getSelectedPersonaName();
        if (selectedPersona && selectedPersona !== '{{user}}' && selectedPersona !== 'User') {
          return selectedPersona;
        }

        // วิธีที่ 2: รับจากตัวแปรส่วนกลางของ SillyTavern
        if (typeof window.name1 !== 'undefined' && window.name1 && window.name1.trim() && window.name1 !== '{{user}}') {
          return window.name1.trim();
        }

        // วิธีที่ 3: รับจาก power_user
        if (
          window.power_user &&
          window.power_user.name &&
          window.power_user.name.trim() &&
          window.power_user.name !== '{{user}}'
        ) {
          console.log('[Friends Circle] รับชื่อผู้ใช้จาก power_user:', window.power_user.name); // Translated: 从power_user获取用户名
          return window.power_user.name.trim();
        }

        // วิธีที่ 4: รับจาก SillyTavern getContext
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
          const context = window.SillyTavern.getContext();
          if (context && context.name1 && context.name1.trim() && context.name1 !== '{{user}}') {
            console.log('[Friends Circle] รับชื่อผู้ใช้จาก SillyTavern context:', context.name1); // Translated: 从SillyTavern context获取用户名
            return context.name1.trim();
          }
        }

        // วิธีที่ 5: รับจาก localStorage
        const storedName = localStorage.getItem('name1');
        if (storedName && storedName.trim() && storedName !== '{{user}}') {
          console.log('[Friends Circle] รับชื่อผู้ใช้จาก localStorage:', storedName); // Translated: 从localStorage获取用户名
          return storedName.trim();
        }

        console.log('[Friends Circle] ทุกวิธีไม่สามารถรับชื่อผู้ใช้ที่ถูกต้องได้, ใช้ค่าเริ่มต้น'); // Translated: 所有方法都未能获取到有效用户名，使用默认值
        console.log('[Friends Circle] ข้อมูลดีบัก:'); // Translated: 调试信息
        console.log('- window.name1:', window.name1);
        console.log('- window.power_user:', window.power_user);
        console.log('- localStorage name1:', localStorage.getItem('name1'));
      } catch (error) {
        console.warn('[Friends Circle] รับชื่อผู้ใช้ล้มเหลว:', error); // Translated: 获取用户名失败
      }

      return 'ฉัน'; // 我
    }
    /**
     * รับชื่อ persona ที่เลือกอยู่ในปัจจุบัน
     * @returns {string|null} ชื่อ persona
     */
    getSelectedPersonaName() {
      try {
        console.log('[Friends Circle] กำลังพยายามรับชื่อ persona ที่เลือก...'); // Translated: 尝试获取选中的persona名称...

        // วิธีที่ 1: ค้นหา persona ที่เลือกจาก DOM
        const selectedPersonaElement = document.querySelector('#user_avatar_block .avatar-container.selected .ch_name');
        if (selectedPersonaElement) {
          const personaName = selectedPersonaElement.textContent?.trim();
          if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
            console.log('[Friends Circle] รับชื่อ persona ที่เลือกจาก DOM:', personaName); // Translated: 从DOM获取选中persona名称
            return personaName;
          }
        }

        // วิธีที่ 2: รับ persona ปัจจุบันจากตัวแปรส่วนกลางของ SillyTavern
        if (window.user_avatar && window.user_avatar.name) {
          const personaName = window.user_avatar.name.trim();
          if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
            console.log('[Friends Circle] รับชื่อ persona จาก user_avatar:', personaName); // Translated: 从user_avatar获取persona名称
            return personaName;
          }
        }

        // วิธีที่ 3: รับจากการตั้งค่า persona ของ power_user
        if (window.power_user && window.power_user.persona_description) {
          // ลองแยกชื่อจากคำอธิบาย persona (มักจะอยู่ตรงจุดเริ่มต้น)
          const personaDesc = window.power_user.persona_description;
          const nameMatch = personaDesc.match(/^([^\n\r]+)/);
          if (nameMatch) {
            const personaName = nameMatch[1].trim();
            if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
              console.log('[Friends Circle] รับชื่อจากคำอธิบาย persona:', personaName); // Translated: 从persona描述获取名称
              return personaName;
            }
          }
        }

        // วิธีที่ 4: ลองรับจากตัวแปรส่วนกลางอื่นๆ ที่เป็นไปได้
        const possibleVars = ['persona_name', 'current_persona', 'selected_persona'];
        for (const varName of possibleVars) {
          if (window[varName] && typeof window[varName] === 'string') {
            const personaName = window[varName].trim();
            if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
              console.log(`[Friends Circle] รับชื่อ persona จาก ${varName}:`, personaName); // Translated: 从${varName}获取persona名称
              return personaName;
            }
          }
        }

        // วิธีที่ 5: ลองใช้ DOM Selector อื่นๆ
        const alternativeSelectors = [
          '.avatar-container.selected .character_name_block .ch_name',
          '.avatar-container.selected span.ch_name',
          '#user_avatar_block .selected .ch_name',
          '.persona_management_left_column .selected .ch_name',
        ];

        for (const selector of alternativeSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const personaName = element.textContent?.trim();
            if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
              console.log(`[Friends Circle] รับชื่อ persona จาก DOM Selector ${selector}:`, personaName); // Translated: 从DOM选择器 ${selector} 获取persona名称
              return personaName;
            }
          }
        }

        // วิธีที่ 6: ลองรับจากอาร์เรย์ personas ของ SillyTavern
        if (window.personas && Array.isArray(window.personas)) {
          const selectedPersona = window.personas.find(p => p.selected || p.active);
          if (selectedPersona && selectedPersona.name) {
            const personaName = selectedPersona.name.trim();
            if (personaName && personaName !== '{{user}}' && personaName !== 'User') {
              console.log('[Friends Circle] รับชื่อ persona จากอาร์เรย์ personas:', personaName); // Translated: 从personas数组获取persona名称
              return personaName;
            }
          }
        }

        console.log('[Friends Circle] ไม่สามารถรับชื่อ persona ที่ถูกต้องจากแหล่งใดๆ ได้'); // Translated: 未能从任何来源获取到有效的persona名称
        console.log('[Friends Circle] ข้อมูลดีบัก:'); // Translated: 调试信息
        console.log(
          '- องค์ประกอบ DOM ที่เลือก:',
          document.querySelector('#user_avatar_block .avatar-container.selected'),
        ); // Translated: DOM选中元素
        console.log('- window.user_avatar:', window.user_avatar);
        console.log('- window.personas:', window.personas);
        console.log('- window.power_user.persona_description:', window.power_user?.persona_description);

        return null;
      } catch (error) {
        console.warn('[Friends Circle] รับชื่อ persona ล้มเหลว:', error); // Translated: 获取persona名称失败
        return null;
      }
    }

    /**
     * ฟังก์ชันดีบัก: ทดสอบวิธีการรับชื่อผู้ใช้ที่เป็นไปได้ทั้งหมด
     * เรียกใช้ window.friendsCircle.debugUserNameMethods() ในคอนโซลเบราว์เซอร์เพื่อทดสอบ
     */
    debugUserNameMethods() {
      console.log('=== กำลังดีบักวิธีการรับชื่อผู้ใช้ ==='); // Translated: === 调试用户名获取方法 ===

      // ทดสอบวิธีการ DOM
      console.log('\n1. การทดสอบวิธีการ DOM:'); // Translated: DOM方法测试
      const domSelectors = [
        '#user_avatar_block .avatar-container.selected .ch_name',
        '.avatar-container.selected .character_name_block .ch_name',
        '.avatar-container.selected span.ch_name',
        '#user_avatar_block .selected .ch_name',
        '.persona_management_left_column .selected .ch_name',
      ];

      domSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`  ${selector}:`, element ? element.textContent?.trim() : 'null');
      });

      // ทดสอบตัวแปรส่วนกลาง
      console.log('\n2. การทดสอบตัวแปรส่วนกลาง:'); // Translated: 全局变量测试
      const globalVars = ['name1', 'user_name', 'persona_name', 'current_persona', 'selected_persona', 'user_persona'];

      globalVars.forEach(varName => {
        console.log(`  window.${varName}:`, window[varName]);
      });

      // ทดสอบคุณสมบัติของอ็อบเจกต์
      console.log('\n3. การทดสอบคุณสมบัติของอ็อบเจกต์:'); // Translated: 对象属性测试
      console.log('  window.power_user:', window.power_user);
      console.log('  window.user_avatar:', window.user_avatar);
      console.log('  window.personas:', window.personas);

      // ทดสอบ SillyTavern context
      console.log('\n4. การทดสอบ SillyTavern Context:'); // Translated: SillyTavern Context测试
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        console.log('  SillyTavern context:', context);
        console.log('  context.name1:', context?.name1);
      } else {
        console.log('  SillyTavern.getContext ไม่พร้อมใช้งาน'); // Translated: SillyTavern.getContext 不可用
      }

      // ทดสอบ localStorage
      console.log('\n5. การทดสอบ LocalStorage:'); // Translated: LocalStorage测试
      console.log('  localStorage.name1:', localStorage.getItem('name1'));
      console.log('  localStorage.persona_name:', localStorage.getItem('persona_name'));

      console.log('\n=== การดีบักเสร็จสมบูรณ์ ==='); // Translated: === 调试完成 ===

      // ทดสอบชื่อผู้ใช้ที่ได้รับจริงในปัจจุบัน
      console.log('\n6. ผลลัพธ์การรับในปัจจุบัน:'); // Translated: 当前获取结果
      console.log('  getCurrentUserName():', this.getCurrentUserName());
      console.log('  getSelectedPersonaName():', this.getSelectedPersonaName());
    }

    /**
     * รับรูปประจำตัวผู้ใช้ปัจจุบัน
     * @returns {string} URL รูปประจำตัวผู้ใช้
     */
    getCurrentUserAvatar() {
      // ลองรับการกำหนดค่ารูปประจำตัวผู้ใช้จาก StyleConfigManager
      if (window.styleConfigManager) {
        try {
          const config = window.styleConfigManager.getConfig();
          if (config && config.messageSentAvatar) {
            const imageUrl = config.messageSentAvatar.backgroundImage || config.messageSentAvatar.backgroundImageUrl;
            if (imageUrl) {
              return imageUrl;
            }
          }
        } catch (error) {
          console.warn('[Friends Circle] รับการกำหนดค่ารูปประจำตัวผู้ใช้ล้มเหลว:', error); // Translated: 获取用户头像配置失败
        }
      }

      // แผนสำรอง: ใช้รูปประจำตัวผู้ใช้เริ่มต้น
      const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#74B9FF"/>
        <circle cx="20" cy="16" r="6" fill="white" opacity="0.9"/>
        <path d="M10 32C10 26.4771 14.4771 22 19 22H21C25.5229 22 30 26.4771 30 32V34H10V32Z" fill="white" opacity="0.9"/>
      </svg>
    `;

      return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    /**
     * จัดรูปแบบเวลา (แสดงเวลาสัมพัทธ์ตามตำแหน่งข้อความ)
     * @param {number} messageIndex - ดัชนีตำแหน่งข้อความ
     * @param {number} totalMessages - จำนวนข้อความทั้งหมด
     * @returns {string} เวลาที่จัดรูปแบบแล้ว
     */
    formatTime(messageIndex, totalMessages = null) {
      // หากส่งรูปแบบ timestamp เก่ามา ลองจัดการความเข้ากันได้
      if (messageIndex > 1000000000000) {
        // นี่คือ timestamp ใช้ตรรกะเดิม
        const date = new Date(messageIndex);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
          return 'เมื่อกี้'; // Translated: 刚刚
        } else if (diffMins < 60) {
          return `${diffMins} นาทีที่แล้ว`; // Translated: 分钟前
        } else {
          return 'ก่อนหน้านี้'; // Translated: 较早
        }
      }

      // การแสดงเวลาสัมพัทธ์ตามตำแหน่งข้อความ
      if (totalMessages === null) {
        // ลองรับจำนวนข้อความทั้งหมดปัจจุบัน
        totalMessages = this.friendsCircle?.manager?.lastProcessedMessageIndex || 1000;
      }

      const positionFromEnd = totalMessages - messageIndex;

      if (positionFromEnd <= 1) {
        return 'เมื่อกี้'; // Translated: 刚刚
      } else if (positionFromEnd <= 5) {
        return 'เมื่อไม่กี่นาทีที่แล้ว'; // Translated: 几分钟前
      } else if (positionFromEnd <= 20) {
        return 'ครึ่งชั่วโมงที่แล้ว'; // Translated: 半小时前
      } else if (positionFromEnd <= 50) {
        return '1 ชั่วโมงที่แล้ว'; // Translated: 1小时前
      } else if (positionFromEnd <= 100) {
        return 'หลายชั่วโมงที่แล้ว'; // Translated: 几小时前
      } else if (positionFromEnd <= 200) {
        return 'วันนี้'; // Translated: 今天
      } else if (positionFromEnd <= 500) {
        return 'เมื่อวานนี้'; // Translated: 昨天
      } else {
        return 'ก่อนหน้านี้'; // Translated: 较早
      }
    }

    /**
     * แสดงป๊อปอัปเลือกเผยแพร่
     */
    showPublishModal() {
      if (this.publishModal) {
        this.publishModal.remove();
      }

      this.publishModal = document.createElement('div');
      this.publishModal.className = 'friends-circle-publish-modal';
      this.publishModal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>เผยแพร่วงเพื่อน</h3>
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="publish-options">
          <button class="publish-option-btn text-btn">
            <i class="fas fa-font"></i>
            <span>เผยแพร่ข้อความ</span>
          </button>
          <button class="publish-option-btn image-btn">
            <i class="fas fa-image"></i>
            <span>เผยแพร่รูปภาพ</span>
          </button>
        </div>
      </div>
    `; // Translated: 发布朋友圈, 发文字, 发图片

      // ค้นหาองค์ประกอบ
      const overlay = this.publishModal.querySelector('.modal-overlay');
      const closeBtn = this.publishModal.querySelector('.modal-close');
      const textBtn = this.publishModal.querySelector('.text-btn');
      const imageBtn = this.publishModal.querySelector('.image-btn');

      console.log('[Friends Circle Debug] ผลลัพธ์การค้นหาองค์ประกอบ:', {
        // Translated: 元素查找结果
        overlay: !!overlay,
        closeBtn: !!closeBtn,
        textBtn: !!textBtn,
        imageBtn: !!imageBtn,
      });

      // ผูกเหตุการณ์
      if (overlay) {
        overlay.addEventListener('click', () => {
          console.log('[Friends Circle Debug] คลิกที่เลเยอร์ซ้อนทับ'); // Translated: 点击了遮罩层
          this.hidePublishModal();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          console.log('[Friends Circle Debug] คลิกที่ปุ่มปิด'); // Translated: 点击了关闭按钮
          this.hidePublishModal();
        });
      }

      if (textBtn) {
        textBtn.addEventListener('click', () => {
          console.log('[Friends Circle Debug] คลิกที่ปุ่มเผยแพร่ข้อความ'); // Translated: 点击了发文字按钮
          this.showTextPublishModal();
        });
      }

      if (imageBtn) {
        imageBtn.addEventListener('click', () => {
          console.log('[Friends Circle Debug] คลิกที่ปุ่มเผยแพร่รูปภาพ'); // Translated: 点击了发图片按钮
          this.showImagePublishModal();
        });
      }

      // ใช้คอนเทนเนอร์โทรศัพท์มือถือในการวางตำแหน่ง
      const mobileContainer = document.querySelector('.mobile-phone-container');
      console.log('[Friends Circle Debug] ผลลัพธ์การค้นหาคอนเทนเนอร์โทรศัพท์มือถือ:', !!mobileContainer); // Translated: 手机容器查找结果

      if (mobileContainer) {
        mobileContainer.appendChild(this.publishModal);
        console.log('[Friends Circle Debug] ป๊อปอัปถูกเพิ่มไปยังคอนเทนเนอร์โทรศัพท์มือถือแล้ว'); // Translated: 弹窗已添加到手机容器
      } else {
        document.body.appendChild(this.publishModal);
        console.log('[Friends Circle Debug] ป๊อปอัปถูกเพิ่มไปยัง body แล้ว'); // Translated: 弹窗已添加到body
      }

      // ตรวจสอบว่าป๊อปอัปมองเห็นได้หรือไม่
      setTimeout(() => {
        if (!this.publishModal) {
          console.log('[Friends Circle Debug] ป๊อปอัปถูกลบออกแล้ว, ข้ามการดีบัก'); // Translated: 弹窗已被移除，跳过调试
          return;
        }

        const modalRect = this.publishModal.getBoundingClientRect();
        const modalStyle = window.getComputedStyle(this.publishModal);
        console.log('[Friends Circle Debug] ตำแหน่งและขนาดป๊อปอัป:', modalRect); // Translated: 弹窗位置和大小
        console.log('[Friends Circle Debug] สไตล์สำคัญของป๊อปอัป:', {
          // Translated: 弹窗关键样式
          display: modalStyle.display,
          position: modalStyle.position,
          zIndex: modalStyle.zIndex,
          visibility: modalStyle.visibility,
          opacity: modalStyle.opacity,
          pointerEvents: modalStyle.pointerEvents,
        });

        // ตรวจสอบองค์ประกอบภายในป๊อปอัป
        const overlay = this.publishModal.querySelector('.modal-overlay');
        const content = this.publishModal.querySelector('.modal-content');
        const buttons = this.publishModal.querySelectorAll('button');

        console.log('[Friends Circle Debug] องค์ประกอบภายในป๊อปอัป:', {
          // Translated: 弹窗内部元素
          overlay: !!overlay,
          overlayRect: overlay?.getBoundingClientRect(),
          content: !!content,
          contentRect: content?.getBoundingClientRect(),
          buttonsCount: buttons.length,
        });

        // ทดสอบเหตุการณ์คลิก
        buttons.forEach((btn, index) => {
          console.log(`[Friends Circle Debug] ปุ่ม ${index}:`, {
            // Translated: 按钮
            className: btn.className,
            rect: btn.getBoundingClientRect(),
            style: {
              pointerEvents: window.getComputedStyle(btn).pointerEvents,
              zIndex: window.getComputedStyle(btn).zIndex,
            },
          });
        });
      }, 100);

      console.log('[Friends Circle Debug] แสดงป๊อปอัปเผยแพร่เสร็จสมบูรณ์'); // Translated: 发布弹窗显示完成
    }

    /**
     * ซ่อนป๊อปอัปเผยแพร่
     */
    hidePublishModal() {
      if (this.publishModal) {
        this.publishModal.remove();
        this.publishModal = null;
      }
    }

    /**
     * แสดงป๊อปอัปเผยแพร่ข้อความ
     */
    showTextPublishModal() {
      this.hidePublishModal();

      const modal = document.createElement('div');
      modal.className = 'friends-circle-text-publish-modal';
      modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>เผยแพร่วงเพื่อนแบบข้อความ</h3>
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <textarea class="text-input" placeholder="แชร์เรื่องราวใหม่ๆ..." maxlength="500"></textarea>
          <div class="char-count">0/500</div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn">ยกเลิก</button>
          <button class="send-btn">เผยแพร่</button>
        </div>
      </div>
    `; // Translated: 发布文字朋友圈, 分享新鲜事..., 取消, 发布

      // ผูกเหตุการณ์
      const overlay = modal.querySelector('.modal-overlay');
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = modal.querySelector('.cancel-btn');
      const sendBtn = modal.querySelector('.send-btn');

      const closeModal = () => modal.remove();

      overlay.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      sendBtn.addEventListener('click', () => {
        console.log('[Friends Circle] คลิกที่ปุ่มเผยแพร่ข้อความ'); // Translated: 文字发布按钮被点击
        console.log('[Friends Circle] ตรวจสอบ this context:', {
          // Translated: this上下文检查
          thisExists: !!this,
          thisConstructorName: this?.constructor?.name,
          hasHandleTextPublish: typeof this?.handleTextPublish === 'function',
        });

        if (this && typeof this.handleTextPublish === 'function') {
          this.handleTextPublish(modal);
        } else {
          console.error('[Friends Circle] เมธอด handleTextPublish ไม่มีอยู่หรือ this context หายไป'); // Translated: handleTextPublish方法不存在或this上下文丢失
          // แผนสำรอง: จัดการการเผยแพร่ข้อความโดยตรง
          const textInput = modal.querySelector('.text-input');
          if (textInput) {
            const content = textInput.value.trim();
            if (content) {
              // เรียกใช้เมธอดของอินสแตนซ์วงเพื่อนส่วนกลางโดยตรง
              if (window.friendsCircle && typeof window.friendsCircle.sendTextCircle === 'function') {
                window.friendsCircle.sendTextCircle(content);
                modal.remove();
              } else {
                console.error('[Friends Circle] ไม่พบอินสแตนซ์วงเพื่อนส่วนกลาง'); // Translated: 无法找到全局朋友圈实例
              }
            }
          }
        }
      });

      // ใช้คอนเทนเนอร์โทรศัพท์มือถือในการวางตำแหน่ง
      const mobileContainer = document.querySelector('.mobile-phone-container');
      if (mobileContainer) {
        mobileContainer.appendChild(modal);
      } else {
        document.body.appendChild(modal);
      }

      // ผูกการนับจำนวนตัวอักษร
      const textInput = modal.querySelector('.text-input');
      const charCount = modal.querySelector('.char-count');
      if (textInput && charCount) {
        textInput.addEventListener('input', () => {
          const count = textInput.value.length;
          charCount.textContent = `${count}/500`;
          if (count > 450) {
            charCount.style.color = '#ff6b9d';
          } else {
            charCount.style.color = '#999';
          }
        });
        textInput.focus();
      }

      console.log('[Friends Circle] แสดงป๊อปอัปเผยแพร่ข้อความแล้ว, ผูกเหตุการณ์แล้ว'); // Translated: 文字发布弹窗已显示，事件已绑定
    }

    /**
     * แสดงป๊อปอัปเผยแพร่รูปภาพ
     */
    showImagePublishModal() {
      this.hidePublishModal();

      const modal = document.createElement('div');
      modal.className = 'friends-circle-image-publish-modal';
      modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>เผยแพร่วงเพื่อนแบบรูปภาพ</h3>
          <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>คำอธิบายรูปภาพ</label>
            <textarea class="image-desc-input" placeholder="อธิบายเนื้อหารูปภาพ..." maxlength="200"></textarea>
            <div class="char-count">0/200</div>
          </div>
          <div class="form-group">
            <label>คำบรรยายภาพ (จำเป็น!!!)</label>
            <textarea class="text-input" placeholder="พูดอะไรสักอย่าง..." maxlength="300"></textarea>
            <div class="char-count">0/300</div>
          </div>
          <div class="form-group">
            <label>อัปโหลดรูปภาพ</label>
            <div class="attachment-upload-area">
              <div class="file-drop-zone" id="friends-circle-drop-zone">
                <div class="drop-zone-content">
                  <i class="fas fa-image"></i>
                  <div class="upload-text">คลิกเพื่อเลือกรูปภาพหรือลากรูปภาพมาที่นี่</div>
                  <div class="upload-hint">รองรับรูปแบบ jpg, png, gif, webp และอื่นๆ, สูงสุด 10MB</div>
                </div>
                <input type="file" class="hidden-file-input" accept="image/*" id="friends-circle-file-input">
              </div>
              <div class="image-preview-area" id="friends-circle-preview-area" style="display: none;">
                <div class="preview-image-container">
                  <img class="preview-image" alt="รูปภาพตัวอย่าง" id="friends-circle-preview-image">
                  <button class="remove-image-btn" id="friends-circle-remove-image">×</button>
                  <div class="image-info">
                    <span class="image-name" id="friends-circle-image-name"></span>
                    <span class="image-size" id="friends-circle-image-size"></span>
                  </div>
                </div>
              </div>
              <div class="upload-status" id="friends-circle-upload-status" style="display: none;">
                <div class="upload-progress">
                  <div class="progress-bar" id="friends-circle-progress-bar"></div>
                </div>
                <div class="upload-text" id="friends-circle-upload-text">กำลังอัปโหลด...</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" onclick="this.parentElement.parentElement.parentElement.remove()">ยกเลิก</button>
          <button class="send-btn" id="friends-circle-publish-btn">เผยแพร่</button>
        </div>
      </div>
    `; // Translated: 发布图片朋友圈, 图片描述, 描述图片内容..., 配文（必填！！！）, 说点什么..., 上传图片, 点击选择图片或拖拽图片到此处, 支持jpg、png、gif、webp等格式，最大10MB, 预览图片, 取消, 发布, 上传中...

      // ใช้คอนเทนเนอร์โทรศัพท์มือถือในการวางตำแหน่ง
      const mobileContainer = document.querySelector('.mobile-phone-container');
      if (mobileContainer) {
        mobileContainer.appendChild(modal);
      } else {
        document.body.appendChild(modal);
      }

      // ผูกการนับจำนวนตัวอักษรสำหรับคำอธิบายรูปภาพ
      const imageDescInput = modal.querySelector('.image-desc-input');
      const charCounts = modal.querySelectorAll('.char-count');

      if (imageDescInput && charCounts[0]) {
        imageDescInput.addEventListener('input', () => {
          const count = imageDescInput.value.length;
          charCounts[0].textContent = `${count}/200`;
          if (count > 180) {
            charCounts[0].style.color = '#ff6b9d';
          } else {
            charCounts[0].style.color = '#999';
          }
        });
      }

      // ผูกการนับจำนวนตัวอักษรสำหรับคำบรรยายภาพ
      const textInput = modal.querySelector('.text-input');
      if (textInput && charCounts[1]) {
        textInput.addEventListener('input', () => {
          const count = textInput.value.length;
          charCounts[1].textContent = `${count}/300`;
          if (count > 270) {
            charCounts[1].style.color = '#ff6b9d';
          } else {
            charCounts[1].style.color = '#999';
          }
        });
      }

      // ผูกการอัปโหลดรูปภาพ
      this.bindImageUploadEvents(modal);

      if (imageDescInput) {
        imageDescInput.focus();
      }
    }

    /**
     * ผูกเหตุการณ์ที่เกี่ยวข้องกับการอัปโหลดรูปภาพ
     */
    bindImageUploadEvents(modal) {
      const dropZone = modal.querySelector('#friends-circle-drop-zone');
      const fileInput = modal.querySelector('#friends-circle-file-input');
      const previewArea = modal.querySelector('#friends-circle-preview-area');
      const previewImage = modal.querySelector('#friends-circle-preview-image');
      const removeBtn = modal.querySelector('#friends-circle-remove-image');
      const imageName = modal.querySelector('#friends-circle-image-name');
      const imageSize = modal.querySelector('#friends-circle-image-size');
      const uploadStatus = modal.querySelector('#friends-circle-upload-status');
      const publishBtn = modal.querySelector('#friends-circle-publish-btn');

      if (!dropZone || !fileInput) {
        console.warn('[Friends Circle] ไม่พบองค์ประกอบพื้นที่อัปโหลด'); // Translated: 上传区域元素未找到
        return;
      }

      // คลิกพื้นที่อัปโหลดเพื่อเรียกการเลือกไฟล์
      dropZone.addEventListener('click', () => {
        fileInput.click();
      });

      // เหตุการณ์การเลือกไฟล์
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
          this.handleImageFileSelection(file, {
            previewArea,
            previewImage,
            imageName,
            imageSize,
            uploadStatus,
            publishBtn,
            dropZone,
          });
        }
      });

      // เหตุการณ์ลากและวาง
      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const file = files[0];
          this.handleImageFileSelection(file, {
            previewArea,
            previewImage,
            imageName,
            imageSize,
            uploadStatus,
            publishBtn,
            dropZone,
          });
        }
      });

      // เหตุการณ์ลบรูปภาพ
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.clearImageSelection({
            previewArea,
            uploadStatus,
            publishBtn,
            dropZone,
            fileInput,
          });
        });
      }

      // ผูกเหตุการณ์ปุ่มเผยแพร่ - ใช้การอ้างอิงส่วนกลางเพื่อให้แน่ใจว่าเรียกใช้ถูกต้อง
      if (publishBtn) {
        publishBtn.addEventListener('click', () => {
          console.log('[Friends Circle] คลิกที่ปุ่มเผยแพร่'); // Translated: 发布按钮被点击
          console.log('[Friends Circle] ตรวจสอบอินสแตนซ์วงเพื่อนส่วนกลาง:', !!window.friendsCircle); // Translated: 检查全局朋友圈实例
          console.log(
            '[Friends Circle] ตรวจสอบเมธอด handleImagePublish:',
            typeof window.friendsCircle?.handleImagePublish,
          ); // Translated: 检查handleImagePublish方法

          if (window.friendsCircle && typeof window.friendsCircle.handleImagePublish === 'function') {
            window.friendsCircle.handleImagePublish();
          } else {
            console.error('[Friends Circle] ไม่สามารถเรียกใช้เมธอด handleImagePublish ได้'); // Translated: 无法调用handleImagePublish方法
          }
        });
        console.log('[Friends Circle] ผูกเหตุการณ์ปุ่มเผยแพร่แล้ว'); // Translated: 发布按钮事件已绑定
      } else {
        console.warn('[Friends Circle] ไม่พบปุ่มเผยแพร่, ไม่สามารถผูกเหตุการณ์ได้'); // Translated: 发布按钮未找到，无法绑定事件
      }
    }

    /**
     * จัดการการเลือกไฟล์รูปภาพ
     */
    async handleImageFileSelection(file, elements) {
      console.log('[Friends Circle] กำลังจัดการการเลือกไฟล์รูปภาพ:', {
        // Translated: 处理图片文件选择
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        elementsProvided: !!elements,
      });

      // ตรวจสอบให้แน่ใจว่า AttachmentSender พร้อมใช้งาน
      if (!window.attachmentSender) {
        console.error('[Friends Circle] ไม่พบ AttachmentSender'); // Translated: AttachmentSender未找到
        this.showToast('ฟังก์ชันอัปโหลดรูปภาพไม่พร้อมใช้งาน', 'error'); // Translated: 图片上传功能未就绪
        return;
      }

      // ตรวจสอบไฟล์
      console.log('[Friends Circle] เริ่มตรวจสอบไฟล์...'); // Translated: 开始验证文件...
      const validation = window.attachmentSender.validateFile(file);
      console.log('[Friends Circle] ผลการตรวจสอบไฟล์:', validation); // Translated: 文件验证结果

      if (!validation.isValid) {
        console.warn('[Friends Circle] ตรวจสอบไฟล์ล้มเหลว:', validation.errors); // Translated: 文件验证失败
        this.showToast(validation.errors.join(', '), 'error');
        return;
      }

      console.log('[Friends Circle] ตรวจสอบไฟล์สำเร็จ, เริ่มแสดงตัวอย่าง...'); // Translated: 文件验证成功，开始显示预览...

      // แสดงตัวอย่าง
      this.showImagePreview(file, elements);

      // จัดเก็บข้อมูลไฟล์เพื่อใช้อัปโหลดในภายหลัง
      this.selectedImageFile = file;
      this.selectedImageElements = elements;

      console.log('[Friends Circle] ข้อมูลไฟล์ถูกจัดเก็บแล้ว:', {
        // Translated: 文件信息已存储
        selectedImageFile: !!this.selectedImageFile,
        selectedImageFileName: this.selectedImageFile ? this.selectedImageFile.name : 'none',
        thisInstanceId: this.constructor.name,
        globalInstanceExists: !!window.friendsCircle,
        globalInstanceSame: window.friendsCircle === this,
      });

      // จัดเก็บไปยังอินสแตนซ์ส่วนกลางด้วยเพื่อให้แน่ใจว่าข้อมูลไม่สูญหาย
      if (window.friendsCircle && window.friendsCircle !== this) {
        console.warn('[Friends Circle] ตรวจพบอินสแตนซ์ที่แตกต่างกัน, ซิงค์ข้อมูลไฟล์ไปยังอินสแตนซ์ส่วนกลาง'); // Translated: 检测到不同的实例，同步文件信息到全局实例
        window.friendsCircle.selectedImageFile = file;
        window.friendsCircle.selectedImageElements = elements;
      }

      // อัปเดตสถานะปุ่มเผยแพร่
      if (elements.publishBtn) {
        elements.publishBtn.disabled = false;
        elements.publishBtn.textContent = 'เผยแพร่'; // Translated: 发布
        console.log('[Friends Circle] ปุ่มเผยแพร่ถูกเปิดใช้งานแล้ว'); // Translated: 发布按钮已启用
      } else {
        console.warn('[Friends Circle] ไม่พบปุ่มเผยแพร่'); // Translated: 发布按钮未找到
      }

      console.log('[Friends Circle] จัดการการเลือกไฟล์รูปภาพเสร็จสมบูรณ์'); // Translated: 图片文件选择处理完成
    }
    /**
     * แสดงภาพตัวอย่าง
     */
    showImagePreview(file, elements) {
      console.log('[Friends Circle] เริ่มแสดงภาพตัวอย่าง:', file.name); // Translated: 开始显示图片预览

      const { previewArea, previewImage, imageName, imageSize, dropZone } = elements;

      console.log('[Friends Circle] ตรวจสอบองค์ประกอบตัวอย่าง:', {
        // Translated: 预览元素检查
        previewArea: !!previewArea,
        previewImage: !!previewImage,
        imageName: !!imageName,
        imageSize: !!imageSize,
        dropZone: !!dropZone,
      });

      if (!previewArea || !previewImage) {
        console.warn('[Friends Circle] ไม่พบพื้นที่ตัวอย่างหรือองค์ประกอบภาพตัวอย่าง'); // Translated: 预览区域或预览图片元素未找到
        return;
      }

      // สร้าง URL ตัวอย่าง
      const previewUrl = URL.createObjectURL(file);
      console.log('[Friends Circle] สร้าง URL ตัวอย่าง:', previewUrl); // Translated: 创建预览URL

      // ตั้งค่าภาพตัวอย่าง
      previewImage.src = previewUrl;
      previewImage.onload = () => {
        console.log('[Friends Circle] โหลดภาพตัวอย่างเสร็จสมบูรณ์'); // Translated: 预览图片加载完成
        URL.revokeObjectURL(previewUrl); // ปล่อยหน่วยความจำ
      };

      // ตั้งค่าข้อมูลไฟล์
      if (imageName) {
        imageName.textContent = file.name;
        console.log('[Friends Circle] ตั้งค่าชื่อไฟล์:', file.name); // Translated: 设置文件名
      }
      if (imageSize) {
        const sizeText = this.formatFileSize(file.size);
        imageSize.textContent = sizeText;
        console.log('[Friends Circle] ตั้งค่าขนาดไฟล์:', sizeText); // Translated: 设置文件大小
      }

      // แสดงพื้นที่ตัวอย่าง ซ่อนพื้นที่อัปโหลด
      previewArea.style.display = 'block';
      if (dropZone) {
        dropZone.style.display = 'none';
      }

      console.log('[Friends Circle] แสดงภาพตัวอย่างเสร็จสมบูรณ์'); // Translated: 图片预览显示完成
    }

    /**
     * ล้างการเลือกรูปภาพ
     */
    clearImageSelection(elements) {
      const { previewArea, uploadStatus, publishBtn, dropZone, fileInput } = elements;

      // ซ่อนตัวอย่างและสถานะการอัปโหลด
      if (previewArea) previewArea.style.display = 'none';
      if (uploadStatus) uploadStatus.style.display = 'none';

      // แสดงพื้นที่อัปโหลด
      if (dropZone) dropZone.style.display = 'block';

      // ล้างอินพุตไฟล์
      if (fileInput) fileInput.value = '';

      // รีเซ็ตสถานะปุ่ม
      if (publishBtn) {
        publishBtn.disabled = false;
        publishBtn.textContent = 'เผยแพร่'; // Translated: 发布
      }

      // ล้างไฟล์ที่จัดเก็บไว้
      this.selectedImageFile = null;
      this.selectedImageElements = null;
    }

    /**
     * จัดรูปแบบขนาดไฟล์
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }

  /**
   * คลาสหลักของวงเพื่อน
   * รวมฟังก์ชันวงเพื่อนทั้งหมด
   */
  class FriendsCircle {
    constructor() {
      this.manager = new FriendsCircleManager();
      this.eventListener = new FriendsCircleEventListener(this);
      this.renderer = new FriendsCircleRenderer(this);
      this.isActive = false;

      // 🌟 วิธีที่ B: แคชการประมวลผลเป็นชุด
      this.batchCache = {
        userName: null,
        userAvatar: null,
        friendAvatars: new Map(),
        lastCacheTime: 0,
        cacheTimeout: 30000, // 30 วินาที แคชหมดอายุ
      };
      this.userSignature =
        localStorage.getItem('friendsCircle_userSignature') || 'คนนี้ขี้เกียจมาก ไม่ได้ทิ้งอะไรไว้เลย'; // Translated: 这个人很懒，什么都没留下

      // เริ่มต้น AttachmentSender สำหรับการอัปโหลดรูปภาพ
      this.initializeAttachmentSender();

      // จัดเก็บข้อมูลไฟล์รูปภาพที่เลือก
      this.selectedImageFile = null;
      this.selectedImageElements = null;

      console.log('[Friends Circle] เริ่มต้นฟังก์ชันวงเพื่อนเสร็จสมบูรณ์'); // Translated: 朋友圈功能初始化完成
    }

    /**
     * 🌟 วิธีที่ B: รับข้อมูลพื้นฐานเป็นชุด
     * รับชื่อผู้ใช้ รูปประจำตัวผู้ใช้ และรูปประจำตัวเพื่อนทั้งหมดในคราวเดียว เพื่อหลีกเลี่ยงการเรียกซ้ำ
     */
    batchGetBasicInfo() {
      const now = Date.now();

      // ตรวจสอบว่าแคชหมดอายุหรือไม่
      if (this.batchCache.lastCacheTime && now - this.batchCache.lastCacheTime < this.batchCache.cacheTimeout) {
        return this.batchCache;
      }

      try {
        // รับข้อมูลผู้ใช้เป็นชุด
        if (!this.batchCache.userName) {
          this.batchCache.userName = this.renderer.getCurrentUserName();
        }
        if (!this.batchCache.userAvatar) {
          this.batchCache.userAvatar = this.renderer.getCurrentUserAvatar();
        }

        // รับรูปประจำตัวเพื่อนเป็นชุด (ดึง ID เพื่อนจากข้อมูลวงเพื่อนที่มีอยู่)
        const friendIds = new Set();
        for (const circle of this.manager.friendsCircleData.values()) {
          if (circle.friendId && circle.friendId !== '483920') {
            // ไม่รวม ID ของผู้ใช้เอง
            friendIds.add(circle.friendId);
          }
        }

        // รับรูปประจำตัวเพื่อนทั้งหมดเป็นชุด
        for (const friendId of friendIds) {
          if (!this.batchCache.friendAvatars.has(friendId)) {
            const avatar = this.renderer.getFriendAvatar(friendId);
            if (avatar) {
              this.batchCache.friendAvatars.set(friendId, avatar);
            }
          }
        }

        this.batchCache.lastCacheTime = now;
        return this.batchCache;
      } catch (error) {
        console.error('[Friends Circle] รับข้อมูลพื้นฐานเป็นชุดล้มเหลว:', error); // Translated: 批量获取基础信息失败
        // ส่งคืนสถานะแคชปัจจุบัน แม้ว่าบางส่วนจะล้มเหลวก็ยังสามารถทำงานต่อไปได้
        return this.batchCache;
      }
    }

    /**
     * 🌟 วิธีที่ B: ล้างแคช (เรียกใช้เมื่อผู้ใช้เปลี่ยนตัวละคร)
     */
    clearBatchCache() {
      this.batchCache.userName = null;
      this.batchCache.userAvatar = null;
      this.batchCache.friendAvatars.clear();
      this.batchCache.lastCacheTime = 0;
    }

    /**
     * 🌟 วิธีที่ C: โหลดวงเพื่อนเพิ่มเติม (Lazy Loading)
     */
    loadMoreCircles() {
      try {
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (!loadMoreContainer) return;

        const remaining = parseInt(loadMoreContainer.dataset.remaining) || 0;
        if (remaining <= 0) return;

        const circlesContainer = document.querySelector('.circles-container');
        if (!circlesContainer) return;

        // รับข้อมูลวงเพื่อนทั้งหมด
        const allCircles = this.manager.getSortedFriendsCircles();
        const currentCount = circlesContainer.querySelectorAll('.circle-item').length; // จำนวนวงเพื่อนที่แสดงอยู่ปัจจุบัน

        // โหลดชุดถัดไป (สูงสุด 10 รายการ)
        const nextBatch = allCircles.slice(currentCount, currentCount + 10);
        const newRemaining = remaining - nextBatch.length;

        // แสดงผลวงเพื่อนใหม่
        const newHtml = nextBatch.map(circle => this.renderer.renderSingleCircle(circle)).join('');

        // แทรกก่อนปุ่มโหลดเพิ่มเติม
        loadMoreContainer.insertAdjacentHTML('beforebegin', newHtml);

        // อัปเดตหรือลบปุ่มโหลดเพิ่มเติม
        if (newRemaining > 0) {
          loadMoreContainer.dataset.remaining = newRemaining;
          loadMoreContainer.querySelector('.load-more-btn').innerHTML = `
          <i class="fas fa-chevron-down"></i>
          โหลดเพิ่มเติม (เหลืออีก ${newRemaining} รายการ)
        `; // Translated: 加载更多 (还有${newRemaining}条)
        } else {
          loadMoreContainer.remove();
        }
      } catch (error) {
        console.error('[Friends Circle] โหลดวงเพื่อนเพิ่มเติมล้มเหลว:', error); // Translated: 加载更多朋友圈失败
      }
    }

    /**
     * รับชื่อผู้ใช้ปัจจุบัน
     * @returns {string} ชื่อผู้ใช้
     */
    getCurrentUserName() {
      // มอบหมายให้เมธอดของ renderer
      if (this.renderer && typeof this.renderer.getCurrentUserName === 'function') {
        return this.renderer.getCurrentUserName();
      }

      // แผนสำรอง: รับโดยตรง
      try {
        // วิธีที่ 1: รับจากระบบ persona
        if (typeof getSelectedPersona === 'function') {
          const persona = getSelectedPersona();
          if (persona && persona.name && persona.name.trim() && persona.name !== '{{user}}') {
            return persona.name.trim();
          }
        }

        // วิธีที่ 2: รับชื่อ persona ที่เลือกจาก DOM
        const personaSelect = document.querySelector('#persona-management-block .persona_name_block .menu_button');
        if (
          personaSelect &&
          personaSelect.textContent &&
          personaSelect.textContent.trim() &&
          personaSelect.textContent.trim() !== '{{user}}'
        ) {
          return personaSelect.textContent.trim();
        }

        // วิธีที่ 3: รับจากตัวแปรส่วนกลางของ SillyTavern
        if (typeof window.name1 !== 'undefined' && window.name1 && window.name1.trim() && window.name1 !== '{{user}}') {
          return window.name1.trim();
        }
      } catch (error) {
        console.warn('[Friends Circle] รับชื่อผู้ใช้ล้มเหลว:', error); // Translated: 获取用户名失败
      }

      // ค่าเริ่มต้น
      return 'ผู้ใช้'; // Translated: 用户
    }

    /**
     * เริ่มต้น AttachmentSender
     */
    initializeAttachmentSender() {
      try {
        if (window.attachmentSender) {
          // ตั้งค่าวงเพื่อนเป็นเป้าหมายการแชทปัจจุบัน
          window.attachmentSender.setCurrentChat('friends_circle', '朋友圈', false); // Note: '朋友圈' is kept as a functional identifier
          console.log('[Friends Circle] AttachmentSender ถูกกำหนดค่าเป็นโหมดวงเพื่อนแล้ว'); // Translated: AttachmentSender已配置为朋友圈模式
        } else {
          console.warn('[Friends Circle] ไม่พบ AttachmentSender, ฟังก์ชันอัปโหลดรูปภาพอาจไม่พร้อมใช้งาน'); // Translated: AttachmentSender未找到，图片上传功能可能不可用
        }
      } catch (error) {
        console.error('[Friends Circle] เริ่มต้น AttachmentSender ล้มเหลว:', error); // Translated: 初始化AttachmentSender失败
      }
    }

    /**
     * เปิดใช้งานฟังก์ชันวงเพื่อน
     */
    activate() {
      console.log('[Friends Circle] เริ่มเปิดใช้งานฟังก์ชันวงเพื่อน...'); // Translated: 开始激活朋友圈功能

      this.isActive = true;
      console.log('[Friends Circle] สถานะวงเพื่อนถูกตั้งค่าเป็นเปิดใช้งาน'); // Translated: 朋友圈状态已设置为激活

      // เริ่มตัวฟังเหตุการณ์
      if (this.eventListener) {
        this.eventListener.startListening();
        console.log('[Friends Circle] ตัวฟังเหตุการณ์ถูกเริ่มแล้ว'); // Translated: 事件监听器已启动
      } else {
        console.error('[Friends Circle] ตัวฟังเหตุการณ์ไม่มีอยู่!'); // Translated: 事件监听器不存在！
      }

      // ตรวจสอบให้แน่ใจว่าส่วนหัวแสดงผลถูกต้อง
      this.updateHeader();

      // รีเฟรชข้อมูลวงเพื่อน
      this.refreshFriendsCircle();
      console.log('[Friends Circle] เปิดใช้งานฟังก์ชันวงเพื่อนเสร็จสมบูรณ์'); // Translated: 朋友圈功能激活完成
    }

    /**
     * ปิดใช้งานฟังก์ชันวงเพื่อน
     */
    deactivate() {
      this.isActive = false;
      this.eventListener.stopListening();
      console.log('[Friends Circle] ฟังก์ชันวงเพื่อนถูกปิดใช้งานแล้ว'); // Translated: 朋友圈功能已停用
    }

    /**
     * อัปเดตส่วนหัวของวงเพื่อน
     */
    updateHeader() {
      console.log('[Friends Circle] กำลังอัปเดตส่วนหัวของวงเพื่อน...'); // Translated: 更新朋友圈header...

      // แจ้งกรอบงานหลักเพื่ออัปเดตสถานะแอป
      if (window.mobilePhone) {
        const friendsCircleState = {
          app: 'messages',
          view: 'friendsCircle',
          title: 'วงเพื่อน', // Translated: 朋友圈
          showBackButton: false,
          showAddButton: true,
          addButtonIcon: 'fas fa-plus',
          addButtonAction: () => {
            if (window.friendsCircle) {
              window.friendsCircle.showPublishModal();
            }
          },
        };

        window.mobilePhone.currentAppState = friendsCircleState;
        window.mobilePhone.updateAppHeader(friendsCircleState);
        console.log('[Friends Circle] อัปเดตส่วนหัวเสร็จสมบูรณ์'); // Translated: Header更新完成
      } else {
        console.warn('[Friends Circle] mobilePhone ไม่มีอยู่, ไม่สามารถอัปเดตส่วนหัวได้'); // Translated: mobilePhone不存在，无法更新header
      }
    }

    /**
     * รีเฟรชข้อมูลวงเพื่อน
     */
    async refreshFriendsCircle() {
      try {
        console.log('[Friends Circle] เริ่มรีเฟรชข้อมูลวงเพื่อน...'); // Translated: 开始刷新朋友圈数据...
        console.log('[Friends Circle] สถานะเปิดใช้งานปัจจุบัน:', this.isActive); // Translated: 当前激活状态

        // ใช้เมธอด refreshData ใหม่, บังคับรีเฟรชแบบเต็มเมื่อเปิดใช้งานครั้งแรก
        const forceFullRefresh = this.manager.lastProcessedMessageIndex < 0;
        await this.manager.refreshData(forceFullRefresh);

        // ทริกเกอร์การอัปเดต UI เฉพาะเมื่ออยู่ในสถานะเปิดใช้งานเท่านั้น
        if (this.isActive) {
          console.log('[Friends Circle] วงเพื่อนเปิดใช้งานอยู่, ทริกเกอร์การอัปเดต UI'); // Translated: 朋友圈已激活，触发界面更新
          this.dispatchUpdateEvent();
        } else {
          console.log('[Friends Circle] วงเพื่อนไม่ได้เปิดใช้งาน, อัปเดตข้อมูลเท่านั้น'); // Translated: 朋友圈未激活，仅更新数据
        }
      } catch (error) {
        console.error('[Friends Circle] รีเฟรชข้อมูลวงเพื่อนล้มเหลว:', error); // Translated: 刷新朋友圈数据失败
      }
    }

    /**
     * อัปเดตการแสดงผลวงเพื่อน
     */
    updateDisplay() {
      try {
        console.log('[Friends Circle] อัปเดตการแสดงผลวงเพื่อน...'); // Translated: 更新朋友圈显示...

        // ทริกเกอร์เหตุการณ์การอัปเดต UI
        this.dispatchUpdateEvent();

        console.log('[Friends Circle] อัปเดตการแสดงผลวงเพื่อนเสร็จสมบูรณ์'); // Translated: 朋友圈显示更新完成
      } catch (error) {
        console.error('[Friends Circle] อัปเดตการแสดงผลล้มเหลว:', error); // Translated: 更新显示失败
      }
    }

    /**
     * รับเนื้อหาการแชท
     * @returns {Promise<string>} เนื้อหาการแชท
     */
    async getChatContent() {
      try {
        // วิธีที่ 1: ใช้ contextMonitor
        if (window.contextMonitor?.getCurrentChatMessages) {
          const chatData = await window.contextMonitor.getCurrentChatMessages();
          if (chatData?.messages) {
            return chatData.messages.map(msg => msg.mes || '').join('\n');
          }
        }

        // วิธีที่ 2: ใช้ SillyTavern.getContext
        if (window.SillyTavern?.getContext) {
          const context = window.SillyTavern.getContext();
          if (context?.chat && Array.isArray(context.chat)) {
            return context.chat.map(msg => msg.mes || '').join('\n');
          }
        }

        // วิธีที่ 3: ใช้ chat ของ window แม่
        if (window.parent?.chat && Array.isArray(window.parent.chat)) {
          return window.parent.chat.map(msg => msg.mes || '').join('\n');
        }

        return '';
      } catch (error) {
        console.error('[Friends Circle] รับเนื้อหาการแชทล้มเหลว:', error); // Translated: 获取聊天内容失败
        return '';
      }
    }

    /**
     * รับลายเซ็นผู้ใช้
     * @returns {string} ลายเซ็นผู้ใช้
     */
    getUserSignature() {
      return this.userSignature;
    }

    /**
     * ตั้งค่าลายเซ็นผู้ใช้
     * @param {string} signature - ลายเซ็นใหม่
     */
    setUserSignature(signature) {
      this.userSignature = signature;
      localStorage.setItem('friendsCircle_userSignature', signature);
      this.dispatchUpdateEvent();
    }

    /**
     * แก้ไขลายเซ็นผู้ใช้
     */
    editUserSignature() {
      const newSignature = prompt('กรุณาป้อนลายเซ็นส่วนตัวใหม่:', this.userSignature); // Translated: 请输入新的个性签名:
      if (newSignature !== null && newSignature.trim() !== '') {
        this.setUserSignature(newSignature.trim());
      }
    }

    /**
     * สลับการกดถูกใจวงเพื่อน
     * @param {string} circleId - ID วงเพื่อน
     */
    toggleCircleLike(circleId) {
      const likeData = this.manager.toggleLike(circleId);

      // อัปเดต DOM โดยตรง เพื่อหลีกเลี่ยงการเรนเดอร์หน้าใหม่ทั้งหมด
      this.updateLikeButtonUI(circleId, likeData);

      // ไม่เรียก dispatchUpdateEvent() เพื่อหลีกเลี่ยงการโหลดหน้าใหม่
      console.log(
        `[Friends Circle] สถานะการถูกใจได้รับการอัปเดต: ${circleId}, จำนวนถูกใจ: ${likeData.likes}, ถูกใจแล้ว: ${likeData.isLiked}`, // Translated: 点赞状态已更新
      );
    }

    /**
     * อัปเดต UI ปุ่มถูกใจ
     * @param {string} circleId - ID วงเพื่อน
     * @param {Object} likeData - ข้อมูลการถูกใจ
     */
    updateLikeButtonUI(circleId, likeData) {
      // ค้นหาปุ่มถูกใจที่เกี่ยวข้อง
      const circleElement = document.querySelector(`[data-circle-id="${circleId}"]`);
      if (!circleElement) return;

      const likeBtn = circleElement.querySelector('.like-btn');
      const likeIcon = likeBtn?.querySelector('i');
      const likeCount = likeBtn?.querySelector('.like-count');

      if (likeBtn && likeIcon && likeCount) {
        // อัปเดตไอคอน
        if (likeData.isLiked) {
          likeIcon.className = 'fas fa-heart liked';
          likeBtn.classList.add('liked');

          // เพิ่มเอฟเฟกต์แอนิเมชันถูกใจ
          likeBtn.classList.add('liked-animation');
          setTimeout(() => {
            likeBtn.classList.remove('liked-animation');
          }, 300);
        } else {
          likeIcon.className = 'far fa-heart';
          likeBtn.classList.remove('liked');
        }

        // อัปเดตจำนวนถูกใจ
        likeCount.textContent = likeData.likes;
      }
    }

    /**
     * สลับช่องป้อนข้อมูลการตอบกลับ
     * @param {string} circleId - ID วงเพื่อน
     */
    toggleReplyInput(circleId) {
      const inputContainer = document.getElementById(`reply-input-${circleId}`);
      if (!inputContainer) return;

      const isVisible = inputContainer.style.display !== 'none';

      // ซ่อนช่องป้อนข้อมูลการตอบกลับอื่นๆ ทั้งหมด
      document.querySelectorAll('.reply-input-container').forEach(container => {
        container.style.display = 'none';
      });

      // สลับช่องป้อนข้อมูลปัจจุบัน
      if (!isVisible) {
        inputContainer.style.display = 'flex';
        const input = inputContainer.querySelector('.reply-input');
        if (input) {
          input.focus();
        }
      }
    }

    /**
     * ส่งการตอบกลับวงเพื่อน
     * @param {string} circleId - ID วงเพื่อน
     */
    async sendCircleReply(circleId) {
      const inputContainer = document.getElementById(`reply-input-${circleId}`);
      if (!inputContainer) return;

      const input = inputContainer.querySelector('.reply-input');
      if (!input) return;

      const content = input.value.trim();
      if (!content) {
        alert('กรุณาป้อนเนื้อหาการตอบกลับ'); // Translated: 请输入回复内容
        return;
      }

      try {
        // ตรวจสอบว่าเป็นตอบกลับความคิดเห็นหรือไม่
        const replyToAuthor = input.dataset.replyToAuthor;

        if (replyToAuthor) {
          // ส่งตอบกลับความคิดเห็น
          await this.sendReplyToComment(circleId, content, replyToAuthor);
        } else {
          // สร้างรูปแบบการตอบกลับปกติ
          const replyFormat = `[朋友圈回复|{{user}}|483920|${circleId}|${content}]`;

          // ส่งไปยัง AI
          await this.sendToAI(
            `ผู้ใช้กำลังตอบกลับวงเพื่อน โปรดสร้างการตอบกลับ 1-3 รายการจากผู้อื่นสำหรับการตอบกลับของผู้ใช้ โปรดสร้างการตอบกลับเท่านั้น อย่าสร้างโพสต์ทั้งหมดใหม่ และอย่าสร้างการตอบกลับของผู้ใช้ซ้ำ การตอบกลับของผู้ใช้เสร็จสมบูรณ์แล้ว\n${replyFormat}`, // Translated: 用户正在回复朋友圈。请为用户的回复生成1-3个他人的响应回复，只生成回复，不要重新生成整个帖子，也不要重新生成用户的回复，用户回复已完成。\n${replyFormat}
          );

          this.showToast('ส่งการตอบกลับแล้ว', 'success'); // Translated: 回复已发送
        }

        // ล้างช่องป้อนข้อมูลและซ่อน
        input.value = '';
        input.placeholder = 'เขียนความคิดของคุณ...'; // Translated: 写下你的想法...
        input.removeAttribute('data-reply-to-author');
        input.removeAttribute('data-reply-to-id');
        inputContainer.style.display = 'none';
      } catch (error) {
        console.error('[Friends Circle] ส่งการตอบกลับล้มเหลว:', error); // Translated: 发送回复失败
        this.showToast('ส่งล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发送失败，请重试
      }
    }

    /**
     * แสดงช่องป้อนข้อมูลการตอบกลับความคิดเห็น
     * @param {string} circleId - ID วงเพื่อน
     * @param {string} replyId - ID ความคิดเห็นที่ถูกตอบกลับ
     * @param {string} replyAuthor - ชื่อผู้เขียนความคิดเห็นที่ถูกตอบกลับ
     */
    showReplyToComment(circleId, replyId, replyAuthor) {
      // ซ่อนช่องป้อนข้อมูลการตอบกลับอื่นๆ ทั้งหมด
      document.querySelectorAll('.reply-input-container').forEach(container => {
        container.style.display = 'none';
      });

      // แสดงช่องป้อนข้อมูลการตอบกลับหลัก
      const inputContainer = document.getElementById(`reply-input-${circleId}`);
      if (inputContainer) {
        inputContainer.style.display = 'flex';
        const input = inputContainer.querySelector('.reply-input');
        if (input) {
          // ตั้งค่าตัวยึดตำแหน่งเพื่อแจ้งเตือนวัตถุที่ถูกตอบกลับ
          input.placeholder = `ตอบกลับ ${replyAuthor}...`; // Translated: 回复 ${replyAuthor}...
          input.focus();

          // จัดเก็บข้อมูลเป้าหมายการตอบกลับ
          input.dataset.replyToAuthor = replyAuthor;
          input.dataset.replyToId = replyId;
        }
      }
    }

    /**
     * ส่งตอบกลับความคิดเห็น
     * @param {string} circleId - ID วงเพื่อน
     * @param {string} content - เนื้อหาการตอบกลับ
     * @param {string} replyToAuthor - ชื่อผู้เขียนความคิดเห็นที่ถูกตอบกลับ
     */
    async sendReplyToComment(circleId, content, replyToAuthor) {
      try {
        // สร้างรูปแบบการตอบกลับความคิดเห็น
        const replyFormat = `[朋友圈回复|{{user}}|483920|${circleId}|回复${replyToAuthor}：${content}]`; // Note: '回复' is kept as part of the functional format

        // ส่งไปยัง AI
        await this.sendToAI(
          `ผู้ใช้กำลังตอบกลับความคิดเห็นในวงเพื่อน โปรดสร้างการตอบกลับ 1-3 รายการจากผู้อื่นสำหรับการตอบกลับของผู้ใช้ โปรดสร้างการตอบกลับเท่านั้น อย่าสร้างโพสต์ทั้งหมดใหม่ และอย่าสร้างการตอบกลับของผู้ใช้ซ้ำ การตอบกลับของผู้ใช้เสร็จสมบูรณ์แล้ว\n${replyFormat}`, // Translated: 用户正在回复朋友圈的评论。请为用户的回复生成1-3个他人的响应回复，只生成回复，不要重新生成整个帖子，也不要重新生成用户的回复，用户回复已完成。\n${replyFormat}
        );

        this.showToast('ส่งการตอบกลับแล้ว', 'success'); // Translated: 回复已发送
      } catch (error) {
        console.error('[Friends Circle] ส่งตอบกลับความคิดเห็นล้มเหลว:', error); // Translated: 发送回复评论失败
        this.showToast('ส่งล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发送失败，请重试
      }
    }

    /**
     * ส่งข้อความไปยัง AI
     * @param {string} message - เนื้อหาข้อความ
     */
    async sendToAI(message) {
      try {
        console.log('[Friends Circle] ส่งข้อความไปยัง AI:', message); // Translated: 发送消息给AI

        const chatMessage = {
          role: 'user',
          message: message,
          send_date: '',
        };

        try {
          window.parent.document.querySelector('#send_textarea').value = message;
          window.parent.document.querySelector('#send_but').click();

          // แสดงข้อความแจ้งเตือนความสำเร็จ
          this.showToast('ข้อความพร้อมแล้ว, กรุณาคลิกส่งในหน้าหลัก', 'success'); // Translated: 消息已准备好，请在主界面点击发送
        } catch (error) {
          console.error('[Friends Circle] เกิดข้อผิดพลาดขณะส่งข้อมูลไปยัง window แม่:', error); // Translated: 发送数据到父窗口时出错
          console.error(
            '[Friends Circle] ฟังก์ชันนี้ต้องให้หน้าถูกฝังใน window แม่ที่กำหนดค่าอย่างถูกต้องจึงจะทำงานได้',
          ); // Translated: 此功能需要页面被嵌入到正确配置的父窗口中才能工作。
          console.log('[Friends Circle] ข้อความที่สร้าง:', message); // Translated: 生成的消息
          this.showToast('ไม่สามารถส่งอัตโนมัติได้ ข้อความถูกส่งออกไปยังคอนโซลแล้ว, กรุณาคัดลอกด้วยตนเอง', 'warning'); // Translated: 无法自动发送。消息已输出到控制台，请手动复制。
        }
      } catch (error) {
        console.error('[Friends Circle] ส่งข้อความล้มเหลว:', error); // Translated: 发送消息失败
        this.showToast('ส่งล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发送失败，请重试
        throw error;
      }
    }

    /**
     * แสดงข้อความแจ้งเตือน
     * @param {string} message - ข้อความแจ้งเตือน
     * @param {string} type - ประเภทข้อความ
     */
    showToast(message, type = 'info') {
      if (window.showMobileToast) {
        window.showMobileToast(message, type);
      } else {
        alert(message);
      }
    }

    /**
     * แสดงป๊อปอัปเผยแพร่
     */
    showPublishModal() {
      if (this.renderer) {
        this.renderer.showPublishModal();
      }
    }

    /**
     * ซ่อนป๊อปอัปเผยแพร่
     */
    hidePublishModal() {
      if (this.renderer) {
        this.renderer.hidePublishModal();
      }
    }

    /**
     * แสดงอินเทอร์เฟซเผยแพร่ข้อความ
     */
    showTextPublish() {
      if (this.renderer) {
        this.renderer.showTextPublishModal();
      }
    }

    /**
     * แสดงป๊อปอัปเผยแพร่ข้อความ
     */
    showTextPublishModal() {
      if (this.renderer) {
        this.renderer.showTextPublishModal();
      }
    }

    /**
     * แสดงอินเทอร์เฟซเผยแพร่รูปภาพ
     */
    showImagePublish() {
      if (this.renderer) {
        this.renderer.showImagePublishModal();
      }
    }

    /**
     * แสดงป๊อปอัปเผยแพร่รูปภาพ
     */
    showImagePublishModal() {
      if (this.renderer) {
        this.renderer.showImagePublishModal();
      }
    }

    /**
     * ส่งวงเพื่อนแบบข้อความ
     * @param {string} content - เนื้อหาวงเพื่อน
     */
    async sendTextCircle(content) {
      try {
        // สร้าง ID ชั้นแบบสุ่ม
        const floorId = 'w' + Math.floor(Math.random() * 900 + 100);

        // 🌟 จัดเก็บข้อมูลวงเพื่อนแบบข้อความในตัวจัดการทันที
        const currentUserName = this.getCurrentUserName();
        const circleData = {
          id: floorId,
          author: currentUserName, // ใช้ชื่อผู้ใช้ปัจจุบันแทน {{user}}
          friendId: '483920',
          type: 'text',
          content: content,
          messageIndex: -1,
          latestActivityIndex: -1,
          replies: [],
          likes: 0,
          isLiked: false,
          timestamp: new Date().toISOString(),
        };

        // จัดเก็บในตัวจัดการทันที
        this.manager.friendsCircleData.set(floorId, circleData);
        console.log('[Friends Circle] จัดเก็บข้อมูลวงเพื่อนแบบข้อความทันที:', circleData); // Translated: 立即存储文字朋友圈数据

        // ทริกเกอร์การอัปเดต UI
        this.dispatchUpdateEvent();

        // สร้างรูปแบบวงเพื่อน
        const circleFormat = `[朋友圈|{{user}}|483920|${floorId}|${content}]`;

        // ส่งไปยัง AI
        await this.sendToAI(
          `ผู้ใช้ส่งวงเพื่อน โปรดสร้างการตอบกลับที่เป็นไปได้ 3-5 รายการจากเพื่อนโดยใช้รูปแบบการตอบกลับวงเพื่อนที่กำหนด จำกัดเฉพาะเพื่อนที่มี ID เพื่อนเท่านั้นที่สามารถเข้าร่วมการตอบกลับวงเพื่อน โปรดทราบว่าคุณกำลังสร้างการตอบกลับสำหรับวงเพื่อนของผู้ใช้ที่มีอยู่ สร้างการตอบกลับเท่านั้น ห้ามสร้างรูปแบบวงเพื่อนของผู้ใช้ซ้ำ\n${circleFormat}`, // Translated: 用户发送朋友圈，请使用规定的朋友圈回复格式生成3-5条可能的好友回复，仅限有好友id的好友参与朋友圈回复。请注意，你是在为现有的用户朋友圈生成回复，只生成回复，禁止重复生成用户的朋友圈格式。\n${circleFormat}
        );

        // 🌟 ทริกเกอร์การแยกวิเคราะห์วงเพื่อนด้วยตนเองหนึ่งครั้ง เพื่อให้แน่ใจว่าวงเพื่อนของผู้ใช้ที่ส่งไปได้รับการแยกวิเคราะห์อย่างถูกต้อง
        setTimeout(async () => {
          try {
            console.log(
              '[Friends Circle] ทริกเกอร์การแยกวิเคราะห์วงเพื่อนด้วยตนเอง, เพื่อให้แน่ใจว่าเนื้อหาที่ผู้ใช้ส่งไปได้รับการแยกวิเคราะห์...',
            ); // Translated: 手动触发朋友圈解析，确保用户发送的内容被解析...
            await this.manager.refreshData(false); // อัปเดตแบบเพิ่มหน่วย
            if (this.isActive) {
              this.dispatchUpdateEvent();
            }
          } catch (error) {
            console.warn('[Friends Circle] ทริกเกอร์การแยกวิเคราะห์ด้วยตนเองล้มเหลว:', error); // Translated: 手动触发解析失败
          }
        }, 500); // รอ 500ms เพื่อให้ SillyTavern ประมวลผลข้อความ

        this.showToast('ส่งวงเพื่อนแล้ว', 'success'); // Translated: 朋友圈已发送
        this.hidePublishModal();
      } catch (error) {
        console.error('[Friends Circle] ส่งวงเพื่อนแบบข้อความล้มเหลว:', error); // Translated: 发送文字朋友圈失败
        this.showToast('ส่งล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发送失败，请重试
      }
    }

    /**
     * ส่งวงเพื่อนแบบรูปภาพ
     * @param {string} imageDescription - คำอธิบายรูปภาพ
     * @param {string} textContent - เนื้อหาข้อความ
     * @param {File} imageFile - ไฟล์รูปภาพ (ไม่บังคับ)
     */
    async sendImageCircle(imageDescription, textContent, imageFile) {
      try {
        // สร้าง ID ชั้นแบบสุ่ม
        const floorId = 's' + Math.floor(Math.random() * 900 + 100);

        let finalImageDesc = imageDescription;

        // หากมีไฟล์รูปภาพ ให้อัปโหลดก่อน
        if (imageFile && window.mobileUploadManager) {
          try {
            const uploadResult = await window.mobileUploadManager.uploadFile(imageFile);
            if (uploadResult && uploadResult.success) {
              finalImageDesc = 'รูปภาพ'; // Translated: 图片
            }
          } catch (uploadError) {
            console.warn('[Friends Circle] อัปโหลดรูปภาพล้มเหลว, ใช้ข้อความคำอธิบาย:', uploadError); // Translated: 图片上传失败，使用描述文本
          }
        }

        // สร้างรูปแบบวงเพื่อน
        let circleFormat;
        if (textContent && textContent.trim()) {
          circleFormat = `[朋友圈|{{user}}|483920|${floorId}|${finalImageDesc}|${textContent}]`;
        } else {
          circleFormat = `[朋友圈|{{user}}|483920|${floorId}|${finalImageDesc}]`;
        }

        // ส่งไปยัง AI
        await this.sendToAI(
          `ผู้ใช้ส่งวงเพื่อน โปรดสร้างการตอบกลับที่เป็นไปได้ 3-5 รายการจากเพื่อนโดยใช้รูปแบบการตอบกลับวงเพื่อนที่กำหนด จำกัดเฉพาะเพื่อนที่มี ID เพื่อนเท่านั้นที่สามารถเข้าร่วมการตอบกลับวงเพื่อน โปรดทราบว่าคุณกำลังสร้างการตอบกลับสำหรับวงเพื่อนของผู้ใช้ที่มีอยู่ สร้างการตอบกลับเท่านั้น ห้ามสร้างรูปแบบวงเพื่อนของผู้ใช้ซ้ำ\n${circleFormat}`, // Translated: 用户发送朋友圈，请使用规定的朋友圈回复格式生成3-5条可能的好友回复，仅限有好友id的好友参与朋友圈回复。请注意，你是在为现有的用户朋友圈生成回复，只生成回复，禁止重复生成用户的朋友圈格式。\n${circleFormat}
        );

        this.showToast('ส่งวงเพื่อนแล้ว', 'success'); // Translated: 朋友圈已发送
        this.hidePublishModal();
      } catch (error) {
        console.error('[Friends Circle] ส่งวงเพื่อนแบบรูปภาพล้มเหลว:', error); // Translated: 发送图片朋友圈失败
        this.showToast('ส่งล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发送失败，请重试
      }
    }
    /**
     * จัดการการเผยแพร่ข้อความ
     * @param {HTMLElement} modal - องค์ประกอบป๊อปอัป
     */
    handleTextPublish(modal = null) {
      if (!modal) {
        modal = document.querySelector('.friends-circle-text-publish-modal');
      }
      if (!modal) return;

      const textInput = modal.querySelector('.text-input');
      if (!textInput) return;

      const content = textInput.value.trim();
      if (!content) {
        this.showToast('กรุณาป้อนเนื้อหาวงเพื่อน', 'error'); // Translated: 请输入朋友圈内容
        return;
      }

      // ส่งวงเพื่อนแบบข้อความ
      this.sendTextCircle(content);
      modal.remove();
    }

    /**
     * จัดการการเผยแพร่รูปภาพ
     */
    async handleImagePublish() {
      console.log('[Friends Circle] เริ่มจัดการการเผยแพร่รูปภาพ...'); // Translated: 开始处理图片发布...
      console.log('[Friends Circle] ตรวจสอบ this context:', {
        // Translated: this上下文检查
        thisExists: !!this,
        thisConstructorName: this?.constructor?.name,
        hasSelectedImageFile: !!this?.selectedImageFile,
        selectedImageFileName: this?.selectedImageFile?.name,
        globalInstanceExists: !!window.friendsCircle,
        globalInstanceSame: window.friendsCircle === this,
        globalHasSelectedFile: !!window.friendsCircle?.selectedImageFile,
        globalSelectedFileName: window.friendsCircle?.selectedImageFile?.name,
      });

      // หากอินสแตนซ์ปัจจุบันไม่มีไฟล์ แต่ global instance มี ให้ใช้ไฟล์จาก global instance
      if (!this.selectedImageFile && window.friendsCircle?.selectedImageFile) {
        console.log('[Friends Circle] กู้คืนข้อมูลไฟล์จาก global instance'); // Translated: 从全局实例恢复文件信息
        this.selectedImageFile = window.friendsCircle.selectedImageFile;
        this.selectedImageElements = window.friendsCircle.selectedImageElements;
      }

      const modal = document.querySelector('.friends-circle-image-publish-modal');
      if (!modal) {
        console.error('[Friends Circle] ไม่พบป๊อปอัปเผยแพร่'); // Translated: 未找到发布弹窗
        return;
      }

      const imageDescInput = modal.querySelector('.image-desc-input');
      const textInput = modal.querySelector('.text-input');
      const publishBtn = modal.querySelector('#friends-circle-publish-btn');
      const uploadStatus = modal.querySelector('#friends-circle-upload-status');
      const uploadText = modal.querySelector('#friends-circle-upload-text');
      const progressBar = modal.querySelector('#friends-circle-progress-bar');

      console.log('[Friends Circle] ตรวจสอบองค์ประกอบป๊อปอัป:', {
        // Translated: 弹窗元素检查
        imageDescInput: !!imageDescInput,
        textInput: !!textInput,
        publishBtn: !!publishBtn,
        uploadStatus: !!uploadStatus,
        uploadText: !!uploadText,
        progressBar: !!progressBar,
      });

      if (!imageDescInput) {
        console.error('[Friends Circle] ไม่พบช่องป้อนคำอธิบายรูปภาพ'); // Translated: 图片描述输入框未找到
        return;
      }

      const imageDescription = imageDescInput.value.trim();
      const textContent = textInput ? textInput.value.trim() : '';
      const imageFile = this.selectedImageFile;

      console.log('[Friends Circle] ตรวจสอบข้อมูลเผยแพร่:', {
        // Translated: 发布数据检查
        imageDescription: imageDescription,
        textContent: textContent,
        hasImageFile: !!imageFile,
        imageFileName: imageFile ? imageFile.name : 'none',
        selectedImageFileExists: !!this.selectedImageFile,
      });

      // ตรวจสอบความถูกต้องของอินพุต - ต้องมีคำอธิบายรูปภาพหรือไฟล์รูปภาพอย่างใดอย่างหนึ่ง
      if (!imageDescription && !imageFile) {
        console.warn('[Friends Circle] ตรวจสอบความถูกต้องล้มเหลว - ขาดคำอธิบายและไฟล์รูปภาพ'); // Translated: 验证失败 - 缺少描述和图片文件
        this.showToast('กรุณาป้อนคำอธิบายรูปภาพหรืออัปโหลดรูปภาพ', 'error'); // Translated: 请输入图片描述或上传图片
        return;
      }

      console.log('[Friends Circle] ตรวจสอบการเผยแพร่ผ่าน:', {
        // Translated: 发布验证通过
        hasDescription: !!imageDescription,
        hasImageFile: !!imageFile,
        imageFileName: imageFile ? imageFile.name : 'none',
      });

      try {
        // ปิดใช้งานปุ่มเผยแพร่, แสดงสถานะการอัปโหลด
        if (publishBtn) {
          publishBtn.disabled = true;
          publishBtn.textContent = 'กำลังเผยแพร่...'; // Translated: 发布中...
        }

        let uploadResult = null;
        let finalImageDescription = imageDescription || 'รูปภาพ'; // Translated: 图片

        // หากมีไฟล์รูปภาพ ให้อัปโหลดก่อน
        if (imageFile) {
          console.log('[Friends Circle] เริ่มอัปโหลดไฟล์รูปภาพ:', imageFile.name); // Translated: 开始上传图片文件

          // แสดงสถานะการอัปโหลด
          if (uploadStatus) {
            uploadStatus.style.display = 'block';
            if (uploadText) uploadText.textContent = 'กำลังอัปโหลดรูปภาพ...'; // Translated: 正在上传图片...
            if (progressBar) progressBar.style.width = '30%';
          }

          // ใช้ระบบแนบไฟล์ดั้งเดิมของ SillyTavern
          if (!window.attachmentSender) {
            throw new Error('ฟังก์ชันอัปโหลดรูปภาพไม่พร้อมใช้งาน'); // Translated: 图片上传功能未就绪
          }

          // ใช้ simulateFileInputUpload โดยตรง ให้ SillyTavern จัดการไฟล์แนบ
          uploadResult = await window.attachmentSender.simulateFileInputUpload(imageFile);

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'อัปโหลดรูปภาพล้มเหลว'); // Translated: 图片上传失败
          }

          console.log('[Friends Circle] แนบรูปภาพไปยัง SillyTavern แล้ว:', uploadResult); // Translated: 图片已附加到SillyTavern

          // อัปเดตความคืบหน้า
          if (progressBar) progressBar.style.width = '70%';
          if (uploadText) uploadText.textContent = 'แนบรูปภาพแล้ว, กำลังเผยแพร่...'; // Translated: 图片已附加，正在发布...

          // หากไม่มีคำอธิบาย ให้ใช้ชื่อไฟล์เป็นคำอธิบาย
          if (!imageDescription) {
            finalImageDescription = `รูปภาพของฉัน: ${uploadResult.fileName}`; // Translated: 我的图片:
          }
        }

        // อัปเดตความคืบหน้า
        if (progressBar) progressBar.style.width = '90%';
        if (uploadText) uploadText.textContent = 'กำลังเผยแพร่วงเพื่อน...'; // Translated: 正在发布朋友圈...

        // ส่งวงเพื่อน
        await this.sendImageCircleWithUpload(finalImageDescription, textContent, uploadResult);

        // เสร็จสมบูรณ์
        if (progressBar) progressBar.style.width = '100%';
        if (uploadText) uploadText.textContent = 'เผยแพร่สำเร็จ!'; // Translated: 发布成功！

        // ไม่ต้องล้างสถานะไฟล์แนบของ SillyTavern ทันที ให้ SillyTavern จัดการข้อความแนบไฟล์ตามธรรมชาติ
        // this.clearSillyTavernAttachment();

        // ปิดป๊อปอัปแบบหน่วงเวลา
        setTimeout(() => {
          modal.remove();
          this.showToast('เผยแพร่วงเพื่อนสำเร็จ!', 'success'); // Translated: 朋友圈发布成功！
        }, 1000);
      } catch (error) {
        console.error('[Friends Circle] เผยแพร่วงเพื่อนแบบรูปภาพล้มเหลว:', error); // Translated: 图片朋友圈发布失败

        // กู้คืนสถานะปุ่ม
        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.textContent = 'เผยแพร่'; // Translated: 发布
        }

        // ซ่อนสถานะการอัปโหลด
        if (uploadStatus) {
          uploadStatus.style.display = 'none';
        }

        this.showToast(error.message || 'เผยแพร่ล้มเหลว, กรุณาลองใหม่', 'error'); // Translated: 发布失败，请重试
      }
    }

    /**
     * ส่งวงเพื่อนแบบรูปภาพพร้อมผลการอัปโหลด
     */
    async sendImageCircleWithUpload(imageDescription, textContent, uploadResult) {
      try {
        // สร้าง ID ชั้นแบบสุ่ม
        const floorId = 's' + Math.floor(Math.random() * 900 + 100);

        // รับชื่อไฟล์จาก uploadResult
        const fileName = uploadResult?.file?.name || uploadResult?.fileName || 'รูปภาพ'; // Translated: 图片

        // สร้างรูปแบบวงเพื่อน
        let circleFormat;
        if (textContent && textContent.trim()) {
          circleFormat = `[朋友圈|{{user}}|483920|${floorId}|我的图片: ${fileName}|${textContent}]`; // Note: '我的图片: ' is kept as functional format
        } else {
          circleFormat = `[朋友圈|{{user}}|483920|${floorId}|我的图片: ${fileName}]`;
        }

        console.log('[Friends Circle] รูปแบบวงเพื่อนที่จะส่ง:', circleFormat); // Translated: 发送朋友圈格式

        // 🌟 จัดเก็บข้อมูลวงเพื่อนในตัวจัดการทันที ไม่ต้องรอ SillyTavern ประมวลผล
        const currentUserName = this.getCurrentUserName();

        // ลองรับ URL รูปภาพทันที (ถ้าเป็นไปได้)
        let imageUrl = null;
        try {
          // ตรวจสอบว่ามี URL รูปภาพที่อัปโหลดแล้วหรือไม่
          if (uploadResult && uploadResult.fileUrl && uploadResult.fileUrl !== 'attached_to_sillytavern') {
            imageUrl = uploadResult.fileUrl;
            console.log('[Friends Circle] ใช้ URL รูปภาพจากผลการอัปโหลด:', imageUrl); // Translated: 使用上传结果中的图片URL
          } else {
            // ลองรับ URL รูปภาพล่าสุดจาก SillyTavern
            const recentImageUrl = await this.tryGetRecentImageUrl();
            if (recentImageUrl) {
              imageUrl = recentImageUrl;
              console.log('[Friends Circle] ได้รับ URL รูปภาพล่าสุด:', imageUrl); // Translated: 获取到最新图片URL
            }
          }
        } catch (error) {
          console.warn('[Friends Circle] รับ URL รูปภาพล้มเหลว, จะใช้ตัวยึดตำแหน่ง:', error); // Translated: 获取图片URL失败，将使用占位符
        }

        const circleData = {
          id: floorId,
          author: currentUserName, // ใช้ชื่อผู้ใช้ปัจจุบันแทน {{user}}
          friendId: '483920',
          type: 'visual',
          imageDescription: `รูปภาพของฉัน: ${fileName}`, // Translated: 我的图片:
          imageUrl: imageUrl, // เพิ่มฟิลด์ URL รูปภาพ
          content: textContent || '',
          messageIndex: -1,
          latestActivityIndex: -1,
          replies: [],
          likes: 0,
          isLiked: false,
          timestamp: new Date().toISOString(),
        };

        // จัดเก็บในตัวจัดการทันที
        this.manager.friendsCircleData.set(floorId, circleData);
        console.log('[Friends Circle] จัดเก็บข้อมูลวงเพื่อนรูปภาพทันที:', circleData); // Translated: 立即存储图片朋友圈数据

        // ทริกเกอร์การอัปเดต UI
        this.dispatchUpdateEvent();

        // สร้างข้อความฉบับเต็ม พร้อมข้อความแนะนำ
        const fullMessage = `ผู้ใช้ส่งวงเพื่อน โปรดสร้างการตอบกลับที่เป็นไปได้ 3-5 รายการจากเพื่อนโดยใช้รูปแบบการตอบกลับวงเพื่อนที่กำหนด จำกัดเฉพาะเพื่อนที่มี ID เพื่อนเท่านั้นที่สามารถเข้าร่วมการตอบกลับวงเพื่อน โปรดทราบว่าคุณกำลังสร้างการตอบกลับสำหรับวงเพื่อนของผู้ใช้ที่มีอยู่ สร้างการตอบกลับเท่านั้น ห้ามสร้างรูปแบบวงเพื่อนของผู้ใช้ซ้ำ\n${circleFormat}`; // Translated: (The full message instruction is kept consistent with previous translations)

        // ส่งข้อความรูปแบบวงเพื่อน, SillyTavern จะแนบรูปภาพโดยอัตโนมัติ
        await this.sendToAI(fullMessage);

        // 🌟 ทริกเกอร์การแยกวิเคราะห์วงเพื่อนด้วยตนเองหนึ่งครั้ง เพื่อให้แน่ใจว่าวงเพื่อนของผู้ใช้ที่ส่งไปได้รับการแยกวิเคราะห์อย่างถูกต้อง
        setTimeout(async () => {
          try {
            console.log(
              '[Friends Circle] ทริกเกอร์การแยกวิเคราะห์วงเพื่อนด้วยตนเอง, เพื่อให้แน่ใจว่าเนื้อหาที่ผู้ใช้ส่งไปได้รับการแยกวิเคราะห์...',
            ); // Translated: 手动触发朋友圈解析，确保用户发送的内容被解析...
            await this.manager.refreshData(false); // อัปเดตแบบเพิ่มหน่วย
            if (this.isActive) {
              this.dispatchUpdateEvent();
            }
          } catch (error) {
            console.warn('[Friends Circle] ทริกเกอร์การแยกวิเคราะห์ด้วยตนเองล้มเหลว:', error); // Translated: 手动触发解析失败
          }
        }, 500); // รอ 500ms เพื่อให้ SillyTavern ประมวลผลข้อความ

        // รอ SillyTavern ประมวลผลข้อความแนบไฟล์
        if (uploadResult && uploadResult.success) {
          console.log('[Friends Circle] กำลังรอ SillyTavern ประมวลผลข้อความแนบไฟล์...'); // Translated: 等待SillyTavern处理附件消息...

          // ประมวลผลแบบหน่วงเวลา เพื่อให้ SillyTavern มีเวลาจัดการไฟล์แนบ
          setTimeout(async () => {
            try {
              // ลองดึง URL รูปภาพจริงจากข้อมูลแชท SillyTavern
              await this.extractImageFromSillyTavern(floorId, fileName, textContent);
            } catch (error) {
              console.warn('[Friends Circle] ดึงข้อมูลรูปภาพล้มเหลว:', error); // Translated: 提取图片信息失败
              // แม้ว่าจะดึงข้อมูลล้มเหลว แต่วงเพื่อนก็ถูกส่งสำเร็จแล้ว
            } finally {
              // ล้างสถานะไฟล์แนบของ SillyTavern หลังจากการประมวลผลเสร็จสิ้น
              this.clearSillyTavernAttachment();
            }
          }, 2000); // รอ 2 วินาทีเพื่อให้ SillyTavern ประมวลผล
        }

        console.log('[Friends Circle] ส่งวงเพื่อนแบบรูปภาพสำเร็จ'); // Translated: 图片朋友圈发送成功
      } catch (error) {
        console.error('[Friends Circle] ส่งวงเพื่อนแบบรูปภาพล้มเหลว:', error); // Translated: 发送图片朋友圈失败
        throw error;
      }
    }

    /**
     * ลองรับ URL รูปภาพล่าสุดทันที
     * @returns {Promise<string|null>} URL รูปภาพ หรือ null
     */
    async tryGetRecentImageUrl() {
      try {
        // ใช้ SillyTavern.getContext() เพื่อรับข้อมูลแชท
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const chatMessages = context.chat;

            // ตรวจสอบรูปภาพในข้อความล่าสุด
            const recentMessages = chatMessages.slice(-3); // ตรวจสอบ 3 ข้อความล่าสุด
            for (const message of recentMessages.reverse()) {
              if (message.extra && message.extra.image) {
                console.log('[Friends Circle] พบ URL รูปภาพล่าสุด:', message.extra.image); // Translated: 找到最新图片URL
                return message.extra.image;
              }
            }
          }
        }

        return null;
      } catch (error) {
        console.warn('[Friends Circle] รับ URL รูปภาพล่าสุดล้มเหลว:', error); // Translated: 获取最新图片URL失败
        return null;
      }
    }

    /**
     * ดึงข้อมูลรูปภาพจาก SillyTavern
     */
    async extractImageFromSillyTavern(floorId, imageDescription, textContent) {
      try {
        console.log('[Friends Circle] เริ่มดึงข้อมูลรูปภาพจาก SillyTavern...'); // Translated: 开始从SillyTavern提取图片信息...

        // ใช้เมธอดที่ถูกต้องเพื่อรับข้อมูลแชท SillyTavern (อ้างอิง message-app.js)
        let chatMessages = null;

        // ให้ความสำคัญกับการใช้ SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            chatMessages = context.chat;
            console.log(
              '[Friends Circle] ใช้ SillyTavern.getContext() เพื่อรับข้อมูลแชท:',
              chatMessages.length,
              'ข้อความ',
            ); // Translated: 使用SillyTavern.getContext()获取聊天数据, 条消息
          }
        }

        // แผนสำรอง: รับจากตัวแปรส่วนกลาง
        if (!chatMessages) {
          const chat = window['chat'];
          if (chat && Array.isArray(chat)) {
            chatMessages = chat;
            console.log('[Friends Circle] ใช้ตัวแปรส่วนกลางเพื่อรับข้อมูลแชท:', chatMessages.length, 'ข้อความ'); // Translated: 使用全局变量获取聊天数据, 条消息
          }
        }

        if (!chatMessages || !Array.isArray(chatMessages)) {
          throw new Error('ไม่สามารถเข้าถึงข้อมูลแชท SillyTavern ได้'); // Translated: 无法访问SillyTavern聊天数据
        }

        // ค้นหาข้อมูลรูปภาพในข้อความล่าสุด
        const recentMessages = chatMessages.slice(-5); // ตรวจสอบ 5 ข้อความล่าสุด
        let imageUrl = null;
        let fileName = null;

        console.log(
          '[Friends Circle] ตรวจสอบข้อความล่าสุด:', // Translated: 检查最近的消息
          recentMessages.map(m => ({
            content: m.mes || m.content,
            extra: m.extra,
            hasImage: !!(m.extra && m.extra.image),
          })),
        );

        for (const message of recentMessages.reverse()) {
          if (message.extra && message.extra.image) {
            imageUrl = message.extra.image;
            fileName = imageUrl.split('/').pop();
            console.log('[Friends Circle] พบข้อมูลรูปภาพ:', { imageUrl, fileName }); // Translated: 找到图片信息
            break;
          }
        }

        // หากไม่พบ ให้ลองแยกวิเคราะห์จากเนื้อหาข้อความ (อ้างอิงการใช้งาน message-renderer.js)
        if (!imageUrl) {
          console.log('[Friends Circle] ไม่พบรูปภาพใน extra, กำลังลองแยกวิเคราะห์จากเนื้อหาข้อความ...'); // Translated: 未在extra中找到图片，尝试从消息内容解析...

          for (const message of recentMessages.reverse()) {
            const content = message.mes || message.content || '';

            // ตรวจสอบว่ามีข้อมูลรูปภาพในรูปแบบวงเพื่อนหรือไม่
            if (content.includes('我的图片:') || content.includes('[朋友圈|')) {
              // Note: '我的图片:' and '[朋友圈|' are kept as functional markers
              const imageRegex = /我的图片:\s*([^|\]]+)/;
              const match = content.match(imageRegex);

              if (match) {
                fileName = match[1].trim();
                console.log('[Friends Circle] แยกวิเคราะห์ชื่อไฟล์รูปภาพจากข้อความ:', fileName); // Translated: 从消息解析到图片文件名

                // ใช้ AttachmentSender เพื่อสร้าง URL รูปภาพ (อ้างอิง message-renderer.js)
                if (window.attachmentSender && typeof window.attachmentSender.buildImageUrl === 'function') {
                  // รับชื่อผู้ใช้ปัจจุบัน
                  const userName = this.getCurrentUserName();
                  imageUrl = window.attachmentSender.buildImageUrl(userName, fileName);
                } else {
                  // แผนสำรอง: ใช้เส้นทางสัมพัทธ์ ให้สอดคล้องกับ SillyTavern
                  const userName = this.getCurrentUserName();
                  imageUrl = `/user/images/${userName}/${fileName}`;
                }

                console.log('[Friends Circle] URL รูปภาพที่สร้าง:', imageUrl); // Translated: 构建的图片URL
                break;
              }
            }
          }
        }

        if (imageUrl) {
          // สร้าง URL รูปภาพฉบับเต็ม
          const fullImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

          // 🌟 อัปเดตข้อมูลวงเพื่อนที่มีอยู่แทนการสร้างใหม่
          const existingData = this.manager.friendsCircleData.get(floorId);
          if (existingData) {
            // อัปเดตข้อมูลรูปภาพของข้อมูลที่มีอยู่
            existingData.imageUrl = fullImageUrl;
            existingData.imageFileName = fileName;
            if (imageDescription && imageDescription !== existingData.imageDescription) {
              existingData.imageDescription = imageDescription;
            }

            console.log('[Friends Circle] อัปเดตข้อมูลรูปภาพของวงเพื่อนที่มีอยู่:', {
              // Translated: 更新已存在朋友圈的图片信息
              id: floorId,
              imageUrl: fullImageUrl,
              imageFileName: fileName,
            });
          } else {
            // หากไม่มีอยู่ (ไม่ควรเกิดขึ้น) ให้สร้างข้อมูลใหม่
            const currentUserName = this.getCurrentUserName();
            const circleData = {
              id: floorId,
              author: currentUserName, // ใช้ชื่อผู้ใช้จริง
              friendId: '483920',
              type: 'visual',
              imageDescription: imageDescription,
              imageUrl: fullImageUrl,
              imageFileName: fileName,
              content: textContent || '',
              messageIndex: -1,
              latestActivityIndex: -1,
              replies: [],
              likes: 0,
              isLiked: false,
              timestamp: new Date().toISOString(),
            };

            this.manager.friendsCircleData.set(floorId, circleData);
            console.log('[Friends Circle] สร้างข้อมูลวงเพื่อนรูปภาพใหม่:', circleData); // Translated: 创建新的图片朋友圈数据
          }

          // ทริกเกอร์การอัปเดต UI
          this.dispatchUpdateEvent();
        } else {
          console.warn('[Friends Circle] ไม่พบข้อมูลรูปภาพ, คงการแสดงผลตัวยึดตำแหน่งไว้'); // Translated: 未找到图片信息，保持占位符显示
        }
      } catch (error) {
        console.error('[Friends Circle] ดึงข้อมูลรูปภาพล้มเหลว:', error); // Translated: 提取图片信息失败
        throw error;
      }
    }

    /**
     * ล้างสถานะไฟล์แนบของ SillyTavern
     */
    clearSillyTavernAttachment() {
      try {
        console.log('[Friends Circle] กำลังล้างสถานะไฟล์แนบของ SillyTavern...'); // Translated: 清理SillyTavern附件状态...

        // ค้นหาและคลิกปุ่มรีเซ็ตไฟล์ของ SillyTavern
        const resetButton = document.getElementById('file_form_reset');
        if (resetButton) {
          console.log('[Friends Circle] พบปุ่มรีเซ็ต SillyTavern, เตรียมคลิก'); // Translated: 找到SillyTavern重置按钮，准备点击
          resetButton.click();
          console.log('[Friends Circle] ไฟล์แนบ SillyTavern ถูกรีเซ็ตแล้ว'); // Translated: SillyTavern附件已重置
        } else {
          console.log('[Friends Circle] ไม่พบปุ่มรีเซ็ต SillyTavern'); // Translated: 未找到SillyTavern重置按钮

          // แผนสำรอง: ล้างช่องป้อนข้อมูลไฟล์โดยตรง
          const fileInput = document.getElementById('file_form_input');
          if (fileInput) {
            fileInput.value = '';
            console.log('[Friends Circle] ช่องป้อนข้อมูลไฟล์ถูกล้างแล้ว (แผนสำรอง)'); // Translated: 文件输入框已清空（备用方案）
          }
        }
      } catch (error) {
        console.error('[Friends Circle] เกิดข้อผิดพลาดขณะล้างสถานะไฟล์แนบ:', error); // Translated: 清理附件状态时出错
      }
    }

    /**
     * ส่งเหตุการณ์อัปเดต
     */
    dispatchUpdateEvent() {
      const event = new CustomEvent('friendsCircleUpdate', {
        detail: {
          timestamp: Date.now(),
          circles: this.manager.getSortedFriendsCircles(),
        },
      });
      window.dispatchEvent(event);
    }

    /**
     * ทดสอบการแยกวิเคราะห์วงเพื่อนแบบภาพ
     */
    testVisualCircleParsing() {
      console.log('[Friends Circle] เริ่มทดสอบการแยกวิเคราะห์วงเพื่อน...'); // Translated: 开始测试朋友圈解析...

      // รูปแบบที่ถูกต้องสำหรับการทดสอบ
      const correctFormats = [
        '[朋友圈|夏阳|200005|s102|一张自拍照。金色的短发被汗水浸湿，几缕发丝贴在饱满的额头上。他正对着镜头露出一个大大的、灿烂的笑容，背景是清晨洒满阳光的沿江跑道。|今天也是元气满满的一天！]', // Note: Content in Chinese is kept as it's test data
        '[朋友圈|秦倦|500002|w101|有点无聊，有没有人出来吃夜宵？]',
        '[朋友圈回复|夏阳|300004|w101|秦倦老师，我正好有空，我可以嘛？]',
      ];

      // รูปแบบที่ไม่ถูกต้องสำหรับการทดสอบ (ไม่ควรถูกจับคู่)
      const incorrectFormats = [
        '- 序号: 001 - 时间: 2025年8月22日午后', // Translated: 序号 -> ลำดับที่, 时间 -> เวลา
        '| 名字 | 身份 | 性格核心 | 心理状态 | 性经验 | 重要道具 |', // Translated: 名字 -> ชื่อ, 身份 -> อัตลักษณ์, 性格核心 -> แก่นบุคลิก, 心理状态 -> สภาพจิตใจ, 性经验 -> ประสบการณ์ทางเพศ, 重要道具 -> อุปกรณ์สำคัญ
        '| 沐夕 | 娱乐圈新人 | 温柔体贴，略带羞涩 | 平静，正在浏览信息 | 有 | 手机 |', // Translated: 娱乐圈新人 -> ศิลปินใหม่, 温柔体贴，略带羞涩 -> อ่อนโยนและขี้อายเล็กน้อย, 平静，正在浏览信息 -> สงบ, กำลังดูข้อมูล, 手机 -> โทรศัพท์มือถือ
        '剧情总结:沐夕在午后查看了朋友圈，看到了秦倦、夏阳、朝沐雨和温屿发布的动态', // Translated: 剧情总结 -> สรุปเนื้อเรื่อง, 沐夕在午后查看了朋友圈，看到了秦倦、夏阳、朝沐雨和温屿发布的动态 -> มู่ซีดูวงเพื่อนในช่วงบ่าย, เห็นโพสต์ของฉินจวน, ซ่ายาง, เจามู่หยู่, และเวินหยู่
      ];

      console.log('=== ทดสอบรูปแบบที่ถูกต้อง ==='); // Translated: === 测试正确格式 ===
      correctFormats.forEach((content, index) => {
        console.log(`ทดสอบ ${index + 1}: ${content}`); // Translated: 测试
        this.manager.testVisualCircleParsing(content);
      });

      console.log('=== ทดสอบรูปแบบที่ไม่ถูกต้อง (ไม่ควรถูกจับคู่) ==='); // Translated: === 测试错误格式（不应该匹配） ===
      incorrectFormats.forEach((content, index) => {
        console.log(`ทดสอบ ${index + 1}: ${content}`); // Translated: 测试
        this.manager.testVisualCircleParsing(content);
      });
    }

    /**
     * ดีบักการรับเนื้อหาการแชท
     */
    async debugChatContent() {
      console.log('=== กำลังดีบักการรับเนื้อหาการแชท ==='); // Translated: === 调试聊天内容获取 ===

      try {
        const chatContent = await this.getChatContent();
        console.log('ความยาวของเนื้อหาการแชทที่ได้รับ:', chatContent.length); // Translated: 获取到的聊天内容长度
        console.log('500 ตัวอักษรแรกของเนื้อหาการแชท:', chatContent.substring(0, 500)); // Translated: 聊天内容前500字符

        // ตรวจสอบว่ามีรูปแบบวงเพื่อนหรือไม่
        const friendsCircleMatches = chatContent.match(/\[朋友圈[^\]]*\]/g);
        console.log('จำนวนรูปแบบวงเพื่อนที่พบ:', friendsCircleMatches?.length || 0); // Translated: 找到的朋友圈格式数量
        if (friendsCircleMatches) {
          console.log('เนื้อหารูปแบบวงเพื่อน:', friendsCircleMatches); // Translated: 朋友圈格式内容
        }

        // ตรวจสอบว่ามีรูปแบบตารางหรือไม่
        const tableMatches = chatContent.match(/\|[^|]*\|/g);
        console.log('จำนวนรูปแบบตารางที่พบ:', tableMatches?.length || 0); // Translated: 找到的表格格式数量
        if (tableMatches && tableMatches.length > 0) {
          console.log('ตัวอย่างรูปแบบตาราง:', tableMatches.slice(0, 5)); // Translated: 表格格式示例
        }

        // ทดสอบด้วยวิธีการแยกวิเคราะห์ใหม่
        console.log('=== ทดสอบด้วยวิธีการแยกวิเคราะห์ใหม่ ==='); // Translated: === 使用新解析方法测试 ===
        const circles = this.manager.parseFriendsCircleData(chatContent);
        console.log('จำนวนวงเพื่อนที่แยกวิเคราะห์ได้:', circles.size); // Translated: 解析到的朋友圈数量

        circles.forEach((circle, id) => {
          console.log(`วงเพื่อน ${id}:`, {
            // Translated: 朋友圈
            author: circle.author,
            type: circle.type,
            content: circle.content?.substring(0, 100) + '...',
            imageDescription: circle.imageDescription?.substring(0, 100) + '...',
          });
        });
      } catch (error) {
        console.error('ดีบักการรับเนื้อหาการแชทล้มเหลว:', error); // Translated: 调试聊天内容获取失败
      }
    }

    /**
     * ดีบักสถานะระบบฟัง
     */
    debugListenerStatus() {
      console.log('=== ข้อมูลดีบักระบบฟังวงเพื่อน ==='); // Translated: === 朋友圈监听系统调试信息 ===
      console.log('สถานะตัวฟัง:', this.eventListener?.isListening); // Translated: 监听器状态
      console.log('สถานะเปิดใช้งานวงเพื่อน:', this.isActive); // Translated: 朋友圈激活状态
      console.log('จำนวนข้อความปัจจุบัน:', this.eventListener?.getCurrentMessageCount()); // Translated: 当前消息数量
      console.log('จำนวนข้อความล่าสุด:', this.eventListener?.lastMessageCount); // Translated: 上次消息数量

      // ตรวจสอบระบบเหตุการณ์ที่ใช้งานได้
      console.log('ระบบเหตุการณ์ที่ใช้งานได้:'); // Translated: 可用的事件系统
      console.log('- window.SillyTavern:', !!window.SillyTavern);
      console.log('- window.SillyTavern.getContext:', !!window.SillyTavern?.getContext);

      if (window.SillyTavern?.getContext) {
        const context = window.SillyTavern.getContext();
        console.log('- context:', !!context);
        console.log('- context.eventSource:', !!context?.eventSource);
        console.log('- context.event_types:', !!context?.event_types);
        console.log('- context.event_types.MESSAGE_RECEIVED:', context?.event_types?.MESSAGE_RECEIVED);
      }

      console.log('- ฟังก์ชัน eventOn:', typeof eventOn); // Translated: eventOn函数
      console.log('- tavern_events:', typeof tavern_events);
      console.log('- window.parent.eventSource:', !!window.parent?.eventSource);
      console.log('- window.eventSource:', typeof window.eventSource);

      // ตรวจสอบการรับข้อมูลแชท
      console.log('=== การทดสอบการรับข้อมูลแชท ==='); // Translated: === 聊天数据获取测试 ===
      this.testChatDataAccess();

      // บังคับทริกเกอร์การตรวจสอบหนึ่งครั้ง
      if (this.eventListener) {
        console.log('บังคับทริกเกอร์การตรวจสอบข้อความ...'); // Translated: 强制触发消息检查...
        this.eventListener.checkForNewMessages();
      }
    }

    /**
     * ทดสอบการรับข้อมูลแชท
     */
    async testChatDataAccess() {
      console.log('[Debug] กำลังทดสอบการรับข้อมูลแชท...'); // Translated: 测试聊天数据获取...

      // วิธีที่ 1: SillyTavern.getContext
      if (window.SillyTavern?.getContext) {
        try {
          const context = window.SillyTavern.getContext();
          console.log('[Debug] SillyTavern.getContext():', !!context);
          if (context?.chat) {
            console.log('[Debug] context.chat ความยาว:', context.chat.length); // Translated: 长度
            console.log('[Debug] ข้อความล่าสุด:', context.chat[context.chat.length - 1]?.mes?.substring(0, 100)); // Translated: 最后一条消息
          }
        } catch (error) {
          console.log('[Debug] SillyTavern.getContext ข้อผิดพลาด:', error); // Translated: 错误
        }
      }

      // วิธีที่ 2: contextMonitor
      if (window.contextMonitor?.getCurrentChatMessages) {
        try {
          const chatData = await window.contextMonitor.getCurrentChatMessages();
          console.log('[Debug] contextMonitor ข้อมูล:', !!chatData); // Translated: 数据
          if (chatData?.messages) {
            console.log('[Debug] contextMonitor จำนวนข้อความ:', chatData.messages.length); // Translated: 消息数量
          }
        } catch (error) {
          console.log('[Debug] contextMonitor ข้อผิดพลาด:', error); // Translated: 错误
        }
      }

      // วิธีที่ 3: Window แม่
      if (window.parent?.chat) {
        try {
          console.log('[Debug] window.parent.chat ความยาว:', window.parent.chat.length); // Translated: 长度
        } catch (error) {
          console.log('[Debug] window.parent.chat ข้อผิดพลาด:', error); // Translated: 错误
        }
      }
    }

    /**
     * รีสตาร์ทระบบฟัง
     */
    restartListener() {
      console.log('[Friends Circle] กำลังรีสตาร์ทระบบฟัง...'); // Translated: 重启监听系统...
      if (this.eventListener) {
        this.eventListener.stopListening();
        setTimeout(() => {
          this.eventListener.startListening();
        }, 1000);
      }
    }

    /**
     * ดีบักระบบวงเพื่อนทั้งหมด
     */
    debugAll() {
      console.log('=== ดีบักระบบวงเพื่อนทั้งหมด ==='); // Translated: === 朋友圈系统全面调试 ===

      // 1. สถานะพื้นฐาน
      console.log('1. สถานะพื้นฐาน:'); // Translated: 基本状态
      console.log('- อินสแตนซ์วงเพื่อน:', !!this); // Translated: 朋友圈实例
      console.log('- อินสแตนซ์ตัวจัดการ:', !!this.manager); // Translated: 管理器实例
      console.log('- อินสแตนซ์ตัวแสดงผล:', !!this.renderer); // Translated: 渲染器实例
      console.log('- อินสแตนซ์ตัวฟังเหตุการณ์:', !!this.eventListener); // Translated: 事件监听器实例
      console.log('- สถานะเปิดใช้งานวงเพื่อน:', this.isActive); // Translated: 朋友圈激活状态

      // 2. สถานะข้อมูล
      console.log('2. สถานะข้อมูล:'); // Translated: 数据状态
      const circles = this.manager?.getSortedFriendsCircles() || [];
      console.log('- จำนวนวงเพื่อน:', circles.length); // Translated: 朋友圈数量
      circles.forEach((circle, index) => {
        console.log(`- วงเพื่อน ${index + 1}:`, {
          // Translated: 朋友圈
          id: circle.id,
          type: circle.type,
          author: circle.author,
          hasImageDescription: !!circle.imageDescription,
          hasContent: !!circle.content,
        });
      });

      // 3. สถานะ DOM
      console.log('3. สถานะ DOM:'); // Translated: DOM状态
      const circleElements = document.querySelectorAll('.circle-item');
      console.log('- จำนวนองค์ประกอบวงเพื่อนบนหน้า:', circleElements.length); // Translated: 页面上的朋友圈元素数量

      // 4. สถานะป๊อปอัปเผยแพร่
      console.log('4. สถานะป๊อปอัปเผยแพร่:'); // Translated: 发布弹窗状态
      const publishModal = document.querySelector('.friends-circle-publish-modal');
      console.log('- ป๊อปอัปเผยแพร่มีอยู่:', !!publishModal); // Translated: 发布弹窗存在
      if (publishModal) {
        console.log('- การมองเห็นป๊อปอัป:', window.getComputedStyle(publishModal).display); // Translated: 弹窗可见性
        console.log('- ตำแหน่งป๊อปอัป:', publishModal.getBoundingClientRect()); // Translated: 弹窗位置
      }

      // 5. สถานะระบบฟัง
      console.log('5. สถานะระบบฟัง:'); // Translated: 监听系统状态
      this.debugListenerStatus();

      // 6. ทดสอบป๊อปอัปเผยแพร่
      console.log('5. ทดสอบฟังก์ชันป๊อปอัปเผยแพร่:'); // Translated: 测试发布弹窗功能
      if (this.renderer) {
        console.log('- กำลังพยายามแสดงป๊อปอัปเผยแพร่...'); // Translated: 尝试显示发布弹窗...
        this.renderer.showPublishModal();
      }
    }

    /**
     * บังคับเปิดใช้งานวงเพื่อน (แก้ไขปัญหาการเปิดใช้งาน)
     */
    async forceActivate() {
      console.log('[Friends Circle] กำลังบังคับเปิดใช้งานวงเพื่อน...'); // Translated: 强制激活朋友圈...

      // 1. บังคับตั้งค่าสถานะเปิดใช้งาน
      this.isActive = true;
      console.log('[Friends Circle] สถานะเปิดใช้งานถูกตั้งค่าเป็น true'); // Translated: 激活状态已设置为 true

      // 2. ตรวจสอบให้แน่ใจว่าส่วนหัวแสดงผลถูกต้อง
      this.updateHeader();

      // 3. บังคับรีเฟรชข้อมูล
      await this.refreshFriendsCircle();

      // 4. เริ่มตัวฟัง
      if (this.eventListener) {
        this.eventListener.startListening();
        console.log('[Friends Circle] ตัวฟังถูกเริ่มแล้ว'); // Translated: 监听器已启动
      }

      // 5. ตรวจสอบผลลัพธ์
      const circles = this.manager?.getSortedFriendsCircles() || [];
      console.log('[Friends Circle] บังคับเปิดใช้งานเสร็จสมบูรณ์, จำนวนวงเพื่อน:', circles.length); // Translated: 强制激活完成，朋友圈数量

      return circles.length > 0;
    }

    /**
     * ทดสอบระบบจัดเรียงใหม่
     */
    testNewSortingSystem() {
      console.log('=== ทดสอบระบบจัดเรียงใหม่ตามตำแหน่งข้อความ ==='); // Translated: === 测试新的基于消息位置的排序方案 ===

      // รับข้อมูลวงเพื่อนปัจจุบัน
      const circles = this.manager.getSortedFriendsCircles();

      console.log('ผลการจัดเรียงวงเพื่อน:'); // Translated: 朋友圈排序结果
      circles.forEach((circle, index) => {
        console.log(`${index + 1}. ${circle.author} (${circle.id}):`, {
          messageIndex: circle.messageIndex,
          latestActivityIndex: circle.latestActivityIndex,
          repliesCount: circle.replies?.length || 0,
          content: circle.content?.substring(0, 30) + '...',
        });
      });

      // ตรวจสอบว่าจัดเรียงถูกต้องหรือไม่
      let isCorrectlySorted = true;
      for (let i = 1; i < circles.length; i++) {
        if (circles[i - 1].latestActivityIndex < circles[i].latestActivityIndex) {
          isCorrectlySorted = false;
          console.error(
            `จัดเรียงผิดพลาด: ตำแหน่งกิจกรรมของวงเพื่อนที่ตำแหน่ง ${i - 1} (${
              // Translated: 排序错误: 位置
              circles[i - 1].latestActivityIndex
            }) น้อยกว่าตำแหน่งกิจกรรมของวงเพื่อนที่ตำแหน่ง ${i} (${circles[i].latestActivityIndex})`, // Translated: 的朋友圈活动位置, 小于位置, 的朋友圈活动位置
          );
        }
      }

      if (isCorrectlySorted) {
        console.log('✅ ตรวจสอบการจัดเรียงผ่าน: วงเพื่อนถูกจัดเรียงตามตำแหน่งกิจกรรมล่าสุดอย่างถูกต้อง'); // Translated: 排序验证通过：朋友圈按最新活动位置正确排序
      } else {
        console.error('❌ ตรวจสอบการจัดเรียงล้มเหลว: มีข้อผิดพลาดในการจัดเรียง'); // Translated: 排序验证失败：存在排序错误
      }

      console.log('=== ทดสอบการจัดเรียงเสร็จสมบูรณ์ ==='); // Translated: === 排序测试完成 ===
      return { circles, isCorrectlySorted };
    }

    /**
     * ทดสอบระบบอัปเดตแบบเพิ่มหน่วย
     */
    testIncrementalUpdate() {
      console.log('=== ทดสอบระบบอัปเดตแบบเพิ่มหน่วย ==='); // Translated: === 测试增量更新系统 ===

      console.log('สถานะปัจจุบัน:'); // Translated: 当前状态
      console.log('- จำนวนวงเพื่อน:', this.manager.friendsCircleData.size); // Translated: 朋友圈数量
      console.log('- ดัชนีข้อความที่ประมวลผลล่าสุด:', this.manager.lastProcessedMessageIndex); // Translated: 上次处理消息索引

      // บังคับทริกเกอร์การอัปเดตแบบเพิ่มหน่วยหนึ่งครั้ง
      console.log('บังคับทริกเกอร์การอัปเดตแบบเพิ่มหน่วย...'); // Translated: 强制触发增量更新...
      this.manager.refreshData(false);

      console.log('=== ทดสอบการอัปเดตแบบเพิ่มหน่วยเสร็จสมบูรณ์ ==='); // Translated: === 增量更新测试完成 ===
    }

    /**
     * ตรวจสอบความคงทนของข้อมูล
     */
    verifyDataPersistence() {
      console.log('=== ตรวจสอบความคงทนของข้อมูลวงเพื่อน ==='); // Translated: === 验证朋友圈数据持久性 ===

      const manager = this.manager;
      console.log('ID อินสแตนซ์ตัวจัดการ:', manager.constructor.name); // Translated: 管理器实例ID
      console.log('ขนาดข้อมูลวงเพื่อน:', manager.friendsCircleData.size); // Translated: 朋友圈数据大小
      console.log('ดัชนีที่ประมวลผลล่าสุด:', manager.lastProcessedMessageIndex); // Translated: 上次处理索引

      // ตรวจสอบอินสแตนซ์ส่วนกลาง
      console.log('อินสแตนซ์ส่วนกลางมีอยู่:', !!window.friendsCircle); // Translated: 全局实例存在
      console.log('อินสแตนซ์ส่วนกลางเหมือนกับอินสแตนซ์ปัจจุบัน:', window.friendsCircle === this); // Translated: 全局实例与当前实例相同

      if (window.messageApp) {
        console.log('อินสแตนซ์วงเพื่อนของ MessageApp มีอยู่:', !!window.messageApp.friendsCircle); // Translated: MessageApp朋友圈实例存在
        console.log(
          'อินสแตนซ์ MessageApp เหมือนกับอินสแตนซ์ส่วนกลาง:',
          window.messageApp.friendsCircle === window.friendsCircle,
        ); // Translated: MessageApp实例与全局实例相同
      }

      // แสดงข้อมูลวงเพื่อน
      const circles = manager.getSortedFriendsCircles();
      console.log('รายการวงเพื่อน:'); // Translated: 朋友圈列表
      circles.forEach((circle, index) => {
        console.log(`${index + 1}. ${circle.author} (${circle.id}): ${circle.replies?.length || 0} รายการตอบกลับ`); // Translated: 条回复
      });

      console.log('=== ตรวจสอบความคงทนของข้อมูลเสร็จสมบูรณ์ ==='); // Translated: === 数据持久性验证完成 ===
    }

    /**
     * บังคับรีเฟรชข้อมูลวงเพื่อน (สำหรับทดสอบ)
     */
    async forceRefresh() {
      console.log('=== บังคับรีเฟรชข้อมูลวงเพื่อน ==='); // Translated: === 强制刷新朋友圈数据 ===

      try {
        // บังคับรีเฟรชแบบเต็ม
        await this.manager.refreshData(true);

        // อัปเดต UI
        if (this.isActive) {
          this.dispatchUpdateEvent();
        }

        console.log('บังคับรีเฟรชเสร็จสมบูรณ์, จำนวนวงเพื่อน:', this.manager.friendsCircleData.size); // Translated: 强制刷新完成，朋友圈数量
      } catch (error) {
        console.error('บังคับรีเฟรชล้มเหลว:', error); // Translated: 强制刷新失败
      }

      console.log('=== บังคับรีเฟรชเสร็จสมบูรณ์ ==='); // Translated: === 强制刷新完成 ===
    }

    /**
     * ตรวจสอบสถานะหน้าปัจจุบัน
     */
    checkPageStatus() {
      console.log('=== ตรวจสอบสถานะหน้า ==='); // Translated: === 页面状态检查 ===

      // ตรวจสอบสถานะ message-app
      if (window.messageApp) {
        console.log('- messageApp มีอยู่:', true); // Translated: messageApp存在
        console.log('- currentMainTab:', window.messageApp.currentMainTab);
        console.log('- currentView:', window.messageApp.currentView);
        console.log('- อินสแตนซ์ friendsCircle:', !!window.messageApp.friendsCircle); // Translated: friendsCircle实例
        console.log('- สถานะเปิดใช้งาน friendsCircle:', window.messageApp.friendsCircle?.isActive); // Translated: friendsCircle激活状态
      } else {
        console.log('- messageApp มีอยู่:', false); // Translated: messageApp存在
      }

      // ตรวจสอบอินสแตนซ์วงเพื่อนส่วนกลาง
      console.log('- window.friendsCircle มีอยู่:', !!window.friendsCircle); // Translated: window.friendsCircle存在
      console.log('- สถานะเปิดใช้งาน window.friendsCircle:', window.friendsCircle?.isActive); // Translated: window.friendsCircle激活状态

      // ตรวจสอบสถานะ DOM
      const friendsCirclePage = document.querySelector('.friends-circle-page');
      console.log('- องค์ประกอบ DOM หน้าวงเพื่อนมีอยู่:', !!friendsCirclePage); // Translated: 朋友圈页面DOM存在

      return {
        messageAppExists: !!window.messageApp,
        currentTab: window.messageApp?.currentMainTab,
        friendsCircleActive: window.friendsCircle?.isActive,
        domExists: !!friendsCirclePage,
      };
    }

    /**
     * ทดสอบการโต้ตอบป๊อปอัป
     */
    testModalInteraction() {
      console.log('[Friends Circle Debug] ทดสอบการโต้ตอบป๊อปอัป...'); // Translated: 测试弹窗交互...

      const modal = document.querySelector('.friends-circle-publish-modal');
      if (!modal) {
        console.log('[Friends Circle Debug] ป๊อปอัปไม่มีอยู่, กำลังแสดงป๊อปอัปก่อน'); // Translated: 弹窗不存在，先显示弹窗
        this.showPublishModal();
        setTimeout(() => this.testModalInteraction(), 200);
        return;
      }

      console.log('[Friends Circle Debug] พบป๊อปอัป, กำลังทดสอบการคลิกปุ่ม...'); // Translated: 找到弹窗，测试按钮点击...

      const textBtn = modal.querySelector('.text-btn');
      const imageBtn = modal.querySelector('.image-btn');
      const closeBtn = modal.querySelector('.modal-close');
      const overlay = modal.querySelector('.modal-overlay');

      if (textBtn) {
        console.log('[Friends Circle Debug] ทริกเกอร์เหตุการณ์คลิกปุ่มข้อความด้วยตนเอง'); // Translated: 手动触发文字按钮点击事件
        textBtn.click();

        // ลองเรียกเมธอดโดยตรงด้วย
        setTimeout(() => {
          console.log('[Friends Circle Debug] เรียกเมธอด showTextPublishModal โดยตรง'); // Translated: 直接调用showTextPublishModal方法
          this.renderer.showTextPublishModal();
        }, 1000);
      }

      if (closeBtn) {
        setTimeout(() => {
          console.log('[Friends Circle Debug] ทดสอบปุ่มปิด'); // Translated: 测试关闭按钮
          closeBtn.click();
        }, 2000);
      }
    }

    /**
     * ทดสอบป๊อปอัปเผยแพร่ข้อความ
     */
    testTextPublishModal() {
      console.log('[Friends Circle Debug] ทดสอบป๊อปอัปเผยแพร่ข้อความ...'); // Translated: 测试文字发布弹窗...

      const modal = document.querySelector('.friends-circle-text-publish-modal');
      if (!modal) {
        console.log('[Friends Circle Debug] ป๊อปอัปเผยแพร่ข้อความไม่มีอยู่'); // Translated: 文字发布弹窗不存在
        return;
      }

      console.log('[Friends Circle Debug] พบป๊อปอัปเผยแพร่ข้อความ'); // Translated: 找到文字发布弹窗

      // ตรวจสอบสไตล์ป๊อปอัป
      const modalStyle = window.getComputedStyle(modal);
      console.log('[Friends Circle Debug] สไตล์ป๊อปอัปข้อความ:', {
        // Translated: 文字弹窗样式
        display: modalStyle.display,
        position: modalStyle.position,
        zIndex: modalStyle.zIndex,
        visibility: modalStyle.visibility,
        opacity: modalStyle.opacity,
        pointerEvents: modalStyle.pointerEvents,
      });

      // ตรวจสอบปุ่ม
      const cancelBtn = modal.querySelector('.cancel-btn');
      const sendBtn = modal.querySelector('.send-btn');
      const closeBtn = modal.querySelector('.modal-close');
      const textInput = modal.querySelector('.text-input');

      console.log('[Friends Circle Debug] องค์ประกอบป๊อปอัปข้อความ:', {
        // Translated: 文字弹窗元素
        cancelBtn: !!cancelBtn,
        sendBtn: !!sendBtn,
        closeBtn: !!closeBtn,
        textInput: !!textInput,
      });

      // ทดสอบช่องป้อนข้อมูล
      if (textInput) {
        console.log('[Friends Circle Debug] ทดสอบช่องป้อนข้อมูล...'); // Translated: 测试输入框...
        textInput.value = 'เนื้อหาข้อความทดสอบ'; // Translated: 测试文字内容
        textInput.dispatchEvent(new Event('input'));
        console.log('[Friends Circle Debug] ค่าช่องป้อนข้อมูล:', textInput.value); // Translated: 输入框值
      }

      // ทดสอบการคลิกปุ่ม
      if (cancelBtn) {
        setTimeout(() => {
          console.log('[Friends Circle Debug] ทดสอบปุ่มยกเลิก'); // Translated: 测试取消按钮
          cancelBtn.click();
        }, 1000);
      }
    }

    /**
     * บังคับซ่อมแซมการโต้ตอบป๊อปอัป
     */
    fixModalInteraction() {
      console.log('[Friends Circle Debug] บังคับซ่อมแซมการโต้ตอบป๊อปอัป...'); // Translated: 强制修复弹窗交互...

      // ค้นหาป๊อปอัปทั้งหมด
      const publishModal = document.querySelector('.friends-circle-publish-modal');
      const textModal = document.querySelector('.friends-circle-text-publish-modal');

      [publishModal, textModal].forEach((modal, index) => {
        if (!modal) return;

        const modalType = index === 0 ? 'เลือกเผยแพร่' : 'เผยแพร่ข้อความ'; // Translated: 发布选择, 文字发布
        console.log(`[Friends Circle Debug] กำลังซ่อมแซมป๊อปอัป ${modalType}...`); // Translated: 修复${modalType}弹窗...

        // บังคับตั้งค่าสไตล์
        modal.style.zIndex = '99999';
        modal.style.pointerEvents = 'auto';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';

        // ซ่อมแซมพื้นที่เนื้อหา
        const content = modal.querySelector('.modal-content');
        if (content) {
          content.style.pointerEvents = 'auto';
          content.style.zIndex = '100000';
          content.style.position = 'relative';
        }

        // ซ่อมแซมปุ่มทั้งหมด
        const buttons = modal.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.style.pointerEvents = 'auto';
          btn.style.zIndex = '100001';
          btn.style.position = 'relative';

          // เพิ่มเหตุการณ์คลิกสำหรับดีบัก
          btn.addEventListener(
            'click',
            e => {
              console.log(`[Friends Circle Debug] ปุ่มถูกคลิก:`, btn.className, e); // Translated: 按钮被点击
            },
            true,
          );
        });

        // ซ่อมแซมช่องป้อนข้อมูล
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.style.pointerEvents = 'auto';
          input.style.zIndex = '100001';
        });

        console.log(`[Friends Circle Debug] ป๊อปอัป ${modalType} ซ่อมแซมเสร็จสมบูรณ์`); // Translated: ${modalType}弹窗修复完成
      });
    }
  }

  // ส่งออกคลาสไปยังส่วนกลาง
  window.FriendsCircleManager = FriendsCircleManager;
  window.FriendsCircleEventListener = FriendsCircleEventListener;
  window.FriendsCircleRenderer = FriendsCircleRenderer;
  window.FriendsCircle = FriendsCircle;

  console.log('[Friends Circle] โมดูลวงเพื่อนโหลดเสร็จสมบูรณ์'); // Translated: 朋友圈模块加载完成
}
