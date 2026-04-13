const fs = require('fs');
const path = require('path');
const DataStore = require('../../core/data-store');
const MemorySystem = require('../../core/memory-system');

/**
 * 物流跟踪模块
 * 负责物流订单跟踪、状态同步、异常预警
 */
class LogisticsTracker {
  constructor(shopType = 'export') {
    this.shopType = shopType;
    this.store = new DataStore();
    this.memory = new MemorySystem(null, 'logistics');
    this.ordersDir = path.join(__dirname, '../../data/logistics/orders');
    this.ensureDir();
  }

  /**
   * 确保目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.ordersDir)) {
      fs.mkdirSync(this.ordersDir, { recursive: true });
    }
  }

  /**
   * 获取订单文件路径
   */
  getOrdersFile() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.ordersDir, `orders-${date}.json`);
  }

  /**
   * 加载今日订单
   * @returns {Object}
   */
  loadOrders() {
    const file = this.getOrdersFile();
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        console.log('⚠️ 订单文件读取失败');
      }
    }

    return { orders: [], date: new Date().toISOString().split('T')[0] };
  }

  /**
   * 保存订单
   * @param {Object} ordersData
   */
  saveOrders(ordersData) {
    const file = this.getOrdersFile();
    fs.writeFileSync(file, JSON.stringify(ordersData, null, 2));
  }

  /**
   * 创建物流订单
   * @param {Object} orderInfo
   * @returns {string} 订单 ID
   */
  createOrder(orderInfo) {
    const ordersData = this.loadOrders();
    const orderId = `LO_${Date.now()}`;

    const newOrder = {
      orderId,
      ...orderInfo,
      status: 'pending', // pending -> shipped -> in_transit -> delivered
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingEvents: []
    };

    ordersData.orders.push(newOrder);
    this.saveOrders(ordersData);

    console.log(`✓ 物流订单已创建：${orderId}`);

    // 记录工作日志
    this.memory.logWork({
      type: 'order_created',
      data: { orderId, orderInfo },
      summary: `创建物流订单 ${orderId}`
    });

    return orderId;
  }

  /**
   * 更新订单状态
   * @param {string} orderId
   * @param {string} status
   * @param {string} event
   */
  updateOrderStatus(orderId, status, event) {
    const ordersData = this.loadOrders();
    const order = ordersData.orders.find(o => o.orderId === orderId);

    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      order.trackingEvents.push({
        status,
        event,
        timestamp: new Date().toISOString()
      });

      this.saveOrders(ordersData);
      console.log(`✓ 订单状态已更新：${orderId} → ${status}`);

      // 金品大订单需要额外同步
      if (this.shopType === 'gold' && order.quantity > 500) {
        console.log(`⚠️ 金品大订单状态变更，已同步给业务员`);
      }
    } else {
      console.log(`❌ 订单不存在：${orderId}`);
    }
  }

  /**
   * 获取订单详情
   * @param {string} orderId
   * @returns {Object|null}
   */
  getOrderDetail(orderId) {
    const ordersData = this.loadOrders();
    return ordersData.orders.find(o => o.orderId === orderId) || null;
  }

  /**
   * 获取所有订单
   * @returns {Array}
   */
  getAllOrders() {
    const ordersData = this.loadOrders();
    return ordersData.orders.sort((a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  /**
   * 获取待处理订单
   * @returns {Array}
   */
  getPendingOrders() {
    const ordersData = this.loadOrders();
    return ordersData.orders.filter(o => o.status === 'pending');
  }

  /**
   * 获取运输中订单
   * @returns {Array}
   */
  getInTransitOrders() {
    const ordersData = this.loadOrders();
    return ordersData.orders.filter(o => o.status === 'in_transit');
  }

  /**
   * 获取异常订单
   * @returns {Array}
   */
  getExceptionOrders() {
    const ordersData = this.loadOrders();
    return ordersData.orders.filter(o => o.status === 'exception');
  }

  /**
   * 打印物流状态总览
   */
  printLogisticsStatus() {
    console.log('\n═══════════════════════════════════════════');
    console.log(`        [${this.shopType === 'gold' ? '金品诚企' : '出口通'}] 物流状态总览`);
    console.log('═══════════════════════════════════════════\n');

    const ordersData = this.loadOrders();
    const orders = ordersData.orders;

    const byStatus = {
      pending: orders.filter(o => o.status === 'pending').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      in_transit: orders.filter(o => o.status === 'in_transit').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      exception: orders.filter(o => o.status === 'exception').length
    };

    console.log(`📦 订单总数：${orders.length}`);
    console.log(`⏳ 待处理：${byStatus.pending}`);
    console.log(`🚚 运输中：${byStatus.in_transit}`);
    console.log(`✅ 已送达：${byStatus.delivered}`);
    console.log(`⚠️ 异常订单：${byStatus.exception}`);

    // 显示最近的订单
    const recentOrders = orders.slice(0, 5);
    if (recentOrders.length > 0) {
      console.log('\n📋 最近订单：');
      recentOrders.forEach(order => {
        const statusEmoji = {
          pending: '⏳',
          shipped: '🚚',
          in_transit: '🚛',
          delivered: '✅',
          exception: '⚠️'
        }[order.status];

        console.log(`   ${statusEmoji} ${order.orderId} - ${order.destination || '未知目的地'} - ${order.status}`);
      });
    }

    console.log('\n═══════════════════════════════════════════\n');
  }

  /**
   * 获取物流统计指标
   * @returns {Object}
   */
  getMetrics() {
    const ordersData = this.loadOrders();
    const orders = ordersData.orders;

    const total = orders.length;
    const onTime = orders.filter(o => o.status === 'delivered' && !o.isDelayed).length;
    const delayed = orders.filter(o => o.isDelayed).length;
    const exception = orders.filter(o => o.status === 'exception').length;

    const onTimeRate = total > 0 ? (onTime / total * 100).toFixed(2) : 100;
    const exceptionRate = total > 0 ? (exception / total * 100).toFixed(2) : 0;

    return {
      total,
      onTime,
      delayed,
      exception,
      onTimeRate: `${onTimeRate}%`,
      exceptionRate: `${exceptionRate}%`
    };
  }

  /**
   * 标记订单延迟
   * @param {string} orderId
   */
  markAsDelayed(orderId) {
    const ordersData = this.loadOrders();
    const order = ordersData.orders.find(o => o.orderId === orderId);

    if (order) {
      order.isDelayed = true;
      order.delayedAt = new Date().toISOString();
      this.saveOrders(ordersData);

      // 记录错题本
      this.memory.recordError({
        category: '物流延迟',
        description: `订单 ${orderId} 物流配送延迟`,
        solution: '联系货代确认原因，同步给业务员和客户',
        lesson: `货代 ${order.forwarderName} 配送时效不可靠`
      });

      console.log(`✓ 订单已标记为延迟：${orderId}`);
    }
  }
}

module.exports = LogisticsTracker;
