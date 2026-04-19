import { Alert, Row, Col, Space, Typography, Empty, Button } from 'antd';
import { useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/useAgentStore';
import { AgentCard } from '../../components/agent/AgentCard';
import { AgentLogs } from '../../components/agent/AgentLogs';

export function ConsolePage() {
  const {
    agents,
    logs,
    subscriptions,
    selectedAgentId,
    loading,
    error,
    fetchStatus,
    startAgent,
    stopAgent,
    subscribeLogs,
    clearLogs,
    selectAgent,
    getProfile,
    fetchFailed,
  } = useAgentStore();

  const [userInteracted, setUserInteracted] = useState(false);

  // 初始化加载状态
  useEffect(() => {
    fetchStatus(false); // 初始加载不显示错误
  }, []);

  // 自动订阅运行中 Agent 的日志
  useEffect(() => {
    agents.forEach((agent) => {
      if (agent.status === 'running' && !subscriptions.has(agent.role)) {
        subscribeLogs(agent.role);
      }
    });
  }, [agents]);

  const handleStart = async (role: string) => {
    setUserInteracted(true);
    await startAgent(role);
  };

  const handleStop = async (role: string) => {
    setUserInteracted(true);
    await stopAgent(role);
  };

  const handleCardClick = (role: string) => {
    selectAgent(role);
  };

  const handleRetry = () => {
    fetchStatus(true);
  };

  return (
    <Space direction="vertical" size={20} className="page-stack" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>主控制台</Typography.Title>
        <Typography.Text type="secondary">
          统一查看 Agent 协作状态、关键任务与异常提醒。
        </Typography.Text>
      </div>

      {error && userInteracted && (
        <Alert
          message="错误"
          description={
            <div>
              <p>{error}</p>
              <p style={{ marginTop: 8 }}>
                <Button type="primary" size="small" onClick={handleRetry}>
                  重试
                </Button>
              </p>
            </div>
          }
          type="error"
          showIcon
          closable
        />
      )}

      {fetchFailed && !userInteracted && (
        <Alert
          message="后端服务未连接"
          description={
            <div>
              <p>无法连接到后端 API 服务，请确认后端已启动。</p>
              <p style={{ marginTop: 8 }}>
                <Button type="primary" size="small" onClick={handleRetry}>
                  重试
                </Button>
              </p>
            </div>
          }
          type="warning"
          showIcon
          closable
        />
      )}

      {/* Agent 卡片网格 */}
      <Row gutter={[16, 16]}>
        {agents.length === 0 ? (
          <Col span={24}>
            <Empty description="加载中..." />
          </Col>
        ) : (
          agents.map((agent) => {
            const profile = getProfile(agent.role);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={agent.role}>
                <div onClick={() => handleCardClick(agent.role)} style={{ cursor: 'pointer' }}>
                  <AgentCard
                    role={profile?.role || agent.role}
                    name={profile?.name || agent.role}
                    capability={profile?.capability || ''}
                    status={agent.status}
                    pid={agent.pid}
                    onStart={() => handleStart(agent.role)}
                    onStop={() => handleStop(agent.role)}
                    loading={loading}
                  />
                </div>
              </Col>
            );
          })
        )}
      </Row>

      {/* 日志面板 */}
      {selectedAgentId ? (
        <AgentLogs
          role={selectedAgentId}
          logs={logs.get(selectedAgentId) || []}
          onClear={() => clearLogs(selectedAgentId)}
        />
      ) : (
        <Alert
          message="选择一个 Agent 查看日志"
          description="点击上方的 Agent 卡片可查看实时日志输出"
          type="info"
          showIcon
        />
      )}
    </Space>
  );
}
