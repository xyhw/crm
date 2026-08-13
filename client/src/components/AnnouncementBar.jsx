import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

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

  return (
    <div className="announcement-bar" onClick={() => navigate(`/announcement/${item.id}`)}>
      <span className="announcement-bar__badge">公告</span>
      <span className="announcement-bar__text text-ellipsis">{item.title}</span>
      <span className="announcement-bar__more">更多 ›</span>
    </div>
  );
}
