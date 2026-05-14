/**
 * สคริปต์ทดสอบการเพิ่มประสิทธิภาพ app stack การเปลี่ยนหน้าบนมือถือ
 * ใช้สำหรับตรวจสอบว่าลอจิกการเปลี่ยนหน้าที่ปรับปรุงแล้วทำงานได้ถูกต้อง
 */

class MobilePhoneOptimizationTest {
  constructor() {
    this.testResults = [];
    this.mobilePhone = null;
  }

  // เริ่มต้นสภาพแวดล้อมทดสอบ
  async init() {
    console.log('=== เริ่มทดสอบการเพิ่มประสิทธิภาพ app stack การเปลี่ยนหน้าบนมือถือ ===');

    // รอให้ MobilePhone instance พร้อม
    await this.waitForMobilePhone();

    if (!this.mobilePhone) {
      console.error('❌ ไม่พบ MobilePhone instance ยกเลิกการทดสอบ');
      return false;
    }

    console.log('✅ MobilePhone instance พร้อมแล้ว');
    return true;
  }

  // รอ MobilePhone instance
  async waitForMobilePhone() {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      if (window.mobilePhone && window.mobilePhone instanceof MobilePhone) {
        this.mobilePhone = window.mobilePhone;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  // รันการทดสอบทั้งหมด
  async runAllTests() {
    const initialized = await this.init();
    if (!initialized) return;

    console.log('🧪 เริ่มรันการทดสอบการเพิ่มประสิทธิภาพ...');

    // ทดสอบกลไก debounce
    await this.testDebouncing();

    // ทดสอบการจัดการสถานะ
    await this.testStateManagement();

    // ทดสอบการป้องกันการทำงานซ้ำ
    await this.testDuplicateOperationPrevention();

    // แสดงผลการทดสอบ
    this.printTestResults();
  }

  // ทดสอบกลไก debounce
  async testDebouncing() {
    console.log('🔍 ทดสอบกลไก debounce...');

    try {
      // จำลองการคลิกไอคอนแอปอย่างรวดเร็วต่อเนื่อง
      const startTime = Date.now();

      // เรียก openApp ต่อเนื่อง 5 ครั้ง
      for (let i = 0; i < 5; i++) {
        this.mobilePhone.openApp('messages');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // ตรวจสอบว่ามี flag debounce หรือไม่
      const hasDebounceFlag = this.mobilePhone._openingApp !== null;

      this.addTestResult(
        'กลไก debounce',
        hasDebounceFlag,
        `เรียก openApp ต่อเนื่อง 5 ครั้ง ใช้เวลา ${duration}ms, flag debounce: ${this.mobilePhone._openingApp}`,
      );

      // รอให้ flag debounce ถูกล้าง
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      this.addTestResult('กลไก debounce', false, `ทดสอบผิดพลาด: ${error.message}`);
    }
  }

  // ทดสอบการจัดการสถานะ
  async testStateManagement() {
    console.log('🔍 ทดสอบการจัดการสถานะ...');

    try {
      // ล้างสถานะ
      this.mobilePhone.goHome();
      await new Promise(resolve => setTimeout(resolve, 100));

      // เปิดแอป
      this.mobilePhone.openApp('messages');
      await new Promise(resolve => setTimeout(resolve, 100));

      // ตรวจสอบความสอดคล้องของสถานะ
      const currentApp = this.mobilePhone.currentApp;
      const currentAppState = this.mobilePhone.currentAppState;
      const appStackLength = this.mobilePhone.appStack.length;

      const stateConsistent =
        currentApp === 'messages' && currentAppState && currentAppState.app === 'messages' && appStackLength === 1;

      this.addTestResult(
        'การจัดการสถานะ',
        stateConsistent,
        `currentApp: ${currentApp}, currentAppState.app: ${currentAppState?.app}, ความยาว appStack: ${appStackLength}`,
      );
    } catch (error) {
      this.addTestResult('การจัดการสถานะ', false, `ทดสอบผิดพลาด: ${error.message}`);
    }
  }

  // ทดสอบการป้องกันการทำงานซ้ำ
  async testDuplicateOperationPrevention() {
    console.log('🔍 ทดสอบการป้องกันการทำงานซ้ำ...');

    try {
      // ตรวจสอบให้แน่ใจว่าอยู่ที่หน้าหลักของแอปข้อความ
      this.mobilePhone.openApp('messages');
      await new Promise(resolve => setTimeout(resolve, 200));

      const initialStackLength = this.mobilePhone.appStack.length;

      // ลองเปิดแอปเดิมซ้ำ
      this.mobilePhone.openApp('messages');
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStackLength = this.mobilePhone.appStack.length;

      // ความยาว app stack ไม่ควรเพิ่มขึ้น
      const preventedDuplicate = initialStackLength === finalStackLength;

      this.addTestResult(
        'การป้องกันการทำงานซ้ำ',
        preventedDuplicate,
        `ความยาว stack เริ่มต้น: ${initialStackLength}, ความยาว stack สุดท้าย: ${finalStackLength}`,
      );
    } catch (error) {
      this.addTestResult('การป้องกันการทำงานซ้ำ', false, `ทดสอบผิดพลาด: ${error.message}`);
    }
  }

  // เพิ่มผลการทดสอบ
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // แสดงผลการทดสอบ
  printTestResults() {
    console.log('\n=== สรุปผลการทดสอบ ===');

    let passedCount = 0;
    let totalCount = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน';
      console.log(`${status} ${result.name}: ${result.details}`);

      if (result.passed) passedCount++;
    });

    console.log(`\n📊 รวม: ${passedCount}/${totalCount} การทดสอบผ่าน`);

    if (passedCount === totalCount) {
      console.log('🎉 ทดสอบทั้งหมดผ่าน! การเพิ่มประสิทธิภาพ app stack การเปลี่ยนหน้าสำเร็จ!');
    } else {
      console.log('⚠️ บางการทดสอบไม่ผ่าน ต้องปรับปรุงเพิ่มเติม');
    }

    console.log('=== จบการทดสอบ ===\n');
  }

  // เรียกใช้การทดสอบด้วยตนเอง
  static async runTest() {
    const tester = new MobilePhoneOptimizationTest();
    await tester.runAllTests();
    return tester.testResults;
  }
}

// ส่งออกไปยัง global scope
window.MobilePhoneOptimizationTest = MobilePhoneOptimizationTest;

// รันการทดสอบอัตโนมัติ (ถ้าอยู่ในสภาพแวดล้อมพัฒนา)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // หน่วงเวลาการรันทดสอบ เพื่อให้แน่ใจว่าคอมโพเนนต์ทั้งหมดโหลดแล้ว
  setTimeout(() => {
    if (window.mobilePhone) {
      console.log('🚀 รันการทดสอบการเพิ่มประสิทธิภาพ app stack การเปลี่ยนหน้าบนมือถืออัตโนมัติ...');
      MobilePhoneOptimizationTest.runTest();
    }
  }, 3000);
}

console.log('📱 โหลดสคริปต์ทดสอบการเพิ่มประสิทธิภาพ app stack การเปลี่ยนหน้าบนมือถือแล้ว');
