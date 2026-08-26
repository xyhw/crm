import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast, CellGroup } from 'react-vant';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageNavBar from '../components/PageNavBar';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  const onFinish = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      Toast.fail('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      Toast.success('密码修改成功，请重新登录');
      logout();
      navigate('/login');
    } catch (e) {
      Toast.fail(e.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  const inputType = visible ? 'text' : 'password';

  return (
    <div className="page">
      <PageNavBar title="账号安全" onClickLeft={() => navigate(-1)} />

      <Form
        onFinish={onFinish}
        footer={
          <Button type="primary" block round nativeType="submit" loading={submitting}>
            确认修改
          </Button>
        }
      >
        <CellGroup inset title="修改密码">
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input type={inputType} placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { pattern: /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, message: '密码至少 8 位，且必须包含字母和数字' },
            ]}
          >
            <Input type={inputType} placeholder="8 位以上，含字母和数字" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入新密码' }]}
          >
            <Input type={inputType} placeholder="请再次输入新密码" />
          </Form.Item>
        </CellGroup>
      </Form>

      <div className="profile-section--gap" style={{ padding: '4px 16px' }}>
        <Button size="small" plain round onClick={() => setVisible((v) => !v)}>
          {visible ? '隐藏密码' : '显示密码'}
        </Button>
      </div>
    </div>
  );
}
