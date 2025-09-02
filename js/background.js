/**
 * Facebook广告成效助手 Pro - 后台脚本
 * @description Chrome扩展的后台服务工作者，负责API请求、消息处理和存储管理
 * @author Qasim
 * @version 1.0.1
 */

// 导入config脚本
importScripts('config.js');

/**
 * 统一Logger系统（后台版本）
 * @description 适用于后台环境的日志系统，与前端保持接口一致性
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

  getIcon(name) {
    return this.icons[name] || '';
  },

  /**
  * 获取调试模式状态
  * @returns {boolean} 调试模式是否开启
  * @description 从全局配置中获取DEBUG_MODE设置
  */
  get debugMode() {
    return CONFIG?.FEATURES?.DEBUG_MODE ?? false;
  },

  /**
   * 获取详细日志模式状态
   * @returns {boolean} 详细日志模式是否开启
   * @description 从全局配置中获取VERBOSE_LOGGING设置
   */
  get verboseMode() {
    return CONFIG?.FEATURES?.VERBOSE_LOGGING ?? false;
  },

  /**
   * 输出信息级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  info(message, ...args) {
    if (this.debugMode && this.verboseMode) {
      console.log(`[FB-Helper-BG] ${this.getIcon('info')} ${message}`, ...args);
    }
  },

  /**
   * 输出成功级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  success(message, ...args) {
    if (this.debugMode && this.verboseMode) {
      console.log(`[FB-Helper-BG] ${this.getIcon('success')} ${message}`, ...args);
    }
  },

  /**
   * 输出警告级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  warn(message, ...args) {
    if (this.debugMode) {
      console.warn(`[FB-Helper-BG] ${this.getIcon('warning')} ${message}`, ...args);
    }
  },

  /**
   * 输出错误级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  error(message, ...args) {
    if (this.debugMode) {
      console.error(`[FB-Helper-BG] ${this.getIcon('error')} ${message}`, ...args);
    }
  },

  /**
   * 输出重要级别日志（始终显示）
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  important(message, ...args) {
    if (this.debugMode) {
      console.log(`[FB-Helper-BG] ${this.getIcon('important')} ${message}`, ...args);
    }
  }
};

/**
 * API配置管理器
 * @description 管理API的基础URL和密钥等配置信息
 */
class ApiConfigManager {
  /**
   * 获取API配置
   * @returns {Promise<Object>} 包含base_url和api_key的配置对象
   */
  static async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['api_config'], (result) => {
        const stored = result.api_config || {};
        resolve({
          base_url: stored.base_url || CONFIG.API.BASE_URL || '',
          api_key: stored.api_key || CONFIG.API.API_KEY || '',
        });
      });
    });
  }

  /**
   * 更新API配置
   * @param {Object} config - 要存储的API配置对象
   * @returns {Promise<void>}
   */
  static async updateConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ api_config: config }, resolve);
    });
  }
}

/**
 * HTTP请求管理器
 * @description 封装fetch API，提供统一的错误处理和日志记录
 */
