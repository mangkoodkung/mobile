/**
 * ตัวจัดการ UI ฟอรัม
 * รับผิดชอบการแสดงผลหน้าฟอรัมและการประมวลผลข้อมูล
 */
class ForumUI {
  constructor() {
    this.currentThreadId = null;
    this.clickHandler = null;
    this.subReplyEventsbound = false;
    this.likeClickHandler = null;
    // ที่เก็บข้อมูลการกดถูกใจ - รูปแบบ: { threadId: { likes: number, isLiked: boolean }, ... }
    this.likesData = {};
    // ที่เก็บข้อมูลการกดถูกใจของการตอบกลับ - รูปแบบ: { replyId: { likes: number, isLiked: boolean }, ... }
    this.replyLikesData = {};

    // อาร์เรย์สีอวตาร
    this.avatarColors = [
      'var(--avatar-gradient-1)', // ไล่ระดับสีชมพูเดิม
      'var(--avatar-color-1)', // #b28cb9
      'var(--avatar-color-2)', // #e2b3d4
      'var(--avatar-color-3)', // #f7d1e6
      'var(--avatar-color-4)', // #d49ec2
      'var(--avatar-color-5)', // #f3c6d7
      'var(--avatar-color-6)', // #ec97b7
      'var(--avatar-color-7)', // #d66a88
      'var(--avatar-color-8)', // #b74d66
      'var(--avatar-color-9)', // #e3d6a7
      'var(--avatar-color-10)', // #c8ac6d
      'var(--avatar-color-11)', // #a0d8e1
      'var(--avatar-color-12)', // #2e8b9b
      'var(--avatar-color-13)', // #1a6369
      'var(--avatar-color-14)', // #0e3d45
      'var(--avatar-color-15)', // #6ba1e1
      'var(--avatar-color-16)', // #1f5e8d
      'var(--avatar-color-17)', // #b7d3a8
      'var(--avatar-color-18)', // #3e7b41
      'var(--avatar-color-19)', // #f9e79f
      'var(--avatar-color-20)', // #a3b4e2
    ];

    this.init();
  }

  init() {
    console.log('[Forum UI] เริ่มต้นตัวจัดการ UI ฟอรัม');
  }

  /**
   * สร้างค่าแฮชที่เสถียรจากชื่อผู้ใช้
   */
  hashUsername(username) {
    let hash = 0;
    if (username.length === 0) return hash;

    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // แปลงเป็นจำนวนเต็ม 32 บิต
    }

