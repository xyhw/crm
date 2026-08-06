import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Toast } from 'react-vant';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      Toast.success('登录成功');
      navigate('/', { replace: true });
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-logo">跟单互助</div>
        <p className="auth-slogan">酒店供应链供应商互助平台</p>
        <p className="auth-sub">我为人人，人人为我</p>
      </div>

      <div className="auth-form">
        <Form
          onFinish={onFinish}
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button type="primary" block round nativeType="submit" loading={submitting}>
                登录
              </Button>
              <Button
                block
                round
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
              >
                忘记密码
              </Button>
            </div>
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
            <Input type="tel" placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input type="password" placeholder="请输入密码" />
          </Form.Item>
        </Form>
        <div className="auth-link">
          还没有账号？
          <Link to="/register">立即注册</Link>
        </div>
        <div className="auth-agreement">
          登录即代表您已阅读并同意
          <Link to="/agreement/agreement">《用户协议》</Link>
          和
          <Link to="/agreement/privacy">《隐私政策》</Link>
        </div>
      </div>
    </div>
  );
}
