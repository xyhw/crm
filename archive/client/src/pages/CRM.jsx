import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Toast, Button, Search, Tabs, Empty } from 'react-vant';
import { Plus } from '@react-vant/icons';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Icon from '../components/Icon';
import { crmStatusMeta } from '../constants';
import { resolveCategoryIcon } from '../utils/category';

const OPP_STATUS_META = {
  active: { label: '销售中', tone: 'verified' },
  inactive: { label: '已下架', tone: 'default' },
  invalid: { label: '已失效', tone: 'hot' },
};

export default function CRM() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('crm');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef(null);

  const fetchList = async (p = 1, reset = false) => {
    try {
      const res = mode === 'mine'
        ? await api.myOpportunities({ keyword: keyword || undefined, page: p, pageSize: 10 })
        : await api.crmList({ status, keyword, page: p, pageSize: 10 });
      const newList = res.list || [];
      setList(reset ? newList : (prev) => [...prev, ...newList]);
      setHasMore(newList.length === 10);
      setPage(p);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchList(1, true);
    }, keyword ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [status, keyword, mode]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchList(page + 1);
    }
  };

  const modeTabs = [
    { title: '手动线索', name: 'crm' },
    { title: '我发布的', name: 'mine' },
  ];

  const statusTabs = [
    { title: '全部', name: '' },
    { title: '待跟进', name: 'pending' },
    { title: '跟进中', name: 'following' },
    { title: '已成交', name: 'closed' },
    { title: '已放弃', name: 'abandoned' },
  ];

  return (
    <div className="page">
      <PageNavBar title="我的CRM" onClickLeft={() => navigate(-1)} />

      {/* 搜索栏 */}
      <Search
        value={keyword}
        onChange={setKeyword}
        placeholder="搜索商机"
        shape="round"
        className="search-bar"
      />

      {/* 数据源切换 */}
      <Tabs value={mode} onChange={setMode} shrink>
        {modeTabs.map((tab) => (
          <Tabs.TabPane key={tab.name} title={tab.title} name={tab.name} />
        ))}
      </Tabs>

      {/* 状态筛选（仅手动线索模式） */}
      {mode === 'crm' && (
        <Tabs value={status} onChange={setStatus} shrink>
          {statusTabs.map((tab) => (
            <Tabs.TabPane key={tab.name} title={tab.title} name={tab.name} />
          ))}
        </Tabs>
      )}

      {/* 列表 */}
      <div className="crm-list">
        {loading && list.length === 0 ? (
          <div className="empty-tip">加载中...</div>
        ) : list.length === 0 ? (
          <Empty description={mode === 'mine' ? '还没有发布过商机' : '暂无CRM商机'} className="empty-top" />
        ) : (
          list.map((item) => {
            if (mode === 'mine') {
              const statusMeta = OPP_STATUS_META[item.status] || OPP_STATUS_META.active;
              const editable = item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
              return (
                <div className="crm-card pressable" key={item.id} onClick={() => navigate(`/opportunity/${item.id}`)}>
                  <div className="crm-card__header">
                    <div className="cat-icon cat-icon--sm">
                      <Icon name={resolveCategoryIcon(item)} size={20} />
                    </div>
                    <div className="crm-card__title">{item.title}</div>
                  </div>
                  <div className="crm-card__info">
                    <span>{item.city || '未知城市'}</span>
                    <span>{item.hotelName || item.brand || '未知酒店'}</span>
                  </div>
                  <div className="crm-card__footer">
                    <Tag color={statusMeta.tone === 'hot' ? '#E54848' : statusMeta.tone === 'verified' ? '#048C47' : '#7A7A7A'}>{statusMeta.label}</Tag>
                    <span className="crm-card__time">{item.purchaseCount || 0} 人已购 · {item.viewCount || 0} 浏览</span>
                  </div>
                  <div className="crm-card__actions">
                    {editable ? (
                      <Button size="small" type="primary" plain onClick={(e) => { e.stopPropagation(); navigate(`/publish?edit=${item.id}`); }}>编辑</Button>
                    ) : (
                      <span className="crm-card__locked">{item.status === 'invalid' ? '已被判无效' : '已有购买者'}</span>
                    )}
                  </div>
                </div>
              );
            }
            const statusMeta = crmStatusMeta(item.status);
            return (
              <div className="crm-card pressable" key={item.id} onClick={() => navigate(`/crm/${item.id}`)}>
                <div className="crm-card__header">
                  <div className="cat-icon cat-icon--sm">
                    <Icon name={resolveCategoryIcon(item)} size={20} />
                  </div>
                  <div className="crm-card__title">{item.title || '手动录入商机'}</div>
                </div>
                <div className="crm-card__info">
                  <span>{item.city || '未知城市'}</span>
                  <span>{item.hotel_name || '未知酒店'}</span>
                  <span>{item.category_name || '其他'}</span>
                </div>
                <div className="crm-card__footer">
                  <Tag color={statusMeta.color} bg={statusMeta.bg}>{statusMeta.label}</Tag>
                  <span className="crm-card__time">{item.follow_up_count || 0} 次跟进</span>
                </div>
                {item.next_follow_date && (
                  <div className="crm-card__remind">
                    下次跟进：{new Date(item.next_follow_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 加载更多 */}
      {hasMore && list.length > 0 && (
        <div className="load-more" onClick={loadMore}>
          {loading ? '加载中...' : '加载更多'}
        </div>
      )}

      {/* 手动录入按钮（仅手动线索模式） */}
      {mode === 'crm' && (
        <Button
          type="primary"
          round
          icon={<Plus />}
          className="crm-fab"
          onClick={() => navigate('/crm/add')}
        />
      )}
    </div>
  );
}
