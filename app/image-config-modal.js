/**
 * Image Config Modal - กล่องโต้ตอบตั้งค่ารูปภาพ
 * ใช้สำหรับตั้งค่าอวตารผู้ใช้และพื้นหลังข้อความ
 */

// ป้องกันการประกาศซ้ำ
if (typeof window.ImageConfigModal === 'undefined') {
  class ImageConfigModal {
    constructor() {
      this.isVisible = false;
      this.currentTab = 'avatar'; // 'avatar' หรือ 'background'
      this.modalElement = null;
      this.currentConfig = {
        avatar: {
          image: '',
          position: { x: 50, y: 50 }, // ตำแหน่งเป็นเปอร์เซ็นต์
          rotation: 0,
          scale: 1,
        },
        background: {
          image: '',
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: 1,
        },
      };

      this.isDragging = false;
      this.dragStartPos = { x: 0, y: 0 };
      this.dragStartImagePos = { x: 0, y: 0 };

      console.log('[Image Config Modal] เริ่มต้นกล่องโต้ตอบตั้งค่ารูปภาพเสร็จสมบูรณ์');
    }

    // แสดงกล่องโต้ตอบ
    show() {
      console.log('[Image Config Modal] แสดงกล่องโต้ตอบ');

      // โหลดการตั้งค่าปัจจุบัน
      this.loadCurrentConfig();

      // สร้าง HTML กล่องโต้ตอบ
      this.createModal();

      // ผูกอีเวนต์
      this.bindEvents();

      // แสดงกล่องโต้ตอบ
      this.isVisible = true;
      this.modalElement.style.display = 'flex';

      // เพิ่มแอนิเมชันแสดง
      setTimeout(() => {
        this.modalElement.classList.add('show');
      }, 10);

      // อัปเดตตัวอย่าง
      this.updatePreview();
    }

    // ซ่อนกล่องโต้ตอบ
    hide() {
      console.log('[Image Config Modal] ซ่อนกล่องโต้ตอบ');

      if (!this.modalElement) return;

      // ล้างตัวรับฟังอีเวนต์การลาก
      this.cleanupDragEvents();

      // เพิ่มแอนิเมชันซ่อน
      this.modalElement.classList.remove('show');

      setTimeout(() => {
        if (this.modalElement && this.modalElement.parentNode) {
          this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = null;
        this.isVisible = false;
      }, 300);
    }

    // สร้าง HTML กล่องโต้ตอบ
    createModal() {
      // ลบกล่องโต้ตอบที่มีอยู่ออก
      const existingModal = document.querySelector('.image-config-modal');
      if (existingModal) {
        existingModal.remove();
      }

      // สร้างเอเลเมนต์กล่องโต้ตอบ
      this.modalElement = document.createElement('div');
      this.modalElement.className = 'image-config-modal';
      this.modalElement.innerHTML = this.getModalHTML();

      // เพิ่มลงในคอนเทนเนอร์โทรศัพท์ ตรวจสอบให้มีตำแหน่งสัมพัทธ์
      const phoneContainer =
        document.querySelector('#mobile-phone-container .mobile-phone-frame') ||
        document.querySelector('.mobile-phone-frame') ||
        document.querySelector('#mobile-phone-container') ||
        document.querySelector('.mobile-phone-container');

      if (phoneContainer) {
        // ตรวจสอบให้คอนเทนเนอร์โทรศัพท์มีตำแหน่งสัมพัทธ์
        const computedStyle = getComputedStyle(phoneContainer);
        if (computedStyle.position === 'static') {
          phoneContainer.style.position = 'relative';
        }
        phoneContainer.appendChild(this.modalElement);
        console.log(
          '[Image Config Modal] เพิ่มกล่องโต้ตอบในคอนเทนเนอร์โทรศัพท์แล้ว:',
          phoneContainer.className || phoneContainer.id,
        );
      } else {
        // หากไม่พบคอนเทนเนอร์โทรศัพท์ ให้เพิ่มที่ body แต่ใช้ตำแหน่งแบบ fixed
        console.warn('[Image Config Modal] ไม่พบคอนเทนเนอร์โทรศัพท์ ใช้การจัดวางที่ body');
        this.modalElement.style.position = 'fixed';
        document.body.appendChild(this.modalElement);
      }
    }

    // ดึงเทมเพลต HTML ของกล่องโต้ตอบ
    getModalHTML() {
      return `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">ตั้งค่ารูปภาพ</h3>
            <button class="modal-close-btn" type="button">✕</button>
          </div>
          
          <div class="modal-tabs">
            <button class="tab-btn ${this.currentTab === 'avatar' ? 'active' : ''}" data-tab="avatar">
              อวาตาร์ผู้ใช้
            </button>
            <button class="tab-btn ${this.currentTab === 'background' ? 'active' : ''}" data-tab="background">
              พื้นหลังหน้าข้อความ
            </button>
          </div>
          
          <div class="modal-body">
            <div class="tab-content" data-tab="avatar" style="display: ${
              this.currentTab === 'avatar' ? 'block' : 'none'
            }">
              ${this.getAvatarTabHTML()}
            </div>
            <div class="tab-content" data-tab="background" style="display: ${
              this.currentTab === 'background' ? 'block' : 'none'
            }">
              ${this.getBackgroundTabHTML()}
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="save-btn" type="button">บันทึกการตั้งค่า</button>
          </div>
        </div>
      `;
    }

    // ดึง HTML แท็บอวตาร
    getAvatarTabHTML() {
      return `
        <div class="config-section">
          <div class="upload-section">
            <div class="upload-controls">
              <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">
              <button class="upload-btn" data-target="avatar-file-input">เลือกรูปภาพ</button>
              <input type="url" class="url-input" placeholder="หรือใส่ลิงก์รูปภาพ..." data-type="avatar">
            </div>
          </div>
          
          <div class="preview-section">
            <div class="preview-container avatar-preview">
              <div class="preview-image" id="avatar-preview"></div>
              <div class="drag-hint">ลากเพื่อปรับตำแหน่ง</div>
            </div>
          </div>
          
          <div class="controls-section">
            <div class="control-row">
              <label>หมุน:</label>
              <input type="range" class="control-slider" min="0" max="360" step="1" value="0" data-type="avatar" data-property="rotation">
              <span class="control-value">0°</span>
            </div>
            <div class="control-row">
              <label>ซูม:</label>
              <input type="range" class="control-slider" min="0.5" max="2" step="0.1" value="1" data-type="avatar" data-property="scale">
              <span class="control-value">1.0x</span>
            </div>
          </div>
        </div>
      `;
    }

    // ดึง HTML แท็บพื้นหลัง
    getBackgroundTabHTML() {
      return `
        <div class="config-section">
          <div class="upload-section">
            <div class="upload-controls">
              <input type="file" id="background-file-input" accept="image/*" style="display: none;">
              <button class="upload-btn" data-target="background-file-input">เลือกรูปภาพ</button>
              <input type="url" class="url-input" placeholder="หรือใส่ลิงก์รูปภาพ..." data-type="background">
            </div>
          </div>
          
          <div class="preview-section">
            <div class="preview-container background-preview">
              <div class="preview-image" id="background-preview"></div>
              <div class="drag-hint">ลากเพื่อปรับตำแหน่ง</div>
            </div>
          </div>
          
          <div class="controls-section">
            <div class="control-row">
              <label>หมุน:</label>
              <input type="range" class="control-slider" min="0" max="360" step="1" value="0" data-type="background" data-property="rotation">
              <span class="control-value">0°</span>
            </div>
            <div class="control-row">
              <label>ซูม:</label>
              <input type="range" class="control-slider" min="0.5" max="2" step="0.1" value="1" data-type="background" data-property="scale">
              <span class="control-value">1.0x</span>
            </div>
          </div>
        </div>
      `;
    }

    // โหลดการตั้งค่าปัจจุบัน
    loadCurrentConfig() {
      if (window.styleConfigManager && window.styleConfigManager.isReady) {
        const config = window.styleConfigManager.getConfig();

        // โหลดการตั้งค่าอวตารผู้ใช้
        if (config.messageSentAvatar) {
          this.currentConfig.avatar = {
            image: config.messageSentAvatar.backgroundImage || config.messageSentAvatar.backgroundImageUrl || '',
            position: this.parseBackgroundPosition(config.messageSentAvatar.backgroundPosition || 'center center'),
            rotation: parseFloat(config.messageSentAvatar.rotation || 0),
            scale: parseFloat(config.messageSentAvatar.scale || 1),
          };
        }

        // โหลดการตั้งค่าพื้นหลังข้อความ
        if (config.messagesApp) {
          this.currentConfig.background = {
            image: config.messagesApp.backgroundImage || config.messagesApp.backgroundImageUrl || '',
            position: this.parseBackgroundPosition(config.messagesApp.backgroundPosition || 'center center'),
            rotation: parseFloat(config.messagesApp.rotation || 0),
            scale: parseFloat(config.messagesApp.scale || 1),
          };
        }

        console.log('[Image Config Modal] โหลดการตั้งค่าปัจจุบันแล้ว:', this.currentConfig);
      }
    }

    // แปลง CSS background-position เป็นพิกัด
    parseBackgroundPosition(positionStr) {
      const parts = positionStr.split(' ');
      let x = 50,
        y = 50;

      if (parts.length >= 2) {
        // จัดการค่าเปอร์เซ็นต์
        if (parts[0].includes('%')) {
          x = parseFloat(parts[0]);
        } else if (parts[0] === 'left') {
          x = 0;
        } else if (parts[0] === 'right') {
          x = 100;
        } else if (parts[0] === 'center') {
          x = 50;
        }

        if (parts[1].includes('%')) {
          y = parseFloat(parts[1]);
        } else if (parts[1] === 'top') {
          y = 0;
        } else if (parts[1] === 'bottom') {
          y = 100;
        } else if (parts[1] === 'center') {
          y = 50;
        }
      }

      return { x, y };
    }

    // แปลงพิกัดเป็น CSS background-position
    formatBackgroundPosition(position) {
      return `${position.x}% ${position.y}%`;
    }

    // สลับแท็บ
    switchTab(tabName) {
      console.log(`[Image Config Modal] สลับไปยังแท็บ: ${tabName}`);

      this.currentTab = tabName;

      // อัปเดตสถานะปุ่มแท็บ
      const tabBtns = this.modalElement.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });

      // อัปเดตการแสดงเนื้อหาแท็บ
      const tabContents = this.modalElement.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.style.display = content.dataset.tab === tabName ? 'block' : 'none';
      });

      // อัปเดตตัวอย่าง
      this.updatePreview();
    }

    // อัปเดตตัวอย่าง
    updatePreview() {
      const config = this.currentConfig[this.currentTab];
      const previewElement = this.modalElement.querySelector(`#${this.currentTab}-preview`);

      if (!previewElement || !config.image) return;

      const backgroundPosition = this.formatBackgroundPosition(config.position);

      previewElement.style.backgroundImage = `url(${config.image})`;
      previewElement.style.backgroundPosition = backgroundPosition;
      previewElement.style.backgroundRepeat = 'no-repeat';

      // สอดคล้องกับ logic การสร้าง CSS
      if (this.currentTab === 'avatar') {
        // อวตาร: ใช้ background-size ควบคุมการซูม transform ควบคุมเฉพาะการหมุน
        previewElement.style.backgroundSize = `${config.scale * 100}%`;
        previewElement.style.transform = `rotate(${config.rotation}deg)`;
      } else {
        // พื้นหลัง: ใช้ transform ควบคุมทั้งการหมุนและการซูม
        previewElement.style.backgroundSize = 'cover';
        previewElement.style.transform = `rotate(${config.rotation}deg) scale(${config.scale})`;
      }

      // อัปเดตค่าตัวควบคุม
      this.updateControlValues();

      // อัปเดตค่าช่องป้อน URL
      this.updateUrlInput();

      console.log(`[Image Config Modal] อัปเดตตัวอย่าง ${this.currentTab}:`, {
        image: config.image.substring(0, 50) + '...',
        position: backgroundPosition,
        transform,
      });
    }

    // อัปเดตค่าช่องป้อน URL
    updateUrlInput() {
      if (!this.modalElement) return;

      const config = this.currentConfig[this.currentTab];
      const urlInput = this.modalElement.querySelector(`[data-type="${this.currentTab}"].url-input`);

      if (urlInput && config.image && !config.image.startsWith('data:')) {
        urlInput.value = config.image;
      }
    }

    // อัปเดตค่าที่แสดงของตัวควบคุม
    updateControlValues() {
      if (!this.modalElement) return;

      const config = this.currentConfig[this.currentTab];

      // อัปเดตสไลเดอร์การหมุน
      const rotationSlider = this.modalElement.querySelector(
        `[data-type="${this.currentTab}"][data-property="rotation"]`,
      );
      // ค้นหาเอเลเมนต์แสดงค่าของสไลเดอร์การหมุน
      const rotationRow = rotationSlider?.closest('.control-row');
      const rotationValue = rotationRow?.querySelector('.control-value');
      if (rotationSlider && rotationValue) {
        rotationSlider.value = config.rotation;
        rotationValue.textContent = `${config.rotation}°`;
      }

      // อัปเดตสไลเดอร์การซูม
      const scaleSlider = this.modalElement.querySelector(`[data-type="${this.currentTab}"][data-property="scale"]`);
      // ค้นหาเอเลเมนต์แสดงค่าของสไลเดอร์การซูม
      const scaleRow = scaleSlider?.closest('.control-row');
      const scaleValue = scaleRow?.querySelector('.control-value');
      if (scaleSlider && scaleValue) {
        scaleSlider.value = config.scale;
        scaleValue.textContent = `${config.scale.toFixed(1)}x`;
      }
    }

    // ผูกอีเวนต์
    bindEvents() {
      if (!this.modalElement) return;

      // ปุ่มปิด
      const closeBtn = this.modalElement.querySelector('.modal-close-btn');
      closeBtn?.addEventListener('click', () => this.hide());

      // คลิกที่พื้นหลังเพื่อปิด
      const backdrop = this.modalElement.querySelector('.modal-backdrop');
      backdrop?.addEventListener('click', () => this.hide());

      // สลับแท็บ
      const tabBtns = this.modalElement.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      });

      // อัปโหลดไฟล์
      this.bindFileUploadEvents();

      // ป้อน URL
      this.bindUrlInputEvents();

      // อีเวนต์ลาก
      this.bindDragEvents();

      // สไลเดอร์ควบคุม
      this.bindControlEvents();

      // ปุ่มบันทึก
      const saveBtn = this.modalElement.querySelector('.save-btn');
      saveBtn?.addEventListener('click', () => this.saveConfig());
    }

    // ผูกอีเวนต์อัปโหลดไฟล์
    bindFileUploadEvents() {
      const fileInputs = this.modalElement.querySelectorAll('input[type="file"]');
      const uploadBtns = this.modalElement.querySelectorAll('.upload-btn');

      uploadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.target;
          const fileInput = document.getElementById(targetId);
          fileInput?.click();
        });
      });

      fileInputs.forEach(input => {
        input.addEventListener('change', e => this.handleFileUpload(e));
      });
    }

    // ผูกอีเวนต์ป้อน URL
    bindUrlInputEvents() {
      const urlInputs = this.modalElement.querySelectorAll('.url-input');
      urlInputs.forEach(input => {
        input.addEventListener('input', e => this.handleUrlInput(e));
        input.addEventListener('paste', e => {
          setTimeout(() => this.handleUrlInput(e), 10);
        });
      });
    }

    // ประมวลผลการอัปโหลดไฟล์
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      console.log(`[Image Config Modal] กำลังประมวลผลการอัปโหลดไฟล์:`, file.name);

      try {
        // ลองอัปโหลดไปยัง Data Bank
        let imageUrl = '';
        if (window.styleConfigManager && typeof window.styleConfigManager.uploadImageToDataBank === 'function') {
          imageUrl = await window.styleConfigManager.uploadImageToDataBank(file);
        }

        // หากอัปโหลดล้มเหลว ให้แปลงเป็น Base64
        if (!imageUrl) {
          imageUrl = await this.fileToBase64(file);
        }

        // อัปเดตการตั้งค่า
        this.currentConfig[this.currentTab].image = imageUrl;

        // อัปเดตตัวอย่าง
        this.updatePreview();

        console.log(`[Image Config Modal] อัปโหลดไฟล์สำเร็จ`);
      } catch (error) {
        console.error('[Image Config Modal] อัปโหลดไฟล์ล้มเหลว:', error);
        if (window.MobilePhone && window.MobilePhone.showToast) {
          window.MobilePhone.showToast('อัปโหลดรูปภาพล้มเหลว', 'error');
        }
      }
    }

    // ประมวลผลการป้อน URL
    handleUrlInput(event) {
      const url = event.target.value.trim();
      const type = event.target.dataset.type;

      if (url && this.isValidImageUrl(url)) {
        console.log(`[Image Config Modal] ตั้งค่า URL รูปภาพ ${type}:`, url);
        this.currentConfig[type].image = url;
        this.updatePreview();
      }
    }

    // ตรวจสอบความถูกต้องของ URL รูปภาพ
    isValidImageUrl(url) {
      try {
        new URL(url);
        return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
      } catch {
        return url.startsWith('data:image/');
      }
    }

    // แปลงไฟล์เป็น Base64
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ผูกอีเวนต์การลาก
    bindDragEvents() {
      const previewContainers = this.modalElement.querySelectorAll('.preview-container');

      previewContainers.forEach(container => {
        // อีเวนต์เมาส์
        container.addEventListener('mousedown', e => this.startDrag(e, container));

        // อีเวนต์สัมผัส
        container.addEventListener('touchstart', e => this.startDrag(e, container), { passive: false });

        // ป้องกันพฤติกรรมการลากเริ่มต้น
        container.addEventListener('dragstart', e => e.preventDefault());
      });

      // อีเวนต์การลากและสิ้นสุดแบบ global (ผูกกับ document เพื่อให้ตอบสนองได้แม้อยู่นอกคอนเทนเนอร์)
      this.dragMoveHandler = e => this.handleDrag(e);
      this.dragEndHandler = () => this.endDrag();

      document.addEventListener('mousemove', this.dragMoveHandler);
      document.addEventListener('mouseup', this.dragEndHandler);
      document.addEventListener('touchmove', this.dragMoveHandler, { passive: false });
      document.addEventListener('touchend', this.dragEndHandler);
    }

    // ล้างตัวรับฟังอีเวนต์การลาก
    cleanupDragEvents() {
      if (this.dragMoveHandler) {
        document.removeEventListener('mousemove', this.dragMoveHandler);
        document.removeEventListener('touchmove', this.dragMoveHandler);
      }
      if (this.dragEndHandler) {
        document.removeEventListener('mouseup', this.dragEndHandler);
        document.removeEventListener('touchend', this.dragEndHandler);
      }
    }

    // เริ่มลาก
    startDrag(event, container) {
      event.preventDefault();

      this.isDragging = true;
      this.dragContainer = container;

      const rect = container.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;

      this.dragStartPos = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };

      this.dragStartImagePos = { ...this.currentConfig[this.currentTab].position };

      container.style.cursor = 'grabbing';
      console.log('[Image Config Modal] เริ่มลาก');
    }

    // ประมวลผลการลาก
    handleDrag(event) {
      if (!this.isDragging || !this.dragContainer) return;

      event.preventDefault();

      const rect = this.dragContainer.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;

      // คำนวณตำแหน่งปัจจุบันของเมาส์ในคอนเทนเนอร์ (เปอร์เซ็นต์)
      const currentX = ((clientX - rect.left) / rect.width) * 100;
      const currentY = ((clientY - rect.top) / rect.height) * 100;

      // คำนวณตำแหน่งของเมาส์ในคอนเทนเนอร์เมื่อเริ่มลาก (เปอร์เซ็นต์)
      const startX = (this.dragStartPos.x / rect.width) * 100;
      const startY = (this.dragStartPos.y / rect.height) * 100;

      // คำนวณค่าออฟเซ็ต
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // อัปเดตตำแหน่งรูปภาพ (ทิศทางการลากตรงข้ามกับ background-position)
      // ลากไปขวา = ต้องการเห็นรูปภาพด้านขวา = ค่า X ของ background-position ลดลง
      // ลากลง = ต้องการเห็นรูปภาพด้านล่าง = ค่า Y ของ background-position ลดลง
      const newX = Math.max(0, Math.min(100, this.dragStartImagePos.x - deltaX));
      const newY = Math.max(0, Math.min(100, this.dragStartImagePos.y - deltaY));

      this.currentConfig[this.currentTab].position = { x: newX, y: newY };

      // อัปเดตตัวอย่างแบบเรียลไทม์ (อัปเดตเฉพาะตำแหน่ง เพื่อหลีกเลี่ยงการอัปเดตคุณสมบัติอื่นซ้ำ)
      const previewElement = this.modalElement.querySelector(`#${this.currentTab}-preview`);
      if (previewElement) {
        previewElement.style.backgroundPosition = this.formatBackgroundPosition({ x: newX, y: newY });
      }
    }

    // สิ้นสุดการลาก
    endDrag() {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.dragContainer) {
          this.dragContainer.style.cursor = 'grab';
          this.dragContainer = null;
        }
        console.log('[Image Config Modal] สิ้นสุดการลาก');
      }
    }

    // ผูกอีเวนต์ตัวควบคุม
    bindControlEvents() {
      const sliders = this.modalElement.querySelectorAll('.control-slider');

      sliders.forEach(slider => {
        slider.addEventListener('input', e => this.handleControlChange(e));
      });
    }

    // ประมวลผลการเปลี่ยนแปลงตัวควบคุม
    handleControlChange(event) {
      const type = event.target.dataset.type;
      const property = event.target.dataset.property;
      const value = parseFloat(event.target.value);

      if (type && property) {
        this.currentConfig[type][property] = value;

        // อัปเดตค่าที่แสดง
        const valueSpan = event.target.parentNode.querySelector('.control-value');
        if (valueSpan) {
          if (property === 'rotation') {
            valueSpan.textContent = `${value}°`;
          } else if (property === 'scale') {
            valueSpan.textContent = `${value.toFixed(1)}x`;
          }
        }

        // อัปเดตตัวอย่าง
        this.updatePreview();

        console.log(`[Image Config Modal] อัปเดต ${property} ของ ${type}:`, value);
      }
    }

    // บันทึกการตั้งค่า
    async saveConfig() {
      console.log('[Image Config Modal] บันทึกการตั้งค่า');

      if (!window.styleConfigManager || !window.styleConfigManager.isReady) {
        console.error('[Image Config Modal] StyleConfigManager ยังไม่พร้อม');
        if (window.MobilePhone && window.MobilePhone.showToast) {
          window.MobilePhone.showToast('ตัวจัดการการตั้งค่ายังไม่พร้อม', 'error');
        }
        return;
      }

      try {
        // ดึงสำเนาการตั้งค่าปัจจุบัน
        const config = JSON.parse(JSON.stringify(window.styleConfigManager.currentConfig));

        // อัปเดตการตั้งค่าอวตารผู้ใช้
        if (this.currentConfig.avatar.image) {
          if (!config.messageSentAvatar) {
            config.messageSentAvatar = {
              backgroundImage: '',
              backgroundImageUrl: '',
              backgroundPosition: 'center center',
              rotation: '0',
              scale: '1',
              description: 'พื้นหลังอวาตาร์ข้อความที่ส่ง',
            };
          }

          config.messageSentAvatar.backgroundImage = this.currentConfig.avatar.image.startsWith('data:')
            ? this.currentConfig.avatar.image
            : '';
          config.messageSentAvatar.backgroundImageUrl = !this.currentConfig.avatar.image.startsWith('data:')
            ? this.currentConfig.avatar.image
            : '';
          config.messageSentAvatar.backgroundPosition = this.formatBackgroundPosition(
            this.currentConfig.avatar.position,
          );
          config.messageSentAvatar.rotation = this.currentConfig.avatar.rotation.toString();
          config.messageSentAvatar.scale = this.currentConfig.avatar.scale.toString();
        }

        // อัปเดตการตั้งค่าพื้นหลังข้อความ
        if (this.currentConfig.background.image) {
          if (!config.messagesApp) {
            config.messagesApp = {
              backgroundImage: '',
              backgroundImageUrl: '',
              backgroundPosition: 'center center',
              rotation: '0',
              scale: '1',
              description: 'พื้นหลังแอปข้อความ',
            };
          }

          config.messagesApp.backgroundImage = this.currentConfig.background.image.startsWith('data:')
            ? this.currentConfig.background.image
            : '';
          config.messagesApp.backgroundImageUrl = !this.currentConfig.background.image.startsWith('data:')
            ? this.currentConfig.background.image
            : '';
          config.messagesApp.backgroundPosition = this.formatBackgroundPosition(this.currentConfig.background.position);
          config.messagesApp.rotation = this.currentConfig.background.rotation.toString();
          config.messagesApp.scale = this.currentConfig.background.scale.toString();
        }

        // อัปเดตการตั้งค่าของ StyleConfigManager
        window.styleConfigManager.currentConfig = config;

        // บันทึกการตั้งค่า
        const success = await window.styleConfigManager.saveConfig();

        if (success) {
          console.log('[Image Config Modal] บันทึกการตั้งค่าสำเร็จ');
          if (window.MobilePhone && window.MobilePhone.showToast) {
            window.MobilePhone.showToast('บันทึกการตั้งค่าแล้ว', 'success');
          }
          this.hide();
        } else {
          throw new Error('บันทึกล้มเหลว');
        }
      } catch (error) {
        console.error('[Image Config Modal] บันทึกการตั้งค่าล้มเหลว:', error);
        if (window.MobilePhone && window.MobilePhone.showToast) {
          window.MobilePhone.showToast('บันทึกล้มเหลว กรุณาลองใหม่', 'error');
        }
      }
    }
  }

  // บันทึกคลาสไปยัง global ก่อน แล้วจึงสร้าง instance
  window.ImageConfigModalClass = ImageConfigModal;
  window.ImageConfigModal = new ImageConfigModal();

  console.log('[Image Config Modal] โหลดโมดูลกล่องโต้ตอบตั้งค่ารูปภาพเสร็จสมบูรณ์');
}

