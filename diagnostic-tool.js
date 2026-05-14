/**
 * เครื่องมือวินิจฉัยปลั๊กอิน Mobile
 * ใช้สำหรับตรวจสอบว่าโมดูลเพิ่มประสิทธิภาพทั้งหมดโหลดและทำงานอย่างถูกต้อง
 */

class MobileDiagnosticTool {
  constructor() {
    this.modules = [
      {
        name: 'การตั้งค่าประสิทธิภาพ',
        check: () => !!window.MOBILE_PERFORMANCE_CONFIG,
        details: () => (window.MOBILE_PERFORMANCE_CONFIG ? 'โหลดแล้ว' : 'ยังไม่ได้โหลด'),
      },
      {
        name: 'ตัวตรวจสอบประสิทธิภาพ',
        check: () => !!window.mobilePerformanceMonitor,
        details: () =>
          window.mobilePerformanceMonitor
            ? `เวลาทำงาน: ${window.mobilePerformanceMonitor.getMetrics().loadTime || 0}ms`
            : 'ยังไม่ได้โหลด',
      },
      {
        name: 'ตัวโหลดที่ปรับปรุงแล้ว',
        check: () => !!window.optimizedLoader,
        details: () =>
          window.optimizedLoader
            ? `โมดูลที่โหลดแล้ว: ${window.optimizedLoader.getLoadingStatus().loaded} รายการ`
            : 'ยังไม่ได้โหลด',
      },
      {
        name: 'ตัวตรวจสอบบริบท',
        check: () => !!window.contextMonitor,
        details: () =>
          window.contextMonitor
            ? `สถานะ: ${window.contextMonitor.isRunning ? 'กำลังทำงาน' : 'หยุดแล้ว'}`
            : 'ยังไม่ได้โหลด',
      },
      {
        name: 'ตัวทดสอบประสิทธิภาพ',
        check: () => !!window.mobilePerformanceTester,
        details: () =>
          window.mobilePerformanceTester
            ? `กรณีทดสอบ: ${window.mobilePerformanceTester.tests.length} รายการ`
            : 'ยังไม่ได้โหลด',
      },
      {
        name: 'อินเทอร์เฟซมือถือ',
        check: () => !!window.MobilePhone || !!document.getElementById('mobile-phone-trigger'),
        details: () => {
          const button = document.getElementById('mobile-phone-trigger');
          return button ? 'สร้างปุ่มอินเทอร์เฟซแล้ว' : 'อินเทอร์เฟซยังไม่ได้เริ่มต้น';
        },
      },
    ];

    console.log('[Diagnostic Tool] เครื่องมือวินิจฉัยเริ่มต้นแล้ว');
  }

