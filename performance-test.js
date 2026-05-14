/**
 * สคริปต์ทดสอบประสิทธิภาพปลั๊กอิน Mobile
 * ใช้สำหรับทดสอบและตรวจสอบผลการเพิ่มประสิทธิภาพ
 */

class MobilePerformanceTester {
  constructor() {
    this.tests = [];
    this.results = [];
    this.baselineMetrics = null;
    this.currentMetrics = null;

    console.log('[Performance Tester] ตัวทดสอบประสิทธิภาพเริ่มต้นแล้ว');
  }

  /**
   * ลงทะเบียนกรณีทดสอบ
   */
  registerTests() {
    this.tests = [
      {
        name: 'ทดสอบเวลาโหลดปลั๊กอิน',
        description: 'ทดสอบเวลาที่ใช้ในการโหลดปลั๊กอินทั้งหมด',
        test: this.testPluginLoadTime.bind(this),
        category: 'loading',
      },
      {
        name: 'ทดสอบการใช้หน่วยความจำ',
        description: 'ทดสอบการใช้หน่วยความจำขณะปลั๊กอินทำงาน',
        test: this.testMemoryUsage.bind(this),
        category: 'memory',
      },
      {
        name: 'ทดสอบประสิทธิภาพตัวตรวจสอบ',
        description: 'ทดสอบประสิทธิภาพของตัวตรวจสอบบริบท',
        test: this.testMonitorPerformance.bind(this),
        category: 'monitoring',
      },
      {
        name: 'ทดสอบการโหลดแบบขนาน',
        description: 'ทดสอบประสิทธิภาพการโหลดแบบขนานของตัวโหลดที่ปรับปรุงแล้ว',
        test: this.testParallelLoading.bind(this),
        category: 'loading',
      },
      {
        name: 'ทดสอบประสิทธิภาพการจัดการ DOM',
        description: 'ทดสอบเวลาตอบสนองของการจัดการ DOM',
        test: this.testDOMPerformance.bind(this),
        category: 'rendering',
      },
      {
        name: 'ทดสอบอัตราการเข้าถึงแคช',
        description: 'ทดสอบประสิทธิผลของกลไกแคช',
        test: this.testCacheHitRate.bind(this),
        category: 'caching',
      },
    ];

    console.log(`[Performance Tester] ลงทะเบียนกรณีทดสอบ ${this.tests.length} รายการแล้ว`);
  }

  /**
   * รันการทดสอบทั้งหมด
   */
  async runAllTests() {
    console.log('[Performance Tester] เริ่มรันการทดสอบประสิทธิภาพ...');

    this.results = [];
    const startTime = performance.now();

    for (const test of this.tests) {
      try {
        console.log(`[Performance Tester] กำลังรันทดสอบ: ${test.name}`);
        const result = await this.runSingleTest(test);
        this.results.push(result);
      } catch (error) {
        console.error(`[Performance Tester] ทดสอบล้มเหลว: ${test.name}`, error);
        this.results.push({
          ...test,
          success: false,
          error: error.message,
          duration: 0,
        });
      }
    }

    const totalTime = performance.now() - startTime;

    // สร้างรายงานทดสอบ
    const report = this.generateReport(totalTime);
    this.displayReport(report);

    return report;
  }

