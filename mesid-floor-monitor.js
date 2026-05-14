/**
 * ตัวตรวจสอบชั้นข้อความ MesID
 * ใช้สำหรับตรวจสอบการเปลี่ยนแปลงของ element ที่มี mesid="1" (การเพิ่ม/ลดชั้นข้อความ)
 * เวอร์ชัน: 1.0.0
 * ผู้เขียน: Assistant
 */

(function () {
  'use strict';

  // ตัวแปร global
  let observer = null;
  let isMonitoring = false;
  let currentFloorCount = 0;
  let lastFloorCount = 0;
  let callbacks = {
    onFloorAdded: [],
    onFloorRemoved: [],
    onFloorChanged: [],
  };

  // ตัวเลือกการตั้งค่า
  const config = {
    targetSelector: '[mesid="1"]',
    childSelector: '.message', // สมมติว่าชั้นข้อความคือ element .message
    observerOptions: {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['mesid'],
    },
    debounceDelay: 100, // หน่วงเวลา debounce (มิลลิวินาที)
  };

  // ฟังก์ชัน debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * คลาสตัวตรวจสอบชั้นข้อความ
   */
  class MesIDFloorMonitor {
    constructor() {
      this.initialize();
    }

    initialize() {
      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] กำลังเริ่มต้น...');
      this.setupObserver();
      this.updateFloorCount();
    }

    /**
     * ตั้งค่า MutationObserver
     */
    setupObserver() {
      if (observer) {
        observer.disconnect();
      }

      observer = new MutationObserver(
        debounce(mutations => {
          this.handleMutations(mutations);
        }, config.debounceDelay),
      );

      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] ตั้งค่า Observer แล้ว');
    }

    /**
     * จัดการการเปลี่ยนแปลง DOM
     */
    handleMutations(mutations) {
      let hasRelevantChange = false;

      for (const mutation of mutations) {
        // ตรวจสอบว่าเกี่ยวข้องกับ mesid="1" หรือไม่
        if (this.isRelevantMutation(mutation)) {
          hasRelevantChange = true;
          break;
        }
      }

      if (hasRelevantChange) {
        this.checkFloorChanges();
      }
    }

    /**
     * ตรวจสอบว่าเป็นการเปลี่ยนแปลงที่เกี่ยวข้องหรือไม่
     */
    isRelevantMutation(mutation) {
      // ตรวจสอบว่า element เป้าหมายหรือ element ลูกมี mesid="1" หรือไม่
      const target = mutation.target;

      // ตรวจสอบว่าเป็น element mesid="1" โดยตรงหรือไม่
      if (target.getAttribute && target.getAttribute('mesid') === '1') {
        return true;
      }

      // ตรวจสอบว่าเป็น element ลูกของ mesid="1" หรือไม่
      const mesidElement = target.closest ? target.closest('[mesid="1"]') : null;
      if (mesidElement) {
        return true;
      }

      // ตรวจสอบ node ที่เพิ่มหรือลบ
      if (mutation.type === 'childList') {
        // ตรวจสอบ node ที่เพิ่ม
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute && node.getAttribute('mesid') === '1') {
              return true;
            }
            if (node.querySelector && node.querySelector('[mesid="1"]')) {
              return true;
            }
          }
        }

        // ตรวจสอบ node ที่ลบ
        for (const node of mutation.removedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute && node.getAttribute('mesid') === '1') {
              return true;
            }
            if (node.querySelector && node.querySelector('[mesid="1"]')) {
              return true;
            }
          }
        }
      }

      return false;
    }

    /**
     * ตรวจสอบการเปลี่ยนแปลงชั้นข้อความ
     */
    checkFloorChanges() {
      const newFloorCount = this.countFloors();
      const change = newFloorCount - currentFloorCount;

      if (change !== 0) {
        lastFloorCount = currentFloorCount;
        currentFloorCount = newFloorCount;

        const changeInfo = {
          oldCount: lastFloorCount,
          newCount: currentFloorCount,
          change: change,
          timestamp: new Date().toISOString(),
          mesidElement: this.getMesidElement(),
        };

        console.log('[MesID ตัวตรวจสอบชั้นข้อความ] ชั้นข้อความเปลี่ยนแปลง:', changeInfo);

        // เรียก callback
        if (change > 0) {
          this.triggerCallbacks('onFloorAdded', changeInfo);
        } else {
          this.triggerCallbacks('onFloorRemoved', changeInfo);
        }

        this.triggerCallbacks('onFloorChanged', changeInfo);
      }
    }

    /**
     * นับจำนวนชั้นข้อความ
     */
    countFloors() {
      const mesidElement = this.getMesidElement();
      if (!mesidElement) {
        return 0;
      }

      // ปรับ selector ตามสถานการณ์จริง
      const floors = mesidElement.querySelectorAll(config.childSelector);
      return floors.length;
    }

    /**
     * รับ element mesid="1"
     */
    getMesidElement() {
      return document.querySelector(config.targetSelector);
    }

    /**
     * อัปเดตจำนวนชั้นข้อความ
     */
    updateFloorCount() {
      currentFloorCount = this.countFloors();
      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] จำนวนชั้นข้อความปัจจุบัน:', currentFloorCount);
    }

    /**
     * เรียกฟังก์ชัน callback
     */
    triggerCallbacks(eventType, data) {
      const callbackList = callbacks[eventType] || [];
      callbackList.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[MesID ตัวตรวจสอบชั้นข้อความ] เรียก callback ผิดพลาด (${eventType}):`, error);
        }
      });
    }

    /**
     * เริ่มตรวจสอบ
     */
    start() {
      if (isMonitoring) {
        console.log('[MesID ตัวตรวจสอบชั้นข้อความ] กำลังตรวจสอบอยู่แล้ว');
        return;
      }

      const targetElement = document.body; // ตรวจสอบทั้งเอกสาร
      if (!targetElement) {
        console.error('[MesID ตัวตรวจสอบชั้นข้อความ] ไม่พบ element เป้าหมาย');
        return;
      }

      observer.observe(targetElement, config.observerOptions);
      isMonitoring = true;
      this.updateFloorCount();

      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] เริ่มตรวจสอบการเปลี่ยนแปลงชั้นข้อความ');
    }

    /**
     * หยุดตรวจสอบ
     */
    stop() {
      if (!isMonitoring) {
        console.log('[MesID ตัวตรวจสอบชั้นข้อความ] ไม่ได้อยู่ในโหมดตรวจสอบ');
        return;
      }

      if (observer) {
        observer.disconnect();
      }
      isMonitoring = false;

      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] หยุดตรวจสอบการเปลี่ยนแปลงชั้นข้อความ');
    }

    /**
     * เพิ่มฟังก์ชัน callback
     */
    addEventListener(eventType, callback) {
      if (!callbacks[eventType]) {
        console.error(`[MesID ตัวตรวจสอบชั้นข้อความ] ประเภท event ไม่ถูกต้อง: ${eventType}`);
        return false;
      }

      if (typeof callback !== 'function') {
        console.error('[MesID ตัวตรวจสอบชั้นข้อความ] callback ต้องเป็นฟังก์ชัน');
        return false;
      }

      callbacks[eventType].push(callback);
      console.log(`[MesID ตัวตรวจสอบชั้นข้อความ] เพิ่ม callback ${eventType} แล้ว`);
      return true;
    }

    /**
     * ลบฟังก์ชัน callback
     */
    removeEventListener(eventType, callback) {
      if (!callbacks[eventType]) {
        console.error(`[MesID ตัวตรวจสอบชั้นข้อความ] ประเภท event ไม่ถูกต้อง: ${eventType}`);
        return false;
      }

      const index = callbacks[eventType].indexOf(callback);
      if (index > -1) {
        callbacks[eventType].splice(index, 1);
        console.log(`[MesID ตัวตรวจสอบชั้นข้อความ] ลบ callback ${eventType} แล้ว`);
        return true;
      }

      return false;
    }

    /**
     * รับสถานะปัจจุบัน
     */
    getStatus() {
      return {
        isMonitoring: isMonitoring,
        currentFloorCount: currentFloorCount,
        lastFloorCount: lastFloorCount,
        mesidElement: this.getMesidElement(),
        callbacks: {
          onFloorAdded: callbacks.onFloorAdded.length,
          onFloorRemoved: callbacks.onFloorRemoved.length,
          onFloorChanged: callbacks.onFloorChanged.length,
        },
      };
    }

    /**
     * รับข้อมูลดีบัก
     */
    getDebugInfo() {
      const mesidElement = this.getMesidElement();
      return {
        config: config,
        status: this.getStatus(),
        mesidElement: {
          exists: !!mesidElement,
          innerHTML: mesidElement ? mesidElement.innerHTML.slice(0, 200) + '...' : null,
          childCount: mesidElement ? mesidElement.children.length : 0,
        },
        observer: {
          exists: !!observer,
          isConnected: observer ? true : false,
        },
      };
    }

    /**
     * บังคับตรวจสอบการเปลี่ยนแปลงชั้นข้อความ (สำหรับทดสอบ)
     */
    forceCheck() {
      console.log('[MesID ตัวตรวจสอบชั้นข้อความ] บังคับตรวจสอบการเปลี่ยนแปลงชั้นข้อความ...');
      this.checkFloorChanges();
    }

    /**
     * ตั้งค่า selector ชั้นข้อความด้วยตนเอง
     */
    setFloorSelector(selector) {
      config.childSelector = selector;
      console.log(`[MesID ตัวตรวจสอบชั้นข้อความ] อัปเดต selector ชั้นข้อความเป็น: ${selector}`);
      this.updateFloorCount();
    }
  }

  // สร้าง instance แบบ global
  window.mesidFloorMonitor = new MesIDFloorMonitor();

  // ส่งออกไปยัง global
  window.MesIDFloorMonitor = MesIDFloorMonitor;

  console.log('[MesID ตัวตรวจสอบชั้นข้อความ] โหลดโมดูลแล้ว');

  // ถ้าหน้าเว็บโหลดแล้ว เริ่มตรวจสอบทันที
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.mesidFloorMonitor.start();
    });
  } else {
    // หน่วงเวลาเริ่มทำงาน เพื่อให้แน่ใจว่าสคริปต์อื่นโหลดแล้ว
    setTimeout(() => {
      window.mesidFloorMonitor.start();
    }, 1000);
  }
})();
