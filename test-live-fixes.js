/**
 * สคริปต์ทดสอบผลการแก้ไขแอปไลฟ์
 * ใช้สำหรับตรวจสอบการแก้ไขปัญหาการแปลงแบบ batch และการเปลี่ยนหน้า container
 */

// ทดสอบฟังก์ชันการแปลงแบบ batch (live-app)
function testLiveAppBatchConversion() {
  console.log('🧪 ทดสอบฟังก์ชันการแปลงแบบ batch ของ live-app...');

  if (!window.liveApp) {
    console.error('❌ ไม่มี instance ของ liveApp');
    return;
  }

  // จำลองข้อความหลายรายการที่มีรูปแบบไลฟ์
  const testMessages = [
    {
      mes: '这是第一条消息 [直播|用户1|弹幕|你好主播！] [直播|本场人数|1234]',
    },
    {
      mes: '这是第二条消息 [直播|用户2|礼物|玫瑰花*5] [直播|推荐互动|感谢礼物]',
    },
    {
      mes: '这是第三条消息 [直播|用户3|弹幕|今天天气真好] [直播|直播内容|主播正在聊天]',
    },
  ];

  // จำลอง getChatData ให้ส่งคืนข้อมูลทดสอบ
  const originalGetChatData = window.liveApp.getChatData;
  window.liveApp.getChatData = function () {
    return testMessages;
  };

  // จำลองเมธอด updateMessageContent และ saveChatData
  let updateCount = 0;
  let saveCount = 0;

  window.liveApp.updateMessageContent = async function (index, content) {
    updateCount++;
    console.log(`📝 [live-app] อัปเดตข้อความ ${index}: ${content.substring(0, 50)}...`);
    return true;
  };

  window.liveApp.saveChatData = async function () {
    saveCount++;
    console.log(`💾 [live-app] บันทึกข้อมูลแชท (ครั้งที่ ${saveCount})`);
    return true;
  };

  // ดำเนินการแปลง
  window.liveApp
    .convertLiveToHistory()
    .then(() => {
      console.log(`✅ ทดสอบการแปลงแบบ batch ของ live-app สำเร็จ:`);
      console.log(`   - จำนวนครั้งที่อัปเดตข้อความ: ${updateCount}`);
      console.log(`   - จำนวนครั้งที่บันทึกข้อมูล: ${saveCount}`);
      console.log(`   - ผลลัพธ์ที่คาดหวัง: จำนวนครั้งที่บันทึกควรเป็น 1 (บันทึกแบบ batch)`);

      // คืนค่าเมธอดเดิม
      window.liveApp.getChatData = originalGetChatData;
    })
    .catch(error => {
      console.error('❌ ทดสอบการแปลงแบบ batch ของ live-app ล้มเหลว:', error);
    });
}

// ทดสอบฟังก์ชันการแปลงแบบ batch (watch-live-app)
function testWatchLiveAppBatchConversion() {
  console.log('🧪 ทดสอบฟังก์ชันการแปลงแบบ batch ของ watch-live-app...');

  if (!window.watchLiveApp) {
    console.error('❌ ไม่มี instance ของ watchLiveApp');
    return;
  }

  // จำลองข้อความหลายรายการที่มีรูปแบบไลฟ์
  const testMessages = [
    {
      mes: '这是第一条消息 [直播|用户1|弹幕|你好主播！] [直播|本场人数|1234]',
    },
    {
      mes: '这是第二条消息 [直播|用户2|礼物|玫瑰花*5] [直播|推荐互动|感谢礼物]',
    },
    {
      mes: '这是第三条消息 [直播|用户3|弹幕|今天天气真好] [直播|直播内容|主播正在聊天]',
    },
  ];

  // จำลอง getChatData ให้ส่งคืนข้อมูลทดสอบ
  const originalGetChatData = window.watchLiveApp.getChatData;
  window.watchLiveApp.getChatData = function () {
    return testMessages;
  };

  // จำลองเมธอด updateMessageContent และ saveChatData
  let updateCount = 0;
  let saveCount = 0;

  window.watchLiveApp.updateMessageContent = async function (index, content) {
    updateCount++;
    console.log(`📝 [watch-live-app] อัปเดตข้อความ ${index}: ${content.substring(0, 50)}...`);
    return true;
  };

  window.watchLiveApp.saveChatData = async function () {
    saveCount++;
    console.log(`💾 [watch-live-app] บันทึกข้อมูลแชท (ครั้งที่ ${saveCount})`);
    return true;
  };

  // ดำเนินการแปลง
  window.watchLiveApp
    .convertLiveToHistory()
    .then(() => {
      console.log(`✅ ทดสอบการแปลงแบบ batch ของ watch-live-app สำเร็จ:`);
      console.log(`   - จำนวนครั้งที่อัปเดตข้อความ: ${updateCount}`);
      console.log(`   - จำนวนครั้งที่บันทึกข้อมูล: ${saveCount}`);
      console.log(`   - ผลลัพธ์ที่คาดหวัง: จำนวนครั้งที่บันทึกควรเป็น 1 (บันทึกแบบ batch)`);

      // คืนค่าเมธอดเดิม
      window.watchLiveApp.getChatData = originalGetChatData;
    })
    .catch(error => {
      console.error('❌ ทดสอบการแปลงแบบ batch ของ watch-live-app ล้มเหลว:', error);
    });
}

