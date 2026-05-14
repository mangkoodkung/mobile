/**
 * ทดสอบผลการแก้ไขการโหลดแอป
 * ใช้สำหรับตรวจสอบการจัดการสถานะการโหลดและการแก้ไขการบังคับเปลี่ยนหน้าของแอป API/ฟอรัม/เวยป๋อ
 */

console.log('=== ทดสอบการแก้ไขการโหลดแอป ===');

// ทดสอบการจัดการเจตนาการนำทางของผู้ใช้
function testUserNavigationIntent() {
  console.log('\n1. ทดสอบการจัดการเจตนาการนำทางของผู้ใช้');

  if (!window.mobilePhone) {
    console.error('อินเทอร์เฟซมือถือยังไม่ได้เริ่มต้น');
    return;
  }

  const phone = window.mobilePhone;

  // จำลองผู้ใช้คลิกแอปฟอรัม
  console.log('จำลองผู้ใช้คลิกแอปฟอรัม...');
  phone._userNavigationIntent = {
    targetApp: 'forum',
    timestamp: Date.now(),
    fromApp: null,
  };

  console.log('เจตนาการนำทางของผู้ใช้:', phone._userNavigationIntent);

  // ทดสอบการตรวจสอบความถูกต้องของเจตนาการนำทาง
  setTimeout(() => {
    const isValid = phone.isUserNavigationIntentValid('forum');
    console.log('เจตนาการนำทางถูกต้องหรือไม่:', isValid);

    // จำลองผู้ใช้สลับไปแอปอื่น
    console.log('จำลองผู้ใช้สลับไปแอปอื่น...');
    phone.currentApp = 'messages';

    const isValidAfterSwitch = phone.isUserNavigationIntentValid('forum');
    console.log('เจตนาการนำทางหลังสลับถูกต้องหรือไม่:', isValidAfterSwitch);
  }, 1000);
}

// ทดสอบการจัดการสถานะการโหลด
function testLoadingStateManagement() {
  console.log('\n2. ทดสอบการจัดการสถานะการโหลด');

  if (!window.mobilePhone) {
    console.error('อินเทอร์เฟซมือถือยังไม่ได้เริ่มต้น');
    return;
  }

  const phone = window.mobilePhone;

  // ทดสอบแสดงสถานะการโหลด
  console.log('ทดสอบแสดงสถานะการโหลด...');
  phone.showAppLoadingState('forum', '論壇');

  // ตรวจสอบสถานะการโหลด
  console.log('แอปที่กำลังโหลด:', Array.from(phone._loadingApps));

  // ทดสอบโหลดเสร็จ
  setTimeout(() => {
    console.log('ทดสอบโหลดเสร็จ...');
    const canJump = phone.completeAppLoading('forum');
    console.log('สามารถเปลี่ยนหน้าได้หรือไม่:', canJump);
    console.log('แอปที่กำลังโหลด:', Array.from(phone._loadingApps));
  }, 2000);
}

// ทดสอบปุ่มย้อนกลับล้างเจตนาการนำทาง
function testBackButtonClearIntent() {
  console.log('\n3. ทดสอบปุ่มย้อนกลับล้างเจตนาการนำทาง');

  if (!window.mobilePhone) {
    console.error('อินเทอร์เฟซมือถือยังไม่ได้เริ่มต้น');
    return;
  }

  const phone = window.mobilePhone;

  // ตั้งค่าเจตนาการนำทาง
  phone._userNavigationIntent = {
    targetApp: 'weibo',
    timestamp: Date.now(),
    fromApp: null,
  };

  console.log('ตั้งค่าเจตนาการนำทาง:', phone._userNavigationIntent);

  // จำลองคลิกปุ่มย้อนกลับ
  console.log('จำลองคลิกปุ่มย้อนกลับ...');
  phone.handleBackButton();

  console.log('เจตนาการนำทางหลังกดย้อนกลับ:', phone._userNavigationIntent);
}

// รันการทดสอบ
function runTests() {
  console.log('เริ่มรันการทดสอบ...');

  // รอให้อินเทอร์เฟซมือถือเริ่มต้น
  if (window.mobilePhone) {
    testUserNavigationIntent();
    setTimeout(testLoadingStateManagement, 3000);
    setTimeout(testBackButtonClearIntent, 6000);
  } else {
    console.log('รอให้อินเทอร์เฟซมือถือเริ่มต้น...');
    setTimeout(runTests, 1000);
  }
}

// รันการทดสอบหลังจากหน้าเว็บโหลดเสร็จ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

console.log('โหลดสคริปต์ทดสอบแล้ว รอดำเนินการ...');
