import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';

const NoAdminAccess: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang admin."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>Về trang chủ</Button>
        }
      />
    </div>
  );
};

export default NoAdminAccess; 