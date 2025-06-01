import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Dropdown } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const Header: React.FC = () => {
  
  const navigate = useNavigate();

  // Lấy user từ localStorage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cartItems');
    localStorage.setItem('cartCount', '0');
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />, 
      label: 'Thông tin cá nhân',
      onClick: () => navigate('/profile'),
      style: {
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
      }
    },
    {
      key: 'myorders',
      icon: <UserOutlined />, 
      label: 'Đơn hàng của tôi',
      onClick: () => navigate('/profile/order'),
      style: {
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
      }
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: <span style={{ color: 'red' }}>Đăng xuất</span>,
      danger: true,
      onClick: handleLogout,
      style: {
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
      }
    },
  ];

  return (
    <header style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      <h1 style={{
        fontSize: '20px',
        fontWeight: 600,
        color: '#1a1a1a'
      }}>Admin Dashboard</h1>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          style={{
            position: 'relative',
            padding: '8px',
            color: '#666',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            transition: 'color 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
        >
          <BellIcon style={{ width: '24px', height: '24px' }} />
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ff4d4f'
          }}></span>
        </button>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="avatar" 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <UserCircleIcon style={{ width: '32px', height: '32px', color: '#666' }} />
            )}
            <span style={{
              color: '#1a1a1a',
              fontWeight: 500
            }}>{user?.name || 'Admin'}</span>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header; 