    return Math.abs(hash);
  }

  /**
   * รับสีอวตารตามชื่อผู้ใช้
   */
  getAvatarColor(username) {
    const hash = this.hashUsername(username);
    const colorIndex = hash % this.avatarColors.length;
    return this.avatarColors[colorIndex];
  }

  /**
   * สร้าง HTML อวตารพร้อมสี
   */
  generateAvatarHTML(username, size = '') {
    const color = this.getAvatarColor(username);
    const sizeClass = size ? ` ${size}` : '';
    const initial = username[0] || '?';

    return `<div class="author-avatar${sizeClass}" style="background: ${color}">${initial}</div>`;
  }

  /**
   * แยกเนื้อหาฟอรัมจากข้อความแบบเรียลไทม์
   */
  parseForumContent(content) {
    // ดึงเนื้อหาระหว่างเครื่องหมายฟอรัม
    const forumRegex = /<!-- FORUM_CONTENT_START -->([\s\S]*?)<!-- FORUM_CONTENT_END -->/;
    const match = content.match(forumRegex);

    if (!match) {
      console.log('[Forum UI] ไม่พบเนื้อหาฟอรัม');
      return { threads: [], replies: {} };
    }

    const forumContent = match[1];
    const threads = [];
    const replies = {};

    // แยกรูปแบบหัวข้อ: [标题|ชื่อเล่นผู้โพสต์|ID กระทู้|เนื้อหาหัวข้อ|รายละเอียดกระทู้]
    const titleRegex = /\[标题\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    // แยกรูปแบบการตอบกลับ: [回复|ชื่อเล่นผู้ตอบกลับ|ID กระทู้|เนื้อหาตอบกลับ]
    const replyRegex = /\[回复\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    // แยกรูปแบบการตอบกลับซ้อน: [楼中楼|ชื่อเล่นผู้ตอบกลับ|ID กระทู้|ชั้นหลัก|เนื้อหาตอบกลับ]
    const subReplyRegex = /\[楼中楼\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

    let match_title;
    let match_reply;
    let match_subreply;

    // แยกหัวข้อ
    while ((match_title = titleRegex.exec(forumContent)) !== null) {
      const thread = {
        id: match_title[2],
        author: match_title[1],
        title: match_title[3],
        content: match_title[4],
        replies: [],
        timestamp: new Date().toLocaleString(),
      };

      threads.push(thread);
      replies[thread.id] = [];
    }

    // แยกการตอบกลับทั่วไป
    while ((match_reply = replyRegex.exec(forumContent)) !== null) {
      const reply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        threadId: match_reply[2],
        author: match_reply[1],
        content: match_reply[3],
        timestamp: new Date().toLocaleString(),
        type: 'reply',
        subReplies: [],
      };

      if (!replies[reply.threadId]) {
        replies[reply.threadId] = [];
      }
      replies[reply.threadId].push(reply);
    }

    // แยกการตอบกลับซ้อน
    while ((match_subreply = subReplyRegex.exec(forumContent)) !== null) {
      const subReply = {
        id: `subreply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        threadId: match_subreply[2],
        author: match_subreply[1],
        parentFloor: match_subreply[3],
        content: match_subreply[4],
        timestamp: new Date().toLocaleString(),
        type: 'subreply',
      };

      if (!replies[subReply.threadId]) {
        replies[subReply.threadId] = [];
      }

      // หาชั้นหลักที่ตรงกันและเพิ่มเข้าไปใน subReplies
      const parentReply = replies[subReply.threadId].find(
        r =>
          r.author === subReply.parentFloor ||
          r.id === subReply.parentFloor ||
          replies[subReply.threadId].indexOf(r) + 2 === parseInt(subReply.parentFloor),
      );

      if (parentReply) {
        if (!parentReply.subReplies) {
          parentReply.subReplies = [];
        }
        parentReply.subReplies.push(subReply);
      } else {
        // หากไม่พบชั้นหลัก ให้ถือเป็นการตอบกลับทั่วไป
        subReply.type = 'reply';
        subReply.subReplies = [];
        replies[subReply.threadId].push(subReply);
      }
    }

    // อัปเดตจำนวนการตอบกลับของกระทู้ที่เกี่ยวข้อง
    threads.forEach(thread => {
      if (replies[thread.id]) {
        thread.replies = replies[thread.id];
      }
    });

    console.log('[Forum UI] แยกข้อมูลเสร็จสิ้น จำนวนกระทู้:', threads.length);
    return { threads, replies };
  }

  /**
   * รับ HTML หน้าหลักของฟอรัม
   */
  getForumMainHTML() {
    return `
            <div class="forum-app">
                <!-- เนื้อหาฟอรัม -->
                <div class="forum-content" id="forum-content">
                    ${this.getThreadListHTML()}
                </div>

                <!-- กล่องโต้ตอบโพสต์กระทู้ -->
                <div class="post-dialog" id="post-dialog" style="display: none;">
                    <div class="dialog-overlay" id="dialog-overlay"></div>
                    <div class="dialog-content">
                        <div class="dialog-header">
                            <h3>โพสต์กระทู้ใหม่</h3>
                            <button class="close-btn" id="close-dialog-btn">×</button>
                        </div>
                        <div class="dialog-body">
                            <input type="text" class="post-title-input" id="post-title" placeholder="กรุณาใส่หัวข้อกระทู้...">
                            <textarea class="post-content-input" id="post-content" placeholder="แชร์ความคิดของคุณ..."></textarea>
                        </div>
                        <div class="dialog-footer">
                            <button class="cancel-btn" id="cancel-post-btn">ยกเลิก</button>
                            <button class="submit-btn" id="submit-post-btn">✈</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * รับ HTML รายการกระทู้
   */
  getThreadListHTML() {
    // ดึงข้อมูลฟอรัมจากข้อความแบบเรียลไทม์
    const forumData = this.getCurrentForumData();

    if (forumData.threads.length === 0) {
      return `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <div class="empty-text">ยังไม่มีกระทู้</div>
                    <div class="empty-hint">แตะปุ่มโพสต์ที่มุมขวาบนเพื่อเริ่มพูดคุย~</div>
                </div>
            `;
    }

    // เรียงกระทู้ตามเวลากิจกรรมล่าสุด (ล่าสุดอยู่ด้านบน)
    const sortedThreads = forumData.threads.slice().sort((a, b) => {
      // คำนวณเวลากิจกรรมล่าสุดของแต่ละกระทู้
      const getLatestActivityTime = thread => {
        let latestTime = new Date(thread.timestamp || Date.now());

        if (thread.replies && thread.replies.length > 0) {
          thread.replies.forEach(reply => {
            const replyTime = new Date(reply.timestamp || Date.now());
            if (replyTime > latestTime) {
              latestTime = replyTime;
            }

            // ตรวจสอบการตอบกลับซ้อน
            if (reply.subReplies && reply.subReplies.length > 0) {
              reply.subReplies.forEach(subReply => {
                const subReplyTime = new Date(subReply.timestamp || Date.now());
                if (subReplyTime > latestTime) {
                  latestTime = subReplyTime;
                }
              });
            }
          });
        }

        return latestTime;
      };

      const aLatest = getLatestActivityTime(a);
      const bLatest = getLatestActivityTime(b);

      return bLatest - aLatest; // เรียงจากมากไปน้อย ล่าสุดอยู่ด้านบน
    });

    return sortedThreads
      .map(
        thread => `
            <div class="thread-item" data-thread-id="${thread.id}">
                <div class="thread-header">
                    ${this.generateAvatarHTML(thread.author)}
                    <div class="thread-author">
                        <div class="author-name">${thread.author}</div>
                    </div>
                    <div class="thread-id">ID: t${thread.id}</div>
                    <button class="delete-btn forum-delete-btn" data-thread-id="${thread.id}" title="ลบกระทู้">ลบ</button>
                </div>
                <div class="post-content">
                    <h2 class="thread-title">${thread.title}</h2>
                    <div class="thread-content">${this.formatContent(thread.content)}</div>
                </div>
                <div class="thread-stats">
                    <div class="thread-actions">
                        <button class="action-btn like-btn" data-thread-id="${thread.id}">
                            <i class="${this.getLikeIconClass(thread.id)} fa-heart"></i> ${this.getLikeCount(thread.id)}
                        </button>
                        <button class="action-btn"><i class="far fa-comment-dots"></i> ${thread.replies.length}</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join('');
  }

  /**
   * รับข้อมูลฟอรัมปัจจุบันจากข้อความ
   */
  getCurrentForumData() {
    try {
      if (window.mobileContextEditor) {
        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (chatData && chatData.messages && chatData.messages.length > 0) {
          // ตรวจสอบว่าข้อความแรกมีเนื้อหาฟอรัมหรือไม่
          const firstMessage = chatData.messages[0];
          if (firstMessage && firstMessage.mes) {
            return this.parseForumContent(firstMessage.mes);
          }
        }
      }
    } catch (error) {
      console.warn('[Forum UI] ดึงข้อมูลฟอรัมล้มเหลว:', error);
    }

    return { threads: [], replies: {} };
  }

  /**
   * รับ HTML รายละเอียดกระทู้
   */
  getThreadDetailHTML(threadId) {
    // ดึงข้อมูลฟอรัมจากข้อความแบบเรียลไทม์
    const forumData = this.getCurrentForumData();
    const thread = forumData.threads.find(t => t.id === threadId);
    if (!thread) return '<div class="error">ไม่พบกระทู้</div>';

    const replies = forumData.replies[threadId] || [];

    return `
            <div class="thread-detail">
                <!-- กระทู้หลัก -->
                <div class="main-post">
                    <div class="post-header">
                        ${this.generateAvatarHTML(thread.author, 'large')}
                        <div class="author-info">
                            <span class="author-name">${thread.author}</span>
                        </div>
                    </div>
                    <h2 class="post-title">${thread.title}</h2>
                    <div class="post-meta">
                        <span class="thread-id">ID: t${thread.id}</span>
                    </div>
                    <div class="post-full-content">${this.formatContent(thread.content)}</div>
                    <div class="post-actions">
                        <button class="action-btn like-btn" data-thread-id="${thread.id}">
                            <i class="${this.getLikeIconClass(thread.id)} fa-heart"></i> ${this.getLikeCount(thread.id)}
                        </button>
                        <button class="action-btn"><i class="far fa-comment-dots"></i> ${replies.length}</button>
                    </div>
                </div>

                <!-- รายการตอบกลับ -->
                <div class="reply-list">
                    <div class="reply-header">
                        <h4>การตอบกลับทั้งหมด (${replies.length})</h4>
                    </div>
                    ${this.getRepliesHTML(replies)}
                </div>

                <!-- กล่องป้อนการตอบกลับ -->
                <div class="comment-input-bar">
                    <input type="text" class="reply-input" id="reply-input" placeholder="แสดงความคิดเห็นของคุณ">
                    <button class="action-btn submit-reply-btn" id="submit-reply-btn" style="color: var(--accent-pink); font-size: 16px;"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
  }

  /**
   * รับ HTML รายการตอบกลับ
   */
  getRepliesHTML(replies) {
    if (replies.length === 0) {
      return `
                <div class="no-replies">
                    <div class="no-replies-icon">💭</div>
                    <div class="no-replies-text">ยังไม่มีการตอบกลับ มาเป็นคนแรกกันเลย~</div>
                </div>
            `;
    }

    return replies
      .map((reply, index) => {
        const floorNumber = index + 2;
        return `
                <div class="reply-item" data-floor="${floorNumber}" data-reply-id="${reply.id}">
                    <div class="reply-header">
                        <div class="reply-author">
                            ${this.generateAvatarHTML(reply.author)}
                            <div class="author-info">
                                <span class="author-name">${reply.author}</span>
                                <span class="reply-time">${reply.timestamp}</span>
                            </div>
                        </div>
                        <div class="reply-meta">
                            <span class="floor-number">ชั้น ${floorNumber}</span>
                        </div>
                    </div>
                    <div class="reply-content">${this.formatContent(reply.content)}</div>
                    <div class="reply-actions">
                        <button class="action-btn like-reply" data-reply-id="${reply.id}">
                            <i class="${this.getReplyLikeIconClass(reply.id)} fa-heart"></i> ${this.getReplyLikeCount(
                              reply.id,
                            )}
                        </button>
                        <button class="action-btn reply-to-reply" data-reply-to="${
                          reply.author
                        }" data-floor="${floorNumber}" data-reply-id="${
                          reply.id
                        }"><i class="fas fa-reply"></i> ตอบกลับ</button>
                    </div>

                    <!-- การตอบกลับซ้อน -->
                    ${this.getSubRepliesHTML(reply.subReplies || [], floorNumber)}

                    <!-- กล่องป้อนการตอบกลับซ้อน -->
                    <div class="sub-reply-input-container" id="sub-reply-input-${reply.id}" style="display: none;">
                        <div class="sub-reply-input-box">
                            <div class="sub-reply-target">ตอบกลับ ${reply.author}:</div>
                            <textarea class="sub-reply-input" placeholder="เขียนการตอบกลับของคุณ..." rows="2"></textarea>
                            <div class="sub-reply-actions">
                                <button class="cancel-sub-reply-btn" data-reply-id="${reply.id}">ยกเลิก</button>
                                <button class="submit-sub-reply-btn" data-reply-id="${
                                  reply.id
                                }" data-parent-floor="${floorNumber}" data-parent-author="${reply.author}">✈</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      })
      .join('');
  }

  /**
   * รับ HTML การตอบกลับซ้อน
   */
  getSubRepliesHTML(subReplies, parentFloor) {
    if (!subReplies || subReplies.length === 0) {
      return '';
    }

    return `
            <div class="sub-replies-container">
                <div class="sub-replies-header">
                    <span class="sub-replies-count">${subReplies.length} การตอบกลับ</span>
                </div>
                <div class="sub-replies-list">
                    ${subReplies
                      .map(
                        subReply => `
                        <div class="sub-reply-item" data-sub-reply-id="${subReply.id}">
                            <div class="sub-reply-author">
                                ${this.generateAvatarHTML(subReply.author, 'small')}
                                <span class="author-name">${subReply.author}</span>
                                <span class="sub-reply-time">${subReply.timestamp}</span>
                            </div>
                            <div class="sub-reply-content">${this.formatContent(subReply.content)}</div>
                            <div class="sub-reply-actions">
                                <button class="action-btn like-sub-reply">👍 ${Math.floor(Math.random() * 5)}</button>
                                <button class="action-btn reply-to-sub-reply" data-reply-to="${
                                  subReply.author
                                }" data-parent-floor="${parentFloor}">ตอบกลับ</button>
                            </div>
                        </div>
                    `,
                      )
                      .join('')}
                </div>
            </div>
        `;
  }

  /**
   * จัดรูปแบบเนื้อหา (จัดการสติกเกอร์ ฯลฯ)
   */
  formatContent(content) {
    // จัดการเครื่องหมายสติกเกอร์
    let formatted = content.replace(/表情:\s*([^,\s]+)/g, '<span class="emoji-placeholder">[$1]</span>');

    // จัดการการ @ ผู้ใช้ (หากมี)
    formatted = formatted.replace(/@([^\s]+)/g, '<span class="mention">@$1</span>');

    // จัดการการขึ้นบรรทัดใหม่
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  /**
   * ผูกอีเวนต์
   */
  bindEvents() {
    // ลบ event listener ก่อนหน้า (หากมี)
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }

    // อีเวนต์คลิกกระทู้
    this.clickHandler = e => {
      // จัดการเฉพาะอีเวนต์คลิกในพื้นที่เนื้อหาฟอรัม
      const forumContent = document.getElementById('forum-content');
      if (!forumContent || !forumContent.contains(e.target)) {
        return;
      }

      // จัดการการคลิกปุ่มลบ
      if (e.target.closest('.forum-delete-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const deleteBtn = e.target.closest('.forum-delete-btn');
        const threadId = deleteBtn.dataset.threadId;
        if (threadId) {
          this.deleteThread(threadId);
        }
        return;
      }

      if (e.target.closest('.thread-item')) {
        const threadItem = e.target.closest('.thread-item');
        const threadId = threadItem.dataset.threadId;
        this.showThreadDetail(threadId);
      }
    };

    document.addEventListener('click', this.clickHandler);

    // ปุ่มโพสต์กระทู้
    const newPostBtn = document.getElementById('new-post-btn');
    if (newPostBtn) {
      newPostBtn.addEventListener('click', () => this.showPostDialog());
    }

    // ปุ่มรีเฟรช
    const refreshBtn = document.getElementById('refresh-forum-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshForum());
    }

    // ปุ่มตั้งค่าฟอรัม
    const forumControlBtn = document.getElementById('forum-control-btn');
    if (forumControlBtn) {
      forumControlBtn.addEventListener('click', () => this.showForumControl());
    }

    // ปุ่มสร้างเนื้อหาตัวอย่าง
    const generateBtn = document.getElementById('generate-demo-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateDemoContent());
    }

    // อีเวนต์เกี่ยวกับกล่องโต้ตอบ
    this.bindDialogEvents();

    // อีเวนต์เกี่ยวกับการตอบกลับซ้อน
    this.bindSubReplyEvents();

    // อีเวนต์ปุ่มตอบกลับหลัก
    this.bindMainReplyEvents();

    // อีเวนต์ปุ่มถูกใจ
    this.bindLikeEvents();
  }

  /**
   * ผูกอีเวนต์ของกล่องโต้ตอบ
   */
  bindDialogEvents() {
    // ปิดกล่องโต้ตอบ
    const closeBtn = document.getElementById('close-dialog-btn');
    const cancelBtn = document.getElementById('cancel-post-btn');
    const overlay = document.getElementById('dialog-overlay');

    [closeBtn, cancelBtn, overlay].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.hidePostDialog());
      }
    });

    // ส่งโพสต์
    const submitBtn = document.getElementById('submit-post-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitNewPost());
    }
  }

  /**
   * แสดงรายละเอียดกระทู้
   */
  showThreadDetail(threadId) {
    this.currentThreadId = threadId;

    // พุชสถานะใหม่ลงในสแต็กแอป (พุชเฉพาะเมื่อสถานะเปลี่ยนแปลง)
    if (window.mobilePhone) {
      const currentState = window.mobilePhone.currentAppState;
      const shouldPushState =
        !currentState ||
        currentState.app !== 'forum' ||
        currentState.view !== 'threadDetail' ||
        currentState.threadId !== threadId;

      if (shouldPushState) {
        const state = {
          app: 'forum',
          title: 'รายละเอียดกระทู้',
          view: 'threadDetail',
          threadId: threadId,
        };
        window.mobilePhone.pushAppState(state);
        console.log('[Forum UI] พุชสถานะรายละเอียดกระทู้:', state);
      }
    }

    // อัปเดตเนื้อหา
    const forumContent = document.getElementById('forum-content');
    if (forumContent) {
      forumContent.innerHTML = this.getThreadDetailHTML(threadId);
    } else {
      console.error('[Forum UI] ไม่พบ element forum-content');
    }

    // ผูกอีเวนต์การตอบกลับ
    this.bindReplyEvents();
  }

  /**
   * ผูกอีเวนต์การตอบกลับ
   */
  bindReplyEvents() {
    // ลบการผูกอีเวนต์ตรงนี้ออก เพื่อไม่ให้ขัดแย้งกับ bindMainReplyEvents()
    // อีเวนต์ของ submit-reply-btn ถูกจัดการใน bindMainReplyEvents() แล้ว
    // อีเวนต์การตอบกลับซ้อนถูกผูกใน bindEvents() แล้ว ไม่จำเป็นต้องผูกซ้ำ
    // this.bindSubReplyEvents();
  }

  /**
   * ผูกอีเวนต์การกดถูกใจ
   */
  bindLikeEvents() {
    // ลบ event listener ก่อนหน้า (หากมี)
    if (this.likeClickHandler) {
      document.removeEventListener('click', this.likeClickHandler);
    }

    this.likeClickHandler = e => {
      // จัดการการคลิกปุ่มถูกใจกระทู้
      if (e.target.closest('.like-btn[data-thread-id]')) {
        e.preventDefault();
        e.stopPropagation();

        const button = e.target.closest('.like-btn[data-thread-id]');
        const threadId = button.dataset.threadId;

        if (threadId) {
          this.toggleThreadLike(threadId);
        }
      }

      // จัดการการคลิกปุ่มถูกใจการตอบกลับ
      if (e.target.closest('.like-reply[data-reply-id]')) {
        e.preventDefault();
        e.stopPropagation();

        const button = e.target.closest('.like-reply[data-reply-id]');
        const replyId = button.dataset.replyId;

        if (replyId) {
          this.toggleReplyLike(replyId);
        }
      }
    };

    document.addEventListener('click', this.likeClickHandler);
  }

  /**
   * ผูกอีเวนต์การตอบกลับหลัก
   */
  bindMainReplyEvents() {
    // ลบ event listener ก่อนหน้า (หากมี)
    if (this.mainReplyClickHandler) {
      document.removeEventListener('click', this.mainReplyClickHandler);
    }

    this.mainReplyClickHandler = e => {
      // จัดการการคลิกปุ่มตอบกลับหลัก
      if (e.target.closest('.action-btn') && e.target.closest('.action-btn').querySelector('i.fa-comment-dots')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleCommentInput();
      }

      // จัดการปุ่มส่งการตอบกลับ
      if (e.target.closest('#submit-reply-btn')) {
        e.preventDefault();
        e.stopPropagation();
        this.submitMainReply();
      }
    };

    document.addEventListener('click', this.mainReplyClickHandler);
  }

  /**
   * สลับสถานะการแสดงผลของกล่องป้อนความคิดเห็น
   */
  toggleCommentInput() {
    const inputBar = document.querySelector('.comment-input-bar');
    if (inputBar) {
      inputBar.classList.toggle('show');
      if (inputBar.classList.contains('show')) {
        // โฟกัสไปที่กล่องป้อน
        const input = inputBar.querySelector('input');
        if (input) {
          setTimeout(() => input.focus(), 100);
        }
      }
    }
  }

  /**
   * ส่งการตอบกลับหลัก
   */
  submitMainReply() {
    const input = document.querySelector('.comment-input-bar input');
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
      alert('กรุณาใส่เนื้อหาการตอบกลับ');
      return;
    }

    // ดึงข้อมูลกระทู้ปัจจุบัน
    const forumData = this.getCurrentForumData();
    const currentThread = forumData.threads.find(t => t.id === this.currentThreadId);

    if (!currentThread) {
      alert('ไม่พบข้อมูลกระทู้ปัจจุบัน');
      return;
    }

    // สร้างคำนำหน้าการตอบกลับ: 我回复帖子'ผู้เขียน|ID กระทู้|หัวข้อกระทู้'
    const threadPrefix = `我回复帖子'${currentThread.author}|${currentThread.id}|${currentThread.title}'`;

    // สร้างรูปแบบการตอบกลับ
    const replyFormat = `[回复|我|${this.currentThreadId}|${content}]`;

    // ส่งการตอบกลับโดยตรง ไม่ต้องยืนยัน
    // ล้างกล่องป้อนและซ่อน
    input.value = '';
    const inputBar = document.querySelector('.comment-input-bar');
    if (inputBar) {
      inputBar.classList.remove('show');
    }

    // แสดงการแจ้งเตือนส่งสำเร็จ
    if (window.showMobileToast) {
      window.showMobileToast('📤 ส่งการตอบกลับแล้ว', 'success');
    } else {
      // หากไม่มีฟังก์ชัน toast ให้ใช้ alert แบบง่าย
      setTimeout(() => {
        alert('ส่งการตอบกลับแล้ว');
      }, 100);
    }

    // ส่งการตอบกลับไปยัง AI โดยตรง
    if (window.forumManager.sendReplyToAPI) {
      const fullReply = `${threadPrefix}\n${replyFormat}`;
      console.log('[Forum UI] ส่งการตอบกลับหลักไปยัง AI:', fullReply);

      window.forumManager
        .sendReplyToAPI(fullReply)
        .then(() => {
          console.log('[Forum UI] การตอบกลับถูกส่งไปยังโมเดลผ่าน API แล้ว เนื้อหาฟอรัมได้รับการอัปเดต');
          // รีเฟรชเนื้อหาฟอรัม
          setTimeout(() => {
            this.refreshThreadList();
          }, 500);
        })
        .catch(error => {
          console.error('[Forum UI] ส่งการตอบกลับผ่าน API ล้มเหลว:', error);
          if (window.showMobileToast) {
            window.showMobileToast('❌ ส่งการตอบกลับล้มเหลว กรุณาลองใหม่', 'error');
          } else {
            alert('ส่งการตอบกลับล้มเหลว กรุณาลองใหม่');
          }
        });
    } else {
      if (window.showMobileToast) {
        window.showMobileToast('❌ ฟังก์ชันตอบกลับใช้งานไม่ได้', 'error');
      } else {
        alert('ฟังก์ชันตอบกลับใช้งานไม่ได้ กรุณาตรวจสอบการตั้งค่าตัวจัดการฟอรัม');
      }
    }
  }

  /**
   * ผูกอีเวนต์การตอบกลับซ้อน
   */
  bindSubReplyEvents() {
    // หลีกเลี่ยงการผูก event listener ซ้ำ
    if (this.subReplyEventsbound) {
      return;
    }
    this.subReplyEventsbound = true;

    // อีเวนต์คลิกปุ่มตอบกลับ
    this.subReplyClickHandler = e => {
      if (e.target.classList.contains('reply-to-reply')) {
        const replyId = e.target.dataset.replyId;
        this.showSubReplyInput(replyId);
      }

      if (e.target.classList.contains('cancel-sub-reply-btn')) {
        const replyId = e.target.dataset.replyId;
        this.hideSubReplyInput(replyId);
      }

      if (e.target.classList.contains('submit-sub-reply-btn')) {
        const replyId = e.target.dataset.replyId;
        const parentFloor = e.target.dataset.parentFloor;
        const parentAuthor = e.target.dataset.parentAuthor;
        this.submitSubReply(replyId, parentFloor, parentAuthor);
      }
    };

    document.addEventListener('click', this.subReplyClickHandler);
  }

  /**
   * แสดงกล่องป้อนการตอบกลับซ้อน
   */
  showSubReplyInput(replyId) {
    // ซ่อนกล่องป้อนการตอบกลับอื่นๆ ทั้งหมด
    document.querySelectorAll('.sub-reply-input-container').forEach(container => {
      container.style.display = 'none';
    });

    // แสดงกล่องป้อนการตอบกลับปัจจุบัน
    const container = document.getElementById(`sub-reply-input-${replyId}`);
    if (container) {
      container.style.display = 'block';
      // โฟกัสไปที่กล่องป้อน
      const textarea = container.querySelector('.sub-reply-input');
      if (textarea) {
        textarea.focus();
      }
    }
  }

  /**
   * ซ่อนกล่องป้อนการตอบกลับซ้อน
   */
  hideSubReplyInput(replyId) {
    const container = document.getElementById(`sub-reply-input-${replyId}`);
    if (container) {
      container.style.display = 'none';
      // ล้างกล่องป้อน
      const textarea = container.querySelector('.sub-reply-input');
      if (textarea) {
        textarea.value = '';
      }
    }
  }

  /**
   * ส่งการตอบกลับซ้อน
   */
  submitSubReply(replyId, parentFloor, parentAuthor) {
    const container = document.getElementById(`sub-reply-input-${replyId}`);
    if (!container) return;

    const textarea = container.querySelector('.sub-reply-input');
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
      alert('กรุณาใส่เนื้อหาการตอบกลับ');
      return;
    }

    // ดึงข้อมูลฟอรัมปัจจุบัน หาข้อมูลความคิดเห็นที่ถูกตอบกลับ
    const forumData = this.getCurrentForumData();
    const currentReplies = forumData.replies[this.currentThreadId] || [];

    // ค้นหาความคิดเห็นที่ถูกตอบกลับ
    let parentReply = null;
    for (const reply of currentReplies) {
      if (reply.id === replyId || reply.author === parentAuthor) {
        parentReply = reply;
        break;
      }
    }

    if (!parentReply) {
      alert('ไม่พบข้อมูลความคิดเห็นที่ถูกตอบกลับ');
      return;
    }

    // สร้างคำนำหน้าความคิดเห็น: 我回复评论'ผู้เขียน|ID กระทู้|เนื้อหาความคิดเห็น'
    const commentPrefix = `我回复评论'${parentReply.author}|${this.currentThreadId}|${parentReply.content}'`;

    // สร้างรูปแบบการตอบกลับซ้อน: [回复|我|ID กระทู้|回复ผู้เขียน:เนื้อหาตอบกลับ]
    const replyFormat = `[回复|我|${this.currentThreadId}|回复${parentReply.author}：${content}]`;

    const subReplyData = {
      type: 'subreply',
      threadId: this.currentThreadId,
      parentFloor: parentFloor,
      parentAuthor: parentAuthor,
      content: content,
      prefix: commentPrefix,
      replyFormat: replyFormat,
    };

    // เรียกตัวจัดการฟอรัมเพื่อส่งการตอบกลับซ้อน
    this.sendReplyToForum(subReplyData);

    // ซ่อนกล่องป้อน
    this.hideSubReplyInput(replyId);
  }

  /**
   * แสดงกล่องโต้ตอบโพสต์กระทู้
   */
  showPostDialog() {
    const dialog = document.getElementById('post-dialog');
    if (dialog) {
      dialog.style.display = 'flex';
      // ล้างกล่องป้อน
      document.getElementById('post-title').value = '';
      document.getElementById('post-content').value = '';
    }
  }

  /**
   * ซ่อนกล่องโต้ตอบโพสต์กระทู้
   */
  hidePostDialog() {
    const dialog = document.getElementById('post-dialog');
    if (dialog) {
      dialog.style.display = 'none';
    }
  }

  /**
   * ส่งกระทู้ใหม่
   */
  submitNewPost() {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
      alert('กรุณาใส่หัวข้อและเนื้อหา');
      return;
    }

    // ซ่อนกล่องโต้ตอบ
    this.hidePostDialog();

    if (!window.forumManager) {
      alert('ตัวจัดการฟอรัมยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง');
      return;
    }

    // สร้างรูปแบบโพสต์: [标题|我|ID กระทู้|เนื้อหาหัวข้อ|รายละเอียดกระทู้]
    // ID กระทู้กำหนดเป็นสี่ตัวอักษร ให้โมเดลคิดเอง
    const postFormat = `[标题|我|帖子|${title}|${content}]`;

    console.log('[Forum UI] ผู้ใช้โพสต์กระทู้:', { title, content, postFormat });

    // โพสต์กระทู้โดยตรง ไม่ต้องยืนยัน
    // แสดงการแจ้งเตือนโพสต์สำเร็จ
    if (window.showMobileToast) {
      window.showMobileToast('📝 โพสต์กระทู้แล้ว', 'success');
    } else {
      // หากไม่มีฟังก์ชัน toast ให้ใช้ alert แบบง่าย
      setTimeout(() => {
        alert('โพสต์กระทู้แล้ว');
      }, 100);
    }

    // เรียก API โพสต์กระทู้ของตัวจัดการฟอรัม
    if (window.forumManager.sendPostToAPI) {
      window.forumManager
        .sendPostToAPI(postFormat)
        .then(() => {
          console.log('[Forum UI] โพสต์กระทู้แล้ว');
          // รีเฟรชเนื้อหาฟอรัม
          setTimeout(() => {
            this.refreshThreadList();
          }, 1000);
        })
        .catch(error => {
          console.error('[Forum UI] โพสต์กระทู้ล้มเหลว:', error);
          if (window.showMobileToast) {
            window.showMobileToast('❌ โพสต์ล้มเหลว กรุณาลองใหม่', 'error');
          } else {
            alert('โพสต์ล้มเหลว กรุณาลองใหม่');
          }
        });
    } else {
      if (window.showMobileToast) {
        window.showMobileToast('❌ ฟังก์ชันโพสต์ใช้งานไม่ได้', 'error');
      } else {
        alert('ฟังก์ชันโพสต์ใช้งานไม่ได้ กรุณาตรวจสอบการตั้งค่าตัวจัดการฟอรัม');
      }
      console.error('[Forum UI] ไม่พบเมธอด sendPostToAPI');
    }
  }

  /**
   * ส่งการตอบกลับ
   */
  submitReply() {
    if (!this.currentThreadId) return;

    const content = document.getElementById('reply-input').value.trim();
    if (!content) {
      alert('กรุณาใส่เนื้อหาการตอบกลับ');
      return;
    }

    // ล้างกล่องป้อน
    document.getElementById('reply-input').value = '';

    // ดึงข้อมูลกระทู้ปัจจุบัน
    const forumData = this.getCurrentForumData();
    const currentThread = forumData.threads.find(t => t.id === this.currentThreadId);

    if (!currentThread) {
      alert('ไม่พบข้อมูลกระทู้ปัจจุบัน');
      return;
    }

    // สร้างคำนำหน้าการตอบกลับ: 我回复帖子'ผู้เขียน|ID กระทู้|หัวข้อและเนื้อหากระทู้'
    const threadPrefix = `我回复帖子'${currentThread.author}|${currentThread.id}|${currentThread.title}'`;

    // สร้างรูปแบบการตอบกลับทั่วไป: [回复|我|ID กระทู้|เนื้อหาตอบกลับ]
    const replyFormat = `[回复|我|${this.currentThreadId}|${content}]`;

    const replyData = {
      type: 'reply',
      threadId: this.currentThreadId,
      content: content,
      prefix: threadPrefix,
      replyFormat: replyFormat,
    };

    // เรียกตัวจัดการฟอรัมเพื่อส่งการตอบกลับ
    this.sendReplyToForum(replyData);
  }

  /**
   * ส่งการตอบกลับไปยังตัวจัดการฟอรัม
   */
  sendReplyToForum(replyData) {
    if (!window.forumManager) {
      alert('ตัวจัดการฟอรัมยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง');
      return;
    }

    console.log('[Forum UI] ส่งการตอบกลับไปยังตัวจัดการฟอรัม:', replyData);

    // ส่งการตอบกลับโดยตรง ไม่ต้องยืนยัน
    // แสดงการแจ้งเตือนส่งสำเร็จ
    if (window.showMobileToast) {
      window.showMobileToast('📤 ส่งการตอบกลับแล้ว', 'success');
    } else {
      // หากไม่มีฟังก์ชัน toast ให้ใช้ alert แบบง่าย
      setTimeout(() => {
        alert('ส่งการตอบกลับแล้ว');
      }, 100);
    }

    // ส่งการตอบกลับไปยังโมเดลผ่าน API โดยตรง ให้ AI สร้างเนื้อหาฟอรัมที่สมบูรณ์ซึ่งรวมการตอบกลับของผู้ใช้
    if (window.forumManager.sendReplyToAPI) {
      const fullReply = `${replyData.prefix}\n${replyData.replyFormat}`;
      console.log('[Forum UI] ส่งการตอบกลับให้ AI สร้างเนื้อหาฟอรัมที่สมบูรณ์:', fullReply);

      window.forumManager
        .sendReplyToAPI(fullReply)
        .then(() => {
          console.log('[Forum UI] การตอบกลับถูกส่งไปยังโมเดลผ่าน API แล้ว เนื้อหาฟอรัมได้รับการอัปเดต');

          // รีเฟรชเนื้อหาฟอรัม
          setTimeout(() => {
            this.refreshThreadList();
          }, 500);
        })
        .catch(error => {
          console.error('[Forum UI] ส่งการตอบกลับผ่าน API ล้มเหลว:', error);
          if (window.showMobileToast) {
            window.showMobileToast('❌ ส่งการตอบกลับล้มเหลว กรุณาลองใหม่', 'error');
          } else {
            alert('ส่งการตอบกลับล้มเหลว กรุณาลองใหม่');
          }
        });
    } else {
      // หากฟังก์ชัน API ไม่พร้อมใช้งาน ให้ย้อนกลับไปใช้โหมดแทรก
      console.warn('[Forum UI] ฟังก์ชันส่งผ่าน API ไม่พร้อมใช้งาน ย้อนกลับไปใช้โหมดแทรกโดยตรง');
      if (window.forumManager.insertReplyToFirstLayer) {
        window.forumManager
          .insertReplyToFirstLayer(replyData.prefix, replyData.replyFormat)
          .then(() => {
            console.log('[Forum UI] การตอบกลับถูกแทรกในชั้นแรกแล้ว');
            // รีเฟรชเนื้อหาฟอรัม
            setTimeout(() => {
              this.refreshThreadList();
            }, 500);
          })
          .catch(error => {
            console.error('[Forum UI] แทรกการตอบกลับล้มเหลว:', error);
            if (window.showMobileToast) {
              window.showMobileToast('❌ ส่งการตอบกลับล้มเหลว กรุณาลองใหม่', 'error');
            } else {
              alert('ส่งการตอบกลับล้มเหลว กรุณาลองใหม่');
            }
          });
      } else {
        if (window.showMobileToast) {
          window.showMobileToast('❌ ฟังก์ชันตอบกลับใช้งานไม่ได้', 'error');
        } else {
          alert('ฟังก์ชันตอบกลับต้องสร้างเนื้อหาฟอรัมใหม่ผ่านตัวจัดการฟอรัม กรุณาใช้ฟังก์ชันของตัวจัดการฟอรัม');
        }
        console.log('[Forum UI] ผู้ใช้พยายามตอบกลับ:', replyData);
      }
    }
  }

  /**
   * รีเฟรชฟอรัม
   */
  refreshForum() {
    console.log('[Forum UI] รีเฟรชเนื้อหาฟอรัม');
    this.refreshThreadList();
  }

  /**
   * รีเฟรชรายการกระทู้
   */
  refreshThreadList() {
    const content = document.getElementById('forum-content');
    if (content) {
      content.innerHTML = this.getThreadListHTML();
    }
  }

  /**
   * สร้างเนื้อหาตัวอย่าง
   */
  generateDemoContent() {
    if (window.forumManager) {
      console.log('[Forum UI] เรียกตัวจัดการฟอรัมเพื่อสร้างเนื้อหา');
      window.forumManager.generateForumContent().then(() => {
        // หลังจากสร้างเสร็จให้รีเฟรชหน้าจอ
        setTimeout(() => {
          this.refreshThreadList();
        }, 1000);
      });
    } else {
      console.warn('[Forum UI] ไม่พบตัวจัดการฟอรัม');
      alert('ตัวจัดการฟอรัมยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง');
    }
  }

  /**
   * กลับไปยังรายการหลัก
   */
  showMainList() {
    this.currentThreadId = null;

    // อัปเดตสถานะไปยังรายการหลักของฟอรัม
    if (window.mobilePhone) {
      const currentState = window.mobilePhone.currentAppState;
      if (currentState && currentState.app === 'forum' && currentState.view !== 'main') {
        const mainState = {
          app: 'forum',
          title: 'ฟอรัม',
          view: 'main',
        };
        // แทนที่สถานะปัจจุบันแทนที่จะพุชสถานะใหม่
        window.mobilePhone.currentAppState = mainState;
        window.mobilePhone.updateAppHeader(mainState);
        console.log('[Forum UI] อัปเดตสถานะไปยังรายการหลักของฟอรัม:', mainState);
      }
    }

    const forumContent = document.getElementById('forum-content');
    if (forumContent) {
      forumContent.innerHTML = this.getThreadListHTML();
      // ผูกอีเวนต์รายการหลักใหม่
      if (window.bindForumEvents) {
        window.bindForumEvents();
      }
    }
  }

  /**
   * แสดงแผงควบคุมฟอรัม
   */
  showForumControl() {
    // พุชสถานะใหม่ลงในสแต็กแอป สลับไปยังหน้าควบคุมฟอรัม
    if (window.mobilePhone) {
      const state = {
        app: 'forum',
        title: 'ตั้งค่าฟอรัม',
        view: 'forumControl',
      };
      window.mobilePhone.pushAppState(state);
    }

    // หากไม่มีเฟรมเวิร์กมือถือ ให้ย้อนกลับไปใช้แผงป๊อปอัปเดิม
    if (!window.mobilePhone && window.forumManager) {
      window.forumManager.showForumPanel();
    }
  }

  // รีเซ็ตสถานะ UI ฟอรัม
  resetState() {
    console.log('[Forum UI] รีเซ็ตสถานะ UI ฟอรัม');
    this.currentThreadId = null;
    this.currentView = 'main';

    // ล้าง event listener
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.likeClickHandler) {
      document.removeEventListener('click', this.likeClickHandler);
      this.likeClickHandler = null;
    }
    if (this.mainReplyClickHandler) {
      document.removeEventListener('click', this.mainReplyClickHandler);
      this.mainReplyClickHandler = null;
    }

    // รีเซ็ตไปยังมุมมองรายการหลัก
    this.showMainList();

    console.log('[Forum UI] รีเซ็ตสถานะ UI ฟอรัมเสร็จสิ้น');
  }

  /**
   * เริ่มต้นข้อมูลการกดถูกใจกระทู้
   */
  initThreadLikeData(threadId) {
    if (!this.likesData[threadId]) {
      this.likesData[threadId] = {
        likes: Math.floor(Math.random() * 50) + 10, // จำนวนการกดถูกใจเริ่มต้นแบบสุ่ม
        isLiked: false,
      };
    }
  }

  /**
   * เริ่มต้นข้อมูลการกดถูกใจการตอบกลับ
   */
  initReplyLikeData(replyId) {
    if (!this.replyLikesData[replyId]) {
      this.replyLikesData[replyId] = {
        likes: Math.floor(Math.random() * 10) + 1, // จำนวนการกดถูกใจเริ่มต้นแบบสุ่ม
        isLiked: false,
      };
    }
  }

  /**
   * รับจำนวนการกดถูกใจกระทู้
   */
  getLikeCount(threadId) {
    this.initThreadLikeData(threadId);
    return this.likesData[threadId].likes;
  }

  /**
   * รับชื่อคลาสไอคอนการกดถูกใจกระทู้
   */
  getLikeIconClass(threadId) {
    this.initThreadLikeData(threadId);
    return this.likesData[threadId].isLiked ? 'fas' : 'far';
  }

  /**
   * รับจำนวนการกดถูกใจการตอบกลับ
   */
  getReplyLikeCount(replyId) {
    this.initReplyLikeData(replyId);
    return this.replyLikesData[replyId].likes;
  }

  /**
   * รับชื่อคลาสไอคอนการกดถูกใจการตอบกลับ
   */
  getReplyLikeIconClass(replyId) {
    this.initReplyLikeData(replyId);
    return this.replyLikesData[replyId].isLiked ? 'fas' : 'far';
  }

  /**
   * สลับสถานะการกดถูกใจกระทู้
   */
  toggleThreadLike(threadId) {
    this.initThreadLikeData(threadId);
    const likeData = this.likesData[threadId];

    if (likeData.isLiked) {
      // ยกเลิกการกดถูกใจ
      likeData.likes--;
      likeData.isLiked = false;
    } else {
      // กดถูกใจ
      likeData.likes++;
      likeData.isLiked = true;
    }

    // อัปเดตปุ่มถูกใจที่เกี่ยวข้องทั้งหมด
    this.updateAllThreadLikeButtons(threadId);

    return likeData;
  }

  /**
   * สลับสถานะการกดถูกใจการตอบกลับ
   */
  toggleReplyLike(replyId) {
    this.initReplyLikeData(replyId);
    const likeData = this.replyLikesData[replyId];

    if (likeData.isLiked) {
      // ยกเลิกการกดถูกใจ
      likeData.likes--;
      likeData.isLiked = false;
    } else {
      // กดถูกใจ
      likeData.likes++;
      likeData.isLiked = true;
    }

    // อัปเดตปุ่มถูกใจที่เกี่ยวข้องทั้งหมด
    this.updateAllReplyLikeButtons(replyId);

    return likeData;
  }

  /**
   * อัปเดตปุ่มถูกใจกระทู้ทั้งหมด
   */
  updateAllThreadLikeButtons(threadId) {
    const buttons = document.querySelectorAll(`.like-btn[data-thread-id="${threadId}"]`);
    const likeData = this.likesData[threadId];

    buttons.forEach(button => {
      const icon = button.querySelector('i');
      const textNode = button.childNodes[button.childNodes.length - 1];

      if (icon) {
        icon.className = likeData.isLiked ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = likeData.isLiked ? '#e74c3c' : '';
      }

      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ` ${likeData.likes}`;
      }

      // เพิ่มเอฟเฟกต์อนิเมชันการกดถูกใจ
      if (likeData.isLiked) {
        button.classList.add('liked');
        this.addLikeAnimation(button);
      } else {
        button.classList.remove('liked');
      }
    });
  }

  /**
   * อัปเดตปุ่มถูกใจการตอบกลับทั้งหมด
   */
  updateAllReplyLikeButtons(replyId) {
    const buttons = document.querySelectorAll(`.like-reply[data-reply-id="${replyId}"]`);
    const likeData = this.replyLikesData[replyId];

    buttons.forEach(button => {
      const icon = button.querySelector('i');
      const textNode = button.childNodes[button.childNodes.length - 1];

      if (icon) {
        icon.className = likeData.isLiked ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = likeData.isLiked ? '#e74c3c' : '';
      }

      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ` ${likeData.likes}`;
      }

      // เพิ่มเอฟเฟกต์อนิเมชันการกดถูกใจ
      if (likeData.isLiked) {
        button.classList.add('liked');
        this.addLikeAnimation(button);
      } else {
        button.classList.remove('liked');
      }
    });
  }

  /**
   * เพิ่มเอฟเฟกต์อนิเมชันการกดถูกใจ
   */
  addLikeAnimation(button) {
    // เพิ่มอนิเมชันย่อขยาย
    button.style.transform = 'scale(1.2)';
    button.style.transition = 'transform 0.2s ease';

    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 200);

    // สร้างอนิเมชันหัวใจลอย
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.style.cssText = `
      position: absolute;
      pointer-events: none;
      font-size: 16px;
      z-index: 1000;
      animation: heartFloat 1s ease-out forwards;
    `;

    // รับตำแหน่งปุ่ม
    const rect = button.getBoundingClientRect();
    const phoneContainer = document.querySelector('.mobile-phone-container');
    const phoneRect = phoneContainer ? phoneContainer.getBoundingClientRect() : { left: 0, top: 0 };

    heart.style.left = rect.left - phoneRect.left + rect.width / 2 + 'px';
    heart.style.top = rect.top - phoneRect.top + 'px';

    // เพิ่มลงในคอนเทนเนอร์มือถือแทน body
    if (phoneContainer) {
      phoneContainer.appendChild(heart);
    } else {
      document.body.appendChild(heart);
    }

    // ลบ element อนิเมชัน
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
      }
    }, 1000);
  }

  /**
   * ลบกระทู้ฟอรัมและการตอบกลับทั้งหมด
   */
  async deleteThread(threadId) {
    console.log('[Forum UI] เริ่มลบกระทู้:', threadId);

    try {
      // แสดงกล่องโต้ตอบยืนยัน
      if (
        !confirm(
          `คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้ ID: t${threadId} พร้อมการตอบกลับทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        )
      ) {
        return;
      }

      // ดึงข้อมูลแชทปัจจุบัน
      if (!window.mobileContextEditor) {
        throw new Error('ตัวแก้ไขบริบทยังไม่พร้อม');
      }

      const chatData = window.mobileContextEditor.getCurrentChatData();
      if (!chatData || !chatData.messages || chatData.messages.length === 0) {
        throw new Error('ไม่มีข้อมูลแชท');
      }

      // ดึงข้อความแรก (ที่มีเนื้อหาฟอรัม)
      const firstMessage = chatData.messages[0];
      if (!firstMessage || !firstMessage.mes) {
        throw new Error('ไม่พบเนื้อหาฟอรัม');
      }

      let content = firstMessage.mes;

      // ดึงเนื้อหาระหว่างเครื่องหมายฟอรัม
      const forumRegex = /<!-- FORUM_CONTENT_START -->([\s\S]*?)<!-- FORUM_CONTENT_END -->/;
      const match = content.match(forumRegex);

      if (!match) {
        throw new Error('ไม่พบเครื่องหมายเนื้อหาฟอรัม');
      }

      let forumContent = match[1];

      // ลบทุกรูปแบบที่มี ID กระทู้ที่ระบุ
      // ลบกระทู้หลัก: [标题|ชื่อเล่นผู้โพสต์|ID กระทู้|เนื้อหาหัวข้อ|รายละเอียดกระทู้]
      const titleRegex = new RegExp(`\\[标题\\|[^|]+\\|${threadId}\\|[^|]+\\|[^\\]]+\\]`, 'g');
      forumContent = forumContent.replace(titleRegex, '');

      // ลบการตอบกลับทั่วไป: [回复|ชื่อเล่นผู้ตอบกลับ|ID กระทู้|เนื้อหาตอบกลับ]
      const replyRegex = new RegExp(`\\[回复\\|[^|]+\\|${threadId}\\|[^\\]]+\\]`, 'g');
      forumContent = forumContent.replace(replyRegex, '');

      // ลบการตอบกลับซ้อน: [楼中楼|ชื่อเล่นผู้ตอบกลับ|ID กระทู้|ชั้นหลัก|เนื้อหาตอบกลับ]
      const subReplyRegex = new RegExp(`\\[楼中楼\\|[^|]+\\|${threadId}\\|[^|]+\\|[^\\]]+\\]`, 'g');
      forumContent = forumContent.replace(subReplyRegex, '');

      // ล้างบรรทัดว่างที่เกินมา
      forumContent = forumContent.replace(/\n{3,}/g, '\n\n');

      // สร้างเนื้อหาข้อความใหม่
      const newContent = content.replace(
        /<!-- FORUM_CONTENT_START -->[\s\S]*?<!-- FORUM_CONTENT_END -->/,
        `<!-- FORUM_CONTENT_START -->${forumContent}<!-- FORUM_CONTENT_END -->`,
      );

      // อัปเดตเนื้อหาข้อความ
      await window.mobileContextEditor.modifyMessage(0, newContent);

      console.log('[Forum UI] ✅ ลบกระทู้สำเร็จ:', threadId);

      // แสดงการแจ้งเตือนสำเร็จ
      if (window.showMobileToast) {
        window.showMobileToast('🗑️ ลบกระทู้แล้ว', 'success');
      } else {
        alert('ลบกระทู้แล้ว');
      }

      // รีเฟรชเนื้อหาฟอรัม
      setTimeout(() => {
        this.refreshThreadList();
      }, 500);
    } catch (error) {
      console.error('[Forum UI] ลบกระทู้ล้มเหลว:', error);
      if (window.showMobileToast) {
        window.showMobileToast('❌ ลบล้มเหลว: ' + error.message, 'error');
      } else {
        alert('ลบล้มเหลว: ' + error.message);
      }
    }
  }
}

// สร้างอินสแตนซ์ส่วนกลาง
window.ForumUI = ForumUI;
window.forumUI = new ForumUI();

// ฟังก์ชันส่วนกลางเพื่อรับเนื้อหาแอปฟอรัม
window.getForumAppContent = function () {
  return window.forumUI.getForumMainHTML();
};

// ฟังก์ชันส่วนกลางเพื่อผูกอีเวนต์แอปฟอรัม
window.bindForumEvents = function () {
  if (window.forumUI) {
    window.forumUI.bindEvents();
    console.log('[Forum UI] ผูกอีเวนต์เสร็จสิ้น');
  }
};

console.log('[Forum UI] โหลดโมดูล UI ฟอรัมเสร็จสิ้น');
