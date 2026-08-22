import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Picker, Toast, Cell } from 'react-vant';
import { useAuth } from '../context/AuthContext';
import { SUPPLIER_CATEGORIES } from '../constants';
import { categoryPickerColumns, findCategoryLabel } from '../utils/category';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [category, setCategory] = useState(SUPPLIER_CATEGORIES[0].value);

  const columns = categoryPickerColumns();

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await register({ ...values, category });
      Toast.success('注册成功');
      navigate('/', { replace: true });
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero auth-hero--sm">
        <div className="auth-logo">注册账号</div>
        <p className="auth-slogan">加入酒店供应链互助生态</p>
      </div>

      <div className="auth-form">
        <Form
          onFinish={onFinish}
          footer={
            <Button type="primary" block round nativeType="submit" loading={submitting}>
              注册
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
            <Input type="tel" placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请填写昵称' }]}
          >
            <Input placeholder="如：装修张工" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' },
            ]}
          >
            <Input type="email" placeholder="用于找回密码" />
          </Form.Item>
          <Form.Item name="company" label="公司">
            <Input placeholder="公司名称（选填）" />
          </Form.Item>
          <Cell
            title="供应商类型"
            value={findCategoryLabel(category)}
            isLink
            onClick={() => setShowPicker(true)}
          />
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input type="password" placeholder="至少 6 位密码" />
          </Form.Item>
        </Form>
        <div className="auth-link">
          已有账号？
          <Link to="/login">去登录</Link>
        </div>
        <div className="auth-agreement">
          注册即代表您已阅读并同意
          <Link to="/agreement/agreement">《用户协议》</Link>
          和
          <Link to="/agreement/privacy">《隐私政策》</Link>
        </div>
      </div>

      <Picker
        visible={showPicker}
        columns={columns}
        onConfirm={(value) => {
          if (value) setCategory(value);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
    </div>
  );
}
