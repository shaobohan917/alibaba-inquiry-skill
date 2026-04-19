import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAgentStore } from '../../stores/useAgentStore';
import { AgentLogs } from '../../components/agent/AgentLogs';

import { salesService } from '../../services/sales-service';
import type { ReplyDraft, ReplyDraftRequest, SalesLead, SalesOverview } from '../../services/sales-service';

const intentColors = {
  高: 'green',
  中: 'blue',
  低: 'default',
};

const leadColumns: ColumnsType<SalesLead> = [
  { title: '客户', dataIndex: 'customer' },
  { title: '国家', dataIndex: 'country', render: (value?: string) => value || '-' },
  {
    title: '意向',
    dataIndex: 'intent',
    render: (intent: SalesLead['intent'], record) => (
      <Space>
        <Tag color={intentColors[intent]}>{intent}</Tag>
        <Typography.Text type="secondary">{record.score}</Typography.Text>
      </Space>
    ),
  },
  { title: '建议动作', dataIndex: 'action' },
];

export function SalesPage() {
  const [form] = Form.useForm<ReplyDraftRequest>();
  const [messageApi, contextHolder] = message.useMessage();
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 从 useAgentStore 获取日志相关状态和方法
  const {
    logs,
    subscribeLogs,
    clearLogs,
  } = useAgentStore();

  // 初始化订阅业务员 Agent 日志
  useEffect(() => {
    subscribeLogs('sales');

    let mounted = true;

    async function loadSalesData() {
      try {
        const [overviewData, leadData] = await Promise.all([salesService.getOverview(), salesService.getLeads()]);
        if (mounted) {
          setOverview(overviewData);
          setLeads(leadData);
        }
      } catch (error) {
        if (mounted) {
          messageApi.error(error instanceof Error ? error.message : '业务员数据加载失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSalesData();

    return () => {
      mounted = false;
    };
  }, [subscribeLogs, messageApi]);

  async function handleGenerate(values: ReplyDraftRequest) {
    setGenerating(true);
    try {
      const draft = await salesService.createReplyDraft(values);
      setReplyDraft(draft);
      messageApi.success('回复已生成');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '生成回复失败');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Space direction="vertical" size={20} className="page-stack">
      {contextHolder}
      <div>
        <Typography.Title level={2}>业务员</Typography.Title>
        <Typography.Text type="secondary">处理国际站询盘、CRM 跟进、报价生成与成交提醒。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="询盘总数" value={overview?.inquiryCount ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="新询盘" value={overview?.newInquiryCount ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="高意向客户" value={overview?.highIntentCustomerCount ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="待跟进任务" value={overview?.followUpTaskCount ?? 0} loading={loading} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="AI 快速回复">
            <Form form={form} layout="vertical" onFinish={handleGenerate}>
              <Form.Item label="客户名称" name="customerName">
                <Input placeholder="例如 Apex Trading" />
              </Form.Item>
              <Form.Item label="产品" name="productName">
                <Input placeholder="客户询问的产品名称" />
              </Form.Item>
              <Form.Item label="客户询盘" name="message" rules={[{ required: true, message: '请输入客户询盘内容' }]}>
                <Input.TextArea
                  rows={6}
                  placeholder="粘贴客户询盘内容，生成多语言回复、报价策略和下一步动作。"
                />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="数量" name="quantity">
                    <Input placeholder="例如 1000 pcs" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="目标价" name="targetPrice">
                    <Input placeholder="例如 2.5" addonAfter="USD" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={generating}>
                生成回复
              </Button>
            </Form>
            {replyDraft && (
              <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
                <Space>
                  <Tag color={intentColors[replyDraft.intent]}>意向 {replyDraft.intent}</Tag>
                  <Typography.Text type="secondary">评分 {replyDraft.intentScore}</Typography.Text>
                </Space>
                <Typography.Paragraph>{replyDraft.strategy}</Typography.Paragraph>
                <Input.TextArea rows={10} value={replyDraft.reply} readOnly />
                <Space wrap>
                  {replyDraft.nextActions.map((action) => (
                    <Tag key={action}>{action}</Tag>
                  ))}
                </Space>
              </Space>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title="高意向客户"
            extra={
              <Space>
                <Tag color="green">自动识别</Tag>
                <Tag color="blue">CRM 同步</Tag>
              </Space>
            }
          >
            <Table columns={leadColumns} dataSource={leads} loading={loading} rowKey="id" pagination={false} />
          </Card>
        </Col>
      </Row>
      {/* 业务员 Agent 实时日志 */}
      <AgentLogs
        role="sales"
        logs={logs.get('sales') || []}
        onClear={() => clearLogs('sales')}
      />
    </Space>
  );
}
