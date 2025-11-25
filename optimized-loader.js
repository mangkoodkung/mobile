/**
 * ตัวโหลดส่วนเสริมมือถือแบบเพิ่มประสิทธิภาพ
 * รองรับการโหลดแบบขนาน, การโหลดแบบ Lazy, และแคชอัจฉริยะ
 */

class OptimizedLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.loadOrder = [];
    this.performanceMonitor = window.mobilePerformanceMonitor;
    this.config = window.MOBILE_PERFORMANCE_CONFIG?.loading || {};

    console.log('[Optimized Loader] ตัวโหลดแบบเพิ่มประสิทธิภาพเริ่มต้นแล้ว');
  }

  /**
   * โหลดหลายสคริปต์แบบขนาน
   * @param {Array} scripts อาร์เรย์การตั้งค่าสคริปต์
   * @param {Object} options ตัวเลือกการโหลด
   */
  async loadScriptsParallel(scripts, options = {}) {
    const {
      maxConcurrent = 5,
      timeout = this.config.loadTimeout || 10000,
      retryCount = this.config.retryCount || 3,
    } = options;

    console.log(`[Optimized Loader] เริ่มโหลดสคริปต์แบบขนาน ${scripts.length} ตัว`);
    this.performanceMonitor?.startTimer('parallelLoad');

    const loadPromises = scripts.map(script => this.loadScriptWithRetry(script, retryCount, timeout));

    try {
      const results = await this.limitConcurrency(loadPromises, maxConcurrent);
      const loadTime = this.performanceMonitor?.endTimer('parallelLoad');

      console.log(`[Optimized Loader] โหลดแบบขนานเสร็จสิ้น ใช้เวลา: ${loadTime?.toFixed(2)}ms`);
      return results;
    } catch (error) {
      console.error('[Optimized Loader] โหลดแบบขนานล้มเหลว:', error);
      throw error;
    }
  }

  /**
   * จำกัดจำนวนการทำงานของ Promise พร้อมกัน
   */
  async limitConcurrency(promises, maxConcurrent) {
    const results = [];
    const executing = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        executing.splice(executing.indexOf(p), 1);
        return result;
      });

      results.push(p);
      executing.push(p);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  /**
   * โหลดสคริปต์พร้อมกลไกการลองใหม่
   */
  async loadScriptWithRetry(scriptConfig, retryCount, timeout) {
    const { src, name, required = true } = scriptConfig;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.loadScript(src, name, timeout);
        return result;
      } catch (error) {
        if (attempt === retryCount) {
          if (required) {
            throw new Error(
              `Failed to load required script ${name} after ${retryCount + 1} attempts: ${error.message}`,
            );
          } else {
            console.warn(`[Optimized Loader] สคริปต์ทางเลือก ${name} โหลดล้มเหลว, ดำเนินการต่อ`);
            return { success: false, name, error: error.message };
          }
        }

        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`[Optimized Loader] สคริปต์ ${name} โหลดล้มเหลวครั้งที่ ${attempt + 1}, จะลองใหม่ใน ${delay}ms`);
        await this.delay(delay);
      }
    }
  }

  /**
   * โหลดสคริปต์เดี่ยว
   */
  async loadScript(src, name, timeout = 10000) {
    // ตรวจสอบว่าโหลดแล้วหรือไม่
    if (this.loadedModules.has(src)) {
      return this.loadedModules.get(src);
    }

    // ตรวจสอบว่ากำลังโหลดอยู่หรือไม่
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;

      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Script ${name} loading timeout`));
      }, timeout);

      script.onload = () => {
        clearTimeout(timer);
        this.loadedModules.set(src, { success: true, name });
        this.loadOrder.push(name);
        console.log(`[Optimized Loader] ✅ โหลดสคริปต์สำเร็จ: ${name}`);
        resolve({ success: true, name });
      };

      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error(`Script ${name} loading failed`));
      };

      document.head.appendChild(script);
    });

    this.loadingPromises.set(src, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(src);
      return result;
    } catch (error) {
      this.loadingPromises.delete(src);
      throw error;
    }
  }

  /**
   * โหลดไฟล์ CSS
   */
  async loadCSS(href, name, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = href;

      const timer = setTimeout(() => {
        reject(new Error(`CSS ${name} loading timeout`));
      }, timeout);

      link.onload = () => {
        clearTimeout(timer);
        console.log(`[Optimized Loader] ✅ โหลด CSS สำเร็จ: ${name}`);
        resolve({ success: true, name });
      };

      link.onerror = () => {
        clearTimeout(timer);
        console.warn(`[Optimized Loader] โหลด CSS ล้มเหลว: ${name}`);
        resolve({ success: false, name, error: 'CSS loading failed' });
      };

      document.head.appendChild(link);
    });
  }

  /**
   * โหลดโมดูลแบบ Lazy
   */
  async lazyLoadModule(moduleConfig) {
    const { src, name, condition, priority = 'low' } = moduleConfig;

    // ตรวจสอบเงื่อนไขการโหลด
    if (condition && !condition()) {
      console.log(`[Optimized Loader] โมดูล ${name} ไม่ผ่านเงื่อนไขการโหลด, ข้าม`);
      return;
    }

    // กำหนดเวลาโหลดตามลำดับความสำคัญ
    const delay = priority === 'high' ? 0 : priority === 'medium' ? 500 : 1000;

    if (delay > 0) {
      await this.delay(delay);
    }

    return this.loadScript(src, name);
  }

  /**
   * รอให้โมดูลทั้งหมดโหลดเสร็จสิ้น
   */
  async waitForModules(moduleNames, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const allLoaded = moduleNames.every(name => this.loadOrder.includes(name) || window[name] !== undefined);

      if (allLoaded) {
        return true;
      }

      await this.delay(100);
    }

    const missingModules = moduleNames.filter(name => !this.loadOrder.includes(name) && window[name] === undefined);

    throw new Error(`Timeout waiting for modules: ${missingModules.join(', ')}`);
  }

  /**
   * การโหลดล่วงหน้าแบบอัจฉริยะ
   */
  async preloadModules(moduleConfigs) {
    const highPriorityModules = moduleConfigs.filter(config => config.priority === 'high');
    const mediumPriorityModules = moduleConfigs.filter(config => config.priority === 'medium');
    const lowPriorityModules = moduleConfigs.filter(config => config.priority === 'low');

    // โหลดโมดูลความสำคัญสูงทันที
    if (highPriorityModules.length > 0) {
      await this.loadScriptsParallel(highPriorityModules);
    }

    // โหลดโมดูลความสำคัญปานกลางโดยหน่วงเวลา
    setTimeout(() => {
      if (mediumPriorityModules.length > 0) {
        this.loadScriptsParallel(mediumPriorityModules);
      }
    }, 1000);

    // โหลดโมดูลความสำคัญต่ำในภายหลัง
    setTimeout(() => {
      if (lowPriorityModules.length > 0) {
        this.loadScriptsParallel(lowPriorityModules);
      }
    }, 3000);
  }

  /**
   * รับสถานะการโหลด
   */
  getLoadingStatus() {
    return {
      loaded: this.loadedModules.size,
      loading: this.loadingPromises.size,
      loadOrder: [...this.loadOrder],
      performance: this.performanceMonitor?.getMetrics(),
    };
  }

  /**
   * ล้างทรัพยากร
   */
  cleanup() {
    this.loadingPromises.clear();
    console.log('[Optimized Loader] ล้างทรัพยากรแล้ว');
  }

  /**
   * วิธีช่วย: หน่วงเวลา
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// สร้างอินสแตนซ์ตัวโหลดแบบเพิ่มประสิทธิภาพทั่วโลก
window.optimizedLoader = new OptimizedLoader();

// ส่งออก
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizedLoader;
} else {
  window.OptimizedLoader = OptimizedLoader;
}

console.log('[Optimized Loader] ตัวโหลดแบบเพิ่มประสิทธิภาพพร้อมใช้งาน');
