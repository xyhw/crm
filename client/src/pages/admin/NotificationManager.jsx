import { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Input, Radio, Space, message, Typography } from 'antd';
import { SendOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate } from '../../constants';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function NotificationManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sendAll, setSendAll] = useState(true);
  const [userIds, setUserIds] = useState('');
  const [sending, setSending] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getNotificationHistory(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [params]);

  const handleSend = async () => {
    if (!title || !content) {
      message.error('标题和内容不能为空');
      return;
    }
    if (!sendAll && !userIds.trim()) {
      message.error('请输入用户ID');
      return;
    }
    setSending(true);
    try {
      const data = { title, content, sendAll };
      if (!sendAll) {
        data.userIds = userIds.split(/[,，\s]+/).map((s) => Number(s.trim())).filter(Boolean);
      }
      await adminApi.sendNotification(data);
      message.success('发送成功');
      setModalOpen(false);
      setTitle('');
      setContent('');
      setSendAll(true);
      setUserIds('');
      fetchList();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const columns = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '接收人数', dataIndex: 'recipient_count', width: 100 },
    { title: '发送时间', dataIndex: 'sent_time', width: 160, render: formatDate },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>通知管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setModalOpen(true)}>发送通知</Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={list} rowKey={(r) => r.sent_time} loading={loading} pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
      </Card>

      <Modal title="发送系统通知" open={modalOpen} onOk={handleSend} onCancel={() => setModalOpen(false)} confirmLoading={sending} okText="发送" cancelText="取消" width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="form-label">通知标题</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入通知标题" maxLength={100} />
          </div>
          <div>
            <div className="form-label">通知内容</div>
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} placeholder="请输入通知内容" rows={4} maxLength={500} />
          </div>
          <div>
            <div className="form-label">发送对象</div>
            <Radio.Group value={sendAll} onChange={(e) => setSendAll(e.target.value)}>
              <Radio value={true}>全部用户</Radio>
              <Radio value={false}>指定用户</Radio>
            </Radio.Group>
            {!sendAll && (
              <Input
                style={{ marginTop: 8 }}
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder="用户ID，用逗号分隔，如 1,2,3"
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}