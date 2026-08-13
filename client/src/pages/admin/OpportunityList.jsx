import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Input, Select, Drawer, Descriptions, message, Popconfirm } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate, opportunityStatusLabel } from '../../constants';

const { Title } = Typography;
const { Option } = Select;

export default function OpportunityList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOpportunities(params);
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

  const handleDetail = async (record) => {
    setDetailLoading(true);
    try {
      const data = await adminApi.getOpportunityDetail(record.id);
      setDetail(data);
      setDetailOpen(true);
    } catch (e) {
      message.error(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (record, status) => {
    try {
      await adminApi.updateOpportunity(record.id, { status });
      message.success(status === 'inactive' ? '已下架' : '已上架');
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '城市', dataIndex: 'city', width: 80 },
    { title: '酒店', dataIndex: 'hotel_name', ellipsis: true, width: 140 },
    { title: '发布者', dataIndex: 'publisher_name', width: 100 },
    { title: '定价', dataIndex: 'price', width: 90, render: (v) => `${v}积分` },
    { title: '销量', dataIndex: 'purchase_count', width: 60 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <Tag>{opportunityStatusLabel(v)}</Tag> },
    { title: '发布时间', dataIndex: 'created_at', width: 160, render: formatDate },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleDetail(record)}>
            详情
          </Button>
          {record.status === 'active' ? (
            <Popconfirm title="确认下架该跟单？" onConfirm={() => handleUpdateStatus(record, 'inactive')}>
              <Button size="small" danger>
                下架
              </Button>
            </Popconfirm>
          ) : (
            record.status === 'inactive' && (
              <Button size="small" onClick={() => handleUpdateStatus(record, 'active')}>
                上架
              </Button>
            )
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>跟单管理</Title>
      <Card>
        <div className="action-row">
          <Input
            placeholder="搜索标题/酒店/城市"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
          />
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, status: v, page: 1 })}
          >
            <Option value="active">销售中</Option>
            <Option value="inactive">已下架</Option>
            <Option value="invalid">已失效</Option>
          </Select>
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

      <Drawer title={`跟单详情 #${detail?.id || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} width={520} loading={detailLoading}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="酒店">{detail.hotel_name}</Descriptions.Item>
            <Descriptions.Item label="分类">{detail.category_name}</Descriptions.Item>
            <Descriptions.Item label="发布者">{detail.publisher_name}</Descriptions.Item>
            <Descriptions.Item label="定价">{detail.price}积分</Descriptions.Item>
            <Descriptions.Item label="销量">{detail.purchase_count}</Descriptions.Item>
            <Descriptions.Item label="浏览">{detail.view_count}</Descriptions.Item>
            <Descriptions.Item label="无效标记">{detail.invalid_mark_count}次</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag>{opportunityStatusLabel(detail.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="阶段">{detail.stage || '-'}</Descriptions.Item>
            <Descriptions.Item label="公开描述">{detail.description_public || '-'}</Descriptions.Item>
            <Descriptions.Item label="完整描述">{detail.description_full || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系人">{detail.contact_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{detail.contact_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="有效至">{detail.valid_until ? formatDate(detail.valid_until) : '-'}</Descriptions.Item>
            <Descriptions.Item label="发布时间">{formatDate(detail.created_at)}</Descriptions.Item>
          </Descriptions>
        )}

        {detail && detail.invalidMarks?.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 16 }}>
              无效标记记录
            </Title>
            <Table
              size="small"
              rowKey="id"
              dataSource={detail.invalidMarks}
              pagination={false}
              columns={[
                { title: '标记用户', dataIndex: 'user_name', width: 100 },
                { title: '原因', dataIndex: 'reason', ellipsis: true },
                { title: '时间', dataIndex: 'created_at', width: 160, render: formatDate },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
