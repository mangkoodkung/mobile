// ==Mobile Custom API Config==
// @name         Mobile Custom API Configuration
// @version      1.0.0
// @description  ตัวจัดการการตั้งค่า API กำหนดเองสำหรับมือถือ รองรับผู้ให้บริการ API หลากหลาย
// @author       cd
// @license      MIT

/**
 * ตัวจัดการการตั้งค่า API กำหนดเองสำหรับมือถือ
 * พอร์ตมาจากฟังก์ชันการตั้งค่า API ของแอปฟอรัมและปลั๊กอิน real-time-status-bar
 */
class MobileCustomAPIConfig {
  constructor() {
    this.isInitialized = false;
    this.currentSettings = this.getDefaultSettings();
    this.supportedProviders = this.getSupportedProviders();

    // เริ่มต้น URL ภายในสำหรับ Gemini
    this.geminiUrl = this.supportedProviders.gemini.defaultUrl;

    // ผูกกับออบเจกต์ window ทั่วโลก
    window.mobileCustomAPIConfig = this;

    console.log('[Mobile API Config] สร้างตัวจัดการการตั้งค่า API แบบกำหนดเองแล้ว');
  }

  /**
   * รับค่าการตั้งค่าเริ่มต้น
   */
  getDefaultSettings() {
    return {
      enabled: false,
      provider: 'openai', // แก้ไข: ค่าเริ่มต้นใช้ OpenAI
      apiUrl: '',
      apiKey: '',
      model: '',
      temperature: 0.8,
      maxTokens: 30000,
      useProxy: false,
      proxyUrl: '',
      timeout: 30000,
      retryCount: 3,
      // การตั้งค่าขั้นสูง
      customHeaders: {},
      systemPrompt: '',
      streamEnabled: false,
    };
  }

  /**
   * รับการกำหนดค่าผู้ให้บริการ API ที่รองรับ
   */
  getSupportedProviders() {
    return {
      openai: {
        name: 'OpenAI',
        defaultUrl: 'https://api.openai.com',
        urlSuffix: 'v1/chat/completions',
        modelsEndpoint: 'v1/models',
        defaultModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
        authType: 'Bearer',
        requiresKey: true,
        icon: '🤖',
      },
      gemini: {
        name: 'Google Gemini',
        defaultUrl: 'https://generativelanguage.googleapis.com',
        urlSuffix: 'v1beta/models/{model}:generateContent',
        modelsEndpoint: 'v1beta/models',
        defaultModels: [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.0-pro',
          'gemini-1.5-pro-latest',
          'gemini-1.5-flash-latest',
        ],
        authType: 'Key',
        requiresKey: true,
        icon: '💎',
      },
      custom: {
        name: 'API กำหนดเอง',
        defaultUrl: '',
        urlSuffix: 'chat/completions',
        modelsEndpoint: 'models',
        defaultModels: [],
        authType: 'Bearer',
        requiresKey: true,
        icon: '⚙️',
      },
    };
  }

  /**
   * เริ่มต้นตัวจัดการการตั้งค่า API
   */
  async initialize() {
    try {
      await this.loadSettings();
      this.createUI();
      this.bindEvents();
      this.isInitialized = true;

      console.log('[Mobile API Config] ✅ เริ่มต้นตัวจัดการการตั้งค่า API แบบกำหนดเองเสร็จสมบูรณ์');
      console.log('[Mobile API Config] 📋 การตั้งค่าปัจจุบัน:', {
        provider: this.currentSettings.provider,
        enabled: this.currentSettings.enabled,
        apiUrl: this.currentSettings.apiUrl || '(ไม่ได้ตั้งค่า)',
        hasApiKey: !!this.currentSettings.apiKey,
        model: this.currentSettings.model || '(ไม่ได้ตั้งค่า)',
        ผู้ให้บริการที่รองรับ: Object.keys(this.supportedProviders),
      });
      return true;
    } catch (error) {
      console.error('[Mobile API Config] ❌ การเริ่มต้นล้มเหลว:', error);
      return false;
    }
  }

  /**
   * โหลดการตั้งค่า
   */
  async loadSettings() {
    try {
      const savedSettings = localStorage.getItem('mobile_custom_api_settings');
      if (savedSettings) {
        this.currentSettings = { ...this.getDefaultSettings(), ...JSON.parse(savedSettings) };
      }

      console.log('[Mobile API Config] โหลดการตั้งค่าแล้ว:', this.currentSettings);
    } catch (error) {
      console.error('[Mobile API Config] โหลดการตั้งค่าล้มเหลว:', error);
      this.currentSettings = this.getDefaultSettings();
    }
  }

  /**
   * บันทึกการตั้งค่า
   */
  async saveSettings() {
    try {
      localStorage.setItem('mobile_custom_api_settings', JSON.stringify(this.currentSettings));
      console.log('[Mobile API Config] บันทึกการตั้งค่าแล้ว');

      // ทริกเกอร์เหตุการณ์อัปเดตการตั้งค่า
      document.dispatchEvent(
        new CustomEvent('mobile-api-config-updated', {
          detail: this.currentSettings,
        }),
      );

      return true;
    } catch (error) {
      console.error('[Mobile API Config] บันทึกการตั้งค่าล้มเหลว:', error);
      return false;
    }
  }

  /**
   * สร้าง UI การตั้งค่า API
   */
  createUI() {
    // สร้างปุ่มเรียกใช้งาน
    this.createTriggerButton();

    // สร้างแผงการตั้งค่า
    this.createConfigPanel();
  }

