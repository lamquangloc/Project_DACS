import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const VnpayReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    axios.get('/api/orders/vnpay-return' + location.search)
      .then((res: any) => {
        if (res.data && res.data.order) {
          localStorage.setItem('lastOrder', JSON.stringify(res.data.order));
          navigate('/confirmOrder');
        } else {
          navigate('/cart');
        }
      })
      .catch(() => navigate('/cart'));
  }, [location, navigate]);

  return <div>Đang xác thực thanh toán VNPAY...</div>;
};

export default VnpayReturnPage; 