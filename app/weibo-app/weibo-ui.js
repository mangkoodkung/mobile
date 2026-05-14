/**
 * ตัวจัดการ UI Weibo
 * รับผิดชอบการแสดงผลและการประมวลผลข้อมูลของอินเทอร์เฟซ Weibo
 */
class WeiboUI {
  constructor() {
    this.currentPage = 'hot'; // หน้าปัจจุบัน: hot, ranking, user
    this.currentPostId = null;
    this.clickHandler = null;
    this.likeClickHandler = null;
    // เก็บข้อมูลการกดถูกใจ - รูปแบบ: { postId: { likes: number, isLiked: boolean }, ... }
    this.likesData = {};
    // เก็บข้อมูลการกดถูกใจของความคิดเห็น - รูปแบบ: { commentId: { likes: number, isLiked: boolean }, ... }
    this.commentLikesData = {};

    // อาร์เรย์สีของอวาตาร์
    this.avatarColors = [
      'var(--avatar-gradient-1)', // gradient สีชมพูเดิม
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

    // เวอร์ชันปรับปรุง โซลูชันที่ 5: ตรวจจับการเปลี่ยนแปลงข้อมูลและการแทนที่แบบเพิ่ม
    this.lastDataFingerprints = {
      hotSearches: null,
      rankings: null,
      rankingPosts: null,
      userStats: null,
      lastUpdateTime: 0,
    };
    this.persistentData = {
      hotSearches: [],
      rankings: [],
      rankingPosts: [], // เก็บโพสต์ของอันดับแยกต่างหาก
      userStats: null,
    };

    this.init();
  }

  init() {
    console.log('[Weibo UI] เริ่มต้นตัวจัดการ UI Weibo');

    // 🔥 เพิ่มใหม่: เริ่มการตรวจสอบเลย์เอาต์ของความคิดเห็น
    this.startCommentLayoutMonitor();
  }

  /**
   * 🔥 ตัวตรวจสอบเลย์เอาต์ของความคิดเห็น - ป้องกันเลย์เอาต์ผิดพลาดจาก CSS ถูกเขียนทับ
   */
  startCommentLayoutMonitor() {
    // สร้าง MutationObserver เพื่อตรวจสอบการเปลี่ยนแปลง DOM
    const observer = new MutationObserver(mutations => {
      let needsLayoutFix = false;

      mutations.forEach(mutation => {
        // ตรวจสอบว่ามี element ความคิดเห็นใหม่ถูกเพิ่มหรือไม่
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('comment-item') || node.querySelector?.('.comment-item')) {
                needsLayoutFix = true;
              }
            }
          });
        }

        // ตรวจสอบว่า attribute สไตล์ถูกแก้ไขหรือไม่
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'style' || mutation.attributeName === 'class')
        ) {
          const target = mutation.target;
          if (target.classList?.contains('comment-author') || target.classList?.contains('comment-info')) {
            needsLayoutFix = true;
          }
        }
      });

      if (needsLayoutFix) {
        // หน่วงเวลาในการแก้ไข เพื่อหลีกเลี่ยงการทำงานบ่อยเกินไป
        clearTimeout(this.layoutFixTimeout);
        this.layoutFixTimeout = setTimeout(() => {
          this.fixCommentLayout();
        }, 100);
      }
    });

    // เริ่มสังเกต container ของแอป Weibo ทั้งหมด
    const weiboApp = document.querySelector('.weibo-app');
    if (weiboApp) {
      observer.observe(weiboApp, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });

      console.log('[Weibo UI] 🔥 เริ่มตัวตรวจสอบเลย์เอาต์ของความคิดเห็นแล้ว');
    }

    // ดำเนินการแก้ไขเลย์เอาต์ทันทีหนึ่งครั้ง
    this.fixCommentLayout();
  }

  /**
   * 🔥 แก้ไขเลย์เอาต์ของความคิดเห็น - บังคับใช้สไตล์ CSS ที่ถูกต้อง
   */
  fixCommentLayout() {
    const commentItems = document.querySelectorAll('.weibo-app .comment-item');
    let fixedCount = 0;

    commentItems.forEach(commentItem => {
      const commentAuthor = commentItem.querySelector('.comment-author');
      const commentInfo = commentItem.querySelector('.comment-info');
      const commentContent = commentItem.querySelector('.comment-content');
      const commentActions = commentItem.querySelector('.comment-actions');

      if (commentAuthor) {
        // บังคับให้ส่วนผู้เขียนความคิดเห็นเป็นเลย์เอาต์แนวนอน
        const authorStyle = commentAuthor.style;
        const authorComputed = window.getComputedStyle(commentAuthor);

        if (authorComputed.flexDirection !== 'row' || authorComputed.display !== 'flex') {
          authorStyle.setProperty('display', 'flex', 'important');
          authorStyle.setProperty('flex-direction', 'row', 'important');
          authorStyle.setProperty('align-items', 'center', 'important');
          authorStyle.setProperty('flex-wrap', 'nowrap', 'important');
          authorStyle.setProperty('gap', '8px', 'important');
          fixedCount++;
        }
      }

      if (commentInfo) {
        // บังคับให้ส่วนข้อมูลความคิดเห็นเป็นเลย์เอาต์แนวตั้ง
        const infoStyle = commentInfo.style;
        const infoComputed = window.getComputedStyle(commentInfo);

        if (infoComputed.flexDirection !== 'column' || infoComputed.display !== 'flex') {
          infoStyle.setProperty('display', 'flex', 'important');
          infoStyle.setProperty('flex-direction', 'column', 'important');
          infoStyle.setProperty('flex', '1', 'important');
          infoStyle.setProperty('min-width', '0', 'important');
          fixedCount++;
        }
      }

      if (commentContent) {
        // ตรวจสอบให้แน่ใจว่าเนื้อหาความคิดเห็นแสดงผลถูกต้อง
        const contentStyle = commentContent.style;
        contentStyle.setProperty('display', 'block', 'important');
        contentStyle.setProperty('width', '100%', 'important');
        contentStyle.setProperty('margin-bottom', '8px', 'important');
      }

      if (commentActions) {
        // ตรวจสอบให้แน่ใจว่าปุ่มดำเนินการของความคิดเห็นมีเลย์เอาต์ถูกต้อง
        const actionsStyle = commentActions.style;
        const actionsComputed = window.getComputedStyle(commentActions);

        if (actionsComputed.flexDirection !== 'row' || actionsComputed.display !== 'flex') {
          actionsStyle.setProperty('display', 'flex', 'important');
          actionsStyle.setProperty('flex-direction', 'row', 'important');
          actionsStyle.setProperty('align-items', 'center', 'important');
          actionsStyle.setProperty('justify-content', 'center', 'important');
          actionsStyle.setProperty('gap', '20px', 'important');
        }
      }
    });

    if (fixedCount > 0) {
      console.log(`[Weibo UI] 🔧 แก้ไข ${fixedCount} ปัญหาเลย์เอาต์ของความคิดเห็นแล้ว`);
    }
  }

  /**
   * 🔥 แก้ไขเลย์เอาต์ของความคิดเห็นด้วยตนเอง - คำสั่งคอนโซลที่จัดเตรียมให้ผู้ใช้
   */
  static manualFixCommentLayout() {
    console.log('[Weibo UI] 🔧 แก้ไขเลย์เอาต์ของความคิดเห็นด้วยตนเอง...');

    const commentItems = document.querySelectorAll('.weibo-app .comment-item');
    let fixedCount = 0;

    commentItems.forEach((commentItem, index) => {
      console.log(`[Weibo UI] ตรวจสอบความคิดเห็น ${index + 1}/${commentItems.length}`);

      const commentAuthor = commentItem.querySelector('.comment-author');
      const commentInfo = commentItem.querySelector('.comment-info');
      const commentContent = commentItem.querySelector('.comment-content');
      const commentActions = commentItem.querySelector('.comment-actions');

      // บังคับรีเซ็ตเลย์เอาต์ของรายการความคิดเห็น
      commentItem.style.setProperty('display', 'block', 'important');
      commentItem.style.setProperty('width', '100%', 'important');

      if (commentAuthor) {
        console.log(`[Weibo UI] แก้ไขเลย์เอาต์ผู้เขียนความคิดเห็น ${index + 1}`);
        const authorStyle = commentAuthor.style;

        // ลบสไตล์ที่อาจขัดแย้ง
        authorStyle.removeProperty('flex-direction');
        authorStyle.removeProperty('display');

        // ใช้สไตล์ที่ถูกต้องอีกครั้ง
        authorStyle.setProperty('display', 'flex', 'important');
        authorStyle.setProperty('flex-direction', 'row', 'important');
        authorStyle.setProperty('align-items', 'center', 'important');
        authorStyle.setProperty('flex-wrap', 'nowrap', 'important');
        authorStyle.setProperty('gap', '8px', 'important');
        authorStyle.setProperty('margin-bottom', '8px', 'important');
        authorStyle.setProperty('width', '100%', 'important');
        fixedCount++;
      }

      if (commentInfo) {
        console.log(`[Weibo UI] แก้ไขเลย์เอาต์ข้อมูลความคิดเห็น ${index + 1}`);
        const infoStyle = commentInfo.style;

        // ลบสไตล์ที่อาจขัดแย้ง
        infoStyle.removeProperty('flex-direction');
        infoStyle.removeProperty('display');

        // ใช้สไตล์ที่ถูกต้องอีกครั้ง
        infoStyle.setProperty('display', 'flex', 'important');
        infoStyle.setProperty('flex-direction', 'column', 'important');
        infoStyle.setProperty('flex', '1', 'important');
        infoStyle.setProperty('min-width', '0', 'important');
        infoStyle.setProperty('overflow', 'hidden', 'important');
        fixedCount++;
      }

      if (commentContent) {
        const contentStyle = commentContent.style;
        contentStyle.setProperty('display', 'block', 'important');
        contentStyle.setProperty('width', '100%', 'important');
        contentStyle.setProperty('margin-bottom', '8px', 'important');
      }

      if (commentActions) {
        const actionsStyle = commentActions.style;
        actionsStyle.setProperty('display', 'flex', 'important');
        actionsStyle.setProperty('flex-direction', 'row', 'important');
        actionsStyle.setProperty('align-items', 'center', 'important');
        actionsStyle.setProperty('justify-content', 'center', 'important');
        actionsStyle.setProperty('gap', '20px', 'important');
        actionsStyle.setProperty('margin-top', '8px', 'important');
        actionsStyle.setProperty('width', '100%', 'important');
      }
    });

    console.log(
      `[Weibo UI] ✅ การแก้ไขด้วยตนเองเสร็จสมบูรณ์ ประมวลผล ${commentItems.length} รายการความคิดเห็น แก้ไข ${fixedCount} ปัญหาเลย์เอาต์`,
    );
    return { total: commentItems.length, fixed: fixedCount };
  }

  /**
   * คำนวณลายนิ้วมือข้อมูล (แฮชแบบเบา)
   */
  calculateDataFingerprint(data, type) {
    if (!data) return null;

    let content = '';
    switch (type) {
      case 'hotSearches':
        content = data.map(item => `${item.rank}:${item.title}:${item.heat}`).join('|');
        break;
      case 'rankings':
        content = data
          .map(
            ranking =>
              `${ranking.title}:${ranking.type}:${ranking.items
                .map(item => `${item.rank}:${item.name}:${item.heat}`)
                .join(',')}`,
          )
          .join('|');
        break;
      case 'rankingPosts':
        content = data.map(post => `${post.id}:${post.author}:${post.content.substring(0, 50)}`).join('|');
        break;
      case 'userStats':
        content = data ? `${data.fans}:${data.following}:${data.posts}` : '';
        break;
      default:
        content = JSON.stringify(data);
    }

    // อัลกอริทึมแฮชแบบง่าย (เบา)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // แปลงเป็นจำนวนเต็ม 32 บิต
    }
    return hash.toString();
  }

  /**
   * ตรวจจับว่าข้อมูลมีการเปลี่ยนแปลงหรือไม่
   */
  detectDataChanges(newContent) {
    const currentTime = Date.now();
    const changes = {
      hotSearches: false,
      rankings: false,
      rankingPosts: false,
      userStats: false,
      hasAnyChange: false,
    };

    // ตรวจจับว่ามีรูปแบบข้อมูลต่าง ๆ อยู่หรือไม่
    const hasHotSearchPattern = /\[热搜\|/.test(newContent);
    const hasRankingPattern = /\[榜单\|/.test(newContent) || /\[榜单项\|/.test(newContent);
    const hasRankingPostPattern = /\[博文\|[^|]+\|r\d+\|/.test(newContent); // ID ของโพสต์อันดับขึ้นต้นด้วย r
    const hasUserStatsPattern = /\[粉丝数\|/.test(newContent);

    console.log('[Weibo UI] 🔍 ตรวจจับรูปแบบข้อมูล:', {
      hasHotSearchPattern,
      hasRankingPattern,
      hasRankingPostPattern,
      hasUserStatsPattern,
    });

    // ทำเครื่องหมายว่าต้องอัปเดตเฉพาะเมื่อพบรูปแบบที่สอดคล้องเท่านั้น
    if (hasHotSearchPattern) {
      changes.hotSearches = true;
      changes.hasAnyChange = true;
      console.log('[Weibo UI] ✅ ตรวจพบการอัปเดตข้อมูลยอดนิยม');
    }

    if (hasRankingPattern) {
      changes.rankings = true;
      changes.hasAnyChange = true;
      console.log('[Weibo UI] ✅ ตรวจพบการอัปเดตข้อมูลอันดับ');
    }

    if (hasRankingPostPattern) {
      changes.rankingPosts = true;
      changes.hasAnyChange = true;
      console.log('[Weibo UI] ✅ ตรวจพบการอัปเดตโพสต์อันดับ');
    }

    if (hasUserStatsPattern) {
      changes.userStats = true;
      changes.hasAnyChange = true;
      console.log('[Weibo UI] ✅ ตรวจพบการอัปเดตข้อมูลแฟน');
    }

    // อัปเดตเวลาตรวจจับล่าสุด
    if (changes.hasAnyChange) {
      this.lastDataFingerprints.lastUpdateTime = currentTime;
    }

    return changes;
  }

  /**
   * สร้างค่าแฮชเสถียรจากชื่อผู้ใช้
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
   * ดึงสีของอวาตาร์ตามชื่อผู้ใช้
   */
  getAvatarColor(username) {
    // ตรวจสอบว่าเป็นผู้ใช้ปัจจุบันหรือไม่ (บัญชีหลักหรือบัญชีรอง)
    let currentUsername = this.getCurrentUsername();
    if (currentUsername === '{{user}}') {
      currentUsername = this.getRealUsername();
    }
    const isMainAccount = window.weiboManager ? window.weiboManager.currentAccount.isMainAccount : true;

    // ตรวจสอบว่าเป็นผู้ใช้ปัจจุบันหรือไม่ (รองรับชื่อผู้ใช้หลายรูปแบบ)
    if (
      username === currentUsername ||
      username === '{{user}}' ||
      (username === 'User' && currentUsername === 'User')
    ) {
      // หากเป็นผู้ใช้ปัจจุบัน ส่งคืนสีเฉพาะตามประเภทบัญชี
      return isMainAccount ? '#C4B7D6' : '#A37070';
    }

    // ผู้ใช้อื่นใช้ระบบสีเดิม
    const hash = this.hashUsername(username);
    const colorIndex = hash % this.avatarColors.length;
    return this.avatarColors[colorIndex];
  }

  /**
   * สร้าง HTML ของอวาตาร์ที่มีสี
   */
  generateAvatarHTML(username, size = '') {
    const color = this.getAvatarColor(username);
    const sizeClass = size ? ` ${size}` : '';
    const initial = username[0] || '?';

    return `<div class="author-avatar${sizeClass}" style="background: ${color}">${initial}</div>`;
  }

  /**
   * แยกวิเคราะห์เนื้อหา Weibo จากข้อความแบบเรียลไทม์ (เวอร์ชันปรับปรุง โซลูชันที่ 5: การแทนที่แบบเพิ่ม)
   */
  parseWeiboContent(content) {
    // ดึงเนื้อหาระหว่างเครื่องหมาย Weibo
    const weiboRegex = /<!-- WEIBO_CONTENT_START -->([\s\S]*?)<!-- WEIBO_CONTENT_END -->/;
    const match = content.match(weiboRegex);

    if (!match) {
      console.log('[Weibo UI] ไม่พบเนื้อหา Weibo');
      return {
        posts: [],
        comments: {},
        hotSearches: this.persistentData.hotSearches,
        rankings: this.persistentData.rankings,
        rankingPosts: this.persistentData.rankingPosts,
        userStats: this.persistentData.userStats,
      };
    }

    const weiboContent = match[1];
    console.log('[Weibo UI] 🔍 เริ่มแยกวิเคราะห์เนื้อหา Weibo เปิดใช้งานกลไกการแทนที่แบบเพิ่ม');

    // ตรวจจับการเปลี่ยนแปลงข้อมูล
    const changes = this.detectDataChanges(weiboContent);

    // เริ่มต้นผลลัพธ์การแยกวิเคราะห์
    const posts = [];
    const comments = {};
    let hotSearches = this.persistentData.hotSearches; // ใช้ข้อมูลคงทนเป็นค่าเริ่มต้น
    let rankings = this.persistentData.rankings;
    let rankingPosts = this.persistentData.rankingPosts;
    let userStats = this.persistentData.userStats;

    // แยกวิเคราะห์รูปแบบโพสต์: [博文|ชื่อผู้โพสต์|รหัสโพสต์|เนื้อหาโพสต์]
    const postRegex = /\[博文\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    let postMatch;
    const newRankingPosts = []; // เก็บโพสต์อันดับใหม่ชั่วคราว

    while ((postMatch = postRegex.exec(weiboContent)) !== null) {
      const postId = postMatch[2];
      const post = {
        id: postId,
        author: postMatch[1],
        content: postMatch[3],
        timestamp: new Date().toLocaleString(),
        likes: Math.floor(Math.random() * 1000) + 10, // จำนวนถูกใจสุ่ม
        comments: Math.floor(Math.random() * 100) + 5, // จำนวนความคิดเห็นสุ่ม
        shares: Math.floor(Math.random() * 50) + 1, // จำนวนการแชร์สุ่ม
        // ระบุประเภทตามคำนำหน้าของ ID
        type: postId.startsWith('h') ? 'hot' : postId.startsWith('r') ? 'ranking' : 'user',
      };

      // จัดการโพสต์อันดับแยกต่างหาก
      if (postId.startsWith('r')) {
        newRankingPosts.push(post);
        console.log('[Weibo UI] 📊 พบโพสต์อันดับ:', postId);
      } else {
        posts.push(post);
      }
      comments[post.id] = [];
    }

    // หากตรวจพบการอัปเดตโพสต์อันดับ ให้แทนที่ข้อมูลเก่า
    if (changes.rankingPosts && newRankingPosts.length > 0) {
      rankingPosts = newRankingPosts;
      this.persistentData.rankingPosts = rankingPosts;
      console.log('[Weibo UI] ✅ อัปเดตโพสต์อันดับแล้ว แทนที่ข้อมูลเก่า:', rankingPosts.length, 'รายการ');
    }

    // แยกวิเคราะห์รูปแบบความคิดเห็น: [评论|ชื่อผู้แสดงความคิดเห็น|รหัสโพสต์|เนื้อหาความคิดเห็น]
    const commentRegex = /\[评论\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    let commentMatch;
    while ((commentMatch = commentRegex.exec(weiboContent)) !== null) {
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        postId: commentMatch[2],
        author: commentMatch[1],
        content: commentMatch[3],
        timestamp: new Date().toLocaleString(),
        likes: Math.floor(Math.random() * 50) + 1,
      };

      if (comments[comment.postId]) {
        comments[comment.postId].push(comment);
      }
    }

    // แยกวิเคราะห์รูปแบบการตอบกลับ: [回复|ชื่อผู้ตอบ|รหัสโพสต์|เนื้อหาการตอบ]
    const replyRegex = /\[回复\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    let replyMatch;
    while ((replyMatch = replyRegex.exec(weiboContent)) !== null) {
      const reply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        postId: replyMatch[2],
        author: replyMatch[1],
        content: replyMatch[3],
        timestamp: new Date().toLocaleString(),
        likes: Math.floor(Math.random() * 20) + 1,
        isReply: true,
      };

      if (comments[reply.postId]) {
        comments[reply.postId].push(reply);
      }
    }

    // แยกวิเคราะห์รูปแบบยอดนิยม: [热搜|อันดับ|หัวข้อยอดนิยม|ค่าความนิยม] - แทนที่แบบเพิ่ม
    if (changes.hotSearches) {
      const newHotSearches = [];
      const hotSearchRegex = /\[热搜\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      let hotSearchMatch;
      while ((hotSearchMatch = hotSearchRegex.exec(weiboContent)) !== null) {
        const hotSearch = {
          rank: parseInt(hotSearchMatch[1]),
          title: hotSearchMatch[2],
          heat: hotSearchMatch[3],
          icon: this.getHotSearchIcon(parseInt(hotSearchMatch[1])),
        };
        newHotSearches.push(hotSearch);
      }

      if (newHotSearches.length > 0) {
        hotSearches = newHotSearches;
        this.persistentData.hotSearches = hotSearches;
        console.log('[Weibo UI] ✅ อัปเดตข้อมูลยอดนิยมแล้ว แทนที่ข้อมูลเก่า:', hotSearches.length, 'รายการ');
      }
    }

    // แยกวิเคราะห์รูปแบบอันดับ: [榜单|ชื่ออันดับ|ประเภทอันดับ] และ [榜单项|อันดับ|ชื่อ|ค่าความนิยม] - แทนที่แบบเพิ่ม
    if (changes.rankings) {
      const newRankings = [];
      const rankingTitleRegex = /\[榜单\|([^|]+)\|([^\]]+)\]/g;
      const rankingItemRegex = /\[榜单项\|([^|]+)\|([^|]+)\|([^\]]+)\]/g;

      let rankingTitleMatch;
      while ((rankingTitleMatch = rankingTitleRegex.exec(weiboContent)) !== null) {
        newRankings.push({
          title: rankingTitleMatch[1],
          type: rankingTitleMatch[2],
          items: [],
        });
      }

      let rankingItemMatch;
      while ((rankingItemMatch = rankingItemRegex.exec(weiboContent)) !== null) {
        const item = {
          rank: parseInt(rankingItemMatch[1]),
          name: rankingItemMatch[2],
          heat: rankingItemMatch[3],
        };

        // เพิ่มไปยังอันดับสุดท้าย
        if (newRankings.length > 0) {
          newRankings[newRankings.length - 1].items.push(item);
        }
      }

      if (newRankings.length > 0) {
        rankings = newRankings;
        this.persistentData.rankings = rankings;
        console.log('[Weibo UI] ✅ อัปเดตข้อมูลอันดับแล้ว แทนที่ข้อมูลเก่า:', rankings.length, 'อันดับ');
      }
    }

    // แยกวิเคราะห์รูปแบบจำนวนแฟน: [粉丝数|จำนวนแฟนบัญชีหลัก|จำนวนแฟนบัญชีรอง] - แทนที่แบบเพิ่ม
    if (changes.userStats) {
      const fansRegex = /\[粉丝数\|([^|]+)\|([^\]]+)\]/g;
      let fansMatch;
      while ((fansMatch = fansRegex.exec(weiboContent)) !== null) {
        const newUserStats = {
          mainAccountFans: fansMatch[1], // จำนวนแฟนบัญชีหลัก
          aliasAccountFans: fansMatch[2], // จำนวนแฟนบัญชีรอง
          following: '100', // จำนวนการติดตามคงที่
          posts: posts.filter(p => p.author === this.getCurrentUsername()).length,
        };

        userStats = newUserStats;
        this.persistentData.userStats = userStats;
        console.log(
          '[Weibo UI] ✅ อัปเดตข้อมูลแฟนแล้ว - บัญชีหลัก:',
          userStats.mainAccountFans,
          'บัญชีรอง:',
          userStats.aliasAccountFans,
        );
        break; // เอาเฉพาะจำนวนแฟนที่จับคู่ครั้งแรก
      }
    }

    console.log('[Weibo UI] 📊 แยกวิเคราะห์เสร็จสมบูรณ์ (แทนที่แบบเพิ่ม):', {
      posts: posts.length,
      comments: Object.keys(comments).length,
      hotSearches: hotSearches.length,
      rankings: rankings.length,
      rankingPosts: rankingPosts.length,
      userStats: userStats
        ? `แฟนบัญชีหลัก${userStats.mainAccountFans} แฟนบัญชีรอง${userStats.aliasAccountFans}`
        : 'ไม่มี',
      changes: changes,
    });

    return { posts, comments, hotSearches, rankings, rankingPosts, userStats };
  }

  /**
   * ดึงไอคอนยอดนิยม
   */
  getHotSearchIcon(rank) {
    if (rank <= 3) {
      return '<i class="fas fa-fire" style="color: #ff8500;"></i>';
    } else if (rank <= 10) {
      return '<i class="fas fa-arrow-up" style="color: #ff9500;"></i>';
    } else {
      return '<i class="fas fa-circle" style="color: #999;"></i>';
    }
  }

  /**
   * ดึงชื่อผู้ใช้ปัจจุบัน
   */
  getCurrentUsername() {
    if (window.weiboManager && window.weiboManager.getCurrentUsername) {
      const username = window.weiboManager.getCurrentUsername();
      // หากเป็น {{user}} ลองดึงชื่อผู้ใช้จริงจาก SillyTavern
      if (username === '{{user}}') {
        return this.getRealUsername();
      }
      return username;
    }
    return this.getRealUsername();
  }

  /**
   * ดึงชื่อผู้ใช้จริง (จาก SillyTavern)
   */
  getRealUsername() {
    try {
      console.log('[Weibo UI] เริ่มดึงชื่อผู้ใช้จริง...');

      // วิธี 1: ดึงจากตัวแปร global ของ SillyTavern
      if (typeof window.name1 !== 'undefined' && window.name1 && window.name1.trim() && window.name1 !== '{{user}}') {
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก name1:', window.name1);
        return window.name1.trim();
      }

      // วิธี 2: ดึงจาก power_user
      if (
        window.power_user &&
        window.power_user.name &&
        window.power_user.name.trim() &&
        window.power_user.name !== '{{user}}'
      ) {
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก power_user:', window.power_user.name);
        return window.power_user.name.trim();
      }

      // วิธี 3: ดึงจาก getContext
      if (window.getContext) {
        const context = window.getContext();
        if (context && context.name1 && context.name1.trim() && context.name1 !== '{{user}}') {
          console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก context:', context.name1);
          return context.name1.trim();
        }
      }

      // วิธี 4: ดึงจาก localStorage
      const storedName = localStorage.getItem('name1');
      if (storedName && storedName.trim() && storedName !== '{{user}}') {
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก localStorage:', storedName);
        return storedName.trim();
      }

      // วิธี 5: ลองดึงจากตัวแปร global อื่นของ SillyTavern
      if (
        typeof window.user_name !== 'undefined' &&
        window.user_name &&
        window.user_name.trim() &&
        window.user_name !== '{{user}}'
      ) {
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก user_name:', window.user_name);
        return window.user_name.trim();
      }

      // วิธี 6: ดึงผู้เขียนข้อความผู้ใช้ล่าสุดจากข้อมูลแชท
      if (window.mobileContextEditor) {
        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (chatData && chatData.messages) {
          // ค้นหาข้อความผู้ใช้ล่าสุด
          for (let i = chatData.messages.length - 1; i >= 0; i--) {
            const msg = chatData.messages[i];
            if (msg.is_user && msg.name && msg.name.trim() && msg.name !== '{{user}}' && msg.name !== 'User') {
              console.log('[Weibo UI] ดึงชื่อผู้ใช้จากบันทึกแชท:', msg.name);
              return msg.name.trim();
            }
          }
        }
      }

      // วิธี 7: ลองดึงจากช่องป้อนชื่อผู้ใช้ใน DOM
      const userNameInput = document.querySelector('#user_name, input[name="user_name"], .user-name-input');
      if (userNameInput && userNameInput.value && userNameInput.value.trim() && userNameInput.value !== '{{user}}') {
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จากช่องป้อนชื่อผู้ใช้:', userNameInput.value);
        return userNameInput.value.trim();
      }

      console.log('[Weibo UI] ไม่สามารถดึงชื่อผู้ใช้ที่ใช้ได้จากทุกวิธี กำลังตรวจสอบตัวแปร global ที่มี...');
      console.log('[Weibo UI] window.name1:', window.name1);
      console.log('[Weibo UI] window.power_user:', window.power_user);
      console.log('[Weibo UI] window.user_name:', window.user_name);
    } catch (error) {
      console.warn('[Weibo UI] ดึงชื่อผู้ใช้ล้มเหลว:', error);
    }

    console.log('[Weibo UI] ใช้ชื่อผู้ใช้เริ่มต้น: User');
    return 'User';
  }

  /**
   * ดึงประเภทบัญชีปัจจุบัน
   */
  getCurrentAccountType() {
    if (window.weiboManager && window.weiboManager.currentAccount) {
      return window.weiboManager.currentAccount.isMainAccount ? '大号' : '小号';
    }
    return '大号';
  }

  /**
   * เรนเดอร์หน้ายอดนิยม
   */
  renderHotPage(data) {
    const { posts, comments, hotSearches } = data;
    // แสดงเฉพาะโพสต์ที่เกี่ยวข้องกับยอดนิยม (ID ขึ้นต้นด้วย h)
    const hotPosts = posts.filter(post => post.type === 'hot');

    let html = `
      <div class="weibo-page hot-page">
        <!-- รายการยอดนิยม -->
        <div class="hot-search-section">
          <div class="section-header">
            <i class="fas fa-fire"></i>
            <span>Weibo ยอดนิยม</span>
          </div>
          <div class="hot-search-list">
    `;

    // เรนเดอร์รายการยอดนิยม
    hotSearches.forEach(search => {
      html += `
        <div class="hot-search-item" data-rank="${search.rank}">
          <div class="search-rank">${search.rank}</div>
          <div class="search-content">
            <div class="search-title">${search.title}</div>
            <div class="search-heat">${search.heat}</div>
          </div>
          <div class="search-icon">${search.icon}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>

        <!-- โพสต์ยอดนิยม -->
        <div class="posts-section">
          <div class="section-header">
            <i class="fas fa-comments"></i>
            <span>พูดคุยหัวข้อยอดนิยม</span>
          </div>
          <div class="posts-list">
    `;

    // เรียงลำดับโพสต์ตามเวลา (ใหม่ก่อน)
    hotPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // เรนเดอร์โพสต์
    hotPosts.forEach(post => {
      const postComments = comments[post.id] || [];
      html += this.renderPost(post, postComments, true); // โพสต์ในหน้ายอดนิยมสามารถตอบกลับได้
    });

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * เรนเดอร์หน้าอันดับ
   */
  renderRankingPage(data) {
    const { posts, comments, rankings, rankingPosts } = data;
    // ใช้ข้อมูลโพสต์อันดับแยกต่างหาก (เวอร์ชันปรับปรุง โซลูชันที่ 5)
    const actualRankingPosts = rankingPosts || posts.filter(post => post.type === 'ranking');
    console.log('[Weibo UI] 📊 หน้าอันดับใช้ข้อมูลโพสต์:', actualRankingPosts.length, 'รายการ');

    let html = `
      <div class="weibo-page ranking-page">
        <!-- รายการอันดับ -->
        <div class="ranking-section">
    `;

    // เรนเดอร์อันดับ
    rankings.forEach(ranking => {
      html += `
        <div class="ranking-container">
          <div class="section-header">
            <i class="fas fa-trophy"></i>
            <span>${ranking.title}</span>
            <span class="ranking-type">${ranking.type}</span>
          </div>
          <div class="ranking-list">
      `;

      // เรนเดอร์รายการในอันดับ
      ranking.items.forEach(item => {
        const rankClass = item.rank <= 3 ? 'top-rank' : '';
        html += `
          <div class="ranking-item ${rankClass}" data-rank="${item.rank}">
            <div class="item-rank">${item.rank}</div>
            <div class="item-content">
              <div class="item-name">${item.name}</div>
              <div class="item-heat">${item.heat}</div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <!-- โพสต์ที่เกี่ยวข้องกับอันดับ -->
        <div class="posts-section">
          <div class="section-header">
            <i class="fas fa-comments"></i>
            <span>พูดคุยอันดับ</span>
          </div>
          <div class="posts-list">
    `;

    // เรียงลำดับโพสต์ตามเวลา (ใหม่ก่อน)
    actualRankingPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // เรนเดอร์โพสต์ (โพสต์ในหน้าอันดับสามารถกดถูกใจได้แต่ตอบกลับไม่ได้)
    actualRankingPosts.forEach(post => {
      const postComments = comments[post.id] || [];
      html += this.renderPost(post, postComments, false); // โพสต์ในหน้าอันดับตอบกลับไม่ได้
    });

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * เรนเดอร์หน้าผู้ใช้
   */
  renderUserPage(data) {
    const { posts, comments, userStats } = data;
    // ดึงชื่อผู้ใช้ของบัญชีปัจจุบันจากตัวจัดการ Weibo เป็นอันดับแรก เพื่อให้แสดงผลถูกต้องหลังสลับบัญชี
    let currentUsername = this.getCurrentUsername();
    console.log('[Weibo UI] ชื่อผู้ใช้ที่ใช้ในหน้าผู้ใช้:', currentUsername);

    // หากชื่อผู้ใช้ที่ได้คือ 'User' หรือไม่ถูกต้อง ลองดึงจากที่อื่น
    if (!currentUsername || currentUsername === 'User' || currentUsername === '{{user}}') {
      console.log('[Weibo UI] ตรวจพบชื่อผู้ใช้ไม่ถูกต้อง กำลังลองดึงจากแหล่งอื่น...');

      // ลองดึงชื่อผู้ใช้จริงจาก SillyTavern
      const realUsername = this.getRealUsername();
      if (realUsername && realUsername !== 'User' && realUsername !== '{{user}}') {
        currentUsername = realUsername;
        console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก SillyTavern ได้:', currentUsername);
      }

      // หากยังไม่ถูกต้อง ลองดึงชื่อผู้ใช้ที่ตั้งไว้จาก DOM
      if (!currentUsername || currentUsername === 'User' || currentUsername === '{{user}}') {
        const profileNameElement = document.querySelector('.profile-name');
        if (
          profileNameElement &&
          profileNameElement.textContent &&
          profileNameElement.textContent !== 'User' &&
          profileNameElement.textContent !== '{{user}}'
        ) {
          currentUsername = profileNameElement.textContent;
          console.log('[Weibo UI] ดึงชื่อผู้ใช้จาก DOM ได้:', currentUsername);
        }
      }
    }

    const accountType = this.getCurrentAccountType();
    // แสดงเฉพาะโพสต์ที่เกี่ยวข้องกับผู้ใช้ (ID ขึ้นต้นด้วย u)
    const userPosts = posts.filter(post => post.type === 'user');

    // ดึงจำนวนแฟนที่สอดคล้องตามบัญชีปัจจุบัน
    const isMainAccount = this.getCurrentAccountType() === '大号';
    const currentFans = userStats ? (isMainAccount ? userStats.mainAccountFans : userStats.aliasAccountFans) : '0';

    // หากไม่มีข้อมูลสถิติของผู้ใช้ ให้ใช้ค่าเริ่มต้น
    const stats = {
      fans: currentFans || '0',
      following: '100',
      posts: posts.filter(p => p.author === currentUsername).length,
    };

    console.log('[Weibo UI] ข้อมูลสถิติของหน้าผู้ใช้:', {
      isMainAccount,
      currentFans,
      userStats: userStats
        ? {
            mainAccountFans: userStats.mainAccountFans,
            aliasAccountFans: userStats.aliasAccountFans,
          }
        : null,
    });

    let html = `
      <div class="weibo-page user-page">
        <!-- ข้อมูลผู้ใช้ -->
        <div class="user-info-section">
          <div class="user-header">
            <div class="user-avatar-large">
              ${this.generateAvatarHTML(currentUsername, 'large')}
            </div>
            <div class="user-details">
              <div class="user-name-container">
                <div class="profile-name">${currentUsername}</div>
                <button class="edit-name-btn" title="แก้ไขชื่อผู้ใช้">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
              <div class="account-type">${accountType}</div>
            </div>
          </div>

          <!-- ข้อมูลสถิติ -->
          <div class="user-stats">
            <div class="stat-item">
              <div class="stat-number">${stats.posts}</div>
              <div class="stat-label">Weibo</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${stats.following}</div>
              <div class="stat-label">กำลังติดตาม</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${stats.fans}</div>
              <div class="stat-label">แฟน</div>
            </div>
          </div>
        </div>

        <!-- โพสต์ของผู้ใช้ -->
        <div class="posts-section">
          <div class="section-header">
            <i class="fas fa-user"></i>
            <span>Weibo ของฉัน</span>
          </div>
          <div class="posts-list">
    `;

    // เรนเดอร์โพสต์ของผู้ใช้ (เรียงตามเวลา ใหม่ก่อน)
    // ดึงรายชื่อผู้ใช้ที่เป็นไปได้สำหรับการจับคู่
    const possibleUsernames = [currentUsername, this.getRealUsername(), '{{user}}', 'User'].filter(
      name => name && name.trim(),
    ); // กรองค่าว่างออก

    // กรองโพสต์ของผู้ใช้ปัจจุบันออกจากโพสต์ของผู้ใช้ทั้งหมด
    console.log('[Weibo UI] ดีบักการจับคู่ชื่อผู้ใช้:', {
      possibleUsernames,
      userPostsAuthors: userPosts.map(p => p.author),
      userPostsCount: userPosts.length,
    });

    const currentUserPosts = userPosts.filter(post => {
      // ตรวจสอบว่าผู้เขียนโพสต์ตรงกับชื่อผู้ใช้ที่เป็นไปได้หรือไม่
      const isMatch = possibleUsernames.some(
        username => post.author === username || post.author.toLowerCase() === username.toLowerCase(),
      );
      if (isMatch) {
        console.log('[Weibo UI] พบโพสต์ผู้ใช้ที่จับคู่:', post.author, post.content);
      }
      return isMatch;
    });

    // หากไม่มีโพสต์ที่จับคู่ ให้แสดงโพสต์ของผู้ใช้ทั้งหมด (ลอจิกสำรอง)
    const postsToShow = currentUserPosts.length > 0 ? currentUserPosts : userPosts;

    // เรียงลำดับโพสต์ตามเวลา (ใหม่ก่อน)
    postsToShow.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    postsToShow.forEach(post => {
      const postComments = comments[post.id] || [];
      html += this.renderPost(post, postComments, true); // โพสต์ในหน้าผู้ใช้สามารถตอบกลับได้
    });

    // หากไม่มีโพสต์ ให้แสดงคำแนะนำ
    if (userPosts.length === 0) {
      html += `
        <div class="empty-posts">
          <i class="fas fa-edit"></i>
          <p>ยังไม่เคยโพสต์ Weibo</p>
          <p>แตะปุ่ม "โพสต์" ที่มุมขวาบนเพื่อเริ่มแชร์กันเลย!</p>
        </div>
      `;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * เรนเดอร์โพสต์เดียว
   */
  renderPost(post, postComments, canReply = true) {
    const likeData = this.likesData[post.id] || { likes: post.likes, isLiked: false };
    const likeClass = likeData.isLiked ? 'liked' : '';

    let html = `
      <div class="weibo-post" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-author">
            ${this.generateAvatarHTML(post.author)}
            <div class="author-info">
              <div class="author-name">${post.author}</div>
              <div class="post-time">${post.timestamp}</div>
            </div>
          </div>
          <button class="delete-btn weibo-delete-btn" data-post-id="${post.id}" title="ลบ Weibo">ลบ</button>
        </div>

        <div class="post-content">
          ${this.formatPostContent(post.content)}
        </div>

        <div class="post-actions">
          <button class="action-btn like-btn ${likeClass}" data-post-id="${post.id}">
            <i class="fas fa-heart"></i>
            <span>${likeData.likes}</span>
          </button>
          ${
            canReply
              ? `
          <button class="action-btn comment-btn" data-post-id="${post.id}">
            <i class="fas fa-comment"></i>
            <span>${postComments.length}</span>
          </button>
          `
              : `
          <span class="action-info">
            <i class="fas fa-comment"></i>
            <span>${postComments.length}</span>
          </span>
          `
          }
          <button class="action-btn share-btn" data-post-id="${post.id}">
            <i class="fas fa-share"></i>
            <span>${post.shares || 0}</span>
          </button>
        </div>
    `;

    // เรนเดอร์ความคิดเห็น
    if (postComments.length > 0) {
      html += `
        <div class="post-comments">
          <div class="comments-header">
            <span>ความคิดเห็น ${postComments.length}</span>
          </div>
          <div class="comments-list">
      `;

      postComments.forEach(comment => {
        const commentLikeData = this.commentLikesData[comment.id] || { likes: comment.likes, isLiked: false };
        const commentLikeClass = commentLikeData.isLiked ? 'liked' : '';

        html += `
          <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-author">
              ${this.generateAvatarHTML(comment.author, 'small')}
              <div class="comment-info">
                <div class="comment-author-name">${comment.author}</div>
                <div class="comment-time">${comment.timestamp}</div>
              </div>
            </div>
            <div class="comment-content">
              ${this.formatCommentContent(comment.content)}
            </div>
            <div class="comment-actions">
              <button class="action-btn comment-like-btn ${commentLikeClass}" data-comment-id="${comment.id}">
                <i class="fas fa-heart"></i>
                <span>${commentLikeData.likes}</span>
              </button>
              ${
                canReply
                  ? `
              <button class="action-btn reply-btn" data-comment-id="${comment.id}" data-post-id="${post.id}">
                <i class="fas fa-reply"></i>
                ตอบกลับ
              </button>
              `
                  : ''
              }
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // หากตอบกลับได้ ให้เพิ่มช่องตอบกลับ
    if (canReply) {
      html += `
        <div class="reply-input-container" style="display: none;">
          <div class="reply-input">
            <textarea placeholder="เขียนความคิดเห็น..." maxlength="140"></textarea>
            <div class="reply-actions">
              <button class="cancel-reply-btn">ยกเลิก</button>
              <button class="send-reply-btn">ส่ง</button>
            </div>
          </div>
        </div>
      `;
    }

    html += `
      </div>
    `;

    return html;
  }

  /**
   * จัดรูปแบบเนื้อหาโพสต์
   */
  formatPostContent(content) {
    // ประมวลผลแท็กหัวข้อ
    content = content.replace(/#([^#\s]+)#/g, '<span class="topic-tag">#$1#</span>');

    // ประมวลผลการกล่าวถึง @ผู้ใช้
    content = content.replace(/@([^\s@]+)/g, '<span class="mention-user">@$1</span>');

    // ประมวลผลการขึ้นบรรทัดใหม่
    content = content.replace(/\n/g, '<br>');

    return content;
  }

  /**
   * จัดรูปแบบเนื้อหาความคิดเห็น
   */
  formatCommentContent(content) {
    // ประมวลผลรูปแบบการตอบกลับ: 回复张三：เนื้อหา
    content = content.replace(/回复([^：]+)：/g, '<span class="reply-to">回复$1：</span>');

    // ประมวลผลแท็กหัวข้อ
    content = content.replace(/#([^#\s]+)#/g, '<span class="topic-tag">#$1#</span>');

    // ประมวลผลการกล่าวถึง @ผู้ใช้
    content = content.replace(/@([^\s@]+)/g, '<span class="mention-user">@$1</span>');

    // ประมวลผลการขึ้นบรรทัดใหม่
    content = content.replace(/\n/g, '<br>');

    return content;
  }

  /**
   * รีเฟรชรายการ Weibo
   */
  async refreshWeiboList() {
    try {
      console.log('[Weibo UI] เริ่มรีเฟรชรายการ Weibo...');

      // ดึงข้อมูลแชทปัจจุบัน
      const chatData = await this.getCurrentChatData();
      if (!chatData || !chatData.messages || chatData.messages.length === 0) {
        console.log('[Weibo UI] ไม่มีข้อมูลแชท แสดงสถานะว่างเปล่า');
        this.showEmptyState();
        return;
      }

      // แยกวิเคราะห์เนื้อหา Weibo
      const firstMessage = chatData.messages[0];
      const weiboData = this.parseWeiboContent(firstMessage.mes || '');

      // เรนเดอร์เนื้อหาตามหน้าปัจจุบัน
      let content = '';
      switch (this.currentPage) {
        case 'hot':
          content = this.renderHotPage(weiboData);
          break;
        case 'ranking':
          content = this.renderRankingPage(weiboData);
          break;
        case 'user':
          content = this.renderUserPage(weiboData);
          break;
        default:
          content = this.renderHotPage(weiboData);
      }

      // อัปเดตเนื้อหาหน้า
      const contentContainer = document.getElementById('weibo-content');
      if (contentContainer) {
        contentContainer.innerHTML = content;
        this.bindPostEvents();

        // เลื่อนกลับไปด้านบนของหน้าโดยอัตโนมัติเพื่อให้ผู้ใช้ดูเนื้อหาล่าสุดได้สะดวก
        this.scrollToTop();

        console.log('[Weibo UI] ✅ รีเฟรชรายการ Weibo เสร็จสมบูรณ์');
      }
    } catch (error) {
      console.error('[Weibo UI] รีเฟรชรายการ Weibo ล้มเหลว:', error);
      this.showErrorState(error.message);
    }
  }

  /**
   * เลื่อนกลับไปด้านบนของหน้า
   */
  scrollToTop() {
    try {
      const contentContainer = document.getElementById('weibo-content');
      if (contentContainer) {
        contentContainer.scrollTo({
          top: 0,
          behavior: 'smooth', // เลื่อนแบบนุ่มนวล
        });
        console.log('[Weibo UI] 📜 เลื่อนกลับไปด้านบนของหน้าโดยอัตโนมัติแล้ว');
      }
    } catch (error) {
      console.warn('[Weibo UI] เลื่อนกลับไปด้านบนล้มเหลว:', error);
    }
  }

  /**
   * ดึงข้อมูลแชทปัจจุบัน
   */
  async getCurrentChatData() {
    if (window.mobileContextEditor) {
      return window.mobileContextEditor.getCurrentChatData();
    } else if (window.MobileContext) {
      return await window.MobileContext.loadChatToEditor();
    } else {
      throw new Error('ตัวแก้ไขบริบทยังไม่พร้อม');
    }
  }

  /**
   * แสดงสถานะว่างเปล่า
   */
  showEmptyState() {
    const contentContainer = document.getElementById('weibo-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>ยังไม่มีเนื้อหา Weibo</h3>
          <p>แตะปุ่ม "สร้าง" ที่มุมขวาบนเพื่อเริ่มสร้างเนื้อหา Weibo</p>
        </div>
      `;
    }
  }

  /**
   * แสดงสถานะข้อผิดพลาด
   */
  showErrorState(message) {
    const contentContainer = document.getElementById('weibo-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>โหลดล้มเหลว</h3>
          <p>${message}</p>
          <button onclick="window.weiboUI.refreshWeiboList()" class="retry-btn">ลองอีกครั้ง</button>
        </div>
      `;
    }
  }

  /**
   * ผูกอีเวนต์ของโพสต์
   */
  bindPostEvents() {
    // ผูกอีเวนต์ปุ่มลบ
    document.querySelectorAll('.weibo-delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const postId = btn.dataset.postId;
        if (postId) {
          this.deletePost(postId);
        }
      });
    });

    // ผูกอีเวนต์การกดถูกใจ
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const postId = btn.dataset.postId;
        this.togglePostLike(postId);
      });
    });

    // ผูกอีเวนต์การกดถูกใจของความคิดเห็น
    document.querySelectorAll('.comment-like-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        this.toggleCommentLike(commentId);
      });
    });

    // ผูกอีเวนต์ปุ่มความคิดเห็น
    document.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const postId = btn.dataset.postId;
        this.showReplyInput(postId);
      });
    });

    // ผูกอีเวนต์ปุ่มตอบกลับ
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        const postId = btn.dataset.postId;
        this.showReplyInput(postId, commentId);
      });
    });

    // ผูกอีเวนต์ส่งการตอบกลับ
    document.querySelectorAll('.send-reply-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.sendReply(btn);
      });
    });

    // ผูกอีเวนต์ยกเลิกการตอบกลับ
    document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.hideReplyInput(btn);
      });
    });

    // ผูกอีเวนต์แก้ไขชื่อผู้ใช้
    document.querySelectorAll('.edit-name-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.showEditNameDialog();
      });
    });
  }

  /**
   * สลับการกดถูกใจของโพสต์
   */
  togglePostLike(postId) {
    // หากไม่มีข้อมูลการกดถูกใจ ให้ดึงจำนวนถูกใจดั้งเดิมจาก UI
    if (!this.likesData[postId]) {
      const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
      const originalLikes = likeBtn ? parseInt(likeBtn.querySelector('span').textContent) || 0 : 0;
      this.likesData[postId] = { likes: originalLikes, isLiked: false };
    }

    const likeData = this.likesData[postId];

    if (likeData.isLiked) {
      likeData.likes = Math.max(0, likeData.likes - 1);
      likeData.isLiked = false;
    } else {
      likeData.likes += 1;
      likeData.isLiked = true;
    }

    // อัปเดต UI
    const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    if (likeBtn) {
      likeBtn.classList.toggle('liked', likeData.isLiked);
      likeBtn.querySelector('span').textContent = likeData.likes;
    }

    console.log(`[Weibo UI] โพสต์ ${postId} สถานะถูกใจ: ${likeData.isLiked}, จำนวนถูกใจ: ${likeData.likes}`);
  }

  /**
   * สลับการกดถูกใจของความคิดเห็น
   */
  toggleCommentLike(commentId) {
    // หากไม่มีข้อมูลการกดถูกใจ ให้ดึงจำนวนถูกใจดั้งเดิมจาก UI
    if (!this.commentLikesData[commentId]) {
      const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
      const originalLikes = likeBtn ? parseInt(likeBtn.querySelector('span').textContent) || 0 : 0;
      this.commentLikesData[commentId] = { likes: originalLikes, isLiked: false };
    }

    const likeData = this.commentLikesData[commentId];

    if (likeData.isLiked) {
      likeData.likes = Math.max(0, likeData.likes - 1);
      likeData.isLiked = false;
    } else {
      likeData.likes += 1;
      likeData.isLiked = true;
    }

    // อัปเดต UI
    const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
    if (likeBtn) {
      likeBtn.classList.toggle('liked', likeData.isLiked);
      likeBtn.querySelector('span').textContent = likeData.likes;
    }

    console.log(`[Weibo UI] ความคิดเห็น ${commentId} สถานะถูกใจ: ${likeData.isLiked}, จำนวนถูกใจ: ${likeData.likes}`);
  }

  /**
   * แสดงช่องตอบกลับ
   */
  showReplyInput(postId, commentId = null) {
    // ซ่อนช่องตอบกลับอื่น
    document.querySelectorAll('.reply-input-container').forEach(container => {
      container.style.display = 'none';
    });

    // แสดงช่องตอบกลับของโพสต์ปัจจุบัน
    const postElement = document.querySelector(`.weibo-post[data-post-id="${postId}"]`);
    if (postElement) {
      const replyContainer = postElement.querySelector('.reply-input-container');
      if (replyContainer) {
        replyContainer.style.display = 'block';
        const textarea = replyContainer.querySelector('textarea');

        // หากเป็นการตอบกลับความคิดเห็น ให้ตั้งค่าตัวยึดข้อความ
        if (commentId) {
          const commentElement = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
          if (commentElement) {
            const authorName = commentElement.querySelector('.comment-author-name').textContent;
            textarea.placeholder = `ตอบกลับ ${authorName}...`;
            textarea.dataset.replyTo = authorName;
            textarea.dataset.commentId = commentId;
          }
        } else {
          textarea.placeholder = 'เขียนความคิดเห็น...';
          delete textarea.dataset.replyTo;
          delete textarea.dataset.commentId;
        }

        textarea.focus();
      }
    }
  }

  /**
   * ซ่อนช่องตอบกลับ
   */
  hideReplyInput(btn) {
    const replyContainer = btn.closest('.reply-input-container');
    if (replyContainer) {
      replyContainer.style.display = 'none';
      const textarea = replyContainer.querySelector('textarea');
      textarea.value = '';
      textarea.placeholder = 'เขียนความคิดเห็น...';
      delete textarea.dataset.replyTo;
      delete textarea.dataset.commentId;
    }
  }

  /**
   * ส่งการตอบกลับ
   */
  async sendReply(btn) {
    const replyContainer = btn.closest('.reply-input-container');
    const postElement = btn.closest('.weibo-post');

    if (!replyContainer || !postElement) return;

    const textarea = replyContainer.querySelector('textarea');
    const content = textarea.value.trim();

    if (!content) {
      this.showNotification('กรุณาใส่เนื้อหาตอบกลับ', 'error');
      return;
    }

    const postId = postElement.dataset.postId;
    const replyTo = textarea.dataset.replyTo;
    const commentId = textarea.dataset.commentId;

    // ล้างช่องป้อนและซ่อนทันที จำลองเอฟเฟกต์การส่งสำเร็จ
    const originalContent = content; // เก็บเนื้อหาไว้สำหรับการกู้คืนเมื่อเกิดข้อผิดพลาด
    textarea.value = '';
    this.hideReplyInput(btn);

    // แสดงการแจ้งเตือนกำลังส่ง
    this.showNotification('กำลังส่งการตอบกลับ...', 'loading');

    try {
      // สร้างรูปแบบการตอบกลับ
      let replyFormat;
      if (replyTo && commentId) {
        // ตอบกลับความคิดเห็น
        replyFormat = `[回复|${this.getCurrentUsername()}|${postId}|回复${replyTo}：${originalContent}]`;
      } else {
        // ตอบกลับโพสต์
        replyFormat = `[评论|${this.getCurrentUsername()}|${postId}|${originalContent}]`;
      }

      console.log('[Weibo UI] ส่งการตอบกลับ:', replyFormat);

      // เรียกตัวจัดการ Weibo เพื่อส่งการตอบกลับ
      if (window.weiboManager && window.weiboManager.sendReplyToAPI) {
        await window.weiboManager.sendReplyToAPI(replyFormat);

        // แสดงการแจ้งเตือนสำเร็จ
        this.showNotification('ตอบกลับสำเร็จ', 'success');

        // รีเฟรชรายการ Weibo
        setTimeout(() => {
          this.refreshWeiboList();
        }, 1000);
      } else {
        console.error('[Weibo UI] ไม่พบตัวจัดการ Weibo หรือเมธอดไม่มีอยู่');
        this.showNotification('ตอบกลับล้มเหลว: ตัวจัดการ Weibo ยังไม่พร้อม', 'error');
        // กู้คืนเนื้อหาที่ป้อน
        this.restoreReplyInput(postId, originalContent, replyTo, commentId);
      }
    } catch (error) {
      console.error('[Weibo UI] ส่งการตอบกลับล้มเหลว:', error);
      this.showNotification('ตอบกลับล้มเหลว: ' + error.message, 'error');
      // กู้คืนเนื้อหาที่ป้อน
      this.restoreReplyInput(postId, originalContent, replyTo, commentId);
    }
  }

  /**
   * กู้คืนเนื้อหาในช่องตอบกลับ (ใช้เมื่อส่งล้มเหลว)
   */
  restoreReplyInput(postId, content, replyTo = null, commentId = null) {
    const postElement = document.querySelector(`.weibo-post[data-post-id="${postId}"]`);
    if (postElement) {
      const replyContainer = postElement.querySelector('.reply-input-container');
      if (replyContainer) {
        replyContainer.style.display = 'block';
        const textarea = replyContainer.querySelector('textarea');
        textarea.value = content;

        if (replyTo && commentId) {
          textarea.placeholder = `ตอบกลับ ${replyTo}...`;
          textarea.dataset.replyTo = replyTo;
          textarea.dataset.commentId = commentId;
        } else {
          textarea.placeholder = 'เขียนความคิดเห็น...';
          delete textarea.dataset.replyTo;
          delete textarea.dataset.commentId;
        }

        textarea.focus();
      }
    }
  }

  /**
   * แสดงการแจ้งเตือน
   */
  showNotification(message, type = 'success') {
    // ลบการแจ้งเตือนที่มีอยู่
    const existingNotification = document.querySelector('.reply-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // สร้าง element การแจ้งเตือน
    const notification = document.createElement('div');
    notification.className = `reply-notification ${type}`;

    // ตั้งค่าไอคอนตามประเภท
    let icon = '';
    switch (type) {
      case 'success':
        icon = '<i class="fas fa-check-circle"></i>';
        break;
      case 'error':
        icon = '<i class="fas fa-exclamation-circle"></i>';
        break;
      case 'loading':
        icon = '<i class="fas fa-spinner fa-spin"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>';
    }

    notification.innerHTML = `${icon}${message}`;

    // เพิ่มไปยังหน้า
    document.body.appendChild(notification);

    // อนิเมชันแสดงผล
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // ซ่อนอัตโนมัติ (ประเภท loading ไม่ซ่อนอัตโนมัติ)
    if (type !== 'loading') {
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, 3000);
    }
  }

  /**
   * อัปเดตการแสดงชื่อผู้ใช้ (เรียกเมื่อสลับบัญชี)
   */
  updateUsernameDisplay() {
    // อัปเดตการแสดงชื่อผู้ใช้ในหน้าผู้ใช้
    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement) {
      const newUsername = this.getCurrentUsername();
      profileNameElement.textContent = newUsername;
      console.log('[Weibo UI] อัปเดตการแสดงชื่อผู้ใช้แล้ว:', newUsername);

      // อัปเดตการแสดงอวาตาร์ด้วย
      const userAvatarLarge = document.querySelector('.user-avatar-large');
      if (userAvatarLarge) {
        userAvatarLarge.innerHTML = this.generateAvatarHTML(newUsername, 'large');
      }

      // อัปเดตการแสดงประเภทบัญชี
      const accountTypeElement = document.querySelector('.account-type');
      if (accountTypeElement && window.weiboManager) {
        const accountType = window.weiboManager.currentAccount.isMainAccount ? '大号' : '小号';
        accountTypeElement.textContent = accountType;
      }

      // อัปเดตการแสดงจำนวนแฟน (หากอยู่ในหน้าผู้ใช้)
      this.updateFansDisplay();
    }
  }

  /**
   * อัปเดตการแสดงจำนวนแฟน (เรียกเมื่อสลับบัญชี)
   */
  updateFansDisplay() {
    const fansNumberElement = document.querySelector('.stat-item .stat-number');
    if (fansNumberElement && this.persistentData.userStats) {
      const isMainAccount = this.getCurrentAccountType() === '大号';
      const currentFans = isMainAccount
        ? this.persistentData.userStats.mainAccountFans
        : this.persistentData.userStats.aliasAccountFans;

      if (currentFans) {
        fansNumberElement.textContent = currentFans;
        console.log('[Weibo UI] อัปเดตการแสดงจำนวนแฟนแล้ว:', currentFans, '(', isMainAccount ? '大号' : '小号', ')');
      }
    }
  }

  /**
   * แสดงกล่องโต้ตอบแก้ไขชื่อผู้ใช้
   */
  showEditNameDialog() {
    const currentName = this.getCurrentUsername();
    const accountType = this.getCurrentAccountType();

    const newName = prompt(`แก้ไขชื่อผู้ใช้${accountType}:`, currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      this.updateUsername(newName.trim());
    }
  }

  /**
   * อัปเดตชื่อผู้ใช้
   */
  updateUsername(newName) {
    try {
      if (window.weiboManager && window.weiboManager.setUsername) {
        window.weiboManager.setUsername(newName);

        // อัปเดตการแสดงชื่อผู้ใช้ใน DOM ทันที
        const profileNameElement = document.querySelector('.profile-name');
        if (profileNameElement) {
          profileNameElement.textContent = newName;
        }

        // อัปเดตการแสดงอวาตาร์
        const userAvatarElements = document.querySelectorAll('.user-avatar-large .author-avatar');
        userAvatarElements.forEach(avatar => {
          avatar.textContent = newName[0] || '?';
          avatar.style.background = this.getAvatarColor(newName);
        });

        // รีเฟรชหน้าผู้ใช้
        if (this.currentPage === 'user') {
          this.refreshWeiboList();
        }

        console.log('[Weibo UI] อัปเดตชื่อผู้ใช้แล้ว:', newName);
      } else {
        throw new Error('ตัวจัดการ Weibo ยังไม่พร้อม');
      }
    } catch (error) {
      console.error('[Weibo UI] อัปเดตชื่อผู้ใช้ล้มเหลว:', error);
      alert(`อัปเดตชื่อผู้ใช้ล้มเหลว: ${error.message}`);
    }
  }

  /**
   * ตั้งค่าหน้าปัจจุบัน
   */
  setCurrentPage(page) {
    if (['hot', 'ranking', 'user'].includes(page)) {
      this.currentPage = page;

      // อัปเดตหน้าปัจจุบันของตัวจัดการ Weibo
      if (window.weiboManager && window.weiboManager.setCurrentPage) {
        window.weiboManager.setCurrentPage(page);
      }

      console.log('[Weibo UI] ตั้งค่าหน้าปัจจุบันแล้ว:', page);
    }
  }

  /**
   * ลบ Weibo รวมถึงความคิดเห็นและการตอบกลับทั้งหมด
   */
  async deletePost(postId) {
    console.log('[Weibo UI] เริ่มลบ Weibo:', postId);

    try {
      // แสดงกล่องโต้ตอบยืนยัน
      if (
        !confirm(
          `คุณแน่ใจหรือไม่ว่าต้องการลบ Weibo ID: ${postId} พร้อมความคิดเห็นทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        )
      ) {
        return;
      }

      // ดึงข้อมูลแชทปัจจุบัน
      const chatData = await this.getCurrentChatData();
      if (!chatData || !chatData.messages || chatData.messages.length === 0) {
        throw new Error('ไม่มีข้อมูลแชท');
      }

      // ดึงข้อความแรก (มีเนื้อหา Weibo)
      const firstMessage = chatData.messages[0];
      if (!firstMessage || !firstMessage.mes) {
        throw new Error('ไม่พบเนื้อหา Weibo');
      }

      let content = firstMessage.mes;

      // ดึงเนื้อหาระหว่างเครื่องหมาย Weibo
      const weiboRegex = /<!-- WEIBO_CONTENT_START -->([\s\S]*?)<!-- WEIBO_CONTENT_END -->/;
      const match = content.match(weiboRegex);

      if (!match) {
        throw new Error('ไม่พบเครื่องหมายเนื้อหา Weibo');
      }

      let weiboContent = match[1];

      // ลบรูปแบบทั้งหมดที่มีรหัส Weibo ที่ระบุ
      // ลบโพสต์หลัก: [博文|ชื่อผู้โพสต์|รหัสโพสต์|เนื้อหาโพสต์]
      const postRegex = new RegExp(`\\[博文\\|[^|]+\\|${postId}\\|[^\\]]+\\]`, 'g');
      weiboContent = weiboContent.replace(postRegex, '');

      // ลบความคิดเห็น: [评论|ชื่อผู้แสดงความคิดเห็น|รหัสโพสต์|เนื้อหาความคิดเห็น]
      const commentRegex = new RegExp(`\\[评论\\|[^|]+\\|${postId}\\|[^\\]]+\\]`, 'g');
      weiboContent = weiboContent.replace(commentRegex, '');

      // ลบการตอบกลับ: [回复|ชื่อผู้ตอบ|รหัสโพสต์|เนื้อหาการตอบ]
      const replyRegex = new RegExp(`\\[回复\\|[^|]+\\|${postId}\\|[^\\]]+\\]`, 'g');
      weiboContent = weiboContent.replace(replyRegex, '');

      // ล้างบรรทัดว่างที่เกิน
      weiboContent = weiboContent.replace(/\n{3,}/g, '\n\n');

      // สร้างเนื้อหาข้อความใหม่
      const newContent = content.replace(
        /<!-- WEIBO_CONTENT_START -->[\s\S]*?<!-- WEIBO_CONTENT_END -->/,
        `<!-- WEIBO_CONTENT_START -->${weiboContent}<!-- WEIBO_CONTENT_END -->`,
      );

      // อัปเดตเนื้อหาข้อความ
      await window.mobileContextEditor.modifyMessage(0, newContent);

      console.log('[Weibo UI] ✅ ลบ Weibo สำเร็จ:', postId);

      // แสดงคำแนะนำสำเร็จ
      this.showNotification('🗑️ ลบ Weibo แล้ว', 'success');

      // รีเฟรชเนื้อหา Weibo
      setTimeout(() => {
        this.refreshWeiboList();
      }, 500);
    } catch (error) {
      console.error('[Weibo UI] ลบ Weibo ล้มเหลว:', error);
      this.showNotification('❌ ลบล้มเหลว: ' + error.message, 'error');
    }
  }
}

// สร้างอินสแตนซ์ global
if (typeof window !== 'undefined') {
  window.weiboUI = new WeiboUI();
  console.log('[Weibo UI] ✅ สร้างตัวจัดการ UI Weibo แล้ว');
}

/**
 * ดึงเนื้อหาแอป Weibo (สำหรับเฟรมเวิร์กมือถือเรียก)
 */
function getWeiboAppContent() {
  try {
    console.log('[Weibo UI] กำลังสร้างเนื้อหาแอป Weibo...');

    return `
      <div class="weibo-app">
        <!-- แถบสลับหน้า -->
        <div class="weibo-tabs">
          <div class="tab-item active" data-page="hot">
            <i class="fas fa-fire"></i>
            <span>ยอดนิยม</span>
          </div>
          <div class="tab-item" data-page="ranking">
            <i class="fas fa-trophy"></i>
            <span>อันดับ</span>
          </div>
          <div class="tab-item" data-page="user">
            <i class="fas fa-user"></i>
            <span>ผู้ใช้</span>
          </div>
        </div>

        <!-- พื้นที่เนื้อหา Weibo -->
        <div class="weibo-content" id="weibo-content">
          <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>กำลังโหลดเนื้อหา Weibo...</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('[Weibo UI] สร้างเนื้อหาแอป Weibo ล้มเหลว:', error);
    return `
      <div class="error-placeholder">
        <div class="error-icon">❌</div>
        <div class="error-text">โหลดแอป Weibo ล้มเหลว</div>
        <div class="error-detail">${error.message}</div>
        <button onclick="window.mobilePhone.handleWeiboApp()" class="retry-button">ลองอีกครั้ง</button>
      </div>
    `;
  }
}

/**
 * ผูกอีเวนต์ Weibo (สำหรับเฟรมเวิร์กมือถือเรียก)
 */
function bindWeiboEvents() {
  try {
    console.log('[Weibo UI] กำลังผูกอีเวนต์ Weibo...');

    // ผูกอีเวนต์การสลับหน้า
    document.querySelectorAll('.weibo-tabs .tab-item').forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const page = tab.dataset.page;

        // อัปเดตสถานะที่เลือก
        document.querySelectorAll('.weibo-tabs .tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // สลับหน้า
        if (window.weiboUI) {
          window.weiboUI.setCurrentPage(page);
          window.weiboUI.refreshWeiboList();
        }

        console.log('[Weibo UI] สลับไปยังหน้า:', page);
      });
    });

    // เริ่มต้นเนื้อหา Weibo
    if (window.weiboUI) {
      // ตั้งค่าหน้าเริ่มต้น
      window.weiboUI.setCurrentPage('hot');

      // หน่วงเวลาในการโหลดเนื้อหา เพื่อให้แน่ใจว่า DOM เรนเดอร์ครบ
      setTimeout(() => {
        window.weiboUI.refreshWeiboList();
      }, 100);
    }

    console.log('[Weibo UI] ✅ ผูกอีเวนต์ Weibo เสร็จสมบูรณ์');
  } catch (error) {
    console.error('[Weibo UI] ผูกอีเวนต์ Weibo ล้มเหลว:', error);
  }
}

// ตรวจสอบให้แน่ใจว่าฟังก์ชัน global ใช้งานได้
if (typeof window !== 'undefined') {
  window.getWeiboAppContent = getWeiboAppContent;
  window.bindWeiboEvents = bindWeiboEvents;

  // 🔥 เพิ่มฟังก์ชัน global สำหรับแก้ไขเลย์เอาต์ของความคิดเห็น
  window.fixWeiboCommentLayout = function () {
    console.log('🔧 [ฟังก์ชัน global] กำลังแก้ไขเลย์เอาต์ความคิดเห็น Weibo...');
    if (window.WeiboUI && window.WeiboUI.manualFixCommentLayout) {
      return window.WeiboUI.manualFixCommentLayout();
    } else {
      console.error('❌ ไม่พบคลาส WeiboUI ไม่สามารถดำเนินการแก้ไขได้');
      return { total: 0, fixed: 0 };
    }
  };

  // 🔥 เพิ่มฟังก์ชัน global สำหรับตรวจสอบเลย์เอาต์ของความคิดเห็น
  window.checkWeiboCommentLayout = function () {
    console.log('🔍 [ฟังก์ชัน global] กำลังตรวจสอบสถานะเลย์เอาต์ความคิดเห็น Weibo...');
    const commentItems = document.querySelectorAll('.weibo-app .comment-item');
    let issues = [];

    commentItems.forEach((item, index) => {
      const author = item.querySelector('.comment-author');
      const info = item.querySelector('.comment-info');

      if (author) {
        const authorComputed = window.getComputedStyle(author);
        if (authorComputed.flexDirection !== 'row' || authorComputed.display !== 'flex') {
          issues.push(
            `ความคิดเห็น ${index + 1}: เลย์เอาต์ส่วนผู้เขียนผิดปกติ (display: ${authorComputed.display}, flex-direction: ${
              authorComputed.flexDirection
            })`,
          );
        }
      }

      if (info) {
        const infoComputed = window.getComputedStyle(info);
        if (infoComputed.flexDirection !== 'column' || infoComputed.display !== 'flex') {
          issues.push(
            `ความคิดเห็น ${index + 1}: เลย์เอาต์ส่วนข้อมูลผิดปกติ (display: ${infoComputed.display}, flex-direction: ${
              infoComputed.flexDirection
            })`,
          );
        }
      }
    });

    console.log(`📊 ผลการตรวจสอบ: รวม ${commentItems.length} ความคิดเห็น พบ ${issues.length} ปัญหาเลย์เอาต์`);
    if (issues.length > 0) {
      console.warn('⚠️ ปัญหาที่พบ:');
      issues.forEach(issue => console.warn(`  - ${issue}`));
      console.log('💡 แนะนำให้รัน: fixWeiboCommentLayout() เพื่อแก้ไขปัญหาเหล่านี้');
    } else {
      console.log('✅ เลย์เอาต์ความคิดเห็นทั้งหมดปกติ');
    }

    return { total: commentItems.length, issues: issues.length, details: issues };
  };

  console.log('🔧 [Weibo UI] โหลดเครื่องมือแก้ไขเลย์เอาต์ความคิดเห็นแล้ว');
  console.log('💡 คำสั่งที่ใช้ได้:');
  console.log('  - fixWeiboCommentLayout() : แก้ไขปัญหาเลย์เอาต์ความคิดเห็น');
  console.log('  - checkWeiboCommentLayout() : ตรวจสอบสถานะเลย์เอาต์ความคิดเห็น');
}
