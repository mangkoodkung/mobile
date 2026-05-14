// สคริปต์ทดสอบการเริ่มต้นแอปเหตุการณ์คู่ขนาน
console.log('=== ทดสอบการเริ่มต้นแอปเหตุการณ์คู่ขนาน ===');

// ตรวจสอบว่าไฟล์โหลดถูกต้องหรือไม่
console.log('1. ตรวจสอบตัวแปรส่วนกลาง:');
console.log('   - ParallelEventsApp:', typeof ParallelEventsApp);
console.log('   - parallelEventsManager:', typeof window.parallelEventsManager);
console.log('   - parallelEventsStyles:', typeof window.parallelEventsStyles);
console.log('   - getParallelEventsAppContent:', typeof window.getParallelEventsAppContent);
console.log('   - bindParallelEventsAppEvents:', typeof window.bindParallelEventsAppEvents);

// ตรวจสอบสถานะตัวจัดการ
if (window.parallelEventsManager) {
  console.log('2. สถานะตัวจัดการ:');
  console.log('   - isInitialized:', window.parallelEventsManager.isInitialized);
  console.log('   - isListening:', window.parallelEventsManager.isListening);
  console.log('   - currentSettings:', window.parallelEventsManager.currentSettings);
  console.log('   - eventQueue length:', window.parallelEventsManager.eventQueue?.length);
} else {
  console.log('2. ❌ ยังไม่ได้สร้างตัวจัดการ');
}

// ตรวจสอบตัวจัดการสไตล์
if (window.parallelEventsStyles) {
  console.log('3. สถานะตัวจัดการสไตล์:');
  console.log('   - สไตล์ที่ใช้ได้:', window.parallelEventsStyles.getAvailableStyles());
  console.log('   - prefix กำหนดเอง:', window.parallelEventsStyles.getCustomPrefix());
} else {
  console.log('3. ❌ ยังไม่ได้สร้างตัวจัดการสไตล์');
}

// ตรวจสอบโมดูลที่ต้องพึ่งพา
console.log('4. สถานะโมดูลที่ต้องพึ่งพา:');
console.log('   - mobileContextEditor:', typeof window.mobileContextEditor);
console.log('   - mobileCustomAPIConfig:', typeof window.mobileCustomAPIConfig);

console.log('=== ทดสอบเสร็จสิ้น ===');
