import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="login-page">
      <section className="login-panel">
        <Typography.Text className="eyebrow">Alibaba AI Agent System</Typography.Text>
        <Typography.Title>阿里国际站 AI 智能体协同系统</Typography.Title>
        <Typography.Paragraph>
          面向国际站团队的企业级桌面工作台，集中调度业务员、运营、采购、库存、物流、设计与主管 Agent。
        </Typography.Paragraph>
      </section>
      <Card className="login-card" title="登录工作台">
        <Form layout="vertical" onFinish={() => navigate('/console')}>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin@company.com" size="large" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            进入控制台
          </Button>
        </Form>
      </Card>
    </main>
  );
}
