/**
 * Mobile Upload Manager
 * @description ตัวจัดการการอัปโหลดไฟล์ SillyTavern สำหรับมือถือ
 * @author cd
 * @version 1.0.0
 */

// 获取 SillyTavern 的 getRequestHeaders 函数
function getRequestHeaders() {
  // 尝试多种方式获取认证头部
  if (typeof window !== 'undefined') {
    // 方法1：使用 SillyTavern 的 getContext
    if (window['SillyTavern'] && window['SillyTavern']['getContext']) {
      const context = window['SillyTavern']['getContext']();
      if (context && context['getRequestHeaders']) {
        return context['getRequestHeaders']();
      }
    }

    // 方法2：使用全局 getRequestHeaders 函数
    if (window['getRequestHeaders']) {
      return window['getRequestHeaders']();
    }

    // 方法3：使用 token 全局变量
    if (window['token']) {
      return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': window['token'],
      };
    }
  }

  // 回退方案：基本头部
  return {
    'Content-Type': 'application/json',
  };
}

class MobileUploadManager {
  constructor() {
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.uploadHistory = [];
    this.isUIVisible = false;
    this.initEventListeners();
    console.log('[Mobile Upload] การเริ่มต้นเสร็จสมบูรณ์');
  }

  /**
   * 初始化事件监听器
   */
  initEventListeners() {
    // 监听拖拽上传（移动端支持）
    document.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      this.handleFileDrop(e);
    });

    // 监听粘贴上传 - 已禁用
    // document.addEventListener('paste', (e) => {
    //     this.handlePasteUpload(e);
    // });
  }

  /**
   * 处理文件拖拽
   */
  async handleFileDrop(event) {
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    this.showMobileNotification(`ได้รับไฟล์ ${files.length} ไฟล์`, 'info');

    for (const file of files) {
      await this.uploadFile(file);
    }
  }

  /**
   * 处理粘贴上传 - 已禁用
   */
  async handlePasteUpload(event) {
    // 粘贴上传功能已禁用
    return;
  }

  /**
   * 将文件转换为 base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('ไม่สามารถอ่านเนื้อหาไฟล์'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 上传文件（使用 SillyTavern API）
   */
  async uploadFile(file) {
    const startTime = Date.now();

    try {
      // 验证文件大小
      if (file.size > this.maxFileSize) {
        throw new Error(`ขนาดไฟล์เกินขีดจำกัด (${this.maxFileSize / 1024 / 1024}MB)`);
      }

      this.showMobileNotification(`กำลังอัปโหลด: ${file.name}`, 'info');

      // 转换文件为 base64
      const base64Data = await this.fileToBase64(file);

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop() || 'txt';
      const uniqueFileName = `mobile_upload_${timestamp}_${randomId}.${fileExtension}`;

      // 调用 SillyTavern API
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          name: uniqueFileName,
          data: base64Data,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`การอัปโหลดล้มเหลว: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const filePath = responseData.path;

      // 记录成功的上传
      const uploadRecord = {
        originalFilename: file.name,
        filename: uniqueFileName,
        size: file.size,
        type: file.type,
        timestamp: startTime,
        path: filePath,
        success: true,
        method: 'mobile_api',
        uploadTime: Date.now() - startTime,
      };

      this.uploadHistory.push(uploadRecord);

      // 触发上传完成事件
      document.dispatchEvent(
        new CustomEvent('mobile-upload-complete', {
          detail: uploadRecord,
        }),
      );

      this.showMobileNotification(`✅ อัปโหลดสำเร็จ: ${file.name}`, 'success');
      this.updateMobileUI();

      return uploadRecord;
    } catch (error) {
      console.error(`[Mobile Upload] การอัปโหลดล้มเหลว: ${file.name}`, error);

      // 记录失败的上传
      const failRecord = {
        originalFilename: file.name,
        filename: '',
        size: file.size,
        type: file.type,
        timestamp: startTime,
        path: null,
        success: false,
        error: error.message,
        method: 'mobile_api',
        uploadTime: Date.now() - startTime,
      };

      this.uploadHistory.push(failRecord);
      this.showMobileNotification(`❌ การอัปโหลดล้มเหลว: ${file.name}`, 'error');
      throw error;
    }
  }

  /**
   * 上传文本内容
   */
  async uploadTextContent(text, filename = 'content.txt') {
    const startTime = Date.now();

    try {
      this.showMobileNotification(`กำลังอัปโหลดข้อความ: ${filename}`, 'info');

      // 将文本转换为 base64
      const base64Data = btoa(unescape(encodeURIComponent(text)));

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileExtension = filename.split('.').pop() || 'txt';
      const baseName = filename.replace(/\.[^/.]+$/, '');
      const uniqueFileName = `mobile_${baseName}_${timestamp}_${randomId}.${fileExtension}`;

      // 调用 SillyTavern API
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          name: uniqueFileName,
          data: base64Data,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`การอัปโหลดข้อความล้มเหลว: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const filePath = responseData.path;

      // 记录成功的上传
      const uploadRecord = {
        originalFilename: filename,
        filename: uniqueFileName,
        size: new Blob([text]).size,
        type: 'text/plain',
        timestamp: startTime,
        path: filePath,
        success: true,
        method: 'mobile_api',
        uploadTime: Date.now() - startTime,
        isTextContent: true,
      };

      this.uploadHistory.push(uploadRecord);

      // 触发上传完成事件
      document.dispatchEvent(
        new CustomEvent('mobile-upload-complete', {
          detail: uploadRecord,
        }),
      );

      this.showMobileNotification(`✅ อัปโหลดข้อความสำเร็จ: ${filename}`, 'success');
      this.updateMobileUI();

      return uploadRecord;
    } catch (error) {
      console.error(`[Mobile Upload] การอัปโหลดข้อความล้มเหลว: ${filename}`, error);

      // 记录失败的上传
      const failRecord = {
        originalFilename: filename,
        filename: '',
        size: new Blob([text]).size,
        type: 'text/plain',
        timestamp: startTime,
        path: null,
        success: false,
        error: error.message,
        method: 'mobile_api',
        uploadTime: Date.now() - startTime,
        isTextContent: true,
      };

      this.uploadHistory.push(failRecord);
      this.showMobileNotification(`❌ การอัปโหลดข้อความล้มเหลว: ${filename}`, 'error');
      throw error;
    }
  }

  /**
   * 读取文件内容
   */
  async readFile(filename) {
    try {
      // 查找文件记录
      const record = this.uploadHistory.find(
        h => (h.originalFilename === filename || h.filename === filename) && h.success,
      );

      if (!record) {
        throw new Error(`ไม่พบไฟล์: ${filename}`);
      }

      if (!record.path) {
        throw new Error('เส้นทางไฟล์ไม่ถูกต้อง');
      }

      this.showMobileNotification(`กำลังอ่าน: ${filename}`, 'info');

      // 使用文件路径读取内容（不使用缓存）
      const response = await fetch(record.path, {
        method: 'GET',
        headers: {
          ...getRequestHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (!response.ok) {
        throw new Error(`อ่านไฟล์ล้มเหลว: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();

      this.showMobileNotification(`✅ อ่านสำเร็จ: ${filename}`, 'success');
      return {
        content: content,
        path: record.path,
        originalFilename: record.originalFilename,
        filename: record.filename,
        size: content.length,
        type: record.type,
      };
    } catch (error) {
      console.error(`[Mobile Upload] การอ่านไฟล์ล้มเหลว: ${filename}`, error);
      this.showMobileNotification(`❌ อ่านล้มเหลว: ${filename}`, 'error');
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filename) {
    try {
      // 查找文件记录
      const recordIndex = this.uploadHistory.findIndex(
        h => (h.originalFilename === filename || h.filename === filename) && h.success,
      );

      if (recordIndex === -1) {
        throw new Error(`ไม่พบไฟล์: ${filename}`);
      }

      const record = this.uploadHistory[recordIndex];
      this.showMobileNotification(`กำลังลบ: ${filename}`, 'info');

      // 调用 SillyTavern 删除 API
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          path: record.path,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ลบไฟล์ล้มเหลว: ${response.status} ${response.statusText}`);
      }

      // 从历史记录中移除
      this.uploadHistory.splice(recordIndex, 1);

      this.showMobileNotification(`✅ ลบสำเร็จ: ${filename}`, 'success');
      this.updateMobileUI();

      return { success: true, filename: filename };
    } catch (error) {
      console.error(`[Mobile Upload] การลบไฟล์ล้มเหลว: ${filename}`, error);
      this.showMobileNotification(`❌ ลบล้มเหลว: ${filename}`, 'error');
      throw error;
    }
  }

  /**
   * 列出文件
   */
  async listFiles() {
    try {
      const files = this.uploadHistory
        .filter(h => h.success)
        .map(h => ({
          originalName: h.originalFilename,
          name: h.filename,
          size: h.size,
          type: h.type,
          created: h.timestamp,
          path: h.path,
          uploadTime: h.uploadTime,
          method: h.method,
          isTextContent: h.isTextContent || false,
        }));

      return { files: files };
    } catch (error) {
      console.error(`[Mobile Upload] การดึงรายการไฟล์ล้มเหลว`, error);
      throw error;
    }
  }

  /**
   * 显示移动端通知
   */
  showMobileNotification(message, type = 'info') {
    // 如果存在手机界面，在手机屏幕上显示通知
    const phoneScreen = document.querySelector('.phone-screen');
    if (phoneScreen) {
      this.showPhoneNotification(message, type);
    } else {
      // 回退到普通通知
      this.showRegularNotification(message, type);
    }
  }

  /**
   * 在手机屏幕上显示通知
   */
  showPhoneNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `mobile-upload-notification ${type}`;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 80%;
            text-align: center;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒后自动消失
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * 显示普通通知
   */
  showRegularNotification(message, type = 'info') {
    console.log(`[Mobile Upload] ${message}`);

    // 尝试使用toastr（如果可用）
    if (typeof toastr !== 'undefined') {
      toastr[type](message);
    }
  }

  /**
   * 创建移动端上传UI
   */
  createMobileUploadUI() {
    const uploadUI = document.createElement('div');
    uploadUI.id = 'mobile-upload-ui';
    uploadUI.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            z-index: 9999;
            border-radius: 20px 20px 0 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
            max-height: 70vh;
            overflow-y: auto;
        `;

    uploadUI.innerHTML = `
            <div class="mobile-upload-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 18px;">📁 อัปโหลดไฟล์</h3>
                <button id="mobile-upload-close" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
            </div>

            <div class="mobile-upload-controls" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="mobile-upload-file" class="mobile-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📂 เลือกไฟล์
                </button>
                <button id="mobile-upload-text" class="mobile-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📝 อัปโหลดข้อความ
                </button>
                <button id="mobile-upload-list" class="mobile-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📋 รายการไฟล์
                </button>
                <button id="mobile-upload-stats" class="mobile-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📊 สถิติ
                </button>
            </div>

            <div id="mobile-upload-content" style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; max-height: 200px; overflow-y: auto;">
                <p style="text-align: center; margin: 20px 0; color: rgba(255,255,255,0.8);">เลือกวิธีอัปโหลดเพื่อเริ่มใช้งาน</p>
            </div>

            <input type="file" id="mobile-file-input" multiple style="display: none;">
        `;

    document.body.appendChild(uploadUI);
    this.bindMobileEvents();

    return uploadUI;
  }

  /**
   * 绑定移动端事件
   */
  bindMobileEvents() {
    // 关闭按钮
    document.getElementById('mobile-upload-close').addEventListener('click', () => {
      this.hideMobileUploadUI();
    });

    // 选择文件按钮
    document.getElementById('mobile-upload-file').addEventListener('click', () => {
      document.getElementById('mobile-file-input').click();
    });

    // 文件输入变化
    document.getElementById('mobile-file-input').addEventListener('change', async e => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        for (const file of files) {
          await this.uploadFile(file);
        }
        e.target.value = ''; // 清空输入
      }
    });

    // 上传文本按钮
    document.getElementById('mobile-upload-text').addEventListener('click', () => {
      this.showTextUploadDialog();
    });

    // 文件列表按钮
    document.getElementById('mobile-upload-list').addEventListener('click', () => {
      this.showFileList();
    });

    // 统计信息按钮
    document.getElementById('mobile-upload-stats').addEventListener('click', () => {
      this.showStats();
    });
  }

  /**
   * 显示移动端上传UI
   */
  showMobileUploadUI() {
    let uploadUI = document.getElementById('mobile-upload-ui');
    if (!uploadUI) {
      uploadUI = this.createMobileUploadUI();
    }

    uploadUI.style.transform = 'translateY(0)';
    this.isUIVisible = true;
  }

  /**
   * 隐藏移动端上传UI
   */
  hideMobileUploadUI() {
    const uploadUI = document.getElementById('mobile-upload-ui');
    if (uploadUI) {
      uploadUI.style.transform = 'translateY(100%)';
    }
    this.isUIVisible = false;
  }

  /**
   * 切换移动端上传UI
   */
  toggleMobileUploadUI() {
    if (this.isUIVisible) {
      this.hideMobileUploadUI();
    } else {
      this.showMobileUploadUI();
    }
  }

  /**
   * 显示文本上传对话框
   */
  showTextUploadDialog() {
    const content = document.getElementById('mobile-upload-content');
    content.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">เนื้อหาข้อความ:</label>
                <textarea id="mobile-text-content" style="width: 100%; height: 80px; padding: 8px; border: none; border-radius: 4px; resize: vertical; color: #333;" placeholder="ป้อนเนื้อหาข้อความที่จะอัปโหลด..."></textarea>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">ชื่อไฟล์:</label>
                <input type="text" id="mobile-text-filename" style="width: 100%; padding: 8px; border: none; border-radius: 4px; color: #333;" placeholder="ตัวอย่าง: document.txt" value="mobile-text-${Date.now()}.txt">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="mobile-do-text-upload" style="flex: 1; background: #4CAF50; border: none; color: white; padding: 10px; border-radius: 4px; cursor: pointer;">
                    อัปโหลดข้อความ
                </button>
                <button id="mobile-cancel-text-upload" style="flex: 1; background: #f44336; border: none; color: white; padding: 10px; border-radius: 4px; cursor: pointer;">
                    ยกเลิก
                </button>
            </div>
        `;

    // 绑定事件
    document.getElementById('mobile-do-text-upload').addEventListener('click', async () => {
      const textContent = document.getElementById('mobile-text-content').value;
      const filename = document.getElementById('mobile-text-filename').value;

      if (!textContent.trim()) {
        this.showMobileNotification('กรุณาป้อนเนื้อหาข้อความ', 'error');
        return;
      }

      if (!filename.trim()) {
        this.showMobileNotification('กรุณาป้อนชื่อไฟล์', 'error');
        return;
      }

      try {
        await this.uploadTextContent(textContent, filename);
        this.showFileList(); // 上传成功后显示文件列表
      } catch (error) {
        // 错误已在 uploadTextContent 中处理
      }
    });

    document.getElementById('mobile-cancel-text-upload').addEventListener('click', () => {
      this.updateMobileUI();
    });
  }

  /**
   * 显示文件列表
   */
  async showFileList() {
    try {
      const result = await this.listFiles();
      const files = result.files;

      const content = document.getElementById('mobile-upload-content');

      if (files.length === 0) {
        content.innerHTML =
          '<p style="text-align: center; margin: 20px 0; color: rgba(255,255,255,0.8);">ไม่มีไฟล์ที่อัปโหลด</p>';
        return;
      }

      let html = '<div style="font-size: 14px;">';
      files.forEach((file, index) => {
        const size = (file.size / 1024).toFixed(1);
        const time = new Date(file.created).toLocaleString();

        html += `
                    <div style="background: rgba(255,255,255,0.1); margin: 5px 0; padding: 10px; border-radius: 4px;">
                        <div style="font-weight: bold; margin-bottom: 5px; word-break: break-all;">${file.originalName}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
                            ขนาด: ${size} KB | เวลา: ${time}
                        </div>
                        <div style="margin-top: 8px; display: flex; gap: 5px;">
                            <button onclick="window.mobileUploadManager.readFile('${file.originalName}')" style="background: #2196F3; border: none; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                อ่าน
                            </button>
                            <button onclick="if(confirm('ยืนยันที่จะลบไฟล์ ${file.originalName}?')) window.mobileUploadManager.deleteFile('${file.originalName}')" style="background: #f44336; border: none; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                ลบ
                            </button>
                        </div>
                    </div>
                `;
      });
      html += '</div>';

      content.innerHTML = html;
    } catch (error) {
      this.showMobileNotification('การดึงรายการไฟล์ล้มเหลว', 'error');
    }
  }

  /**
   * 显示统计信息
   */
  showStats() {
    const stats = this.getStats();

    const content = document.getElementById('mobile-upload-content');
    content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${stats.total}</div>
                    <div style="font-size: 12px;">จำนวนการอัปโหลดทั้งหมด</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${stats.successful}</div>
                    <div style="font-size: 12px;">อัปโหลดสำเร็จ</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${stats.failed}</div>
                    <div style="font-size: 12px;">อัปโหลดล้มเหลว</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${stats.successRate}</div>
                    <div style="font-size: 12px;">อัตราความสำเร็จ</div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center; grid-column: 1 / -1;">
                    <div style="font-size: 16px; font-weight: bold;">${stats.totalSizeFormatted}</div>
                    <div style="font-size: 12px;">ขนาดไฟล์รวม</div>
                </div>
            </div>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="window.mobileUploadManager.clearHistory()" style="background: #f44336; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    ล้างประวัติ
                </button>
            </div>
        `;
  }

  /**
   * 更新移动端UI
   */
  updateMobileUI() {
    if (this.isUIVisible) {
      this.showFileList(); // 默认显示文件列表
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.uploadHistory.length;
    const successful = this.uploadHistory.filter(h => h.success).length;
    const failed = total - successful;
    const totalSize = this.uploadHistory.filter(h => h.success).reduce((sum, h) => sum + (h.size || 0), 0);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) + '%' : '0%',
      totalSize,
      totalSizeFormatted: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
    };
  }

  /**
   * 获取上传历史
   */
  getHistory() {
    return this.uploadHistory;
  }

  /**
   * 清除上传历史
   */
  clearHistory() {
    this.uploadHistory = [];
    this.updateMobileUI();
    this.showMobileNotification('ล้างประวัติการอัปโหลดแล้ว', 'info');
  }
}

// 创建全局实例
window.mobileUploadManager = new MobileUploadManager();

console.log('[Mobile Upload] ✅ ตัวจัดการการอัปโหลดบนมือถือเริ่มต้นแล้ว');
console.log('API มือถือที่ใช้ได้:');
console.log('  window.mobileUploadManager.showMobileUploadUI() - แสดงหน้าจออัปโหลด');
console.log('  window.mobileUploadManager.uploadFile(file) - อัปโหลดไฟล์');
console.log('  window.mobileUploadManager.uploadTextContent(text, filename) - อัปโหลดข้อความ');
console.log('  window.mobileUploadManager.readFile(filename) - อ่านไฟล์');
console.log('  window.mobileUploadManager.deleteFile(filename) - ลบไฟล์');
console.log('  window.mobileUploadManager.listFiles() - แสดงรายการไฟล์');