class HttpManager {
  /**
   * 发起HTTP请求
   * @param {string} url - 请求URL
   * @param {Object} [options={}] - 请求选项
   * @returns {Promise<Object>} 响应数据
   * @throws {Error} 当请求失败时抛出错误
   */
  static async makeRequest(url, options = {}) {
    try {
      Logger.info(`API请求: ${url}`);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      Logger.info(`响应状态: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`API响应错误: ${errorText}`);
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      Logger.success('API请求成功');
      return result;
    } catch (error) {
      Logger.error('API请求异常:', error);
      throw error;
    }
  }
}

/**
 * 指标数据服务
 * @description 处理广告指标数据的获取和提交
 */
class MetricsService {
  /**
   * 获取广告指标数据
   * @param {string} accountId - 广告账户ID
   * @param {Object} dateRange - 日期范围对象，包含start和end
   * @param {Object} campaignIds - 广告系列ID
   * @param {Object} adsetIds - 广告组ID
   * @param {Object} adIds - 广告ID
   * @returns {Promise<Object[]>} 指标数据数组
   * @throws {Error} 当缺少必要配置或请求失败时抛出错误
   */
  static async getData(accountId, dateRange, campaignIds, adsetIds, adIds) {
    const config = await ApiConfigManager.getConfig();
    if (!config.base_url) {
      throw new Error('请在插件中配置API基础URL');
    }

    const url = `${config.base_url}/api/ads/metrics`;
    const requestData = {
      account_id: accountId,
      start_date: dateRange.start,
      end_date: dateRange.end,
      campaign_ids: campaignIds,
      adset_ids: adsetIds,
      ad_ids: adIds,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    Logger.info('指标数据请求参数:', requestData);

    return await HttpManager.makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': config.api_key ? `Bearer ${config.api_key}` : ''
      },
      body: JSON.stringify(requestData)
    });
  }
}

/**
 * 消息处理器
 * @description 处理来自content script和popup的消息
 */
class MessageHandler {
  /**
   * 处理消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应回调函数
   * @returns {boolean} 是否处理了消息
   */
  static handle(message, sender, sendResponse) {
    switch (message.message) {
      case "RequestLocalStorage":
        MessageHandler.handleStorageRequest(sendResponse);
        return true;

      case "GetMetricsData":
        MessageHandler.handleMetricsRequest(message.data, sendResponse);
        return true;

      case "UpdateApiConfig":
        MessageHandler.handleConfigUpdate(message.data, sendResponse);
        return true;

      default:
        return false;
    }
  }

  /**
   * 处理存储请求
   * @param {Function} sendResponse - 响应回调函数
   */
  static handleStorageRequest(sendResponse) {
    chrome.storage.local.get(["host", "fb_plugin_status"], (result) => {
      sendResponse({
        domain: result.host || "",
        status: result.fb_plugin_status || "inactive"
      });
    });
  }

  /**
   * 处理指标数据请求
   * @param {Object} data - 请求数据
   * @param {Function} sendResponse - 响应回调函数
   */
  static async handleMetricsRequest(data, sendResponse) {
    try {
      const { accountId, dateRange, campaignIds, adsetIds, adIds } = data;

      if (!accountId) {
        throw new Error('缺少accountId参数');
      }

      const metrics = await MetricsService.getData(accountId, dateRange, campaignIds, adsetIds, adIds);

      sendResponse({
        status: 'success',
        data: metrics
      });

    } catch (error) {
      Logger.error('指标数据获取失败:', error);
      sendResponse({
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * 处理配置更新请求
   * @param {Object} data - 新的API配置
   * @param {Function} sendResponse - 响应回调函数
   */
  static async handleConfigUpdate(data, sendResponse) {
    try {
      await ApiConfigManager.updateConfig(data);
      sendResponse({
        status: 'success',
        message: 'API配置已更新'
      });
    } catch (error) {
      sendResponse({
        status: 'error',
        error: error.message
      });
    }
  }
}

/**
 * 注册消息监听器 - 增强错误处理
 * @description 监听来自content script和popup的消息，处理各种类型的请求
 * @listens chrome.runtime.onMessage
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // 使用 MessageHandler 处理消息
    const handled = MessageHandler.handle(message, sender, sendResponse);
    return handled;
  } catch (error) {
    Logger.error('消息监听器异常:', error);
    sendResponse({
      status: 'error',
      error: '内部服务器错误'
    });
    return true;
  }
});

/**
 * 扩展安装/启动时初始化
 * @description 在扩展启动时进行初始化设置
 */
chrome.runtime.onStartup.addListener(() => {
  Logger.info('Facebook广告成效助手 Pro 后台服务启动');
});

chrome.runtime.onInstalled.addListener(() => {
  Logger.info('Facebook广告成效助手 Pro 安装/更新完成');
});