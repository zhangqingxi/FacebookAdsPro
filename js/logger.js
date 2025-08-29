/**
 * 统一日志系统 - 提供统一的日志输出和显示控制
 * @description 集成日志输出、Toast提示等功能，支持不同级别的日志和显示模式
 * @author Qasim
 * @version 1.0.0
 */

/**
 * 日志管理器对象
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
      console.log(`[FB-Helper] ${this.getIcon('info')} ${message}`, ...args);
    }
  },
  
  /**
   * 输出成功级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  success(message, ...args) {
    if (this.debugMode && this.verboseMode) {
      console.log(`[FB-Helper] ${this.getIcon('success')} ${message}`, ...args);
    }
  },
  
  /**
   * 输出警告级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  warn(message, ...args) {
    if (this.debugMode) {
      console.warn(`[FB-Helper] ${this.getIcon('warning')} ${message}`, ...args);
    }
  },
  
  /**
   * 输出错误级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  error(message, ...args) {
    if (this.debugMode) {
      console.error(`[FB-Helper] ${this.getIcon('error')} ${message}`, ...args);
    }
  },
  
  /**
   * 输出重要级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  important(message, ...args) {
    if (this.debugMode) {
      console.log(`[FB-Helper] ${this.getIcon('important')} ${message}`, ...args);
    }
  },
  
  /**
   * 显示Toast提示
   * @param {string} text - 要显示的文本
   * @param {string} [type='info'] - 提示类型：'info', 'success', 'error'
   * @param {number} [duration=3000] - 显示时长（毫秒）
   * @description 在页面右上角显示浮动提示，支持多个提示堆叠显示
   */
  toast(text, type = 'info', duration = 3000) {
    // 检查状态指示器开关
    if (!window.StateManager?.get('features')?.show_status_indicator) {
      return;
    }
    
    // 清理已过期的toast
    this.cleanupExpiredToasts();
    
    // 获取当前有效的toast数量来计算位置
    const activeToasts = document.querySelectorAll('.fb-ads-helper-toast[data-expired="false"]');
    const topOffset = 20 + (activeToasts.length * 65); // 增加间距避免重叠
    
    const toast = document.createElement('div');
    toast.className = 'fb-ads-helper-toast';
    toast.dataset.expired = 'false';
    toast.dataset.createdAt = Date.now().toString();
    toast.style.cssText = `
      position: fixed;
      top: ${topOffset}px;
      right: 20px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 13px;
      font-weight: 500;
      color: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#333'};
      opacity: 0;
      transform: translateX(30px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 300px;
      word-wrap: break-word;
      border-left: 4px solid ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
    `;
    toast.textContent = text;
    document.body.appendChild(toast);
    
    // 动画进入
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    
    // 设置过期定时器
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
    
    // 重新计算所有toast位置（避免动态移除时的位置跳跃）
    setTimeout(() => {
      this.recalculateToastPositions();
    }, 100);
  },
  
  /**
   * 移除Toast元素
   * @param {Element} toast - 要移除的Toast元素
   * @description 带动画效果地移除Toast元素
   */
  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.dataset.expired = 'true';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        // 移除后重新计算剩余toast的位置
        this.recalculateToastPositions();
      }
    }, 300);
  },
  
  /**
   * 清理已过期的Toast元素
   * @description 移除所有已过期和超时的Toast元素，防止内存泄漏
   */
  cleanupExpiredToasts() {
    const expiredToasts = document.querySelectorAll('.fb-ads-helper-toast[data-expired="true"]');
    expiredToasts.forEach(toast => {
      if (toast.parentNode) {
        toast.remove();
      }
    });
    
    // 清理超时的toast（防止内存泄漏）
    const allToasts = document.querySelectorAll('.fb-ads-helper-toast');
    const now = Date.now();
    allToasts.forEach(toast => {
      const createdAt = parseInt(toast.dataset.createdAt || '0');
      if (now - createdAt > 30000) { // 30秒后强制清理
        toast.remove();
      }
    });
  },
  
  /**
   * 重新计算Toast位置
   * @description 在Toast被移除后，重新计算剩余Toast的垂直位置，防止位置跳跃
   */
  recalculateToastPositions() {
    const activeToasts = document.querySelectorAll('.fb-ads-helper-toast[data-expired="false"]');
    activeToasts.forEach((toast, index) => {
      const newTop = 20 + (index * 65);
      toast.style.top = `${newTop}px`;
    });
  }
};

// 全局导出，供其他模块使用
window.Logger = Logger;