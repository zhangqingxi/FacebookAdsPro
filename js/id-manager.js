/**
 * ID管理器 - 统一管理Facebook广告页面的ID提取和收集
 * @description 负责从Facebook广告页面的DOM结构中提取广告、系列、组的ID，
 *              并维护可见ID集合用于API请求
 * @author Qasim
 * @version 1.0.1
 */

/**
 * ID管理器对象
 * @namespace IDManager
 */
const IDManager = {

  /**
   * 更新全局ID状态，并返回API所需的ID参数
   * @description 维护当前窗口可见的ID集合，用于API请求
   * @returns {Object} 包含三个去重ID数组的对象 { campaignIds, adsetIds, adIds }
   */
  async updateIdState() {

    // 1. 从DOMManager获取包含三个原始数组的对象
    const { campaignIds, adsetIds, adIds } = window.DOMManager.extractVisibleIds();

    // 2. 在这里使用 Set 对每个数组进行去重
    const uniqueCampaignIds = [...new Set(campaignIds)];
    const uniqueAdsetIds = [...new Set(adsetIds)];
    const uniqueAdIds = [...new Set(adIds)];

    // 3. 将去重后的数组更新到全局状态
    window.StateManager.update({
      campaignIds: uniqueCampaignIds,
      adsetIds: uniqueAdsetIds,
      adIds: uniqueAdIds
    });

    window.Logger.info(`ID状态已更新 (系列:${uniqueCampaignIds.length}, 组:${uniqueAdsetIds.length}, 广告:${uniqueAdIds.length})`);

    // 返回API所需的ID參數，供DataManager使用
    return { 
      campaignIds: uniqueCampaignIds, 
      adsetIds: uniqueAdsetIds, 
      adIds: uniqueAdIds 
    };
  },
};

// 全局导出，供其他模块使用
window.IDManager = IDManager;