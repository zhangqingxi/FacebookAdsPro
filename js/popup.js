/**
 * Facebook广告成效助手 Pro - Popup脚本
 * @description 扩展的弹出页面脚本，管理所有用户交互和设置界面
 * @author Qasim
 * @version 1.0.1
 */

(function () {
  'use strict';

  /**
   * Popup状态管理器
   * @description 管理所有弹出窗口的运行时状态
   * @namespace PopupState
   */
  const PopupState = {
    /**
     * 状态数据存储
     * @type {Object}
     */
    data: {
      isReady: false,            // 是否已初始化完成
      currentTab: null,         // 当前浏览器标签页
      accountId: null,          // 当前广告账户ID
      lastStatus: null          // 上次状态信息
    },

    /**
     * 获取状态值
     * @param {string} key - 状态键名
     * @returns {*} 状态值
     */
    get(key) {
      return this.data[key];
    },

    /**
     * 设置状态值
     * @param {string} key - 状态键名
     * @param {*} value - 状态值
     */
    set(key, value) {
      this.data[key] = value;
    },

    /**
     * 批量更新状态
     * @param {Object} updates - 要更新的状态对象
     */
    update(updates) {
      Object.assign(this.data, updates);
    }
  };

  /**
   * 消息监听器
   * @description 监听来自content-script的消息通知
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'statusChanged') {
      Logger.info('收到区域切换状态变化通知:', request.data);

      // 延迟1.5秒后刷新状态，等待数据处理完成
      setTimeout(() => {
        if (UIManager) {
          Logger.info('自动刷新popup状态显示');
          UIManager.checkRuntimeStatus();
        }
      }, 1500);
    }
  });

  /**
   * Popup版日志系统
   * @description 简化版的日志系统，专用于popup脚本
   * @namespace Logger
   */
  const Logger = {
    /**
     * 统一图标系统（后台版）
     * @description 与前端保持一致的图标系统
     */
    icons: {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      important: '🔔'
    },

    /**
     * 获取图标
     * @param {string} name - 图标名称
     * @returns {string} 对应的图标字符
     */
    getIcon(name) {
      return this.icons[name] || '';
    },

    /**
    * 获取调试模式状态
    * @returns {boolean} 调试模式是否开启
    * @description 从全局配置中获取DEBUG_MODE设置
    */
    get debugMode() {
      return window.FB_HELPER_CONFIG?.FEATURES?.DEBUG_MODE ?? false;
    },

    /**
     * 获取详细日志模式状态
     * @returns {boolean} 详细日志模式是否开启
     * @description 从全局配置中获取VERBOSE_LOGGING设置
     */
    get verboseMode() {
      return window.FB_HELPER_CONFIG?.FEATURES?.VERBOSE_LOGGING ?? false;
    },

    /**
     * 输出信息级别日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    info(message, ...args) {
      if (this.debugMode && this.verboseMode) {
        console.log(`[FB-Helper-Popup] ${this.getIcon('info')} ${message}`, ...args);
      }
    },

    /**
     * 输出成功级别日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    success(message, ...args) {
      if (this.debugMode && this.verboseMode) {
        console.log(`[FB-Helper-Popup] ${this.getIcon('success')} ${message}`, ...args);
      }
    },

    /**
     * 输出错误级别日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    error(message, ...args) {
      if (this.debugMode) {
        console.error(`[FB-Helper-Popup] ${this.getIcon('error')} ${message}`, ...args);
      }
    }
  };
  /**
   * 工具函数集
   * @description 提供常用的工具方法
   * @namespace Utils
   */
  const Utils = {
    /**
     * 显示状态消息
     * @param {string} message - 要显示的消息
     * @param {string} [type='info'] - 消息类型: 'info', 'success', 'error'
     */
    showStatus(message, type = 'info') {
      const statusEl = document.getElementById('status');
      if (!statusEl) return;

      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
      statusEl.style.display = 'block';

      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    },

    /**
     * 从chrome.storage中获取数据
     * @param {string|string[]|Object} keys - 要获取的键名
     * @returns {Promise<Object>} 存储的数据
     */
    async getStorageData(keys) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    },

    /**
     * 将数据存储到chrome.storage
     * @param {Object} data - 要存储的数据
     * @returns {Promise<void>}
     */
    async setStorageData(data) {
      return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
      });
    },

    /**
     * 获取当前浏览器标签页
     * @returns {Promise<Object|null>} 当前标签页对象或null
     */
    async getCurrentTab() {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          resolve(tabs[0]);
        });
      });
    }
  };

  /**
   * Popup专用存储服务
   * @description 封装Chrome Storage API的存储操作，适用于popup环境
   * @namespace PopupStorageService
   */
  const PopupStorageService = {
    /**
     * 获取API配置
     * @returns {Promise<Object>} 包含base_url和api_key的配置对象
     * @description 从Chrome存储中读取API配置信息
     */
    async getApiConfig() {
      const result = await Utils.getStorageData(['api_config']);
      const stored = result.api_config || {};
      return {
        base_url: stored.base_url || '',
        api_key: stored.api_key || ''
      };
    },

    /**
     * 更新API配置
     * @param {Object} config - API配置对象
     * @param {string} config.base_url - API基础URL
     * @param {string} config.api_key - API密钥
     * @description 将API配置保存到Chrome存储中
     */
    async updateApiConfig(config) {
      await Utils.setStorageData({ api_config: config });
    },

    /**
     * 获取功能配置
     * @returns {Promise<Object>} 功能配置对象，包含各种开关状态
     * @description 从存储中读取功能开关配置，支持新旧格式兼容和默认值回退
     */
    async getFeatureConfig() {
      const res = await Utils.getStorageData(['auto_refresh', 'show_status_indicator', 'fb_plugin_status', 'features']);

      const defaultConfig = {
        auto_refresh: window.FB_HELPER_CONFIG?.FEATURES?.AUTO_REFRESH ?? true,
        show_status_indicator: window.FB_HELPER_CONFIG?.FEATURES?.SHOW_STATUS_INDICATOR ?? true,
        enable_reporting: window.FB_HELPER_CONFIG?.FEATURES?.ENABLE_REPORTING ?? true
      };

      const featuresObj = res.features || {};

      return {
        auto_refresh: featuresObj.auto_refresh !== undefined ? featuresObj.auto_refresh : (res.auto_refresh !== undefined ? res.auto_refresh : defaultConfig.auto_refresh),
        show_status_indicator: featuresObj.show_status_indicator !== undefined ? featuresObj.show_status_indicator : (res.show_status_indicator !== undefined ? res.show_status_indicator : defaultConfig.show_status_indicator),
        enable_reporting: featuresObj.enable_reporting !== undefined ? featuresObj.enable_reporting : (res.fb_plugin_status === '1' ? true : (res.fb_plugin_status === '0' ? false : defaultConfig.enable_reporting))
      };
    },

    /**
     * 更新功能配置
     * @param {string} featureName - 功能名称：'auto_refresh', 'show_status_indicator', 'enable_reporting'
     * @param {boolean} value - 功能开关状态
     * @description 更新指定功能的开关状态，同时维护新旧格式的兼容性
     */
    async updateFeature(featureName, value) {
      // 更新新格式
      const existing = await Utils.getStorageData(['features']);
      await Utils.setStorageData({
        features: { ...(existing.features || {}), [featureName]: value }
      });

      // 更新旧格式（兼容性）
      const legacyUpdates = {};
      if (featureName === 'auto_refresh') legacyUpdates.auto_refresh = value;
      if (featureName === 'show_status_indicator') legacyUpdates.show_status_indicator = value;
      if (featureName === 'enable_reporting') legacyUpdates.fb_plugin_status = value ? '1' : '0';

      if (Object.keys(legacyUpdates).length > 0) {
        await Utils.setStorageData(legacyUpdates);
      }
    }
  };

  /**
   * 消息服务
   * @description 处理与content script之间的消息通信
   * @namespace MessageService
   */
  const MessageService = {
    /**
     * 向内容脚本发送消息 - 增强错误处理
     * @param {Object} message - 要发送的消息对象
     * @returns {Promise<Object|null>} 返回内容脚本的响应或null
     * @description 向当前活动标签页的内容脚本发送消息并等待响应
     */
    async sendToContentScript(message) {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0 || !tabs[0]) {
            Logger.error('未找到活动标签页');
            resolve(null);
            return;
          }

          const tab = tabs[0];
          if (!tab.url || !tab.url.includes('facebook.com/adsmanager')) {
            Logger.error('当前标签页不是Facebook广告管理页面');
            resolve(null);
            return;
          }

          // 增加超时处理
          const timeout = setTimeout(() => {
            Logger.error('消息发送超时');
            resolve(null);
          }, 5000); // 5秒超时

          chrome.tabs.sendMessage(tab.id, message, (response) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
              Logger.error('消息发送失败:', chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });
      });
    }
  };

  /**
   * UI管理器
   * @description 管理popup页面的用户界面交互和状态显示
   * @namespace UIManager
   */
  const UIManager = {
    /**
     * 初始化UI管理器
     * @description 启动popup页面的初始化流程，包括设置加载、事件绑定和账户信息更新
     * @throws {Error} 初始化失败时抛出错误
     */
    async initialize() {
      try {
        Logger.success('Popup UI开始初始化');

        await this.loadSettings();
        this.bindEvents();
        await this.updateAccountInfo();

        // 初始化完成后自动检查状态
        setTimeout(() => {
          this.checkRuntimeStatus();
        }, 500);

        PopupState.set('isReady', true);
        Logger.success('Popup UI初始化完成');
      } catch (error) {
        Logger.error('初始化失败:', error);
        Utils.showStatus('初始化失败', 'error');
      }
    },

    /**
     * 绑定事件监听器
     * @description 为页面元素绑定事件处理程序，包括按钮点击和复选框状态变化
     */
    bindEvents() {
      Logger.info('绑定事件');

      // 配置保存
      this.bindElement('save_config', () => this.saveConfig());

      // 状态检查
      this.bindElement('check_status', () => this.checkRuntimeStatus());

      // 手动刷新
      this.bindElement('manual_refresh', () => this.manualRefresh());

      // 功能开关
      this.bindElement('enable_reporting', (e) => this.updateFeature('enable_reporting', e.target.checked));
      this.bindElement('auto_refresh', (e) => this.updateFeature('auto_refresh', e.target.checked));
      this.bindElement('show_status_indicator', (e) => this.updateFeature('show_status_indicator', e.target.checked));
    },

    /**
     * 绑定单个元素的事件处理程序
     * @param {string} id - 元素ID
     * @param {Function} handler - 事件处理函数
     * @description 根据元素类型自动选择合适的事件类型（click或change）
     */
    bindElement(id, handler) {
      const element = document.getElementById(id);
      if (element) {
        const eventType = element.type === 'checkbox' ? 'change' : 'click';
        element.addEventListener(eventType, handler);
      }
    },

    /**
     * 保存API配置
     * @description 从表单中获取API配置并保存到存储中
     * @throws {Error} 保存失败时抛出错误
     */
    async saveConfig() {
      try {
        const apiBaseUrl = document.getElementById('api_base_url').value.trim();
        const apiKey = document.getElementById('api_key').value.trim();

        await PopupStorageService.updateApiConfig({
          base_url: apiBaseUrl || window.FB_HELPER_CONFIG?.API?.BASE_URL || '',
          api_key: apiKey || window.FB_HELPER_CONFIG?.API?.API_KEY || '',
        });

        Utils.showStatus('配置保存成功', 'success');
      } catch (error) {
        Utils.showStatus(`保存失败: ${error.message}`, 'error');
      }
    },

    /**
     * 加载设置到界面
     * @description 从存储中读取配置并填充到相应的表单元素中
     */
    async loadSettings() {
      Logger.info('加载设置');

      // 设置默认配置
      document.getElementById('host').value = window.FB_HELPER_CONFIG?.SHOP?.DOMAIN || '';

      // 加载API配置
      const apiConfig = await PopupStorageService.getApiConfig();

      document.getElementById('api_base_url').value = apiConfig.base_url || window.FB_HELPER_CONFIG?.API?.BASE_URL || '';
      document.getElementById('api_key').value = apiConfig.api_key || window.FB_HELPER_CONFIG?.API?.API_KEY || '';

      // 加载功能开关
      const defaultConfig = {
        enable_reporting: window.FB_HELPER_CONFIG?.FEATURES?.ENABLE_REPORTING ?? true,
        auto_refresh: window.FB_HELPER_CONFIG?.FEATURES?.AUTO_REFRESH ?? true,
        show_status_indicator: window.FB_HELPER_CONFIG?.FEATURES?.SHOW_STATUS_INDICATOR ?? true
      };

      const features = await PopupStorageService.getFeatureConfig();

      for (const [feature, defaultValue] of Object.entries(defaultConfig)) {
        const value = features[feature] !== undefined ? features[feature] : defaultValue;
        const element = document.getElementById(feature);
        if (element) {
          element.checked = value;
        }
      }
    },

    /**
     * 更新功能开关
     * @param {string} featureName - 功能名称
     * @param {boolean} checked - 开关状态
     * @description 更新指定功能的开关状态并显示操作结果
     */
    async updateFeature(featureName, checked) {
      try {
        await PopupStorageService.updateFeature(featureName, checked);

        const statusText = {
          'enable_reporting': checked ? '数据上报已启用' : '数据上报已禁用',
          'auto_refresh': checked ? '自动刷新已启用' : '自动刷新已禁用',
          'show_status_indicator': checked ? '状态指示器已启用' : '状态指示器已禁用'
        };

        Utils.showStatus(statusText[featureName] || '更新成功', 'success');
      } catch (error) {
        Utils.showStatus(`更新失败: ${error.message}`, 'error');
      }
    },

    /**
     * 检查运行时状态 - 增强错误处理
     * @description 向内容脚本发送状态查询请求并处理响应结果
     */
    async checkRuntimeStatus() {
      try {
        Utils.showStatus('正在检查状态...', 'info');

        // 首先检查是否在正确的页面
        const tab = await Utils.getCurrentTab();
        if (!tab || !tab.url || !tab.url.includes('facebook.com/adsmanager')) {
          this.renderErrorStatus('请在Facebook广告管理页面使用此插件');
          this.disableManualRefresh();
          Utils.showStatus('请在Facebook广告管理页面使用', 'error');
          return;
        }

        const response = await MessageService.sendToContentScript({ message: 'getStatus' });

        if (response && response.status) {
          this.renderStatusInfo(response);
          this.enableManualRefresh();
          Utils.showStatus('状态检查完成', 'success');
        } else {
          this.renderInitializingStatus();
          this.disableManualRefresh(); // 初始化中禁用手动刷新
          Utils.showStatus('插件初始化中...', 'info');

          // 3秒后再次检查，最多重试3次
          this.retryCount = (this.retryCount || 0) + 1;
          if (this.retryCount <= 3) {
            setTimeout(() => this.checkRuntimeStatus(), 10000);
          } else {
            this.renderErrorStatus('初始化超时，请刷新页面重试');
            Utils.showStatus('初始化超时', 'error');
          }
        }

        PopupState.set('lastStatus', response);
      } catch (error) {
        this.renderErrorStatus(error.message || '连接失败');
        this.disableManualRefresh(); // 出错时禁用手动刷新
        Utils.showStatus(`检查失败: ${error.message || '未知错误'}`, 'error');
        Logger.error('状态检查异常:', error);
      }
    },

    /**
     * 渲染状态信息显示
     * @param {Object} response - 从内容脚本获取的状态响应
     * @description 将插件运行状态信息渲染为用户可读的HTML格式
     */
    renderStatusInfo(response) {
      // 翻译页面类型
      const pageTypeMap = {
        'campaign': '系列页面',
        'adset': '组页面',
        'ad': '广告页面'
      };

      const currentPageDisplay = pageTypeMap[response.currentTab] || response.currentTab || '未知';

      const statusHtml = `
        <strong>状态信息</strong>
        <div class="status-item">
          <span class="status-label">插件状态:</span>
          <span class="status-value status-success">运行中</span>
        </div>
        <div class="status-item">
          <span class="status-label">当前页面:</span>
          <span class="status-value">${currentPageDisplay}</span>
        </div>
        <div class="status-item">
          <span class="status-label">账户ID:</span>
          <span class="status-value">${response.accountId || '未知'}</span>
        </div>
        <div class="status-item">
          <span class="status-label">数据缓存:</span>
          <span class="status-value">${response.dataCacheSize || 0} 条记录</span>
        </div>
        <div class="status-item">
          <span class="status-label">最后更新:</span>
          <span class="status-value">${response.lastUpdate || '未更新'}</span>
        </div>
        <div class="status-item">
          <span class="status-label">功能状态:</span>
          <span class="status-value">
            数据上报${response.features?.enable_reporting ? '<span class="status-success">已启用</span>' : '<span class="status-warning">已禁用</span>'}, 
            自动刷新${response.features?.auto_refresh ? '<span class="status-success">已启用</span>' : '<span class="status-warning">已禁用</span>'}
          </span>
        </div>
      `;
      document.getElementById('runtime_status').innerHTML = statusHtml;
    },

    /**
     * 渲染初始化中状态
     * @description 显示插件正在初始化的状态信息
     */
    renderInitializingStatus() {
      const html = `
        <strong>状态信息</strong>
        <div class="status-item">
          <span class="status-label">插件状态:</span>
          <span class="status-value status-warning">正在初始化中</span>
        </div>
      `;
      document.getElementById('runtime_status').innerHTML = html;
    },

    /**
     * 渲染错误状态
     * @param {string} errorMessage - 错误信息
     * @description 显示错误状态和错误消息
     */
    renderErrorStatus(errorMessage) {
      const html = `<strong>状态信息:</strong><br><span style="color:#f44336;">检查失败: ${errorMessage}</span>`;
      document.getElementById('runtime_status').innerHTML = html;
    },

    /**
     * 启用手动刷新按钮
     * @description 设置手动刷新按钮为可用状态
     */
    enableManualRefresh() {
      const manualRefreshBtn = document.getElementById('manual_refresh');
      if (manualRefreshBtn) {
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.title = '点击手动刷新数据';
        manualRefreshBtn.innerHTML = '手动刷新数据';
      }
    },

    /**
     * 禁用手动刷新按钮
     * @description 设置手动刷新按钮为禁用状态，通常在初始化或错误时使用
     */
    disableManualRefresh() {
      const manualRefreshBtn = document.getElementById('manual_refresh');
      if (manualRefreshBtn) {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.title = '插件初始化中，请稍后...';
        manualRefreshBtn.innerHTML = '初始化中...';
      }
    },

    /**
     * 手动刷新数据 - 增强错误处理
     * @description 向内容脚本发送手动刷新请求并处理结果
     * @throws {Error} 刷新失败时抛出错误
     */
    async manualRefresh() {
      try {
        Utils.showStatus('正在刷新数据...', 'info');

        // 首先检查是否在正确的页面
        const tab = await Utils.getCurrentTab();
        if (!tab || !tab.url || !tab.url.includes('facebook.com/adsmanager')) {
          throw new Error('请在Facebook广告管理页面使用');
        }

        const response = await MessageService.sendToContentScript({ message: 'manualRefresh' });

        if (!response) {
          throw new Error('内容脚本未响应，请刷新页面重试');
        }

        if (response.status === 'success') {
          Utils.showStatus('手动刷新已触发', 'success');
          // 3秒后更新状态
          setTimeout(() => {
            this.retryCount = 0; // 重置重试计数
            this.checkRuntimeStatus();
          }, 3000);
        } else {
          throw new Error(response.error || '未知错误');
        }

      } catch (error) {
        Logger.error('手动刷新失败:', error);
        Utils.showStatus(`手动刷新失败: ${error.message}`, 'error');
      }
    },



    /**
     * 更新账户信息
     * @description 从当前标签页URL中提取Facebook广告账户ID并显示
     */
    async updateAccountInfo() {
      try {
        const tab = await Utils.getCurrentTab();
        if (tab && tab.url && tab.url.includes('facebook.com/adsmanager')) {
          const url = new URL(tab.url);
          const accountId = url.searchParams.get('act');

          if (accountId) {
            PopupState.set('accountId', accountId);
            document.getElementById('current_account').value = accountId;
            Utils.showStatus(`已检测到账户: ${accountId}`, 'success');
          } else {
            document.getElementById('current_account').value = '未检测到账户ID';
            Utils.showStatus('请确保在Facebook广告管理页面', 'info');
          }
        } else {
          document.getElementById('current_account').value = '请在广告管理页面使用';
          Utils.showStatus('请在Facebook广告管理页面使用此功能', 'info');
        }
      } catch (error) {
        Logger.error('更新账户信息失败:', error);
        document.getElementById('current_account').value = '状态获取失败';
      }
    }
  };

  /**
   * 启动函数
   * @description Popup页面的主入口函数，负责初始化整个应用
   * @async
   */
  async function startup() {
    try {
      await UIManager.initialize();
      Logger.success('Facebook广告成效助手 Pro popup启动完成');
    } catch (error) {
      Logger.error('Popup启动失败:', error);
      Utils.showStatus('启动失败', 'error');
    }
  }

  /**
   * 立即启动应用
   * @description 在文件加载完成后立即执行初始化
   */
  startup();

})();
