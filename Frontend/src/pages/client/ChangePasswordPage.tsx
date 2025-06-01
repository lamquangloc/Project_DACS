import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import './UserProfilePage.css';

const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const location = useLocation();
  const navigate = useNavigate();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      message.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error('Mật khẩu mới không khớp');
      return;
    }
    setLoading(true);
    try {
      await userService.updatePassword({ currentPassword, newPassword });
      message.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (e: any) {
      message.error(e.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-layout">
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
        <h2>Đổi mật khẩu</h2>
        <form className="user-profile-form" onSubmit={e => { e.preventDefault(); handleChangePassword(); }}>
          <div className="user-profile-fields">
            <label>Mật khẩu hiện tại</label>
            <Input.Password value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            <label>Mật khẩu mới</label>
            <Input.Password value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <label>Nhập lại mật khẩu mới</label>
            <Input.Password value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 18 }}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ChangePasswordPage; 