/**
 * Agents Module Exports
 * 业务 Agent 层统一出口
 */

const SalesAgent = require('./sales');
const SupervisorAgent = require('./supervisor');
const OperationAgent = require('./operation');
const DesignAgent = require('./design');
const ProcurementAgent = require('./procurement');
const InventoryAgent = require('./inventory');
const LogisticsAgent = require('./logistics');

const CustomerCRM = require('./sales/customer-crm');
const InquiryHandler = require('./sales/inquiry-handler');
const Dashboard = require('./supervisor/dashboard');

module.exports = {
  // 7 大 Agent
  SalesAgent,
  SupervisorAgent,
  OperationAgent,
  DesignAgent,
  ProcurementAgent,
  InventoryAgent,
  LogisticsAgent,

  // Components
  CustomerCRM,
  InquiryHandler,
  Dashboard
};
