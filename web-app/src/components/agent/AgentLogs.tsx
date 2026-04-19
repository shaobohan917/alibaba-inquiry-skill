import { Card, List, Typography, Space, Button, Switch, Tag } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source?: string;
  message: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

interface AgentLogsProps {
  role: string;
  logs: LogEntry[];
  onClear?: () => void;
}

const levelColors: Record<string, string> = {
  info: '#1677ff',
  warn: '#faad14',
  error: '#ff4d4f',
  debug: '#52c41a',
};

export function AgentLogs({ role, logs, onClear }: AgentLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card
      title={`📋 ${role.toUpperCase()} 日志`}
      extra={
        <Space size="small">
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="自动滚动"
            unCheckedChildren="手动"
            size="small"
          />
          {onClear && (
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={onClear}
              size="small"
            >
              清空
            </Button>
          )}
        </Space>
      }
      size="small"
    >
      <div
        ref={listRef}
        style={{
          height: 400,
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
          borderRadius: 4,
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {logs.length === 0 ? (
          <Typography.Text type="secondary">暂无日志</Typography.Text>
        ) : (
          <List
            dataSource={logs}
            renderItem={(log) => (
              <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                <Space size={8} style={{ alignItems: 'flex-start' }}>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 11, minWidth: 70 }}
                  >
                    {formatTime(log.timestamp)}
                  </Typography.Text>
                  <Tag color={levelColors[log.level]} style={{ margin: 0 }}>
                    {log.level.toUpperCase()}
                  </Tag>
                  <Typography.Text
                    copyable={{ text: log.message }}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  >
                    {log.message}
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
}
