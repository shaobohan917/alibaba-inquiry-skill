import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, Typography } from 'antd';

export function SettingsPage() {
  return (
    <Space direction="vertical" size={20} className="page-stack">
      <div>
        <Typography.Title level={2}>设置</Typography.Title>
        <Typography.Text type="secondary">配置 Tauri 桌面端、本地 SQLite、账号安全与 Agent 策略。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="本地数据">
            <Form layout="vertical">
              <Form.Item label="SQLite 数据库路径">
                <Input defaultValue="./data/ali-ai-agent-system.sqlite" />
              </Form.Item>
              <Form.Item label="数据保留周期">
                <Select
                  defaultValue="365"
                  options={[
                    { value: '180', label: '180 天' },
                    { value: '365', label: '365 天' },
                    { value: 'forever', label: '永久保留' },
                  ]}
                />
              </Form.Item>
              <Button type="primary">保存配置</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Agent 策略">
            <Space direction="vertical" size={16} className="settings-list">
              <div>
                <Typography.Text strong>自动回复前人工确认</Typography.Text>
                <Switch defaultChecked />
              </div>
              <div>
                <Typography.Text strong>异常订单自动接管</Typography.Text>
                <Switch defaultChecked />
              </div>
              <div>
                <Typography.Text strong>广告预算自动调整</Typography.Text>
                <Switch />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
