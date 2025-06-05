import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Collapse, Tag, Spin, Button, message } from 'antd';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';

const statusText = {
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};
const statusColor = {
  PENDING: 'orange',
  CONFIRMED: 'blue',
  DELIVERING: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
};
const paymentText = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chưa thanh toán',
};
const paymentColor = {
  PAID: 'green',
  PENDING: 'orange',
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchOrder();
    // eslint-disable-next-line
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await orderService.getById(id!, true);
      setOrder(res.data || res);
    } catch (e) {
      message.error('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) return <Spin style={{ margin: 40 }} />;

  return (
    <div style={{ maxWidth: 800, margin: '32px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32 }}>
      <ScrollToTopButton />
      <h2 style={{
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 700,
        color: '#1677ff',
        marginBottom: 32,
        letterSpacing: 1,
        borderBottom: '2px solid #e6f4ff',
        paddingBottom: 12
      }}>
        Chi tiết đơn hàng
      </h2>
      <Collapse defaultActiveKey={['status', 'info', 'products', 'customer']}>
        <Collapse.Panel header="Trạng thái đơn hàng" key="status">
          <div style={{ marginBottom: 8 }}>
            <b>Trạng thái đơn hàng:</b> <Tag color={statusColor[String(order.status) as keyof typeof statusColor]}>{statusText[String(order.status) as keyof typeof statusText]}</Tag>
          </div>
          <div>
            <b>Trạng thái thanh toán:</b> <Tag color={paymentColor[String(order.paymentStatus) as keyof typeof paymentColor]}>{paymentText[String(order.paymentStatus) as keyof typeof paymentText]}</Tag>
          </div>
        </Collapse.Panel>
        <Collapse.Panel header="Thông tin đơn hàng" key="info">
          <div><b>Mã đơn hàng:</b> {order.orderCode}</div>
          <div><b>Ngày đặt:</b> {formatDate(order.createdAt)}</div>
          <div><b>Tổng tiền:</b> {formatCurrency(order.total)}</div>
        </Collapse.Panel>
        <Collapse.Panel header="Chi tiết sản phẩm" key="products">
          {order.items.map((item: any) => {
            const product = item.product || item.combo || {};
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <img src={product.image || '/no-image.png'} alt={product.name || ''} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginRight: 16 }} />
                <div style={{ flex: 1 }}>
                  <div><b>{product.name}</b></div>
                  <div>Số lượng: {item.quantity} | Giá: {formatCurrency(item.price)} | Thành tiền: {formatCurrency(item.price * item.quantity)}</div>
                </div>
              </div>
            );
          })}
        </Collapse.Panel>
        <Collapse.Panel header="Thông tin khách hàng" key="customer">
          <div><b>Người nhận:</b> {order.customerName || order.user?.name || ''}</div>
          <div><b>SĐT:</b> {order.phoneNumber}</div>
          <div><b>Địa chỉ:</b> {[
            order.address,
            order.wardName,
            order.districtName,
            order.provinceName
          ].filter(Boolean).join(', ')}</div>
        </Collapse.Panel>
      </Collapse>
      <Button style={{ marginTop: 24 }} onClick={() => navigate(-1)}>Quay lại</Button>
    </div>
  );
};

export default OrderDetailPage; 