  /**
   * สร้างปุ่มเรียกใช้งาน
   */
  createTriggerButton() {
    // ตรวจสอบว่ามีปุ่มอยู่แล้วหรือไม่
    if (document.getElementById('mobile-api-config-trigger')) {
      return;
    }

    const triggerButton = document.createElement('button');
    triggerButton.id = 'mobile-api-config-trigger';
    triggerButton.className = 'mobile-api-config-btn';
    triggerButton.innerHTML = '🔧';
    triggerButton.title = 'ตั้งค่า API';
    triggerButton.style.cssText = `
            position: fixed;
            bottom: 200px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #8B5CF6, #EF4444);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 9997;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

    // เอฟเฟกต์ Hover
    triggerButton.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
    });

    triggerButton.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    });

    // เหตุการณ์คลิก
    triggerButton.addEventListener('click', () => {
      this.showConfigPanel();
    });

    document.body.appendChild(triggerButton);
    console.log('[Mobile API Config] ✅ สร้างปุ่มเรียกใช้งานแล้ว');
  }

  /**
   * สร้างแผงการตั้งค่า
   */
  createConfigPanel() {
    if (document.getElementById('mobile-api-config-panel')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'mobile-api-config-panel';
    panel.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            backdrop-filter: blur(5px);
        `;

    const content = document.createElement('div');
    content.className = 'mobile-api-config-content';
    content.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 15px;
            padding: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

    content.innerHTML = this.getConfigPanelHTML();
    panel.appendChild(content);
    document.body.appendChild(panel);

    console.log('[Mobile API Config] ✅ สร้างแผงการตั้งค่าแล้ว');
  }

  /**
   * รับ HTML ของแผงการตั้งค่า
   */
  getConfigPanelHTML() {
    const providers = this.supportedProviders;
    const settings = this.currentSettings;

    return `
            <div class="mobile-api-config-header">
                <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">
                    ⚙️ การตั้งค่า API
                </h3>
                <button id="close-api-config" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>

            <div class="mobile-api-config-form">
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                        <input type="checkbox" id="api-enabled" ${settings.enabled ? 'checked' : ''}>
                        เปิดใช้งาน API กำหนดเอง
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">ผู้ให้บริการ API:</label>
                    <select id="api-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background-color: #fff; color: #000;">
                        ${Object.entries(providers)
                          .map(
                            ([key, provider]) =>
                              `<option value="${key}" ${key === settings.provider ? 'selected' : ''}>${provider.icon} ${
                                provider.name
                              }</option>`,
                          )
                          .join('')}
                    </select>
                </div>

                <div style="margin-bottom: 15px;" id="api-url-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API URL:</label>
                    <input type="text" id="api-url" placeholder="https://api.openai.com"
                           value="${settings.apiUrl}"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                    <small style="color: #666; font-size: 12px;">เว้นว่างเพื่อใช้ URL เริ่มต้น</small>
                </div>

                <div style="margin-bottom: 15px;" id="api-key-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">คีย์ API:</label>
                    <div style="position: relative;">
                        <input type="password" id="api-key" placeholder="sk-... หรือ AIza..."
                               value="${settings.apiKey}"
                               style="width: 100%; padding: 8px 35px 8px 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                        <button type="button" id="toggle-api-key" style="
                            position: absolute;
                            right: 8px;
                            top: 50%;
                            transform: translateY(-50%);
                            background: none;
                            border: none;
                            cursor: pointer;
                            color: #666;
                        ">👁️</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">โมเดล:</label>
                    <div style="display: flex; gap: 10px;">
                        <select id="api-model" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">เลือกโมเดล...</option>
                        </select>
                        <button type="button" id="refresh-models" style="
                            padding: 8px 15px;
                            background: #007bff;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        ">📥</button>
                    </div>
                </div>

                <details style="margin-bottom: 15px;">
                    <summary style="cursor: pointer; font-weight: 500; margin-bottom: 10px;color: #000;">⚙️ การตั้งค่าขั้นสูง</summary>

                    <div style="margin-left: 15px;">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;color: #000;">Temperature (0-2):</label>
                            <input type="range" id="api-temperature" min="0" max="2" step="0.1"
                                   value="${settings.temperature}"
                                   style="width: 100%;">
                            <span id="temperature-value" style="font-size: 12px; color: #666;">${
                              settings.temperature
                            }</span>
                        </div>

                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">Max Tokens:</label>
                            <input type="number" id="api-max-tokens" min="1" max="80000"
                                   value="${settings.maxTokens}"
                                   style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;background-color: #fff;color: #000;">
                        </div>

                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">System Prompt:</label>
                            <textarea id="api-system-prompt" rows="3"
                                      placeholder="System Prompt (ไม่บังคับ)..."
                                      style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; resize: vertical; box-sizing: border-box;">${
                                        settings.systemPrompt
                                      }</textarea>
                        </div>
                    </div>
                </details>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" id="test-api-connection" style="
                        flex: 1;
                        padding: 12px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">🧪 ทดสอบการเชื่อมต่อ</button>

                    <button type="button" id="save-api-config" style="
                        flex: 1;
                        padding: 12px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">💾 บันทึกการตั้งค่า</button>
                </div>

                <div id="api-config-status" style="
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 5px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    font-size: 14px;
                    display: none;
                "></div>
            </div>
        `;
  }

