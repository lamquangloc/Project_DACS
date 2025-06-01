import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Stack,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { OrderService } from '../../services/orderService';
import { IOrder, OrderStatus, PaymentStatus } from '../../types/order';
import { formatCurrency } from '../../utils/currencyUtils';

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<IOrder | null>(null);
  const orderService = new OrderService();

  useEffect(() => {
    if (id) {
      fetchOrderData();
    }
  }, [id]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const response = await orderService.getById(id!);
      
      if (!response || response.status !== 'success') {
        toast.error('Không thể tải thông tin đơn hàng');
        navigate('/admin/orders');
        return;
      }

      const orderData = response.data;
      console.log('Order data:', orderData);
      setOrder(orderData ?? null);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Không thể tải thông tin đơn hàng');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      if (!order || !id) return;

      const response = await orderService.update(id, {
        ...order,
        status: newStatus
      });

      if (response && response.status === 'success') {
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('Cập nhật trạng thái đơn hàng thành công');
      } else {
        toast.error('Không thể cập nhật trạng thái đơn hàng');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const handlePaymentStatusChange = async (newStatus: PaymentStatus) => {
    try {
      if (!order || !id) return;

      const response = await orderService.updatePaymentStatus(id, newStatus);

      if (response && response.status === 'success') {
        setOrder(prev => prev ? { ...prev, paymentStatus: newStatus } : null);
        toast.success('Cập nhật trạng thái thanh toán thành công');
      } else {
        toast.error('Không thể cập nhật trạng thái thanh toán');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Không thể cập nhật trạng thái thanh toán');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Không tìm thấy thông tin đơn hàng</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Chi tiết đơn hàng #{order.orderCode}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/orders')}
        >
          Quay lại
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Thông tin khách hàng */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Thông tin khách hàng
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  value={order.phoneNumber || ''}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Địa chỉ"
                  value={[
                    order.address,
                    order.wardName,
                    order.districtName,
                    order.provinceName
                  ].filter(Boolean).join(', ')}
                  disabled
                  multiline
                  rows={2}
                />
              </Stack>
            </Box>

            {/* Thông tin đơn hàng */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Thông tin đơn hàng
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Tổng tiền"
                  value={formatCurrency(order.totalAmount || order.total || 0)}
                  disabled
                />
                <FormControl fullWidth>
                  <InputLabel>Trạng thái đơn hàng</InputLabel>
                  <Select
                    value={order.status}
                    label="Trạng thái đơn hàng"
                    onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  >
                    {Object.values(OrderStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status === OrderStatus.PENDING && 'Đang chờ'}
                        {status === OrderStatus.CONFIRMED && 'Đã xác nhận'}
                        {status === OrderStatus.DELIVERING && 'Đang giao'}
                        {status === OrderStatus.DELIVERED && 'Đã giao'}
                        {status === OrderStatus.CANCELLED && 'Đã hủy'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái thanh toán</InputLabel>
                  <Select
                    value={order.paymentStatus}
                    label="Trạng thái thanh toán"
                    onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                  >
                    {Object.values(PaymentStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status === PaymentStatus.PENDING && 'Chờ thanh toán'}
                        {status === PaymentStatus.PAID && 'Đã thanh toán'}
                        {status === PaymentStatus.FAILED && 'Thất bại'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Danh sách sản phẩm */}
            <Box sx={{ gridColumn: { xs: '1', md: '1 / span 2' } }}>
              <Typography variant="h6" gutterBottom>
                Danh sách sản phẩm
              </Typography>
              <Box sx={{ mt: 2 }}>
                {order.items?.map((item, _index) => (
                  <Card key={item.id} sx={{ mb: 1, p: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, alignItems: 'center' }}>
                      <Typography>
                        {item.productId ? 'Sản phẩm' : 'Combo'}: {item.productId || item.comboId}
                      </Typography>
                      <Typography>SL: {item.quantity}</Typography>
                      <Typography>
                        Giá: {formatCurrency(item.price)}
                      </Typography>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrderDetail; 