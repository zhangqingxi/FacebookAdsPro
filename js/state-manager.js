/**
 * Facebook广告成效助手 Pro - 全局状态管理器
 * @description 管理插件的所有运行时状态
 * @author Qasim
 * @version 1.0.0
 */

const StateManager = {
    // 插件的默认和运行时状态
    state: {
        isInitialized: false,           // 是否已初始化
        currentTab: null,              // 当前页面类型：'campaign', 'adset', 'ad'
        accountId: null,               // 当前广告账户ID
        dateRange: null,               // 日期范围
        currentData: null,             // 当前API返回的数据
        refreshTimer: null,            // 定时刷新计时器 (Timeout instance)
        isRefreshing: false,           // 是否正在刷新数据
        features: {                    // 功能开关 (将由StorageManager加载)
            enable_reporting: true,
            auto_refresh: true,
            show_status_indicator: true
        },
        lastUpdateAt: null,            // 最后更新时间
        consecutiveErrors: 0,          // 连续错误次数
        consecutiveEmptyData: 0,       // 连续空数据次数
        idCollections: {               // ID集合管理
            visible: new Set(),          // 当前可见的ID
            lastUpdate: null             // 最后更新时间
        },
        parentIds: {                   // 父级ID（用于层级关系）
            campaignId: null,
            adsetId: null
        }
    },

    /**
     * 获取状态值
     * @param {string} key - 状态属性名
     * @returns {*}
     */
    get(key) {
        return this.state[key];
    },

    /**
     * 设置状态值
     * @param {string} key - 状态属性名
     * @param {*} value - 新的值
     */
    set(key, value) {
        this.state[key] = value;
    },

    /**
     * 批量更新状态
     * @param {Object} updates - 包含多个键值对的对象
     */
    update(updates) {
        Object.assign(this.state, updates);
    },

    /**
     * 重置与数据相关的状态，通常在页面切换时调用
     */
    resetDataState() {
        this.state.idCollections.visible.clear();
        this.state.currentData = null;
        this.state.consecutiveErrors = 0;
        this.state.consecutiveEmptyData = 0;
    }
};

// 将其附加到window，以便其他模块可以访问
window.StateManager = StateManager;