  /**
   * รันการวินิจฉัยแบบเต็ม
   */
  runDiagnosis() {
    console.log('\n' + '='.repeat(50));
    console.log('🔍 รายงานการวินิจฉัยปลั๊กอิน Mobile');
    console.log('='.repeat(50));

    const results = [];
    let passedCount = 0;

    this.modules.forEach((module, index) => {
      const passed = module.check();
      const details = module.details();

      results.push({
        name: module.name,
        passed,
        details,
      });

      if (passed) passedCount++;

      const status = passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${module.name}: ${details}`);
    });

    const successRate = Math.round((passedCount / this.modules.length) * 100);

    console.log('\n📊 สรุปการวินิจฉัย:');
    console.log(`  ผ่าน: ${passedCount}/${this.modules.length} (${successRate}%)`);

    if (successRate === 100) {
      console.log('🎉 โมดูลทั้งหมดทำงานปกติ!');
    } else if (successRate >= 80) {
      console.log('⚠️  โมดูลส่วนใหญ่ปกติ มีปัญหาเล็กน้อย');
    } else {
      console.log('🚨 มีปัญหาร้ายแรง กรุณาตรวจสอบการติดตั้งปลั๊กอิน');
    }

    // ให้คำแนะนำการแก้ไข
    this.provideTroubleshootingTips(results);

    console.log('='.repeat(50));

    return {
      results,
      passedCount,
      totalCount: this.modules.length,
      successRate,
    };
  }

  /**
   * ให้คำแนะนำการแก้ไขปัญหา
   */
  provideTroubleshootingTips(results) {
    const failedModules = results.filter(r => !r.passed);

    if (failedModules.length === 0) return;

    console.log('\n🔧 คำแนะนำการแก้ไขปัญหา:');

    failedModules.forEach(module => {
      switch (module.name) {
        case 'การตั้งค่าประสิทธิภาพ':
          console.log('  - ตรวจสอบว่า performance-config.js โหลดอย่างถูกต้อง');
          break;
        case 'ตัวตรวจสอบประสิทธิภาพ':
          console.log('  - ลองสร้างด้วยตนเอง: window.mobilePerformanceMonitor = new PerformanceMonitor()');
          break;
        case 'ตัวโหลดที่ปรับปรุงแล้ว':
          console.log('  - ตรวจสอบว่า optimized-loader.js โหลดแล้ว หรือสร้าง instance ด้วยตนเอง');
          break;
        case 'ตัวตรวจสอบบริบท':
          console.log('  - ลองเริ่มต้นใหม่: window.contextMonitor = new ContextMonitor()');
          break;
        case 'ตัวทดสอบประสิทธิภาพ':
          console.log('  - ตรวจสอบว่า performance-test.js โหลดเสร็จแล้ว');
          break;
        case 'อินเทอร์เฟซมือถือ':
          console.log('  - รอให้หน้าเว็บโหลดเสร็จสมบูรณ์แล้วลองอีกครั้ง หรือตรวจสอบ mobile-phone.js');
          break;
      }
    });
  }

  /**
   * ตรวจสอบฟังก์ชันหลักอย่างรวดเร็ว
   */
  quickCheck() {
    const coreModules = ['การตั้งค่าประสิทธิภาพ', 'ตัวโหลดที่ปรับปรุงแล้ว', 'ตัวตรวจสอบบริบท'];
    const coreResults = this.modules
      .filter(m => coreModules.includes(m.name))
      .map(m => ({ name: m.name, passed: m.check() }));

    const corePassed = coreResults.filter(r => r.passed).length;
    const coreTotal = coreResults.length;

    console.log(`🔍 ตรวจสอบโมดูลหลัก: ${corePassed}/${coreTotal} ปกติ`);

    if (corePassed === coreTotal) {
      console.log('✅ ฟังก์ชันหลักปกติ สามารถใช้การทดสอบประสิทธิภาพได้');
      this.showAvailableCommands();
    } else {
      console.log('⚠️  ฟังก์ชันหลักผิดปกติ กรุณาแก้ไขโมดูลพื้นฐานก่อน');
    }

    return corePassed === coreTotal;
  }

  /**
   * แสดงคำสั่งที่ใช้ได้
   */
  showAvailableCommands() {
    console.log('\n💡 คำสั่งที่ใช้ได้:');
    console.log('  - checkMobileOptimization()      // ตรวจสอบอย่างรวดเร็ว');
    console.log('  - diagnoseMobilePlugin()         // วินิจฉัยแบบเต็ม');
    console.log('  - runMobilePerformanceTest()     // ทดสอบประสิทธิภาพ (ถ้ามี)');
    console.log('  - window.optimizedLoader.getLoadingStatus()');
    console.log('  - window.contextMonitor.getPerformanceStats()');
  }

  /**
   * ลองแก้ไขปัญหาทั่วไปอัตโนมัติ
   */
  attemptAutoFix() {
    console.log('🔧 กำลังลองแก้ไขอัตโนมัติ...');

    let fixCount = 0;

    // แก้ไขตัวตรวจสอบประสิทธิภาพ
    if (!window.mobilePerformanceMonitor && window.PerformanceMonitor) {
      try {
        window.mobilePerformanceMonitor = new window.PerformanceMonitor();
        console.log('✅ แก้ไขตัวตรวจสอบประสิทธิภาพแล้ว');
        fixCount++;
      } catch (error) {
        console.log('❌ แก้ไขตัวตรวจสอบประสิทธิภาพล้มเหลว:', error.message);
      }
    }

    // แก้ไขตัวโหลดที่ปรับปรุงแล้ว
    if (!window.optimizedLoader && window.OptimizedLoader) {
      try {
        window.optimizedLoader = new window.OptimizedLoader();
        console.log('✅ แก้ไขตัวโหลดที่ปรับปรุงแล้ว');
        fixCount++;
      } catch (error) {
        console.log('❌ แก้ไขตัวโหลดที่ปรับปรุงล้มเหลว:', error.message);
      }
    }

    // แก้ไขตัวตรวจสอบบริบท
    if (!window.contextMonitor && window.ContextMonitor) {
      try {
        window.contextMonitor = new window.ContextMonitor();
        window.contextMonitor.init();
        console.log('✅ แก้ไขตัวตรวจสอบบริบทแล้ว');
        fixCount++;
      } catch (error) {
        console.log('❌ แก้ไขตัวตรวจสอบบริบทล้มเหลว:', error.message);
      }
    }

    // แก้ไขตัวทดสอบประสิทธิภาพ
    if (!window.mobilePerformanceTester && window.MobilePerformanceTester) {
      try {
        window.mobilePerformanceTester = new window.MobilePerformanceTester();
        window.mobilePerformanceTester.registerTests();

        // กำหนดฟังก์ชัน global ใหม่
        window.runMobilePerformanceTest = () => {
          return window.mobilePerformanceTester.runAllTests();
        };

        window.exportMobilePerformanceResults = () => {
          return window.mobilePerformanceTester.exportResults();
        };

        console.log('✅ แก้ไขตัวทดสอบประสิทธิภาพแล้ว');
        fixCount++;
      } catch (error) {
        console.log('❌ แก้ไขตัวทดสอบประสิทธิภาพล้มเหลว:', error.message);
      }
    }

    console.log(`🔧 การแก้ไขอัตโนมัติเสร็จสิ้น แก้ไขแล้ว ${fixCount} ปัญหา`);

    if (fixCount > 0) {
      console.log('💡 แนะนำให้รันการวินิจฉัยอีกครั้ง: diagnoseMobilePlugin()');
    }

    return fixCount;
  }

  /**
   * โหลดโมดูลที่ขาดหายใหม่
   */
  async reloadMissingModules() {
    console.log('🔄 กำลังโหลดโมดูลที่ขาดหายใหม่...');

    const basePath = './scripts/extensions/third-party/mobile/';
    const modules = [
      { file: 'performance-config.js', check: () => !!window.MOBILE_PERFORMANCE_CONFIG },
      { file: 'optimized-loader.js', check: () => !!window.OptimizedLoader },
      { file: 'performance-test.js', check: () => !!window.MobilePerformanceTester },
    ];

    for (const module of modules) {
      if (!module.check()) {
        try {
          await this.loadScript(basePath + module.file);
          console.log(`✅ โหลด ${module.file} ใหม่แล้ว`);
        } catch (error) {
          console.log(`❌ โหลด ${module.file} ใหม่ล้มเหลว:`, error.message);
        }
      }
    }

    // รอสักครู่ให้โมดูลเริ่มต้น
    setTimeout(() => {
      this.attemptAutoFix();
    }, 1000);
  }

  /**
   * เมธอดช่วยโหลดสคริปต์
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

// สร้าง instance เครื่องมือวินิจฉัยแบบ global
window.mobileDiagnosticTool = new MobileDiagnosticTool();

// ให้ฟังก์ชัน global ที่สะดวก
window.diagnoseMobilePlugin = () => {
  return window.mobileDiagnosticTool.runDiagnosis();
};

window.checkMobileOptimization = () => {
  return window.mobileDiagnosticTool.quickCheck();
};

window.fixMobilePlugin = () => {
  return window.mobileDiagnosticTool.attemptAutoFix();
};

window.reloadMobileModules = () => {
  return window.mobileDiagnosticTool.reloadMissingModules();
};

// ตรวจสอบอย่างรวดเร็วทันที
setTimeout(() => {
  console.log('[Mobile Diagnostic] เครื่องมือวินิจฉัยพร้อมใช้งาน');
  console.log('💡 ใช้ checkMobileOptimization() สำหรับตรวจสอบอย่างรวดเร็ว');
  console.log('💡 ใช้ diagnoseMobilePlugin() สำหรับวินิจฉัยแบบเต็ม');
  console.log('💡 ใช้ fixMobilePlugin() สำหรับลองแก้ไขอัตโนมัติ');
}, 1000);

console.log('[Mobile Diagnostic] โหลดเครื่องมือวินิจฉัยแล้ว');
