import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Form, Input, Button, Picker, Cell, Field, Toast } from 'react-vant';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { SUPPLIER_CATEGORIES } from '../constants';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [category, setCategory] = useState(user?.category || SUPPLIER_CATEGORIES[0].value);

  const categoryColumns = SUPPLIER_CATEGORIES.map((c) => ({ text: `${c.icon} ${c.label}`, value: c.value }));

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.updateMe({ ...values, category });
      updateUser(res);
      Toast.success('保存成功');
      navigate('/profile');
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <NavBar title="编辑资料" leftText="返回" onClickLeft={() => navigate(-1)} safeAreaInsetTop />
      <div className="publish-card">
        <Form
          initialValues={{ nickname: user?.nickname, company: user?.company, bio: user?.bio }}
          onFinish={onFinish}
          footer={
            <Button type="primary" block round nativeType="submit" loading={submitting}>
              保存
            </Button>
          }
        >
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请填写昵称' }]}>
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item name="company" label="公司">
            <Input placeholder="公司名称" />
          </Form.Item>
          <Cell
            title="供应商类型"
            value={SUPPLIER_CATEGORIES.find((c) => c.value === category)?.label}
            isLink
            onClick={() => setShowCategory(true)}
          />
          <Form.Item name="bio" label="个人简介">
            <Field type="textarea" rows={3} autosize placeholder="介绍你的服务与资源（选填）" />
          </Form.Item>
        </Form>
      </div>

      <Picker
        visible={showCategory}
        columns={categoryColumns}
        onConfirm={(value) => {
          if (value) setCategory(value);
          setShowCategory(false);
        }}
        onCancel={() => setShowCategory(false)}
      />
    </div>
  );
}
