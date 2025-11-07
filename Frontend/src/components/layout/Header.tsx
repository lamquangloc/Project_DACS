import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Select, Input, Dropdown, Badge, Spin } from 'antd';
import { ShoppingCartOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import './Header.css';
import { categoryService } from '../../services/categoryService';
import { productService } from '../../services/productService';
import { Category } from '../../types/category';
import { Product } from '../../types/product';
import { getImageUrl } from '../../utils/image';

const { Option } = Select;


function highlightKeyword(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<u>$1</u>');
}

const Header: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('cartCount')) || 0;
    } catch {
      return 0;
    }
  });
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(window.scrollY);

  // Search states
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const searchInputRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceTimeout = useRef<any>(null);
  const location = useLocation();

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

  useEffect(() => {
    const handleStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user') || 'null'));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > lastScrollY.current && currentY > 80) {
            setShowHeader(false); // Kéo xuống ẩn
          } else {
            setShowHeader(true); // Kéo lên hiện
          }
          lastScrollY.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Xử lý debounce tìm kiếm
  useEffect(() => {
    if (!searchText) {
      setSearchResults([]);
      setShowDropdown(false);
      setNotFound(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setShowDropdown(true);
    setNotFound(false);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        let res;
        if (selectedCategory && selectedCategory !== 'all') {
          res = await productService.getByCategory(selectedCategory);
          console.log('API data:', res.data, 'Selected category:', selectedCategory);
          if (res.status === 'success' && res.data) {
            const data: any = res.data;
            let products: Product[] = Array.isArray(data) ? data : data.products;
            if (!Array.isArray(products)) products = [];
            const filtered = products.filter(
              (p: Product) => p.name.toLowerCase().includes(searchText.toLowerCase())
            );
            setSearchResults(filtered);
            setNotFound(filtered.length === 0);
          } else {
            setSearchResults([]);
            setNotFound(true);
          }
        } else {
          res = await productService.search(searchText);
          if (res.status === 'success' && Array.isArray(res.data)) {
            const filtered = res.data.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()));
            setSearchResults(filtered);
            setNotFound(filtered.length === 0);
          } else {
            setSearchResults([]);
            setNotFound(true);
          }
        }
      } catch (e) {
        setSearchResults([]);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, 400);
    // eslint-disable-next-line
  }, [searchText, selectedCategory]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.input.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    // Khi đổi danh mục, nếu đang có từ khóa thì show lại dropdown
    if (searchText) setShowDropdown(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setShowDropdown(!!e.target.value);
  };

  const handleResultClick = (id: string) => {
    setShowDropdown(false);
    setSearchText('');
    navigate(`/menu/${id}`);
  };

  const handleSearchIconClick = () => {
    navigate(`/search?keyword=${encodeURIComponent(searchText)}&category=${selectedCategory}`);
    setShowDropdown(false);
  };

  const navigationItems = [
    { key: '/', label: 'TRANG CHỦ' },
    { key: '/gioi-thieu', label: 'GIỚI THIỆU' },
    { key: '/menu', label: 'MENU' },
    { key: '/dat-ban', label: 'ĐẶT BÀN' },
    { key: '/combo', label: 'COMBO' },
  ];

  const handleLogout = async () => {
    // ✅ Clear cart trên server trước khi logout
    try {
      const { clearCartOnServer } = await import('../../utils/cartSync');
      await clearCartOnServer();
    } catch (error) {
      console.error('Failed to clear cart on server:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cartItems');
    localStorage.setItem('cartCount', '0');
    window.location.href = '/';
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />, 
      label: 'Thông tin cá nhân',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'myorders',
      icon: <UserOutlined />, 
      label: 'Đơn hàng của tôi',
      onClick: () => navigate('/profile/order'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: <span style={{ color: 'red' }}>Đăng xuất</span>,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className={`header${showHeader ? '' : ' header--hidden'}`}>
      <div className="header-top">
        <div className="header-left">
          <Link to="/" className="logo">
            <img src="/public/uploadsLogo/logo_restaurant.png" alt="Logo" />
          </Link>
          <nav className="main-nav">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                to={item.key}
                className={location.pathname === item.key ? 'active' : ''}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="header-right">
          <div className="search-filter-group">
            <Select
              className="category-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <Option value="all">Tất cả danh mục</Option>
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
            
            <div className="search-container" ref={dropdownRef}>
              <Input
                ref={searchInputRef}
                placeholder="Tìm kiếm món ăn..."
                value={searchText}
                onChange={handleSearchChange}
                onPressEnter={handleSearchIconClick}
                suffix={
                  <SearchOutlined
                    onClick={handleSearchIconClick}
                    style={{ cursor: 'pointer' }}
                  />
                }
              />
              {showDropdown && (
                <div className="search-dropdown">
                  {loading ? (
                    <div className="search-loading">
                      <Spin size="small" />
                    </div>
                  ) : notFound ? (
                    <div className="search-not-found">Không tìm thấy kết quả</div>
                  ) : (
                    searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="search-result-item"
                        onClick={() => handleResultClick(product.id)}
                      >
                        <img src={product.image} alt={product.name} />
                        <div className="search-result-info">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: highlightKeyword(product.name, searchText),
                            }}
                          />
                          <div className="search-result-price">
                            {product.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="header-actions">
            <Link to="/cart" className="cart-icon">
              <Badge count={cartCount} size="small">
                <ShoppingCartOutlined style={{ fontSize: '24px' }} />
              </Badge>
            </Link>
            
            {user ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div className="user-avatar">
                  {user.avatar ? (
                    <img src={getImageUrl(user.avatar)} alt="avatar" />
                  ) : (
                    <UserOutlined style={{ fontSize: '24px' }} />
                  )}
                </div>
              </Dropdown>
            ) : (
              <Link to="/login" className="login-btn">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 