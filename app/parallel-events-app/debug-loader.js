// ตัวโหลดดีบักแอปเหตุการณ์คู่ขนาน
console.log('🔍 [Debug Loader] เริ่มดีบักกระบวนการโหลดแอปเหตุการณ์คู่ขนาน...');

// ตรวจสอบสภาพแวดล้อมปัจจุบัน
console.log('📋 [Debug Loader] ตรวจสอบสภาพแวดล้อม:');
console.log('  - URL ปัจจุบัน:', window.location.href);
console.log('  - User Agent:', navigator.userAgent);

// ตรวจสอบเส้นทางไฟล์
const expectedPaths = [
  './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-app.css',
  './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-styles.js',
  './scripts/extensions/third-party/mobile/app/parallel-events-app/parallel-events-app.js',
];

console.log('📁 [Debug Loader] เส้นทางไฟล์ที่คาดหวัง:');
expectedPaths.forEach((path, index) => {
  console.log(`  ${index + 1}. ${path}`);
});

// ทดสอบว่าไฟล์สามารถเข้าถึงได้หรือไม่
async function testFileAccess() {
  console.log('🌐 [Debug Loader] ทดสอบการเข้าถึงไฟล์...');

  for (let i = 0; i < expectedPaths.length; i++) {
    const path = expectedPaths[i];
    try {
      const response = await fetch(path);
      console.log(`  ✅ ${path} - สถานะ: ${response.status}`);
    } catch (error) {
      console.log(`  ❌ ${path} - ข้อผิดพลาด: ${error.message}`);
    }
  }
}

// ตรวจสอบการเปลี่ยนแปลงตัวแปรส่วนกลาง
const checkGlobals = () => {
  const globals = {
    ParallelEventsApp: window.ParallelEventsApp,
    parallelEventsManager: window.parallelEventsManager,
    parallelEventsStyles: window.parallelEventsStyles,
    getParallelEventsAppContent: window.getParallelEventsAppContent,
    bindParallelEventsAppEvents: window.bindParallelEventsAppEvents,
  };

  console.log('🔍 [Debug Loader] สถานะตัวแปรส่วนกลาง:');
  Object.entries(globals).forEach(([name, value]) => {
    const type = typeof value;
    const exists = value !== undefined;
    console.log(`  - ${name}: ${exists ? '✅' : '❌'} (${type})`);
  });

  return globals;
};

// ตรวจสอบเริ่มต้น
checkGlobals();

// ทดสอบการเข้าถึงไฟล์
testFileAccess();

// ตรวจสอบการเปลี่ยนแปลงตัวแปรส่วนกลางเป็นระยะ
let checkCount = 0;
const maxChecks = 20;
const checkInterval = setInterval(() => {
  checkCount++;
  console.log(`🔄 [Debug Loader] ตรวจสอบ ${checkCount}/${maxChecks}:`);

  const globals = checkGlobals();

  // ถ้าตัวแปรทั้งหมดมีอยู่แล้ว หยุดตรวจสอบ
  const allExists = Object.values(globals).every(v => v !== undefined);
  if (allExists) {
    console.log('🎉 [Debug Loader] ตัวแปรส่วนกลางทั้งหมดพร้อมแล้ว!');
    clearInterval(checkInterval);

    // ลองเรียกฟังก์ชันดีบัก
    if (window.debugParallelEventsApp) {
      console.log('🔧 [Debug Loader] เรียกฟังก์ชันดีบัก...');
      window.debugParallelEventsApp();
    }
  } else if (checkCount >= maxChecks) {
    console.log('⏰ [Debug Loader] ตรวจสอบหมดเวลา หยุดการตรวจสอบ');
    clearInterval(checkInterval);
  }
}, 1000);

console.log('🔍 [Debug Loader] ตัวโหลดดีบักเริ่มทำงานแล้ว จะตรวจสอบการเปลี่ยนแปลงตัวแปรส่วนกลาง...');
