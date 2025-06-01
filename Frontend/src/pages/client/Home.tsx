import React, { useEffect, useState, useRef } from 'react';
import './Home.css';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { useInView } from 'react-intersection-observer';
import { message } from 'antd';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { useNavigate } from 'react-router-dom';

const heroImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
];

const FAVORITE_PRODUCT_IDS = [
  '680dbb6b6442b211f42a831c',
  '6802388c61cabb678ca1f61e',
  '680238ba61cabb678ca1f621',
  '6805f78b3631717f34180815',
  '6805f95c3631717f34180818',
  '6805f9923631717f3418081c',
  '6805f9da3631717f34180820',
  '6805fb672396c9c008004c89',
];

const popularDishes = [
  {
    img: '/public/uploads/thit-ba-roi-luoc-nha-hang-com-nieu-viet-nam-jpg.webp',
    name: 'Ba Rọi Heo Gia Lai luộc',
    desc: 'Thịt ba rọi luộc không chỉ ngon miệng mà còn giàu chất dinh dưỡng. Thịt lợn cung cấp protein, chất béo và các loại khoáng chất cần thiết cho cơ thể. Và tạo cảm giác ngon miệng hơn rất phổ biến tại Nhà Hàng Cơm Niêu Việt Nam.'
  },
  {
    img: '/public/uploads/Canh-Cua-Nha-Hang-Com-Nieu-2024-jpg.webp',
    name: 'Canh Cua Cà Pháo',
    desc: 'Canh Cua thường được ăn kèm với cơm trắng nóng hổi và được trang trí bằng rau thơm như ngò gai và rau mùi. Hương vị đặc trưng của Canh Cua không chỉ đến từ thịt cua ngọt ngon mà còn từ hương vị tự nhiên của rau củ và nước luộc cua.'
  },
  {
    img: '/public/uploads/Ca-Kho-Lang-Vu-Dai-Com-Nieu-Viet-Nam-2342342345-jpg.webp',
    name: 'Cá Kho Làng Vũ Đại',
    desc: 'Mùi thơm nồng của cá kho khiến ai cũng phải ngất ngây và muốn thưởng thức ngay lập tức. Món ăn này thường được dùng kèm với cơm trắng, tạo nên một bữa ăn truyền thống ngon miệng và đầy dinh dưỡng.'
  },
  {
    img: '/public/uploads/lau-ga-la-giang-nha-hang-com-nieu-jpg.webp',
    name: 'Lẩu Gà Lá Giang',
    desc: 'Lẩu gà nấu lá giang tại Nhà Hàng Cơm Niêu Việt Nam là một món ăn dân dã nhưng vô cùng hấp dẫn, được nhiều người yêu thích. Với nguyên liệu chính là thịt gà và các loại lá giang thơm ngon, lẩu gà nấu lá giang mang đến một hương vị thanh mát, ngọt ngào và vô cùng bổ dưỡng.'
  }
];

