import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, message, Typography, Tag } from 'antd';
import { EditOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

const AGREEMENT_TYPES = [
  { key: 'agreement', label: '用户协议' },
  { key: 'privacy', label: '隐私政策' },
  { key: 'summary', label: '平台须知' },
  { key: 'disclaimer', label: '免责声明' },
  { key: 'service', label: '服务条款' },
  { key: 'refund', label: '退款说明' },
  { key: 'complaint', label: '投诉渠道' },
];

function parseAgreement(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch {
    // 非 JSON 字符串，原样保留
  }
  return raw;
}

export default function AgreementConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = () => {
    setLoading(true);
    adminApi.getConfigs()
      .then((res) => {
        const list = AGREEMENT_TYPES.map(({ key, label }) => {
          const raw = res[`agreement_${key}`];
          const content = parseAgreement(raw);
          const sections = Array.isArray(content?.sections)
            ? content.sections
            : typeof content === 'object' && content !== null
              ? []
              : [];
          return {
            key,
            label,
            title: content?.title || label,
            sectionCount: sections.length,
            configured: !!raw,
          };
        });
        setRows(list);
      })
      .catch((e) => message.error(e.message || '加载协议配置失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (record) => {
    adminApi.getConfigs()
      .then((res) => {
        const raw = res[`agreement_${record.key}`];
        let content = { title: record.label, sections: [] };
        const parsed = parseAgreement(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          content = {
            title: parsed.title || record.label,
            sections: Array.isArray(parsed.sections) ? parsed.sections : [],
          };
        }
        setEditing(record);
        form.setFieldsValue(content);
        setModalOpen(true);
      })
      .catch((e) => message.error(e.message));
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        sections: (values.sections || []).map((s) => ({ h: s.h, p: s.p })),
      };
      await adminApi.updateConfig({ [`agreement_${editing.key}`]: payload });
      message.success('协议已保存');
      setModalOpen(false);
      fetchData();
    } catch (e) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '协议类型',
      dataIndex: 'label',
      render: (text, record) => (
        <Space>
          {text}
          {record.configured && <Tag color="green">已配置</Tag>}
        </Space>
      ),
    },
    { title: '标题', dataIndex: 'title' },
    { title: '段落数', dataIndex: 'sectionCount', width: 100 },
    {
      title: '操作',
      width: 100,
      render: (text, record) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>协议内容管理</Title>
      <Card loading={loading}>
        <Table
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      </Card>

      <Modal
        title={`编辑协议：${editing?.label || ''}`}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="协议标题"
            rules={[{ required: true, message: '请输入协议标题' }]}
          >
            <Input placeholder="如：用户协议" />
          </Form.Item>

          <Form.List name="sections">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`段落 ${name + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'h']}
                        label="小标题"
                        rules={[{ required: true, message: '请输入段落小标题' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="如：一、服务说明" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'p']}
                        label="正文"
                        rules={[{ required: true, message: '请输入段落正文' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea rows={3} placeholder="请输入该段落正文内容" />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  添加段落
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}