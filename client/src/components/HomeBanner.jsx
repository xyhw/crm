import { useEffect, useState } from 'react';
import { Swiper } from 'react-vant';
import { api } from '../api';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    api.banners()
      .then((res) => setBanners(res.list || []))
      .catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="home-banner">
      <Swiper autoplay={3000} indicator={banners.length > 1}>
        {banners.map((b) => (
          <Swiper.Item key={b.id}>
            <div
              className="home-banner__item"
              onClick={() => {
                if (b.link_url) window.location.href = b.link_url;
              }}
            >
              <img src={b.image_url} alt={b.title} />
            </div>
          </Swiper.Item>
        ))}
      </Swiper>
    </div>
  );
}