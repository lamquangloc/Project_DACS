import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import './MenuProductDetailPage.css';

interface ComboProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  description?: string;
}

interface ComboDetail {
  id: string;
  name: string;
  image: string;
  price: number;
  description?: string;
  items: { product: ComboProduct; quantity: number }[];
}



const ComboDetailPage: React.FC = () => {
  const { slug } = useParams();
  const [combo, setCombo] = useState<ComboDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  // Tách id từ slug: id là ObjectId (24 ký tự hex)
  const id = slug?.match(/[a-f0-9]{24}$/)?.[0];

  useEffect(() => {
    if (!id) return;
    fetch(`/api/combos/${id}`)
      .then(res => res.json())
      .then(data => setCombo(data.data))
      .catch(() => setCombo(null));
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleAddToCart = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (!combo) return;
    let cartItems = [];
    try {
      cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch { cartItems = []; }
    const idx = cartItems.findIndex((item: any) => item.combo && (item.combo.id === combo.id || item.combo._id === combo.id));
    if (idx > -1) {
      cartItems[idx].quantity += quantity;
    } else {
      cartItems.push({ combo: { ...combo, _id: combo.id }, quantity });
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    
    // ✅ Sync cart lên server
    import('../../utils/cartSync').then(({ syncCartToServer }) => {
      syncCartToServer(cartItems);
    }).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
    
    message.success('Đã thêm combo vào giỏ hàng!', 1.5);
    setQuantity(1);
  };

  if (!combo) return <div>Không tìm thấy combo hoặc có lỗi dữ liệu.</div>;

  return (
    <div className="product-detail-page">
      <h1 className="product-title">{combo.name}</h1>
      <div className="product-info-section">
        <img src={combo.image} alt={combo.name} className="product-image" />
        <div className="product-info">
          <div className="product-price" style={{ color: 'red', fontWeight: 'bold', fontSize: 24 }}>
            {combo.price?.toLocaleString()} đ
          </div>
          <div className="product-desc">{combo.description}</div>
          <div className="product-categories">
            <b>Chi tiết combo:</b>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {combo.items?.map((item, idx) => (
                <li key={item.product.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 18, margin: '18px 0', background: '#fafafa', borderRadius: 10, padding: 10 }}>
                  <img src={item.product.image} alt={item.product.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginRight: 12 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>{item.product.name}</div>
                    <div style={{ color: '#666', fontSize: 15 }}>{item.product.description}</div>
                    <div style={{ color: '#e53935', fontWeight: 500, marginTop: 4 }}>{item.product.price?.toLocaleString()} đ</div>
                    <div style={{ color: '#1976d2', fontWeight: 500, marginTop: 2 }}>Số lượng: {item.quantity}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              style={{ width: 48, height: 38, padding: '0 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16, textAlign: 'center', boxSizing: 'border-box' }}
            />
            <button
              className="add-to-cart-btn"
              style={{ padding: '8px 18px', fontSize: 16, minWidth: 120, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={handleAddToCart}
            >
              Thêm vào giỏ hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboDetailPage; 