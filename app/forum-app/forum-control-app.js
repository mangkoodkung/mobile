/**
 * Forum Control App - 论坛控制应用
 * 为mobile-phone.js提供论坛控制功能
 */

class ForumControlApp {
  constructor() {
    this.currentView = 'control'; // 'control'
    this.init();
  }

  init() {
    console.log('[Forum Control App] 论坛控制应用初始化');
  }

  // 获取应用内容
  getAppContent() {
    switch (this.currentView) {
      case 'control':
        return this.renderForumControl();
      default:
        return this.renderForumControl();
    }
  }

  // 渲染论坛控制面板
  renderForumControl() {
    // 获取当前设置
    const currentSettings = window.forumManager
      ? window.forumManager.currentSettings
      : {
          selectedStyle: '贴吧老哥',
          threshold: 5,
          autoUpdate: true,
        };

    // 获取自定义前缀
    const customPrefix = window.forumStyles ? window.forumStyles.getCustomPrefix() : '';

    return `
            <div class="forum-control-app">
                <div class="control-section">
                    <h3 class="section-title">📰 ตั้งค่าฟอรัม</h3>

                    <div class="form-group">
                        <label class="form-label">เลือกสไตล์ฟอรัม</label>
                        <select id="forum-style-select" class="form-select">
                            <!-- 风格选项将通过JavaScript动态加载 -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Prefix ที่กำหนดเอง</label>
                        <textarea id="forum-custom-prefix" class="form-textarea" placeholder="ใส่ prefix ที่กำหนดเอง จะถูกเพิ่มไว้ด้านหน้าของพรอมต์สไตล์...">${customPrefix}</textarea>
                        <div class="form-hint">คำแนะนำ: ใช้สำหรับเพิ่มคำสั่งพิเศษ บทบาท หรือข้อกำหนดการสร้าง</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">เกณฑ์ข้อความ</label>
                        <input type="number" id="forum-threshold" class="form-input" value="${
                          currentSettings.threshold
                        }" min="1" max="100" placeholder="จำนวนข้อความที่ทริกเกอร์การสร้างฟอรัม">
                        <div class="form-hint">เมื่อจำนวนข้อความใหม่ถึงค่านี้ จะสร้างเนื้อหาฟอรัมอัตโนมัติ</div>
                    </div>

                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="forum-auto-update" ${
                              currentSettings.autoUpdate ? 'checked' : ''
                            }>
                            <span class="checkbox-label">สร้างเนื้อหาฟอรัมอัตโนมัติ</span>
                        </label>
                    </div>
                </div>

                <div class="control-section">
                    <h3 class="section-title">🔧 แผงควบคุม</h3>

                    <div class="button-group">
                        <button id="generate-forum-now" class="control-btn primary">
                            <span class="btn-icon">🚀</span>
                            <span>สร้างฟอรัมทันที</span>
                        </button>
                        <button id="clear-forum-content" class="control-btn danger">
                            <span class="btn-icon">🗑️</span>
                            <span>ล้างเนื้อหาฟอรัม</span>
                        </button>
                        <button id="forum-settings" class="control-btn secondary">
                            <span class="btn-icon">⚙️</span>
                            <span>ตั้งค่า API</span>
                        </button>
                    </div>
                </div>

                <div class="control-section">
                    <h3 class="section-title">📊 ข้อมูลสถานะ</h3>
                    <div id="forum-status" class="status-display">
                        状态: 就绪
                    </div>
                </div>
            </div>
        `;
  }

