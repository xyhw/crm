import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Button, Cell, CellGroup, Field, Form } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';

export default function CRMAdd() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    cityName: '',
    city: '',
    hotelName: '',
    description: '',
    contactName: '',
    contactPhone: '',
  });

  const handleFinish = async () => {
    if (!form.title) {
      Toast.fail('请填写商机标题');
      return;
    }
    setSubmitting(true);
    try {
      await api.crmAdd(form);
      Toast.success('录入成功');
      navigate('/crm');
    } catch (e) {
      Toast.fail(e.message || '录入失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageNavBar title="手动录入商机" onClickLeft={() => navigate(-1)} />

      <CellGroup inset className="profile-section--gap">
        <Cell title="商机标题" required>
          <Field
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="请输入商机标题"
          />
        </Cell>
        <Cell title="城市">
          <Field
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            placeholder="请输入城市"
          />
        </Cell>
        <Cell title="酒店名称">
          <Field
            value={form.hotelName}
            onChange={(v) => setForm({ ...form, hotelName: v })}
            placeholder="请输入酒店名称"
          />
        </Cell>
        <Cell title="联系人">
          <Field
            value={form.contactName}
            onChange={(v) => setForm({ ...form, contactName: v })}
            placeholder="请输入联系人"
          />
        </Cell>
        <Cell title="联系电话">
          <Field
            value={form.contactPhone}
            onChange={(v) => setForm({ ...form, contactPhone: v })}
            placeholder="请输入联系电话"
          />
        </Cell>
        <Cell title="商机描述">
          <Field
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder="请输入商机描述"
          />
        </Cell>
      </CellGroup>

      <div className="detail-footer">
        <Button type="primary" block round loading={submitting} onClick={handleFinish}>
          提交录入
        </Button>
      </div>
    </div>
  );
}