// ใช้ฟังก์ชันแบบ IIFE เพื่อให้แน่ใจว่าคลาสกล่องโต้ตอบเพื่อนถูกประกาศอย่างถูกต้อง
(function () {
  console.log('[Friend Image Config Modal] ตรวจสอบเงื่อนไขเริ่มต้น...');
  console.log('[Friend Image Config Modal] ประเภท ImageConfigModalClass:', typeof window.ImageConfigModalClass);
  console.log('[Friend Image Config Modal] ประเภท instance ImageConfigModal:', typeof window.ImageConfigModal);
  console.log('[Friend Image Config Modal] ประเภท FriendImageConfigModal:', typeof window.FriendImageConfigModal);

  // ตรวจสอบว่าคลาสกล่องโต้ตอบดั้งเดิมโหลดแล้ว ก่อนประกาศคลาสกล่องโต้ตอบเพื่อน
  if (typeof window.ImageConfigModalClass !== 'undefined' && typeof window.FriendImageConfigModal === 'undefined') {
    console.log(
      '[Friend Image Config Modal] เริ่มประกาศคลาสกล่องโต้ตอบเพื่อน คลาสแม่มีอยู่แล้ว:',
      typeof window.ImageConfigModalClass,
    );

    class FriendImageConfigModal extends window.ImageConfigModalClass {
      constructor() {
        super(); // เรียกใช้ constructor ของคลาสแม่

        // คุณสมบัติเฉพาะของกล่องโต้ตอบเพื่อน
        this.currentFriendId = null;
        this.currentFriendName = null;

        console.log('[Friend Image Config Modal] เริ่มต้นกล่องโต้ตอบตั้งค่ารูปภาพเพื่อนเสร็จสมบูรณ์');
      }

      // แสดงกล่องโต้ตอบ
      show(friendId, friendName) {
        console.log('[Friend Image Config Modal] แสดงกล่องโต้ตอบ:', friendId, friendName);
        console.log('[Friend Image Config Modal] ประเภท ID เพื่อน:', typeof friendId);
        console.log('[Friend Image Config Modal] ประเภทชื่อเพื่อน:', typeof friendName);

        this.currentFriendId = friendId;
        this.currentFriendName = friendName;

        console.log('[Friend Image Config Modal] ID เพื่อนที่ตั้งค่าแล้ว:', this.currentFriendId);
        console.log('[Friend Image Config Modal] ชื่อเพื่อนที่ตั้งค่าแล้ว:', this.currentFriendName);

        // โหลดการตั้งค่าของเพื่อนปัจจุบัน
        this.loadFriendConfig();

        // สร้าง HTML กล่องโต้ตอบ
        this.createModal();

        // ผูกอีเวนต์
        this.bindEvents();

        // แสดงกล่องโต้ตอบ
        this.isVisible = true;
        this.modalElement.style.display = 'flex';

        // เพิ่มแอนิเมชันแสดง
        setTimeout(() => {
          this.modalElement.classList.add('show');
        }, 10);

        // อัปเดตตัวอย่าง
        this.updatePreview();
      }

      // ซ่อนกล่องโต้ตอบ
      hide() {
        console.log('[Friend Image Config Modal] ซ่อนกล่องโต้ตอบ');

        if (!this.modalElement) return;

        // ล้างตัวรับฟังอีเวนต์การลาก
        this.cleanupDragEvents();

        // เพิ่มแอนิเมชันซ่อน
        this.modalElement.classList.remove('show');

        setTimeout(() => {
          if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
          }
          this.modalElement = null;
          this.isVisible = false;
        }, 300);
      }

      // โหลดการตั้งค่าเพื่อน
      loadFriendConfig() {
        if (!window.styleConfigManager || !window.styleConfigManager.isReady) {
          console.warn('[Friend Image Config Modal] StyleConfigManager ยังไม่พร้อม');
          return;
        }

        const config = window.styleConfigManager.getConfig();
        console.log('[Friend Image Config Modal] โหลดการตั้งค่า ID เพื่อน:', this.currentFriendId);
        console.log('[Friend Image Config Modal] การตั้งค่าปัจจุบัน:', config);

        // โหลดการตั้งค่าอวตารเพื่อน
        if (config.messageReceivedAvatars) {
          console.log('[Friend Image Config Modal] อาร์เรย์ messageReceivedAvatars:', config.messageReceivedAvatars);
          const friendAvatar = config.messageReceivedAvatars.find(avatar => avatar.friendId === this.currentFriendId);
          console.log('[Friend Image Config Modal] พบการตั้งค่าอวตารเพื่อน:', friendAvatar);

          if (friendAvatar) {
            this.currentConfig.avatar = {
              image: friendAvatar.backgroundImage || friendAvatar.backgroundImageUrl || '',
              position: this.parseBackgroundPosition(friendAvatar.backgroundPosition || 'center center'),
              rotation: parseFloat(friendAvatar.rotation || 0),
              scale: parseFloat(friendAvatar.scale || 1),
            };
            console.log('[Friend Image Config Modal] การตั้งค่าอวตารที่โหลด:', this.currentConfig.avatar);
          } else {
            console.log('[Friend Image Config Modal] ไม่พบการตั้งค่าอวตารเพื่อน ใช้ค่าเริ่มต้น');
          }
        } else {
          console.log('[Friend Image Config Modal] อาร์เรย์ messageReceivedAvatars ไม่มีอยู่');
        }

        // โหลดการตั้งค่าพื้นหลังแชทเฉพาะเพื่อน
        if (config.friendBackgrounds) {
          const friendBackground = config.friendBackgrounds.find(bg => bg.friendId === this.currentFriendId);
          if (friendBackground) {
            this.currentConfig.background = {
              image: friendBackground.backgroundImage || friendBackground.backgroundImageUrl || '',
              position: this.parseBackgroundPosition(friendBackground.backgroundPosition || 'center center'),
              rotation: parseFloat(friendBackground.rotation || 0),
              scale: parseFloat(friendBackground.scale || 1),
            };
          }
        }
      }

      // สร้าง HTML กล่องโต้ตอบ
      createModal() {
        // ลบกล่องโต้ตอบที่มีอยู่ออก
        const existingModal = document.querySelector('.friend-image-config-modal');
        if (existingModal) {
          existingModal.remove();
        }

        // สร้างเอเลเมนต์กล่องโต้ตอบ
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'image-config-modal friend-image-config-modal';
        this.modalElement.innerHTML = this.getModalHTML();

        // เพิ่มลงในคอนเทนเนอร์โทรศัพท์ ตรวจสอบให้มีตำแหน่งสัมพัทธ์
        const phoneContainer =
          document.querySelector('#mobile-phone-container .mobile-phone-frame') ||
          document.querySelector('.mobile-phone-frame') ||
          document.querySelector('#mobile-phone-container') ||
          document.querySelector('.mobile-phone-container');

        if (phoneContainer) {
          phoneContainer.appendChild(this.modalElement);
          console.log('[Friend Image Config Modal] เพิ่มกล่องโต้ตอบในคอนเทนเนอร์โทรศัพท์แล้ว');
        } else {
          document.body.appendChild(this.modalElement);
          console.log('[Friend Image Config Modal] เพิ่มกล่องโต้ตอบที่ body แล้ว');
        }
      }

      // ดึง HTML ของกล่องโต้ตอบ
      getModalHTML() {
        return `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${this.currentFriendName || 'เพื่อน'} - ตั้งค่ารูปภาพ</h3>
            <button class="modal-close-btn" type="button">×</button>
          </div>

          <div class="modal-tabs">
            <button class="tab-btn ${this.currentTab === 'avatar' ? 'active' : ''}" data-tab="avatar">
              ตั้งค่าอวาตาร์
            </button>
            <button class="tab-btn ${this.currentTab === 'background' ? 'active' : ''}" data-tab="background">
              พื้นหลังแชท
            </button>
          </div>

          <div class="modal-body">
            ${this.getTabContent()}
          </div>

          <div class="modal-footer">
            <button class="save-btn" type="button">บันทึกการตั้งค่า</button>
          </div>
        </div>
      `;
      }

      // ดึงเนื้อหาของแท็บ - ใช้ logic เดิมซ้ำ
      getTabContent() {
        if (this.currentTab === 'avatar') {
          return this.getAvatarTabContent();
        } else {
          return this.getBackgroundTabContent();
        }
      }

      // ดึงเนื้อหาของแท็บอวตาร
      getAvatarTabContent() {
        const config = this.currentConfig.avatar;
        return `
        <div class="config-section">
          <div class="upload-section">
            <div class="upload-controls">
              <input type="file" id="friend-avatar-file-input" accept="image/*" style="display: none;">
              <button class="upload-btn" data-target="friend-avatar-file-input">เลือกรูปภาพ</button>
              <input type="url" class="url-input" placeholder="หรือใส่ลิงก์รูปภาพ..." data-type="avatar" value="${
                config.image
              }">
            </div>
          </div>

          <div class="preview-section">
            <div class="preview-container avatar-preview">
              <div class="preview-image" id="avatar-preview"></div>
              <div class="drag-hint">ลากเพื่อปรับตำแหน่ง</div>
            </div>
          </div>

          <div class="controls-section">
            <div class="control-row">
              <label>หมุน:</label>
              <input type="range" class="control-slider" min="0" max="360" step="1" value="${
                config.rotation
              }" data-type="avatar" data-property="rotation">
              <span class="control-value">${config.rotation}°</span>
            </div>
            <div class="control-row">
              <label>ซูม:</label>
              <input type="range" class="control-slider" min="0.5" max="2" step="0.1" value="${
                config.scale
              }" data-type="avatar" data-property="scale">
              <span class="control-value">${config.scale.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      `;
      }

      // ดึงเนื้อหาของแท็บพื้นหลัง
      getBackgroundTabContent() {
        const config = this.currentConfig.background;
        return `
        <div class="config-section">
          <div class="upload-section">
            <div class="upload-controls">
              <input type="file" id="friend-background-file-input" accept="image/*" style="display: none;">
              <button class="upload-btn" data-target="friend-background-file-input">เลือกรูปภาพ</button>
              <input type="url" class="url-input" placeholder="หรือใส่ลิงก์รูปภาพ..." data-type="background" value="${
                config.image
              }">
            </div>
          </div>

          <div class="preview-section">
            <div class="preview-container background-preview">
              <div class="preview-image" id="background-preview"></div>
              <div class="drag-hint">ลากเพื่อปรับตำแหน่ง</div>
            </div>
          </div>

          <div class="controls-section">
            <div class="control-row">
              <label>หมุน:</label>
              <input type="range" class="control-slider" min="0" max="360" step="1" value="${
                config.rotation
              }" data-type="background" data-property="rotation">
              <span class="control-value">${config.rotation}°</span>
            </div>
            <div class="control-row">
              <label>ซูม:</label>
              <input type="range" class="control-slider" min="0.5" max="2" step="0.1" value="${
                config.scale
              }" data-type="background" data-property="scale">
              <span class="control-value">${config.scale.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      `;
      }

      // ใช้เมธอดเดิมซ้ำ - ผูกอีเวนต์
      bindEvents() {
        if (!this.modalElement) return;

        // ปุ่มปิด
        const closeBtn = this.modalElement.querySelector('.modal-close-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => this.hide());
        }

        // คลิกที่พื้นหลังเพื่อปิด
        const backdrop = this.modalElement.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.addEventListener('click', () => this.hide());
        }

        // สลับแท็บ
        const tabBtns = this.modalElement.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
          btn.addEventListener('click', e => {
            const tab = e.target.getAttribute('data-tab');
            this.switchTab(tab);
          });
        });

        // ปุ่มอัปโหลดไฟล์
        const uploadBtns = this.modalElement.querySelectorAll('.upload-btn');
        uploadBtns.forEach(btn => {
          btn.addEventListener('click', e => {
            const targetId = e.target.getAttribute('data-target');
            const fileInput = this.modalElement.querySelector(`#${targetId}`);
            if (fileInput) {
              fileInput.click();
            }
          });
        });

        // ช่องป้อนไฟล์
        const fileInputs = this.modalElement.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
          input.addEventListener('change', e => this.handleFileUpload(e));
        });

        // ป้อน URL
        const urlInputs = this.modalElement.querySelectorAll('.url-input');
        urlInputs.forEach(input => {
          input.addEventListener('input', e => this.handleUrlInput(e));
        });

        // ตัวควบคุมสไลเดอร์
        const sliders = this.modalElement.querySelectorAll('.control-slider');
        sliders.forEach(slider => {
          slider.addEventListener('input', e => this.handleSliderChange(e));
        });

        // ปุ่มบันทึก
        const saveBtn = this.modalElement.querySelector('.save-btn');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => this.saveConfig());
        }

        // อีเวนต์การลาก
        this.bindDragEvents();
      }

      // ใช้เมธอดเดิมทั้งหมดซ้ำ
      switchTab(tab) {
        this.currentTab = tab;

        // อัปเดตสถานะปุ่มแท็บ
        const tabBtns = this.modalElement.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
        });

        // อัปเดตเนื้อหา
        const modalBody = this.modalElement.querySelector('.modal-body');
        if (modalBody) {
          modalBody.innerHTML = this.getTabContent();

          // ผูกอีเวนต์ใหม่
          this.bindEvents();

          // อัปเดตตัวอย่าง
          this.updatePreview();
        }
      }

      // ประมวลผลการอัปโหลดไฟล์ - เหมือนกับกล่องโต้ตอบดั้งเดิม
      async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
          console.log(`[Friend Image Config Modal] เริ่มอัปโหลดไฟล์:`, file.name);

          // แปลงเป็น Base64
          const imageUrl = await this.fileToBase64(file);

          // อัปเดตการตั้งค่า
          this.currentConfig[this.currentTab].image = imageUrl;

          // อัปเดตตัวอย่าง
          this.updatePreview();

          console.log(`[Friend Image Config Modal] อัปโหลดไฟล์สำเร็จ`);
        } catch (error) {
          console.error('[Friend Image Config Modal] อัปโหลดไฟล์ล้มเหลว:', error);
          if (window.MobilePhone && window.MobilePhone.showToast) {
            window.MobilePhone.showToast('อัปโหลดรูปภาพล้มเหลว', 'error');
          }
        }
      }

      // ประมวลผลการป้อน URL - เหมือนกับกล่องโต้ตอบดั้งเดิม
      handleUrlInput(event) {
        const url = event.target.value.trim();
        const type = event.target.dataset.type;

        if (url && this.isValidImageUrl(url)) {
          console.log(`[Friend Image Config Modal] ตั้งค่า URL รูปภาพ ${type}:`, url);
          this.currentConfig[type].image = url;
          this.updatePreview();
        }
      }

      // ตรวจสอบความถูกต้องของ URL รูปภาพ - เหมือนกับกล่องโต้ตอบดั้งเดิม
      isValidImageUrl(url) {
        try {
          new URL(url);
          return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
        } catch {
          return url.startsWith('data:image/');
        }
      }

      // แปลงไฟล์เป็น Base64 - เหมือนกับกล่องโต้ตอบดั้งเดิม
      fileToBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      handleScaleChange(e) {
        const scale = parseFloat(e.target.value);
        this.currentConfig[this.currentTab].scale = scale;

        // อัปเดตค่าที่แสดง
        const scaleValue = this.modalElement.querySelector('.scale-value');
        if (scaleValue) {
          scaleValue.textContent = scale.toFixed(1) + 'x';
        }

        this.updatePreview();
      }

      handleRotationChange(e) {
        const rotation = parseInt(e.target.value);
        this.currentConfig[this.currentTab].rotation = rotation;

        // อัปเดตค่าที่แสดง
        const rotationValue = this.modalElement.querySelector('.rotation-value');
        if (rotationValue) {
          rotationValue.textContent = rotation + '°';
        }

        this.updatePreview();
      }

      // ประมวลผลการเปลี่ยนแปลงสไลเดอร์ - เหมือนกับกล่องโต้ตอบดั้งเดิม
      handleSliderChange(e) {
        const slider = e.target;
        const type = slider.getAttribute('data-type');
        const property = slider.getAttribute('data-property');
        const value = parseFloat(slider.value);

        if (!type || !property) return;

        // อัปเดตการตั้งค่า
        this.currentConfig[type][property] = value;

        // อัปเดตค่าที่แสดง
        const controlRow = slider.closest('.control-row');
        const valueSpan = controlRow.querySelector('.control-value');
        if (valueSpan) {
          if (property === 'rotation') {
            valueSpan.textContent = `${value}°`;
          } else if (property === 'scale') {
            valueSpan.textContent = `${value.toFixed(1)}x`;
          }
        }

        // อัปเดตตัวอย่าง
        this.updatePreview();

        console.log(`[Friend Image Config Modal] อัปเดต ${property} ของ ${type}:`, value);
      }

      // อัปเดตตัวอย่าง - สอดคล้องกับ logic การสร้าง CSS
      updatePreview() {
        const config = this.currentConfig[this.currentTab];
        const previewElement = this.modalElement.querySelector(`#${this.currentTab}-preview`);

        if (!previewElement || !config.image) return;

        const backgroundPosition = this.formatBackgroundPosition(config.position);

        previewElement.style.backgroundImage = `url(${config.image})`;
        previewElement.style.backgroundPosition = backgroundPosition;
        previewElement.style.backgroundRepeat = 'no-repeat';

        // แก้ไขสำคัญ: สอดคล้องกับ logic การสร้าง CSS
        if (this.currentTab === 'avatar') {
          // อวตาร: ใช้ background-size ควบคุมการซูม transform ควบคุมเฉพาะการหมุน
          previewElement.style.backgroundSize = `${config.scale * 100}%`;
          previewElement.style.transform = `rotate(${config.rotation}deg)`;
        } else {
          // พื้นหลัง: ใช้ transform ควบคุมทั้งการหมุนและการซูม
          previewElement.style.backgroundSize = 'cover';
          previewElement.style.transform = `rotate(${config.rotation}deg) scale(${config.scale})`;
        }

        // อัปเดตค่าตัวควบคุม
        this.updateControlValues();

        // อัปเดตค่าช่องป้อน URL
        this.updateUrlInput();

        console.log(`[Friend Image Config Modal] อัปเดตตัวอย่าง ${this.currentTab}:`, {
          image: config.image.substring(0, 50) + '...',
          position: backgroundPosition,
          transform,
        });
      }

      // ผูกอีเวนต์การลาก - คัดลอก logic จากกล่องโต้ตอบดั้งเดิมทั้งหมด
      bindDragEvents() {
        const previewContainers = this.modalElement.querySelectorAll('.preview-container');

        previewContainers.forEach(container => {
          // อีเวนต์เมาส์
          container.addEventListener('mousedown', e => this.startDrag(e, container));

          // อีเวนต์สัมผัส
          container.addEventListener('touchstart', e => this.startDrag(e, container), { passive: false });

          // ป้องกันพฤติกรรมการลากเริ่มต้น
          container.addEventListener('dragstart', e => e.preventDefault());
        });

        // อีเวนต์การลากและสิ้นสุดแบบ global (ผูกกับ document เพื่อให้ตอบสนองได้แม้อยู่นอกคอนเทนเนอร์)
        this.dragMoveHandler = e => this.handleDrag(e);
        this.dragEndHandler = () => this.endDrag();

        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragEndHandler);
        document.addEventListener('touchmove', this.dragMoveHandler, { passive: false });
        document.addEventListener('touchend', this.dragEndHandler);
      }

      // เริ่มลาก - คัดลอก logic จากกล่องโต้ตอบดั้งเดิมทั้งหมด
      startDrag(event, container) {
        event.preventDefault();

        this.isDragging = true;
        this.dragContainer = container;

        const rect = container.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        this.dragStartPos = {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };

        this.dragStartImagePos = { ...this.currentConfig[this.currentTab].position };

        container.style.cursor = 'grabbing';
        console.log('[Friend Image Config Modal] เริ่มลาก');
      }

      // ประมวลผลการลาก - คัดลอก logic จากกล่องโต้ตอบดั้งเดิมทั้งหมด
      handleDrag(event) {
        if (!this.isDragging || !this.dragContainer) return;

        event.preventDefault();

        const rect = this.dragContainer.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        // คำนวณตำแหน่งปัจจุบันของเมาส์ในคอนเทนเนอร์ (เปอร์เซ็นต์)
        const currentX = ((clientX - rect.left) / rect.width) * 100;
        const currentY = ((clientY - rect.top) / rect.height) * 100;

        // คำนวณตำแหน่งของเมาส์ในคอนเทนเนอร์เมื่อเริ่มลาก (เปอร์เซ็นต์)
        const startX = (this.dragStartPos.x / rect.width) * 100;
        const startY = (this.dragStartPos.y / rect.height) * 100;

        // คำนวณค่าออฟเซ็ต
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // อัปเดตตำแหน่งรูปภาพ (ทิศทางการลากตรงข้ามกับ background-position)
        // ลากไปขวา = ต้องการเห็นรูปภาพด้านขวา = ค่า X ของ background-position ลดลง
        // ลากลง = ต้องการเห็นรูปภาพด้านล่าง = ค่า Y ของ background-position ลดลง
        const newX = Math.max(0, Math.min(100, this.dragStartImagePos.x - deltaX));
        const newY = Math.max(0, Math.min(100, this.dragStartImagePos.y - deltaY));

        this.currentConfig[this.currentTab].position = { x: newX, y: newY };

        // อัปเดตตัวอย่างแบบเรียลไทม์ (อัปเดตเฉพาะตำแหน่ง เพื่อหลีกเลี่ยงการอัปเดตคุณสมบัติอื่นซ้ำ)
        const previewElement = this.modalElement.querySelector(`#${this.currentTab}-preview`);
        if (previewElement) {
          previewElement.style.backgroundPosition = this.formatBackgroundPosition({ x: newX, y: newY });
        }
      }

      // สิ้นสุดการลาก - คัดลอก logic จากกล่องโต้ตอบดั้งเดิมทั้งหมด
      endDrag() {
        if (this.isDragging) {
          this.isDragging = false;
          if (this.dragContainer) {
            this.dragContainer.style.cursor = 'grab';
            this.dragContainer = null;
          }
          console.log('[Friend Image Config Modal] สิ้นสุดการลาก');
        }
      }

      // ล้างตัวรับฟังอีเวนต์การลาก - คัดลอก logic จากกล่องโต้ตอบดั้งเดิมทั้งหมด
      cleanupDragEvents() {
        if (this.dragMoveHandler) {
          document.removeEventListener('mousemove', this.dragMoveHandler);
          document.removeEventListener('touchmove', this.dragMoveHandler);
        }
        if (this.dragEndHandler) {
          document.removeEventListener('mouseup', this.dragEndHandler);
          document.removeEventListener('touchend', this.dragEndHandler);
        }
      }

      // บันทึกการตั้งค่า
      async saveConfig() {
        console.log('[Friend Image Config Modal] บันทึกการตั้งค่า');

        if (!window.styleConfigManager || !window.styleConfigManager.isReady) {
          console.error('[Friend Image Config Modal] StyleConfigManager ยังไม่พร้อม');
          if (window.MobilePhone && window.MobilePhone.showToast) {
            window.MobilePhone.showToast('ตัวจัดการการตั้งค่ายังไม่พร้อม', 'error');
          }
          return;
        }

        try {
          // ดึงสำเนาการตั้งค่าปัจจุบัน
          const config = JSON.parse(JSON.stringify(window.styleConfigManager.currentConfig));

          // บันทึกการตั้งค่าอวตารเพื่อน
          if (this.currentConfig.avatar.image) {
            console.log('[Friend Image Config Modal] เริ่มบันทึกการตั้งค่าอวตารเพื่อน');
            console.log('[Friend Image Config Modal] การตั้งค่าอวตารปัจจุบัน:', this.currentConfig.avatar);
            console.log('[Friend Image Config Modal] ID เพื่อน:', this.currentFriendId);

            // ตรวจสอบว่าอาร์เรย์ messageReceivedAvatars มีอยู่
            if (!config.messageReceivedAvatars) {
              config.messageReceivedAvatars = [];
            }

            // ค้นหาหรือสร้างการตั้งค่าอวตารเพื่อน
            let friendAvatarIndex = config.messageReceivedAvatars.findIndex(
              avatar => avatar.friendId === this.currentFriendId,
            );

            console.log('[Friend Image Config Modal] ค้นหาดัชนีอวตารเพื่อน:', friendAvatarIndex);

            const avatarConfig = {
              id:
                friendAvatarIndex >= 0
                  ? config.messageReceivedAvatars[friendAvatarIndex].id
                  : `friend_${this.currentFriendId}_${Date.now()}`,
              friendId: this.currentFriendId,
              name: this.currentFriendName || `เพื่อน${this.currentFriendId}`,
              description: `อวาตาร์ของ${this.currentFriendName || 'เพื่อน'}`,
              backgroundImage: this.currentConfig.avatar.image.startsWith('data:')
                ? this.currentConfig.avatar.image
                : '',
              backgroundImageUrl: !this.currentConfig.avatar.image.startsWith('data:')
                ? this.currentConfig.avatar.image
                : '',
              backgroundPosition: this.formatBackgroundPosition(this.currentConfig.avatar.position),
              rotation: this.currentConfig.avatar.rotation.toString(),
              scale: this.currentConfig.avatar.scale.toString(),
            };

            console.log('[Friend Image Config Modal] การตั้งค่าอวตารที่สร้าง:', avatarConfig);

            if (friendAvatarIndex >= 0) {
              config.messageReceivedAvatars[friendAvatarIndex] = avatarConfig;
              console.log('[Friend Image Config Modal] อัปเดตการตั้งค่าอวตารที่มีอยู่');
            } else {
              config.messageReceivedAvatars.push(avatarConfig);
              console.log('[Friend Image Config Modal] เพิ่มการตั้งค่าอวตารใหม่');
            }

            console.log('[Friend Image Config Modal] messageReceivedAvatars สุดท้าย:', config.messageReceivedAvatars);
          } else {
            console.log('[Friend Image Config Modal] ข้ามการบันทึกอวตาร - ไม่มีรูปภาพ');
          }

          // บันทึกการตั้งค่าพื้นหลังแชทเฉพาะเพื่อน
          if (this.currentConfig.background.image) {
            // ตรวจสอบว่าอาร์เรย์ friendBackgrounds มีอยู่
            if (!config.friendBackgrounds) {
              config.friendBackgrounds = [];
            }

            // ค้นหาหรือสร้างการตั้งค่าพื้นหลังเพื่อน
            let friendBgIndex = config.friendBackgrounds.findIndex(bg => bg.friendId === this.currentFriendId);

            const backgroundConfig = {
              id:
                friendBgIndex >= 0
                  ? config.friendBackgrounds[friendBgIndex].id
                  : `friend_bg_${this.currentFriendId}_${Date.now()}`,
              friendId: this.currentFriendId,
              name: `พื้นหลังแชทของ${this.currentFriendName || 'เพื่อน'}`,
              description: `พื้นหลังแชทเฉพาะของ${this.currentFriendName || 'เพื่อน'}`,
              backgroundImage: this.currentConfig.background.image.startsWith('data:')
                ? this.currentConfig.background.image
                : '',
              backgroundImageUrl: !this.currentConfig.background.image.startsWith('data:')
                ? this.currentConfig.background.image
                : '',
              backgroundPosition: this.formatBackgroundPosition(this.currentConfig.background.position),
              rotation: this.currentConfig.background.rotation.toString(),
              scale: this.currentConfig.background.scale.toString(),
            };

            if (friendBgIndex >= 0) {
              config.friendBackgrounds[friendBgIndex] = backgroundConfig;
            } else {
              config.friendBackgrounds.push(backgroundConfig);
            }

            console.log(`[Friend Image Config Modal] บันทึกการตั้งค่าพื้นหลังเฉพาะเพื่อน:`, backgroundConfig);
          }

          // บันทึกการตั้งค่า - แก้ไข: อัปเดต currentConfig ของ styleConfigManager ก่อน แล้วจึงเรียกการบันทึก
          console.log('[Friend Image Config Modal] เริ่มบันทึกการตั้งค่าไปยัง styleConfigManager');
          console.log('[Friend Image Config Modal] การตั้งค่าทั้งหมดก่อนบันทึก:', JSON.stringify(config, null, 2));

          // แก้ไขสำคัญ: อัปเดต currentConfig ของ styleConfigManager ก่อน
          window.styleConfigManager.currentConfig = config;
          console.log('[Friend Image Config Modal] อัปเดต styleConfigManager.currentConfig แล้ว');

          // จากนั้นเรียกเมธอด saveConfig แบบไม่มีพารามิเตอร์
          const saveResult = await window.styleConfigManager.saveConfig();
          console.log('[Friend Image Config Modal] ผลการบันทึก:', saveResult);

          // ตรวจสอบการตั้งค่าหลังจากบันทึก
          const savedConfig = window.styleConfigManager.getConfig();
          console.log(
            '[Friend Image Config Modal] messageReceivedAvatars หลังบันทึก:',
            savedConfig.messageReceivedAvatars,
          );
          console.log('[Friend Image Config Modal] friendBackgrounds หลังบันทึก:', savedConfig.friendBackgrounds);

          // แสดงข้อความสำเร็จ
          if (window.MobilePhone && window.MobilePhone.showToast) {
            window.MobilePhone.showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
          }

          // ปิดกล่องโต้ตอบ
          this.hide();
        } catch (error) {
          console.error('[Friend Image Config Modal] บันทึกการตั้งค่าล้มเหลว:', error);
          if (window.MobilePhone && window.MobilePhone.showToast) {
            window.MobilePhone.showToast('บันทึกล้มเหลว กรุณาลองใหม่', 'error');
          }
        }
      }

      // แยกวิเคราะห์ตำแหน่งพื้นหลัง
      parseBackgroundPosition(position) {
        const parts = position.split(' ');
        let x = 50,
          y = 50;

        if (parts.length >= 2) {
          x = parseFloat(parts[0]) || 50;
          y = parseFloat(parts[1]) || 50;
        }

        return { x, y };
      }

      // แปลงพิกัดเป็น CSS background-position - เหมือนกับกล่องโต้ตอบดั้งเดิม
      formatBackgroundPosition(position) {
        return `${position.x}% ${position.y}%`;
      }

      // อัปเดตค่าตัวควบคุม
      updateControlValues() {
        const config = this.currentConfig[this.currentTab];

        // อัปเดตสไลเดอร์การหมุน
        const rotationSlider = this.modalElement.querySelector(
          `[data-type="${this.currentTab}"][data-property="rotation"]`,
        );
        if (rotationSlider) {
          rotationSlider.value = config.rotation;
        }

        // อัปเดตสไลเดอร์การซูม
        const scaleSlider = this.modalElement.querySelector(`[data-type="${this.currentTab}"][data-property="scale"]`);
        if (scaleSlider) {
          scaleSlider.value = config.scale;
        }

        // อัปเดตค่าที่แสดง
        const controlValues = this.modalElement.querySelectorAll('.control-value');
        controlValues.forEach((valueSpan, index) => {
          if (index === 0) {
            valueSpan.textContent = `${config.rotation}°`;
          } else if (index === 1) {
            valueSpan.textContent = `${config.scale.toFixed(1)}x`;
          }
        });
      }

      // อัปเดตค่าช่องป้อน URL
      updateUrlInput() {
        const urlInput = this.modalElement.querySelector(`[data-type="${this.currentTab}"].url-input`);
        if (urlInput) {
          urlInput.value = this.currentConfig[this.currentTab].image;
        }
      }
    }

    // หน่วงเวลาสร้าง instance ระดับ global เพื่อให้ DOM และ dependencies อื่นโหลดเสร็จก่อน
    setTimeout(() => {
      try {
        console.log('[Friend Image Config Modal] เริ่มสร้าง instance กล่องโต้ตอบเพื่อน');
        window.FriendImageConfigModal = new FriendImageConfigModal();
        console.log(
          '[Friend Image Config Modal] สร้าง instance กล่องโต้ตอบเพื่อนสำเร็จ:',
          typeof window.FriendImageConfigModal,
        );
        console.log('[Friend Image Config Modal] โหลดโมดูลกล่องโต้ตอบตั้งค่ารูปภาพเพื่อนเสร็จสมบูรณ์');
      } catch (error) {
        console.error('[Friend Image Config Modal] สร้าง instance กล่องโต้ตอบเพื่อนล้มเหลว:', error);
      }
    }, 100);
  } else {
    console.log(
      '[Friend Image Config Modal] ข้ามการเริ่มต้นกล่องโต้ตอบเพื่อน - ImageConfigModalClass:',
      typeof window.ImageConfigModalClass,
      'instance ImageConfigModal:',
      typeof window.ImageConfigModal,
      'FriendImageConfigModal:',
      typeof window.FriendImageConfigModal,
    );
  }
})(); // สิ้นสุดฟังก์ชัน IIFE
