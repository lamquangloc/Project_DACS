import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import './AboutPage.css';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

const dishes = [
  {
    name: 'Cá Kho Làng Vũ Đại',
    price: 'Giá Chỉ Từ 250.000đ',
    sub: '& đậm vị hương quê.',
    desc: 'Cá Kho Làng Vũ Đại không chỉ là một món ăn ngon mà còn là biểu tượng của văn hóa ẩm thực đặc trưng của người dân miền Tây sông nước. Nó đã trở thành một phần không thể thiếu trong bữa ăn hàng ngày của người Việt Nam và cũng là một món ăn được du khách quốc tế yêu thích khi đến thăm đất nước này.',
    image: '/public/uploads/Ca-Kho-Lang-Vu-Dai-Com-Nieu-Viet-Nam-2342342345-jpg.webp',
    priceColor: '#e53935',
  },
  {
    name: 'Thịt Ba Rọi Luộc',
    price: 'Giá Chỉ Từ 160.000đ',
    sub: '& đậm vị hương quê.',
    desc: 'Thịt ba rọi luộc không chỉ ngon miệng mà còn giàu chất dinh dưỡng. Thịt lợn cung cấp protein, chất béo và các loại khoáng chất cần thiết cho cơ thể. Ngoài ra, việc ăn kèm với rau sống cũng giúp cân bằng dinh dưỡng và tạo cảm giác ngon miệng hơn.',
    image: '/public/uploads/thit-ba-roi-luoc-nha-hang-com-nieu-viet-nam-jpg.webp',
    priceColor: '#e53935',
  },
  {
    name: 'Canh Cua',
    price: 'Giá Chỉ Từ 110.000đ',
    sub: '& hương vị khó cưỡng.',
    desc: 'Món Canh Cua không chỉ là một món ăn ngon mà còn là biểu tượng của sự sum họp, ấm cúng và tình thân thuộc trong gia đình Việt Nam. Đây là một món ăn có giá trị văn hóa lớn và luôn làm say đắm lòng người thưởng thức.',
    image: '/public/uploads/Canh-Cua-Nha-Hang-Com-Nieu-2024-jpg.webp',
    priceColor: '#e53935',
  },
];

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [infoRef, infoInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [mainRef, mainInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    setAnimating(false);
    const startAnim = setTimeout(() => setAnimating(true), 50);
    const timer = setTimeout(() => {
      setAnimating(false);
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % dishes.length);
        setAnimating(true);
      }, 400);
    }, 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(startAnim);
    };
  }, [activeIdx]);

  const dish = dishes[activeIdx];

  return (
    <div className="about-page-root">
      <div className="about-banner" style={{ backgroundImage: 'url(https://comnieuvietnam.vn/wp-content/uploads/2024/01/Banner-Nha-Hang-Com-Nieu-ssasd-jpg.webp)' }}>
        <div className="about-carousel-row">
          <div className={`about-carousel-text ${animating ? 'about-animate-in' : 'about-animate-out'}`}>  
            <div className="about-carousel-title-group">
              <div className="about-carousel-title">{dish.name}</div>
              <div className="about-carousel-price" style={{ color: dish.priceColor }}>{dish.price}</div>
              <div className="about-carousel-sub">{dish.sub}</div>
              <div className="about-carousel-underline" />
            </div>
            <div className={`about-carousel-desc ${animating ? 'about-desc-animate-in' : 'about-desc-animate-out'}`}>{dish.desc}</div>
          </div>
          <div className={`about-carousel-img-wrap ${animating ? 'about-animate-in' : 'about-animate-out'}`}>  
            <img className="about-carousel-img" src={dish.image} alt={dish.name} />
          </div>
        </div>
      </div>
      <div className="about-section">
        <div className="about-info-row">
          <div ref={infoRef} className={`about-info-box${infoInView ? ' about-animate-slide-up' : ''}`}>
            <h4>Thời Gian Phục Vụ</h4>
            <ul><li><b>24/7:</b> 8h - 22h</li></ul>
            <h4>Địa Chỉ Gần Sân Bay:</h4>
            <p>Số 123, Đường ABC, Phường 123, Quận Tân Bình , Hồ Chi Minh City</p>
            <button className="about-book-btn" onClick={() => navigate('/dat-ban')}>Đặt Bàn</button>
          </div>
          <div ref={mainRef} className={`about-info-box about-info-main${mainInView ? ' about-animate-slide-down' : ''}`}>
            <h2>NHÀ HÀNG ICE</h2>
            <p>Nhà Hàng Ice là một địa điểm ẩm thực tuyệt vời để trải nghiệm ẩm thực truyền thống của Việt Nam. Với không gian thoáng đãng, trang trí đẹp mắt và bữa ăn ngon miệng, nhà hàng cơm niêu hứa hẹn mang đến cho khách hàng một trải nghiệm ẩm thực đậm chất văn hóa.</p>
            <div className="about-info-split">
              <div>
                <div className="about-info-split-bar" />
                <h3>HƯƠNG BẮC CHUẨN VỊ</h3>
                <p>Ngoài cơm niêu, nhà hàng cũng cung cấp một loạt các món ăn truyền thống khác, từ các món xào, rim, luộc đến các món chay phục vụ nhu cầu ẩm thực đa dạng của khách hàng. Đội ngũ đầu bếp tại Nhà Hàng Ice luôn chú trọng vào việc sử dụng nguyên liệu tươi ngon và kỹ thuật nấu ăn tinh tế, đảm bảo mỗi món ăn đều mang đậm hương vị truyền thống và dinh dưỡng.</p>
              </div>
              <div>
                <div className="about-info-split-bar" />
                <h3>KHÔNG GIAN ẤM CÚNG</h3>
                <p>Khi bước vào Nhà Hàng Ice, khách sẽ được chào đón bởi không gian trang trí mang phong cách truyền thống, tạo cảm giác ấm cúng và thân thiện. Từ bàn ghế gỗ đơn giản nhưng tinh tế đến các chi tiết trang trí như đèn lồng, tranh treo tường và hoa tươi, mọi thứ đều tạo nên một bức tranh văn hóa tinh tế tại nhà hàng.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default AboutPage; 