import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Field, Button, Toast } from 'react-vant';
import { api } from '../api';

const COUNTDOWN = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(COUNTDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onSendCode = async () => {
    const email = form.getFieldValue('email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
      Toast.fail('请输入正确的邮箱');
      return;
    }
    setSending(true);
    try {
      await api.sendResetCode({ email });
      Toast.success('验证码已发送至该邮箱');
      startCountdown();
    } catch (e) {
      Toast.fail(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await api.resetPassword({ email: values.email, code: values.code, newPassword: values.newPassword });
      Toast.success('密码重置成功');
      navigate('/login');
    } catch (e) {
      Toast.fail(e.message || '重置失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero auth-hero--sm">
        <div className="auth-logo">找回密码</div>
        <p className="auth-slogan">输入注册邮箱，验证码将发送至该邮箱</p>
      </div>

      <div className="auth-form">
        <Form
          form={form}
          onFinish={onFinish}
          footer={
            <Button type="primary" block round nativeType="submit" loading={submitting}>
              重置密码
            </Button>
          }
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' },
            ]}
          >
            <Field placeholder="请输入注册邮箱" />
          </Form.Item>
          <Form.Item
            name="code"
            label="验证码"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Field
              type="tel"
              placeholder="请输入邮箱收到的验证码"
              maxLength={6}
              button={
                <Button
                  size="small"
                  type="primary"
                  plain
                  disabled={countdown > 0 || sending}
                  loading={sending}
                  onClick={onSendCode}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { pattern: /^.{6,}$/, message: '新密码长度至少 6 位' },
            ]}
          >
            <Field type="password" placeholder="请输入新密码（至少6位）" />
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
