# Facebook广告成效助手 Pro

一个强大的Chrome浏览器扩展，专为Facebook广告管理人员设计，在Facebook广告管理页面实时显示业务指标数据，包括发起结账、已支付、ROAS等关键数据，助力广告效果分析和决策优化。

## 🚀 核心功能

### 1. **智能数据标注**
- 在Facebook广告表格中实时显示业务指标
- 支持结账发起次数(🛍️)、支付成功数(💳)、ROAS(📈)等关键指标
- 彩色徽章区分不同类型数据，不遮挡原始数据
- 数据驱动渲染，精准匹配广告ID

### 2. **区域智能切换**
- 自动检测广告系列、广告组、广告页面切换
- 智能提取当前页面的campaign、adset、ad ID
- 无缝切换不同层级页面，保持数据同步
- 支持URL参数解析，获取父级ID关系

### 3. **实时数据同步**
- 自动获取当前页面日期范围，支持多种日期格式解析
- 可配置的自动刷新机制(默认10分钟)
- 滚动监听，动态更新可见广告数据
- 智能错误恢复和重试机制

### 4. **灵活配置管理**
- 支持自定义API端点和密钥配置
- 功能开关控制：数据上报、自动刷新、状态指示器
- Chrome存储缓存机制，提升性能
- 兼容新旧配置格式，平滑升级

## 📊 数据指标说明

插件显示的主要指标：

- **🛍️ 结账发起次数**: 用户点击结账按钮的次数，衡量购买意向
- **💳 支付成功数**: 完成支付的订单数量，核心转化指标  
- **📈 ROAS**: 广告支出回报率，计算公式为支付成功数/广告花费

指标数据通过配置的API接口实时获取，确保数据准确性和时效性。

## 🛠️ 安装和配置

### 1. 安装Chrome扩展
1. 下载项目文件到本地
2. 打开Chrome扩展管理页面 (`chrome://extensions/`)
3. 启用开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹
6. 确保扩展已启用并显示在工具栏中

### 2. 配置API接口
1. 访问Facebook广告管理页面
2. 点击扩展图标打开配置界面
3. 在"API配置"中输入:
   - **API基础URL**: 您的数据接口地址 (如: `https://api.yourdomain.com`)
   - **API密钥**: 用于身份验证的密钥 (可选)
4. 点击"保存配置"完成设置

### 3. 功能开关设置
1. 在配置界面的"功能开关"部分可以控制:
   - **启用数据上报**: 是否获取并显示业务数据
   - **自动刷新数据**: 是否启用10分钟自动刷新
   - **显示状态指示器**: 是否显示Toast提示信息
2. 根据需要调整各项开关状态

## 📊 API接口规范

扩展通过统一的API接口获取广告指标数据：

### 指标数据接口

**请求地址**: `POST {API_BASE_URL}/api/ads/metrics`

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {API_KEY}  // 可选
```

**请求参数**:
```json
{
  "account_id": "act_123456",           // Facebook广告账户ID
  "start_date": "2024-01-01",           // 开始日期 (YYYY-MM-DD)
  "end_date": "2024-01-07",             // 结束日期 (YYYY-MM-DD) 
  "campaign_ids": ["camp_001"],         // 广告系列ID数组
  "adset_ids": ["adset_001"],           // 广告组ID数组
  "ad_ids": ["ad_001"],                 // 广告ID数组
  "timestamp": "2024-01-01T00:00:00Z",  // 请求时间戳
  "timezone": "Asia/Shanghai"            // 时区信息
}
```

**响应格式**:
```json
[
  {
    "id": "campaign_001",          // 广告/系列/组ID
    "campaign_id": "campaign_001", // 系列ID (可选)
    "adset_id": "adset_001",       // 组ID (可选) 
    "ad_id": "ad_001",             // 广告ID (可选)
    "checkout_count": 123,         // 结账发起次数
    "payment_count": 85,           // 支付成功次数
    "amount": 4250.50             // 支付金额 (可选)
  }
]
```

## 🎯 使用流程

1. **安装扩展**: 在Chrome中加载扩展程序
2. **访问Facebook**: 打开Facebook广告管理页面 (`https://www.facebook.com/adsmanager/`)
3. **配置API**: 在扩展弹窗中设置API基础URL和密钥
4. **启用功能**: 开启"启用数据上报"开关
5. **查看数据**: 在广告表格中查看实时业务指标标签
6. **切换页面**: 在广告系列/组/广告页面间自由切换，数据自动更新
7. **状态监控**: 通过扩展弹窗查看运行状态和手动刷新数据

