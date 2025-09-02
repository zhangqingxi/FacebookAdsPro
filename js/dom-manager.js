/**
 * Facebook广告成效助手 Pro - DOM管理模块
 * @description 负责DOM操作、元素查找和数据标注渲染
 * @author Qasim
 * @version 1.0.1
 */
const DOMManager = {
    scrollHandler: null, // 滚动事件处理器
    _indicesMapped: false, // 内部状态，标记当前列索引是否已映射

    selector: '[role="table"]',

    // CSS 选择器配置
    selectors: {
        header_row: "div._1mmd", // 表头的行容器
        header_cell: "div._1eyh", // 表头行内的每一个单元格
        data_row: "div._1gda", // 数据区域的每一行
        data_cell: "div._4lg0", // 数据行内的每一个单元格
    },

    // 列名配置
    columns: {
        campaign: { name: "广告系列编号", index: -1 },
        adset: { name: "广告组编号", index: -1 },
        ad: { name: "广告编号", index: -1 },
        checkout_count: { name: "结账发起次数", index: -1 },
        payment_count: { name: "成效", index: -1 },
        roas: { name: "广告花费回报 (ROAS) - 购物", index: -1 },
        amount_spent: { name: "已花费金额", index: -1 },
    },

    /**
     * @private 内部函数：扫描表头，映射列名到其索引位置。
     * @description 将结果直接更新到 this.columns 对象中。
     */
    _mapColumnIndices() {
        // 重置所有索引
        for (const key in this.columns) {
            this.columns[key].index = -1;
        }
        const headerRow = document.querySelector(this.selectors.header_row);

        if (!headerRow) {
            window.Logger.error("未找到表头行，无法进行列索引。");
            return;
        }

        const headerCells = headerRow.querySelectorAll(this.selectors.header_cell);
        headerCells.forEach((cell, index) => {
            const cellText = cell.textContent.trim();
            for (const key in this.columns) {
                if (this.columns[key].name === cellText) {
                    this.columns[key].index = index;
                    window.Logger.info(`列索引映射: '${cellText}' -> index ${index}`);
                }
            }
        });
        this._indicesMapped = true;
    },

    /**
     * @private 内部函数：在单行上根据索引渲染所有标注。
     * @param {Element} row - 要渲染的行元素
     * @param {Object} data - 要渲染的数据对象
     */
    _renderAnnotationsOnRow(row, data) {
        const cells = row.querySelectorAll(this.selectors.data_cell);

        // 渲染"结账发起次数"
        const checkoutIndex = this.columns.checkout_count.index;
        if (data.checkout_count > 0 && checkoutIndex > -1 && cells[checkoutIndex]) {
            this._renderMetricInTargetCell(
                cells[checkoutIndex],
                data.checkout_count,
                "checkout",
                "🛍️"
            );
        }

        // 渲染"成效"
        const paymentIndex = this.columns.payment_count.index;
        if (data.payment_count > 0 && paymentIndex > -1 && cells[paymentIndex]) {
            this._renderMetricInTargetCell(
                cells[paymentIndex],
                data.payment_count,
                "payment",
                "💰"
            );
        }

        // 渲染"ROAS"
        const roasIndex = this.columns.roas.index;
        const amountSpentIndex = this.columns.amount_spent.index;
        if (data.payment_amount > 0 && roasIndex > -1 && amountSpentIndex > -1) {
            const amountSpentCell = cells[amountSpentIndex];
            const roasCell = cells[roasIndex];
            if (amountSpentCell && roasCell) {
                const amountSpentValue = this._parseCurrencyToFloat(
                    amountSpentCell.textContent
                );
                if (amountSpentValue > 0) {
                    const calculatedROAS = (
                        data.payment_amount / amountSpentValue
                    ).toFixed(2);
                    this._renderMetricInTargetCell(roasCell, calculatedROAS, "roas", "📈");
                }
            }
        }
    },

    /**
     * @private 内部函数：将货币字符串转换为数字
     * @param {string} currencyStr 货币字符串，如"$1,234.56"
     * @returns {number} 转换后的数字，转换失败返回0
     */
    _parseCurrencyToFloat(currencyStr) {
        if (!currencyStr || typeof currencyStr !== "string") return 0;
        const numberStr = currencyStr.replace(/[^0-9.-]+/g, "");
        const number = parseFloat(numberStr);
        return isNaN(number) ? 0 : number;
    },

    /**
     * @private 内部函数：创建标注元素
     * @param {string|number} value 显示值
     * @param {string} type 标注类型
     * @param {string} icon 图标
     * @returns {Element} 创建的标注容器元素
     */
    _createAnnotationElement(value, type, icon) {
        const annotation = document.createElement("div");
        annotation.className = "fb-ads-helper-metric-badge";
        annotation.dataset.type = type;
        annotation.innerHTML = `${icon} ${value}`;
        const colors = { checkout: "#1976d2", payment: "#388e3c", roas: "#f57c00" };
        annotation.style.cssText = `background: ${colors[type] || "#666"
            } !important;`;
        return annotation;
    },

    /**
     * @private 内部函数：在目标单元格中渲染指标标注
     * @param {Element} cell 目标单元格元素
     * @param {string|number} value 要显示的值
     * @param {string} type 标注类型：'checkout', 'payment', 'roas'
     * @param {string} icon 显示的图标
     * @returns {number} 成功返回1，失败返回0
     */
    _renderMetricInTargetCell(cell, value, type, icon) {
        try {
            // 定位列区域div节点
            const innerCellContainer = cell.querySelector("div");
            if (!innerCellContainer) return false;

            // 清理该单元格内可能存在的旧标注
            const existing = cell.querySelector(
                `.fb-ads-helper-metric-badge[data-type="${type}"]`
            );
            if (existing) existing.remove();

            // 创建标注容器，使用相对定位系统
            const annotation = this._createAnnotationElement(value, type, icon);

            // 直接插入到单元格div容器中
            innerCellContainer.appendChild(annotation);
            return true;
        } catch (error) {
            window.Logger.error(`添加标注失败 [${type}]:`, error);
            return false;
        }
    },


    /**
     * @private 内部函数：确保索引已映射，如果未映射则执行映射。
     */
    _ensureIndicesMapped() {
        if (!this._indicesMapped) {
            this._mapColumnIndices();
        }
    },

    /**
      * @private 获取不同区域其编号所在列
     */
    _getTypeColumns() {
        // 当前区域campaign、adset、ad
        const currentTab = StateManager.get('currentTab');

        const idColumn = this.columns[currentTab];

        if (!idColumn || idColumn.index === -1) {
            window.Logger.error(
                `无法提取ID，因为列 '${idColumn ? idColumn.name : currentTab
                }' 的索引未找到。`
            );
            return [];
        }
        return idColumn;
    },

    /**
     * 重置列索引
     */
    resetColumnIndices() {
        this._indicesMapped = false;
    },

    /**
     * 从当前可见的行中提取ID。
     * @returns {Object} 包含三个原始ID数组的对象 { campaignIds, adsetIds, adIds }
     */
    extractVisibleIds() {
        this._ensureIndicesMapped();
        const rows = document.querySelectorAll(this.selectors.data_row);

        // 1. 初始化三个独立的数组
        const campaignIds = [];
        const adsetIds = [];
        const adIds = [];

        // 获取所有ID列的索引
        const campaignIndex = this.columns.campaign.index;
        const adsetIndex = this.columns.adset.index;
        const adIndex = this.columns.ad.index;

        rows.forEach((row) => {
            const cells = row.querySelectorAll(this.selectors.data_cell);
    
            // 2. 将找到的ID分别推入对应的数组
            if (campaignIndex > -1 && cells[campaignIndex]) {
                const id = cells[campaignIndex].textContent.trim();
                if (id) campaignIds.push(id);
            }
            if (adsetIndex > -1 && cells[adsetIndex]) {
                const id = cells[adsetIndex].textContent.trim();
                if (id) adsetIds.push(id);
            }
            if (adIndex > -1 && cells[adIndex]) {
                const id = cells[adIndex].textContent.trim();
                if (id) adIds.push(id);
            }
        });
        
        // 3. 返回包含三个原始数组的对象
        return { campaignIds, adsetIds, adIds };
    },

    /**
     * 根据ID查找对应的行元素。
     * @param {string} targetId - 要查找的ID
     * @returns {Element|null} 找到的行元素或null
     */
    findRowElementById(targetId) {
        this._ensureIndicesMapped();
        const idColumn = this._getTypeColumns();
        const allRows = document.querySelectorAll(this.selectors.data_row);
        for (const row of allRows) {
            const cells = row.querySelectorAll(this.selectors.data_cell);
            if (cells.length > idColumn.index) {
                const idCellText = cells[idColumn.index].textContent.trim();
                if (idCellText === targetId) {
                    return row;
                }
            }
        }
        return null;
    },

    /**
     * 渲染所有数据标注
     */
    async renderDataAnnotations() {
        const data = window.StateManager.get('currentData');
        if (!data || data.length === 0) return;
        this.clearAllAnnotations();
        this._ensureIndicesMapped(); // 确保渲染前索引已就位

        let renderedCount = 0;
        data.forEach((item) => {
            const rowElement = this.findRowElementById(item.id.toString());
            if (rowElement) {
                this._renderAnnotationsOnRow(rowElement, item);
                renderedCount++;
            }
        });
        window.Logger.success(`数据标注完成，处理 ${renderedCount} 条数据`);
    },

    /**
     * 初始化滚动监听器
     * @description 监听鼠标滚轮事件，只在真正滚动时才更新可见ID集合
     */
    initScrollListener() {
        if (this.scrollHandler) {
            window.removeEventListener("wheel", this.scrollHandler);
        }

        // 1秒防抖，避免滚动过程中频繁触发
        this.scrollHandler = window.Utils.debounce(async (event) => {
            const tableContainer = document.querySelector(this.selector);
            if (tableContainer && tableContainer.contains(event.target)) {
                window.Logger.info("检测到表格区域滚动，更新数据...");
                await window.DataManager.handleDataUpdate();
            }
        }, 1000);

        window.addEventListener("wheel", this.scrollHandler, { passive: true });
        window.Logger.success("滚轮滚动监听器已启动");
    },

    /**
     * 清理所有标注元素
     * @description 清理页面上所有的标注元素，防止重复渲染
     */
    clearAllAnnotations() {
        const annotations = document.querySelectorAll(
            ".fb-ads-helper-metric-badge"
        );
        annotations.forEach((annotation) => annotation.remove());
    },
};

// 全局导出，供其他模块使用
window.DOMManager = DOMManager;