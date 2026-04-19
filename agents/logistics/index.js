const FreightComparer = require('./freight-comparer');
const LogisticsTracker = require('./logistics-tracker');
const DataStore = require('../../core/data-store');
const MemorySystem = require('../../core/memory-system');

/**
 * 物流报价员 Agent
 * 负责货代比价、物流跟踪、双版本适配（出口通/金品诚企）
 */
class LogisticsAgent {
  constructor(shopType = 'export') {
    this.shopType = shopType; // 'export' (出口通) or 'gold' (金品诚企)
    this.freightComparer = new FreightComparer(shopType);
    this.logisticsTracker = new LogisticsTracker(shopType);
    this.store = new DataStore();
    this.memory = new MemorySystem(null, 'logistics');

    // 设置响应时效警戒线（分钟）
    this.responseTimeLimit = shopType === 'gold' ? 40 : 60;
  }

  /**
   * 启动物流 Agent
   */
  async start() {
    console.log(`🚀 物流 Agent 启动中 [${this.shopType === 'gold' ? '金品诚企' : '出口通'}]...\n`);

    // 显示核心指标
    this.printMetrics();

    // 显示物流状态
    this.logisticsTracker.printLogisticsStatus();

    // 显示货代统计
    this.printForwarderStats();

    console.log('\n✅ 物流 Agent 任务完成\n');
  }

  /**
   * 打印核心指标
   */
  printMetrics() {
    console.log('\n═══════════════════════════════════════════');
    console.log(`        [${this.shopType === 'gold' ? '金品诚企' : '出口通'}] 物流核心指标`);
    console.log('═══════════════════════════════════════════\n');

    const logisticsMetrics = this.logisticsTracker.getMetrics();
    const forwarderStats = this.freightComparer.getStatistics();

    // 出口通 5 大指标
    if (this.shopType === 'export') {
      console.log(`📊 出口通 5 大核心指标：`);
      console.log(`   1. 物流报价响应时效：警戒线 >1 小时`);
      console.log(`   2. 物流成本达标率：警戒线 <100%`);
      console.log(`   3. 物流流转时效：警戒线 >30 天`);
      console.log(`   4. 信息同步时效：警戒线 >30 分钟`);
      console.log(`   5. 物流出错率：警戒线 >5%`);
    }
    // 金品 6 大指标
    else {
      console.log(`📊 金品诚企 6 大核心指标：`);
      console.log(`   1. 物流报价响应时效：警戒线 >40 分钟`);
      console.log(`   2. 物流服务达标率：警戒线 <100%`);
      console.log(`   3. 物流流转时效：警戒线 >20 天`);
      console.log(`   4. 大订单物流能力：警戒线 <100%`);
      console.log(`   5. 信息同步时效：警戒线 >20 分钟`);
      console.log(`   6. 物流出错率：警戒线 >2%`);
    }

    console.log(`\n📈 当前物流统计：`);
    console.log(`   订单总数：${logisticsMetrics.total}`);
    console.log(`   准时送达：${logisticsMetrics.onTime} (${logisticsMetrics.onTimeRate})`);
    console.log(`   延迟订单：${logisticsMetrics.delayed}`);
    console.log(`   异常订单：${logisticsMetrics.exception} (${logisticsMetrics.exceptionRate})`);

    console.log(`\n📦 货代资源：`);
    console.log(`   合作货代：${forwarderStats.total} 家`);
    console.log(`   ${this.shopType === 'gold' ? '头部' : '中小'}货代：${forwarderStats.typeCount} 家`);
    console.log(`   平均服务分：${forwarderStats.avgScore}`);
    console.log(`   平均价格：¥${forwarderStats.avgPrice}/kg`);

    console.log('\n═══════════════════════════════════════════\n');
  }

  /**
   * 货代比价
   * @param {Object} orderInfo
   */
  compareFreight(orderInfo) {
    console.log('\n🔍 开始货代比价...\n');
    const result = this.freightComparer.comparePrices(orderInfo);
    return result;
  }

  /**
   * 创建物流订单
   * @param {Object} orderInfo
   */
  createOrder(orderInfo) {
    console.log('\n📦 创建物流订单...\n');
    const orderId = this.logisticsTracker.createOrder(orderInfo);
    return orderId;
  }

  /**
   * 更新订单状态
   * @param {string} orderId
   * @param {string} status
   * @param {string} event
   */
  updateOrder(orderId, status, event) {
    console.log(`\n🔄 更新订单状态：${orderId}\n`);
    this.logisticsTracker.updateOrderStatus(orderId, status, event);
  }

  /**
   * 显示物流状态
   */
  showLogisticsStatus() {
    this.logisticsTracker.printLogisticsStatus();
  }

  /**
   * 显示货代统计
   */
  printForwarderStats() {
    const stats = this.freightComparer.getStatistics();
    console.log('\n📊 货代统计信息：');
    console.log(`   合作货代总数：${stats.total}`);
    console.log(`   ${this.shopType === 'gold' ? '头部' : '中小'}货代：${stats.typeCount}`);
    console.log(`   平均服务分：${stats.avgScore}`);
    console.log(`   平均价格：¥${stats.avgPrice}/kg\n`);
  }

