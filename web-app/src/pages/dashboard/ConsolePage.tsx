import { Alert, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';

import { useAgentStore } from '../../stores/useAgentStore';

const taskColumns = [
  { title: '任务', dataIndex: 'task' },
  { title: '负责人', dataIndex: 'owner' },
  { title: '状态', dataIndex: 'status' },
  { title: '预计收益', dataIndex: 'value' },
];

const taskData = [
  { key: 1, task: '高意向询盘自动报价', owner: '业务员 Agent', status: '处理中', value: '¥42,000' },
  { key: 2, task: 'P4P 关键词预算重分配', owner: '运营 Agent', status: '待确认', value: '12.8% ROI' },
  { key: 3, task: '热销 SKU 备货预警', owner: '库存 Agent', status: '已完成', value: '7 天安全库存' },
];

export function ConsolePage() {
  const agents = useAgentStore((state) => state.agents);

  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={2}>主控制台</Typography.Title>
        <Typography.Text type="secondary">统一查看 Agent 协作状态、关键任务与异常提醒。</Typography.Text>
      </div>
      <Alert
        message="主管 Agent 已发现 3 个可增收任务"
        description="建议优先处理高意向询盘报价与广告预算重分配，预计本周可提升订单转化。"
        type="info"
        showIcon
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="今日自动化任务" value={337} suffix="次" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="询盘响应率" value={96.7} suffix="%" precision={1} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="预估机会金额" value={238000} prefix="¥" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        {agents.map((agent) => (
          <Col xs={24} sm={12} xl={8} key={agent.id}>
            <Card title={agent.name} extra={<Tag color={agent.status === 'online' ? 'green' : agent.status === 'busy' ? 'gold' : 'default'}>{agent.status}</Tag>}>
              <Typography.Text strong>{agent.role}</Typography.Text>
              <Typography.Paragraph type="secondary">{agent.capability}</Typography.Paragraph>
              <Statistic title="今日处理" value={agent.handledToday} suffix="项" />
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="关键任务队列">
        <Table columns={taskColumns} dataSource={taskData} pagination={false} />
      </Card>
    </Space>
  );
}
