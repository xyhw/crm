import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toast } from 'react-vant';
import { api } from '../api';
import { formatDateTime } from '../constants';
import PageNavBar from '../components/PageNavBar';

export default function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.announcementDetail(id)
      .then(setDetail)
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">公告不存在</div>;

  const isVideo = detail.media_type === 'video';
  const isImage = detail.media_type === 'image' || detail.media_type === 'mixed';

  return (
    <div className="page">
      <PageNavBar title="公告详情" onClickLeft={() => navigate(-1)} />

      <div className="announcement-detail">
        <h2 className="announcement-detail__title">{detail.title}</h2>
        <div className="announcement-detail__time">{formatDateTime(detail.created_at)}</div>

        {isImage && detail.media_url && (
          <img className="announcement-detail__media" src={detail.media_url} alt="公告配图" />
        )}

        {isVideo && detail.media_url && (
          <video className="announcement-detail__media" src={detail.media_url} controls playsInline />
        )}

        <div className="announcement-detail__content">{detail.content}</div>

        {detail.link_url && (
          <a className="announcement-detail__link" href={detail.link_url} target="_blank" rel="noreferrer">
            查看相关链接 ›
          </a>
        )}
      </div>
    </div>
  );
}
