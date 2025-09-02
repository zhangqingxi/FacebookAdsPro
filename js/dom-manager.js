/**
 * Facebook广告成效助手 Pro - DOM管理模块
 * @description 负责DOM操作、元素查找和数据标注渲染
 * @author Qasim
 * @version 1.0.0
 */
const DOMManager = {
    scrollHandler: null, // 滚动事件处理器

    /**
     * DOM选择器，用于匹配Facebook广告表格
     * @description 通过匹配 [role="table"]
     * @type {string}
     */
    selector: '[role="table"]',


    /**
     * 初始化滚动监听器
     * @description 监听鼠标滚轮事件，只在真正滚动时才更新可见ID集合
     */
    initScrollListener() {
        if (this.scrollHandler) {
            window.removeEventListener('wheel', this.scrollHandler);
        }

        // 1秒防抖，避免滚动过程中频繁触发
        this.scrollHandler = window.Utils.debounce(async (event) => {
            const tableContainer = document.querySelector(this.selector);
            if (tableContainer && tableContainer.contains(event.target)) {
                window.Logger.info('检测到表格区域滚动，更新数据...');
                await window.IDManager.updateVisibleIds();
                if (window.StateManager.get('features').enable_reporting) {
                    // 只请求数据，不重置定时器
                    await window.DataManager.refreshData(false);
                }
            }
        }, 1000);

        window.addEventListener('wheel', this.scrollHandler, { passive: true });
        window.Logger.success('滚轮滚动监听器已启动');
    },

    /**
     * 渲染数据标注
     * @description 根据API数据查找对应DOM元素并渲染标注
     */
    async renderDataAnnotations() {
        const data = window.StateManager.get('currentData');
        if (!data || data.length === 0) {
            return;
        }

        window.Logger.info('开始渲染数据标注');

        // 先清理所有旧标注，防止重复渲染
        this.clearAllAnnotations();

        let renderedCount = 0;
        data.forEach(item => {
            const id = item.id;
            if (!id) {
                window.Logger.warn('数据项缺少ID，跳过:', item);
                return;
            }

            // 通过ID在DOM中查找对应的行元素
            const rowElement = this.findRowElementById(id.toString());
            if (rowElement) {
                this.renderRowAnnotationByAttribute(rowElement, item);
                renderedCount++;
            } else {
                window.Logger.warn(`未找到ID ${id} 对应的DOM元素`);
            }
        });
        window.Logger.success(`数据标注完成，处理 ${renderedCount} 条数据`);
    },

    /**
     * 清理所有标注元素
     * @description 清理页面上所有的标注元素，防止重复渲染
     */
    clearAllAnnotations() {
        const annotations = document.querySelectorAll('.fb-ads-helper-metric-badge');
        annotations.forEach(annotation => annotation.remove());
    },

    /**
     * 根据ID在DOM中查找对应的行元素
     * @param {string} id 要查找的广告/系列/组ID
     * @returns {Element|null} 找到的行元素或null
     */
    findRowElementById(id) {
        const selector = `[data-surface="/am/table/table_row:${id}unit"]`;
        return document.querySelector(selector);
    },

    /**
     * 将货币字符串转换为数字
     * @param {string} currencyStr 货币字符串，如"$1,234.56"
     * @returns {number} 转换后的数字，转换失败返回0
     */
    parseCurrencyToFloat(currencyStr) {
        if (!currencyStr || typeof currencyStr !== 'string') return 0;
        const numberStr = currencyStr.replace(/[^0-9.-]+/g, "");
        const number = parseFloat(numberStr);
        return isNaN(number) ? 0 : number;
    },

    /**
     * 根据属性选择器渲染行标注
     * @param {Element} row 行元素
     * @param {Object} data 要渲染的数据对象
     * @description 使用data-surface属性定位目标单元格并渲染指标标注
     */
    renderRowAnnotationByAttribute(row, data) {
        const rowId = data.id;
        if (!rowId) return;

        // 定义目标单元格的选择器（基于Facebook的data-surface属性）
        const surfaceTemplates = {
            checkout: `/am/table/table_row:${rowId}unit/table_cell:forAttributionWindow(actions:omni_initiated_checkout,default)`,
            payment: `/am/table/table_row:${rowId}unit/table_cell:forAttributionWindow(results,default)`,
            roas: `/am/table/table_row:${rowId}unit/table_cell:forAttributionWindow(purchase_roas:omni_purchase,default)`,
            amountSpent: `/am/table/table_row:${rowId}unit/table_cell:spend`
        };

        // 1. 渲染"结账发起次数"标注
        if (data.checkout_count > 0) {
            const cell = row.querySelector(`[data-surface="${surfaceTemplates.checkout}"]`);
            if (cell) {
                this.renderMetricInTargetCell(cell, data.checkout_count, 'checkout', '🛍️');
            } else {
                window.Logger.warn(`未找到ID ${rowId} 的"结账"单元格`);
            }
        }
		
		// 2. 渲染"成效"标注
        if (data.payment_count > 0) {
            const cell = row.querySelector(`[data-surface="${surfaceTemplates.payment}"]`);
            if (cell) {
                this.renderMetricInTargetCell(cell, data.payment_count, 'payment', '🛍️');
            } else {
                window.Logger.warn(`未找到ID ${rowId} 的"成效"单元格`);
            }
        }

		// 3. 渲染"广告花费回报 (ROAS) - 购物"标注
        if (data.payment_amount && data.payment_amount > 0) {
            const amountSpentCell = row.querySelector(`[data-surface="${surfaceTemplates.amountSpent}"]`);
            const roasCell = row.querySelector(`[data-surface="${surfaceTemplates.roas}"]`);
            if (amountSpentCell && roasCell) {
                const amountSpentValue = this.parseCurrencyToFloat(amountSpentCell.textContent);
                if (amountSpentValue > 0) {
                    const calculatedROAS = (data.payment_amount / amountSpentValue).toFixed(2);
                    this.renderMetricInTargetCell(roasCell, calculatedROAS, 'roas', '📈');
                }
            }else{
                if (!amountSpentCell) window.Logger.warn(`未找到ID ${rowId} 的"已花费金额"单元格`);
                if (!roasCell) window.Logger.warn(`未找到ID ${rowId} 的"ROAS"单元格`);
            }
        }
    },

    /**
     * 在目标单元格中渲染指标标注
     * @param {Element} cell 目标单元格元素
     * @param {string|number} value 要显示的值
     * @param {string} type 标注类型：'checkout', 'payment', 'roas'
     * @param {string} icon 显示的图标
     * @returns {number} 成功返回1，失败返回0
     */
    renderMetricInTargetCell(cell, value, type, icon) {
        try {
            // 定位列区域div节点
            const innerCellContainer = cell.querySelector('div');
            if (!innerCellContainer) return false;

            // 清理该单元格内可能存在的旧标注
            const existing = cell.querySelector(`.fb-ads-helper-metric-badge[data-type="${type}"]`);
            if (existing) existing.remove();

            // 创建标注容器，使用相对定位系统
            const annotation = this.createAnnotationElement(value, type, icon);

            // 直接插入到单元格div容器中
            innerCellContainer.appendChild(annotation);
            return true;
        } catch (error) {
            window.Logger.error(`添加标注失败 [${type}]:`, error);
            return false;
        }
    },

    /**
     * 创建标注元素
     * @param {string|number} value 显示值
     * @param {string} type 标注类型
     * @param {string} icon 图标
     * @returns {Element} 创建的标注容器元素
     */
    createAnnotationElement(value, type, icon) {
        const annotation = document.createElement('div');
        annotation.className = 'fb-ads-helper-metric-badge';
        annotation.dataset.type = type;
        annotation.innerHTML = `${icon} ${value}`;
        const colors = { checkout: '#1976d2', payment: '#388e3c', roas: '#f57c00' };
        annotation.style.cssText = `background: ${colors[type] || '#666'} !important;`;
        return annotation;
    }
};

// 全局导出，供其他模块使用
window.DOMManager = DOMManager;