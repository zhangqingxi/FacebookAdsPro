/**
 * 统一存储管理器 - 管理Chrome存储操作和配置缓存
 * @description 提供统一的Chrome Storage API封装，包括配置缓存、
 *              功能开关管理、API配置管理等功能
 * @author Qasim
 * @version 1.0.0
 */

/**
 * 存储管理器对象
 * @namespace StorageManager
 */
const StorageManager = {
  /**
   * 配置缓存对象
   * @type {Object|null}
   * @private
   */
  _configCache: null,
  
  /**
   * 缓存时间戳
   * @type {number|null}
   * @private
   */
  _cacheTimestamp: null,
  
  /**
   * 缓存过期时间（毫秒）
   * @type {number}
   * @private
   */
  _cacheExpiry: 5000, // 5秒缓存

  /**
   * 通用存储读取
   * @param {string|string[]|Object} keys - 要读取的键名
   * @returns {Promise<Object>} 存储的数据
   */
  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  },

  /**
   * 通用存储写入
   * @param {Object} data - 要存储的数据对象
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  },

  /**
   * 获取功能配置（带缓存）
   * @returns {Promise<Object>} 功能配置对象
   * @description 获取所有功能开关配置，支持缓存机制和兼容旧版本格式
   * 缓存策略: 5秒内使用缓存，超时重新从存储读取
   */
  async getFeatureConfig() {
    const now = Date.now();
    if (this._configCache && this._cacheTimestamp && (now - this._cacheTimestamp) < this._cacheExpiry) {
      if (window.Logger) {
        window.Logger.info('使用配置缓存');
      }
      return this._configCache;
    }
    
    const res = await this.get(['auto_refresh', 'show_status_indicator', 'fb_plugin_status', 'features']);
    
    if (window.Logger) {
      window.Logger.info('从存储读取开关配置:', res);
    }
    
    const defaultConfig = {
      auto_refresh: window.FB_HELPER_CONFIG?.FEATURES?.AUTO_REFRESH ?? true,
      show_status_indicator: window.FB_HELPER_CONFIG?.FEATURES?.SHOW_STATUS_INDICATOR ?? true,
      enable_reporting: window.FB_HELPER_CONFIG?.FEATURES?.ENABLE_REPORTING ?? true
    };
    
    const featuresObj = res.features || {};
    
    const finalConfig = {
      auto_refresh: featuresObj.auto_refresh !== undefined ? featuresObj.auto_refresh : 
                        (res.auto_refresh !== undefined ? res.auto_refresh : defaultConfig.auto_refresh),
      show_status_indicator: featuresObj.show_status_indicator !== undefined ? featuresObj.show_status_indicator : 
                            (res.show_status_indicator !== undefined ? res.show_status_indicator : defaultConfig.show_status_indicator),
      enable_reporting: featuresObj.enable_reporting !== undefined ? featuresObj.enable_reporting : 
                        (res.fb_plugin_status === '1' ? true : (res.fb_plugin_status === '0' ? false : defaultConfig.enable_reporting))
    };
    
    this._configCache = finalConfig;
    this._cacheTimestamp = now;
    
    if (window.Logger) {
      window.Logger.success('最终生效的功能开关:', finalConfig);
    }
    
    return finalConfig;
  },

  /**
   * 更新功能配置
   * @param {string} featureName - 功能名称: 'auto_refresh', 'show_status_indicator', 'enable_reporting'
   * @param {boolean} value - 功能状态: true/false
   * @description 更新指定功能的开关状态，同时更新新旧格式以保持兼容性
   * 更新后会自动清除缓存，确保下次访问获取最新数据
   */
  async updateFeature(featureName, value) {
    // 更新新格式
    const existing = await this.get(['features']);
    await this.set({
      features: { ...(existing.features || {}), [featureName]: value }
    });
    
    // 更新旧格式（兼容性）
    const legacyUpdates = {};
    if (featureName === 'auto_refresh') legacyUpdates.auto_refresh = value;
    if (featureName === 'show_status_indicator') legacyUpdates.show_status_indicator = value;
    if (featureName === 'enable_reporting') legacyUpdates.fb_plugin_status = value ? '1' : '0';
    
    if (Object.keys(legacyUpdates).length > 0) {
      await this.set(legacyUpdates);
    }

    // 清除缓存
    this._configCache = null;
    this._cacheTimestamp = null;
  },

  /**
   * 获取API配置
   * @returns {Promise<Object>} API配置对象，包含base_url和api_key
   */
  async getApiConfig() {
    const result = await this.get(['api_config']);
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
   */
  async updateApiConfig(config) {
    await this.set({ api_config: config });
  },

  /**
   * 清除配置缓存
   * @description 强制清除内存缓存，下次访问时会重新从存储读取
   */
  clearCache() {
    this._configCache = null;
    this._cacheTimestamp = null;
  }
};

// 全局导出，供其他模块使用
window.StorageManager = StorageManager;