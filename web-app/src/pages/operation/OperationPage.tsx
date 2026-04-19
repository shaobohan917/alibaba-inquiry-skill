import { Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';

const keywordColumns = [
  { title: '关键词', dataIndex: 'keyword' },
  { title: '消耗', dataIndex: 'cost' },
  { title: '转化', dataIndex: 'conversion' },
  { title: '建议', dataIndex: 'advice' },
];

const keywords = [
  { key: 1, keyword: 'custom packaging', cost: '¥1,240', conversion: '8.6%', advice: '加预算' },
  { key: 2, keyword: 'eco bag supplier', cost: '¥860', conversion: '3.1%', advice: '优化标题' },
  { key: 3, keyword: 'wholesale gift box', cost: '¥2,180', conversion: '11.4%', advice: '保持投放' },
];

export function OperationPage() {
  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={2}>运营</Typography.Title>
        <Typography.Text type="secondary">管理 P4P 投放、商品诊断、关键词优化和内容发布。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="广告消耗" value={42800} prefix="¥" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="自然曝光" value={186000} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text type="secondary">店铺健康度</Typography.Text>
            <Progress percent={87} strokeColor="#52c41a" />
          </Card>
        </Col>
      </Row>
      <Card
        title="关键词投放建议"
        extra={
          <Space>
            <Tag color="blue">P4P</Tag>
            <Tag color="green">ROI 优先</Tag>
          </Space>
        }
      >
        <Table columns={keywordColumns} dataSource={keywords} pagination={false} />
      </Card>
    </Space>
  );
}
