/**
 * ID管理器 - 统一管理Facebook广告页面的ID提取和收集
 * @description 负责从Facebook广告页面的DOM结构中提取广告、系列、组的ID，
 *              并维护可见ID集合用于API请求
 * @author Qasim
 * @version 1.0.0
 */

/**
 * ID管理器对象
 * @namespace IDManager
 */
const IDManager = {
  /**
   * DOM选择器，用于匹配Facebook广告表格行
   * @description 通过匹配 data-surface 属性以 "unit" 结尾来精确定位行容器
   * @type {string}
   */
  selector: '[data-surface*="table_row:"][data-surface$="unit"]',

  /**
   * 从DOM元素中提取ID
   * @param {Element} element - 要提取ID的DOM元素
   * @returns {string|null} 提取到的ID，失败返回null
   * @description 通过解析data-surface属性中的table_row:数字模式来提取ID
   */
  extractFromElement(element) {
    const surfaceAttr = element.getAttribute('data-surface');
    if (!surfaceAttr) {
      return null;
    }

    const match = surfaceAttr.match(/table_row:(\d+)/);
    return match ? match[1] : null;
  },
  /**
   * 提取当前页面的所有ID
   * @returns {string[]} ID数组
   * @description 扫描当前页面的所有表格行，提取并返回所有有效的ID
   */
  extractCurrentPageIds() {
    const rows = document.querySelectorAll(this.selector);
    const ids = [];
    
    rows.forEach(row => {
      const id = this.extractFromElement(row);
      if (id) ids.push(id);
    });
    
    return ids;
  },
  
  /**
   * 更新可见ID集合
   * @description 维护当前窗口可见的ID集合，用于API请求
   * @async
   */
  async updateVisibleIds() {
    const currentIds = this.extractCurrentPageIds();
    
    if (currentIds.length > 0) {
      // 更新可见ID集合
      const idCollections = StateManager.get('idCollections');
      idCollections.visible = new Set(currentIds);
      idCollections.lastUpdate = Date.now();
      StateManager.set('idCollections', idCollections);
    }
  },

  /**
   * 获取当前可见ID的数量
   * @description 为 data-manager 提供一个便捷的接口，用于判断是否需要请求API
   * @returns {number}
   */
  getVisibleIdsCount() {
    const idCollections = StateManager.get('idCollections');
    return idCollections.visible.size;
  },
  
  /**
   * 为API请求收集并组织ID
   * @returns {Object} 包含campaignIds、adsetIds、adIds的对象
   * @description 根据当前页面类型和可见ID，组织成API所需的数据结构，从URL获取父级ID
   */
  collectForAPI() {
    const result = { campaignIds: [], adsetIds: [], adIds: [] };
    const visibleIds = [...StateManager.get('idCollections').visible];
    const currentTab = StateManager.get('currentTab');
    const parentIds = StateManager.get('parentIds');
    
    window.Logger.info(`为API收集当前可见ID: ${visibleIds.length} 个`);
    
    if (currentTab === 'campaign') {
      result.campaignIds = visibleIds;
    } else if (currentTab === 'adset') {
      result.adsetIds = visibleIds;
      if (parentIds.campaignId) {
        result.campaignIds = [parentIds.campaignId];
        Logger.info(`从状态管理器获取父级系列ID: ${parentIds.campaignId}`);
      }
    } else if (currentTab === 'ad') {
      result.adIds = visibleIds;
      if (parentIds.campaignId) {
        result.campaignIds = [parentIds.campaignId];
        Logger.info(`从状态管理器获取父级系列ID: ${parentIds.campaignId}`);
      }
      if (parentIds.adsetId) {
        result.adsetIds = [parentIds.adsetId];
        Logger.info(`从状态管理器获取父级组ID: ${parentIds.adsetId}`);
      }
    }
    
    const totalIds = result.campaignIds.length + result.adsetIds.length + result.adIds.length;
    Logger.info(`总计收集ID数: ${totalIds} (系列:${result.campaignIds.length}, 组:${result.adsetIds.length}, 广告:${result.adIds.length})`);
    return result;
  }
};

// 全局导出，供其他模块使用
window.IDManager = IDManager;