// ทดสอบการรีเซ็ตสถานะของแอปดูไลฟ์
function testWatchLiveStateReset() {
  console.log('🧪 ทดสอบการรีเซ็ตสถานะแอปดูไลฟ์...');

  if (!window.watchLiveApp) {
    console.error('❌ ไม่มี instance ของ watchLiveApp');
    return;
  }

  // บันทึกสถานะเริ่มต้น
  const initialState = {
    currentView: window.watchLiveApp.currentView,
    isInitialized: window.watchLiveApp.isInitialized,
    isLiveActive: window.watchLiveApp.isLiveActive,
  };

  console.log('📊 สถานะเริ่มต้น:', initialState);

  // จำลองเข้าสู่สถานะไลฟ์
  window.watchLiveApp.currentView = 'live';
  window.watchLiveApp.isInitialized = true;
  window.watchLiveApp.stateManager.startLive();

  console.log('📊 จำลองสถานะไลฟ์:', {
    currentView: window.watchLiveApp.currentView,
    isInitialized: window.watchLiveApp.isInitialized,
    isLiveActive: window.watchLiveApp.isLiveActive,
  });

  // ดำเนินการจบไลฟ์
  window.watchLiveApp
    .endLive()
    .then(() => {
      console.log('📊 สถานะหลังจบไลฟ์:', {
        currentView: window.watchLiveApp.currentView,
        isInitialized: window.watchLiveApp.isInitialized,
        isLiveActive: window.watchLiveApp.isLiveActive,
      });

      // ตรวจสอบว่าสถานะถูกรีเซ็ตอย่างถูกต้องหรือไม่
      const isCorrectlyReset =
        window.watchLiveApp.currentView === 'start' &&
        window.watchLiveApp.isInitialized === false &&
        window.watchLiveApp.isLiveActive === false;

      if (isCorrectlyReset) {
        console.log('✅ ทดสอบการรีเซ็ตสถานะผ่าน');
      } else {
        console.log('❌ ทดสอบการรีเซ็ตสถานะไม่ผ่าน');
      }
    })
    .catch(error => {
      console.error('❌ ทดสอบการรีเซ็ตสถานะล้มเหลว:', error);
    });
}

// ทดสอบการตั้งค่าปุ่มส่วนหัว
function testHeaderButtons() {
  console.log('🧪 ทดสอบการตั้งค่าปุ่มส่วนหัว...');

  if (!window.mobilePhone) {
    console.error('❌ ไม่มี instance ของ mobilePhone');
    return;
  }

  // ทดสอบปุ่มส่วนหัวของแอป watch-live
  const watchLiveState = {
    app: 'watch-live',
    title: 'กำลังดูไลฟ์',
    view: 'live',
    viewerCount: '1.2K',
  };

  console.log('📱 ตั้งค่าปุ่มส่วนหัว watch-live...');
  window.mobilePhone.updateAppHeader(watchLiveState);

  // ตรวจสอบว่ามีปุ่มออกหรือไม่
  const exitBtn = document.querySelector('.end-stream-btn');
  if (exitBtn) {
    console.log('✅ พบปุ่มออกจากห้องไลฟ์');
    console.log('🔍 ชื่อปุ่ม:', exitBtn.title);
    console.log('🔍 เนื้อหาปุ่ม:', exitBtn.innerHTML);
  } else {
    console.log('❌ ไม่พบปุ่มออกจากห้องไลฟ์');
  }

  // ตรวจสอบการแสดงจำนวนผู้ชม
  const viewerCount = document.querySelector('.viewer-count-num');
  if (viewerCount) {
    console.log('✅ พบการแสดงจำนวนผู้ชม:', viewerCount.textContent);
  } else {
    console.log('❌ ไม่พบการแสดงจำนวนผู้ชม');
  }
}

// รันการทดสอบทั้งหมด
function runAllTests() {
  console.log('🚀 เริ่มรันการทดสอบการแก้ไขแอปไลฟ์...');
  console.log('='.repeat(50));

  setTimeout(() => {
    testLiveAppBatchConversion();
  }, 1000);

  setTimeout(() => {
    testWatchLiveAppBatchConversion();
  }, 2000);

  setTimeout(() => {
    testWatchLiveStateReset();
  }, 3000);

  setTimeout(() => {
    testHeaderButtons();
  }, 4000);

  setTimeout(() => {
    console.log('='.repeat(50));
    console.log('🏁 การทดสอบทั้งหมดเสร็จสิ้น');
  }, 5000);
}

// ส่งออกฟังก์ชันทดสอบ
window.testLiveFixes = {
  testLiveAppBatchConversion,
  testWatchLiveAppBatchConversion,
  testWatchLiveStateReset,
  testHeaderButtons,
  runAllTests,
};

console.log('📋 โหลดสคริปต์ทดสอบการแก้ไขแอปไลฟ์แล้ว');
console.log('💡 ใช้ window.testLiveFixes.runAllTests() เพื่อรันการทดสอบทั้งหมด');
