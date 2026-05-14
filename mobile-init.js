/**
 * Mobile Init - สคริปต์เริ่มต้นระบบมือถือ
 * ตรวจสอบให้แน่ใจว่าโมดูลมือถือทั้งหมดโหลดตามลำดับที่ถูกต้อง
 */

(function () {
  'use strict';

  console.log('[Mobile Init] 🚀 เริ่มต้นระบบมือถือ...');

  // การตั้งค่าโมดูลมือถือ
  const MOBILE_MODULES = [
    {
      name: 'real-time-sync',
      path: 'scripts/extensions/third-party/mobile/app/real-time-sync.js',
      dependencies: [],
    },
  ];

  // โมดูลที่โหลดแล้ว
  const loadedModules = new Set();
  const loadingModules = new Set();

  // โหลดสคริปต์
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      console.log(`[Mobile Init] 📦 กำลังโหลดสคริปต์: ${src}`);

      // ตรวจสอบว่ามีอยู่แล้วหรือไม่
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        console.log(`[Mobile Init] ✅ สคริปต์มีอยู่แล้ว: ${src}`);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`[Mobile Init] ✅ โหลดสคริปต์สำเร็จ: ${src}`);
        resolve();
      };
      script.onerror = error => {
        console.error(`[Mobile Init] ❌ โหลดสคริปต์ล้มเหลว: ${src}`, error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  // โหลดโมดูล
  async function loadModule(module) {
    if (loadedModules.has(module.name)) {
      return true;
    }

    if (loadingModules.has(module.name)) {
      // รอให้โหลดเสร็จจากที่อื่น
      while (loadingModules.has(module.name)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return loadedModules.has(module.name);
    }

    loadingModules.add(module.name);

    try {
      // โหลด dependencies
      for (const depName of module.dependencies) {
        const dep = MOBILE_MODULES.find(m => m.name === depName);
        if (dep && !loadedModules.has(depName)) {
          await loadModule(dep);
        }
      }

      // โหลดโมดูลปัจจุบัน
      await loadScript(module.path);
      loadedModules.add(module.name);
      console.log(`[Mobile Init] ✅ โหลดโมดูลสำเร็จ: ${module.name}`);
      return true;
    } catch (error) {
      console.error(`[Mobile Init] ❌ โหลดโมดูลล้มเหลว: ${module.name}`, error);
      return false;
    } finally {
      loadingModules.delete(module.name);
    }
  }

  // ตรวจสอบว่าอยู่ในสภาพแวดล้อมมือถือหรือไม่
  function isMobileEnvironment() {
    const hasDataApp = document.querySelector('[data-app]') !== null;
    const hasPathMobile = window.location.pathname.includes('mobile');
    const hasMobilePhone = typeof window.mobilePhone !== 'undefined';

    console.log('[Mobile Init] 🔍 ตรวจสอบสภาพแวดล้อม:', {
      hasDataApp,
      hasPathMobile,
      hasMobilePhone,
      pathname: window.location.pathname,
      dataAppElement: document.querySelector('[data-app]'),
    });

    // บังคับเปิดใช้งานโมดูลมือถือ เพื่อการดีบัก
    const isMobile = hasDataApp || hasPathMobile || hasMobilePhone || true;
    console.log('[Mobile Init] 🎯 ผลการตรวจสอบสภาพแวดล้อมมือถือ:', isMobile);

    return isMobile;
  }

  // เริ่มต้นโมดูลมือถือ
  async function initMobileModules() {
    try {
      if (!isMobileEnvironment()) {
        console.log('[Mobile Init] ไม่ใช่สภาพแวดล้อมมือถือ ข้ามการเริ่มต้น');
        return;
      }

      console.log('[Mobile Init] 🎯 ตรวจพบสภาพแวดล้อมมือถือ เริ่มโหลดโมดูล...');

      // โหลดโมดูลทั้งหมด
      for (const module of MOBILE_MODULES) {
        await loadModule(module);
      }

      // รอสักครู่เพื่อให้แน่ใจว่าโมดูลเริ่มต้นเสร็จสมบูรณ์
      setTimeout(() => {
        initRealTimeSync();
      }, 1000);

      console.log('[Mobile Init] ✅ โหลดโมดูลมือถือทั้งหมดสำเร็จ');
    } catch (error) {
      console.error('[Mobile Init] ❌ เริ่มต้นโมดูลมือถือล้มเหลว:', error);
    }
  }

  // เริ่มต้นตัวซิงค์แบบเรียลไทม์
  function initRealTimeSync() {
    try {
      console.log('[Mobile Init] 🔄 กำลังเริ่มต้นตัวซิงค์แบบเรียลไทม์...');

      // ตรวจสอบว่าตัวซิงค์แบบเรียลไทม์พร้อมใช้งานหรือไม่
      if (typeof window.realTimeSync !== 'undefined') {
        console.log('[Mobile Init] ✅ ตัวซิงค์แบบเรียลไทม์พร้อมใช้งาน กำลังเริ่ม...');

        if (!window.realTimeSync.isRunning) {
          window.realTimeSync.start();
        }
      } else {
        console.warn('[Mobile Init] ⚠️ ตัวซิงค์แบบเรียลไทม์ไม่พร้อมใช้งาน');
      }
    } catch (error) {
      console.error('[Mobile Init] ❌ เริ่มต้นตัวซิงค์แบบเรียลไทม์ล้มเหลว:', error);
    }
  }

  // สร้างฟังก์ชันดีบักแบบ global
  window.mobileDebug = {
    loadedModules: () => Array.from(loadedModules),
    loadingModules: () => Array.from(loadingModules),
    reloadModule: async moduleName => {
      const module = MOBILE_MODULES.find(m => m.name === moduleName);
      if (module) {
        loadedModules.delete(moduleName);
        return await loadModule(module);
      }
      return false;
    },
    initRealTimeSync,
    checkRealTimeSync: () => {
      return {
        exists: typeof window.realTimeSync !== 'undefined',
        isRunning: window.realTimeSync?.isRunning || false,
        status: window.realTimeSync?.getSyncStatus?.() || null,
      };
    },
  };

  // เริ่มทำงานแบบหน่วงเวลา เพื่อให้แน่ใจว่า DOM พร้อม
  console.log('[Mobile Init] สถานะ DOM ปัจจุบัน:', document.readyState);

  if (document.readyState === 'loading') {
    console.log('[Mobile Init] DOM กำลังโหลด รอ event DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Mobile Init] event DOMContentLoaded ถูกเรียก');
      setTimeout(initMobileModules, 1000);
    });
  } else {
    console.log('[Mobile Init] DOM พร้อมแล้ว เริ่มทำงานทันที...');
    setTimeout(initMobileModules, 1000);
  }

  console.log('[Mobile Init] โหลดสคริปต์เริ่มต้นระบบมือถือสำเร็จ');
})();
