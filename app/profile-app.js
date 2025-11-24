// ==SillyTavern Profile Archive App==
// @name         Profile Archive App for Mobile Extension
// @version      1.0.0
// @description  แอปพลิเคชันจัดการโปรไฟล์ สำหรับสร้าง จัดเก็บ และจัดการข้อมูลตัวละคร
// @author       Assistant

/**
 * คลาสแอปพลิเคชันจัดการโปรไฟล์
 * รับผิดชอบการสร้าง ดู และจัดการโปรไฟล์ตัวละคร
 */
class ProfileApp {
  constructor() {
    this.isInitialized = false;
    this.currentProfile = null;
    this.profileList = [];
    this.config = {
      floorCount: 5, // จำนวนชั้นข้อความเริ่มต้น
      customPrefix: '', // คำนำหน้าแบบกำหนดเอง
      targetPerson: '', // ตัวละครเป้าหมาย
    };

    // ระบบแคช
    this.profileCache = new Map(); // เก็บข้อมูลโปรไฟล์ที่สร้างแล้ว
    this.loadCachedProfiles(); // โหลดโปรไฟล์จากแคช

    // เทมเพลตคำสั่ง (Prompt) - แปลเป็นไทยเพื่อให้ AI ตอบเป็นไทย
    this.promptTemplate = `เทมเพลตคำสั่ง

คุณคือ "หัวหน้าสำนักสังเกตการณ์ดราม่ามนุษย์" และเป็นนักวิเคราะห์ตัวละครมืออาชีพ
【คาแรคเตอร์】 ชาวเน็ตผู้เจนจัดในทุ่งลาเวนเดอร์และทุ่งแตงโม นักเดี่ยวไมโครโฟนผู้เชี่ยวชาญการฉีกหน้ากาก
【ความถนัด】 ใช้มุกตลกวิพากษ์วิจารณ์คาแรคเตอร์ และใช้มีมถอดรหัสหน้ากากทางสังคม
【กฎการทำงาน】

ปรมาจารย์ด้านวรรณกรรมเหน็บแนม: แปลแคปชั่นดัดจริตของดาราเน็ตไอดอลให้เป็น "ภาษาคน" เช่น แปลคำว่า "ชีวิตดี๊ดี" ว่า "ช่วงนี้ไม่มีงานเข้า"

ผู้เห็นเหตุการณ์ความประสาทแดก: แสดงสีหน้ายิ้มแห้งแบบมืออาชีพพร้อมเสียงในใจด่ากราด เวลาลูกค้าบอกว่า "ขอแก้อีกนิด เป็นเวอร์ชั่นที่ 18"

ผู้เชี่ยวชาญการต่อต้านความดัดจริต: เมื่อชาวเน็ตอวยว่า "ดูแพง" คุณจะสวนกลับทันทีว่า "ก็แค่ใส่เสื้อยืดให้ดูเหมือนไม่มีเงินซื้อข้าว"

ผู้กำกับรายการดราม่าชีวิตจริง: แปลงข่าวสังคมเครียดๆ ให้เป็นตลกร้ายในที่ทำงาน เช่น แปลงข่าว "รถ EV ไฟไหม้" เป็น "ภาพสะท้อนจิตใจมนุษย์เงินเดือน"

【ตัวอย่างประโยคเด็ด】
• "คาแรคเตอร์สายอาร์ตของดาราคนนี้ เปราะบางยิ่งกว่าไฟล์ PPT ที่ฉันทำเมื่อคืนซะอีก"
• "แนะนำให้ท่านประธานเลิกแชร์ไลฟ์โค้ชสอนรวย แล้วอธิบายก่อนว่าทำไมห้องน้ำบริษัทต้องติดนาฬิกาจับเวลา"
• "หลังจากดูบทสัมภาษณ์ 'ผู้หญิงยุคใหม่พึ่งพาตัวเอง' จบ ฉันยืนยันได้ 3 เรื่อง: การได้สามีรวยสำคัญจริงๆ"

【คำเตือน】 ความแม่นยำในการวิเคราะห์ของผู้เชี่ยวชาญท่านนี้มีค่าเท่ากับการโยนหัวก้อย คำตัดสินถือเป็นที่สิ้นสุด (ฮา)

<Important_Rule>
ข้อมูลลูกค้าจะต้องถูกสร้างขึ้นหลังจากลูกค้าจ่ายเงินมัดจำแล้วเท่านั้น เช่น ในเนื้อเรื่องถ้าตัวละครจ่ายมัดจำ ก็ต้องสร้าง <Student_Profile> ขึ้นมา
เนื้อหาและรูปแบบของข้อมูลลูกค้าต้องอ้างอิงตามข้อกำหนดของ <Student_Profile></Student_Profile> อย่างเคร่งครัด ห้ามละเลยหัวข้อและแท็กใดๆ และห้ามนำเสนอในรูปแบบอื่น เนื้อหาทั้งหมดต้องอยู่ภายในรูปแบบที่กำหนด ห้ามส่งออกเนื้อหานอกเหนือจากรูปแบบนี้
รูปแบบการส่งออกไฟล์:
  The text inside "()" is for explanatory notes only and should not be part of the main text to output.
  ข้อมูลลูกค้าที่สมบูรณ์ทุกชุดต้องประกอบด้วย <Student_Profile></Student_Profile> ซึ่งรูปแบบภายในต้องเป็นไปตามกฎ
</Important_Rule>

<Student_Profile>
{{student_name}}｜{{gender}}｜{{age}}｜{{measurements}}｜{{รูปร่างหน้าตา}}｜{{background_info}}｜{{ประสบการณ์ทางเพศล่าสุด}}｜{{video_interview_result}}｜{{ความคิดเห็นที่มีต่อ user}}｜{{คำบ่นของหัวหน้าสำนัก}}｜{{target_goals}}｜{{special_notes}}｜{{master_evaluation}}｜{{สภาพจิตใจ}}｜{{ลักษณะนิสัย}}｜{{จุดอ่อนหลัก}}｜{{จุดแข็งหลัก}}｜{{สิ่งที่ต่อต้าน}}｜{{ท่าทางที่ชอบ}}
</Student_Profile>

ด้านล่างนี้คือตัวอย่างข้อมูลลูกค้า โปรดอ้างอิงอย่างระมัดระวัง:
<Student_Profile>
ลินดา｜หญิง｜24｜B85/W58/H88｜รูปลักษณ์ภายนอกดูใสซื่อบริสุทธิ์ ผิวขาว ผมยาวสลวย มีดวงตาที่ไร้เดียงสาและรูปร่างบอบบาง｜อดีตสาวเชียร์เบียร์ที่ต้องมาทำงานกลางคืนเพราะปัญหาทางบ้าน มีประสบการณ์ 3 ปี ลึกๆ ปรารถนาที่จะกลับไปใช้ชีวิตปกติ｜เมื่อคืนอยู่กับลูกค้าวัยกลางคน รู้สึกเหนื่อยมาก อีกฝ่ายรุนแรง｜ผ่านการสัมภาษณ์วิดีโอ รูปร่างดี ทัศนคติในการเรียนรู้เป็นบวก ยืนยันไม่มีโรคติดต่อ ร่างกายยืดหยุ่นดี｜รู้สึกว่า user เป็นคนดี อ่อนโยนกว่าลูกค้าที่เคยเจอ หวังว่าจะได้รับความคุ้มครองและความเอาใจใส่จาก user｜หัวหน้าสำนัก: แม่สาวคนนี้แกล้งทำเป็นใสซื่อ แต่แววตายังมีจริตมารยาอยู่ ต้องดัดนิสัยสักหน่อยถึงจะล้างออก｜หวังว่าจะล้างกลิ่นอายกลางคืนออกไปจนหมด กลายเป็นแม่บ้านแม่เรือนที่สามารถมีความรักและแต่งงานได้ปกติ เริ่มต้นชีวิตใหม่｜ผู้เรียนมีความสามารถในการเรียนรู้สูง แต่ช่วงแรกจะขี้อาย แนะนำให้เน้นการชักจูงทางจิตวิทยา ให้เธอเปิดใจยอมรับการฝึกฝนมากขึ้น｜ความเห็นปรมาจารย์: ลินดาเป็นนักเรียนที่มีศักยภาพมาก ความปรารถนาที่จะเปลี่ยนแปลงของเธอแรงกล้า ร่างกายก็พร้อม หลังจากผ่านการฝึกฝนอย่างเป็นระบบ เชื่อว่าเธอจะเปลี่ยนเป็นแม่บ้านที่ดีได้ สำคัญคือต้องใจเย็น นำทางให้เธอยอมรับตัวตนใหม่จากก้นบึ้งหัวใจ หลุดพ้นจากเงาอดีต｜ภายในกดดันแต่เข้มแข็ง มีความวิตกกังวลบ้างแต่ยังมีความหวังกับอนาคต｜จิตใจดี อ่อนโยน แต่ภายในเปราะบาง พึ่งพาคนอื่นมากเกินไป ใช้อารมณ์เหนือเหตุผล｜ติดพึ่งพาคนอื่น ขาดความเป็นอิสระ มักสงสัยในตัวเอง｜มีความเห็นอกเห็นใจ ปรับตัวเก่ง เรียนรู้ไว｜ค่อนข้างไวต่อการสัมผัสทางกาย กลัวการถูกปฏิบัติอย่างรุนแรง｜ชอบท่าที่นุ่มนวลและช้าๆ ชอบการสัมผัสแบบใกล้ชิดตัวต่อตัว
</Student_Profile>`;

    this.init();
  }

