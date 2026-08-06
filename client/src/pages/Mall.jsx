import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Button, Dialog, Toast } from 'react-vant';
import Icon from '../components/Icon';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Mall() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState([]);

  const load = async () => {
    try {
      const res = await api.products();
      setProducts(res.list || []);
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  useEffect(() => {
    load();
    refreshUser().catch(() => {});
  }, []);

  const redeem = (p) => {
    Dialog.confirm({
      title: '兑换商品',
      message: `确认消耗 ${p.cost} 积分兑换「${p.name}」吗？`,
    })
      .then(async () => {
        try {
          await api.redeem(p.id);
          Toast.success('兑换成功，客服将尽快联系您');
          refreshUser();
          load();
        } catch (e) {
          Toast.fail(e.message);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="page">
      <NavBar title="积分商城" leftText="返回" onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      <div className="mall-banner">
        <div>
          <div className="mall-banner__num">{user?.points ?? 0}</div>
          <div className="mall-banner__label">我的积分</div>
        </div>
        <span className="mall-banner__link" onClick={() => navigate('/mall/redemptions')}>
          兑换记录 <Icon name="arrow" size={12} />
        </span>
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <div className="product-item" key={p.id}>
            <div className="product-item__icon">{p.icon || '🎁'}</div>
            <div className="product-item__name">{p.name}</div>
            <div className="product-item__desc">{p.desc}</div>
            <div className="product-item__foot">
              <span className="product-item__cost">{p.cost} 积分</span>
              <Button
                type="primary"
                size="small"
                round
                disabled={(user?.points ?? 0) < p.cost}
                onClick={() => redeem(p)}
              >
                兑换
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
