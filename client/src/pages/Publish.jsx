import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, CellGroup, Button, Toast, Picker, Popup, Tag, Steps } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { SUPPLIER_CATEGORIES, ORDER_STAGES } from '../constants';
import Uploader from '../components/Uploader';

export default function Publish() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    categoryId: null,
    categoryName: '',
    brand: '',
    city: '',
    descriptionPublic: '',
    contactName: '',
    contactPhone: '',
    stage: '',
    price: '',
    tags: [],
    files: [],
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [similarList, setSimilarList] = useState(null);
  const [step, setStep] = useState(1);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const goNext = () => {
    if (!form.title.trim()) return Toast.fail('请输入项目名称');
    if (!form.categoryId) return Toast.fail('请选择供应分类');
    if (!form.price || Number(form.price) <= 0) return Toast.fail('请设置积分定价');
    setStep(2);
  };

  const handlePublish = async () => {
    if (!form.title.trim()) return Toast.fail('请输入项目名称');
    if (!form.categoryId) return Toast.fail('请选择供应分类');
    if (!form.price || Number(form.price) <= 0) return Toast.fail('请设置积分定价');

    setSubmitting(true);
    try {
      const data = await api.createOpportunity({
        title: form.title.trim(),
        categoryId: form.categoryId,
        brand: form.brand,
        city: form.city,
        descriptionPublic: form.descriptionPublic,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        stage: form.stage,
        price: Number(form.price),
        tags: form.tags,
        attachments: form.files.map((f) => f.url),
      });

      if (data?.similarOpportunities?.length) {
        setSimilarList(data.similarOpportunities);
        Toast.fail('存在相似跟单，请检查');
      } else {
        Toast.success('发布成功');
        navigate('/');
      }
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
      updateForm('tags', [...form.tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    updateForm('tags', form.tags.filter((t) => t !== tag));
  };

  const categoryColumns = SUPPLIER_CATEGORIES.map((c) => ({ text: c.label, value: c.value }));
  const stageColumns = ORDER_STAGES.map((s) => ({ text: s.label, value: s.value }));

  return (
    <div className="page">
      <PageNavBar title="发布跟单" onClickLeft={() => navigate(-1)} />

      <Steps active={step - 1} style={{ padding: '16px 24px 0' }}>
        <Steps.Item>基本信息</Steps.Item>
        <Steps.Item>补充详情</Steps.Item>
      </Steps>

      <CellGroup inset style={{ marginTop: 12 }}>
        <Field
          label="项目名称"
          placeholder="如：某酒店弱电总包采购"
          value={form.title}
          onChange={(v) => updateForm('title', v)}
          required
        />
        <Field
          label="供应分类"
          placeholder="请选择"
          value={form.categoryName}
          isLink
          readOnly
          onClick={() => setShowCategoryPicker(true)}
          required
        />
        {step === 1 && (
          <>
            <Field
              label="联系人"
              placeholder="您的姓名"
              value={form.contactName}
              onChange={(v) => updateForm('contactName', v)}
            />
            <Field
              label="手机号"
              placeholder="您的电话"
              value={form.contactPhone}
              onChange={(v) => updateForm('contactPhone', v)}
              type="tel"
            />
            <Field
              label="积分定价"
              placeholder="建议10-200积分"
              value={form.price}
              onChange={(v) => updateForm('price', v)}
              type="digit"
              required
            />
          </>
        )}
        {step === 2 && (
          <>
            <Field
              label="品牌"
              placeholder="如：某国际大酒店"
              value={form.brand}
              onChange={(v) => updateForm('brand', v)}
            />
            <Field
              label="所在城市"
              placeholder="如：上海"
              value={form.city}
              onChange={(v) => updateForm('city', v)}
            />
            <Field
              label="项目简介"
              placeholder="简要描述项目内容与规模"
              value={form.descriptionPublic}
              onChange={(v) => updateForm('descriptionPublic', v)}
              type="textarea"
              rows={2}
            />
            <Field
              label="项目进展"
              placeholder="请选择"
              value={form.stage ? ORDER_STAGES.find((s) => s.value === form.stage)?.label : ''}
              isLink
              readOnly
              onClick={() => setShowStagePicker(true)}
            />
          </>
        )}
      </CellGroup>

      {step === 2 && (
        <>
          {/* 标签 */}
          <div className="section">
            <div className="section-title" style={{ marginBottom: 8 }}>标签（最多5个）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 8 }}>
              {form.tags.map((tag) => (
                <Tag key={tag} closeable onClose={() => removeTag(tag)} style={{ margin: '0 8px 8px 0' }}>
                  {tag}
                </Tag>
              ))}
            </div>
            {form.tags.length < 5 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签"
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="small" onClick={addTag}>添加</Button>
              </div>
            )}
          </div>

          {/* 图纸附件 */}
          <div className="section">
            <div className="section-title" style={{ marginBottom: 8 }}>图纸附件（最多9个）</div>
            <Uploader files={form.files} onChange={(files) => updateForm('files', files)} />
          </div>
        </>
      )}

      <div style={{ padding: '16px' }}>
        {step === 1 && (
          <Button type="primary" block round onClick={goNext}>
            下一步
          </Button>
        )}
        {step === 2 && (
          <>
            <Button block round style={{ marginBottom: 12 }} onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button type="primary" block round loading={submitting} onClick={handlePublish}>
              发布跟单
            </Button>
          </>
        )}
      </div>

      {/* 相似跟单提示 */}
      {similarList && (
        <Popup visible={!!similarList} onClose={() => setSimilarList(null)} style={{ padding: 20, borderRadius: 12, margin: 20, width: 'calc(100% - 40px)' }}>
          <h3 style={{ margin: '0 0 12px' }}>发现相似跟单</h3>
          <div style={{ marginBottom: 12, color: '#666' }}>以下跟单与您发布的跟单相似：</div>
          {similarList.map((s) => (
            <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>{s.title}</div>
          ))}
          <Button type="primary" block round style={{ marginTop: 12 }} onClick={() => setSimilarList(null)}>
            我知道了
          </Button>
        </Popup>
      )}

      {/* 分类选择器 */}
      <Popup visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)} position="bottom" round>
        <Picker
          columns={categoryColumns}
          onConfirm={(val) => {
            updateForm('categoryId', val);
            updateForm('categoryName', SUPPLIER_CATEGORIES.find((c) => c.value === val)?.label || '');
            setShowCategoryPicker(false);
          }}
          onCancel={() => setShowCategoryPicker(false)}
        />
      </Popup>

      {/* 阶段选择器 */}
      <Popup visible={showStagePicker} onClose={() => setShowStagePicker(false)} position="bottom" round>
        <Picker
          columns={stageColumns}
          onConfirm={(val) => {
            updateForm('stage', val);
            setShowStagePicker(false);
          }}
          onCancel={() => setShowStagePicker(false)}
        />
      </Popup>
    </div>
  );
}