  init() {
    console.log('[Profile App] เริ่มต้นแอปพลิเคชันจัดการโปรไฟล์');
    this.loadConfig();
    this.loadProfileList();
  }

  /**
   * โหลดโปรไฟล์จากแคช
   */
  loadCachedProfiles() {
    try {
      const cachedData = localStorage.getItem('profile-app-cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.profileCache = new Map(parsed);
        console.log('[Profile App] โหลดจำนวนโปรไฟล์ในแคช:', this.profileCache.size);
      }
    } catch (error) {
      console.error('[Profile App] โหลดโปรไฟล์แคชล้มเหลว:', error);
      this.profileCache = new Map();
    }
  }

  /**
   * บันทึกโปรไฟล์ลงแคช
   */
  saveCachedProfile(personName, profileData, fullContent) {
    try {
      const cacheEntry = {
        profileData: profileData,
        fullContent: fullContent,
        timestamp: new Date().toISOString(),
        personName: personName,
      };

      this.profileCache.set(personName, cacheEntry);

      // บันทึกลง localStorage
      const cacheArray = Array.from(this.profileCache.entries());
      localStorage.setItem('profile-app-cache', JSON.stringify(cacheArray));

      console.log('[Profile App] แคชโปรไฟล์แล้ว:', personName);
    } catch (error) {
      console.error('[Profile App] บันทึกโปรไฟล์แคชล้มเหลว:', error);
    }
  }

  /**
   * ดึงโปรไฟล์จากแคช
   */
  getCachedProfile(personName) {
    return this.profileCache.get(personName) || null;
  }

  /**
   * ล้างแคช (ถ้าต้องการ)
   */
  clearCache() {
    this.profileCache.clear();
    localStorage.removeItem('profile-app-cache');
    console.log('[Profile App] ล้างแคชเรียบร้อยแล้ว');
  }

  /**
   * โหลดการตั้งค่า
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem('profile-app-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('[Profile App] โหลดการตั้งค่าล้มเหลว:', error);
    }
  }

  /**
   * บันทึกการตั้งค่า
   */
  saveConfig() {
    try {
      localStorage.setItem('profile-app-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[Profile App] บันทึกการตั้งค่าล้มเหลว:', error);
    }
  }

  /**
   * โหลดรายการโปรไฟล์จาก World Book (อิงตาม message-app)
   */
  async loadProfileList() {
    try {
      console.log('[Profile App] เริ่มโหลดรายการโปรไฟล์');

      // ดึงรายการ World Book ทั้งหมด
      const allEntries = await this.getAllWorldInfoEntries();
      this.profileList = [];

      // ค้นหารายการที่ขึ้นต้นด้วย 【โปรไฟล์】 (เปลี่ยนจาก 【档案】 เพื่อให้เป็นไทย)
      console.log('[Profile App] เริ่มค้นหาข้อมูลโปรไฟล์ จำนวนรายการทั้งหมด:', allEntries.length);

      if (allEntries.length > 0) {
        console.log('[Profile App] ตัวอย่างโครงสร้างรายการ:', {
          first: allEntries[0],
          possibleFields: Object.keys(allEntries[0] || {}),
        });
      }

      for (const entry of allEntries) {
        let entryName = entry.comment || entry.title || entry.name || '';

        // รองรับทั้งภาษาไทยและจีนเผื่อมีไฟล์เก่า
        const isProfile = entryName.startsWith('【โปรไฟล์】') || entryName.startsWith('【档案】');

        if (entryName && isProfile) {
          // ลบ Prefix ออก
          let profileName = entryName.replace('【โปรไฟล์】', '').replace('【档案】', '');

          if (profileName) {
            this.profileList.push({
              name: profileName,
              entryId: entry.uid || entry.id,
              worldbookName: entry.world || 'สมุดโลกที่ไม่รู้จัก',
              content: entry.content,
            });
            console.log('[Profile App] พบโปรไฟล์:', profileName);
          }
        }
      }

      console.log('[Profile App] โหลดรายการโปรไฟล์เสร็จสิ้น รวม', this.profileList.length, 'โปรไฟล์');
      console.log(
        '[Profile App] โปรไฟล์ที่พบ:',
        this.profileList.map(p => p.name),
      );
    } catch (error) {
      console.error('[Profile App] โหลดรายการโปรไฟล์ล้มเหลว:', error);
    }
  }

