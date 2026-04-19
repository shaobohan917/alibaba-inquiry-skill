import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const revenueData = [
  { day: '周一', value: 18 },
  { day: '周二', value: 22 },
  { day: '周三', value: 31 },
  { day: '周四', value: 27 },
  { day: '周五', value: 42 },
  { day: '周六', value: 39 },
  { day: '周日', value: 48 },
];

const agentData = [
  { name: '业务员', count: 86 },
  { name: '运营', count: 42 },
  { name: '采购', count: 31 },
  { name: '库存', count: 27 },
  { name: '物流', count: 14 },
  { name: '设计', count: 19 },
  { name: '主管', count: 118 },
];

export function DashboardPage() {
  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={2}>数据仪表盘</Typography.Title>
        <Typography.Text type="secondary">跟踪询盘、转化、广告 ROI 与 Agent 效率。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="本月询盘" value={1286} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="报价转化率" value={24.8} suffix="%" precision={1} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="广告 ROI" value={3.7} precision={1} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="机会金额趋势">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="value" stroke="#1677ff" fill="#91caff" name="万元" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Agent 处理量">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#52c41a" name="任务数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