const specialCategories = [
  {
    title: 'Món Lẩu',
    img: '/public/uploads/lau-ga-la-giang-nha-hang-com-nieu-jpg.webp',
    ids: ['680dec691f5d618ca101a3b8', '680238ba61cabb678ca1f621', '680decaa1f5d618ca101a3bc']
  },
  {
    title: 'Món Cá',
    img: '/public/uploads/Ca-Kho-Lang-Vu-Dai-Com-Nieu-Viet-Nam-2342342345-jpg.webp',
    ids: ['6805f9923631717f3418081c', '6805f78b3631717f34180815', '680dbb6b6442b211f42a831c']
  },
  {
    title: 'Món Rau',
    img: '/public/uploads/cai-mam-da-sapa-luoc-cham-trung-2024-jpg.webp',
    ids: ['680ded381f5d618ca101a3c0', '6805fb982396c9c008004c8d', '6802388c61cabb678ca1f61e']
  }
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

const Home: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const introRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const favoriteRef = useRef<HTMLDivElement>(null);
  const [showFavorite, setShowFavorite] = useState(false);
  const [dishRef, inView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const [specialProducts, setSpecialProducts] = useState<{[key:string]: Product[]}>({});
  const [specialRef, specialInView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const [activeTab, setActiveTab] = useState(0);
  const [_cartCount, setCartCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('cartCount')) || 0;
    } catch {
      return 0;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (introRef.current) {
        const rect = introRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          setShowIntro(true);
        }
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Fetch favorite products
    const fetchProducts = async () => {
      try {
        const results = await Promise.all(
          FAVORITE_PRODUCT_IDS.map(id => productService.getById(id))
        );
        setFavoriteProducts(results.map(r => r.data).filter((p): p is Product => Boolean(p)));
      } catch (e) {
        // handle error
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Scroll effect for favorite section
    const onScroll = () => {
      if (favoriteRef.current) {
        const rect = favoriteRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          setShowFavorite(true);
        }
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Fetch special products
    const fetchSpecial = async () => {
      const result: {[key:string]: Product[]} = {};
      for (const cat of specialCategories) {
        const prods = await Promise.all(cat.ids.map(id => productService.getById(id)));
        result[cat.title] = prods.map(r => r.data).filter((p): p is Product => Boolean(p));
      }
      setSpecialProducts(result);
    };
    fetchSpecial();
  }, []);

  useEffect(() => {
    const syncCartCount = () => {
      try {
        setCartCount(Number(localStorage.getItem('cartCount')) || 0);
      } catch {
        setCartCount(0);
      }
    };
    window.addEventListener('storage', syncCartCount);
    return () => window.removeEventListener('storage', syncCartCount);
  }, []);

  const handleAddToCart = (product: Product, e?: React.MouseEvent<HTMLButtonElement>) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    try {
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
      const idx = cartItems.findIndex((item: any) => item.product && item.product._id === product.id);
      if (idx > -1) {
        cartItems[idx].quantity += 1;
      } else {
        cartItems.push({ product: { _id: product.id, name: product.name, price: product.price, image: product.image }, quantity: 1 });
      }
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
      localStorage.setItem('cartCount', String(count));
      window.dispatchEvent(new Event('storage'));
      message.success('Đã thêm vào giỏ hàng!', 1.5);
    } catch (error) {
      message.error('Thêm vào giỏ hàng thất bại!');
    }
  };

  return (
    <div className="home-page">
      <section
        className="hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url(${heroImages[current]})`,
        }}
      >
        <div className="hero-content">
          <h1>Chào mừng đến với Nhà hàng ICE</h1>
          <p>Trải nghiệm ẩm thực tuyệt vời với những món ăn đặc sắc</p>
        </div>
      </section>

      <section className="intro-section">
        <div className={`intro-container ${showIntro ? 'show' : ''}`} ref={introRef}>
          <div className="intro-text">
            <h2>
              Cá Kho Làng Vũ Đại <span className="intro-highlight">CHỈ TỪ 250.000đ</span> & Hương vị trọn tình quê!
            </h2>
            <h3>Nhà Hàng Ice Restaurant</h3>
            <p>
              Nhà hàng ICE còn là địa điểm lý tưởng cho các buổi tiệc, họp mặt, hay các sự kiện đặc biệt khác. Chúng tôi tự tin rằng sự chuyên nghiệp và tận tâm của đội ngũ nhân viên cùng không gian sang trọng sẽ làm hài lòng mọi khách hàng.
            </p>
            <a href="/menu" className="intro-menu-btn">MENU HÔM NAY</a>
          </div>
          <div className="intro-image">
            <img src="public/uploads/Banner-Ca-Kho-Lang-Vu-Dai-jpg.webp" alt="Cá kho làng Vũ Đại" />
          </div>
        </div>
        <div className="service-boxes">
          <div className="service-box">
            <img src="public/uploads/cake-icon.png" alt="Gọi ngay" className="service-icon" />
            <div>
              <div className="service-title">Gọi Ngay Đặt Bàn:</div>
              <div className="service-desc">Phục vụ: 8h-22h</div>
            </div>
            <div className="service-right">24/7</div>
          </div>
          <div className="service-box">
            <img src="public/uploads/icon-phone.png" alt="Combo trọn vị" className="service-icon" />
            <div>
              <div className="service-title">Combo Trọn Vị</div>
              <div className="service-desc">Đến ngay hôm nay !</div>
            </div>
            <div className="service-right">
              <div>Chỉ từ</div>
              <div className="service-price">500.000<sup>đ</sup></div>
            </div>
          </div>
        </div>
      </section>

      <section className="favorite-section">
        <div className={`favorite-header ${showFavorite ? 'show' : ''}`} ref={favoriteRef}>
          <h2>Thực Khách Ưa Thích</h2>
          <p>Mời quý khách đến dùng bữa tại Nhà Hàng Ice, thưởng thức ẩm thực miền Bắc giản dị mộc mạc, ngon miệng khó cưỡng.</p>
        </div>
        <div className={`favorite-list ${showFavorite ? 'show' : ''}`}> 
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <div className="favorite-row" key={rowIdx}>
              {favoriteProducts.slice(rowIdx * 2, rowIdx * 2 + 2).map(product => (
                <div className="favorite-item" key={product.id} onClick={() => navigate(`/menu/${removeVietnameseTones(product.name)}-${product.id}`)} style={{cursor: 'pointer'}}>
                  <div className="favorite-img-wrap">
                    <img src={product.image?.startsWith('http') ? product.image : `${import.meta.env.VITE_API_URL}/${product.image?.replace(/^\/+/,'')}`} alt={product.name} />
                  </div>
                  <div className="favorite-info">
                    <div className="favorite-title-price">
                      <span className="favorite-title">{product.name}</span>
                      <span className="favorite-price">{product.price?.toLocaleString()} đ</span>
                    </div>
                    <div className="favorite-desc">{product.description && product.description.length > 90 ? product.description.slice(0, 90) + '...' : product.description}</div>
                    <button className="favorite-add-btn" onClick={e => { e.stopPropagation(); handleAddToCart(product, e); }}>Thêm vào giỏ hàng</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="promo-section">
        <div className="promo-bg">
          <div className="promo-content">
            <div className="promo-texts">
              <div className="promo-title">ĐĂNG KÝ NGAY ĐỂ NHẬN ƯU ĐÃI:</div>
              <div className="promo-sub">TƯ VẤN ĐẶT BÀN:</div>
              <div className="promo-desc">Tại thành phố Hồ Chí Minh, nhà hàng Ice được thiết kế sang trọng với không gian rộng rãi và thoải mái, mang lại cảm giác thân thiện và gần gũi. Với sự kết hợp hoàn hảo giữa truyền thống và hiện đại, chúng tôi mang đến một trải nghiệm ẩm thực độc đáo và tinh tế.</div>
              <div className="promo-actions">
                <div className="promo-call">GỌI NGAY: 094 1855 234</div>
                <a className="promo-btn" href="/dat-ban">Đặt bàn ngay</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="popular-section" ref={dishRef}>
        <div className={`popular-container${inView ? ' show' : ''}`}>
          <h2 className="popular-title">MÓN ĂN PHỔ BIẾN</h2>
          <p className="popular-desc">Thực đơn của chúng tôi đa dạng với những món ăn đặc trưng như cơm niêu, cánh gà chiên nước mắm, cá kho tộ, bò kho, và nhiều món khác đều được chế biến từ những nguyên liệu tươi ngon nhất. Chúng tôi cam kết mang đến khẩu vị tuyệt vời và hương vị đích thực của ẩm thực miền Nam.</p>
          <div className="popular-grid">
            {popularDishes.map((dish, idx) => (
              <div className="popular-item" key={idx}>
                <img className="popular-img" src={dish.img} alt={dish.name} />
                <div className="popular-name">{dish.name}</div>
                <div className="popular-text">{dish.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="special-section" ref={specialRef}>
        <div className={`special-container${specialInView ? ' show' : ''}`}>
          <h2 className="special-title">MÓN NGON ĐẶC BIỆT</h2>
          <p className="special-desc">Với tầm nhìn trở thành điểm đến ẩm thực hàng đầu, nhà hàng Ice cam kết duy trì và phát triển để mang đến cho quý khách những trải nghiệm ẩm thực tuyệt vời nhất. Hãy đến và tận hưởng hương vị độc đáo của ẩm thực Việt Nam tại nhà hàng chúng tôi!</p>
          <div className="special-tabs">
            {specialCategories.map((cat, idx) => (
              <button
                key={cat.title}
                className={`special-tab${activeTab === idx ? ' active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                {cat.title}
              </button>
            ))}
          </div>
          <div className="special-tab-content-row">
            <div className="special-img-wrap">
              <img src={specialCategories[activeTab].img} alt={specialCategories[activeTab].title} />
            </div>
            <div className="special-products">
              {specialProducts[specialCategories[activeTab].title]?.map(prod => (
                <div className="special-product" key={prod.id} onClick={() => navigate(`/menu/${removeVietnameseTones(prod.name)}-${prod.id}`)} style={{cursor: 'pointer'}}>
                  <img className="special-prod-img" src={prod.image?.startsWith('http') ? prod.image : `${import.meta.env.VITE_API_URL}/${prod.image?.replace(/^\/+/,'')}`} alt={prod.name} />
                  <div className="special-prod-info">
                    <span className="special-prod-name">{prod.name}</span>
                    <span className="special-prod-price">{prod.price?.toLocaleString()} đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
};

export default Home; 