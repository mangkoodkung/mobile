/**
 * ทดสอบผลการแก้ไขการแปลงแบบ batch อย่างรวดเร็ว
 * รันสคริปต์นี้ในคอนโซลเบราว์เซอร์เพื่อตรวจสอบการแก้ไข
 */

console.log('🧪 เริ่มทดสอบการแก้ไขการแปลงแบบ batch อย่างรวดเร็ว...');

// ฟังก์ชันทดสอบ
function testBatchConversionFix() {
  // ตรวจสอบว่าแอปมีอยู่หรือไม่
  if (!window.liveApp && !window.watchLiveApp) {
    console.error('❌ ไม่พบ instance ของแอปไลฟ์');
    return;
  }

  // ข้อมูลทดสอบจำลอง
  const testMessages = [
    { mes: '測試消息1 [直播|用户1|弹幕|你好] [直播|本场人数|100]' },
    { mes: '測試消息2 [直播|用户2|礼物|玫瑰*5] [直播|推荐互动|感谢]' },
    { mes: '測試消息3 [直播|用户3|弹幕|再见] [直播|直播内容|结束了]' },
  ];

  // ตัวนับ
  let saveCallCount = 0;
  let updateCallCount = 0;

  // ฟังก์ชันบันทึกจำลอง นับจำนวนการเรียกใช้
  const mockSaveFunction = () => {
    saveCallCount++;
    console.log(`💾 เรียกใช้การบันทึกจำลอง (ครั้งที่ ${saveCallCount})`);
    return Promise.resolve();
  };

  // สำรองฟังก์ชันเดิม
  const originalSaveChatConditional = window.saveChatConditional;
  const originalSaveChatDebounced = window.saveChatDebounced;

  // แทนที่ด้วยฟังก์ชันนับ
  window.saveChatConditional = mockSaveFunction;
  window.saveChatDebounced = mockSaveFunction;

  // ทดสอบ live-app
  if (window.liveApp) {
    console.log('📱 ทดสอบการแปลงแบบ batch ของ live-app...');

    // สำรองเมธอดเดิม
    const originalGetChatData = window.liveApp.getChatData;
    const originalUpdateMessageContent = window.liveApp.updateMessageContent;

    // จำลองข้อมูลและเมธอด
    window.liveApp.getChatData = () => testMessages;
    window.liveApp.updateMessageContent = async (index, content, skipAutoSave) => {
      updateCallCount++;
      console.log(`📝 [live-app] อัปเดตข้อความ ${index} (skipAutoSave: ${skipAutoSave})`);
      return true;
    };

    // ดำเนินการแปลง
    window.liveApp.convertLiveToHistory().then(() => {
      console.log('✅ ทดสอบ live-app สำเร็จ');
      console.log(`   - จำนวนครั้งที่เรียกอัปเดตข้อความ: ${updateCallCount}`);
      console.log(`   - จำนวนครั้งที่เรียกบันทึก: ${saveCallCount}`);

      // คืนค่าเมธอดเดิม
      window.liveApp.getChatData = originalGetChatData;
      window.liveApp.updateMessageContent = originalUpdateMessageContent;

      // รีเซ็ตตัวนับ
      updateCallCount = 0;
      saveCallCount = 0;

      // ทดสอบ watch-live-app
      if (window.watchLiveApp) {
        console.log('📱 ทดสอบการแปลงแบบ batch ของ watch-live-app...');

        // สำรองเมธอดเดิม
        const originalGetChatDataWatch = window.watchLiveApp.getChatData;
        const originalUpdateMessageContentWatch = window.watchLiveApp.updateMessageContent;

        // จำลองข้อมูลและเมธอด
        window.watchLiveApp.getChatData = () => testMessages;
        window.watchLiveApp.updateMessageContent = async (index, content, skipAutoSave) => {
          updateCallCount++;
          console.log(`📝 [watch-live-app] อัปเดตข้อความ ${index} (skipAutoSave: ${skipAutoSave})`);
          return true;
        };

        // ดำเนินการแปลง
        window.watchLiveApp.convertLiveToHistory().then(() => {
          console.log('✅ ทดสอบ watch-live-app สำเร็จ');
          console.log(`   - จำนวนครั้งที่เรียกอัปเดตข้อความ: ${updateCallCount}`);
          console.log(`   - จำนวนครั้งที่เรียกบันทึก: ${saveCallCount}`);

          // คืนค่าเมธอดเดิม
          window.watchLiveApp.getChatData = originalGetChatDataWatch;
          window.watchLiveApp.updateMessageContent = originalUpdateMessageContentWatch;

          // คืนค่าฟังก์ชันบันทึกเดิม
          window.saveChatConditional = originalSaveChatConditional;
          window.saveChatDebounced = originalSaveChatDebounced;

          console.log('🎉 ทดสอบทั้งหมดสำเร็จ!');
          console.log('📊 ผลลัพธ์ที่คาดหวัง: จำนวนครั้งที่เรียกบันทึกของแต่ละแอปควรเป็น 1');
        });
      } else {
        // คืนค่าฟังก์ชันบันทึกเดิม
        window.saveChatConditional = originalSaveChatConditional;
        window.saveChatDebounced = originalSaveChatDebounced;
        console.log('⚠️ ไม่มี watch-live-app ข้ามการทดสอบ');
      }
    });
  } else if (window.watchLiveApp) {
    // ทดสอบเฉพาะ watch-live-app
    console.log('📱 ทดสอบเฉพาะการแปลงแบบ batch ของ watch-live-app...');

    // สำรองเมธอดเดิม
    const originalGetChatDataWatch = window.watchLiveApp.getChatData;
    const originalUpdateMessageContentWatch = window.watchLiveApp.updateMessageContent;

    // จำลองข้อมูลและเมธอด
    window.watchLiveApp.getChatData = () => testMessages;
    window.watchLiveApp.updateMessageContent = async (index, content, skipAutoSave) => {
      updateCallCount++;
      console.log(`📝 [watch-live-app] อัปเดตข้อความ ${index} (skipAutoSave: ${skipAutoSave})`);
      return true;
    };

    // ดำเนินการแปลง
    window.watchLiveApp.convertLiveToHistory().then(() => {
      console.log('✅ ทดสอบ watch-live-app สำเร็จ');
      console.log(`   - จำนวนครั้งที่เรียกอัปเดตข้อความ: ${updateCallCount}`);
      console.log(`   - จำนวนครั้งที่เรียกบันทึก: ${saveCallCount}`);

      // คืนค่าเมธอดเดิม
      window.watchLiveApp.getChatData = originalGetChatDataWatch;
      window.watchLiveApp.updateMessageContent = originalUpdateMessageContentWatch;

      // คืนค่าฟังก์ชันบันทึกเดิม
      window.saveChatConditional = originalSaveChatConditional;
      window.saveChatDebounced = originalSaveChatDebounced;

      console.log('🎉 ทดสอบสำเร็จ!');
      console.log('📊 ผลลัพธ์ที่คาดหวัง: จำนวนครั้งที่เรียกบันทึกควรเป็น 1');
    });
  }
}

// ส่งออกฟังก์ชันทดสอบ
window.testBatchConversionFix = testBatchConversionFix;

console.log('💡 ใช้ window.testBatchConversionFix() เพื่อรันการทดสอบ');
console.log('📋 หรือรันการทดสอบโดยตรง:');

// รันการทดสอบอัตโนมัติ
setTimeout(() => {
  testBatchConversionFix();
}, 1000);
