/**
 * Context Monitor Integration - การรวมตัวตรวจสอบบริบท
 * ช่วยให้คอมโพเนนต์อื่นใช้งาน ContextMonitor ได้อย่างถูกต้อง
 */

// ตรวจสอบให้แน่ใจว่าคอมโพเนนต์อื่นสามารถเข้าถึงและใช้งาน ContextMonitor ได้อย่างถูกต้อง
class ContextMonitorIntegration {
  constructor() {
    this.isReady = false;
    this.contextMonitor = null;
    this.readyPromise = null;

    console.log('[Context Monitor Integration] สร้างตัวช่วยรวมระบบแล้ว');
    this.init();
  }

  async init() {
    console.log('[Context Monitor Integration] เริ่มต้นการทำงาน...');

    // รอให้ ContextMonitor พร้อมใช้งาน
    this.readyPromise = this.waitForContextMonitor();

    try {
      this.contextMonitor = await this.readyPromise;
      this.isReady = true;
      console.log('[Context Monitor Integration] ✅ ContextMonitor พร้อมใช้งานแล้ว');

      // แจ้งคอมโพเนนต์อื่น
      this.notifyComponents();
    } catch (error) {
      console.error('[Context Monitor Integration] ❌ เริ่มต้น ContextMonitor ล้มเหลว:', error);
    }
  }

  // รอให้ ContextMonitor พร้อมใช้งาน
  async waitForContextMonitor() {
    // ถ้ามี ContextMonitor instance จริงอยู่แล้ว
    if (window.contextMonitor && !window.contextMonitor.isTemporary) {
      return window.contextMonitor;
    }

    // รอ event contextMonitorReady
    return new Promise((resolve, reject) => {
      const handleReady = event => {
        window.removeEventListener('contextMonitorReady', handleReady);
        resolve(event.detail.contextMonitor);
      };

      window.addEventListener('contextMonitorReady', handleReady);

      // ตั้งค่า timeout
      setTimeout(() => {
        window.removeEventListener('contextMonitorReady', handleReady);
        reject(new Error('รอ ContextMonitor หมดเวลา'));
      }, 15000);

      // ตรวจสอบเป็นระยะว่าพร้อมใช้งานแล้วหรือยัง
      const checkInterval = setInterval(() => {
        if (window.contextMonitor && !window.contextMonitor.isTemporary) {
          clearInterval(checkInterval);
          window.removeEventListener('contextMonitorReady', handleReady);
          resolve(window.contextMonitor);
        }
      }, 500);
    });
  }

  // แจ้งคอมโพเนนต์อื่นว่า ContextMonitor พร้อมใช้งานแล้ว
  notifyComponents() {
    console.log('[Context Monitor Integration] กำลังแจ้งคอมโพเนนต์อื่น...');

    // อัปเดต MessageRenderer
    if (window.messageRenderer) {
      try {
        window.messageRenderer.contextMonitor = this.contextMonitor;
        console.log('[Context Monitor Integration] อัปเดต contextMonitor ของ MessageRenderer แล้ว');
      } catch (error) {
        console.error('[Context Monitor Integration] อัปเดต MessageRenderer ล้มเหลว:', error);
      }
    }

    // อัปเดตคอมโพเนนต์อื่นที่อาจใช้ contextMonitor
    this.updateGlobalReferences();

    // ส่ง custom event
    window.dispatchEvent(
      new CustomEvent('contextMonitorIntegrationReady', {
        detail: {
          contextMonitor: this.contextMonitor,
          integration: this,
        },
      }),
    );
  }

  // อัปเดตการอ้างอิงแบบ global
  updateGlobalReferences() {
    // ตรวจสอบให้แน่ใจว่าการอ้างอิง global ทั้งหมดชี้ไปที่ ContextMonitor ตัวจริง
    window.contextMonitor = this.contextMonitor;
    window.globalContextMonitor = this.contextMonitor;
    window.mobileContextMonitor = this.contextMonitor;

    console.log('[Context Monitor Integration] อัปเดตการอ้างอิง global แล้ว');
  }

  // ให้คอมโพเนนต์อื่นเข้าถึง ContextMonitor อย่างปลอดภัย
  async getContextMonitor() {
    if (this.isReady && this.contextMonitor) {
      return this.contextMonitor;
    }

    // รอจนกว่าจะพร้อม
    await this.readyPromise;
    return this.contextMonitor;
  }

  // ตรวจสอบว่า ContextMonitor พร้อมใช้งานหรือไม่
  isContextMonitorReady() {
    return this.isReady && this.contextMonitor && !this.contextMonitor.isTemporary;
  }

  // เรียกใช้เมธอดของ ContextMonitor อย่างปลอดภัย
  async safeCall(methodName, ...args) {
    try {
      const monitor = await this.getContextMonitor();
      if (monitor && typeof monitor[methodName] === 'function') {
        return await monitor[methodName](...args);
      } else {
        console.warn(`[Context Monitor Integration] ไม่พบเมธอด ${methodName}`);
        return null;
      }
    } catch (error) {
      console.error(`[Context Monitor Integration] เรียกใช้ ${methodName} ล้มเหลว:`, error);
      return null;
    }
  }

  // เมธอดลัด: ดึงข้อมูลจากแชทปัจจุบัน
  async extractFromCurrentChat() {
    return await this.safeCall('extractFromCurrentChat');
  }

  // เมธอดลัด: ดึงข้อความแชทปัจจุบัน
  async getCurrentChatMessages() {
    return await this.safeCall('getCurrentChatMessages');
  }

  // เมธอดลัด: ดึงข้อความของเพื่อน
  async extractMessagesForFriend(friendId, friendName) {
    return await this.safeCall('extractMessagesForFriend', friendId, friendName);
  }

  // เมธอดลัด: แยกวิเคราะห์รูปแบบข้อความ
  parseMessageFormat(messageContent) {
    if (this.isReady && this.contextMonitor) {
      return this.contextMonitor.parseMessageFormat(messageContent);
    }
    return null;
  }
}

// สร้าง instance รวมระบบแบบ global
window.contextMonitorIntegration = new ContextMonitorIntegration();

// ให้ API ที่สะดวกสำหรับคอมโพเนนต์อื่น
window.getContextMonitorSafe = async function () {
  return await window.contextMonitorIntegration.getContextMonitor();
};

window.isContextMonitorAvailable = function () {
  return window.contextMonitorIntegration.isContextMonitorReady();
};

// รองรับโค้ดเก่า
window.ensureContextMonitor = async function () {
  try {
    return await window.contextMonitorIntegration.getContextMonitor();
  } catch (error) {
    console.error('[Context Monitor Integration] ตรวจสอบความพร้อมของ ContextMonitor ล้มเหลว:', error);
    return null;
  }
};

// ฟังเมื่อหน้าเว็บโหลดเสร็จ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Context Monitor Integration] DOM โหลดเสร็จแล้ว ตัวช่วยรวมระบบพร้อมใช้งาน');
  });
} else {
  console.log('[Context Monitor Integration] ตัวช่วยรวมระบบพร้อมใช้งาน');
}

console.log('[Context Monitor Integration] โหลดโมดูลรวมตัวตรวจสอบบริบทแล้ว');
