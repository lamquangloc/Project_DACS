import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MenuProductDetailPage.css';
import { message } from 'antd';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  categories?: { category: { name: string } }[];
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

const MenuProductDetailPage: React.FC = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  // Tách id từ slug: id là ObjectId (24 ký tự hex)
  const id = slug?.match(/[a-f0-9]{24}$/)?.[0];

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data.data))
      .catch(() => setProduct(null));
    // Lấy 8 sản phẩm random
    fetch('/api/products/random?limit=8')
      .then(res => res.json())
      .then(data => {
        if (!data?.data?.products || !Array.isArray(data.data.products)) {
          setSuggestions([]);
          return;
        }
        setSuggestions(data.data.products);
      })
      .catch(() => setSuggestions([]));
  }, [id]);

  // Scroll lên đầu trang khi id thay đổi
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleAddToCart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    // Hiệu ứng ripple
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
    // Chỉ tìm trong các sản phẩm (không phải combo)
    const idx = cartItems.findIndex((item: any) => item.product && item.product._id === product.id);
    if (idx > -1) {
      cartItems[idx].quantity += quantity;
    } else {
      cartItems.push({ product: { _id: product.id, name: product.name, price: product.price, image: product.image }, quantity });
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
    
    message.success('Đã thêm vào giỏ hàng!', 1.5);
    setQuantity(1);
  };

  if (!product) return <div>Không tìm thấy sản phẩm hoặc có lỗi dữ liệu.</div>;

  const visibleSuggestions = suggestions.slice(carouselIndex, carouselIndex + 4);

  return (
    <div className="product-detail-page">
      <h1 className="product-title">{product.name}</h1>
      <div className="product-info-section">
        <img src={product.image} alt={product.name} className="product-image" />
        <div className="product-info">
          <div className="product-price" style={{ color: 'red', fontWeight: 'bold', fontSize: 24 }}>
            {product.price?.toLocaleString()} đ
          </div>
          <div className="product-desc">{product.description}</div>
          <div className="product-categories">
            Danh mục: {product.categories?.map(cat => cat.category?.name).join(', ')}
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
      {/* Phần review sẽ bổ sung sau */}
      <div className="product-suggestion-carousel">
        <h2>Món Ngon Khác</h2>
        <div className="carousel-list" >
          {visibleSuggestions.map(item => (
            <div key={item.id} className="carousel-item" onClick={() => navigate(`/menu/${removeVietnameseTones(item.name)}-${item.id}`)}>
              <img src={item.image} alt={item.name} />
              <div className="carousel-category">{item.categories?.map(cat => cat.category?.name).join(', ')}</div>
              <div className="carousel-name">{item.name}</div>
              <div className="carousel-price">{item.price?.toLocaleString()} đ</div>
            </div>
          ))}
        </div>
        <div className="carousel-controls">
          <button onClick={() => setCarouselIndex(i => Math.max(0, i - 1))} disabled={carouselIndex === 0}>
            &#x2039;
          </button>
          <button onClick={() => setCarouselIndex(i => Math.min(suggestions.length - 4, i + 1))} disabled={carouselIndex >= suggestions.length - 4}>
            &#x203A;
          </button>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default MenuProductDetailPage;