## 🔧 技术特性

### 核心技术架构
- **Chrome Extension Manifest V3**: 使用最新的扩展开发标准
- **模块化设计**: Logger、StorageManager、IDManager等独立模块
- **数据驱动渲染**: 通过API数据逆向查找DOM元素进行标注
- **统一配置管理**: config.js集中管理所有配置项

### 性能与稳定性
- **智能ID提取**: 通过data-surface属性精准匹配Facebook表格行
- **滚动监听优化**: 防抖机制避免频繁API调用
- **配置缓存**: 5秒配置缓存提升响应速度
- **错误恢复**: 连续错误时自动延长刷新间隔
- **内存管理**: 页面卸载时自动清理定时器和事件监听

### 兼容性保障
- **多日期格式**: 支持中英文、ISO等多种日期格式解析
- **配置兼容**: 新旧版本配置格式平滑过渡
- **区域切换**: 自动适配Facebook页面结构变化
- **跨环境**: 支持开发和生产环境配置切换

## 📝 配置说明

### Chrome存储配置
扩展使用Chrome本地存储保存以下配置：

**API配置** (`api_config`):
- `base_url`: API基础URL地址
- `api_key`: API访问密钥

**功能配置** (`features`):
- `enable_reporting`: 是否启用数据上报
- `auto_refresh`: 是否启用自动刷新 (10分钟间隔)
- `show_status_indicator`: 是否显示Toast状态提示

**兼容配置** (向后兼容):
- `fb_plugin_status`: 插件启用状态 ('1'/'0')
- `auto_refresh`: 自动刷新设置 (boolean)
- `show_status_indicator`: 状态指示器设置 (boolean)

### 默认配置 (config.js)
```javascript
const CONFIG = {
  API: {
    BASE_URL: 'http://cctvskit.local',
    API_KEY: '1234567890',
  },
  FEATURES: {
    ENABLE_REPORTING: true,
    AUTO_REFRESH: true,
    SHOW_STATUS_INDICATOR: true,
    DEBUG_MODE: true
  },
  DATA: {
    REFRESH_INTERVAL: 10 * 60 * 1000  // 10分钟
  }
}
```

## 🚨 注意事项

### 权限要求
- 扩展需要访问 `https://*.facebook.com/*` 的权限
- 需要Chrome存储、标签页、Cookie等权限
- 支持Chrome 88+版本

### API服务要求
- API服务器需支持CORS跨域请求
- 建议使用HTTPS协议确保数据安全
- API响应时间建议控制在10秒内

### 数据安全
- API密钥等敏感信息仅存储在本地Chrome存储中
- 不会收集或上传任何Facebook账户信息
- 所有数据传输遵循Chrome扩展安全规范

### 性能建议
- 建议在网络状况良好时使用，避免API超时
- 大量数据时可适当延长刷新间隔
- 如遇Facebook页面结构变化，可能需要更新扩展

## 🔍 故障排除

### 常见问题

**Q: 扩展显示"插件初始化中"**  
A: 请等待3-5秒，或刷新Facebook页面后重试

**Q: 看不到数据标注**  
A: 检查"启用数据上报"开关是否开启，API配置是否正确

**Q: 数据显示不准确**  
A: 点击"手动刷新数据"按钮，或检查API接口返回数据格式

**Q: 切换页面后数据丢失**  
A: 扩展会自动检测页面切换，等待1-2秒即可看到新数据

### 调试模式
在开发者工具Console中查看日志信息：
- `[FB-Helper] ℹ️` 信息日志
- `[FB-Helper] ✅` 成功日志  
- `[FB-Helper] ⚠️` 警告日志
- `[FB-Helper] ❌` 错误日志

## 🔮 版本信息

**当前版本**: v1.0.1  
**兼容性**: Chrome 88+  
**开发者**: Qasim  
**许可证**: MIT  