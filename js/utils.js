/**
 * Facebook广告成效助手 Pro - 工具函数模块
 * @description 提供通用的工具方法，支持日期解析、页面类型检测等
 * @author Qasim
 * @version 1.0.0
 */

const Utils = {
    /**
     * 获取当前页面类型
     * @returns {string|null} 页面类型：'campaign', 'adset', 'ad' 或 null
     */
    getCurrentTab() {
        const url = window.location.href;
        if (url.includes('/adsmanager/manage/campaigns')) return 'campaign';
        if (url.includes('/adsmanager/manage/adsets')) return 'adset';
        if (url.includes('/adsmanager/manage/ads')) return 'ad';
        return null;
    },

    /**
     * 从URL中提取广告账户ID
     * @returns {string|null} 账户ID或null
     */
    getAccountId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('act');
    },

    /**
     * 通过DOM元素解析获取当前页面的日期范围
     * @returns {Object} 包含start和end的日期对象
     */
    getDateRange() {
        try {
            // 查找包含日期范围信息的DOM元素
            const dateRangeElement = document.querySelector('[data-surface="/am/table/stats_range"]');
            if (!dateRangeElement) {
                window.Logger.warn('未找到日期范围元素，使用默认30天范围');
                return this.getDefaultDateRange();
            }

            // 直接获取元素的文本内容
            const dateText = dateRangeElement.textContent || dateRangeElement.innerText;
            if (!dateText) {
                window.Logger.warn('日期元素中未找到文本内容，使用默认30天范围');
                return this.getDefaultDateRange();
            }

            // 解析日期文本中的日期范围
            // 支持多种格式: "过去 30 天：2025年7月28日 – 2025年8月26日", "2025年7月28日 – 2025年8月26日" 等
            const dateRange = this.parseDateRangeFromText(dateText);
            if (dateRange) {
                window.Logger.success(`成功解析日期范围: ${dateRange.start} 到 ${dateRange.end}`);
                return dateRange;
            } else {
                window.Logger.warn('日期文本解析失败，使用默认30天范围');
                return this.getDefaultDateRange();
            }
        } catch (error) {
            window.Logger.error('解析日期范围时发生错误:', error);
            return this.getDefaultDateRange();
        }
    },

    /**
     * 从文本中解析日期范围
     * @param {string} text - 包含日期范围的文本
     * @returns {Object|null} 包含start和end的日期对象
     */
    parseDateRangeFromText(text) {
        if (!text) return null;
        // 多种日期格式的正则表达式
        const patterns = [
            // 中文格式: "2025年7月28日 – 2025年8月26日"
            /(\d{4})年(\d{1,2})月(\d{1,2})日\s*[–—-]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/,
            // 英文格式: "Jul 28, 2025 – Aug 26, 2025"
            /(\w{3})\s+(\d{1,2}),\s+(\d{4})\s*[–—-]\s*(\w{3})\s+(\d{1,2}),\s+(\d{4})/,
            // ISO格式: "2025-07-28 – 2025-08-26"
            /(\d{4})-(\d{1,2})-(\d{1,2})\s*[–—-]\s*(\d{4})-(\d{1,2})-(\d{1,2})/,
            // 短格式: "7/28/2025 – 8/26/2025"
            /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[–—-]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let startDate, endDate;
                    
                    if (pattern === patterns[0]) {
                        // 中文格式处理
                        startDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                        endDate = new Date(parseInt(match[4]), parseInt(match[5]) - 1, parseInt(match[6]));
                    } else if (pattern === patterns[1]) {
                        // 英文格式处理
                        startDate = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
                        endDate = new Date(`${match[4]} ${match[5]}, ${match[6]}`);
                    } else if (pattern === patterns[2]) {
                        // ISO格式处理
                        startDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                        endDate = new Date(parseInt(match[4]), parseInt(match[5]) - 1, parseInt(match[6]));
                    } else if (pattern === patterns[3]) {
                        // 短格式处理
                        startDate = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
                        endDate = new Date(parseInt(match[6]), parseInt(match[4]) - 1, parseInt(match[5]));
                    }
                    // 验证日期有效性
                    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                        // 使用本地日期格式，避免时区问题
                        const formatLocalDate = (date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        };
                        return { start: formatLocalDate(startDate), end: formatLocalDate(endDate) };
                    }
                } catch (error) { continue; }
            }
        }
        return null;
    },

    /**
     * 获取默认日期范围（最近30天）
     * @returns {Object}
     */
    getDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 使用本地日期格式，避免时区问题
        const formatLocalDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        return { start: formatLocalDate(startDate), end: formatLocalDate(endDate) };
    },

    /**
     * 防抖函数
     * @param {Function} func 要执行的函数
     * @param {number} wait 等待时间（毫秒）
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// 全局导出，供其他模块使用
window.Utils = Utils;