import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Picker, Cell, Field, Toast } from 'react-vant';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { SUPPLIER_CATEGORIES } from '../constants';
import { categoryPickerColumns, findCategoryLabel } from '../utils/category';
import PageNavBar from '../components/PageNavBar';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
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
