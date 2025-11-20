import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CartPage.css';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

interface CartItem {
  _id?: string;
  product?: {
    _id: string;
    name: string;
    price: number;
    image: string;
  };
  combo?: {
    _id: string;
    name: string;
    price: number;
    image: string;
  };
  quantity: number;
}

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [districtList, setDistrictList] = useState<any[]>([]);
  const [wardList, setWardList] = useState<any[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');

  useEffect(() => {
    fetchCart();
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinceList(data));
    // Tự động điền tên người đặt nếu đã đăng nhập
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user && user.name) {
        setUserName(user.name);
      }
    } catch {}
    
    // ✅ Load cart từ server khi component mount (nếu đã login)
    const loadCartOnMount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const { loadCartFromServer } = await import('../../utils/cartSync');
          const loadedCart = await loadCartFromServer();
          if (loadedCart && loadedCart.length > 0) {
            setCartItems(loadedCart);
            const count = loadedCart.reduce((sum: number, item: any) => sum + item.quantity, 0);
            localStorage.setItem('cartCount', String(count));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (error) {
        console.error('Failed to load cart on mount:', error);
      }
    };
    loadCartOnMount();
  }, []);

  useEffect(() => {
    if (provinceCode) {
      fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
          setDistrictList(data.districts || []);
          setProvinceName(data.name);
          setDistrictCode('');
          setWardCode('');
          setWardList([]);
        });
    } else {
      setDistrictList([]);
      setDistrictCode('');
      setWardList([]);
      setWardCode('');
    }
  }, [provinceCode]);

  useEffect(() => {
    if (districtCode) {
      fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
          setWardList(data.wards || []);
          setDistrictName(data.name);
          setWardCode('');
        });
    } else {
      setWardList([]);
      setWardCode('');
    }
  }, [districtCode]);

  useEffect(() => {
    if (wardCode && wardList.length > 0) {
      const ward = wardList.find(w => String(w.code) === String(wardCode));
      setWardName(ward ? ward.name : '');
    } else {
      setWardName('');
    }
  }, [wardCode, wardList]);

  const fetchCart = () => {
    try {
      const items = JSON.parse(localStorage.getItem('cartItems') || '[]');
      setCartItems(items);
      const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      localStorage.setItem('cartCount', String(count));
      window.dispatchEvent(new Event('storage'));
    } catch {
      setCartItems([]);
      localStorage.setItem('cartCount', '0');
      window.dispatchEvent(new Event('storage'));
    }
    setLoading(false);
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    let items = cartItems.map(i => {
      const id = i.product?._id || i.combo?._id;
      return id === itemId ? { ...i, quantity: newQuantity } : i;
    });
    localStorage.setItem('cartItems', JSON.stringify(items));
    setCartItems(items);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    
    // ✅ Sync cart lên server
    import('../../utils/cartSync').then(({ syncCartToServer }) => {
      syncCartToServer(items);
    }).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    let items = cartItems.filter(i => (i.product?._id || i.combo?._id) !== itemId);
    localStorage.setItem('cartItems', JSON.stringify(items));
    setCartItems(items);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    
    // ✅ Sync cart lên server
    import('../../utils/cartSync').then(({ syncCartToServer }) => {
      syncCartToServer(items);
    }).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
  };

  const handleOrder = async () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (!userName || !phone || !addressDetail || !provinceCode || !provinceName || !districtCode || !districtName || !wardCode || !wardName) {
      alert('Vui lòng điền đầy đủ thông tin đặt hàng và địa chỉ');
      return;
    }
    if (cartItems.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userId = user?.id || user?._id || '';
      if (!userId) {
        alert('Không xác định được tài khoản người dùng. Vui lòng đăng nhập lại!');
        return;
      }
      // ✅ Log cartItems để debug
      console.log('🛒 Cart items before creating order:', cartItems);
      
      // ✅ Helper: Normalize province name (TP.HCM -> Thành phố Hồ Chí Minh)
      const normalizeProvinceName = (name: string): string => {
        if (!name) return name;
        const normalized = name.trim();
        // Map các tên viết tắt phổ biến
        const provinceMap: Record<string, string> = {
          'tp.hcm': 'Thành phố Hồ Chí Minh',
          'tp hcm': 'Thành phố Hồ Chí Minh',
          'hcm': 'Thành phố Hồ Chí Minh',
          'sài gòn': 'Thành phố Hồ Chí Minh',
          'saigon': 'Thành phố Hồ Chí Minh',
          'hà nội': 'Thành phố Hà Nội',
          'hanoi': 'Thành phố Hà Nội',
          'hn': 'Thành phố Hà Nội',
          'đà nẵng': 'Thành phố Đà Nẵng',
          'danang': 'Thành phố Đà Nẵng',
        };
        
        const lowerName = normalized.toLowerCase();
        if (provinceMap[lowerName]) {
          return provinceMap[lowerName];
        }
        
        // Nếu đã là tên đầy đủ, giữ nguyên
        return normalized;
      };
      
      const normalizedProvinceName = normalizeProvinceName(provinceName);
      
      const orderData = {
        userId,
        items: cartItems.map(item => {
          if (item.combo) {
            // ✅ Đây là combo - ưu tiên kiểm tra combo trước
            const comboId = item.combo._id || item.combo.id;
            console.log('🍱 Combo item:', { comboId, name: item.combo.name, quantity: item.quantity, combo: item.combo });
            if (!comboId) {
              console.error('❌ Combo item missing ID!', item.combo);
              return null;
            }
            return {
              comboId,
              productId: null, // ✅ Đảm bảo productId là null cho combo
              quantity: item.quantity,
              price: item.combo.price
            };
          } else if (item.product) {
            // ✅ Đây là product
            const productId = item.product._id || item.product.id;
            console.log('📦 Product item:', { productId, name: item.product.name, quantity: item.quantity });
            if (!productId) {
              console.error('❌ Product item missing ID!', item.product);
              return null;
            }
            return {
              productId,
              comboId: null, // ✅ Đảm bảo comboId là null cho product
              quantity: item.quantity,
              price: item.product.price
            };
          }
          console.warn('⚠️ Item has neither product nor combo:', item);
          return null;
        }).filter(Boolean),
        total: totalAmount,
        address: addressDetail,
        phoneNumber: phone,
        note,
        paymentStatus: paymentMethod === 'VNPAY' ? 'PAID' : 'PENDING',
        status: 'PENDING',
        provinceCode: String(provinceCode),
        provinceName: normalizedProvinceName,
        districtCode: String(districtCode),
        districtName,
        wardCode: String(wardCode),
        wardName
      };
      
      console.log('📤 Sending order data:', {
        ...orderData,
        items: orderData.items.map((item: any) => ({
          productId: item.productId || null,
          comboId: item.comboId || null,
          quantity: item.quantity,
          price: item.price
        }))
      });
      
      const response = await axios.post('/api/orders', orderData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const resData = response.data as any;
      
      console.log('📥 Order response from backend:', resData);
      if (resData.data && resData.data.items) {
        console.log('📦 Order items in response:', resData.data.items.map((item: any) => ({
          id: item.id,
          comboId: item.comboId,
          productId: item.productId,
          hasCombo: !!item.combo,
          hasProduct: !!item.product,
          combo: item.combo ? { id: item.combo.id, name: item.combo.name, image: item.combo.image } : null
        })));
      }
      
      if (resData.paymentUrl) {
        window.location.href = resData.paymentUrl;
      } else if (resData.data) {
        localStorage.setItem('lastOrder', JSON.stringify(resData.data));
        localStorage.removeItem('cartItems');
        localStorage.setItem('cartCount', '0');
        window.dispatchEvent(new Event('storage'));
        setCartItems([]);
        navigate('/confirmOrder');
      } else {
        localStorage.removeItem('cartItems');
        localStorage.setItem('cartCount', '0');
        window.dispatchEvent(new Event('storage'));
        setCartItems([]);
        navigate('/orders/history');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.product?.price ?? item.combo?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="order-form">
          <h2>Thông tin đặt hàng</h2>
          <div className="form-group">
            <label>Tên người đặt:</label>
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập tên người đặt"
            />
          </div>
          <div className="form-group">
            <label>Số điện thoại:</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div className="form-group">
            <label>Tỉnh/Thành phố:</label>
            <select value={provinceCode} onChange={e => setProvinceCode(e.target.value)}>
              <option value="">Chọn tỉnh/thành phố</option>
              {provinceList.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quận/Huyện:</label>
            <select value={districtCode} onChange={e => setDistrictCode(e.target.value)} disabled={!provinceCode}>
              <option value="">Chọn quận/huyện</option>
              {districtList.map(d => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Phường/Xã:</label>
            <select value={wardCode} onChange={e => setWardCode(e.target.value)} disabled={!districtCode}>
              <option value="">Chọn phường/xã</option>
              {wardList.map(w => (
                <option key={w.code} value={w.code}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Địa chỉ chi tiết:</label>
            <input 
              type="text" 
              value={addressDetail} 
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="Nhập số nhà, tên đường..."
            />
          </div>
          <div className="form-group">
            <label>Ghi chú:</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú cho đơn hàng"
            ></textarea>
          </div>
          <div className="form-group">
            <label>Phương thức thanh toán:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="COD">Thanh toán khi nhận hàng (COD)</option>
              <option value="VNPAY">Thanh toán qua VNPAY</option>
            </select>
          </div>
        </div>

        <div className="cart-items">
          <h2>Giỏ hàng</h2>
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Giỏ hàng trống</p>
              <button onClick={() => navigate('/menu')}>
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <>
              {cartItems
                .filter(item => item.product || item.combo)
                .map(item => {
                  const prod = item.product || item.combo;
                  if (!prod) return null;
                  const itemId = item._id || prod._id || `${prod.name}-${item.quantity}`;
                  return (
                    <div key={itemId} className="cart-item">
                    <img src={prod.image} alt={prod.name} />
                    <div className="item-details">
                      <h3>{prod.name}</h3>
                      <p>Giá: {prod.price.toLocaleString()} VNĐ</p>
                      <div className="quantity-controls">
                        <button 
                          onClick={() => handleQuantityChange(prod._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(prod._id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="remove-button"
                        onClick={() => handleRemoveItem(prod._id)}
                      >
                        Xóa
                      </button>
                      <div className="item-total">Tổng: {(prod.price * item.quantity).toLocaleString()} VNĐ</div>
                    </div>
                  </div>
                );
              })}
              <div className="cart-total">
                <h3>Tổng tiền: {totalAmount.toLocaleString()} VNĐ</h3>
              </div>
              <button 
                className="order-button" 
                onClick={handleOrder}
                disabled={cartItems.length === 0}
              >
                Đặt hàng ngay
              </button>
            </>
          )}
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default CartPage; 