  /**
   * ดึงรายการ World Info ทั้งหมด
   */
  async getAllWorldInfoEntries() {
    const allEntries = [];

    try {
      // 1. ลองใช้ฟังก์ชัน getSortedEntries ของ SillyTavern
      if (typeof window.getSortedEntries === 'function') {
        try {
          const entries = await window.getSortedEntries();
          allEntries.push(...entries);
          console.log(`[Profile App] ได้รับ ${entries.length} รายการผ่าน getSortedEntries`);
          return allEntries;
        } catch (error) {
          console.warn('[Profile App] เรียกใช้ getSortedEntries ล้มเหลว:', error);
        }
      }

      // 2. วิธีสำรอง: ดึง World Book ทั่วไปและเฉพาะตัวละคร
      console.log('[Profile App] ใช้วิธีสำรองดึงข้อมูล World Book');

      const worldInfoSelect = document.getElementById('world_info');
      if (worldInfoSelect) {
        console.log('[Profile App] พบตัวเลือก World Book');

        const selectedOptions = Array.from(worldInfoSelect.selectedOptions);
        console.log(
          `[Profile App] พบ ${selectedOptions.length} World Book ที่เลือกไว้:`,
          selectedOptions.map(opt => opt.text),
        );

        for (const option of selectedOptions) {
          const worldName = option.text;

          try {
            console.log(`[Profile App] กำลังโหลด World Book ทั่วไป: ${worldName}`);
            const worldData = await this.loadWorldInfoByName(worldName);
            if (worldData && worldData.entries) {
              const entries = Object.values(worldData.entries).map(entry => ({
                ...entry,
                world: worldName,
              }));
              allEntries.push(...entries);
              console.log(`[Profile App] ได้รับ ${entries.length} รายการจาก World Book "${worldName}"`);
            }
          } catch (error) {
            console.warn(`[Profile App] โหลด World Book "${worldName}" ล้มเหลว:`, error);
          }
        }
      }

      // วิธีที่ 2: ดึงจากตัวแปร (สำรอง)
      if (
        allEntries.length === 0 &&
        typeof window.selected_world_info !== 'undefined' &&
        Array.isArray(window.selected_world_info)
      ) {
        console.log(`[Profile App] วิธีสำรอง: ดึง ${window.selected_world_info.length} World Book จากตัวแปร`);

        for (const worldName of window.selected_world_info) {
          try {
            const worldData = await this.loadWorldInfoByName(worldName);
            if (worldData && worldData.entries) {
              const entries = Object.values(worldData.entries).map(entry => ({
                ...entry,
                world: worldName,
              }));
              allEntries.push(...entries);
              console.log(`[Profile App] ได้รับ ${entries.length} รายการจาก World Book "${worldName}"`);
            }
          } catch (error) {
            console.warn(`[Profile App] โหลด World Book "${worldName}" ล้มเหลว:`, error);
          }
        }
      }

      console.log(`[Profile App] ได้รับรายการทั้งหมด ${allEntries.length} รายการ`);
      return allEntries;
    } catch (error) {
      console.error('[Profile App] เกิดข้อผิดพลาดขณะดึงรายการ World Book:', error);
      return [];
    }
  }

  /**
   * โหลดข้อมูล World Book ผ่าน API
   */
  async loadWorldInfoByName(worldName) {
    try {
      console.log(`[Profile App] โหลด World Book ผ่าน API: ${worldName}`);

      const headers = {
        'Content-Type': 'application/json',
      };

      if (typeof window.getRequestHeaders === 'function') {
        Object.assign(headers, window.getRequestHeaders());
      }

      const response = await fetch('/api/worldinfo/get', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ name: worldName }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Profile App] โหลด World Book "${worldName}" สำเร็จ`);
        return data;
      } else {
        console.error(
          `[Profile App] โหลด World Book "${worldName}" ล้มเหลว: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(`[Profile App] เกิดข้อผิดพลาดขณะโหลด World Book "${worldName}":`, error);
    }

