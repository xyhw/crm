import { useNavigate } from 'react-router-dom';
import { Empty, Button } from 'react-vant';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page not-found">
      <Empty description="页面不存在" className="empty-top" />
      <Button block round type="primary" onClick={() => navigate('/')}>
        返回首页
      </Button>
    </div>
  );
}
