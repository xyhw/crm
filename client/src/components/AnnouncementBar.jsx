import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { api } from '../api';
import { timeAgo } from '../constants';

export default function AnnouncementBar() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.announcements()
      .then((res) => setList(res.list || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % list.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [list.length]);

  if (list.length === 0) return null;

  const item = list[current];
  const timeText = timeAgo(item.created_at);

  return (
    <div className="announcement-card" onClick={() => navigate(`/announcement/${item.id}`)}>
      <div className="announcement-card__icon">
        <Icon name="bullhorn-o" size={20} />
      </div>
      <div className="announcement-card__body">
        <div className="announcement-card__title-row">
          <span className="announcement-card__badge">公告</span>
          <span className="announcement-card__title text-ellipsis">{item.title}</span>
        </div>
        {timeText && <div className="announcement-card__time">{timeText}</div>}
      </div>
      <div className="announcement-card__side">
        <span className="announcement-card__more">更多 ›</span>
        {list.length > 1 && (
          <span className="announcement-card__count">
            {current + 1}/{list.length}
          </span>
        )}
      </div>
    </div>
  );
}
