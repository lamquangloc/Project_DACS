import React, { useEffect, useState } from 'react';
import { Tabs, Button, message, Tag } from 'antd';
import orderService from '../../services/orderService';
import comboService from '../../services/comboService';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { getImageUrl } from '../../utils/image';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './UserProfilePage.css';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

const statusTabs = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đang xử lý' },
  { key: 'DELIVERING', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const statusColor = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  DELIVERING: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

const statusText = {
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const MyOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [itemDetails, setItemDetails] = useState<Map<string, any>>(new Map());
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line
  }, [tab]);

  useEffect(() => {
    if (orders.length > 0) {
      fetchAllItemDetails();
    }
    // eslint-disable-next-line
  }, [orders]);

  const fetchAllItemDetails = async () => {
    const detailsMap = new Map<string, any>();
    
    // ✅ Collect TẤT CẢ comboIds (kể cả khi đã có combo object)
    // Vì combo object từ backend có thể không đầy đủ hoặc image path không đúng
    const comboIds: string[] = [];
    orders.forEach((order: any) => {
      if (order.items) {
        order.items.forEach((item: any) => {
          if (item.comboId && !comboIds.includes(item.comboId)) {
            comboIds.push(item.comboId);
          }
        });
      }
    });
    
    // Fetch combo details
    for (const comboId of comboIds) {
      try {
        const res = await comboService.getById(comboId);
        // ✅ res là ApiResponse<Combo>, cần lấy res.data để có Combo object
        const combo = (res as any).data || res;
        if (combo && combo.name && combo.image) {
          detailsMap.set(comboId, combo);
          console.log('✅ Fetched combo details:', comboId, combo.name, combo.image);
        }
      } catch (e) {
        console.error('Error fetching combo:', comboId, e);
      }
    }
    
    setItemDetails(detailsMap);
  };

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await orderService.getMyOrders();
      console.log('API /api/orders/me response:', res); // Debug log
      const resData = res as any;
      let data: any[] = [];
      if (resData && Array.isArray(resData.orders)) {
        data = resData.orders;
      } else {
        console.log('DEBUG FULL RES:', resData);
      }
      console.log('tab:', tab, 'order.status:', data.map(o => o.status));
      if (!Array.isArray(data)) {
        setOrders([]);
      } else if (tab === 'ALL') {
        setOrders(data);
      } else {
        setOrders(data.filter((o: any) => o.status === tab));
      }
    } catch (e) {
      message.error('Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await orderService.cancelOrder(orderId);
      message.success('Đã hủy đơn hàng');
      fetchOrders();
    } catch (e) {
      message.error('Không thể hủy đơn hàng');
    }
  };

  return (
    <div className="user-profile-layout">
      <ScrollToTopButton />
      <aside className="user-profile-sidebar">
        <div className="user-profile-avatar-block">
          <img
            src={user?.avatar || '/default-avatar.png'}
            alt="avatar"
            className="user-profile-avatar"
            style={{ cursor: 'pointer' }}
          />
        </div>
        <nav className="user-profile-menu">
          <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>Thông tin người dùng</Link>
          <Link to="/profile/order" className={location.pathname.startsWith('/profile/order') ? 'active' : ''}>Đơn hàng của tôi</Link>
          <Link to="/profile/changePassword" className={location.pathname === '/profile/changePassword' ? 'active' : ''}>Đổi mật khẩu</Link>
        </nav>
      </aside>
      <main className="user-profile-main">
        <h2>Đơn hàng của tôi</h2>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={statusTabs.map(t => ({ key: t.key, label: t.label }))}
          style={{ marginBottom: 24 }}
        />
        <div className="myorder-list">
          {orders.length === 0 && <div>Không có đơn hàng nào.</div>}
          {orders.map(order => (
            <div className="myorder-card" key={order.id}>
              <div className="myorder-header">
                <Tag color={statusColor[order.status as keyof typeof statusColor] || 'default'} style={{ float: 'right', fontSize: 16 }}>{statusText[order.status as keyof typeof statusText] || order.status}</Tag>
              </div>
              <div className="myorder-products">
                {order.items.map((item: any) => {
                  // ✅ Ưu tiên lấy từ itemDetails (đã fetch), sau đó từ item.product/combo, cuối cùng là empty object
                  let product = item.product || item.combo || {};
                  
                  // ✅ Nếu có comboId, luôn ưu tiên lấy từ itemDetails (đã fetch đầy đủ)
                  if (item.comboId) {
                    const fetchedCombo = itemDetails.get(item.comboId);
                    if (fetchedCombo && fetchedCombo.name && fetchedCombo.image) {
                      product = fetchedCombo;
                    } else if (!product.name || !product.image) {
                      // Nếu chưa fetch được, vẫn dùng product hiện tại nhưng sẽ fetch sau
                      console.log('⚠️ Combo not fetched yet:', item.comboId, 'product:', product);
                    }
                  }
                  
                  // ✅ Sử dụng getImageUrl để format image URL đúng (giống ComboPage)
                  let imageUrl = '/no-image.png';
                  if (product.image) {
                    // Format giống ComboPage: nếu là http thì giữ nguyên, nếu không thì thêm API_URL
                    if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
                      imageUrl = product.image;
                    } else {
                      imageUrl = getImageUrl(product.image);
                    }
                  }
                  const productName = product.name || (item.comboId ? 'Combo' : 'Sản phẩm');
                  
                  return (
                    <div className="myorder-product" key={item.id}>
                      <img src={imageUrl} alt={productName} className="myorder-product-img" />
                      <div className="myorder-product-info">
                        <div className="myorder-product-name">{productName}</div>
                        <div className="myorder-product-category">
                          {product.categories ? product.categories.map((c: any) => c.name).join(', ') : ''}
                        </div>
                        <div className="myorder-product-qty">Số lượng: {item.quantity} x {formatCurrency(item.price)}</div>
                      </div>
                      <div className="myorder-product-total">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="myorder-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Mã đơn: {order.orderCode}</span>
                <span>
                  Tổng tiền: <span className="myorder-total-amount">{formatCurrency(order.total)}</span>
                </span>
              </div>
              <div className="myorder-date" style={{ margin: '8px 0 0 0', color: '#555' }}>
                Ngày đặt: {formatDate(order.createdAt)}
              </div>
              <div className="myorder-footer">
                <div>
                  <Button type="primary" onClick={() => navigate(`/profile/order/${order.id}`)} style={{ marginRight: 8 }}>Xem chi tiết</Button>
                  {order.status !== 'CANCELLED' && (
                    <Button danger onClick={() => handleCancelOrder(order.id)}>Hủy đơn hàng</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyOrderPage; 