  // 绑定事件
  bindEvents() {
    // 初始化风格选择器
    this.initializeStyleSelector();

    // 风格选择
    const styleSelect = document.getElementById('forum-style-select');
    if (styleSelect) {
      styleSelect.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.selectedStyle = e.target.value;
          window.forumManager.saveSettings();
        }
      });
    }

    // 自定义前缀
    const customPrefixTextarea = document.getElementById('forum-custom-prefix');
    if (customPrefixTextarea) {
      customPrefixTextarea.addEventListener('input', e => {
        if (window.forumStyles) {
          window.forumStyles.setCustomPrefix(e.target.value);
        }
      });
    }

    // 消息阈值
    const thresholdInput = document.getElementById('forum-threshold');
    if (thresholdInput) {
      thresholdInput.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.threshold = parseInt(e.target.value);
          window.forumManager.saveSettings();
        }
      });
    }

    // 自动更新开关
    const autoUpdateCheckbox = document.getElementById('forum-auto-update');
    if (autoUpdateCheckbox) {
      autoUpdateCheckbox.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.autoUpdate = e.target.checked;
          window.forumManager.saveSettings();
        }
      });
    }

    // 立即生成论坛
    const generateBtn = document.getElementById('generate-forum-now');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        console.log('[Forum Control] 🔘 立即生成按钮被点击');
        console.log('[Forum Control] 🔍 检查MobileContext:', !!window.MobileContext);
        console.log('[Forum Control] 🔍 检查forceGenerateForum:', !!window.MobileContext?.forceGenerateForum);
        console.log('[Forum Control] 🔍 检查forumManager:', !!window.forumManager);

        try {
          generateBtn.disabled = true;
          generateBtn.textContent = 'กำลังสร้าง...';

          if (window.MobileContext && window.MobileContext.forceGenerateForum) {
            console.log('[Forum Control] 🚀 调用强制生成命令');
            const result = await window.MobileContext.forceGenerateForum();
            if (!result) {
              console.warn('[Forum Control] 强制生成返回false');
            } else {
              console.log('[Forum Control] ✅ 强制生成成功');
            }
          } else if (window.forumManager) {
            console.log('[Forum Control] 🚀 调用强制生成方法，force=true');
            const result = await window.forumManager.generateForumContent(true); // 强制生成，不检查消息增量
            if (!result) {
              console.warn('[Forum Control] 生成论坛内容返回false');
            } else {
              console.log('[Forum Control] ✅ 生成成功');
            }
          } else {
            console.error('[Forum Control] 论坛管理器和控制台命令都未找到');
            alert('ตัวจัดการฟอรัมยังไม่โหลด กรุณารีเฟรชหน้าและลองใหม่');
          }
        } catch (error) {
          console.error('[Forum Control] 强制生成出错:', error);
          alert(`สร้างล้มเหลว: ${error.message}`);
        } finally {
          // 恢复按钮状态
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<span class="btn-icon">🚀</span><span>สร้างฟอรัมทันที</span>';

          // 强制重置forumManager状态，防止卡住
          setTimeout(() => {
            if (window.forumManager && window.forumManager.isProcessing) {
              console.warn('[Forum Control] 强制重置处理状态');
              window.forumManager.isProcessing = false;
            }
          }, 3000);
        }
      });
    }

    // 清除论坛内容
    const clearBtn = document.getElementById('clear-forum-content');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        try {
          if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างเนื้อหาฟอรัมทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            return;
          }

          clearBtn.disabled = true;
          clearBtn.textContent = 'กำลังล้าง...';

          if (window.forumManager) {
            await window.forumManager.clearForumContent();
          } else {
            console.error('[Forum Control] forumManager未找到');
            alert('ตัวจัดการฟอรัมยังไม่โหลด กรุณารีเฟรชหน้าและลองใหม่');
          }
        } catch (error) {
          console.error('[Forum Control] 清除论坛内容出错:', error);
          alert(`ล้างล้มเหลว: ${error.message}`);
        } finally {
          // 恢复按钮状态
          clearBtn.disabled = false;
          clearBtn.innerHTML = '<span class="btn-icon">🗑️</span><span>ล้างเนื้อหาฟอรัม</span>';

          // 强制重置forumManager状态，防止卡住
          setTimeout(() => {
            if (window.forumManager && window.forumManager.isProcessing) {
              console.warn('[Forum Control] 强制重置处理状态');
              window.forumManager.isProcessing = false;
            }
          }, 3000);
        }
      });
    }

    // API设置
    const settingsBtn = document.getElementById('forum-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (window.mobileCustomAPIConfig) {
          window.mobileCustomAPIConfig.showAPIPanel();
        } else {
          alert('โมดูลตั้งค่า API ยังไม่โหลด');
        }
      });
    }
  }

  // 更新状态显示
  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('forum-status');
    if (statusEl) {
      const colors = {
        info: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c',
      };

      statusEl.textContent = `สถานะ: ${message}`;
      statusEl.style.color = colors[type] || colors.info;
    }
  }

  // 获取当前状态
  getStatus() {
    return {
      currentView: this.currentView,
      forumManagerAvailable: !!window.forumManager,
      forumStylesAvailable: !!window.forumStyles,
      apiConfigAvailable: !!window.mobileCustomAPIConfig,
    };
  }

  // 初始化风格选择器
  initializeStyleSelector() {
    const styleSelect = document.getElementById('forum-style-select');
    if (!styleSelect) return;

    try {
      // 获取当前选中的风格
      const currentStyle = window.forumManager?.currentSettings?.selectedStyle || '贴吧老哥';

      // 清空现有选项
      styleSelect.innerHTML = '';

      // 添加预设风格
      if (window.forumStyles && window.forumStyles.styles) {
        const presetStyles = Object.keys(window.forumStyles.styles);
        if (presetStyles.length > 0) {
          const presetGroup = document.createElement('optgroup');
          presetGroup.label = '预设风格';

          presetStyles.forEach(styleName => {
            const option = document.createElement('option');
            option.value = styleName;
            option.textContent = styleName;
            if (styleName === currentStyle) {
              option.selected = true;
            }
            presetGroup.appendChild(option);
          });

          styleSelect.appendChild(presetGroup);
        }
      }

      // 添加自定义风格
      if (window.forumStyles && window.forumStyles.getAllCustomStyles) {
        const customStyles = window.forumStyles.getAllCustomStyles();
        if (customStyles.length > 0) {
          const customGroup = document.createElement('optgroup');
          customGroup.label = '自定义风格';

          customStyles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.name;
            option.textContent = `${style.name} (กำหนดเอง)`;
            if (style.name === currentStyle) {
              option.selected = true;
            }
            customGroup.appendChild(option);
          });

          styleSelect.appendChild(customGroup);
        }
      }

      // 如果没有找到当前风格，默认选择第一个
      if (!styleSelect.value && styleSelect.options.length > 0) {
        styleSelect.selectedIndex = 0;
        if (window.forumManager) {
          window.forumManager.currentSettings.selectedStyle = styleSelect.value;
          window.forumManager.saveSettings();
        }
      }

      console.log('[ForumControlApp] 风格选择器已初始化，共', styleSelect.options.length, '个选项');
    } catch (error) {
      console.error('[ForumControlApp] 初始化风格选择器失败:', error);

      // 降级处理：添加默认风格
      styleSelect.innerHTML = '<option value="贴吧老哥">贴吧老哥</option>';
      styleSelect.value = '贴吧老哥';
    }
  }

  // 刷新风格选择器（供外部调用）
  refreshStyleSelector() {
    this.initializeStyleSelector();
  }
}

// 创建全局实例
window.forumControlApp = new ForumControlApp();

// 获取论坛控制应用内容的全局函数
window.getForumControlAppContent = function () {
  return window.forumControlApp.getAppContent();
};

// 绑定论坛控制应用事件的全局函数
window.bindForumControlEvents = function () {
  window.forumControlApp.bindEvents();
};

// 创建全局实例
window.ForumControlApp = ForumControlApp;
window.forumControlApp = new ForumControlApp();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ForumControlApp;
}

console.log('[Forum Control App] 论坛控制应用模块加载完成');
