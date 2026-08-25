import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Picker, Cell, Field, CellGroup, Toast } from 'react-vant';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { SUPPLIER_CATEGORIES } from '../constants';
import { categoryPickerColumns, findCategoryLabel } from '../utils/category';
import PageNavBar from '../components/PageNavBar';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [category, setCategory] = useState(user?.category || SUPPLIER_CATEGORIES[0].value);

  const categoryColumns = categoryPickerColumns();

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await api.updateMe({ ...values, category });
      await refreshUser();
      Toast.success('保存成功');
      navigate('/profile');
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      Toast.fail('两次输入的新密码不一致');
      return;
    }
    setPwdSubmitting(true);
    try {
      await api.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      Toast.success('密码修改成功，请重新登录');
      logout();
      navigate('/login');
    } catch (e) {
      Toast.fail(e.message || '修改失败');
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageNavBar title="编辑资料" onClickLeft={() => navigate(-1)} />
      <div className="publish-card">
        <Form
          initialValues={{ nickname: user?.nickname, company: user?.company, bio: user?.bio, qualifications: user?.qualifications || '', cases: user?.cases || '' }}
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
            value={findCategoryLabel(category)}
            isLink
            onClick={() => setShowCategory(true)}
          />
          <Form.Item name="bio" label="个人简介">
            <Field type="textarea" rows={2} autosize placeholder="介绍你的服务与资源（选填）" />
          </Form.Item>
          <Form.Item name="qualifications" label="专业资质">
            <Field type="textarea" rows={2} autosize placeholder="资质证书、荣誉称号等（换行分隔）" />
          </Form.Item>
          <Form.Item name="cases" label="典型案例">
            <Field type="textarea" rows={3} autosize placeholder="案例名称和简要描述（换行分隔，如：某五星酒店弱电总包 - 300间客房）" />
          </Form.Item>
        </Form>
      </div>

      {/* 修改密码 */}
      <CellGroup inset className="profile-section--gap">
        <Cell title="修改密码" />
        <Form onFinish={onChangePassword}>
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input type="password" placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { pattern: /^.{6,}$/, message: '新密码长度至少 6 位' },
            ]}
          >
            <Input type="password" placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入新密码' }]}
          >
            <Input type="password" placeholder="请再次输入新密码" />
          </Form.Item>
          <Button type="primary" block round nativeType="submit" loading={pwdSubmitting}>
            确认修改
          </Button>
        </Form>
      </CellGroup>

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