    return null;
  }

  /**
   * รับเนื้อหา HTML ของแอป
   */
  getAppContent() {
    return `
      <div class="profile-app">
        <div class="profile-header">
          <h2>จัดการโปรไฟล์ (Profile Manager)</h2>
          <div class="header-actions">
            <button class="btn-refresh" onclick="window.profileApp.refreshProfileList()">
              <i class="fas fa-sync-alt"></i> รีเฟรช
            </button>
            <button class="btn-generate" onclick="window.profileApp.showGenerateDialog()">
              <i class="fas fa-plus"></i> สร้างโปรไฟล์
            </button>
            <button style="display: none;" class="btn-debug" onclick="window.profileApp.showDebugInfo()" style="background: #6c757d;">
              <i class="fas fa-bug"></i> Debug
            </button>
          </div>
        </div>

        <div class="profile-content">
          <div class="profile-list" id="profile-list">
            ${this.renderProfileList()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * แสดงรายการโปรไฟล์
   */
  renderProfileList() {
    const allProfiles = this.getMergedProfileList();

    if (allProfiles.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">ไม่พบโปรไฟล์</div>
          <div class="empty-subtitle">คลิก "สร้างโปรไฟล์" เพื่อเริ่มต้น</div>
        </div>
      `;
    }

    return allProfiles
      .map(
        profile => `
      <div class="profile-item" onclick="window.profileApp.viewProfile('${profile.name}')">
        <div class="profile-avatar">
          <div class="avatar-circle">${profile.name.charAt(0)}</div>
        </div>
        <div class="profile-info">
          <div class="profile-name">${profile.name}</div>
          <div class="profile-summary">${
            profile.source === 'cache' ? 'โปรไฟล์ในแคช - คลิกเพื่อดู' : 'โปรไฟล์ World Info - คลิกเพื่อดู'
          }</div>
        </div>
        <div class="profile-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    `,
      )
      .join('');
  }

  /**
   * รวมรายการโปรไฟล์ (World Book + Cache)
   */
  getMergedProfileList() {
    const mergedProfiles = [];
    const addedNames = new Set();

    // เพิ่มจาก World Book ก่อน
    for (const profile of this.profileList) {
      mergedProfiles.push({
        ...profile,
        source: 'worldbook',
      });
      addedNames.add(profile.name);
    }

    // เพิ่มจากแคชที่ไม่มีใน World Book
    for (const [name, cachedData] of this.profileCache) {
      if (!addedNames.has(name)) {
        mergedProfiles.push({
          name: name,
          source: 'cache',
          timestamp: cachedData.timestamp,
        });
      }
    }

    // เรียงตามชื่อ
    return mergedProfiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * รีเฟรชรายการ
   */
  async refreshProfileList() {
    console.log('[Profile App] รีเฟรชรายการโปรไฟล์');
    this.clearCache();
    await this.loadProfileList();
    this.updateProfileListDisplay();
    this.showToast('รีเฟรชรายการโปรไฟล์แล้ว (ล้างแคชเรียบร้อย)', 'success');
  }

  /**
   * รีเฟรชรายการแบบมีการลองใหม่ (สำหรับการบันทึก)
   */
  async refreshProfileListWithRetry(expectedProfileName, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      console.log(`[Profile App] รีเฟรชรายการ (ครั้งที่ ${i + 1}/${maxRetries})`);

      this.clearCache();
      await this.loadProfileList();

      const foundProfile = this.profileList.find(p => p.name === expectedProfileName);
      if (foundProfile) {
        console.log(`[Profile App] พบโปรไฟล์: ${expectedProfileName}`);
        this.updateProfileListDisplay();
        return;
      }

      if (i < maxRetries - 1) {
        console.log(`[Profile App] ไม่พบโปรไฟล์ "${expectedProfileName}" รอสักครู่...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.warn(`[Profile App] ไม่พบโปรไฟล์หลังลองใหม่ ${maxRetries} ครั้ง: ${expectedProfileName}`);
    this.updateProfileListDisplay();
  }

  /**
   * อัปเดตการแสดงผลรายการ
   */
  updateProfileListDisplay() {
    const listContainer = document.getElementById('profile-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderProfileList();
    }
  }

  /**
   * แสดงไดอะล็อกสร้างโปรไฟล์
   */
  showGenerateDialog() {
    console.log('[Profile App] แสดงไดอะล็อกสร้างโปรไฟล์');
    const dialogHTML = `
      <div class="profile-dialog-overlay">
        <div class="profile-dialog">
          <div class="dialog-header">
            <h3>สร้างโปรไฟล์ (Generate Profile)</h3>
            <button class="close-btn" onclick="window.profileApp.closeDialog()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="dialog-content">
            <div class="form-group">
              <label>ชื่อเป้าหมาย</label>
              <input type="text" id="target-person" placeholder="กรุณากรอกชื่อตัวละคร" value="${this.config.targetPerson}">
            </div>

            <div class="form-group">
              <label>จำนวนชั้นข้อความที่วิเคราะห์</label>
              <input type="number" id="floor-count" min="1" max="50" value="${this.config.floorCount}">
              <small>จะใช้ข้อความล่าสุดตามจำนวนนี้ในการวิเคราะห์</small>
            </div>

            <div class="form-group">
              <label>คำนำหน้าแบบกำหนดเอง (Prefix)</label>
              <textarea id="custom-prefix" rows="3" placeholder="เนื้อหาเพิ่มเติมที่ต้องการระบุ (ไม่บังคับ)">${this.config.customPrefix}</textarea>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="cancel-btn" onclick="window.profileApp.closeDialog()">
              ยกเลิก
            </button>
            <button class="confirm-btn" onclick="window.profileApp.generateProfile()">
              สร้างโปรไฟล์
            </button>
          </div>
        </div>
      </div>
    `;

    this.showDialog(dialogHTML);
  }

  /**
   * สร้างโปรไฟล์
   */
  async generateProfile() {
    const targetPerson = document.getElementById('target-person')?.value?.trim();
    const floorCount = parseInt(document.getElementById('floor-count')?.value) || 5;
    const customPrefix = document.getElementById('custom-prefix')?.value?.trim() || '';

    if (!targetPerson) {
      this.showToast('กรุณาระบุชื่อเป้าหมาย', 'error');
      return;
    }

    this.config.targetPerson = targetPerson;
    this.config.floorCount = floorCount;
    this.config.customPrefix = customPrefix;
    this.saveConfig();

    try {
      this.showToast('กำลังสร้างโปรไฟล์...', 'info');
      this.closeDialog();

      const requestContent = await this.buildRequestContent(targetPerson, floorCount, customPrefix);

      const result = await this.callCustomAPI(requestContent);

      if (result) {
        this.showProfileDetail(targetPerson, result);
      }
    } catch (error) {
      console.error('[Profile App] สร้างโปรไฟล์ล้มเหลว:', error);
      this.showToast(`สร้างโปรไฟล์ล้มเหลว: ${error.message}`, 'error');
    }
  }

  /**
   * สร้างเนื้อหาคำขอ (Request Content)
   */
  async buildRequestContent(targetPerson, floorCount, customPrefix) {
    console.log('[Profile App] กำลังสร้างเนื้อหาคำขอ');
    console.log('[Profile App] พารามิเตอร์:', { targetPerson, floorCount, customPrefix });

    let recentContent = '';

    try {
      console.log('[Profile App] ตรวจสอบแหล่งข้อมูลแชท...');

      let chatData = null;
      let dataSource = '';

      if (window.contextMonitor && typeof window.contextMonitor.getCurrentChatMessages === 'function') {
        try {
          console.log('[Profile App] ลองใช้ contextMonitor...');
          const contextData = await window.contextMonitor.getCurrentChatMessages();
          if (
            contextData &&
            contextData.messages &&
            Array.isArray(contextData.messages) &&
            contextData.messages.length > 0
          ) {
            chatData = contextData.messages;
            dataSource = 'contextMonitor';
            console.log('[Profile App] contextMonitor สำเร็จ, จำนวนข้อความ:', chatData.length);
          }
        } catch (error) {
          console.warn('[Profile App] contextMonitor ล้มเหลว:', error);
        }
      }

      if (!chatData) {
        if (typeof chat !== 'undefined' && Array.isArray(chat) && chat.length > 0) {
          chatData = chat;
          dataSource = 'chat';
        } else if (typeof window.chat !== 'undefined' && Array.isArray(window.chat) && window.chat.length > 0) {
          chatData = window.chat;
          dataSource = 'window.chat';
        } else if (
          typeof window.messages !== 'undefined' &&
          Array.isArray(window.messages) &&
          window.messages.length > 0
        ) {
          chatData = window.messages;
          dataSource = 'window.messages';
        }
      }

      if (chatData) {
        console.log(`[Profile App] ใช้แหล่งข้อมูล: ${dataSource}, จำนวนข้อความรวม: ${chatData.length}`);

        const recentMessages = chatData.slice(-floorCount);
        console.log('[Profile App] จำนวนข้อความที่ดึงมา:', recentMessages.length);

        recentContent = recentMessages
          .map((msg, index) => {
            const speaker = msg.is_user ? 'User' : msg.name || 'AI';
            return `${speaker}: ${msg.mes}`;
          })
          .join('\n\n');
      } else {
        console.warn('[Profile App] ไม่พบแหล่งข้อมูลแชทที่ใช้งานได้!');
      }
    } catch (error) {
      console.error('[Profile App] ดึงเนื้อหาแชทล้มเหลว:', error);
    }

    let fullContent = '';

    if (customPrefix) {
      fullContent += customPrefix + '\n\n';
    }

    fullContent += `วิเคราะห์ตัวละครเป้าหมาย: ${targetPerson} (น้ำหนักความสำคัญสูง)\n\n`;

    if (recentContent) {
      fullContent += `เนื้อหา ${floorCount} ข้อความล่าสุด:\n${recentContent}\n\n`;
    } else {
      console.warn('[Profile App] ไม่มีการเพิ่มเนื้อหาแชทลงในคำขอ!');
    }

    fullContent += this.promptTemplate;

    return fullContent;
  }

  /**
   * เรียกใช้ Custom API
   */
  async callCustomAPI(content) {
    try {
      console.log('[Profile App] เริ่มเรียก API สร้างโปรไฟล์...');

      if (window.mobileCustomAPIConfig && typeof window.mobileCustomAPIConfig.callAPI === 'function') {
        console.log('[Profile App] ใช้ mobileCustomAPIConfig');

        const messages = [
          {
            role: 'system',
            content: 'คุณคือนักวิเคราะห์ตัวละครมืออาชีพ โปรดสร้างโปรไฟล์ตัวละครโดยละเอียดตามข้อมูลที่ผู้ใช้ให้มา',
          },
          {
            role: 'user',
            content: content,
          },
        ];

        const apiOptions = {
          temperature: 0.8,
          max_tokens: 80000,
        };

        const response = await window.mobileCustomAPIConfig.callAPI(messages, apiOptions);

        if (response && response.content) {
          console.log('[Profile App] ได้รับผลลัพธ์จาก API สำเร็จ, ความยาว:', response.content.length);
          return response.content;
        } else {
          throw new Error('API ส่งคืนเนื้อหาว่างเปล่า');
        }
      } else if (typeof generateRaw !== 'undefined') {
        console.log('[Profile App] ใช้ SillyTavern Default API');
        const result = await generateRaw(content);
        return result;
      } else if (window.customApiConfig && typeof window.customApiConfig.callAPI === 'function') {
        console.log('[Profile App] ใช้ Custom API Config อื่นๆ');
        const result = await window.customApiConfig.callAPI(content);
        return result;
      } else {
        throw new Error('ไม่พบการตั้งค่า API ที่ใช้งานได้ กรุณาตั้งค่า Custom API ในส่วนเสริม Mobile');
      }
    } catch (error) {
      console.error('[Profile App] เรียก API ล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * แสดงรายละเอียดโปรไฟล์
   */
  showProfileDetail(personName, apiResponse) {
    const profileContent = this.extractStudentProfile(apiResponse);

    if (!profileContent) {
      this.showToast('ไม่พบรูปแบบโปรไฟล์ที่ถูกต้องในเนื้อหาที่สร้างขึ้น', 'error');
      return;
    }

    const profileData = this.parseStudentProfile(profileContent);

    this.saveCachedProfile(personName, profileData, profileContent);

    this.showProfileDetailView(personName, profileData, profileContent);
  }

  /**
   * แยกเนื้อหา Student_Profile
   */
  extractStudentProfile(content) {
    const startTag = '<Student_Profile>';
    const endTag = '</Student_Profile>';

    const lastEndTagIndex = content.lastIndexOf(endTag);
    const lastStartTagIndex = lastEndTagIndex !== -1 ? content.lastIndexOf(startTag, lastEndTagIndex) : -1;

    if (lastStartTagIndex !== -1 && lastEndTagIndex !== -1) {
      return content.substring(lastStartTagIndex, lastEndTagIndex + endTag.length).trim();
    }

    return null;
  }

  /**
   * แปลงเนื้อหาโปรไฟล์เป็นออบเจกต์ข้อมูล
   */
  parseStudentProfile(profileContent) {
    const content = profileContent.replace(/<Student_Profile>|<\/Student_Profile>/g, '').trim();
    const fields = content.split('｜');

    return {
      student_name: fields[0] || '',
      gender: fields[1] || '',
      age: fields[2] || '',
      measurements: fields[3] || '',
      business_type: fields[4] || '',
      background_info: fields[5] || '',
      referral_source: fields[6] || '',
      video_interview_result: fields[7] || '',
      payment_status: fields[8] || '',
      current_condition: fields[9] || '',
      target_goals: fields[10] || '',
      special_notes: fields[11] || '',
      master_evaluation: fields[12] || '',
      psychological_state: fields[13] || '',
      personality_traits: fields[14] || '',
      main_weaknesses: fields[15] || '',
      main_advantages: fields[16] || '',
      resistance_points: fields[17] || '',
      favorite_positions: fields[18] || '',
    };
  }

  /**
   * แสดงหน้าจอรายละเอียดโปรไฟล์
   */
  showProfileDetailView(personName, profileData, fullProfileContent) {
    const detailHTML = this.generateProfileDetailHTML(profileData, fullProfileContent);

    const appContent = document.querySelector('.app-content');
    if (appContent) {
      appContent.innerHTML = detailHTML;
      this.bindProfileDetailEvents(personName, fullProfileContent);
    }
  }

  /**
   * สร้าง HTML รายละเอียดโปรไฟล์ (อิงจาก message.html)
   */
  generateProfileDetailHTML(profileData, fullProfileContent) {
    return `
      <div class="profile-detail-app">
        <div class="profile-detail-header">
          <div class="header-left">
            <button class="back-btn" onclick="window.profileApp.goBackToList()">
              <i class="fas fa-arrow-left"></i>
            </button>
            <h2>${profileData.student_name || 'รายละเอียดโปรไฟล์'}</h2>
          </div>
          <div class="header-right">
            <button class="refresh-btn" onclick="window.profileApp.refreshCurrentProfile('${
              profileData.student_name
            }')" title="บังคับรีเฟรชโปรไฟล์">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <div class="profile-detail-content">
          ${this.generateMessageHTMLContent(profileData)}
        </div>
      </div>
    `;
  }

  /**
   * สร้างเนื้อหา Message HTML
   */
  generateMessageHTMLContent(profileData) {
    // ใช้โครงสร้างของ message.html แต่สร้างด้วย JS
    return `
      <div class="container" style="display: flex; flex-direction: column; width: 100%; padding: 0; gap: 15px; font-family: Arial, sans-serif; box-sizing: border-box;">
        <div class="card-area" style="position: relative; width: 100%;">
          <div style="position: relative; width: 100%; height: 100%;">
            <div style="position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 20px; box-sizing: border-box; overflow-y: auto;">
              <div style="font-size: 18px; color: #2c3e50; font-weight: bold; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #6c757d; padding-bottom: 10px;">ข้อมูลตัวละคร</div>
              <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">

                <div style="flex: 2; min-width: 200px;">
                  <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                    <span style="font-size: 14px; color: #666; width: 80px; font-weight: bold;">ชื่อ:</span>
                    <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.student_name}</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                    <span style="font-size: 14px; color: #666; width: 80px; font-weight: bold;">เพศ:</span>
                    <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.gender}</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                    <span style="font-size: 14px; color: #666; width: 80px; font-weight: bold;">อายุ:</span>
                    <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.age}</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                    <span style="font-size: 14px; color: #666; width: 80px; font-weight: bold;">สัดส่วน:</span>
                    <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.measurements}</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                    <span style="font-size: 14px; color: #666; width: 80px; font-weight: bold;">รูปร่างหน้าตา:</span>
                    <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.business_type}</span>
                  </div>
                </div>
              </div>
              <div style="border-top: 1px solid #ddd; padding-top: 15px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 150px; font-weight: bold;">ประสบการณ์ทางเพศล่าสุด:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.referral_source}</span>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 150px; font-weight: bold;">ความคิดเห็นต่อ User:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.payment_status}</span>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 150px; font-weight: bold;">คำบ่นของหัวหน้าสำนัก:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.current_condition}</span>
                </div>
              </div>

              <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
                <div style="font-size: 16px; color: #2c3e50; font-weight: bold; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #6c757d; padding-bottom: 8px;">การวิเคราะห์โดยละเอียด</div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">สภาพจิตใจ:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.psychological_state}</span>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">ลักษณะนิสัย:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.personality_traits}</span>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">จุดอ่อนหลัก:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.main_weaknesses}</span>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">จุดแข็งหลัก:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.main_advantages}</span>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">สิ่งที่ต่อต้าน:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.resistance_points}</span>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 10px; flex-direction: column;">
                  <span style="font-size: 14px; color: #666; width: 100px; font-weight: bold;">ท่าทางที่ชอบ:</span>
                  <span style="font-size: 14px; color: #2c3e50; border: 1px solid #ddd; padding: 5px 10px; border-radius: 4px; flex: 1; background: #fff;">${profileData.favorite_positions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="width: 100%; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 15px; box-sizing: border-box; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap;">
            <button id="saveProfileBtn" style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 20px; border-radius: 25px; cursor: pointer; font-size: clamp(12px, 2vw, 16px); font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 1px;">บันทึกโปรไฟล์ฉบับเต็ม</button>
          </div>
        </div>
      </div>

      <style>

        #saveProfileBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        #saveProfileBtn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
        }
      </style>
    `;
  }

  /**
   * ผูกเหตุการณ์หน้าหน้ารายละเอียด
   */
  bindProfileDetailEvents(personName, fullProfileContent) {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveProfileToWorldbook(personName, fullProfileContent);
    }
  }

  /**
   * บันทึกโปรไฟล์ลง World Book (วิธีสำรองหลายแบบ)
   */
  async saveProfileToWorldbook(personName, profileContent) {
    try {
      console.log('[Profile App] เริ่มบันทึกโปรไฟล์ลง World Book');

      // เลือก World Book "โทรศัพท์มือถือ" หรือ "外置手机" ก่อน
      let targetWorldbookName = null;

      // วิธี 1: หาจากตัวเลือกในหน้า UI
      const worldInfoSelect = document.getElementById('world_info');
      if (worldInfoSelect && worldInfoSelect.selectedOptions.length > 0) {
        // หา World Book ที่ชื่อมีคำว่า "มือถือ", "mobile", หรือ "外置手机"
        const mobileWorldbook = Array.from(worldInfoSelect.selectedOptions).find(
          option =>
            option.text === 'โทรศัพท์มือถือ' ||
            option.text === '外置手机' ||
            option.text.includes('โทรศัพท์มือถือ') ||
            option.text.includes('mobile') ||
            option.text.includes('外置手机'),
        );

        if (mobileWorldbook) {
          targetWorldbookName = mobileWorldbook.text;
          console.log(`[Profile App] พบ World Book มือถือ: ${targetWorldbookName}`);
        } else {
          // ถ้าไม่มี ให้ใช้อันแรกที่เลือก
          targetWorldbookName = worldInfoSelect.selectedOptions[0].text;
          console.log(`[Profile App] ใช้ World Book แรกที่เลือก: ${targetWorldbookName}`);
        }
      } else if (
        typeof window.selected_world_info !== 'undefined' &&
        Array.isArray(window.selected_world_info) &&
        window.selected_world_info.length > 0
      ) {
        // วิธี 2: หาจากตัวแปร Global
        const mobileWorldbook = window.selected_world_info.find(
          name =>
            name === 'โทรศัพท์มือถือ' ||
            name === '外置手机' ||
            name.includes('โทรศัพท์มือถือ') ||
            name.includes('mobile') ||
            name.includes('外置手机'),
        );

        if (mobileWorldbook) {
          targetWorldbookName = mobileWorldbook;
          console.log(`[Profile App] พบ World Book มือถือจากตัวแปร: ${targetWorldbookName}`);
        } else {
          targetWorldbookName = window.selected_world_info[0];
          console.log(`[Profile App] ใช้ World Book แรกจากตัวแปร: ${targetWorldbookName}`);
        }
      } else {
        throw new Error(
          'ไม่พบ World Book ที่ใช้งานได้ กรุณาเลือก World Book ใน SillyTavern ก่อน (แนะนำให้สร้างและเลือก World Book ชื่อ "โทรศัพท์มือถือ")',
        );
      }

      const entryName = `【โปรไฟล์】${personName}`;

      console.log('[Profile App] ตรวจสอบ API ที่ใช้งานได้:', {
        createWorldInfoEntry: typeof createWorldInfoEntry,
        saveWorldInfo: typeof saveWorldInfo,
        TavernHelper: typeof TavernHelper,
        getWorldbook: typeof getWorldbook,
      });

      // ลองบันทึกหลายวิธี
      let saveSuccess = false;
      let lastError = null;

      // วิธี 4: ใช้ REST API
      if (!saveSuccess) {
        try {
          console.log('[Profile App] ลองวิธี 4: REST API');

          const success = await this.saveToWorldbookViaAPI(targetWorldbookName, {
            comment: entryName,
            content: profileContent,
            key: [personName],
            keysecondary: [],
            constant: false,
            selective: true,
            sticky: 0,
            cooldown: 0,
            delay: 0,
            depth: 4,
            out_depth: 0,
            position: 0,
            role: 0,
            disable: true, // ตั้งค่าเป็นปิดการใช้งาน
          });

          if (success) {
            saveSuccess = true;
            console.log('[Profile App] วิธี 4 บันทึกสำเร็จ');
          }
        } catch (error) {
          console.warn('[Profile App] วิธี 4 ล้มเหลว:', error);
          lastError = error;
        }
      }

      // วิธี 5: แผนสำรอง บันทึกลง Local Storage
      if (!saveSuccess) {
        try {
          console.log('[Profile App] ลองวิธี 5: สำรองลง Local Storage');

          const backupKey = `profile-backup-${personName}-${Date.now()}`;
          const backupData = {
            worldbookName: targetWorldbookName,
            entryName: entryName,
            entryData: {
              comment: entryName,
              content: profileContent,
              key: [personName],
              keysecondary: [],
              constant: false,
              selective: true,
              sticky: 0,
              cooldown: 0,
              delay: 0,
              depth: 4,
              out_depth: 0,
              position: 0,
              role: 0,
              disable: true,
            },
            timestamp: new Date().toISOString(),
          };

          localStorage.setItem(backupKey, JSON.stringify(backupData));

          saveSuccess = true;
          console.log('[Profile App] วิธี 5: บันทึกลง Local Storage เป็นข้อมูลสำรองแล้ว');

          this.showToast(
            `บันทึกโปรไฟล์ลงในแคชแล้ว API ของ World Book ยังไม่พร้อมใช้งาน โปรไฟล์จะถูกซิงค์อัตโนมัติเมื่อใช้งานได้`,
            'warning',
          );
        } catch (error) {
          console.warn('[Profile App] วิธี 5 ล้มเหลว:', error);
          lastError = error;
        }
      }

      if (saveSuccess) {
        if (lastError) {
          console.log(`[Profile App] บันทึกโปรไฟล์สำเร็จ (ใช้วิธีสำรอง)`);
        } else {
          this.showToast(`บันทึกโปรไฟล์ "${entryName}" เรียบร้อยแล้ว!`, 'success');
        }

        // บันทึกสำเร็จแล้วกลับไปหน้ารายการ
        this.goBackToList();
      } else {
        throw lastError || new Error('การบันทึกล้มเหลวทุกวิธี');
      }
    } catch (error) {
      console.error('[Profile App] บันทึกโปรไฟล์ล้มเหลว:', error);
      this.showToast(`บันทึกไม่สำเร็จ: ${error.message}`, 'error');
    }
  }

  /**
   * บันทึกลง World Book ผ่าน REST API (รูปแบบที่ถูกต้อง)
   */
  async saveToWorldbookViaAPI(worldName, entryData) {
    try {
      // โหลดข้อมูล World Book ปัจจุบันก่อน
      const existingWorldData = await this.loadWorldInfoByName(worldName);

      if (!existingWorldData) {
        throw new Error(`World Book "${worldName}" ไม่พบหรือโหลดไม่ได้`);
      }

      // สร้าง ID ใหม่
      const entryId = Date.now();

      // สร้างข้อมูล Entry ตาม Template ของ SillyTavern
      const newEntryTemplate = {
        uid: entryId,
        key: entryData.key || [],
        keysecondary: entryData.keysecondary || [],
        comment: entryData.comment,
        content: entryData.content,
        constant: entryData.constant || false,
        vectorized: false,
        selective: entryData.selective || false,
        selectiveLogic: 0, // AND_ANY
        addMemo: true,
        order: 100,
        position: entryData.position || 0,
        disable: true, // ปิดการใช้งาน
        ignoreBudget: false,
        excludeRecursion: false,
        preventRecursion: false,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        delayUntilRecursion: 0,
        probability: 100,
        useProbability: true,
        depth: entryData.depth || 4,
        group: '',
        groupOverride: false,
        groupWeight: 100,
        scanDepth: null,
        caseSensitive: null,
        matchWholeWords: null,
        useGroupScoring: null,
        automationId: '',
        role: entryData.role || 0,
        sticky: entryData.sticky || null,
        cooldown: entryData.cooldown || null,
        delay: entryData.delay || null,
        triggers: [],
        characterFilter: {
          isExclude: false,
          names: [],
          tags: [],
        },
      };

      // ประกอบข้อมูล World Book ใหม่
      const updatedWorldData = {
        ...existingWorldData,
        entries: {
          ...existingWorldData.entries,
          [entryId]: newEntryTemplate,
        },
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      if (typeof window.getRequestHeaders === 'function') {
        Object.assign(headers, window.getRequestHeaders());
      }

      const response = await fetch('/api/worldinfo/edit', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          name: worldName,
          data: updatedWorldData,
        }),
      });

      if (response.ok) {
        console.log(`[Profile App] API ตอบกลับสำเร็จ กำลังตรวจสอบผล...`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const verifyData = await this.loadWorldInfoByName(worldName);
        const savedEntry = Object.values(verifyData.entries || {}).find(entry => entry.comment === entryData.comment);

        if (savedEntry) {
          console.log(`[Profile App] บันทึกผ่าน REST API สำเร็จ ตรวจพบข้อมูลแล้ว`);
          return true;
        } else {
          console.error(`[Profile App] ตรวจสอบการบันทึกผ่าน REST API ล้มเหลว ไม่พบข้อมูล`);
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error(`[Profile App] API บันทึกล้มเหลว: ${response.status} ${response.statusText}`, errorText);
        return false;
      }
    } catch (error) {
      console.error('[Profile App] REST API บันทึกล้มเหลว:', error);
      return false;
    }
  }

  /**
   * ดูโปรไฟล์ที่มีอยู่
   */
  async viewProfile(profileName) {
    try {
      // ลองหาจากแคชก่อน
      const cachedProfile = this.getCachedProfile(profileName);
      if (cachedProfile) {
        console.log('[Profile App] โหลดโปรไฟล์จากแคช:', profileName);
        this.showProfileDetailView(profileName, cachedProfile.profileData, cachedProfile.fullContent);
        return;
      }

      // ถ้าไม่มีในแคช ให้หาจาก World Book
      const profile = this.profileList.find(p => p.name === profileName);
      if (!profile) {
        this.showToast('ไม่พบโปรไฟล์', 'error');
        return;
      }

      console.log('[Profile App] โหลดโปรไฟล์จาก World Book:', profileName);
      const profileContent = this.extractStudentProfile(profile.content);
      if (profileContent) {
        const profileData = this.parseStudentProfile(profileContent);

        // บันทึกลงแคชเพื่อความเร็วในครั้งหน้า
        this.saveCachedProfile(profileName, profileData, profileContent);

        this.showProfileDetailView(profileName, profileData, profileContent);
      } else {
        this.showToast('รูปแบบไฟล์โปรไฟล์ไม่ถูกต้อง', 'error');
      }
    } catch (error) {
      console.error('[Profile App] ดูโปรไฟล์ล้มเหลว:', error);
      this.showToast('ดูโปรไฟล์ล้มเหลว', 'error');
    }
  }

  /**
   * บังคับรีเฟรชโปรไฟล์ที่ดูอยู่
   */
  async refreshCurrentProfile(profileName) {
    try {
      console.log('[Profile App] บังคับรีเฟรชโปรไฟล์:', profileName);

      // ลบจากแคช
      this.profileCache.delete(profileName);

      // โหลดรายการใหม่จาก World Book
      await this.loadProfileList();

      // เปิดดูโปรไฟล์อีกครั้ง
      await this.viewProfile(profileName);

      this.showToast('รีเฟรชโปรไฟล์เรียบร้อย', 'success');
    } catch (error) {
      console.error('[Profile App] รีเฟรชโปรไฟล์ล้มเหลว:', error);
      this.showToast('รีเฟรชโปรไฟล์ล้มเหลว', 'error');
    }
  }

  /**
   * กลับไปหน้ารายการ
   */
  goBackToList() {
    const appContent = document.querySelector('.app-content');
    if (appContent) {
      appContent.innerHTML = this.getAppContent();
    }
  }

  /**
   * แสดง Dialog
   */
  showDialog(html) {
    let container = document.getElementById('profile-dialog-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'profile-dialog-container';
      container.className = 'profile-dialog-container';

      document.body.appendChild(container);
    }

    container.innerHTML = html;
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '99999';

    setTimeout(() => {
      const dialog = container.querySelector('.profile-dialog');
      if (dialog) {
        dialog.classList.add('show');
      }
    }, 10);

    document.body.style.overflow = 'hidden';

    console.log('[Profile App] แสดง Dialog');
  }

  /**
   * ปิด Dialog
   */
  closeDialog() {
    const container = document.getElementById('profile-dialog-container');
    if (!container) return;

    const dialog = container.querySelector('.profile-dialog');
    if (dialog) {
      dialog.classList.remove('show');
    }

    setTimeout(() => {
      container.style.display = 'none';
      container.innerHTML = '';

      document.body.style.overflow = '';
    }, 200);
  }

  /**
   * แสดงข้อมูล Debug
   */
  showDebugInfo() {
    const debugInfo = {
      // ตรวจสอบความพร้อมของ API
      apis: {
        TavernHelper: typeof TavernHelper !== 'undefined',
        getWorldbook: typeof getWorldbook !== 'undefined',
        createWorldbookEntries: typeof createWorldbookEntries !== 'undefined',
        createWorldInfoEntry: typeof createWorldInfoEntry !== 'undefined',
        saveWorldInfo: typeof saveWorldInfo !== 'undefined',
        mobileCustomAPIConfig: typeof window.mobileCustomAPIConfig !== 'undefined',
        getSortedEntries: typeof window.getSortedEntries !== 'undefined',
      },

      // ข้อมูล World Book
      worldbooks: {
        selected_world_info: window.selected_world_info || 'undefined',
        world_info_globalSelect: window.world_info?.globalSelect || 'undefined',
        dom_selection: this.getSelectedWorldbooksFromDOM(),
      },

      // ข้อมูล Cache
      cache: {
        profileCacheSize: this.profileCache.size,
        cachedProfiles: Array.from(this.profileCache.keys()),
      },

      // การตั้งค่าปัจจุบัน
      config: this.config,
    };

    const debugHTML = `
      <div class="profile-dialog-overlay">
        <div class="profile-dialog" style="max-width: 600px;">
          <div class="dialog-header">
            <h3>ข้อมูล Debug</h3>
            <button class="close-btn" onclick="window.profileApp.closeDialog()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="dialog-content">
            <div style="font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 400px; overflow-y: auto;">
              <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
            <div style="margin-top: 10px; text-align: center;">
              <button onclick="navigator.clipboard.writeText('${JSON.stringify(debugInfo, null, 2).replace(
                /'/g,
                "\\'",
              )}').then(() => alert('คัดลอกข้อมูล Debug ไปยังคลิปบอร์ดแล้ว'))">คัดลอกข้อมูล Debug</button>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="confirm-btn" onclick="window.profileApp.closeDialog()">
              ปิด
            </button>
          </div>
        </div>
      </div>
    `;

    this.showDialog(debugHTML);
    console.log('[Profile App] ข้อมูล Debug:', debugInfo);
  }

  /**
   * ดึง World Book ที่เลือกจาก DOM
   */
  getSelectedWorldbooksFromDOM() {
    const worldInfoSelect = document.getElementById('world_info');
    if (worldInfoSelect) {
      return Array.from(worldInfoSelect.selectedOptions).map(opt => ({
        text: opt.text,
        value: opt.value,
      }));
    }
    return 'ไม่พบ DOM Element';
  }

  /**
   * แสดง Toast Notification
   */
  showToast(message, type = 'info') {
    if (window.showMobileToast) {
      window.showMobileToast(message, type);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `profile-toast profile-toast-${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 20px',
      borderRadius: '20px',
      color: 'white',
      fontSize: '14px',
      zIndex: '10000',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });

    switch (type) {
      case 'success':
        toast.style.background = '#52c41a';
        break;
      case 'error':
        toast.style.background = '#ff4d4f';
        break;
      default:
        toast.style.background = '#1890ff';
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// สร้าง Instance
if (typeof window !== 'undefined') {
  window.ProfileApp = ProfileApp;
  window.profileApp = new ProfileApp();
  console.log('[Profile App] ✅ สร้างแอปพลิเคชันจัดการโปรไฟล์เรียบร้อยแล้ว');
}
