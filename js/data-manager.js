/**
 * Facebook广告成效助手 Pro - 数据管理模块
 * @description 负责数据获取、定时刷新等核心功能
 * @author Qasim
 * @version 1.0.0
 */
const DataManager = {
    /**
     * 初始化数据管理器
     * @description 设置初始状态、获取页面信息、启动各种服务
     */
    async initialize() {
        window.Logger.important(`业务信息获取完成: ${window.StateManager.get('currentTab')} page, account: ${window.StateManager.get('accountId')}`);
        
        if (window.StateManager.get('features').show_status_indicator) {
            window.Logger.toast('广告成效助手插件已加载', 'success');
        }

        // 延迟执行首次数据加载
        setTimeout(async () => {
            await this.handleDataUpdate();
            this.startAutoRefresh(); // 首次加载完成后启动定时器
        }, 1000);
    },

    /**
     * 统一的数据更新处理器
     * @description 收集ID，请求API，然后渲染页面
     */
    async handleDataUpdate() {
        await window.IDManager.updateVisibleIds();
        if (window.StateManager.get('features').enable_reporting) {
            await this.refreshData(false);
        }
    },

    /**
     * 刷新数据
     * @param {boolean} isManual - 是否为手动触发，手动触发时重置错误计数
     * @description 从 API 获取最新的指标数据并更新页面显示
     */
    async refreshData(isManual = false) {
        if (window.StateManager.get('isRefreshing')) {
            window.Logger.info('数据刷新进行中，跳过本次请求');
            return;
        }

        window.StateManager.set('isRefreshing', true);
        if (isManual) {
            // 手动刷新时重置错误和空数据计数器，以立即尝试
            window.StateManager.set('consecutiveErrors', 0);
            window.StateManager.set('consecutiveEmptyData', 0);
        }

        try {
            const totalIds = window.IDManager.getVisibleIdsCount();
            if (totalIds === 0) {
                window.Logger.warn('没有可见的ID，跳过API请求');
                return;
            }

            const metrics = await window.APIService.getMetricsData();

            if (!metrics || metrics.length === 0) {
                window.Logger.warn('API返回空数据');
                window.StateManager.set('consecutiveEmptyData', window.StateManager.get('consecutiveEmptyData') + 1);
                window.StateManager.set('currentData', null);
            } else {
                window.StateManager.update({
                    currentData: metrics,
                    lastUpdateAt: Date.now(),
                    consecutiveErrors: 0,
                    consecutiveEmptyData: 0
                });
            }
            await this.updatePageDisplay();

            // 更新ID快照
            const newIdCollections = window.StateManager.get('idCollections');
            newIdCollections.lastVisibleIds = new Set(newIdCollections.visible);
            window.StateManager.set('idCollections', newIdCollections);
        } catch (error) {
            window.Logger.error('数据刷新失败:', error);
            window.StateManager.set('consecutiveErrors', window.StateManager.get('consecutiveErrors') + 1);
            if (window.StateManager.get('consecutiveErrors') === 1) {
                window.Logger.toast(`数据获取失败: ${error.message}`, 'error');
            }
        } finally {
            window.StateManager.set('isRefreshing', false);
            // 通知popup状态已变更
            this.notifyPopupStatusChange();
        }
    },

    /**
     * 更新页面显示
     * @description 渲染数据标注并显示状态提示
     */
    async updatePageDisplay() {
        await window.DOMManager.renderDataAnnotations();
        if (window.StateManager.get('features').show_status_indicator) {
            const visibleCount = window.IDManager.getVisibleIdsCount();
            const dataCount = window.StateManager.get('currentData') ? window.StateManager.get('currentData').length : 0;
            window.Logger.toast(`数据更新完成 (可见:${visibleCount}, 数据:${dataCount})`, 'success', 2000);
        }
    },

    /**
     * 启动自动刷新
     * 使用 setTimeout 循环代替 setInterval，更稳健。
     * @description 设置定时器，定期获取数据更新
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // 先确保旧的定时器已停止

        const features = window.StateManager.get('features');
        if (!features.auto_refresh || !features.enable_reporting) {
            window.Logger.warn('自动刷新或数据上报已禁用，不启动定时器');
            return;
        }

        const run = async () => {
            // 每次执行前都检查最新的功能开关状态
            const currentFeatures = await window.StorageManager.getFeatureConfig();
            window.StateManager.set('features', currentFeatures);

            if (!currentFeatures.auto_refresh || !currentFeatures.enable_reporting) {
                window.Logger.warn('开关已禁用，停止自动刷新');
                this.stopAutoRefresh();
                return;
            }

            window.Logger.info('执行定时刷新...');
            await this.refreshData(false);

            // 计算下一次刷新的间隔
            const nextInterval = this.calculateNextInterval();
            window.Logger.info(`下一次刷新将在 ${Math.round(nextInterval / 60000)} 分钟后执行`);

            const timer = setTimeout(run, nextInterval);
            window.StateManager.set('refreshTimer', timer);
        };

        // 立即启动第一次循环
        const initialInterval = this.calculateNextInterval();
        window.Logger.success(`自动刷新已启动，首次执行将在 ${Math.round(initialInterval / 60000)} 分钟后`);
        const timer = setTimeout(run, initialInterval);
        window.StateManager.set('refreshTimer', timer);
    },

    /**
     * 停止自动刷新
     * @description 清理所有定时器，停止数据自动更新
     */
    stopAutoRefresh() {
        const timer = window.StateManager.get('refreshTimer');
        if (timer) {
            clearTimeout(timer);
            window.StateManager.set('refreshTimer', null);
            window.Logger.info('自动刷新定时器已停止');
        }
    },

    /**
     * 计算下一次刷新间隔
     * @returns {number} 下次执行的毫秒数
     * @description 在出现错误或空数据时，延长下次刷新的等待时间
     */
    calculateNextInterval() {
        const errors = window.StateManager.get('consecutiveErrors');
        const emptyData = window.StateManager.get('consecutiveEmptyData');
        const baseInterval = window.FB_HELPER_CONFIG.DATA.REFRESH_INTERVAL;

        if (errors > 0) {
            // 错误退避策略: 5分钟, 15分钟, 30分钟...
            const interval = Math.min(
                baseInterval * Math.pow(2, errors - 1),
                30 * 60 * 1000 // 最大30分钟
            );
            window.Logger.warn(`请求错误，延长刷新间隔至 ${Math.round(interval / 60000)} 分钟`);
            return interval;
        }

        if (emptyData > 0) {
            // 空数据退避策略: 2倍, 3倍...
            const interval = Math.min(
                baseInterval * (emptyData + 1),
                60 * 60 * 1000 // 最大60分钟
            );
            window.Logger.warn(`数据为空，延长刷新间隔至 ${Math.round(interval / 60000)} 分钟`);
            return interval;
        }

        return baseInterval; // 正常间隔
    },

    /**
     * 通知popup窗口状态已变更
     * @description 在区域切换完成后通知popup窗口更新显示的数据状态
     */
    notifyPopupStatusChange() {
        chrome.runtime.sendMessage({
            message: 'statusChanged',
            data: {
                currentTab: window.StateManager.get('currentTab'),
                accountId: window.StateManager.get('accountId'),
                timestamp: Date.now()
            }
        }).catch(error => {
            // Popup未打开时会报错，这是正常现象，无需处理
        });
    }
};

// 全局导出，供其他模块使用
window.DataManager = DataManager;