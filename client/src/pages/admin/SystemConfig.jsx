import { useState, useEffect } from 'react';
import { Card, Typography, Form, InputNumber, Switch, Button, message, Divider, Row, Col } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function SystemConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    adminApi.getConfigs()
      .then((res) => {
        form.setFieldsValue({
          ...res,
          platform_commission_rate: Math.round((Number(res.platform_commission_rate) || 0) * 100),
          invalid_threshold: Math.round((Number(res.invalid_threshold) || 0) * 100),
          invalid_penalty_rate: Math.round((Number(res.invalid_penalty_rate) || 0) * 100),
          similarity_threshold: Math.round((Number(res.similarity_threshold) || 0) * 100),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await adminApi.updateConfig({
        ...values,
        platform_commission_rate: (Number(values.platform_commission_rate) || 0) / 100,
        invalid_threshold: (Number(values.invalid_threshold) || 0) / 100,
        invalid_penalty_rate: (Number(values.invalid_penalty_rate) || 0) / 100,
        similarity_threshold: (Number(values.similarity_threshold) || 0) / 100,
      });
      message.success('配置已保存');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={4}>系统配置</Title>
      <Card loading={loading}>
        <Form form={form} layout="vertical">
          <Title level={5}>积分配置</Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="register_gift_points" label="注册赠送积分">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invite_reward_points" label="邀请奖励积分">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="helpful_reward_points" label="分享认可奖励积分">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="share_reward_points" label="分享奖励积分">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="points_expire_days" label="积分有效期(天)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="points_recharge_limit" label="单次充值上限">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="opportunity_price_min" label="商机定价下限(积分)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="opportunity_price_max" label="商机定价上限(积分)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="points_mall_enabled" label="积分商城开关" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>分成与审核配置</Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="platform_commission_rate" label="平台抽成比例(%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="similarity_threshold" label="相似度判定阈值(%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>信用与无效配置</Title>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="invalid_threshold" label="无效判定阈值(%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invalid_penalty_rate" label="无效惩罚信用分">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invalid_ban_threshold" label="无效累计封禁次数">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="credit_review_threshold" label="投稿审核信用阈值">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="credit_ban_threshold" label="封禁信用阈值">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
