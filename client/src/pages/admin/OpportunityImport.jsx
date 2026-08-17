import { useState } from 'react';
import { Card, Typography, Button, Upload, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function OpportunityImport() {
  const [lastResult, setLastResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (info) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', info.file);
      const res = await adminApi.importOpportunities(formData);
      setLastResult(res);
      message.success(res.message);
    } catch (e) {
      message.error(e.message);
      setLastResult({ successCount: 0, errorCount: 1, errors: [e.message] });
    } finally { setUploading(false); }
  };

  return (
    <div>
      <Title level={4}>批量导入商机</Title>
      <Card>
        <Alert
          message="导入说明"
          description="支持 CSV 格式（标题,分类ID,城市,酒店名称,阶段,价格,公开描述,详细描述,联系人,联系电话），标题为必填"
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Upload accept=".csv" showUploadList={false} customRequest={handleUpload} disabled={uploading}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>选择 CSV 文件</Button>
        </Upload>
        {lastResult && (
          <Card style={{ marginTop: 16 }} title="导入结果" size="small">
            <p>成功：{lastResult.successCount} 条 | 失败：{lastResult.errorCount} 条</p>
            {lastResult.errors?.length > 0 && <ul>{lastResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </Card>
        )}
      </Card>
    </div>
  );
}