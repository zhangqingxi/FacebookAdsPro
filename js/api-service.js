/**
 * Facebook广告成效助手 Pro - API服务模块
 * @description 处理与后台脚本的通信和数据获取
 * @author Qasim
 * @version 1.0.0
 */
const APIService = {
    /**
     * 获取指标数据
     * @param {string} accountId 账户ID
     * @param {Object} dateRange 日期范围
     * @param {Object} idCollections ID集合
     * @returns {Promise<Array>} API返回的数据数组
     */
    async getMetricsData() {
        const accountId = window.StateManager.get('accountId');
        const dateRange = window.StateManager.get('dateRange');
        const idCollections = window.IDManager.collectForAPI();

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                message: 'GetMetricsData',
                data: { accountId, dateRange, ...idCollections }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.status === 'success') {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Failed to get metrics data from background script'));
                }
            });
        });
    }
};

// 全局导出，供其他模块使用
window.APIService = APIService;