  /**
   * ผูกเหตุการณ์
   */
  bindEvents() {
    // ปิดแผง
    $(document).on('click', '#close-api-config', () => {
      this.hideConfigPanel();
    });

    // คลิกด้านนอกแผงเพื่อปิด
    $(document).on('click', '#mobile-api-config-panel', e => {
      if (e.target.id === 'mobile-api-config-panel') {
        this.hideConfigPanel();
      }
    });

    // การเปลี่ยนแปลงการเลือกผู้ให้บริการ
    $(document).on('change', '#api-provider', e => {
      this.onProviderChange(e.target.value);
    });

    // สลับการแสดงคีย์
    $(document).on('click', '#toggle-api-key', () => {
      const keyInput = document.getElementById('api-key');
      const isPassword = keyInput.type === 'password';
      keyInput.type = isPassword ? 'text' : 'password';
      document.getElementById('toggle-api-key').textContent = isPassword ? '🙈' : '👁️';
    });

    // แถบเลื่อนอุณหภูมิ
    $(document).on('input', '#api-temperature', e => {
      document.getElementById('temperature-value').textContent = e.target.value;
    });

    // รีเฟรชรายการโมเดล
    $(document).on('click', '#refresh-models', () => {
      this.refreshModels();
    });

    // ทดสอบการเชื่อมต่อ
    $(document).on('click', '#test-api-connection', () => {
      this.testConnection();
    });

    // บันทึกการตั้งค่า
    $(document).on('click', '#save-api-config', () => {
      this.saveConfigFromUI();
    });
  }

  /**
   * แสดงแผงการตั้งค่า
   */
  showConfigPanel() {
    const panel = document.getElementById('mobile-api-config-panel');
    if (panel) {
      panel.style.display = 'block';
      this.updateUIFromSettings();

      // ตรวจสอบให้แน่ใจว่าสถานะการแสดงผล URL ถูกต้อง
      const currentProvider = this.currentSettings.provider;
      this.onProviderChange(currentProvider);
    }
  }

  /**
   * ซ่อนแผงการตั้งค่า
   */
  hideConfigPanel() {
    const panel = document.getElementById('mobile-api-config-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  /**
   * เมื่อการเลือกผู้ให้บริการเปลี่ยนไป
   */
  onProviderChange(providerKey) {
    const provider = this.supportedProviders[providerKey];
    if (!provider) return;

    console.log('[Mobile API Config] สลับผู้ให้บริการ:', providerKey, provider);

    // จัดการการแสดง/ซ่อนกล่องป้อนข้อมูล URL
    const urlSection = document.getElementById('api-url-section');
    const urlInput = document.getElementById('api-url');

    if (providerKey === 'gemini') {
      // Gemini: ซ่อนกล่องป้อนข้อมูล URL ใช้ URL ภายใน
      if (urlSection) {
        urlSection.style.display = 'none';
      }
      // ตั้งค่า URL ของ Gemini ภายใน แต่ไม่แสดงให้ผู้ใช้เห็น
      this.geminiUrl = provider.defaultUrl;
    } else {
      // OpenAI และ API กำหนดเอง: แสดงกล่องป้อนข้อมูล URL ให้ผู้ใช้แก้ไข
      if (urlSection) {
        urlSection.style.display = 'block';
      }

      // กู้คืนหรือตั้งค่า URL สำหรับผู้ให้บริการที่ไม่ใช่ Gemini
      if (urlInput) {
        // หากเคยบันทึก URL ของผู้ให้บริการนี้ไว้ ให้กู้คืน มิฉะนั้นใช้ค่าเริ่มต้น
        const savedUrl = this.getNonGeminiUrl(providerKey);
        urlInput.value = savedUrl || provider.defaultUrl;
        urlInput.placeholder = provider.defaultUrl;
      }
    }

    // อัปเดต Placeholder ของคีย์ API
    const keyInput = document.getElementById('api-key');
    if (keyInput) {
      if (providerKey === 'openai') {
        keyInput.placeholder = 'sk-...';
      } else if (providerKey === 'gemini') {
        keyInput.placeholder = 'AIza...';
      } else {
        keyInput.placeholder = 'ป้อนคีย์ API...';
      }
    }

    // แสดง/ซ่อนกล่องป้อนข้อมูลคีย์
    const keySection = document.getElementById('api-key-section');
    if (keySection) {
      keySection.style.display = provider.requiresKey ? 'block' : 'none';
    }

    // อัปเดตรายการโมเดล
    this.updateModelList(provider.defaultModels);
  }

  /**
   * รับ URL ที่บันทึกไว้สำหรับผู้ให้บริการที่ไม่ใช่ Gemini
   */
  getNonGeminiUrl(providerKey) {
    const saved = localStorage.getItem(`mobile_api_url_${providerKey}`);
    return saved || '';
  }

  /**
   * บันทึก URL สำหรับผู้ให้บริการที่ไม่ใช่ Gemini
   */
  saveNonGeminiUrl(providerKey, url) {
    if (providerKey !== 'gemini') {
      localStorage.setItem(`mobile_api_url_${providerKey}`, url);
    }
  }

  /**
   * อัปเดตรายการโมเดล
   */
  updateModelList(models) {
    const modelSelect = document.getElementById('api-model');
    if (!modelSelect) return;

    modelSelect.innerHTML = '<option value="">เลือกโมเดล...</option>';

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      if (model === this.currentSettings.model) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });
  }

  /**
   * อัปเดต UI จากการตั้งค่า
   */
  updateUIFromSettings() {
    const settings = this.currentSettings;

    // อัปเดตฟิลด์ต่างๆ
    const elements = {
      'api-enabled': settings.enabled,
      'api-provider': settings.provider,
      'api-url': settings.apiUrl,
      'api-key': settings.apiKey,
      'api-model': settings.model,
      'api-temperature': settings.temperature,
      'api-max-tokens': settings.maxTokens,
      'api-system-prompt': settings.systemPrompt,
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });

