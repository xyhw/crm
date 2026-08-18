import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Button, Input, Select, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;
const { Option } = Select;

export default function AuditLogPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [params]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '操作人', dataIndex: 'admin_name', width: 100 },
    { title: '操作', dataIndex: 'action', width: 120, render: (v) => {
      const labels = { view: '查看', edit: '编辑', delete: '删除', create: '创建', approved: '审核通过', rejected: '审核驳回', ban: '封禁', unban: '解封', import: '批量导入', adjust_points: '调整积分', adjust_credits: '调整信用分' };
      return labels[v] || v;
    }},
    { title: '目标类型', dataIndex: 'target_type', width: 100 },
    { title: '目标ID', dataIndex: 'target_id', width: 80 },
    { title: '详情', dataIndex: 'detail', ellipsis: true, width: 200 },
    { title: 'IP', dataIndex: 'ip', width: 120 },
    { title: '时间', dataIndex: 'created_at', width: 160, render: (v) => new Date(v).toLocaleString('zh-CN') },
  ];

  return (
    <div>
      <Title level={4}>操作日志</Title>
      <Card>
        <div className="action-row">
          <Input placeholder="搜索操作人/详情" prefix={<SearchOutlined />} style={{ width: 200 }}
            onChange={(e) => setParams({ ...params, keyword: e.target.value })} />
          <Select placeholder="操作类型" style={{ width: 120 }} allowClear
            onChange={(v) => setParams({ ...params, action: v })}>
            <Option value="edit">编辑</Option><Option value="delete">删除</Option>
            <Option value="create">创建</Option><Option value="ban">封禁</Option>
            <Option value="unban">解封</Option><Option value="approved">审核通过</Option>
            <Option value="rejected">审核驳回</Option><Option value="adjust_points">调整积分</Option>
            <Option value="adjust_credits">调整信用分</Option>
          </Select>
          <Select placeholder="目标类型" style={{ width: 120 }} allowClear
            onChange={(v) => setParams({ ...params, targetType: v })}>
            <Option value="opportunities">商机</Option><Option value="users">用户</Option>
            <Option value="orders">订单</Option><Option value="follow_up_shares">分享摘要</Option>
            <Option value="member_levels">等级</Option><Option value="system_configs">配置</Option>
            <Option value="role">角色</Option><Option value="admin_user">管理员</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading}
          pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (page, pageSize) => setParams({ ...params, page, pageSize }) }} />
      </Card>
    </div>
  );
}