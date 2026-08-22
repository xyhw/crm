import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, message, Modal } from 'antd';
import { ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate, followUpStatusLabel } from '../../constants';

const { Title, Paragraph } = Typography;

export default function AuditList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });
  const [auditItem, setAuditItem] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditList(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [params]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '商机标题', dataIndex: 'opportunity_title', ellipsis: true },
    { title: '提交者', dataIndex: 'user_name', width: 100 },
    { title: '进度状态', dataIndex: 'status', width: 100, render: (v) => <Tag>{followUpStatusLabel(v)}</Tag> },
    { title: '分享摘要', dataIndex: 'summary', ellipsis: true },
    { title: '提交时间', dataIndex: 'created_at', width: 160, render: formatDate },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAudit(record, 'approved')}>
            通过
          </Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleAudit(record, 'rejected')}>
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  const handleAudit = (record, auditStatus) => {
    setAuditItem({ ...record, auditStatus });
  };

  const confirmAudit = async () => {
    try {
      await adminApi.auditFollowUp(auditItem.id, { status: auditItem.auditStatus });
      message.success('审核完成');
      setAuditItem(null);
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div>
      <Title level={4}>摘要审核</Title>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: params.page,
            pageSize: params.pageSize,
            total,
            onChange: (page, pageSize) => setParams({ ...params, page, pageSize }),
          }}
        />
      </Card>

      <Modal
        title="确认审核"
        open={!!auditItem}
        onOk={confirmAudit}
        onCancel={() => setAuditItem(null)}
        okText="确认"
        cancelText="取消"
      >
        {auditItem && (
          <div>
            <Paragraph>确定要{auditItem.auditStatus === 'approved' ? '通过' : '驳回'}这条分享摘要吗？</Paragraph>
            <Paragraph type="secondary">摘要内容：{auditItem.summary}</Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
}
