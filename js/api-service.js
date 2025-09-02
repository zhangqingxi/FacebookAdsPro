/**
 * Facebook广告成效助手 Pro - API服务模块
 * @description 处理与后台脚本的通信和数据获取
 * @author Qasim
 * @version 1.0.1
 */
const APIService = {
    /**
     * 获取指标数据
      * @param {Object} apiParams - API请求参数
     * @returns {Promise<Array>} API返回的数据数组
     */
    async getMetricsData(apiParams) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                message: 'GetMetricsData',
                data: apiParams
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