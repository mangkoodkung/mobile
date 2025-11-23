/**
 * Shop App - 购物应用
 * 为mobile-phone.js提供购物功能
 */

// @ts-nocheck
// 避免重复定义
if (typeof window.ShopApp === 'undefined') {
  class ShopApp {
    constructor() {
      this.currentView = 'productList'; // 'productList', 'cart', 'checkout'
      this.currentTab = 'productList'; // 'productList', 'cart'
      this.currentProductType = 'all'; // 'all', '数码', '服装', '家居', etc.
      this.showCategories = false; // 是否显示分类标签栏
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
      console.log('[Shop App] 购物应用初始化开始 - 版本 2.0 (背包格式支持)');

      // 立即解析一次商品信息
      this.parseProductsFromContext();

      // 异步初始化监控，避免阻塞界面渲染
      setTimeout(() => {
        this.setupContextMonitor();
      }, 100);

      console.log('[Shop App] 购物应用初始化完成 - 版本 2.0');
    }

    // 设置上下文监控
    setupContextMonitor() {
      console.log('[Shop App] 设置上下文监控...');

      // 监听上下文变化事件
      if (window.addEventListener) {
        window.addEventListener('contextUpdate', event => {
          this.handleContextChange(event);
        });

        // 监听消息更新事件
        window.addEventListener('messageUpdate', event => {
          this.handleContextChange(event);
        });

        // 监听聊天变化事件
        window.addEventListener('chatChanged', event => {
          this.handleContextChange(event);
        });
      }

      // 减少定时检查频率，从2秒改为10秒
      this.contextCheckInterval = setInterval(() => {
        this.checkContextChanges();
      }, 10000);

      // 监听SillyTavern的事件系统
      this.setupSillyTavernEventListeners();
    }

    // 处理上下文变化
    handleContextChange(event) {
      console.log('[Shop App] 上下文变化:', event);
      this.parseProductsFromContext();
    }

    // 检查上下文变化
    checkContextChanges() {
      if (!this.isAutoRenderEnabled) return;

      const currentTime = Date.now();
      if (currentTime - this.lastRenderTime < this.renderCooldown) {
        return;
      }

      this.parseProductsFromContext();
      this.lastRenderTime = currentTime;
    }

    // 设置SillyTavern事件监听器
    setupSillyTavernEventListeners() {
      // 防止重复设置
      if (this.eventListenersSetup) {
        return;
      }

      try {
        // 监听SillyTavern的事件系统
        const eventSource = window['eventSource'];
        const event_types = window['event_types'];

        if (eventSource && event_types) {
          this.eventListenersSetup = true;

          // 创建防抖函数，避免过于频繁的解析
          const debouncedParse = this.debounce(() => {
            this.parseProductsFromContext();
          }, 1000);

          // 监听消息发送事件
          if (event_types.MESSAGE_SENT) {
            eventSource.on(event_types.MESSAGE_SENT, debouncedParse);
          }

          // 监听消息接收事件
          if (event_types.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, debouncedParse);
          }

          // 监听聊天变化事件
          if (event_types.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, debouncedParse);
          }
        } else {
          // 减少重试频率，从2秒改为5秒
          setTimeout(() => {
            this.setupSillyTavernEventListeners();
          }, 5000);
        }
      } catch (error) {
        console.warn('[Shop App] 设置SillyTavern事件监听器失败:', error);
      }
    }

    // 防抖函数
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

    // 从上下文解析商品信息（学习论坛应用的解析逻辑）
    parseProductsFromContext() {
      try {
        // 获取当前商品数据
        const shopData = this.getCurrentShopData();

        // 更新商品列表
        if (shopData.products.length !== this.products.length || this.hasProductsChanged(shopData.products)) {
          this.products = shopData.products;
          this.updateProductList();
        }
      } catch (error) {
        console.error('[Shop App] 解析商品信息失败:', error);
      }
    }

    /**
     * 从消息中获取当前商品数据（参考论坛应用的getCurrentForumData方法）
     */
    getCurrentShopData() {
      try {
        // 优先使用mobileContextEditor获取数据
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            // 搜索所有消息，不限制第一条
            const allContent = chatData.messages.map(msg => msg.mes || '').join('\n');
            return this.parseShopContent(allContent);
          }
        }

        // 如果没有mobileContextEditor，尝试其他方式
        const chatData = this.getChatData();
        if (chatData && chatData.length > 0) {
          // 合并所有消息内容进行解析
          const allContent = chatData.map(msg => msg.mes || '').join('\n');
          return this.parseShopContent(allContent);
        }
      } catch (error) {
        console.warn('[Shop App] 获取商品数据失败:', error);
      }

      return { products: [] };
    }

    /**
     * 从消息中实时解析商品内容（参考论坛应用的parseForumContent方法）
     */
    parseShopContent(content) {
      // 去掉标记限制，直接解析所有内容
      const products = [];

      // 解析商品格式: [商品|商品名称|商品类型|商品描述|商品价格]（'商品'是固定标识符）
      const productRegex = /\[商品\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\]]+)\]/g;

      let productMatch;
      while ((productMatch = productRegex.exec(content)) !== null) {
        const [fullMatch, name, type, description, price] = productMatch;

        // 检查是否已存在相同商品（根据名称和类型判断）
        const existingProduct = products.find(p => p.name.trim() === name.trim() && p.type.trim() === type.trim());

        if (!existingProduct) {
          const newProduct = {
            id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(), // 使用商品名称
            type: type.trim(),
            description: description.trim(),
            price: parseFloat(price.trim()) || 0,
            image: this.getProductImage(type.trim()),
            stock: Math.floor(Math.random() * 50) + 10, // 随机库存
            timestamp: new Date().toLocaleString(),
          };
          products.push(newProduct);
        }
      }

      console.log('[Shop App] 解析完成，商品数:', products.length);
      return { products };
    }

    // 检查商品是否有变化（更高效的比较方法）
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

    // 获取商品图片
    getProductImage(type) {
      const imageMap = {
        食品: '🍎',
        食物: '🍎', // 兼容"食物"写法
        饮料: '🥤',
        服装: '👔',
        数码: '📱',
        家居: '🏠',
        美妆: '💄',
        运动: '⚽',
        图书: '📚',
        玩具: '🧸',
        音乐: '🎵',
        默认: '🛒',
      };
      return imageMap[type] || imageMap['默认'];
    }

    // 获取聊天数据
    getChatData() {
      try {
        // 优先使用mobileContextEditor获取数据
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor) {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && chatData.messages.length > 0) {
            return chatData.messages;
          }
        }

        // 尝试从全局变量获取
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        // 尝试从其他可能的位置获取
        const SillyTavern = window['SillyTavern'];
        if (SillyTavern && SillyTavern.chat) {
          return SillyTavern.chat;
        }

        return [];
      } catch (error) {
        console.error('[Shop App] 获取聊天数据失败:', error);
        return [];
      }
    }

    // 获取应用内容
    getAppContent() {
      // 移除每次都解析的逻辑，改为只在需要时解析
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

    // 渲染购物页面标签页
    renderShopTabs() {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      const productCount = this.products.length;

      return `
          <div class="shop-tabs">
              <button class="shop-tab ${this.currentTab === 'productList' ? 'active' : ''}"
                      data-tab="productList">
                  商品列表 (${productCount})
              </button>
              <button class="shop-tab ${this.currentTab === 'cart' ? 'active' : ''}"
                      data-tab="cart">
                  购物车 (${totalItems})
              </button>
          </div>
      `;
    }

    // 渲染商品列表
    renderProductList() {
      console.log('[Shop App] 渲染商品列表...');

      // 获取所有产品类型
      const allTypes = ['all', ...new Set(this.products.map(p => p.type))];

      // 根据当前选择的类型过滤商品
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

      // 渲染产品类型标签栏（可折叠）
      const typeTabsHtml = this.showCategories
        ? `
          <div class="product-type-tabs">
              ${allTypes
                .map(
                  type => `
                  <button class="product-type-tab ${this.currentProductType === type ? 'active' : ''}"
                          data-type="${type}">
                      ${type === 'all' ? '全部' : type}
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
                            加入购物车
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

    // 渲染购物车
    renderCart() {
      console.log('[Shop App] 渲染购物车...');

      if (!this.cart.length) {
        return `
                <div class="shop-cart">
                    ${this.renderShopTabs()}
                    <div class="shop-empty-state">
                        <div class="empty-icon">🛒</div>
                        <div class="empty-title">รถเข็นว่างเปล่า</div>
                        <div class="empty-subtitle">ไปเลือกของที่ชอบกันเถอะ</div>
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
                        <div class="cart-count">รวมทั้งหมด${totalItems}ชิ้น</div>
                        <div class="cart-total">
                            <span class="total-label">ราคารวมทั้งหมด：¥$：</span>
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

    // 渲染结算页面
    renderCheckout() {
      console.log('[Shop App] 渲染结算页面...');

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
                        <div class="total-price">ราคารวมทั้งหมด：¥${totalPrice.toFixed(2)}</div>
                    </div>
                </div>
                <div class="checkout-actions">
                    <button class="back-to-cart-btn">กลับไปยังรถเข็น</button>
                    <button class="confirm-order-btn">ยืนยันคำสั่งซื้อ</button>
                </div>
            </div>
        `;
    }

    // 更新商品列表显示
    updateProductList() {
      if (this.currentView === 'productList') {
        this.updateAppContent();
      }
    }

    // 更新应用内容
    updateAppContent(preserveScrollPosition = false) {
      const appContent = document.getElementById('app-content');
      if (appContent) {
        // 保存滚动位置
        let scrollTop = 0;
        if (preserveScrollPosition) {
          const scrollContainer = appContent.querySelector('.product-grid, .cart-items');
          if (scrollContainer) {
            scrollTop = scrollContainer.scrollTop;
          }
        }

        appContent.innerHTML = this.getAppContent();
        this.bindEvents();

        // 恢复滚动位置
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

    // 渲染应用（供测试页面使用）
    renderApp() {
      return this.getAppContent();
    }

    // 绑定事件
    bindEvents() {
      console.log('[Shop App] 绑定事件...');

      // 添加到购物车
      document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const productId = e.target?.getAttribute('data-product-id');
          this.addToCart(productId);
        });
      });

      // 购物车数量调整
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

      // 删除购物车项目
      document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const productId = e.target?.getAttribute('data-product-id');
          this.removeFromCart(productId);
        });
      });

      // 导航按钮
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

      // 购物页面标签页切换
      document.querySelectorAll('.shop-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const tab = e.target?.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });

      // 产品类型标签页切换
      document.querySelectorAll('.product-type-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const type = e.target?.getAttribute('data-type');
          this.switchProductType(type);
        });
      });
    }

    // 切换购物页面标签页
    switchTab(tab) {
      console.log('[Shop App] 切换标签页:', tab);
      this.currentTab = tab;
      this.currentView = tab;
      this.updateAppContent();
    }

    // 切换产品类型
    switchProductType(type) {
      console.log('[Shop App] 切换产品类型:', type);
      this.currentProductType = type;
      this.updateAppContent();
    }

    // 切换分类显示
    toggleCategories() {
      console.log('[Shop App] 切换分类显示:', !this.showCategories);
      this.showCategories = !this.showCategories;
      this.updateAppContent();
    }

    // 添加到购物车
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

      this.showToast(`${product.name} 已添加到购物车`, 'success');
      this.updateCartBadge();
    }

    // 更新购物车数量
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

      this.updateAppContent(true); // 保持滚动位置
      this.updateCartBadge();
    }

    // 从购物车移除
    removeFromCart(productId) {
      this.cart = this.cart.filter(item => item.id !== productId);
      this.updateAppContent(true); // 保持滚动位置
      this.updateCartBadge();
    }

    // 更新购物车徽章
    updateCartBadge() {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      // 只更新购物车标签页的数量显示，不重新渲染整个页面
      const cartTab = document.querySelector('.shop-tab[data-tab="cart"]');
      if (cartTab) {
        cartTab.textContent = `购物车 (${totalItems})`;
      }
    }

    // 显示商品列表
    showProductList() {
      this.currentView = 'productList';
      this.currentTab = 'productList';
      this.updateAppContent();
      this.updateHeader();
    }

    // 显示购物车
    showCart() {
      this.currentView = 'cart';
      this.currentTab = 'cart';
      this.updateAppContent();
      this.updateHeader();
    }

    // 显示结算页面
    showCheckout() {
      if (this.cart.length === 0) {
        this.showToast('购物车为空', 'warning');
        return;
      }

      this.currentView = 'checkout';
      this.updateAppContent();
      this.updateHeader();
    }

    // 确认订单
    confirmOrder() {
      if (this.cart.length === 0) {
        this.showToast('购物车为空', 'warning');
        return;
      }

      // 生成订单摘要
      const orderSummary = this.generateOrderSummary();

      // 发送消息到SillyTavern
      this.sendOrderToSillyTavern(orderSummary);

      // 清空购物车
      this.cart = [];
      this.updateCartBadge();

      // 显示成功消息
      this.showToast('订单已确认！', 'success');

      // 返回商品列表
      setTimeout(() => {
        this.showProductList();
      }, 1500);
    }

    // 生成订单摘要
    generateOrderSummary() {
      const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

      const itemsList = this.cart
        .map(item => `${item.name} x${item.quantity} = ¥${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

      return `订单确认：
${itemsList}
总计：${totalItems}件商品，¥${totalPrice.toFixed(2)}`;
    }

    // 发送订单到SillyTavern（改为发送带花费描述和背包格式）
    sendOrderToSillyTavern(orderSummary) {
      try {
        console.log('[Shop App] 发送订单到SillyTavern');

        // 计算总价和获得的商品名称
        const totalPrice = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemNames = this.cart.map(item => `${item.name}x${item.quantity}`).join('、');

        // 生成背包格式的消息：[背包|商品名|商品类型|商品描述|数量]
        const bagMessages = this.cart
          .map(item => `[背包|${item.name}|${item.type}|${item.description}|${item.quantity}]`)
          .join('');

        // 拼接最终消息
        const finalMessage = `用户在商城购买物品，花费${totalPrice}元（请正确更新用户账户余额变量，扣除用户本次的购物花费），获得了${itemNames}。${bagMessages}`;
        console.log('[Shop App] 最终发送消息:', finalMessage);

        // 使用与消息app相同的发送方式
        this.sendToSillyTavern(finalMessage);
      } catch (error) {
        console.error('[Shop App] 发送订单失败:', error);
      }
    }

    // 发送查看商品消息
    sendViewProductsMessage() {
      try {
        console.log('[Shop App] 发送查看商品消息');

        const message = '查看商品';

        // 使用与消息app相同的发送方式
        this.sendToSillyTavern(message);
      } catch (error) {
        console.error('[Shop App] 发送查看商品消息失败:', error);
      }
    }

    // 统一的发送消息方法（参考消息app的sendToChat方法）
    async sendToSillyTavern(message) {
      try {
        console.log('[Shop App] 🔄 使用新版发送方法 v2.0 - 发送消息到SillyTavern:', message);

        // 方法1: 直接使用DOM元素（与消息app相同的方式）
        const originalInput = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (!originalInput || !sendButton) {
          console.error('[Shop App] 找不到输入框或发送按钮元素');
          return this.sendToSillyTavernBackup(message);
        }

        // 检查输入框是否可用
        if (originalInput.disabled) {
          console.warn('[Shop App] 输入框被禁用');
          return false;
        }

        // 检查发送按钮是否可用
        if (sendButton.classList.contains('disabled')) {
          console.warn('[Shop App] 发送按钮被禁用');
          return false;
        }

        // 设置值
        originalInput.value = message;
        console.log('[Shop App] 已设置输入框值:', originalInput.value);

        // 触发输入事件
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 延迟点击发送按钮
        await new Promise(resolve => setTimeout(resolve, 300));
        sendButton.click();
        console.log('[Shop App] 已点击发送按钮');

        return true;
      } catch (error) {
        console.error('[Shop App] 发送消息时出错:', error);
        return this.sendToSillyTavernBackup(message);
      }
    }

    // 备用发送方法
    async sendToSillyTavernBackup(message) {
      try {
        console.log('[Shop App] 尝试备用发送方法:', message);

        // 尝试查找其他可能的输入框
        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"]');

        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          // 模拟键盘事件
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Shop App] 备用发送方法失败:', error);
        return false;
      }
    }

    // 手动刷新商品列表
    refreshProductList() {
      console.log('[Shop App] 手动刷新商品列表');
      this.parseProductsFromContext();
      this.updateAppContent();
    }

    // 销毁应用，清理资源
    destroy() {
      console.log('[Shop App] 销毁应用，清理资源');

      // 清理定时器
      if (this.contextCheckInterval) {
        clearInterval(this.contextCheckInterval);
        this.contextCheckInterval = null;
      }

      // 重置状态
      this.eventListenersSetup = false;
      this.isAutoRenderEnabled = false;

      // 清空数据
      this.products = [];
      this.cart = [];
    }

    // 更新header
    updateHeader() {
      // 通知mobile-phone更新header
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'shop',
          title: this.getViewTitle(),
          view: this.currentView,
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    // 获取视图标题
    getViewTitle() {
      return '购物';
    }

    // 显示提示消息
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

  // 创建全局实例
  window.ShopApp = ShopApp;
  window.shopApp = new ShopApp();
} // 结束类定义检查

// 全局函数供mobile-phone.js调用
window.getShopAppContent = function () {
  console.log('[Shop App] 获取购物应用内容');

  if (!window.shopApp) {
    console.error('[Shop App] shopApp实例不存在');
    return '<div class="error-message">购物应用加载失败</div>';
  }

  try {
    return window.shopApp.getAppContent();
  } catch (error) {
    console.error('[Shop App] 获取应用内容失败:', error);
    return '<div class="error-message">获取内容失败</div>';
  }
};

window.bindShopAppEvents = function () {
  console.log('[Shop App] 绑定购物应用事件');

  if (!window.shopApp) {
    console.error('[Shop App] shopApp实例不存在');
    return;
  }

  try {
    window.shopApp.bindEvents();
  } catch (error) {
    console.error('[Shop App] 绑定事件失败:', error);
  }
};

// 供mobile-phone.js调用的额外功能
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

// 调试和测试功能
window.shopAppRefresh = function () {
  if (window.shopApp) {
    window.shopApp.refreshProductList();
  }
};

window.shopAppDebugInfo = function () {
  if (window.shopApp) {
    console.log('[Shop App Debug] 当前商品数量:', window.shopApp.products.length);
    console.log('[Shop App Debug] 商品列表:', window.shopApp.products);
    console.log('[Shop App Debug] 购物车:', window.shopApp.cart);
    console.log('[Shop App Debug] 当前视图:', window.shopApp.currentView);
    console.log('[Shop App Debug] 事件监听器设置:', window.shopApp.eventListenersSetup);
    console.log('[Shop App Debug] 自动渲染启用:', window.shopApp.isAutoRenderEnabled);
  }
};

// 性能优化：销毁应用实例
window.shopAppDestroy = function () {
  if (window.shopApp) {
    window.shopApp.destroy();
    console.log('[Shop App] 应用已销毁');
  }
};

// 强制重新加载应用（清除缓存）
window.shopAppForceReload = function () {
  console.log('[Shop App] 🔄 强制重新加载应用...');

  // 销毁现有实例
  if (window.shopApp) {
    window.shopApp.destroy();
  }

  // 重新创建实例
  window.shopApp = new ShopApp();
  console.log('[Shop App] ✅ 应用已重新加载 - 版本 2.0');
};

// 检查发送方法版本
window.shopAppCheckVersion = function () {
  console.log('[Shop App] 📋 版本检查:');
  console.log('- sendToSillyTavern 方法:', typeof window.shopApp?.sendToSillyTavern);
  console.log('- sendOrderToSillyTavern 方法:', typeof window.shopApp?.sendOrderToSillyTavern);
  console.log('- sendViewProductsMessage 方法:', typeof window.shopApp?.sendViewProductsMessage);

  if (window.shopApp?.sendToSillyTavern) {
    console.log('✅ 新版发送方法已加载');
  } else {
    console.log('❌ 新版发送方法未找到，请重新加载页面');
  }
};

// 初始化
console.log('[Shop App] 购物应用模块加载完成 - 版本 2.0 (背包格式支持)');
