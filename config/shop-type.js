/**
 * 店铺类型配置
 * 出口通 vs 金品诚企 双版本差异化配置
 */

const SHOP_TYPES = {
  EXPORT: 'export',      // 出口通
  GOLD: 'gold'          // 金品诚企
};

/**
 * 获取店铺类型配置
 * @param {string} shopType - 店铺类型
 * @returns {Object}
 */
function getShopConfig(shopType = SHOP_TYPES.EXPORT) {
  if (shopType === SHOP_TYPES.GOLD) {
    return {
      type: SHOP_TYPES.GOLD,
      name: '金品诚企',

      // 预算配置
      budget: {
        dailyTotal: 150,        // 日均总预算 150 元
        adBudgetPerPlan: 50,    // 每个子计划 50 元
        subPlans: 3            // 3 个子计划
      },

      // 时效要求（更严格）
      sla: {
        salesResponseMinutes: 10,      // 业务员响应 10 分钟
        logisticsResponseMinutes: 40,   // 物流报价 40 分钟
        backgroundCheckHours: 24       // 背调完成 24 小时
      },

      // 核心指标
      metrics: {
        // 运营指标
        exposure: { min: 5000, unit: '次' },
        ctr: { min: 3, unit: '%' },
        cpc: { max: 2, unit: '元' },
        inquiryConversion: { min: 25, unit: '%' },
        inquiryCost: { max: 30, unit: '元' },

        // 物流指标（6 大）
        logisticsResponseTime: { max: 40, unit: '分钟' },
        logisticsServiceRate: { min: 100, unit: '%' },
        logisticsDeliveryDays: { max: 20, unit: '天' },
        bigOrderCapacity: { min: 100, unit: '%' },
        infoSyncTime: { max: 20, unit: '分钟' },
        logisticsErrorRate: { max: 2, unit: '%' },

        // 采购指标
        procurementMargin: { min: 25, unit: '%' },
        supplierResponseTime: { max: 60, unit: '分钟' }
      },

      // 物流策略
      logistics: {
        forwarderType: '头部',          // 优先头部优质货代
        priority: '时效与服务',         // 优先时效和服务
        prohibitSmallForwarders: true,  // 禁止用小货代
        bigOrderSupport: true,          // 需要大订单能力
        trackingRequirement: '全程跟踪'   // 全程跟踪服务
      },

      // 采购策略
      procurement: {
        marginTarget: 25,              // 毛利目标 25%
        supplierType: '优质供应商',     // 优先优质供应商
        customizationSupport: true     // 需要定制能力
      }
    };
  }

  // 出口通默认配置
  return {
    type: SHOP_TYPES.EXPORT,
    name: '出口通',

    // 预算配置
    budget: {
      dailyTotal: 150,        // 日均总预算 150 元
      adBudgetPerPlan: 50,    // 每个子计划 50 元
      subPlans: 3            // 3 个子计划
    },

    // 时效要求（标准）
    sla: {
      salesResponseMinutes: 15,      // 业务员响应 15 分钟
      logisticsResponseMinutes: 60,   // 物流报价 1 小时
      backgroundCheckHours: 24       // 背调完成 24 小时
    },

    // 核心指标
    metrics: {
      // 运营指标
      exposure: { min: 3000, unit: '次' },
      ctr: { min: 2, unit: '%' },
      cpc: { max: 2, unit: '元' },
      inquiryConversion: { min: 15, unit: '%' },
      inquiryCost: { max: 50, unit: '元' },

      // 物流指标（5 大）
      logisticsResponseTime: { max: 60, unit: '分钟' },
      logisticsCostRate: { min: 100, unit: '%' },
      logisticsDeliveryDays: { max: 30, unit: '天' },
      infoSyncTime: { max: 30, unit: '分钟' },
      logisticsErrorRate: { max: 5, unit: '%' },

      // 采购指标
      procurementMargin: { min: 30, unit: '%' },
      supplierResponseTime: { max: 120, unit: '分钟' }
    },

    // 物流策略
    logistics: {
      forwarderType: '中小',          // 优先中小货代
      priority: '性价比',             // 优先性价比
      prohibitExpensiveChannels: true, // 禁止用高端渠道
      smallPackageOptimized: true,    // 小包优化
      trackingRequirement: '基础跟踪'   // 基础跟踪
    },

    // 采购策略
    procurement: {
      marginTarget: 30,              // 毛利目标 30%
      supplierType: '性价比优先',     // 优先性价比
      customizationSupport: false    // 基础定制
    }
  };
}

/**
 * 获取所有店铺类型
 * @returns {Array}
 */
function getAllShopTypes() {
  return Object.values(SHOP_TYPES);
}

/**
 * 根据环境变量获取店铺类型
 * @returns {string}
 */
function getShopTypeFromEnv() {
  const envType = process.env.SHOP_TYPE || SHOP_TYPES.EXPORT;
  return envType.toLowerCase() === 'gold' ? SHOP_TYPES.GOLD : SHOP_TYPES.EXPORT;
}

/**
 * 验证指标是否达标
 * @param {string} shopType
 * @param {string} metricName
 * @param {number} value
 * @returns {boolean}
 */
function checkMetric(shopType, metricName, value) {
  const config = getShopConfig(shopType);
  const metric = config.metrics[metricName];

  if (!metric) {
    console.warn(`未知指标：${metricName}`);
    return true;
  }

  if (metric.min !== undefined) {
    return value >= metric.min;
  }
  if (metric.max !== undefined) {
    return value <= metric.max;
  }

  return true;
}

/**
 * 获取指标警戒线
 * @param {string} shopType
 * @param {string} metricName
 * @returns {Object}
 */
function getMetricThreshold(shopType, metricName) {
  const config = getShopConfig(shopType);
  return config.metrics[metricName] || null;
}

module.exports = {
  SHOP_TYPES,
  getShopConfig,
  getAllShopTypes,
  getShopTypeFromEnv,
  checkMetric,
  getMetricThreshold
};
