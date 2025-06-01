import React, { useEffect, useState } from 'react';
import './Footer.css';
import { categoryService } from '../../services/categoryService';
import { Category } from '../../types/category';

const Footer: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getAll(1, 100);
        if (res.status === 'success' && res.data?.categories) {
          setCategories(res.data.categories);
        }
      } catch (error) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  return (
    <>
      <section className="prefooter-section">
        <div className="prefooter-content">
          <img className="prefooter-icon-left" src="/public/uploads/icon-dat-ban-nha-hang-com-nieu.png" alt="icon đặt bàn" />
          <div className="prefooter-texts">
            <div className="prefooter-title">Phục Vụ: 8h - 22h</div>
            <div className="prefooter-desc">Liên hệ đặt bàn:</div>
            <div className="prefooter-phone">012 3456 789</div>
            <a className="prefooter-btn" href="/dat-ban">Đặt bàn</a>
          </div>
          <img className="prefooter-img-right" src="https://comnieuvietnam.vn/wp-content/uploads/2016/12/Ca-Kho-Lang-Vu-Dai-Com-Nieu-Viet-Nam.png" alt="Cá kho làng Vũ Đại" />
        </div>
      </section>
      <footer className="footer-custom">
        <div className="footer-row">
          {/* Left: Thông tin liên hệ */}
          <div className="footer-col contact-info">
            <div className="footer-hotline">
              <span className="footer-label">Hotline:</span> <span className="footer-value">012 3456 789</span>
            </div>
            <div className="footer-address">
              <span className="footer-label">Địa chỉ:</span> <span className="footer-value">Số 11, Đường Võ Văn Ngân, Hồ Chí Minh City</span><br />
            </div>
          </div>
          {/* Center: Logo và tên nhà hàng */}
          <div className="footer-col center-col">
            <img src="/public/uploadsLogo/logo_restaurant.png" alt="Logo" className="footer-logo" />
            <div className="footer-title">
              <span className="footer-title-main">ICE RESTAURANT</span>
            </div>
            <div className="footer-title-slogan">ICE RESTAURANT</div>
            <div className="footer-socials">
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
              <a href="#"><i className="fab fa-youtube"></i></a>
              <a href="#"><i className="fab fa-telegram"></i></a>
            </div>
          </div>
          {/* Right: Danh mục menu và giờ mở cửa */}
          <div className="footer-col menu-col">
            <div className="footer-menu-title">Danh Mục Menu</div>
            <div className="footer-menu-list">
              {categories.map((cat) => (
                <span key={cat.id} className="footer-menu-item">{cat.name}</span>
              ))}
            </div>
            <div className="footer-open-label">Mở Cửa: <span>10h – 22h (24/7)</span></div>
            <div className="footer-desc">Không gian thoáng mát với thiết kế mộc mạc.</div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer; 