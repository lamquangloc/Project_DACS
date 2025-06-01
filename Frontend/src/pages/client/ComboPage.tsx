import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import './ComboPage.css';
import './MenuPage.css';

function getImageUrl(img: string) {
  if (!img) return '/placeholder-product.jpg';
  if (img.startsWith('http')) return img;
  return img.startsWith('/') ? img : '/' + img;
}

function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

const ComboPage: React.FC = () => {
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch('/api/combos')
      .then(res => res.json())
      .then(data => {
        let items = [];
        if (data.data && Array.isArray(data.data.combos)) {
          items = data.data.combos;
        } else if (Array.isArray(data.combos)) {
          items = data.combos;
        } else if (Array.isArray(data.items)) {
          items = data.items;
        }
        setCombos(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddToCart = (combo: any, e?: React.MouseEvent<HTMLButtonElement>) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (e) {
      const btn = e.currentTarget;
      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;
      circle.classList.add('ripple');
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
      circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 500);
    }
    let cartItems = [];
    try {
      cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch { cartItems = []; }
    const idx = cartItems.findIndex((item: any) => item.combo && (item.combo.id === combo.id || item.combo._id === combo.id));
    if (idx > -1) {
      cartItems[idx].quantity += 1;
    } else {
      cartItems.push({ combo: { ...combo, _id: combo.id, id: combo.id, name: combo.name, image: combo.image, price: combo.price }, quantity: 1 });
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    message.success('Đã thêm combo vào giỏ hàng!', 1.5);
  };

  return (
    <div className="combo-page">
      <div className="combo-title">Các loại Combo</div>
      <div className="combo-main-title-row">
        <span className="combo-bar left" />
        <span className="combo-main-title">COMBO</span>
        <span className="combo-bar right" />
      </div>
      <div className="combo-desc">
        Combo là sự kết hợp hoàn hảo giữa nhiều món ăn đặc sắc, giúp bữa ăn của bạn trở nên phong phú, tiết kiệm và tiện lợi hơn. Các combo được thiết kế để phù hợp cho nhóm bạn, gia đình hoặc các buổi tiệc nhỏ, mang đến trải nghiệm ẩm thực đa dạng và hấp dẫn chỉ trong một lần chọn.
      </div>
      <div className="combo-products">
        <div className="menu-products">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>Đang tải combo...</div>
          ) : combos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>Không có combo nào.</div>
          ) : (
            <div className="menu-products-grid">
              {combos.map((combo, idx) => (
                <div
                  className="menu-product-card"
                  key={combo._id || combo.id || idx}
                  onClick={() => navigate(`/combo/${removeVietnameseTones(combo.name)}-${combo._id || combo.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={getImageUrl(combo.image)} alt={combo.name} className="menu-product-img" />
                  <div className="menu-product-info">
                    <div className="menu-product-header">
                      <div className="menu-product-name">{combo.name}</div>
                      <div className="menu-product-price">{combo.price?.toLocaleString()} đ</div>
                    </div>
                    <div className="menu-product-desc">
                      {combo.description && combo.description.length > 80
                        ? combo.description.slice(0, 80) + '...'
                        : combo.description || ''}
                    </div>
                    <button
                      className="menu-add-cart-btn"
                      onClick={e => { e.stopPropagation(); handleAddToCart(combo, e); }}
                    >
                      Thêm giỏ hàng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComboPage; 