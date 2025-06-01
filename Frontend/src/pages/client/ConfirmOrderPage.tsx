import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleTwoTone } from '@ant-design/icons';

interface ProductItem {
  product?: {
    _id?: string;
    id?: string;
    name?: string;
    image?: string;
    price?: number;
  };
  combo?: {
    _id?: string;
    id?: string;
    name?: string;
    image?: string;
    price?: number;
  };
  quantity: number;
  [key: string]: any; // Cho phép các trường khác nếu có
}

interface OrderInfo {
  _id: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  userName: string;
  phone: string;
  address: string;
  provinceName: string;
  districtName: string;
  wardName: string;
  note?: string;
  items: ProductItem[];
  totalAmount: number;
}

const ConfirmOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderInfo | null>(null);

  useEffect(() => {
    // Reset giỏ hàng giống logic COD
    localStorage.removeItem('cartItems');
    localStorage.setItem('cartCount', '0');
    window.dispatchEvent(new Event('storage'));
    // Lấy thông tin đơn hàng từ localStorage (hoặc truyền qua state/location)
    const orderData = localStorage.getItem('lastOrder');
    if (orderData) {
      setOrder(JSON.parse(orderData));
    }
  }, []);

  if (!order) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        <h2>Không tìm thấy thông tin đơn hàng!</h2>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  // Bổ sung kiểm tra an toàn cho các trường có thể undefined/null
  const orderId = (order as any).orderCode || (order as any)._id || (order as any).id || 'N/A';
  const orderUser = (order as any).user || undefined;
  const orderPhone = order.phone || (order as any).phoneNumber || orderUser?.phoneNumber || 'N/A';
  const orderUserName = order.userName || orderUser?.name || 'N/A';
  const orderTotal = order.totalAmount ?? (order as any).total ?? 0;
  const orderItems = (order.items || []) as any[];

  const address = [order.address, order.wardName, order.districtName, order.provinceName].filter(Boolean).join(', ');
  const formatDate = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };
  const statusMap: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    DELIVERING: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
  };

  // Lấy tên phương thức thanh toán đúng với lựa chọn, kiểm tra thêm các trường khác nếu paymentMethod bị thiếu
  let paymentMethodValue = order.paymentMethod || (order as any).paymentStatus || (order as any).payment_type || (order as any).payment_method || '';
  let paymentMethodLabel = 'N/A';
  if (paymentMethodValue === 'COD') paymentMethodLabel = 'Thanh toán khi nhận hàng (COD)';
  else if (paymentMethodValue === 'VNPAY') paymentMethodLabel = 'Thanh toán qua VNPAY';
  else if (paymentMethodValue) paymentMethodLabel = paymentMethodValue;
  // Debug log
  console.log('DEBUG order:', order);
  console.log('DEBUG paymentMethodValue:', paymentMethodValue);

  return (
    <div className="confirm-order-page" style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 64 }} />
        <h1 style={{ color: '#2e7d32', margin: '16px 0 8px' }}>Đặt hàng thành công!</h1>
        <div style={{ color: '#444', fontSize: 18, marginBottom: 8 }}>
          Cảm ơn bạn đã đặt món ăn ở nhà hàng. Đơn hàng hiện đã được xác nhận và đang được xử lý.
        </div>
      </div>
      {/* Khung chi tiết đơn hàng */}
      <div style={{ border: '2px solid #222', borderRadius: 12, padding: 24, position: 'relative', background: '#fff', marginBottom: 32 }}>
        <div style={{ position: 'absolute', top: -18, left: 18, background: '#fff', padding: '0 12px', fontWeight: 600, color: '#222', fontSize: 18 }}>
          Chi tiết đơn hàng
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div><b>Mã đơn hàng:</b> {orderId}</div>
            <div><b>Ngày đặt hàng:</b> {formatDate(order.createdAt)}</div>
            <div><b>Trạng thái đơn:</b> {statusMap[order.status] || order.status || 'N/A'}</div>
            <div><b>Phương thức thanh toán:</b> {paymentMethodLabel}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div><b>Tên người đặt:</b> {orderUserName}</div>
            <div><b>Số điện thoại:</b> {orderPhone}</div>
            <div><b>Địa chỉ:</b> {address || 'N/A'}</div>
            {order.note && <div><b>Ghi chú:</b> {order.note}</div>}
          </div>
        </div>
      </div>
      {/* Khung chi tiết sản phẩm */}
      <div style={{ border: '2px solid #222', borderRadius: 12, padding: 24, position: 'relative', background: '#fff', marginBottom: 32 }}>
        <div style={{ position: 'absolute', top: -18, left: 18, background: '#fff', padding: '0 12px', fontWeight: 600, color: '#222', fontSize: 18 }}>
          Chi tiết sản phẩm
        </div>
        <div className="order-products" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orderItems.map((item, idx) => {
              let prod = null;
              let isCombo = false;
              if (item.combo) {
                prod = item.combo;
                isCombo = true;
              } else if (item.comboId) {
                // Combo fields at root (not nested)
                prod = {
                  id: item.comboId,
                  name: item.comboName || item.name || 'Combo',
                  image: item.comboImage || item.image || '/placeholder-product.jpg',
                  price: item.price
                };
                isCombo = true;
              } else if (item.product) {
                prod = item.product;
              } else {
                prod = item;
              }
              const name = prod?.name || (isCombo ? 'Combo' : 'Sản phẩm');
              const img = prod?.image || '/placeholder-product.jpg';
              const price = prod?.price ?? 0;
              const quantity = item?.quantity ?? 0;
              return (
                <div key={prod?.id || prod?._id || idx} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#fafafa', borderRadius: 8, padding: 10 }}>
                  <img src={img} alt={name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{name}{isCombo && <span style={{ color: '#1976d2', marginLeft: 8 }}>[Combo]</span>}</div>
                    <div style={{ color: '#666' }}>Số lượng: {quantity}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#e53935', minWidth: 90, textAlign: 'right' }}>{(price * quantity).toLocaleString()}đ</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="order-total" style={{ textAlign: 'right', fontSize: 20, fontWeight: 600, color: '#2e7d32', marginBottom: 0 }}>
          Tổng tiền: {orderTotal.toLocaleString()}đ
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '12px 32px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Tiếp tục mua sắm</button>
        <button onClick={() => navigate('/profile/order')} style={{ padding: '12px 32px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Xem đơn hàng</button>
      </div>
    </div>
  );
};

export default ConfirmOrderPage; 