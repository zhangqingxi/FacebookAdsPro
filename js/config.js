/**
 * Facebook广告成效助手 Pro - 配置文件
 * 所有环境配置和默认设置
 */

const CONFIG = {
  // API配置
  API: {
    BASE_URL: 'http://cctvskit.local',
    API_KEY: '',
  },

  // 店铺配置
  SHOP: {
    DOMAIN: 'cctvskit.com',
  },

  // 功能开关（默认值）
  FEATURES: {
    ENABLE_REPORTING: true,        // 启用数据上报
    AUTO_REFRESH: true,            // 自动刷新数据
    SHOW_STATUS_INDICATOR: true,   // 显示状态指示器
    ENABLE_CACHE: true,            // 启用缓存
    DEBUG_MODE: true,             // 调试模式 (控制台输出总开关)
    VERBOSE_LOGGING: true         // 详细日志模式 (控制台输出一些info、success等辅助信息)
  },

  // 数据配置
  DATA: {
    CACHE_DURATION: 5 * 60 * 1000, // 缓存时间（5分钟）
    REFRESH_INTERVAL: 10 * 60 * 1000,   // 刷新间隔（10分钟）
    MAX_RETRIES: 3                 // 最大重试次数
  },
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.FB_HELPER_CONFIG = CONFIG;
}