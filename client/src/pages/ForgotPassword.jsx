import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Toast } from 'react-vant';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.resetPassword(values);
      setResult(res);
      Toast.success('密码已重置');
    } catch (e) {
      Toast.fail(e.message || '重置失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="auth-page">
        <div className="auth-hero auth-hero--sm">
          <div className="auth-logo">{result.code === 0 ? '重置成功' : '重置失败'}</div>
          <p className="auth-slogan">
            {result.code === 0
              ? `新密码为注册手机号后6位，请登录后及时修改`
              : result.message}
          </p>
        </div>
        <div className="auth-form" style={{ textAlign: 'center' }}>
          {result.code === 0 && (
            <Button type="primary" block round onClick={() => navigate('/login')}>
              前往登录
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-hero auth-hero--sm">
        <div className="auth-logo">找回密码</div>
        <p className="auth-slogan">输入注册时的手机号和昵称</p>
      </div>

      <div className="auth-form">
        <Form
          onFinish={onFinish}
          footer={
            <Button type="primary" block round nativeType="submit" loading={submitting}>
              重置密码
            </Button>
          }
        >
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input type="tel" placeholder="请输入注册手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="请输入注册时的昵称" />
          </Form.Item>
        </Form>
        <div className="auth-link">
          想起密码了？
          <Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
}