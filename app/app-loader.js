/**
 * App Loader - ตัวโหลดแอปพลิเคชัน
 * ตรวจสอบให้แน่ใจว่าโมดูลแอปพลิเคชันมือถือทั้งหมดโหลดตามลำดับที่ถูกต้อง
 */

class AppLoader {
  constructor() {
    this.loadedModules = new Set();
    this.loadingModules = new Set();
    this.moduleLoadQueue = [];

    console.log('[App Loader] สร้างตัวโหลดแอปพลิเคชันแล้ว');
  }

  // โหลดโมดูล
  async loadModule(moduleName, moduleUrl, dependencies = []) {
    try {
      console.log(`[App Loader] เริ่มโหลดโมดูล: ${moduleName}`);

      // หากโหลดแล้ว ให้คืนค่ากลับทันที
      if (this.loadedModules.has(moduleName)) {
        console.log(`[App Loader] โมดูล ${moduleName} โหลดแล้ว`);
        return true;
      }

      // หากกำลังโหลด ให้รอจนเสร็จ
      if (this.loadingModules.has(moduleName)) {
        console.log(`[App Loader] โมดูล ${moduleName} กำลังโหลด รอจนเสร็จ...`);
        return await this.waitForModule(moduleName);
      }

      // ทำเครื่องหมายว่ากำลังโหลด
      this.loadingModules.add(moduleName);

      // ตรวจสอบ Dependencies
      for (const dep of dependencies) {
        if (!this.loadedModules.has(dep)) {
          console.log(`[App Loader] โมดูล ${moduleName} ต้องใช้ ${dep} โหลด Dependencies ก่อน`);
          await this.loadModule(dep, this.getModuleUrl(dep));
        }
      }

      // โหลดสคริปต์
      await this.loadScript(moduleUrl);

      // ทำเครื่องหมายว่าโหลดเสร็จแล้ว
      this.loadedModules.add(moduleName);
      this.loadingModules.delete(moduleName);

      console.log(`[App Loader] ✅ โมดูล ${moduleName} โหลดเสร็จสมบูรณ์`);
      return true;
    } catch (error) {
      console.error(`[App Loader] โมดูล ${moduleName} โหลดล้มเหลว:`, error);
      this.loadingModules.delete(moduleName);
      return false;
    }
  }

  // รอโมดูลโหลดเสร็จ
  async waitForModule(moduleName, timeout = 10000) {
    const startTime = Date.now();

    while (this.loadingModules.has(moduleName)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`หมดเวลารอโหลดโมดูล ${moduleName}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.loadedModules.has(moduleName);
  }

  // โหลดสคริปต์
  async loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // รับ URL ของโมดูล
  getModuleUrl(moduleName) {
    const baseUrl = 'scripts/extensions/third-party/mobile/app/';
    const moduleUrls = {
      'context-monitor': baseUrl + 'context-monitor.js',
      'friend-renderer': baseUrl + 'friend-renderer.js',
      'message-sender': baseUrl + 'message-sender.js',
      'message-app': baseUrl + 'message-app.js',
      'real-time-sync': baseUrl + 'real-time-sync.js',
    };

    return moduleUrls[moduleName] || `${baseUrl}${moduleName}.js`;
  }

  // โหลดโมดูลแบบ Batch
  async loadModules(modules) {
    const results = [];

    for (const module of modules) {
      const result = await this.loadModule(
        module.name,
        module.url || this.getModuleUrl(module.name),
        module.dependencies || [],
      );
      results.push({ name: module.name, success: result });
    }

    return results;
  }

  // รับสถานะการโหลด
  getLoadStatus() {
    return {
      loadedModules: Array.from(this.loadedModules),
      loadingModules: Array.from(this.loadingModules),
      totalLoaded: this.loadedModules.size,
      totalLoading: this.loadingModules.size,
    };
  }
}

// สร้าง Instance ตัวโหลดแบบ Global
if (typeof window.appLoader === 'undefined') {
  window.appLoader = new AppLoader();
}

// โหลดโมดูลแอปพลิเคชันมือถือโดยอัตโนมัติ
async function loadMobileAppModules() {
  try {
    console.log('[App Loader] 🚀 เริ่มโหลดโมดูลแอปพลิเคชันมือถือ');

    const modules = [
      {
        name: 'context-monitor',
        dependencies: [],
      },
      {
        name: 'friend-renderer',
        dependencies: ['context-monitor'],
      },
      {
        name: 'message-sender',
        dependencies: ['context-monitor'],
      },
      {
        name: 'message-app',
        dependencies: ['context-monitor', 'friend-renderer', 'message-sender'],
      },
      {
        name: 'real-time-sync',
        dependencies: ['context-monitor', 'friend-renderer', 'message-app'],
      },
    ];

    const results = await window.appLoader.loadModules(modules);

    // ตรวจสอบผลการโหลด
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('[App Loader] บางโมดูลโหลดล้มเหลว:', failed);
    }

    const succeeded = results.filter(r => r.success);
    console.log(`[App Loader] ✅ โหลดสำเร็จ ${succeeded.length}/${results.length} โมดูล`);

    // เริ่มต้นตัวซิงค์แบบเรียลไทม์
    setTimeout(() => {
      if (window.realTimeSync && !window.realTimeSync.isRunning) {
        console.log('[App Loader] 🔄 เริ่มต้นตัวซิงค์แบบเรียลไทม์');
        window.realTimeSync.start();
      }
    }, 1000);
  } catch (error) {
    console.error('[App Loader] โหลดโมดูลแอปพลิเคชันมือถือล้มเหลว:', error);
  }
}

// ตรวจสอบว่าอยู่ในสภาพแวดล้อมมือถือหรือไม่
function isMobileEnvironment() {
  return (
    window.location.pathname.includes('mobile') ||
    document.querySelector('[data-app]') !== null ||
    window.mobilePhone !== undefined
  );
}

// หน่วงเวลาโหลดอัตโนมัติ
setTimeout(() => {
  if (isMobileEnvironment()) {
    loadMobileAppModules();
  }
}, 1000);

console.log('[App Loader] โมดูลตัวโหลดแอปพลิเคชันโหลดเสร็จสมบูรณ์');
