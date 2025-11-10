import React, { useState, useEffect } from 'react';
import './MenuPage.css';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';

const CATEGORY_IDS = [
  '6805deae0d9964f846624745', // Khai vị
  '6805ded60d9964f846624746', // Canh
  '6802387061cabb678ca1f61c', // Rau
  '6805defa0d9964f846624747', // Hải sản
  '6802381861cabb678ca1f617', // Gà
  '6805df420d9964f846624748', // Bò
  '6805df620d9964f846624749', // Heo
  '6805df7e0d9964f84662474a', // Cơm
  '6802383e61cabb678ca1f619', // Lẩu
  '6805dfb70d9964f84662474b', // Thêm
];

function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch categories từ backend và lọc đúng 10 id, kiểm tra cats là mảng
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        let cats = [];
        if (Array.isArray(data.categories)) {
          cats = data.categories;
        } else if (data.data && Array.isArray(data.data.categories)) {
          cats = data.data.categories;
        }
        console.log('CATEGORIES FROM API:', cats);
        const filtered = CATEGORY_IDS
          .map(id => cats.find((c: any) => c.id === id))
          .filter(Boolean);
        console.log('FILTERED CATEGORIES:', filtered);
        setCategories(filtered);
        if (filtered.length > 0) setSelectedCat(filtered[0]);
      });
  }, []);

  // Fetch products khi chọn danh mục
  useEffect(() => {
    if (!selectedCat) return;
    setLoading(true);
    fetch(`/api/products?categoryId=${selectedCat.id}`)
      .then(res => res.json())
      .then(data => {
        let prods = [];
        if (data.data && Array.isArray(data.data.items)) {
          prods = data.data.items;
        } else if (data.data && Array.isArray(data.data.products)) {
          prods = data.data.products;
        } else if (Array.isArray(data.products)) {
          prods = data.products;
        }
        console.log('PRODUCTS FOR CATEGORY', selectedCat, prods);
        setProducts(prods);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedCat]);

  const handleAddToCart = async (product: any, e?: React.MouseEvent<HTMLButtonElement>) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
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
      cartItems[idx].quantity += 1;
    } else {
      cartItems.push({ product: { _id: product.id, name: product.name, price: product.price, image: product.image }, quantity: 1 });
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    
    // ✅ Sync cart lên server
    const { syncCartToServer } = await import('../../utils/cartSync');
    syncCartToServer(cartItems).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
    
    message.success('Đã thêm vào giỏ hàng!', 1.5);
  };

  return (
    <div className="menu-page">
      {/* Danh mục */}
      <div className="menu-categories">
        {categories.map((cat: any) => (
          <div
            key={cat.id || cat._id}
            className={`menu-category${(cat.id || cat._id) === (selectedCat?.id || selectedCat?._id) ? ' active' : ''}`}
            onClick={() => setSelectedCat(cat)}
          >
            <img src={cat.image} alt={cat.name} className="menu-category-img" />
            <div className="menu-category-name">{cat.name?.toUpperCase()}</div>
            {(cat.id || cat._id) === (selectedCat?.id || selectedCat?._id) && <div className="menu-category-underline" />}
          </div>
        ))}
      </div>
      {/* Gạch ngang đen */}
      <div className="menu-divider" />
      {/* Thông tin danh mục */}
      {selectedCat && (
        <div className="menu-category-info">
          <div className="menu-category-title">Các {selectedCat.name}</div>
          <div className="menu-category-name-red">
            <span className="menu-category-red-line" />
            <span className="menu-category-red-text">{selectedCat.name?.toUpperCase()}</span>
            <span className="menu-category-red-line" />
          </div>
          <div className="menu-category-desc">{selectedCat.desc || selectedCat.description}</div>
        </div>
      )}
      {/* Danh sách sản phẩm */}
      <div className="menu-products">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>Đang tải sản phẩm...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>Không có sản phẩm nào.</div>
        ) : (
          <div className="menu-products-grid">
            {products.map((prod, idx) => (
              <div className="menu-product-card" key={prod._id || idx} onClick={() => navigate(`/menu/${removeVietnameseTones(prod.name)}-${prod._id || prod.id}`)} style={{cursor: 'pointer'}}>
                <img src={prod.image} alt={prod.name} className="menu-product-img" />
                <div className="menu-product-info">
                  <div className="menu-product-header">
                    <div className="menu-product-name">{prod.name}</div>
                    <div className="menu-product-price">{prod.price?.toLocaleString()} đ</div>
                  </div>
                  <div className="menu-product-desc">
                    {prod.description && prod.description.length > 80
                      ? prod.description.slice(0, 80) + '...'
                      : prod.description || ''}
                  </div>
                  <button className="menu-add-cart-btn" onClick={e => { e.stopPropagation(); handleAddToCart(prod, e); }}>
                    Thêm giỏ hàng
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage; 