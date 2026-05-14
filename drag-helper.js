/**
 * ปลั๊กอินช่วยลากวางอเนกประสงค์
 * รองรับการลากวางทั้งบน PC และมือถือ
 * ตรวจสอบให้แน่ใจว่าไม่กระทบ event คลิกเดิม
 */

class DragHelper {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      boundary: document.body, // ขอบเขตการลาก
      clickThreshold: 5, // ค่าขีดจำกัดระยะทางการเคลื่อนที่ น้อยกว่าค่านี้ถือว่าเป็นการคลิก
      dragClass: 'dragging', // CSS class ที่เพิ่มขณะลาก
      savePosition: true, // บันทึกตำแหน่งหรือไม่
      storageKey: 'drag-position', // ชื่อ key ใน localStorage
      touchTimeout: 200, // เวลา timeout สำหรับการสัมผัส (มิลลิวินาที) เกินเวลานี้และไม่เคลื่อนที่ถือว่ากดค้างเริ่มลาก
      dragHandle: null, // selector สำหรับจุดจับลาก ถ้าระบุจะลากได้เฉพาะ element นั้น
      ...options,
    };

    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.startElementX = 0;
    this.startElementY = 0;
    this.moved = false;
    this.startTime = 0;
    this.touchTimer = null;

    this.init();
  }

  init() {
    // ตั้งค่า element ให้ลากได้
    this.element.style.position = 'absolute';
    this.element.style.cursor = 'move';
    this.element.style.userSelect = 'none';
    this.element.style.webkitUserSelect = 'none';
    this.element.style.mozUserSelect = 'none';
    this.element.style.msUserSelect = 'none';

    // โหลดตำแหน่งที่บันทึกไว้
    if (this.options.savePosition) {
      this.loadPosition();
    }

    // ผูก event
    this.bindEvents();
  }

  bindEvents() {
    // กำหนด element เป้าหมายสำหรับผูก event
    const eventTarget = this.options.dragHandle ? this.element.querySelector(this.options.dragHandle) : this.element;

    if (!eventTarget) {
      console.warn('DragHelper: ไม่พบ element จุดจับลาก:', this.options.dragHandle);
      return;
    }

    // event สำหรับ PC
    eventTarget.addEventListener('mousedown', this.handleStart.bind(this), { passive: false });
    document.addEventListener('mousemove', this.handleMove.bind(this), { passive: false });
    document.addEventListener('mouseup', this.handleEnd.bind(this), { passive: false });

    // event สำหรับมือถือ
    eventTarget.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });

    // ป้องกันพฤติกรรมเริ่มต้นของการลาก
    eventTarget.addEventListener('dragstart', e => e.preventDefault());

    // บันทึก event target สำหรับการทำลายภายหลัง
    this.eventTarget = eventTarget;
  }

  handleStart(e) {
    // ถ้าระบุจุดจับลาก ตรวจสอบว่าเริ่มลากบนจุดจับหรือไม่
    if (this.options.dragHandle) {
      const handleElement = this.element.querySelector(this.options.dragHandle);
      if (handleElement && !handleElement.contains(e.target)) {
        return; // ไม่ได้อยู่บนจุดจับลาก ข้าม event
      }
    }

    const event = e.type.startsWith('touch') ? e.touches[0] : e;

    this.isDragging = true;
    this.moved = false;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTime = Date.now();

    const rect = this.element.getBoundingClientRect();
    this.startElementX = rect.left;
    this.startElementY = rect.top;

    // ล้าง timer ก่อนหน้า
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }

    // สำหรับ event เมาส์บน PC เริ่มลากทันที
    if (e.type === 'mousedown') {
      e.preventDefault();
      this.element.classList.add(this.options.dragClass);
      this.element.style.zIndex = '9999';
    } else if (e.type === 'touchstart') {
      // event สัมผัสจัดการแบบหน่วงเวลา ให้โอกาส event คลิก
      this.touchTimer = setTimeout(() => {
        if (this.isDragging && !this.moved) {
          this.element.classList.add(this.options.dragClass);
          this.element.style.zIndex = '9999';
        }
      }, this.options.touchTimeout);
    }
  }

  handleMove(e) {
    if (!this.isDragging) return;

    const event = e.type.startsWith('touch') ? e.touches[0] : e;

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    // ตรวจสอบว่าเคลื่อนที่เกินค่าขีดจำกัดหรือไม่
    if (
      !this.moved &&
      (Math.abs(deltaX) > this.options.clickThreshold || Math.abs(deltaY) > this.options.clickThreshold)
    ) {
      this.moved = true;
      // ยืนยันเริ่มลาก เพิ่ม visual feedback และป้องกันพฤติกรรมเริ่มต้น
      e.preventDefault();
      this.element.classList.add(this.options.dragClass);
      this.element.style.zIndex = '9999';

      // ล้าง touch timer
      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
        this.touchTimer = null;
      }
    }

    if (this.moved) {
      // ป้องกันพฤติกรรมเริ่มต้นต่อเนื่องเพื่อหลีกเลี่ยงการรบกวนจากการเลื่อน
      e.preventDefault();

      const newX = this.startElementX + deltaX;
      const newY = this.startElementY + deltaY;

      // ตรวจสอบขอบเขต
      const boundedPosition = this.constrainToBoundary(newX, newY);

      this.element.style.left = boundedPosition.x + 'px';
      this.element.style.top = boundedPosition.y + 'px';
    }
  }

  handleEnd(e) {
    if (!this.isDragging) return;

    // ล้าง touch timer
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }

    this.isDragging = false;
    this.element.classList.remove(this.options.dragClass);

    // ถ้าไม่ได้เคลื่อนที่เกินค่าขีดจำกัด ไม่ป้องกัน event คลิก
    if (!this.moved) {
      this.element.style.zIndex = ''; // คืนค่า z-index เดิม
      // สำหรับ event สัมผัส ถ้าเวลาสั้นและไม่ได้เคลื่อนที่ ให้ event คลิกทำงานปกติ
      if (e.type === 'touchend') {
        const touchDuration = Date.now() - this.startTime;
        if (touchDuration < this.options.touchTimeout) {
          // สัมผัสสั้น ให้ event คลิกทำงานปกติ
          return;
        }
      }
      return;
    }

    // บันทึกตำแหน่ง
    if (this.options.savePosition && this.moved) {
      this.savePosition();
    }

    // หน่วงเวลาคืนค่า z-index เพื่อให้แน่ใจว่าแอนิเมชันการลากเสร็จสมบูรณ์
    setTimeout(() => {
      this.element.style.zIndex = '';
    }, 100);

    // ถ้าเคลื่อนที่แล้ว ป้องกัน event คลิกถัดไป
    if (this.moved) {
      const preventClick = event => {
        event.stopPropagation();
        event.preventDefault();
        this.element.removeEventListener('click', preventClick, true);
      };
      this.element.addEventListener('click', preventClick, true);
    }
  }

  constrainToBoundary(x, y) {
    const boundary = this.options.boundary;
    const elementRect = this.element.getBoundingClientRect();
    const boundaryRect = boundary.getBoundingClientRect();

    // คำนวณขอบเขต
    const minX = boundaryRect.left;
    const minY = boundaryRect.top;
    const maxX = boundaryRect.right - elementRect.width;
    const maxY = boundaryRect.bottom - elementRect.height;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  savePosition() {
    if (!this.options.savePosition) return;

    const rect = this.element.getBoundingClientRect();
    const position = {
      left: rect.left,
      top: rect.top,
    };

    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(position));
    } catch (error) {
      console.warn('ไม่สามารถบันทึกตำแหน่งการลากได้:', error);
    }
  }

  loadPosition() {
    if (!this.options.savePosition) return;

    try {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        const position = JSON.parse(saved);

        // ตรวจสอบว่าตำแหน่งยังถูกต้องหรือไม่
        const boundedPosition = this.constrainToBoundary(position.left, position.top);

        this.element.style.left = boundedPosition.x + 'px';
        this.element.style.top = boundedPosition.y + 'px';
      }
    } catch (error) {
      console.warn('ไม่สามารถโหลดตำแหน่งการลากได้:', error);
    }
  }

  // ทำลายฟังก์ชันการลาก
  destroy() {
    // ล้าง timer
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }

    // ใช้ event target ที่บันทึกไว้สำหรับการทำความสะอาด
    const target = this.eventTarget || this.element;

    target.removeEventListener('mousedown', this.handleStart);
    document.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);

    target.removeEventListener('touchstart', this.handleStart);
    document.removeEventListener('touchmove', this.handleMove);
    document.removeEventListener('touchend', this.handleEnd);

    target.removeEventListener('dragstart', e => e.preventDefault());

    this.element.style.cursor = '';
    this.element.classList.remove(this.options.dragClass);
    this.element.style.zIndex = '';

    this.eventTarget = null;
  }

  // เมธอดแบบ static: เพิ่มฟังก์ชันการลากให้ element อย่างรวดเร็ว
  static makeDraggable(element, options = {}) {
    return new DragHelper(element, options);
  }
}

// ส่งออกไปยัง global scope
window.DragHelper = DragHelper;
