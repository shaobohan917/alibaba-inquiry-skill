const DataStore = require('../../core/data-store');

/**
 * 物流跟踪模块
 * 负责发货、入库、物流状态跟踪
 */
class ShipmentTracker {
  constructor() {
    this.store = new DataStore();
  }

  /**
   * 创建发货单
   * @param {Object} shipment
   * @returns {string}
   */
  createShipment(shipment) {
    return this.store.create('shipments', {
      orderId: shipment.orderId,
      productId: shipment.productId,
      quantity: shipment.quantity,
      status: 'pending', // pending/shipping/delivered
      carrier: shipment.carrier, // 物流公司
      trackingNumber: shipment.trackingNumber, // 物流单号
      shippedAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * 更新发货状态
   * @param {string} shipmentId
   * @param {string} status
   */
  updateShipmentStatus(shipmentId, status) {
    const updates = { status };

    if (status === 'shipping') {
      updates.shippedAt = new Date().toISOString();
    } else if (status === 'delivered') {
      updates.deliveredAt = new Date().toISOString();
    }

    return this.store.update('shipments', shipmentId, updates);
  }

  /**
   * 更新物流信息
   * @param {string} shipmentId
   * @param {Object} logistics
   */
  updateLogistics(shipmentId, logistics) {
    return this.store.update('shipments', shipmentId, {
      carrier: logistics.carrier,
      trackingNumber: logistics.trackingNumber,
      logisticsInfo: logistics.info
    });
  }

  /**
   * 获取待发货列表
   * @returns {Array}
   */
  getPendingShipments() {
    const shipments = this.store.list('shipments');
    return shipments.filter(s => s.status === 'pending');
  }

  /**
   * 获取运输中列表
   * @returns {Array}
   */
  getShippingShipments() {
    const shipments = this.store.list('shipments');
    return shipments.filter(s => s.status === 'shipping');
  }

  /**
   * 获取物流预警
   * @returns {Array}
   */
  getLogisticsAlerts() {
    const shipments = this.store.list('shipments');
    const alerts = [];
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const shipment of shipments) {
      if (shipment.status === 'shipping' && shipment.shippedAt) {
        const shippedTime = new Date(shipment.shippedAt).getTime();
        const daysInTransit = (now - shippedTime) / (1000 * 60 * 60 * 24);

        // 运输超过 7 天预警
        if (daysInTransit > 7) {
          alerts.push({
            type: 'shipping_delay',
            level: daysInTransit > 14 ? 'high' : 'medium',
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            message: `物流延迟：订单 ${shipment.orderId} 已运输 ${Math.floor(daysInTransit)} 天`,
            suggestion: '联系物流公司查询或准备补发'
          });
        }
      }

      // 待发货超过 3 天预警
      if (shipment.status === 'pending') {
        const createdTime = new Date(shipment.createdAt).getTime();
        const daysPending = (now - createdTime) / (1000 * 60 * 60 * 24);

        if (daysPending > 3) {
          alerts.push({
            type: 'pending_shipment',
            level: 'medium',
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            message: `待发货：订单 ${shipment.orderId} 已等待 ${Math.floor(daysPending)} 天`,
            suggestion: '尽快安排发货'
          });
        }
      }
    }

    return alerts;
  }

  /**
   * 打印物流状态
   */
  printLogisticsStatus() {
    console.log('\n═══════════════════════════════════════════');
    console.log('              物流跟踪');
    console.log('═══════════════════════════════════════════\n');

    // 待发货
    const pending = this.getPendingShipments();
    console.log(`📦 待发货：${pending.length} 单`);
    for (const s of pending.slice(0, 5)) {
      console.log(`   - 订单 ${s.orderId}: ${s.quantity} 件`);
    }
    console.log();

    // 运输中
    const shipping = this.getShippingShipments();
    console.log(`🚚 运输中：${shipping.length} 单`);
    for (const s of shipping.slice(0, 5)) {
      const daysInTransit = s.shippedAt
        ? Math.floor((Date.now() - new Date(s.shippedAt)) / (1000 * 60 * 60 * 24))
        : 0;
      console.log(`   - 订单 ${s.orderId}: ${s.carrier || '物流'} ${s.trackingNumber || ''} (${daysInTransit}天)`);
    }
    console.log();

    // 预警
    const alerts = this.getLogisticsAlerts();
    if (alerts.length > 0) {
      console.log('⚠️  物流预警:\n');
      for (const alert of alerts) {
        console.log(`   [${alert.level}] ${alert.message}`);
        console.log(`         建议：${alert.suggestion}\n`);
      }
    } else {
      console.log('✅ 物流正常\n');
    }

    console.log('═══════════════════════════════════════════\n');
  }
}

module.exports = ShipmentTracker;
