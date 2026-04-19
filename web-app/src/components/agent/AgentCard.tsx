import { Card, Tag, Button, Space, Typography } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';

interface AgentCardProps {
  role: string;
  name: string;
  capability: string;
  status: 'running' | 'offline' | 'error' | 'stopped' | 'starting' | 'stopping' | 'exited';
  pid: number | null;
  onStart: () => void;
  onStop: () => void;
  loading?: boolean;
}

export function AgentCard({
  role,
  name,
  capability,
  status,
  pid,
  onStart,
  onStop,
  loading = false,
}: AgentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
      case 'starting':
        return 'green';
      case 'error':
        return 'red';
      case 'stopping':
        return 'gold';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    if (status === 'running' && pid) {
      return `运行中 (PID: ${pid})`;
    }
    if (status === 'starting') return '启动中...';
    if (status === 'stopping') return '停止中...';
    return status === 'running' ? '运行中' : status;
  };

  return (
    <Card
      title={name}
      extra={
        <Tag color={getStatusColor()}>{getStatusText()}</Tag>
      }
      bordered={status === 'running' || status === 'starting'}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Typography.Text strong>{role}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {capability}
        </Typography.Text>

        <Space style={{ marginTop: 8 }}>
          {status === 'running' || status === 'starting' ? (
            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              loading={loading}
              size="small"
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onStart}
              loading={loading}
              size="small"
            >
              启动
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
