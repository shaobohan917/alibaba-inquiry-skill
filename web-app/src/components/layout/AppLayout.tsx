import {
  AppstoreOutlined,
  BarChartOutlined,
  ControlOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/console', icon: <ControlOutlined />, label: '主控制台' },
  { key: '/dashboard', icon: <BarChartOutlined />, label: '数据仪表盘' },
  { key: '/sales', icon: <TeamOutlined />, label: '业务员' },
  { key: '/operation', icon: <AppstoreOutlined />, label: '运营' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout className="app-shell">
      <Sider width={240} className="app-sider">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <div>
            <Typography.Title level={5}>阿里国际站 AI 智能体</Typography.Title>
            <Typography.Text>协同系统</Typography.Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <Typography.Text type="secondary">企业级桌面智能体工作台</Typography.Text>
            <Typography.Title level={4}>7 Agent 自动化能力 + 数据看板</Typography.Title>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
