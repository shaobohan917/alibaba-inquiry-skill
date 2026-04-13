const fs = require('fs');
const path = require('path');
const DataStore = require('../../core/data-store');
const MemorySystem = require('../../core/memory-system');

/**
 * 货代比价模块
 * 负责货代搜索、价格比较、优质货代筛选
 */
class FreightComparer {
  constructor(shopType = 'export') {
    this.shopType = shopType; // 'export' (出口通) or 'gold' (金品)
    this.store = new DataStore();
    this.memory = new MemorySystem(null, 'logistics');
    this.freightForwardersDir = path.join(__dirname, '../../data/logistics/freight-forwarders');
    this.ensureDir();
  }

  /**
   * 确保目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.freightForwardersDir)) {
      fs.mkdirSync(this.freightForwardersDir, { recursive: true });
    }
  }

  /**
   * 获取货代列表文件路径
   */
  getForwardersFile() {
    const suffix = this.shopType === 'gold' ? 'gold' : 'export';
    return path.join(this.freightForwardersDir, `forwarders-${suffix}.json`);
  }

  /**
   * 加载货代列表
   * @returns {Array}
   */
  loadForwarders() {
    const file = this.getForwardersFile();
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        console.log('⚠️ 货代文件读取失败，返回空列表');
      }
    }

    // 返回默认货代列表
    return this.getDefaultForwarders();
  }

  /**
   * 获取默认货代列表
   */
  getDefaultForwarders() {
    if (this.shopType === 'gold') {
      // 金品诚企：头部优质货代，优先时效和服务
      return [
        {
          id: 'fd_001',
          name: 'DHL 全球物流',
          type: '头部',
          specialties: ['大订单', '快速时效', '全程跟踪'],
          basePrice: 35,
          deliveryDays: '5-8',
          trackingSupport: true,
          bigOrderCapacity: true,
          serviceScore: 4.9,
          lastCooperation: new Date().toISOString()
        },
        {
          id: 'fd_002',
          name: 'FedEx 国际',
          type: '头部',
          specialties: ['大订单', '高端服务', '定制物流'],
          basePrice: 38,
          deliveryDays: '6-9',
          trackingSupport: true,
          bigOrderCapacity: true,
          serviceScore: 4.8,
          lastCooperation: new Date().toISOString()
        },
        {
          id: 'fd_003',
          name: 'UPS 速运',
          type: '头部',
          specialties: ['大订单', '双清包税', '优先排仓'],
          basePrice: 36,
          deliveryDays: '5-7',
          trackingSupport: true,
          bigOrderCapacity: true,
          serviceScore: 4.8,
          lastCooperation: new Date().toISOString()
        }
      ];
    } else {
      // 出口通：中小货代，优先性价比
      return [
        {
          id: 'fd_101',
          name: '顺丰国际',
          type: '中小',
          specialties: ['小包', '性价比', '快速上网'],
          basePrice: 22,
          deliveryDays: '8-15',
          trackingSupport: true,
          bigOrderCapacity: false,
          serviceScore: 4.5,
          lastCooperation: new Date().toISOString()
        },
        {
          id: 'fd_102',
          name: '云途物流',
          type: '中小',
          specialties: ['小包', '经济型', '基础跟踪'],
          basePrice: 18,
          deliveryDays: '10-20',
          trackingSupport: true,
          bigOrderCapacity: false,
          serviceScore: 4.3,
          lastCooperation: new Date().toISOString()
        },
        {
          id: 'fd_103',
          name: '燕文物流',
          type: '中小',
          specialties: ['小包', '快速发货', '性价比'],
          basePrice: 20,
          deliveryDays: '7-15',
          trackingSupport: true,
          bigOrderCapacity: false,
          serviceScore: 4.4,
          lastCooperation: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * 保存货代列表
   * @param {Array} forwarders
   */
  saveForwarders(forwarders) {
    const file = this.getForwardersFile();
    fs.writeFileSync(file, JSON.stringify(forwarders, null, 2));
  }

  /**
   * 搜索货代（根据需求匹配）
   * @param {Object} requirements
   * @returns {Array}
   */
  searchForwarders(requirements) {
    const forwarders = this.loadForwarders();
    let results = [...forwarders];

    // 出口通：优先性价比
    if (this.shopType === 'export') {
      if (requirements.smallPackage) {
        results = results.filter(f => f.specialties.includes('小包'));
      }
      if (requirements.fastShipping) {
        results = results.filter(f => f.specialties.includes('快速上网') || f.specialties.includes('快速发货'));
      }
      // 按价格排序
      results.sort((a, b) => a.basePrice - b.basePrice);
    }
    // 金品：优先时效和服务
    else if (this.shopType === 'gold') {
      if (requirements.bigOrder) {
        results = results.filter(f => f.bigOrderCapacity);
      }
      if (requirements.premiumService) {
        results = results.filter(f => f.specialties.includes('高端服务') || f.specialties.includes('双清包税'));
      }
      if (requirements.fastDelivery) {
        results = results.filter(f => f.specialties.includes('快速时效') || f.specialties.includes('优先排仓'));
      }
      // 按服务分排序
      results.sort((a, b) => b.serviceScore - a.serviceScore);
    }

    return results;
  }

  /**
   * 比价分析
   * @param {Object} orderInfo - 订单信息
   * @returns {Object} 比价结果
   */
  comparePrices(orderInfo) {
    console.log('\n🔍 开始货代比价分析...');
    console.log(`   订单类型：${orderInfo.type || '普通订单'}`);
    console.log(`   目的地：${orderInfo.destination || '未知'}`);
    console.log(`   重量：${orderInfo.weight || '未知'}kg`);
    console.log(`   店铺类型：${this.shopType === 'gold' ? '金品诚企' : '出口通'}\n`);

    const requirements = {
      smallPackage: (orderInfo.weight || 0) < 2,
      bigOrder: (orderInfo.quantity || 0) > 500,
      fastShipping: orderInfo.urgent || false,
      premiumService: orderInfo.premium || false,
      fastDelivery: orderInfo.urgent || false
    };

    const candidates = this.searchForwarders(requirements);

    console.log(`📋 候选货代：${candidates.length} 家\n`);

    // 输出候选货代详情
    candidates.forEach((f, index) => {
      console.log(`   ${index + 1}. ${f.name}`);
      console.log(`      类型：${f.type} | 价格：¥${f.basePrice}/kg | 时效：${f.deliveryDays}天`);
      console.log(`      特色：${f.specialties.join(', ')}`);
      console.log(`      服务分：${f.serviceScore} | 大订单能力：${f.bigOrderCapacity ? '✅' : '❌'}\n`);
    });

    // 选出最优方案
    const bestChoice = this.selectBestForwarder(candidates, requirements);

    // 记录工作日志
    this.memory.logWork({
      type: 'freight_comparison',
      data: {
        orderInfo,
        candidatesCount: candidates.length,
        selectedForwarder: bestChoice,
        shopType: this.shopType
      },
      summary: `完成货代比价，选出 ${bestChoice.name}，价格¥${bestChoice.basePrice}/kg`
    });

    return {
      candidates,
      bestChoice,
      comparedAt: new Date().toISOString()
    };
  }

  /**
   * 选择最优货代
   * @param {Array} candidates
   * @param {Object} requirements
   * @returns {Object}
   */
  selectBestForwarder(candidates, requirements) {
    if (candidates.length === 0) {
      return null;
    }

    if (this.shopType === 'export') {
      // 出口通：性价比优先
      return candidates[0]; // 已按价格排序
    } else {
      // 金品：服务优先
      return candidates[0]; // 已按服务分排序
    }
  }

  /**
   * 添加新货代
   * @param {Object} forwarder
   */
  addForwarder(forwarder) {
    const forwarders = this.loadForwarders();
    const newForwarder = {
      id: `fd_${Date.now()}`,
      ...forwarder,
      serviceScore: forwarder.serviceScore || 4.0,
      lastCooperation: new Date().toISOString()
    };
    forwarders.push(newForwarder);
    this.saveForwarders(forwarders);
    console.log(`✓ 新货代已添加：${forwarder.name}`);
    return newForwarder.id;
  }

  /**
   * 更新货代评分
   * @param {string} forwarderId
   * @param {number} score
   * @param {string} reason
   */
  updateForwarderScore(forwarderId, score, reason) {
    const forwarders = this.loadForwarders();
    const forwarder = forwarders.find(f => f.id === forwarderId);

    if (forwarder) {
      const oldScore = forwarder.serviceScore;
      forwarder.serviceScore = score;
      forwarder.lastCooperation = new Date().toISOString();
      forwarder.scoreHistory = forwarder.scoreHistory || [];
      forwarder.scoreHistory.push({
        score,
        reason,
        updatedAt: new Date().toISOString()
      });
      this.saveForwarders(forwarders);

      // 记录错题本（如果评分下降）
      if (score < oldScore - 0.5) {
        this.memory.recordError({
          category: '货代服务下降',
          description: `${forwarder.name} 服务分从 ${oldScore} 降至 ${score}`,
          solution: '考虑更换货代',
          lesson: reason
        });
      }

      console.log(`✓ 货代评分已更新：${forwarder.name} ${oldScore} → ${score}`);
    }
  }

  /**
   * 获取货代统计信息
   * @returns {Object}
   */
  getStatistics() {
    const forwarders = this.loadForwarders();
    const total = forwarders.length;
    const topType = this.shopType === 'gold' ? '头部' : '中小';
    const typeCount = forwarders.filter(f => f.type === topType).length;
    const avgScore = forwarders.reduce((sum, f) => sum + f.serviceScore, 0) / total;
    const avgPrice = forwarders.reduce((sum, f) => sum + f.basePrice, 0) / total;

    return {
      total,
      typeCount,
      avgScore: avgScore.toFixed(2),
      avgPrice: avgPrice.toFixed(2)
    };
  }
}

module.exports = FreightComparer;