  /**
   * รันการทดสอบเดี่ยว
   */
  async runSingleTest(test) {
    const startTime = performance.now();

    try {
      const result = await test.test();
      const duration = performance.now() - startTime;

      return {
        ...test,
        success: true,
        duration,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        ...test,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * ทดสอบเวลาโหลดปลั๊กอิน
   */
  async testPluginLoadTime() {
    const startTime = performance.now();

    // จำลองการโหลดปลั๊กอินใหม่
    const loader = window.optimizedLoader;
    if (!loader) {
      throw new Error('ตัวโหลดที่ปรับปรุงแล้วไม่พร้อมใช้งาน');
    }

    const testModules = [
      {
        src: './scripts/extensions/third-party/mobile/context-monitor.js',
        name: 'test-context-monitor',
        required: true,
      },
    ];

    await loader.loadScriptsParallel(testModules);

    const loadTime = performance.now() - startTime;

    return {
      loadTime: Math.round(loadTime),
      modules: testModules.length,
      averageTimePerModule: Math.round(loadTime / testModules.length),
    };
  }

  /**
   * ทดสอบการใช้หน่วยความจำ
   */
  async testMemoryUsage() {
    if (!performance.memory) {
      throw new Error('Performance memory API ไม่พร้อมใช้งาน');
    }

    const initialMemory = performance.memory.usedJSHeapSize;

    // ดำเนินการบางอย่างเพื่อทดสอบการใช้หน่วยความจำ
    const testData = [];
    for (let i = 0; i < 1000; i++) {
      testData.push({
        id: i,
        data: new Array(100).fill('test data'),
        timestamp: Date.now(),
      });
    }

    // รอการเก็บขยะ
    await this.delay(100);

    const afterMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = afterMemory - initialMemory;

    // ทำความสะอาดข้อมูลทดสอบ
    testData.length = 0;

    return {
      initialMemory: Math.round(initialMemory / 1024 / 1024),
      afterMemory: Math.round(afterMemory / 1024 / 1024),
      memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
      totalMemory: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
    };
  }

  /**
   * ทดสอบประสิทธิภาพตัวตรวจสอบ
   */
  async testMonitorPerformance() {
    const monitor = window.contextMonitor;
    if (!monitor) {
      throw new Error('ตัวตรวจสอบบริบทไม่พร้อมใช้งาน');
    }

    const startTime = performance.now();

    // จำลองการทำงานของตัวตรวจสอบ
    monitor.checkContextChanges();

    const checkTime = performance.now() - startTime;

    // รับสถิติตัวตรวจสอบ
    const stats = monitor.getPerformanceStats ? monitor.getPerformanceStats() : null;

    return {
      checkTime: Math.round(checkTime),
      isRunning: monitor.isRunning,
      stats: stats,
      historySize: monitor.contextHistory ? monitor.contextHistory.length : 0,
    };
  }

  /**
   * ทดสอบการโหลดแบบขนาน
   */
  async testParallelLoading() {
    const loader = window.optimizedLoader;
    if (!loader) {
      throw new Error('ตัวโหลดที่ปรับปรุงแล้วไม่พร้อมใช้งาน');
    }

    const testModules = [
      { src: 'data:text/javascript,console.log("test1");', name: 'test1', required: false },
      { src: 'data:text/javascript,console.log("test2");', name: 'test2', required: false },
      { src: 'data:text/javascript,console.log("test3");', name: 'test3', required: false },
    ];

    const startTime = performance.now();
    await loader.loadScriptsParallel(testModules);
    const parallelTime = performance.now() - startTime;

    return {
      parallelTime: Math.round(parallelTime),
      moduleCount: testModules.length,
      averageTime: Math.round(parallelTime / testModules.length),
    };
  }

  /**
   * ทดสอบประสิทธิภาพการจัดการ DOM
   */
  async testDOMPerformance() {
    const startTime = performance.now();

    // สร้าง element DOM สำหรับทดสอบ
    const testContainer = document.createElement('div');
    testContainer.id = 'performance-test-container';
    testContainer.style.display = 'none';
    document.body.appendChild(testContainer);

    // ดำเนินการจัดการ DOM
    for (let i = 0; i < 100; i++) {
      const element = document.createElement('div');
      element.className = 'test-element';
      element.textContent = `Test element ${i}`;
      testContainer.appendChild(element);
    }

    // ค้นหา element DOM
    const elements = testContainer.querySelectorAll('.test-element');

    // แก้ไข element DOM
    elements.forEach((element, index) => {
      element.style.backgroundColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';
    });

    const domTime = performance.now() - startTime;

    // ทำความสะอาด element ทดสอบ
    testContainer.remove();

    return {
      domTime: Math.round(domTime),
      elementCount: elements.length,
      operationsPerSecond: Math.round(elements.length / (domTime / 1000)),
    };
  }

  /**
   * ทดสอบอัตราการเข้าถึงแคช
   */
  async testCacheHitRate() {
    const loader = window.optimizedLoader;
    if (!loader) {
      throw new Error('ตัวโหลดที่ปรับปรุงแล้วไม่พร้อมใช้งาน');
    }

    const testUrl = 'data:text/javascript,console.log("cache test");';

    // โหลดครั้งแรก
    const startTime1 = performance.now();
    await loader.loadScript(testUrl, 'cache-test1');
    const firstLoadTime = performance.now() - startTime1;

    // โหลดครั้งที่สอง (ควรโหลดจากแคช)
    const startTime2 = performance.now();
    await loader.loadScript(testUrl, 'cache-test2');
    const secondLoadTime = performance.now() - startTime2;

    const cacheHitRate = secondLoadTime < firstLoadTime ? ((firstLoadTime - secondLoadTime) / firstLoadTime) * 100 : 0;

    return {
      firstLoadTime: Math.round(firstLoadTime),
      secondLoadTime: Math.round(secondLoadTime),
      cacheHitRate: Math.round(cacheHitRate),
      improvement: Math.round(firstLoadTime / secondLoadTime),
    };
  }

  /**
   * สร้างรายงานทดสอบ
   */
  generateReport(totalTime) {
    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    const categoryStats = {};
    this.results.forEach(result => {
      if (!categoryStats[result.category]) {
        categoryStats[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      categoryStats[result.category].total++;
      if (result.success) {
        categoryStats[result.category].passed++;
      } else {
        categoryStats[result.category].failed++;
      }
    });

    return {
      summary: {
        totalTests: this.results.length,
        successfulTests: successfulTests.length,
        failedTests: failedTests.length,
        successRate: Math.round((successfulTests.length / this.results.length) * 100),
        totalTime: Math.round(totalTime),
      },
      categoryStats,
      detailedResults: this.results,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * สร้างคำแนะนำการเพิ่มประสิทธิภาพ
   */
  generateRecommendations() {
    const recommendations = [];

    // สร้างคำแนะนำตามผลการทดสอบ
    this.results.forEach(result => {
      if (result.success && result.result) {
        switch (result.category) {
          case 'loading':
            if (result.result.loadTime > 1000) {
              recommendations.push('แนะนำให้เพิ่มประสิทธิภาพเวลาโหลดโมดูลเพิ่มเติม');
            }
            break;
          case 'memory':
            if (result.result.memoryIncrease > 10) {
              recommendations.push('แนะนำให้ตรวจสอบการรั่วไหลของหน่วยความจำ เพิ่มประสิทธิภาพการใช้หน่วยความจำ');
            }
            break;
          case 'monitoring':
            if (result.result.checkTime > 100) {
              recommendations.push('แนะนำให้เพิ่มประสิทธิภาพความถี่การตรวจสอบของตัวตรวจสอบ');
            }
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('การทดสอบทั้งหมดมีผลลัพธ์ดี ไม่จำเป็นต้องเพิ่มประสิทธิภาพเพิ่มเติม');
    }

    return recommendations;
  }

  /**
   * แสดงรายงานทดสอบ
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 รายงานทดสอบประสิทธิภาพปลั๊กอิน Mobile');
    console.log('='.repeat(60));

    console.log('\n📊 สรุปการทดสอบ:');
    console.log(`  จำนวนทดสอบทั้งหมด: ${report.summary.totalTests}`);
    console.log(`  สำเร็จ: ${report.summary.successfulTests}`);
    console.log(`  ล้มเหลว: ${report.summary.failedTests}`);
    console.log(`  อัตราความสำเร็จ: ${report.summary.successRate}%`);
    console.log(`  เวลาทั้งหมด: ${report.summary.totalTime}ms`);

    console.log('\n📈 สถิติตามหมวดหมู่:');
    Object.entries(report.categoryStats).forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.passed}/${stats.total} ผ่าน`);
    });

    console.log('\n💡 คำแนะนำการเพิ่มประสิทธิภาพ:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    console.log('\n📋 ผลลัพธ์โดยละเอียด:');
    report.detailedResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${index + 1}. ${status} ${result.name} (${result.duration}ms)`);
      if (result.result) {
        console.log(`     ผลลัพธ์: ${JSON.stringify(result.result)}`);
      }
      if (result.error) {
        console.log(`     ข้อผิดพลาด: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
  }

  /**
   * ส่งออกผลการทดสอบ
   */
  exportResults() {
    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      performance: this.results,
      config: window.MOBILE_PERFORMANCE_CONFIG,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-performance-test-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log('[Performance Tester] ส่งออกผลการทดสอบแล้ว');
  }

  /**
   * เมธอดช่วย: หน่วงเวลา
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// สร้างตัวทดสอบประสิทธิภาพแบบ global
window.mobilePerformanceTester = new MobilePerformanceTester();

// ลงทะเบียนกรณีทดสอบ
window.mobilePerformanceTester.registerTests();

// ส่งออก
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobilePerformanceTester;
} else {
  window.MobilePerformanceTester = MobilePerformanceTester;
}

// เพิ่มคำสั่งคอนโซล
window.runMobilePerformanceTest = () => {
  return window.mobilePerformanceTester.runAllTests();
};

window.exportMobilePerformanceResults = () => {
  return window.mobilePerformanceTester.exportResults();
};

console.log('[Performance Tester] ตัวทดสอบประสิทธิภาพพร้อมใช้งาน');
console.log('💡 ใช้ runMobilePerformanceTest() เพื่อรันการทดสอบ');
console.log('💡 ใช้ exportMobilePerformanceResults() เพื่อส่งออกผลลัพธ์');
