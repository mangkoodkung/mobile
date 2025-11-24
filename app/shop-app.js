/**
 * Shop App - แอปพลิเคชันร้านค้า (เวอร์ชันภาษาไทย)
 * ให้ฟังก์ชันการช้อปปิ้งสำหรับ mobile-phone.js
 */

// @ts-nocheck
// ป้องกันการประกาศซ้ำ
if (typeof window.ShopApp === 'undefined') {
  class ShopApp {
    constructor() {
      this.currentView = 'productList'; // 'productList', 'cart', 'checkout'
      this.currentTab = 'productList'; // 'productList', 'cart'
      this.currentProductType = 'all'; // 'all', 'ดิจิทัล', 'เสื้อผ้า', 'ของแต่งบ้าน', etc.
      this.showCategories = false; // แสดงแถบหมวดหมู่หรือไม่
      this.products = [];
      this.cart = [];
      this.contextMonitor = null;
      this.lastProductCount = 0;
      this.isAutoRenderEnabled = true;
      this.lastRenderTime = 0;
      this.renderCooldown = 1000;
      this.eventListenersSetup = false;
      this.contextCheckInterval = null;

      this.init();
    }

    init() {
      console.log('[Shop App] เริ่มต้นแอปพลิเคชันร้านค้า - เวอร์ชัน 2.0 (รองรับรูปแบบกระเป๋าเป้)');

      // แยกวิเคราะห์ข้อมูลสินค้าจากบริบททันที
      this.parseProductsFromContext();

      // เริ่มต้นการตรวจสอบแบบ Asynchronous เพื่อไม่ให้ขัดขวางการเรนเดอร์ UI
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Shop App] การเริ่มต้นเสร็จสมบูรณ์');
    }

    // ตั้งค่าการตรวจสอบบริบท (Context Monitor)
    setupContextMonitor() {
      console.log('[Shop App] กำลังตั้งค่า Context Monitor...');

      // ฟังเหตุการณ์การอัปเดตบริบท
      if (window.addEventListener) {
        window.addEventListener('contextUpdate', event => {
          this.handleContextChange(event);
        });

        // ฟังเหตุการณ์การอัปเดตข้อความ
        window.addEventListener('messageUpdate', event => {
          this.handleContextChange(event);
        });

        // ฟังเหตุการณ์การเปลี่ยนแปลงแชท
        window.addEventListener('chatChanged', event => {
          this.handleContextChange(event);
        });
      }

      // ลดความถี่ในการตรวจสอบจาก 2 วินาที เป็น 10 วินาที
      this.contextCheckInterval = setInterval(() => {
        this.checkContextChanges();
      }, 10000);

      // ตั้งค่า Listener สำหรับ SillyTavern
      this.setupSillyTavernEventListeners();
    }

    // จัดการเมื่อบริบทมีการเปลี่ยนแปลง
    handleContextChange(event) {
      console.log('[Shop App] บริบทมีการเปลี่ยนแปลง:', event);
      this.parseProductsFromContext();
    }

    // ตรวจสอบการเปลี่ยนแปลงบริบท
    checkContextChanges() {
      if (!this.isAutoRenderEnabled) return;

      const currentTime = Date.now();
      if (currentTime - this.lastRenderTime < this.renderCooldown) {
        return;
      }

      this.parseProductsFromContext();
      this.lastRenderTime = currentTime;
    }

    // ตั้งค่า Listener ของ SillyTavern
    setupSillyTavernEventListeners() {
      // ป้องกันการตั้งค่าซ้ำ
      if (this.eventListenersSetup) {
        return;
      }

      try {
        const eventSource = window['eventSource'];
        const event_types = window['event_types'];

        if (eventSource && event_types) {
          this.eventListenersSetup = true;

          // Debounce เพื่อป้องกันการประมวลผลที่ถี่เกินไป
          const debouncedParse = this.debounce(() => {
            this.parseProductsFromContext();
          }, 1000);

          if (event_types.MESSAGE_SENT) {
            eventSource.on(event_types.MESSAGE_SENT, debouncedParse);
          }

          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, debouncedParse);
          }

          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, debouncedParse);
          }
        } else {
          // ลดความถี่ในการลองใหม่
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Shop App] ตั้งค่า SillyTavern Listeners ล้มเหลว:', error);
      }
    }

    // ฟังก์ชัน Debounce
    debounce(func, wait) {
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

    // แยกข้อมูลสินค้าจากบริบท
    parseProductsFromContext() {
      try {
        const shopData = this.getCurrentShopData();

        if (shopData.products.length !== this.products.length || this.hasProductsChanged(shopData.products)) {
          this.products = shopData.products;
          this.updateProductList();
        }
      } catch (error) {
        console.error('[Shop App] แยกข้อมูลสินค้าล้มเหลว:', error);
      }
    }

    // ดึงข้อมูลร้านค้าจากข้อความปัจจุบัน
    getCurrentShopData() {
      try {
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            const allContent = chatData.messages.map(msg => msg.mes || '').join('\n');
            return this.parseShopContent(allContent);
          }
        }

        const chatData = this.getChatData();
        if (chatData && chatData.length > 0) {
          const allContent = chatData.map(msg => msg.mes || '').join('\n');
          return this.parseShopContent(allContent);
        }
      } catch (error) {
        console.warn('[Shop App] ดึงข้อมูลสินค้าล้มเหลว:', error);
      }

      return { products: [] };
    }

    // แยกเนื้อหาร้านค้าจากข้อความ (Regex Parsing)
    parseShopContent(content) {
      const products = [];

      // รูปแบบ: [商品|ชื่อสินค้า|ประเภท|คำอธิบาย|ราคา] ('商品' เป็นคีย์เวิร์ดระบุสินค้า)
      // หมายเหตุ: ยังคงใช้คำว่า '商品' ใน Regex เพื่อความเข้ากันได้กับระบบเดิม แต่ถ้าระบบ AI ส่งมาเป็นภาษาไทยอาจต้องปรับ Regex นี้
      const productRegex = /\[商品\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\]]+)\]/g;

      let productMatch;
      while ((productMatch = productRegex.exec(content)) !== null) {
        const [fullMatch, name, type, description, price] = productMatch;

        const existingProduct = products.find(p => p.name.trim() === name.trim() && p.type.trim() === type.trim());

        if (!existingProduct) {
          const newProduct = {
            id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            type: type.trim(),
            description: description.trim(),
            price: parseFloat(price.trim()) || 0,
            image: this.getProductImage(type.trim()),
            stock: Math.floor(Math.random() * 50) + 10,
            timestamp: new Date().toLocaleString(),
          };
          products.push(newProduct);
        }
      }

      console.log('[Shop App] แยกข้อมูลเสร็จสิ้น จำนวนสินค้า:', products.length);
      return { products };
    }

    // ตรวจสอบการเปลี่ยนแปลงของสินค้า
    hasProductsChanged(newProducts) {
      if (newProducts.length !== this.products.length) {
        return true;
      }

      for (let i = 0; i < newProducts.length; i++) {
        const newProduct = newProducts[i];
        const oldProduct = this.products[i];

        if (
          !oldProduct ||
          newProduct.name !== oldProduct.name ||
          newProduct.type !== oldProduct.type ||
          newProduct.description !== oldProduct.description ||
          newProduct.price !== oldProduct.price
        ) {
          return true;
        }
      }

      return false;
    }

    // รับรูปภาพ/ไอคอนสินค้า
    getProductImage(type) {
      const imageMap = {
        // จีน (Original)
        食品: '🍎',
        食物: '🍎',
        饮料: '🥤',
        服装: '👔',
        数码: '📱',
        家居: '🏠',
        美妆: '💄',
        运动: '⚽',
        图书: '📚',
        玩具: '🧸',
        音乐: '🎵',
        // ไทย (Added Support)
        อาหาร: '🍎',
        ของกิน: '🍎',
        เครื่องดื่ม: '🥤',
        เสื้อผ้า: '👔',
        เครื่องแต่งกาย: '👔',
        ดิจิทัล: '📱',
        อุปกรณ์ไอที: '📱',
        ของใช้ในบ้าน: '🏠',
        เฟอร์นิเจอร์: '🏠',
        เครื่องสำอาง: '💄',
        ความงาม: '💄',
        กีฬา: '⚽',
        หนังสือ: '📚',
        ของเล่น: '🧸',
        ดนตรี: '🎵',
        เพลง: '🎵',
        ยา: '💊',
        อาวุธ: '⚔️',
        เวทมนตร์: '✨',
        // Default
        默认: '🛒',
      };
      return imageMap[type] || imageMap['默认'];
    }

    // ดึงข้อมูลแชท
    getChatData() {
      try {
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            return chatData.messages;
          }
        }

        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        const SillyTavern = window['SillyTavern'];
        if (SillyTavern && SillyTavern.chat) {
          return SillyTavern.chat;
        }

        return [];
      } catch (error) {
        console.error('[Shop App] ดึงข้อมูลแชทล้มเหลว:', error);
        return [];
      }
    }

    // รับเนื้อหาแอปเพื่อแสดงผล
    getAppContent() {
      switch (this.currentView) {
        case 'productList':
          return this.renderProductList();
        case 'cart':
          return this.renderCart();
        case 'checkout':
          return this.renderCheckout();
        default:
          return this.renderProductList();
      }
    }

    // เรนเดอร์แท็บด้านบน
    renderShopTabs() {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      const productCount = this.products.length;

      return `
          <div class="shop-tabs">
              <button class="shop-tab ${this.currentTab === 'productList' ? 'active' : ''}"
                      data-tab="productList">
                  รายการสินค้า (${productCount})
              </button>
              <button class="shop-tab ${this.currentTab === 'cart' ? 'active' : ''}"
                      data-tab="cart">
                  รถเข็น (${totalItems})
              </button>
          </div>
      `;
    }

    // เรนเดอร์รายการสินค้า
    renderProductList() {
      console.log('[Shop App] เรนเดอร์รายการสินค้า...');

      const allTypes = ['all', ...new Set(this.products.map(p => p.type))];

      const filteredProducts =
        this.currentProductType === 'all'
          ? this.products
          : this.products.filter(p => p.type === this.currentProductType);

      if (!this.products.length) {
        return `
                <div class="shop-product-list">
                    ${this.renderShopTabs()}
                    <div class="shop-empty-state">
                        <div class="empty-icon">🛒</div>
                        <div class="empty-title">ยังไม่มีสินค้า</div>
                    </div>
                </div>
            `;
      }

      const typeTabsHtml = this.showCategories
        ? `
          <div class="product-type-tabs">
              ${allTypes
                .map(
                  type => `
                  <button class="product-type-tab ${this.currentProductType === type ? 'active' : ''}"
                          data-type="${type}">
                      ${type === 'all' ? 'ทั้งหมด' : type}
                  </button>
              `,
                )
                .join('')}
          </div>
      `
        : '';

      const productItems = filteredProducts
        .map(
          product => `
            <div class="product-item" data-product-id="${product.id}">
                <div class="product-info">
                    <div class="product-header">
                        <div class="product-name">${product.name}</div>
                        <div class="product-type-badge">${product.type}</div>
                    </div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-footer">
                        <div class="product-price">¥${product.price.toFixed(2)}</div>
                        <button class="add-to-cart-btn" data-product-id="${product.id}">
                            เพิ่มลงรถเข็น
                        </button>
                    </div>
                </div>
            </div>
        `,
        )
        .join('');

      return `
            <div class="shop-product-list">
                ${this.renderShopTabs()}
                ${typeTabsHtml}
                <div class="product-grid">
                    ${productItems}
                </div>
            </div>
        `;
    }

    // เรนเดอร์หน้ารถเข็น
    renderCart() {
      console.log('[Shop App] เรนเดอร์รถเข็น...');

      if (!this.cart.length) {
        return `
                <div class="shop-cart">
                    ${this.renderShopTabs()}
                    <div class="shop-empty-state">
                        <div class="empty-icon">🛒</div>
                        <div class="empty-title">รถเข็นว่างเปล่า</div>
                        <div class="empty-subtitle">ไปเลือกซื้อสินค้าที่คุณชอบกันเถอะ</div>
                    </div>
                </div>
            `;
      }

      const cartItems = this.cart
        .map(
          item => `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-header">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-type">${item.type}</div>
                    </div>
                    <div class="cart-item-description">${item.description}</div>
                    <div class="cart-item-footer">
                        <div class="cart-item-price">¥${item.price.toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn minus" data-product-id="${item.id}">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn plus" data-product-id="${item.id}">+</button>
                        </div>
                        <button class="remove-item-btn" data-product-id="${item.id}">🗑️</button>
                    </div>
                </div>
            </div>
        `,
        )
        .join('');

      const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      return `
            <div class="shop-cart">
                ${this.renderShopTabs()}
                <div class="cart-items">
                    ${cartItems}
                </div>
                <div class="cart-footer">
                    <div class="cart-summary">
                        <div class="cart-count">รวมทั้งหมด ${totalItems} ชิ้น</div>
                        <div class="cart-total">
                            <span class="total-label">ราคารวมทั้งหมด:</span>
                            <span class="total-price">¥${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="cart-actions">
                        <button class="checkout-btn">ชำระเงิน</button>
                    </div>
                </div>
            </div>
        `;
    }

    // เรนเดอร์หน้าชำระเงิน (Checkout)
    renderCheckout() {
      console.log('[Shop App] เรนเดอร์หน้าชำระเงิน...');

      const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      const orderItems = this.cart
        .map(
          item => `
            <div class="order-item">
                <span class="order-item-name">${item.name}</span>
                <span class="order-item-quantity">x${item.quantity}</span>
                <span class="order-item-price">¥${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `,
        )
        .join('');

      return `
            <div class="shop-checkout">
                <div class="checkout-header">
                    <div class="checkout-title">ยืนยันคำสั่งซื้อ</div>
                </div>
                <div class="order-summary">
                    <div class="order-title">รายละเอียดคำสั่งซื้อ</div>
                    ${orderItems}
                    <div class="order-total">
                        <div class="total-items">รวมทั้งหมด ${totalItems} ชิ้น</div>
                        <div class="total-price">ราคารวมทั้งหมด: ¥${totalPrice.toFixed(2)}</div>
                    </div>
                </div>
                <div class="checkout-actions">
                    <button class="back-to-cart-btn">กลับไปยังรถเข็น</button>
                    <button class="confirm-order-btn">ยืนยันคำสั่งซื้อ</button>
                </div>
            </div>
        `;
    }

    // อัปเดตรายการสินค้า
    updateProductList() {
      if (this.currentView === 'productList') {
        this.updateAppContent();
      }
    }

    // อัปเดตเนื้อหาแอป
    updateAppContent(preserveScrollPosition = false) {
      const appContent = document.getElementById('app-content');
      if (appContent) {
        let scrollTop = 0;
        if (preserveScrollPosition) {
          const scrollContainer = appContent.querySelector('.product-grid, .cart-items');
          if (scrollContainer) {
            scrollTop = scrollContainer.scrollTop;
          }
        }

        appContent.innerHTML = this.getAppContent();
        this.bindEvents();

        if (preserveScrollPosition && scrollTop > 0) {
          setTimeout(() => {
            const scrollContainer = appContent.querySelector('.product-grid, .cart-items');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollTop;
            }
          }, 0);
        }
      }
    }

    renderApp() {
      return this.getAppContent();
    }

    // ผูกเหตุการณ์ (Bind Events)
    bindEvents() {
      console.log('[Shop App] กำลังผูกเหตุการณ์...');

      // เพิ่มลงรถเข็น
      document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const productId = e.target?.getAttribute('data-product-id');
          this.addToCart(productId);
        });
      });

      // ปรับจำนวน
      document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const target = e.target;
          const productId = target?.getAttribute('data-product-id');
          const isPlus = target?.classList?.contains('plus');
          this.updateCartQuantity(productId, isPlus);
        });
      });

      // ลบสินค้า
      document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const productId = e.target?.getAttribute('data-product-id');
          this.removeFromCart(productId);
        });
      });

      // ปุ่มนำทาง
      document.querySelectorAll('.back-to-shop-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.showProductList();
        });
      });

      document.querySelectorAll('.checkout-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.showCheckout();
        });
      });

      document.querySelectorAll('.back-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.showCart();
        });
      });

      document.querySelectorAll('.confirm-order-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.confirmOrder();
        });
      });

      // เปลี่ยนแท็บ
      document.querySelectorAll('.shop-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const tab = e.target?.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });

      // เปลี่ยนประเภทสินค้า
      document.querySelectorAll('.product-type-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const type = e.target?.getAttribute('data-type');
          this.switchProductType(type);
        });
      });
    }

    switchTab(tab) {
      console.log('[Shop App] เปลี่ยนแท็บ:', tab);
      this.currentTab = tab;
      this.currentView = tab;
      this.updateAppContent();
    }

    switchProductType(type) {
      console.log('[Shop App] เปลี่ยนประเภทสินค้า:', type);
      this.currentProductType = type;
      this.updateAppContent();
    }

    toggleCategories() {
      console.log('[Shop App] สลับการแสดงหมวดหมู่:', !this.showCategories);
      this.showCategories = !this.showCategories;
      this.updateAppContent();
    }

    addToCart(productId) {
      const product = this.products.find(p => p.id === productId);
      if (!product) return;

      const existingItem = this.cart.find(item => item.id === productId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.cart.push({
          ...product,
          quantity: 1,
        });
      }

      this.showToast(`เพิ่ม ${product.name} ลงในรถเข็นแล้ว`, 'success');
      this.updateCartBadge();
    }

    updateCartQuantity(productId, isPlus) {
      const item = this.cart.find(item => item.id === productId);
      if (!item) return;

      if (isPlus) {
        item.quantity += 1;
      } else {
        item.quantity -= 1;
        if (item.quantity <= 0) {
          this.removeFromCart(productId);
          return;
        }
      }

      this.updateAppContent(true);
      this.updateCartBadge();
    }

    removeFromCart(productId) {
      this.cart = this.cart.filter(item => item.id !== productId);
      this.updateAppContent(true);
      this.updateCartBadge();
    }

    updateCartBadge() {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      const cartTab = document.querySelector('.shop-tab[data-tab="cart"]');
      if (cartTab) {
        cartTab.textContent = `รถเข็น (${totalItems})`;
      }
    }

    showProductList() {
      this.currentView = 'productList';
      this.currentTab = 'productList';
      this.updateAppContent();
      this.updateHeader();
    }

    showCart() {
      this.currentView = 'cart';
      this.currentTab = 'cart';
      this.updateAppContent();
      this.updateHeader();
    }

    showCheckout() {
      if (this.cart.length === 0) {
        this.showToast('รถเข็นว่างเปล่า', 'warning');
        return;
      }

      this.currentView = 'checkout';
      this.updateAppContent();
      this.updateHeader();
    }

    confirmOrder() {
      if (this.cart.length === 0) {
        this.showToast('รถเข็นว่างเปล่า', 'warning');
        return;
      }

      const orderSummary = this.generateOrderSummary();
      this.sendOrderToSillyTavern(orderSummary);

      this.cart = [];
      this.updateCartBadge();

      this.showToast('ยืนยันคำสั่งซื้อเรียบร้อยแล้ว!', 'success');

      setTimeout(() => {
        this.showProductList();
      }, 1500);
    }

    generateOrderSummary() {
      const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      const itemsList = this.cart
        .map(item => `${item.name} x${item.quantity} = ¥${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

      return `ยืนยันคำสั่งซื้อ:
${itemsList}
รวม: ${totalItems} รายการ, ราคารวม ¥${totalPrice.toFixed(2)}`;
    }

    // ส่งคำสั่งซื้อไปยัง SillyTavern (ปรับปรุงข้อความเป็นภาษาไทย)
    sendOrderToSillyTavern(orderSummary) {
      try {
        console.log('[Shop App] ส่งคำสั่งซื้อไปยัง SillyTavern');

        const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemNames = this.cart.map(item => `${item.name}x${item.quantity}`).join('、');

        // สร้างรูปแบบกระเป๋าเป้: [背包|ชื่อสินค้า|ประเภท|คำอธิบาย|จำนวน]
        // หมายเหตุ: คำว่า '背包' (Backpack) ในวงเล็บอาจต้องคงไว้ถ้าเป็น System Command แต่ส่วนอื่นแปลได้
        const bagMessages = this.cart
          .map(item => `[背包|${item.name}|${item.type}|${item.description}|${item.quantity}]`)
          .join('');

        // ข้อความที่จะส่งให้ AI (แปลเป็นไทยเพื่อให้ AI ตอบกลับเป็นไทย)
        const finalMessage = `ผู้ใช้ได้ซื้อสินค้าในร้านค้า ใช้จ่ายไป ${totalPrice} (กรุณาอัปเดตตัวแปรยอดเงินของผู้ใช้ให้ถูกต้อง โดยหักค่าใช้จ่ายในการซื้อสินค้าครั้งนี้) ได้รับสินค้า: ${itemNames} ${bagMessages}`;
        console.log('[Shop App] ข้อความสุดท้ายที่ส่ง:', finalMessage);

        this.sendToSillyTavern(finalMessage);
      } catch (error) {
        console.error('[Shop App] ส่งคำสั่งซื้อล้มเหลว:', error);
      }
    }

    // ส่งข้อความขอดูสินค้า
    sendViewProductsMessage() {
      try {
        console.log('[Shop App] ส่งข้อความขอดูสินค้า');
        const message = 'ขอดูสินค้าในร้านหน่อย'; // แปลเป็นไทย
        this.sendToSillyTavern(message);
      } catch (error) {
        console.error('[Shop App] ส่งข้อความล้มเหลว:', error);
      }
    }

    // ฟังก์ชันส่งข้อความ
    async sendToSillyTavern(message) {
      try {
        console.log('[Shop App] 🔄 ใช้วิธีการส่งแบบใหม่ v2.0:', message);

        const originalInput = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (!originalInput || !sendButton) {
          console.error('[Shop App] ไม่พบช่องป้อนข้อมูลหรือปุ่มส่ง');
          return this.sendToSillyTavernBackup(message);
        }

        if (originalInput.disabled) {
          console.warn('[Shop App] ช่องป้อนข้อมูลถูกปิดใช้งาน');
          return false;
        }

        if (sendButton.classList.contains('disabled')) {
          console.warn('[Shop App] ปุ่มส่งถูกปิดใช้งาน');
          return false;
        }

        originalInput.value = message;
        console.log('[Shop App] ตั้งค่าข้อความแล้ว:', originalInput.value);

        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 300));
        sendButton.click();
        console.log('[Shop App] คลิกปุ่มส่งแล้ว');

        return true;
      } catch (error) {
        console.error('[Shop App] เกิดข้อผิดพลาดขณะส่ง:', error);
        return this.sendToSillyTavernBackup(message);
      }
    }

    async sendToSillyTavernBackup(message) {
      try {
        console.log('[Shop App] ลองใช้วิธีสำรอง:', message);

        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"]');

        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Shop App] วิธีสำรองล้มเหลว:', error);
        return false;
      }
    }

    refreshProductList() {
      console.log('[Shop App] รีเฟรชรายการสินค้าด้วยตนเอง');
      this.parseProductsFromContext();
      this.updateAppContent();
    }

    destroy() {
      console.log('[Shop App] ทำลายแอป ล้างทรัพยากร');

      if (this.contextCheckInterval) {
        clearInterval(this.contextCheckInterval);
        this.contextCheckInterval = null;
      }

      this.eventListenersSetup = false;
      this.isAutoRenderEnabled = false;
      this.products = [];
      this.cart = [];
    }

    updateHeader() {
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'shop',
          title: this.getViewTitle(),
          view: this.currentView,
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    getViewTitle() {
      return 'ร้านค้า';
    }

    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `shop-toast ${type}`;
      toast.textContent = message;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 100);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3000);
    }
  }

  window.ShopApp = ShopApp;
  window.shopApp = new ShopApp();
}

// Global Functions
window.getShopAppContent = function () {
  console.log('[Shop App] ดึงเนื้อหาแอป');

  if (!window.shopApp) {
    console.error('[Shop App] ไม่พบอินสแตนซ์ shopApp');
    return '<div class="error-message">โหลดแอปพลิเคชันล้มเหลว</div>';
  }

  try {
    return window.shopApp.getAppContent();
  } catch (error) {
    console.error('[Shop App] ดึงเนื้อหาล้มเหลว:', error);
    return '<div class="error-message">เกิดข้อผิดพลาดในการโหลดเนื้อหา</div>';
  }
};

window.bindShopAppEvents = function () {
  console.log('[Shop App] ผูกเหตุการณ์ของแอป');

  if (!window.shopApp) {
    console.error('[Shop App] ไม่พบอินสแตนซ์ shopApp');
    return;
  }

  try {
    window.shopApp.bindEvents();
  } catch (error) {
    console.error('[Shop App] ผูกเหตุการณ์ล้มเหลว:', error);
  }
};

window.shopAppShowCart = function () {
  if (window.shopApp) {
    window.shopApp.showCart();
  }
};

window.shopAppSendViewMessage = function () {
  if (window.shopApp) {
    window.shopApp.sendViewProductsMessage();
  }
};

window.shopAppToggleCategories = function () {
  if (window.shopApp) {
    window.shopApp.toggleCategories();
  }
};

window.shopAppRefresh = function () {
  if (window.shopApp) {
    window.shopApp.refreshProductList();
  }
};

window.shopAppDebugInfo = function () {
  if (window.shopApp) {
    console.log('[Shop App Debug] สินค้า:', window.shopApp.products);
    console.log('[Shop App Debug] รถเข็น:', window.shopApp.cart);
    console.log('[Shop App Debug] มุมมอง:', window.shopApp.currentView);
  }
};

window.shopAppDestroy = function () {
  if (window.shopApp) {
    window.shopApp.destroy();
    console.log('[Shop App] แอปถูกทำลายแล้ว');
  }
};

window.shopAppForceReload = function () {
  console.log('[Shop App] 🔄 บังคับโหลดแอปใหม่...');
  if (window.shopApp) {
    window.shopApp.destroy();
  }
  window.shopApp = new ShopApp();
  console.log('[Shop App] ✅ แอปโหลดใหม่เรียบร้อย - เวอร์ชัน 2.0');
};

window.shopAppCheckVersion = function () {
  if (window.shopApp?.sendToSillyTavern) {
    console.log('✅ โหลดเวอร์ชันใหม่เรียบร้อย');
  } else {
    console.log('❌ ไม่พบเวอร์ชันใหม่ กรุณารีเฟรชหน้าจอ');
  }
};

console.log('[Shop App] โมดูลร้านค้าพร้อมใช้งาน - เวอร์ชันภาษาไทย');
