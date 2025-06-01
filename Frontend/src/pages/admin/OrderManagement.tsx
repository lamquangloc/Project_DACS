import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { OrderService } from '../../services/orderService';
import OrderList from './components/OrderList';
import { IOrder } from '../../types/order';
import { toast } from 'react-toastify';
import CreateOrderModal from './components/CreateOrderModal';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentTab, setCurrentTab] = useState('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const orderService = new OrderService();
      const timestamp = new Date().getTime();
      const response = await orderService.getAll(1, 10, timestamp);
      console.log('Orders response:', response);

      if (!response) {
        toast.error('Không nhận được phản hồi từ server');
        return;
      }

      if (response.status !== 'success') {
        toast.error('Phản hồi không thành công từ server');
        return;
      }

      const ordersData = response.data?.orders || [];
      console.log('Orders data:', ordersData);
      setOrders(ordersData);

      if (ordersData.length === 0) {
        toast.info('Không có đơn hàng nào');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Có lỗi xảy ra khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    if (!orders) return [];
    
    let filtered = orders;

    // Filter by status
    if (currentTab !== 'ALL') {
      filtered = filtered.filter(order => order.status === currentTab);
    }

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((order) => {
        return (
          order.user?.name?.toLowerCase().includes(searchLower) ||
          order.phoneNumber?.toLowerCase().includes(searchLower) ||
          order.orderCode?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Quản lý đơn hàng
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Quản lý tất cả các đơn hàng, theo dõi trạng thái và cập nhật thông tin đơn hàng.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        justifyContent="space-between"
        alignItems="center"
      >
        <TextField
          placeholder="Tìm kiếm theo tên hoặc số điện thoại"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ 
            width: { xs: '100%', sm: '300px' },
            backgroundColor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => setCreateModalVisible(true)}
          sx={{
            height: '40px',
            borderRadius: '8px',
            textTransform: 'none',
            minWidth: '150px'
          }}
        >
          Tạo đơn hàng
        </Button>
      </Stack>

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        sx={{ 
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
          }
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Tất cả" value="ALL" />
        <Tab label="Đang chờ" value="PENDING" />
        <Tab label="Đã xác nhận" value="CONFIRMED" />
        <Tab label="Đang giao" value="DELIVERING" />
        <Tab label="Đã giao" value="DELIVERED" />
        <Tab label="Đã hủy" value="CANCELLED" />
      </Tabs>

      <OrderList 
        orders={getFilteredOrders()} 
        onRefresh={fetchOrders}
      />

      <CreateOrderModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchOrders();
        }}
      />
    </Box>
  );
};

export default OrderManagement; 