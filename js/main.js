/**
 * Facebook广告成效助手 Pro - 主脚本 (入口文件)
 * @description 在Facebook广告管理页面注入脚本，协调各个模块的初始化和运行
 * @author Qasim
 * @version 1.0.1
 */

(function () {
  'use strict';

  /**
   * 插件初始化函数
   * @description 统一初始化入口，协调各个管理器的启动
   */
  async function initialize() {
    // 增加初始化检查和延迟机制
    if (window.StateManager.get('isInitialized')) {
      window.Logger.warn('插件已初始化，跳过重复初始化');
      return;
    }

    if (!window.location.href.includes('facebook.com/adsmanager')) {
      window.Logger.info('不在Facebook广告管理页面，跳过初始化');
      return;
    }

    // 等待页面元素加载完成
    const waitForElements = () => {
      return new Promise((resolve) => {
        const checkElements = () => {
          const tableExists = document.querySelector('[role="table"]');
          const dateRangeExists = document.querySelector('[data-surface="/am/table/stats_range"]');

          if (tableExists && dateRangeExists) {
            resolve(true);
          } else {
            setTimeout(checkElements, 500);
          }
        };
        checkElements();
      });
    };

    try {
      window.Logger.important('Facebook广告成效助手 Pro 开始初始化...');

      // 等待关键元素加载
      await waitForElements();
      window.Logger.success('关键元素已加载，继续初始化...');

      // 1. 设置初始状态
      window.StateManager.update({
        isInitialized: true,
        features: await window.StorageManager.getFeatureConfig(),
        currentTab: window.Utils.getCurrentTab(),
        accountId: window.Utils.getAccountId(),
        dateRange: window.Utils.getDateRange(),
      });

      // 2. 初始化核心模块
      await window.DataManager.initialize();
      window.AreaManager.init();
      window.DOMManager.initScrollListener();

      // 3. 设置消息监听器
      setupMessageListeners();

      window.Logger.important('Facebook广告成效助手 Pro 全局初始化完成');
    } catch (error) {
      window.Logger.error('全局初始化失败:', error);
      if (window.StateManager.get('features')?.show_status_indicator) {
        window.Logger.toast('初始化失败', 'error');
      }
    }
  }

  /**
   * 设置与popup和background的消息监听器
   * @description 处理来自popup、background消息，比如手动刷新、获取状态、页面卸载等
   */
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.message === 'getStatus') {
        sendResponse({
          status: window.StateManager.get('isInitialized'),
          currentTab: window.StateManager.get('currentTab'),
          accountId: window.StateManager.get('accountId'),
          dataCacheSize: window.StateManager.get('currentData') ? window.StateManager.get('currentData').length : 0,
          lastUpdate: window.StateManager.get('lastUpdateAt') ? new Date(window.StateManager.get('lastUpdateAt')).toLocaleString('zh-CN') : '未更新',
          features: window.StateManager.get('features')
        });
        return true;
      } else if (request.message === 'manualRefresh') {
        if (!window.StateManager.get('isInitialized')) {
          sendResponse({ status: 'error', error: '插件尚未初始化' });
          return true;
        }

        window.Logger.info('收到来自Popup的手动刷新命令');
        window.DataManager.handleDataUpdate(true);
        sendResponse({ status: 'success', message: '手动刷新已启动' });
        return true;
      }
    });

    window.addEventListener('beforeunload', () => {
      if (window.StateManager.get('isInitialized')) {
        window.DataManager.stopAutoRefresh();
        window.AreaManager.stopObserver();
        window.Logger.info('页面卸载，所有资源已清理');
      }
    });
  }

  /**
   * 插件启动入口
   * @description 根据页面加载状态选择合适的初始化时机
   */
  if (document.readyState === 'complete') {
    window.Logger.info('页面已完全加载，延迟1秒启动插件'); // 给Facebook页面更多初始化时间
    setTimeout(initialize, 1000);
  } else {
    window.Logger.info('等待页面完全加载...');
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        window.Logger.info('页面加载完成，延迟2秒启动插件'); // 额外延迟确保稳定性
        setTimeout(initialize, 2000);
      }
    });
  }

})();