    // อัปเดตการแสดงผลอุณหภูมิ
    const tempValue = document.getElementById('temperature-value');
    if (tempValue) {
      tempValue.textContent = settings.temperature;
    }
  }

  /**
   * บันทึกการตั้งค่าจาก UI
   */
  async saveConfigFromUI() {
    try {
      const provider = document.getElementById('api-provider')?.value || 'openai';
      let apiUrl;

      if (provider === 'gemini') {
        // Gemini ใช้ URL ภายใน
        apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
      } else {
        // ผู้ให้บริการอื่นรับ URL จากกล่องป้อนข้อมูลและบันทึก
        apiUrl = document.getElementById('api-url')?.value || '';
        this.saveNonGeminiUrl(provider, apiUrl);
      }

      // รวบรวมข้อมูล UI
      const formData = {
        enabled: document.getElementById('api-enabled')?.checked || false,
        provider: provider,
        apiUrl: apiUrl,
        apiKey: document.getElementById('api-key')?.value || '',
        model: document.getElementById('api-model')?.value || '',
        temperature: parseFloat(document.getElementById('api-temperature')?.value || 0.8),
        maxTokens: parseInt(document.getElementById('api-max-tokens')?.value || 1500),
        systemPrompt: document.getElementById('api-system-prompt')?.value || '',
      };

      // ตรวจสอบฟิลด์ที่จำเป็น
      const providerConfig = this.supportedProviders[formData.provider];
      if (providerConfig?.requiresKey && !formData.apiKey) {
        this.showStatus('❌ กรุณากรอกคีย์ API', 'error');
        return;
      }

      // อัปเดตการตั้งค่า
      this.currentSettings = { ...this.currentSettings, ...formData };

      // บันทึกลงใน localStorage
      const saved = await this.saveSettings();

      if (saved) {
        this.showStatus('✅ บันทึกการตั้งค่าแล้ว', 'success');
        setTimeout(() => {
          this.hideConfigPanel();
        }, 1500);
      } else {
        this.showStatus('❌ บันทึกไม่สำเร็จ', 'error');
      }
    } catch (error) {
      console.error('[Mobile API Config] บันทึกการตั้งค่าล้มเหลว:', error);
      this.showStatus('❌ บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
  }

  /**
   * รีเฟรชรายการโมเดล
   */
  async refreshModels() {
    const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
    let apiUrl;

    if (provider === 'gemini') {
      // Gemini ใช้ URL ภายใน ไม่รับจากกล่องป้อนข้อมูล
      apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
    } else {
      // ผู้ให้บริการอื่นรับ URL จากกล่องป้อนข้อมูล
      apiUrl = document.getElementById('api-url')?.value || '';
    }

    const apiKey = document.getElementById('api-key')?.value || '';

    console.log('[Mobile API Config] เริ่มรีเฟรชรายการโมเดล:', {
      provider,
      apiUrl: apiUrl ? 'ตั้งค่าแล้ว' : 'ไม่ได้ตั้งค่า',
      apiKey: apiKey ? 'ตั้งค่าแล้ว' : 'ไม่ได้ตั้งค่า',
      isGemini: provider === 'gemini',
    });

    if (!apiUrl) {
      this.showStatus('❌ กรุณากรอก API URL ก่อน', 'error');
      return;
    }

    if (!apiKey) {
      this.showStatus('❌ กรุณากรอกคีย์ API ก่อน', 'error');
      return;
    }

    this.showStatus('🔄 กำลังดึงรายชื่อโมเดล...', 'info');

    try {
      const models = await this.fetchModels(provider, apiUrl, apiKey);

      if (models && models.length > 0) {
        this.updateModelList(models);
        this.showStatus(`✅ ดึงข้อมูลสำเร็จ ${models.length} โมเดล`, 'success');
        console.log('[Mobile API Config] ดึงรายชื่อโมเดลสำเร็จ:', models);
      } else {
        // ใช้รายการโมเดลเริ่มต้น
        const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
        this.updateModelList(defaultModels);
        this.showStatus(`⚠️ ใช้รายชื่อโมเดลเริ่มต้น (${defaultModels.length} โมเดล)`, 'warning');
        console.warn('[Mobile API Config] ใช้รายชื่อโมเดลเริ่มต้น:', defaultModels);
      }
    } catch (error) {
      console.error('[Mobile API Config] ดึงข้อมูลโมเดลล้มเหลว:', error);

      // ใช้รายการโมเดลเริ่มต้นเป็นทางเลือก
      const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
      if (defaultModels.length > 0) {
        this.updateModelList(defaultModels);
        this.showStatus(
          `⚠️ การร้องขอเครือข่ายล้มเหลว ใช้รายชื่อโมเดลเริ่มต้น (${defaultModels.length} โมเดล)`,
          'warning',
        );
      } else {
        this.showStatus('❌ ดึงข้อมูลโมเดลไม่สำเร็จ: ' + error.message, 'error');
      }
    }
  }

  /**
   * ดึงรายการโมเดล (เข้ากันได้กับตรรกะของ real-time-status-bar)
   */
  async fetchModels(provider, apiUrl, apiKey) {
    const providerConfig = this.supportedProviders[provider];
    if (!providerConfig) {
      throw new Error('ผู้ให้บริการที่ไม่รองรับ');
    }

    // สร้าง URL รายการโมเดล
    let modelsUrl = apiUrl.trim();
    if (!modelsUrl.endsWith('/')) {
      modelsUrl += '/';
    }

    // สร้าง URL ที่ถูกต้องตามผู้ให้บริการที่แตกต่างกัน
    if (provider === 'gemini') {
      // Gemini API ใช้โครงสร้าง URL พิเศษ
      if (!modelsUrl.includes('/v1beta/models')) {
        if (modelsUrl.endsWith('/v1/')) {
          modelsUrl = modelsUrl.replace('/v1/', '/v1beta/models');
        } else {
          modelsUrl += 'v1beta/models';
        }
      }
    } else {
      // OpenAI และ API กำหนดเองใช้การสร้าง URL มาตรฐาน
      if (modelsUrl.endsWith('/v1/')) {
        modelsUrl += 'models';
      } else if (!modelsUrl.includes('/models')) {
        modelsUrl += 'models';
      }
    }

    // สร้างส่วนหัวคำร้องขอ
    const headers = { 'Content-Type': 'application/json' };

    // ตั้งค่าวิธีการตรวจสอบสิทธิ์ที่ถูกต้องตามผู้ให้บริการ
    if (providerConfig.requiresKey && apiKey) {
      if (provider === 'gemini') {
        // Gemini API ใช้พารามิเตอร์ URL เพื่อส่งคีย์
        modelsUrl += `?key=${apiKey}`;
      } else {
        // OpenAI และ API กำหนดเองใช้การตรวจสอบสิทธิ์ Bearer
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    console.log('[Mobile API Config] คำร้องขอรายการโมเดล:', {
      provider: provider,
      url: modelsUrl.replace(apiKey || '', '[HIDDEN]'),
      headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined },
    });

    try {
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: headers,
        // ลบ timeout เนื่องจากเบราว์เซอร์บางตัวไม่รองรับ
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Mobile API Config] คำร้องขอรายการโมเดลล้มเหลว:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Mobile API Config] การตอบสนองรายการโมเดลดิบ:', data);

      // แยกวิเคราะห์การตอบสนองตามผู้ให้บริการที่แตกต่างกัน
      let models = [];
      if (provider === 'gemini') {
        // รูปแบบการตอบสนอง Gemini API: { models: [{ name: "models/gemini-pro", ... }] }
        if (data.models && Array.isArray(data.models)) {
          models = data.models
            .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => model.name.replace('models/', ''));
        } else {
          console.warn('[Mobile API Config] รูปแบบการตอบสนอง Gemini API ผิดปกติ:', data);
          // หากไม่ได้รับรูปแบบที่คาดหวัง ให้ใช้โมเดลเริ่มต้น
          models = providerConfig.defaultModels;
        }
      } else {
        // รูปแบบที่เข้ากันได้กับ OpenAI
        if (data.data && Array.isArray(data.data)) {
          // รูปแบบ OpenAI มาตรฐาน
          models = data.data.map(model => model.id);
        } else if (Array.isArray(data)) {
          // รูปแบบอาร์เรย์โดยตรง
          models = data.map(model => model.id || model.name || model);
        } else {
          console.warn('[Mobile API Config] รูปแบบการตอบสนอง API ที่เข้ากันได้กับ OpenAI ผิดปกติ:', data);
          models = providerConfig.defaultModels;
        }
      }

      const filteredModels = models.filter(model => typeof model === 'string' && model.length > 0);
      console.log('[Mobile API Config] รายการโมเดลที่แยกวิเคราะห์:', filteredModels);

      return filteredModels.length > 0 ? filteredModels : providerConfig.defaultModels;
    } catch (fetchError) {
      console.error('[Mobile API Config] การร้องขอเครือข่ายล้มเหลว:', fetchError);
      // หากการร้องขอเครือข่ายล้มเหลว ให้คืนค่ารายการโมเดลเริ่มต้น
      return providerConfig.defaultModels;
    }
  }

  /**
   * ทดสอบการเชื่อมต่อ API
   */
  async testConnection() {
    const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
    let apiUrl;

    if (provider === 'gemini') {
      // Gemini ใช้ URL ภายใน ไม่รับจากกล่องป้อนข้อมูล
      apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
    } else {
      // ผู้ให้บริการอื่นรับ URL จากกล่องป้อนข้อมูล
      apiUrl = document.getElementById('api-url')?.value || '';
    }

    const apiKey = document.getElementById('api-key')?.value || '';
    const model = document.getElementById('api-model')?.value || '';

    if (!apiUrl) {
      this.showStatus('❌ กรุณากรอก API URL ก่อน', 'error');
      return;
    }

    const providerConfig = this.supportedProviders[provider];
    if (providerConfig?.requiresKey && !apiKey) {
      this.showStatus('❌ กรุณากรอกคีย์ API ก่อน', 'error');
      return;
    }

    if (!model) {
      this.showStatus('❌ กรุณาเลือกโมเดลก่อน', 'error');
      return;
    }

    this.showStatus('🧪 กำลังทดสอบการเชื่อมต่อ...', 'info');

    try {
      const result = await this.testAPICall(provider, apiUrl, apiKey, model);
      if (result.success) {
        this.showStatus('✅ ทดสอบการเชื่อมต่อสำเร็จ!', 'success');
      } else {
        this.showStatus('❌ ทดสอบการเชื่อมต่อล้มเหลว: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('[Mobile API Config] ทดสอบการเชื่อมต่อล้มเหลว:', error);
      this.showStatus('❌ ทดสอบการเชื่อมต่อล้มเหลว: ' + error.message, 'error');
    }
  }

  /**
   * ดำเนินการเรียกทดสอบ API
   */
  async testAPICall(provider, apiUrl, apiKey, model) {
    const providerConfig = this.supportedProviders[provider];

    // สร้าง URL คำร้องขอ
    let requestUrl = apiUrl.trim();
    if (!requestUrl.endsWith('/')) {
      requestUrl += '/';
    }

    // สร้าง URL ตามผู้ให้บริการที่แตกต่างกัน
    if (provider === 'gemini') {
      // Gemini API ใช้โครงสร้าง URL พิเศษ และส่ง API key ผ่านพารามิเตอร์ URL
      requestUrl += providerConfig.urlSuffix.replace('{model}', model);
      if (apiKey) {
        requestUrl += `?key=${apiKey}`;
      }
    } else {
      // OpenAI และ API กำหนดเองใช้การสร้าง URL มาตรฐาน
      requestUrl += providerConfig.urlSuffix.replace('{model}', model);
    }

    // สร้างส่วนหัวคำร้องขอ
    const headers = { 'Content-Type': 'application/json' };

    // ตั้งค่าวิธีการตรวจสอบสิทธิ์ที่ถูกต้องตามผู้ให้บริการ
    if (providerConfig.requiresKey && apiKey && provider !== 'gemini') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // สร้างเนื้อหาคำร้องขอ
    const requestBody = this.buildTestRequestBody(provider, model);

    console.log('[Mobile API Config] คำร้องขอทดสอบ:', {
      provider: provider,
      url: requestUrl.replace(apiKey || '', '[HIDDEN]'),
      headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined },
      body: requestBody,
    });

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      timeout: 15000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log('[Mobile API Config] การตอบสนองการทดสอบ:', data);

    return { success: true, data: data };
  }

  /**
   * สร้างเนื้อหาคำร้องขอทดสอบ (รูปแบบที่เข้ากันได้กับ OpenAI)
   */
  buildTestRequestBody(provider, model) {
    const testMessage = 'Hello! This is a test message from Mobile API Config.';

    if (provider === 'gemini') {
      // รูปแบบ Gemini API
      return {
        contents: [
          {
            parts: [{ text: testMessage }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
        },
      };
    } else {
      // รูปแบบที่เข้ากันได้กับ OpenAI (สำหรับ OpenAI และ API กำหนดเอง)
      return {
        model: model,
        messages: [{ role: 'user', content: testMessage }],
        max_tokens: 50,
        temperature: 0.7,
      };
    }
  }

  /**
   * แสดงข้อมูลสถานะ
   */
  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('api-config-status');
    if (!statusDiv) return;

    const colors = {
      info: '#17a2b8',
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
    };

    statusDiv.style.display = 'block';
    statusDiv.style.color = colors[type] || colors.info;
    statusDiv.textContent = message;

    // ซ่อนข้อความสำเร็จโดยอัตโนมัติ
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * รับการกำหนดค่า API ปัจจุบัน (สำหรับการเรียกใช้ภายนอก)
   */
  getCurrentConfig() {
    return { ...this.currentSettings };
  }

  /**
   * ดำเนินการเรียก API (สำหรับโมดูลอื่นใช้)
   */
  async callAPI(messages, options = {}) {
    if (!this.currentSettings.enabled) {
      throw new Error('ยังไม่เปิดใช้งาน API กำหนดเอง');
    }

    const provider = this.currentSettings.provider;
    let apiUrl;

    if (provider === 'gemini') {
      // Gemini ใช้ URL ภายใน
      apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
    } else {
      // ผู้ให้บริการอื่นใช้ URL ในการกำหนดค่า
      apiUrl = this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
    }

    const apiKey = this.currentSettings.apiKey;
    const model = this.currentSettings.model;

    if (!apiUrl || !model) {
      throw new Error('การตั้งค่า API ไม่สมบูรณ์');
    }

    const providerConfig = this.supportedProviders[provider];
    if (providerConfig?.requiresKey && !apiKey) {
      throw new Error('ขาดคีย์ API');
    }

    // ตรวจสอบคำเตือน CORS
    if (provider === 'gemini' && window.location.protocol === 'http:') {
      console.warn(
        '⚠️ [Mobile API Config] คำเตือน CORS: การเรียก Gemini API โดยตรงจากเบราว์เซอร์อาจถูกบล็อกโดยนโยบาย CORS',
      );
      console.warn('แนะนำให้ผ่านพร็อกซีแบ็กเอนด์หรือใช้ HTTPS เพื่อหลีกเลี่ยงปัญหา CORS');
    }

    // สร้างคำร้องขอ
    let requestUrl = apiUrl.trim();
    if (!requestUrl.endsWith('/')) {
      requestUrl += '/';
    }

    // สร้าง URL ตามผู้ให้บริการที่แตกต่างกัน
    if (provider === 'gemini') {
      // Gemini API ใช้โครงสร้าง URL พิเศษ และส่ง API key ผ่านพารามิเตอร์ URL
      requestUrl += providerConfig.urlSuffix.replace('{model}', model);
      if (apiKey) {
        requestUrl += `?key=${apiKey}`;
      }
    } else {
      // OpenAI และ API กำหนดเองใช้การสร้าง URL มาตรฐาน
      requestUrl += providerConfig.urlSuffix.replace('{model}', model);
    }

    const headers = { 'Content-Type': 'application/json' };

    // ตั้งค่าวิธีการตรวจสอบสิทธิ์ที่ถูกต้องตามผู้ให้บริการ
    if (providerConfig.requiresKey && apiKey && provider !== 'gemini') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody = this.buildRequestBody(provider, model, messages, options);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      timeout: this.currentSettings.timeout || 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`การเรียก API ล้มเหลว: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.parseAPIResponse(provider, data);
  }

  /**
   * สร้างเนื้อหาคำร้องขอ API (รูปแบบที่เข้ากันได้กับ OpenAI)
   */
  buildRequestBody(provider, model, messages, options) {
    const settings = this.currentSettings;

    if (provider === 'gemini') {
      // รูปแบบ Gemini API
      const contents = [];

      // แปลงรูปแบบข้อความ
      messages.forEach(msg => {
        if (msg.role === 'system') {
          // ข้อความระบบเป็นคำนำหน้าข้อความผู้ใช้คนแรก
          if (contents.length === 0) {
            contents.push({
              parts: [{ text: msg.content + '\n\n' }],
            });
          }
        } else if (msg.role === 'user') {
          const existingText = contents.length > 0 ? contents[contents.length - 1].parts[0].text : '';
          if (contents.length > 0 && !contents[contents.length - 1].role) {
            // รวมเข้ากับข้อความระบบที่มีอยู่
            contents[contents.length - 1].parts[0].text = existingText + msg.content;
          } else {
            contents.push({
              parts: [{ text: msg.content }],
            });
          }
        } else if (msg.role === 'assistant') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }],
          });
        }
      });

      // เพิ่ม System Prompt
      if (settings.systemPrompt && contents.length === 0) {
        contents.push({
          parts: [{ text: settings.systemPrompt }],
        });
      }

      return {
        contents: contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || settings.maxTokens,
          temperature: options.temperature || settings.temperature,
          ...options.customParams,
        },
      };
    } else {
      // รูปแบบที่เข้ากันได้กับ OpenAI (สำหรับ OpenAI และ API กำหนดเอง)
      const body = {
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || settings.maxTokens,
        temperature: options.temperature || settings.temperature,
        ...options.customParams,
      };

      // เพิ่ม System Prompt
      if (settings.systemPrompt) {
        body.messages = [{ role: 'system', content: settings.systemPrompt }, ...body.messages];
      }

      return body;
    }
  }

  /**
   * แยกวิเคราะห์การตอบสนอง API (รูปแบบที่เข้ากันได้กับ OpenAI)
   */
  parseAPIResponse(provider, data) {
    if (provider === 'gemini') {
      // รูปแบบการตอบสนอง Gemini API
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: data.usageMetadata,
      };
    } else {
      // รูปแบบที่เข้ากันได้กับ OpenAI (สำหรับ OpenAI และ API กำหนดเอง)
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      };
    }
  }

  /**
   * ตรวจสอบว่า API พร้อมใช้งานหรือไม่
   */
  isAPIAvailable() {
    return (
      this.currentSettings.enabled &&
      this.currentSettings.apiUrl &&
      this.currentSettings.model &&
      (!this.supportedProviders[this.currentSettings.provider]?.requiresKey || this.currentSettings.apiKey)
    );
  }

  /**
   * รับข้อมูลการดีบัก
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      currentSettings: { ...this.currentSettings, apiKey: this.currentSettings.apiKey ? '[HIDDEN]' : '' },
      supportedProviders: Object.keys(this.supportedProviders),
      isAPIAvailable: this.isAPIAvailable(),
      providerConfig: this.supportedProviders[this.currentSettings.provider] || null,
    };
  }

  /**
   * ฟังก์ชันดีบัก: ตรวจสอบสถานะการกำหนดค่าปัจจุบัน
   */
  debugConfig() {
    console.group('🔧 [Mobile API Config] ข้อมูลการดีบักการกำหนดค่า');
    console.log('✅ สถานะเริ่มต้น:', this.isInitialized);
    console.log('📋 การตั้งค่าปัจจุบัน:', {
      provider: this.currentSettings.provider,
      enabled: this.currentSettings.enabled,
      apiUrl: this.currentSettings.apiUrl || '(ไม่ได้ตั้งค่า)',
      hasApiKey: !!this.currentSettings.apiKey,
      model: this.currentSettings.model || '(ไม่ได้ตั้งค่า)',
      temperature: this.currentSettings.temperature,
      maxTokens: this.currentSettings.maxTokens,
    });
    console.log('🌐 ผู้ให้บริการที่รองรับ:', Object.keys(this.supportedProviders));
    console.log('⚙️ การกำหนดค่า Provider ปัจจุบัน:', this.supportedProviders[this.currentSettings.provider]);
    console.log('🔗 ความพร้อมใช้งาน API:', this.isAPIAvailable());

    // รับค่าจาก UI ปัจจุบัน
    const currentProvider = document.getElementById('api-provider')?.value;
    const currentUrl = document.getElementById('api-url')?.value;
    const currentKey = document.getElementById('api-key')?.value;

    console.log('🔧 สถานะองค์ประกอบ UI:', {
      'api-provider': currentProvider || '(ไม่พบ)',
      'api-url': currentUrl || '(ไม่พบ)',
      'api-key': document.getElementById('api-key') ? (currentKey ? 'กรอกแล้ว' : 'ไม่ได้กรอก') : '(ไม่พบ)',
      'api-model': document.getElementById('api-model')?.value || '(ไม่พบ)',
    });

    // ทดสอบการสร้าง URL
    const provider = currentProvider || this.currentSettings.provider || 'gemini';
    const apiUrl = currentUrl || this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
    if (apiUrl) {
      const modelsUrl = this.buildModelsUrl(provider, apiUrl);
      console.log('🔗 Provider ปัจจุบัน:', provider);
      console.log('🔗 URL พื้นฐาน:', apiUrl);
      console.log('🔗 URL โมเดลที่คาดหวัง:', modelsUrl);

      // ตรวจสอบว่า URL ถูกต้องหรือไม่
      if (provider === 'gemini' && !modelsUrl.includes('v1beta')) {
        console.warn('⚠️ คำเตือน: URL ของ Gemini ควรมี v1beta URL ปัจจุบันอาจไม่ถูกต้อง');
      }
    }

    console.groupEnd();
  }

  /**
   * สร้าง URL รายการโมเดล (สำหรับการดีบัก)
   */
  buildModelsUrl(provider, apiUrl) {
    let modelsUrl = apiUrl.trim();
    if (!modelsUrl.endsWith('/')) {
      modelsUrl += '/';
    }

    if (provider === 'gemini') {
      if (!modelsUrl.includes('/v1beta/models')) {
        if (modelsUrl.endsWith('/v1/')) {
          modelsUrl = modelsUrl.replace('/v1/', '/v1beta/models');
        } else {
          modelsUrl += 'v1beta/models';
        }
      }
    } else {
      if (modelsUrl.endsWith('/v1/')) {
        modelsUrl += 'models';
      } else if (!modelsUrl.includes('/models')) {
        modelsUrl += 'models';
      }
    }

    return modelsUrl;
  }

  /**
   * ทดสอบการดึงข้อมูลโมเดลด้วยตนเอง (สำหรับดีบัก)
   */
  async testModelFetch() {
    console.log('[Mobile API Config] 🧪 เริ่มทดสอบการดึงข้อมูลโมเดลด้วยตนเอง...');

    const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
    const apiUrl = document.getElementById('api-url')?.value || this.currentSettings.apiUrl;
    const apiKey = document.getElementById('api-key')?.value || this.currentSettings.apiKey;

    console.log('พารามิเตอร์ทดสอบ:', {
      provider,
      apiUrl: apiUrl ? 'ตั้งค่าแล้ว' : 'ไม่ได้ตั้งค่า',
      apiKey: apiKey ? 'ตั้งค่าแล้ว' : 'ไม่ได้ตั้งค่า',
    });

    if (!apiUrl || !apiKey) {
      console.error('ขาดพารามิเตอร์ที่จำเป็น');
      return;
    }

    try {
      const models = await this.fetchModels(provider, apiUrl, apiKey);
      console.log('✅ ทดสอบสำเร็จ ได้รับโมเดล:', models);
      return models;
    } catch (error) {
      console.error('❌ ทดสอบล้มเหลว:', error);
      return null;
    }
  }
}

// เริ่มต้นอัตโนมัติ
jQuery(document).ready(() => {
  // รอสักครู่เพื่อให้แน่ใจว่าโมดูลอื่นโหลดเสร็จแล้ว
  setTimeout(() => {
    if (!window.mobileCustomAPIConfig) {
      const apiConfig = new MobileCustomAPIConfig();
      apiConfig.initialize().then(success => {
        if (success) {
          console.log('[Mobile API Config] ✅ โมดูลการตั้งค่า API แบบกำหนดเองพร้อมแล้ว');
        } else {
          console.error('[Mobile API Config] ❌ การเริ่มต้นโมดูลการตั้งค่า API แบบกำหนดเองล้มเหลว');
        }
      });
      // ตั้งค่าอินสแตนซ์เป็นตัวแปร global
      window.mobileCustomAPIConfig = apiConfig;
    }
  }, 1000);
});

// ส่งออกคลาสและอินสแตนซ์ไปยังขอบเขต global
window.MobileCustomAPIConfig = MobileCustomAPIConfig;

// ฟังก์ชันช่วยเหลือ global
window.fixGeminiConfig = function () {
  console.log('🔧 กำลังซ่อมแซมการตั้งค่า Gemini...');

  const config = window.mobileCustomAPIConfig;
  if (!config) {
    console.error('❌ ตัวจัดการการตั้งค่า API ยังไม่เริ่มต้น');
    return;
  }

  // บังคับตั้งค่า Gemini ให้ถูกต้อง
  const providerSelect = document.getElementById('api-provider');

  if (providerSelect) {
    providerSelect.value = 'gemini';
  }

  // ทริกเกอร์เหตุการณ์การเปลี่ยน provider (ซึ่งจะซ่อนกล่องป้อนข้อมูล URL และตั้งค่า URL ภายในอัตโนมัติ)
  config.onProviderChange('gemini');

  console.log('✅ ซ่อมแซมการตั้งค่าแล้ว โปรดตรวจสอบ:');
  console.log('1. เลือกผู้ให้บริการ 💎 Google Gemini แล้ว');
  console.log('2. กล่องป้อนข้อมูล URL ซ่อนอยู่ (ใช้ URL ภายใน)');
  console.log('3. คีย์ API: Google AI API key ที่ขึ้นต้นด้วย AIza');
  console.log('4. คลิกปุ่ม 📥 เพื่อดึงรายชื่อโมเดล');

  // แสดงข้อมูลการดีบัก
  config.debugConfig();
};

// เพิ่มคำแนะนำในคอนโซล
console.log(`
🚀 [Mobile API Config] คำสั่งดีบักที่ใช้ได้:

   ดูสถานะการตั้งค่า: window.mobileCustomAPIConfig.debugConfig()
   ทดสอบการดึงข้อมูลด้วยตนเอง: await window.mobileCustomAPIConfig.testModelFetch()
   ซ่อมแซมการตั้งค่า Gemini: window.fixGeminiConfig()
`);