  /**
   * 添加新货代
   * @param {Object} forwarder
   */
  addForwarder(forwarder) {
    return this.freightComparer.addForwarder(forwarder);
  }

  /**
   * 更新货代评分
   * @param {string} forwarderId
   * @param {number} score
   * @param {string} reason
   */
  updateForwarderScore(forwarderId, score, reason) {
    this.freightComparer.updateForwarderScore(forwarderId, score, reason);
  }

  /**
   * 获取待处理订单
   */
  getPendingOrders() {
    return this.logisticsTracker.getPendingOrders();
  }

  /**
   * 获取异常订单
   */
  getExceptionOrders() {
    return this.logisticsTracker.getExceptionOrders();
  }

  /**
   * 标记订单延迟
   * @param {string} orderId
   */
  markOrderDelayed(orderId) {
    this.logisticsTracker.markAsDelayed(orderId);
  }

  /**
   * 生成工作日志
   */
  generateWorkLog() {
    const summary = {
      date: new Date().toISOString().split('T')[0],
      shopType: this.shopType,
      metrics: this.logisticsTracker.getMetrics(),
      forwarderStats: this.freightComparer.getStatistics(),
      pendingOrders: this.logisticsTracker.getPendingOrders().length,
      exceptionOrders: this.logisticsTracker.getExceptionOrders().length
    };

    console.log('\n📝 今日工作日志摘要：');
    console.log(JSON.stringify(summary, null, 2));

    return summary;
  }
}

// CLI 入口
async function main() {
  // 从环境变量或参数获取店铺类型
  const shopType = process.env.SHOP_TYPE || process.argv[3] || 'export';
  const agent = new LogisticsAgent(shopType);

  try {
    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
      case '查看物流状态':
        await agent.start();
        break;

      case 'worker':
        // Worker 模式：进程常驻，等待任务输入
        console.log('🔧 物流 Agent Worker 模式启动...');
        console.log('📋 工作模式：进程常驻，每个任务独立浏览器窗口');
        console.log('⏳ 等待任务输入...\n');

        // 保持进程运行，监听退出信号
        process.on('SIGTERM', async () => {
          console.log('\n🛑 收到退出信号，正在关闭...');
          process.exit(0);
        });

        // 监听标准输入以保持事件循环活跃
        process.stdin.on('data', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log(`📋 收到消息：${JSON.stringify(message)}`);
          } catch (e) {
            console.log(`收到输入：${data.toString()}`);
          }
        });

        // 保持进程运行
        await new Promise(() => {});
        break;

      case 'compare':
      case '货代比价':
        const orderInfo = JSON.parse(process.argv[4] || '{}');
        agent.compareFreight(orderInfo);
        break;

      case 'create-order':
      case '创建订单':
        const orderData = JSON.parse(process.argv[4] || '{}');
        agent.createOrder(orderData);
        break;

      case 'update-order':
      case '更新订单':
        const orderId = process.argv[4];
        const status = process.argv[5];
        const event = process.argv[6] || '';
        if (orderId && status) {
          agent.updateOrder(orderId, status, event);
        } else {
          console.log('用法：/alibaba-logistics 更新订单 <orderId> <status> [event]');
        }
        break;

      case 'status':
      case '物流状态':
        agent.showLogisticsStatus();
        break;

      case 'forwarders':
      case '查看货代':
        agent.printForwarderStats();
        break;

      case 'pending':
      case '待处理订单':
        const pending = agent.getPendingOrders();
        console.log(`\n⏳ 待处理订单：${pending.length} 个`);
        pending.forEach(o => console.log(`   - ${o.orderId}: ${o.destination}`));
        break;

      case 'exception':
      case '异常订单':
        const exceptions = agent.getExceptionOrders();
        console.log(`\n⚠️ 异常订单：${exceptions.length} 个`);
        exceptions.forEach(o => console.log(`   - ${o.orderId}: ${o.status}`));
        break;

      case 'log':
      case '工作日志':
        agent.generateWorkLog();
        break;

      default:
        console.log('用法：/alibaba-logistics [命令] [店铺类型]');
        console.log('\n命令列表:');
        console.log('  start              启动物流 Agent');
        console.log('  货代比价            货代比价（需传入订单信息 JSON）');
        console.log('  创建订单            创建物流订单');
        console.log('  物流状态            查看物流状态总览');
        console.log('  查看货代            查看货代统计信息');
        console.log('  待处理订单          查看待处理订单');
        console.log('  异常订单            查看异常订单');
        console.log('  工作日志            生成今日工作日志');
        console.log('\n店铺类型:');
        console.log('  export (出口通，默认)');
        console.log('  gold (金品诚企)');
        console.log('\n示例:');
        console.log('  /alibaba-logistics 查看物流状态');
        console.log('  /alibaba-logistics 货代比价 \'{"weight": 5, "destination": "US"}\' export');
        console.log('  /alibaba-logistics 创建订单 \'{"orderId": "123", "quantity": 100}\' gold');
    }
  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n📶 收到退出信号...');
  console.log('👋 物流 Agent 已退出');
  process.exit(0);
});

// 如果是直接运行此文件
if (require.main === module) {
  main();
}

module.exports = LogisticsAgent;
