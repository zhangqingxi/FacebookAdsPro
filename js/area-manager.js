/**
 * 区域管理器 - 智能监听页面切换和内容变化
 * @description 使用 MutationObserver 统一监听所有页面变化（区域切换和数据刷新）
 * @author Qasim
 * @version 1.0.1
 */
const AreaManager = {
    lastArea: null, // 上一次的页面类型
    observer: null, // 观察器
    debouncedHandler: null, // 区域检查定时器

    /**
     * 初始化区域管理器
     */
    init() {
        this.lastArea = window.Utils.getCurrentTab();
        // 创建一个 handleChanges 的防抖版本，延迟1500毫秒执行
        this.debouncedHandler = window.Utils.debounce(this.handleChanges.bind(this), 1500);
        this.startObserver();
        window.Logger.success('区域内容变化监听器已启动');
    },

    /**
     * 启动 MutationObserver
     * @description 通过DOM变化来监听页面区域内容
     */
    startObserver() {
        this.stopObserver(); // 防止重复监听

        // 表格区域 - 确保可以找到DOM目标
        const targetNode = document.querySelector(window.DOMManager.selector);

        // 通过表格进度条监控内容
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 检查是否有进度条被添加
                    const progressBarAdded = Array.from(mutation.addedNodes).some(node =>
                        node.nodeType === 1 && (node.querySelector('[role="progressbar"]') || node.matches('[role="progressbar"]'))
                    );

                    if (progressBarAdded) {
                        this.debouncedHandler();
                        return;
                    }
                }
            }
        });

        // 监听整个body的子节点和后代节点变化
        this.observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    },

    /**
     * 停止 MutationObserver
     * @description 清理定时器
     */
    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    /**
     * 数据变动处理器
     * @description 统一处理所有变化的核心函数
     */
    async handleChanges() {
        const newArea = Utils.getCurrentTab();

        if (!newArea) {
            // 可能在非Facebook广告管理页面，停止监听
            if (window.location.href.includes('facebook.com/adsmanager')) return;
            window.Logger.warn('不在Facebook广告管理页面，停止监听');
            this.stopObserver();
            window.DataManager.stopAutoRefresh();
            return;
        }

        // 【情况一：区域切换】页面类型发生变化 (e.g., Campaign -> Ad Set)
        if (newArea !== this.lastArea) {
            window.Logger.important(`检测到【区域切换】: ${this.lastArea || '未知'} -> ${newArea}`);
            this.lastArea = newArea;
            this.performFullReset(newArea);
            return;
        }

        // 【情况二：数据刷新】页面类型未变，但DOM发生变化 (e.g., 排序, 过滤, 日期更改)
        if (newArea && newArea === this.lastArea) {

            const newDateRange = window.Utils.getDateRange();
            const lastDateRange = window.StateManager.get('dateRange');

            if (newDateRange && lastDateRange && (newDateRange.start !== lastDateRange.start || newDateRange.end !== lastDateRange.end)) {
                window.Logger.important(`检测到【日期范围变更】，执行刷新！`);
                window.StateManager.set('dateRange', newDateRange);
            } else {
                window.Logger.important(`检测到【列表內容刷新】，执行刷新！`);
            }

            await window.DataManager.handleDataUpdate()
        }
    },

    /**
     * 执行完整的重置流程 (用于区域切换)
     * @param {string} currentArea - 新的页面区域
     */
    performFullReset(currentArea) {
        window.Logger.info(`为新区域 ${currentArea} 执行完整重置...`);

        // 停止旧的定时器
        window.DataManager.stopAutoRefresh();

        // 更新状态
        window.StateManager.set('currentTab', currentArea);
        window.StateManager.update({
            accountId: window.Utils.getAccountId(),
            dateRange: window.Utils.getDateRange()
        });

        // 清理旧数据
        window.StateManager.resetDataState();
        window.DOMManager.clearAllAnnotations();

        // 重置索引
        window.DOMManager.resetColumnIndices();

        // 清理API缓存
        window.StateManager.set('lastApiParams', null);

        // 重新初始化滚动监听
        window.DOMManager.initScrollListener();

        // 延迟执行，等待新页面DOM稳定
        setTimeout(async () => {
            await window.DataManager.handleDataUpdate();
            // 在新页面数据加载完成后，重新启动定时器
            window.DataManager.startAutoRefresh();
        }, 500); // 500ms 延迟
    },
};

// 全局导出，供其他模块使用
window.AreaManager = AreaManager;