/**
 * การตั้งค่าประสิทธิภาพปลั๊กอิน Mobile
 * อนุญาตให้ผู้ใช้ปรับแต่งการตั้งค่าประสิทธิภาพเพื่อแก้ปัญหาการกระตุก
 */

const MOBILE_PERFORMANCE_CONFIG = {
  // การเพิ่มประสิทธิภาพการโหลดไฟล์
  loading: {
    // เปิดใช้งานการโหลดแบบขนานแบบ async
    enableParallelLoading: true,
    // เปิดใช้งานการโหลดแบบ lazy
    enableLazyLoading: true,
    // ขนาดการโหลดแบบแบ่งส่วน (KB)
    chunkSize: 50,
    // เวลา timeout การโหลด (มิลลิวินาที)
    loadTimeout: 10000,
    // จำนวนครั้งที่ลองใหม่
    retryCount: 3,
  },

  // การเพิ่มประสิทธิภาพตัวตรวจสอบ
  monitoring: {
    // ช่วงเวลาตรวจสอบบริบท (มิลลิวินาที)
    contextMonitorInterval: 5000, // เปลี่ยนจาก 3 วินาทีเป็น 5 วินาที
    // เปิดใช้งานการตรวจสอบอัจฉริยะ (ตรวจสอบเฉพาะเมื่อจำเป็น)
    enableSmartMonitoring: true,
    // หน่วงเวลา debounce ของ event (มิลลิวินาที)
    debounceDelay: 500,
    // จำนวนบันทึกประวัติสูงสุด
    maxHistoryRecords: 100, // เปลี่ยนจาก 50 เป็น 100 แต่มีกลไกทำความสะอาด
    // เปิดใช้งานการตรวจสอบประสิทธิภาพ
    enablePerformanceMonitoring: true,
  },

  // การเพิ่มประสิทธิภาพแคช
  caching: {
    // เปิดใช้งานแคชอัจฉริยะ
    enableSmartCaching: true,
    // เวลาหมดอายุแคช (มิลลิวินาที)
    cacheExpiry: 300000, // 5 นาที
    // ขนาดแคชสูงสุด (MB)
    maxCacheSize: 10,
    // ทำความสะอาดแคชอัตโนมัติ
    autoCleanupCache: true,
  },

  // การเพิ่มประสิทธิภาพการเรนเดอร์
  rendering: {
    // เปิดใช้งาน virtual scrolling
    enableVirtualScrolling: true,
    // ขนาด batch การเรนเดอร์
    renderBatchSize: 20,
    // ช่วงเวลาการเรนเดอร์ (มิลลิวินาที)
    renderInterval: 100,
    // เปิดใช้งานการเรนเดอร์แบบ incremental
    enableIncrementalRendering: true,
    // จำนวนการเรนเดอร์พร้อมกันสูงสุด
    maxConcurrentRenders: 3,
  },

  // การจัดการหน่วยความจำ
  memory: {
    // เปิดใช้งานการตรวจสอบหน่วยความจำ
    enableMemoryMonitoring: true,
    // ช่วงเวลาทำความสะอาดหน่วยความจำ (มิลลิวินาที)
    memoryCleanupInterval: 60000, // 1 นาที
    // ค่าขีดจำกัดการใช้หน่วยความจำ (MB)
    memoryThreshold: 50,
    // เก็บขยะอัตโนมัติ
    autoGarbageCollection: true,
  },

  // การเพิ่มประสิทธิภาพเครือข่าย
  network: {
    // เปิดใช้งานการรวม request
    enableRequestMerging: true,
    // เวลา timeout ของ request (มิลลิวินาที)
    requestTimeout: 8000,
    // จำนวน request พร้อมกันสูงสุด
    maxConcurrentRequests: 5,
    // เปิดใช้งานแคช request
    enableRequestCache: true,
  },

  // ตัวเลือกดีบัก
  debug: {
    // เปิดใช้งาน log ประสิทธิภาพ
    enablePerformanceLogging: false,
    // เปิดใช้งาน log การใช้หน่วยความจำ
    enableMemoryLogging: false,
    // เปิดใช้งาน log ประสิทธิภาพการเรนเดอร์
    enableRenderLogging: false,
    // ระดับ log: 'error', 'warn', 'info', 'debug'
    logLevel: 'info',
  },
};

// เครื่องมือตรวจสอบประสิทธิภาพ
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorCount: 0,
    };
    this.startTime = performance.now();
    this.observers = [];
  }

  startTimer(name) {
    this.timers = this.timers || {};
    this.timers[name] = performance.now();
  }

  endTimer(name) {
    if (this.timers && this.timers[name]) {
      const duration = performance.now() - this.timers[name];
      this.metrics[name + 'Time'] = duration;
      delete this.timers[name];
      return duration;
    }
    return 0;
  }

  recordMetric(name, value) {
    this.metrics[name] = value;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  startMemoryMonitoring() {
    if (!performance.memory) return;

    const monitor = () => {
      const memory = performance.memory;
      this.recordMetric('memoryUsage', memory.usedJSHeapSize / 1024 / 1024); // MB

      // ถ้าการใช้หน่วยความจำเกินค่าขีดจำกัด ทริกเกอร์การทำความสะอาด
      if (memory.usedJSHeapSize / 1024 / 1024 > MOBILE_PERFORMANCE_CONFIG.memory.memoryThreshold) {
        this.triggerMemoryCleanup();
      }
    };

    setInterval(monitor, MOBILE_PERFORMANCE_CONFIG.memory.memoryCleanupInterval);
  }

  triggerMemoryCleanup() {
    // ทริกเกอร์ event ทำความสะอาดหน่วยความจำ
    window.dispatchEvent(
      new CustomEvent('mobile-memory-cleanup', {
        detail: { threshold: MOBILE_PERFORMANCE_CONFIG.memory.memoryThreshold },
      }),
    );
  }

  generateReport() {
    const metrics = this.getMetrics();
    const totalTime = performance.now() - this.startTime;

    return {
      totalTime,
      metrics,
      timestamp: new Date().toISOString(),
      config: MOBILE_PERFORMANCE_CONFIG,
    };
  }
}

// สร้างตัวตรวจสอบประสิทธิภาพแบบ global
window.mobilePerformanceMonitor = new PerformanceMonitor();

// ส่งออกการตั้งค่า
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOBILE_PERFORMANCE_CONFIG, PerformanceMonitor };
} else {
  window.MOBILE_PERFORMANCE_CONFIG = MOBILE_PERFORMANCE_CONFIG;
  window.PerformanceMonitor = PerformanceMonitor;
}

console.log('[Mobile Performance] โหลดการตั้งค่าประสิทธิภาพแล้ว');
