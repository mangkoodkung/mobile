// ==ตัวจัดการสไตล์ Parallel Events==
// @name         Parallel Events Styles
// @version      1.0.0
// @description  คำจำกัดความสไตล์ Parallel Events รวมถึงเทมเพลตการสร้างเหตุการณ์หลายสไตล์
// @author       Assistant

/**
 * ตัวจัดการสไตล์ Parallel Events
 * รวมเทมเพลตการสร้างและ prompt สำหรับ Parallel Events หลายสไตล์
 */
class ParallelEventsStyles {
  constructor() {
    this.styles = this.initializeStyles();
    this.customStyles = new Map(); // เก็บสไตล์กำหนดเอง
    this.customPrefix = '';
    this.loadPrefixSettings();
    this.loadCustomStyles();

    console.log('[Parallel Events Styles] สร้างตัวจัดการสไตล์แล้ว');
  }

  /**
   * เริ่มต้นคำจำกัดความสไตล์ทั้งหมด
   */
  initializeStyles() {
    return {
      被ntr: `คุณเป็นเครื่องมือสร้างนิยายผู้ใหญ่ระดับมืออาชีพ กรุณาสร้างฉากที่ตัวละครกำลังมีเพศสัมพันธ์หรือเล้าโลมกับคนอื่นในฉากที่ไม่ได้อยู่ในฉากปัจจุบัน ตามเนื้อหาการสนทนาปัจจุบัน

ข้อกำหนดสไตล์:
- การบรรยายการกระทำที่ละเอียดประณีต
- การบรรยายความรู้สึกภายในที่หลากหลาย
- ความรู้สึกผิดต่อตัวเอกหรือความคิดอื่นๆ
- ความยาวควบคุมที่ 1000-1400 อักษร

กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,

      主人的任务: `คุณเป็นเครื่องมือสร้างนิยายผู้ใหญ่ระดับมืออาชีพ กรุณาสร้างเนื้อเรื่องที่อีกฝ่ายในฉากปัจจุบันกำลังปฏิบัติภารกิจของเจ้านายที่ไม่รู้จักของเขา ตามเนื้อหาการสนทนาปัจจุบัน

ข้อกำหนดสไตล์:
- การบรรยายการกระทำที่ละเอียดประณีต
- การบรรยายความรู้สึกภายในที่หลากหลาย
- ความรู้สึกผิดต่อตัวเอกหรือความคิดอื่นๆ
- ความยาวควบคุมที่ 1000-1400 อักษร

ตัวอย่างองค์ประกอบ:
- ไข่สั่นหรือเชือกมัดใต้เสื้อผ้า หรือไม่ใส่ชุดชั้นใน หรือยั่วยวนตัวเอกเพราะข้อกำหนดของภารกิจ

กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,

      主动消息: `พฤติกรรม AI และรูปแบบเอาต์พุตเมื่อตัวละครอื่นทำการแชทออนไลน์ส่วนตัวกับผู้ใช้

## หนึ่ง หลักเกณฑ์การเล่นบทบาทหลัก

1.  **เงื่อนไขทริกเกอร์**
    *   เมื่อผู้ใช้ทำการแชทส่วนตัวแบบ 1 ต่อ 1 กับตัวละครใดๆ ผ่านซอฟต์แวร์แชทออนไลน์รูปแบบใดๆ หรือเมื่อตัวละครส่งข้อความถึงผู้ใช้โดยตัวเอง AI ต้องเปิดใช้กฎข้อนี้โดยบังคับ
    *   กฎนี้**ไม่ใช้**กับฉากแชทส่วนตัวระหว่างตัวละครใดๆ
2.  **การเล่นบทบาท**
    *   หน้าที่เพียงอย่างเดียวของ AI คือการเล่นบทบาทและสร้างข้อความตอบกลับของ**ตัวละครที่ไม่ใช่ฝั่งผู้ใช้**
3.  **ข้อห้ามเด็ดขาด**
    *   **ห้ามอย่างเคร่งครัด**พูดแทนผู้ใช้หรือสร้างข้อความใดๆ ที่เป็นของผู้ใช้ **ห้ามอย่างเคร่งครัด**ทำซ้ำข้อความของผู้ใช้
    *   **ห้ามอย่างเคร่งครัด**ส่งออกคำนำหน้า คำต่อท้าย ไทม์สแตมป์ คำบรรยายเนื้อเรื่อง กิจกรรมทางจิตใจ คำอธิบายฉาก หมายเหตุ หรือเนื้อหาเพิ่มเติมใดๆ นอกเหนือจากรูปแบบข้อความ
    *   **ห้ามอย่างเคร่งครัด**ส่งออกบรรทัดว่างหรือการขึ้นบรรทัดใหม่ที่ไม่จำเป็น
    * *   **ห้ามอย่างเคร่งครัด**สับสนหรือผิดพลาดเกี่ยวกับชื่อและ id ของเพื่อน
    *   **ห้ามอย่างเคร่งครัด**ละเว้นส่วนใดของรูปแบบ **ห้ามอย่างเคร่งครัด**ละเว้นส่วน "[和{{人名或群名}}的聊天]"
    *   เนื้อหาเอาต์พุต**ต้อง**และ**สามารถเป็นได้เพียง**ข้อความหนึ่งหรือหลายข้อความที่เป็นไปตามรูปแบบต่อไปนี้

## สอง รูปแบบเอาต์พุตข้อความ
### 1. รูปแบบมาตรฐาน
ข้อความตัวอักษรทั้งหมด ไม่ว่าประเภทใด ต้องปฏิบัติตามโครงสร้างต่อไปนี้อย่างเคร่งครัด:
[和{char}的聊天]
{{消息内容}}

### 2. รูปแบบ {{消息内容}}:
[对方消息|{{对方名字}}|{{对方好友id}}|{{消息类型}}|{{消息内容}}]

## สาม รายละเอียดประเภทข้อความพิเศษ

### 1. ข้อความตัวอักษร (Text)
*   **ประเภท**: 文字
*   **เนื้อหา**: เนื้อหาข้อความที่เฉพาะเจาะจงที่ตัวละครส่ง
*   **ตัวอย่าง**:
[对方消息|秦倦|500002|文字|小朋友，这么晚还不睡，在想什么呢]

### 2. ข้อความซองอั่งเปา (Red Packet)
*   **ประเภท**: 红包
*   **เนื้อหา**: จำนวนเงินที่อยู่ในซองอั่งเปา (ตัวเลขล้วน)
*   **ตัวอย่าง**:
    [对方消息|霍谨|400003|红包|52000]

### 3. ข้อความเสียง (Voice)
*   **ประเภท**: 语音
*   **เนื้อหา**: เนื้อหาที่ถอดเสียงเป็นข้อความของข้อความเสียง
*   **ตัวอย่าง**:
    [对方消息|夏阳|300004|语音|好想你啊，你什么时候回来]



## สี่ การจำลองพฤติกรรมและการโต้ตอบ

*   **การตอบกลับแบบไดนามิก**: จำนวนข้อความที่ตอบกลับในแต่ละครั้งควรเปลี่ยนแปลงแบบไดนามิกระหว่าง **1 ถึง 7 ข้อความ** ตามสถานการณ์เฉพาะ (เช่น อารมณ์ของตัวละคร จังหวะของการสนทนา) **ห้าม**ตอบกลับด้วยจำนวนข้อความที่คงที่ทุกครั้ง
*   **การจำลองความสมจริง**: ช่วงเวลาระหว่างข้อความควรมีการเปลี่ยนแปลงเล็กน้อยและสมเหตุสมผล เพื่อจำลองความล่าช้าในการพิมพ์ของฉากแชทจริง
*   **การรับรู้สถานการณ์**: เนื้อหา น้ำเสียง และความถี่ของการตอบกลับต้องสอดคล้องอย่างสมบูรณ์กับการตั้งค่าปัจจุบัน อารมณ์ของตัวละคร และระดับความสัมพันธ์กับผู้ใช้
## ห้า จำนวนข้อความ
สร้างข้อความประเภทต่างๆ อย่างน้อย 8-10 ข้อความ
`,

      平行事件: `คุณเป็นเครื่องมือสร้าง Parallel Events ระดับมืออาชีพ กรุณาสร้างความคืบหน้าของโลกปัจจุบันหรือกิจวัตรประจำวันส่วนตัวหรือการกระทำของ NPC ที่ไม่ได้อยู่ในฉากปัจจุบัน ตามเนื้อหาการสนทนาปัจจุบัน

ข้อกำหนดสไตล์:
- ใกล้เคียงกับการตั้งค่าต้นฉบับ
- เหตุการณ์ควรเกี่ยวข้องกับการสนทนาปัจจุบัน
- ความยาวควบคุมที่ 600-800 อักษร


กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,

      魅魔之体: `คุณเป็นเครื่องมือสร้างนิยายระดับมืออาชีพ กรุณาสร้างคำบรรยายที่ #ตัวละครใหม่# ตกหลุมรักตัวเอกอย่างไม่อาจหักห้ามใจได้อย่างกะทันหัน ตามเนื้อหาการสนทนาปัจจุบัน

ข้อกำหนดสไตล์:
- เน้นความขัดแย้งระหว่างปฏิกิริยาทางร่างกายและปฏิกิริยาทางจิตใจ
- บรรยายภาษากายและความรู้สึกภายในอย่างละเอียด
- ความยาวควบคุมที่ 600-800 อักษร

กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,

      随机新闻: `คุณเป็นเครื่องมือสร้างข่าวระดับมืออาชีพ กรุณาสร้างข่าวแบบสุ่มตามมุมมองโลกปัจจุบัน

ข้อกำหนดสไตล์:
- ใกล้เคียงกับมุมมองโลกปัจจุบัน
- ความยาวควบคุมที่ 600-800 อักษร
- การเมือง การทหาร บันเทิง กีฬา การเงิน เทคโนโลยี สังคม การศึกษา วัฒนธรรม สุขภาพ การท่องเที่ยว อาหาร และอื่นๆ ทุกหัวข้อใช้ได้

กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,

      自定义: `คุณเป็นเครื่องมือสร้าง Parallel Events ระดับมืออาชีพ กรุณาสร้าง Parallel Events ในสไตล์ที่สอดคล้องกัน ตามเนื้อหาการสนทนาปัจจุบันและข้อกำหนดที่กำหนดเองของผู้ใช้

ข้อกำหนดพื้นฐาน:
- เหตุการณ์ควรเกี่ยวข้องกับการสนทนาปัจจุบันแต่ไม่รบกวนเนื้อเรื่องหลักโดยตรง
- อาจเป็นเหตุการณ์เบื้องหลัง การเปลี่ยนแปลงของสภาพแวดล้อม หรือการกระทำของตัวละครที่เกี่ยวข้อง
- ใช้มุมมองบุรุษที่สามในการบรรยาย
- ความยาวควบคุมที่ 100-200 อักษร
- เนื้อหาต้องน่าสนใจและสอดคล้องกับการตั้งค่า

กรุณาปรับสไตล์และทิศทางของเนื้อหาตามข้อกำหนด prefix กำหนดเองที่ผู้ใช้ระบุ หากไม่มีข้อกำหนดพิเศษ กรุณาสร้าง Parallel Events ที่น่าสนใจที่เกี่ยวข้องกับเนื้อหาการสนทนา

กรุณาสร้างเนื้อหา Parallel Events โดยตรง อย่าใส่คำอธิบายอื่น`,
    };
  }

  /**
   * ดึง prompt ของสไตล์ที่กำหนด
   */
  getStylePrompt(styleName) {
    if (this.customStyles.has(styleName)) {
      return this.customStyles.get(styleName);
    }
    return this.styles[styleName] || this.styles['现代都市'];
  }

  /**
   * ดึงชื่อสไตล์ทั้งหมดที่ใช้ได้
   */
  getAvailableStyles() {
    const builtinStyles = Object.keys(this.styles);
    const customStyleNames = Array.from(this.customStyles.keys());
    return [...builtinStyles, ...customStyleNames];
  }

  /**
   * เพิ่มสไตล์กำหนดเอง
   */
  addCustomStyle(name, prompt) {
    this.customStyles.set(name, prompt);
    this.saveCustomStyles();
    console.log('[Parallel Events Styles] เพิ่มสไตล์กำหนดเอง:', name);
  }

  /**
   * ลบสไตล์กำหนดเอง
   */
  removeCustomStyle(name) {
    if (this.customStyles.has(name)) {
      this.customStyles.delete(name);
      this.saveCustomStyles();
      console.log('[Parallel Events Styles] ลบสไตล์กำหนดเอง:', name);
      return true;
    }
    return false;
  }

  /**
   * ตรวจสอบว่าเป็นสไตล์กำหนดเองหรือไม่
   */
  isCustomStyle(styleName) {
    return this.customStyles.has(styleName);
  }

  /**
   * ดึง prefix กำหนดเอง
   */
  getCustomPrefix() {
    return this.customPrefix;
  }

  /**
   * ตั้งค่า prefix กำหนดเอง
   */
  setCustomPrefix(prefix) {
    this.customPrefix = prefix;
    this.savePrefixSettings();
    console.log('[Parallel Events Styles] อัปเดต prefix กำหนดเองแล้ว');
  }

  /**
   * สร้าง prompt การสร้างที่สมบูรณ์
   */
  buildFullPrompt(styleName, customPrefix = '') {
    let basePrompt = this.getStylePrompt(styleName);

    if (customPrefix) {
      basePrompt += `\n\nความต้องการกำหนดเอง:${customPrefix}`;
    }

    if (this.customPrefix) {
      basePrompt += `\n\nความต้องการระดับ global:${this.customPrefix}`;
    }

    return basePrompt;
  }

  /**
   * โหลดการตั้งค่า prefix กำหนดเอง
   */
  loadPrefixSettings() {
    try {
      const saved = localStorage.getItem('parallelEventsCustomPrefix');
      if (saved) {
        this.customPrefix = saved;
      }
    } catch (error) {
      console.error('[Parallel Events Styles] โหลดการตั้งค่า prefix ล้มเหลว:', error);
    }
  }

  /**
   * บันทึกการตั้งค่า prefix กำหนดเอง
   */
  savePrefixSettings() {
    try {
      localStorage.setItem('parallelEventsCustomPrefix', this.customPrefix);
    } catch (error) {
      console.error('[Parallel Events Styles] บันทึกการตั้งค่า prefix ล้มเหลว:', error);
    }
  }

  /**
   * โหลดสไตล์กำหนดเอง
   */
  loadCustomStyles() {
    try {
      const saved = localStorage.getItem('parallelEventsCustomStyles');
      if (saved) {
        const customStylesData = JSON.parse(saved);
        this.customStyles = new Map(Object.entries(customStylesData));
        console.log('[Parallel Events Styles] โหลดสไตล์กำหนดเอง:', this.customStyles.size, 'รายการ');
      }
    } catch (error) {
      console.error('[Parallel Events Styles] โหลดสไตล์กำหนดเองล้มเหลว:', error);
    }
  }

  /**
   * บันทึกสไตล์กำหนดเอง
   */
  saveCustomStyles() {
    try {
      const customStylesData = Object.fromEntries(this.customStyles);
      localStorage.setItem('parallelEventsCustomStyles', JSON.stringify(customStylesData));
    } catch (error) {
      console.error('[Parallel Events Styles] บันทึกสไตล์กำหนดเองล้มเหลว:', error);
    }
  }

  /**
   * ส่งออกสไตล์กำหนดเองทั้งหมด
   */
  exportCustomStyles() {
    const exportData = {
      customStyles: Object.fromEntries(this.customStyles),
      customPrefix: this.customPrefix,
      exportTime: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * นำเข้าสไตล์กำหนดเอง
   */
  importCustomStyles(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (data.customStyles) {
        // รวมสไตล์กำหนดเอง
        Object.entries(data.customStyles).forEach(([name, prompt]) => {
          this.customStyles.set(name, prompt);
        });
        this.saveCustomStyles();
      }

      if (data.customPrefix) {
        this.customPrefix = data.customPrefix;
        this.savePrefixSettings();
      }

      console.log('[Parallel Events Styles] นำเข้าเสร็จสิ้น');
      return true;
    } catch (error) {
      console.error('[Parallel Events Styles] นำเข้าล้มเหลว:', error);
      return false;
    }
  }

  /**
   * รีเซ็ตการตั้งค่าทั้งหมด
   */
  reset() {
    this.customStyles.clear();
    this.customPrefix = '';
    this.saveCustomStyles();
    this.savePrefixSettings();
    console.log('[Parallel Events Styles] รีเซ็ตการตั้งค่าแล้ว');
  }
}

// สร้าง instance ระดับ global
window.parallelEventsStyles = new ParallelEventsStyles();

console.log('[Parallel Events Styles] ✅ โหลดตัวจัดการสไตล์ Parallel Events เสร็จสมบูรณ์');
