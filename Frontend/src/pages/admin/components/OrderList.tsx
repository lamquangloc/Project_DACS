import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { IOrder } from '../../../types/order';
import { formatCurrency } from '../../../utils/currencyUtils';
import OrderDetailModal from './OrderDetailModal';

interface OrderListProps {
  orders: IOrder[];
  onRefresh: () => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onRefresh }) => {
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const handleEdit = (order: IOrder) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'CONFIRMED':
        return 'info';
      case 'DELIVERING':
        return 'primary';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Đang chờ';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'DELIVERING':
        return 'Đang giao';
      case 'DELIVERED':
        return 'Đã giao';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'UNPAID':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'UNPAID':
        return 'Chưa thanh toán';
      default:
        return status;
    }
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên người đặt</TableCell>
              <TableCell>Thông tin KH</TableCell>
              <TableCell>Tổng tiền</TableCell>
              <TableCell>Trạng thái đơn hàng</TableCell>
              <TableCell>Trạng thái thanh toán</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.user?.name || 'N/A'}</TableCell>
                <TableCell>
                  <div>SĐT: {order.phoneNumber || 'N/A'}</div>
                  <div>Địa chỉ: {[
                    order.address,
                    order.wardName,
                    order.districtName,
                    order.provinceName
                  ].filter(Boolean).join(', ') || 'N/A'}</div>
                </TableCell>
                <TableCell>{formatCurrency(order.total || 0)}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(order.status)}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getPaymentStatusText(order.paymentStatus)}
                    color={getPaymentStatusColor(order.paymentStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(order)}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <OrderDetailModal
        visible={detailModalVisible}
        order={selectedOrder}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedOrder(null);
        }}
        onSuccess={() => {
          setDetailModalVisible(false);
          setSelectedOrder(null);
          onRefresh();
        }}
      />
    </>
  );
};

export default OrderList; 