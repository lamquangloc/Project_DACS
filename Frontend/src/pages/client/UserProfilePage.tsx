import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Spin, message } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import userService from '../../services/userService';
import './UserProfilePage.css';
import { getImageUrl } from '../../utils/image';

const UserProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    avatar: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userData = JSON.parse(localStorage.getItem('user') || 'null');
        if (!userData) throw new Error('Chưa đăng nhập');
        setUser(userData);
        setForm({
          name: userData.name || '',
          email: userData.email || '',
          phoneNumber: userData.phoneNumber || '',
          address: userData.address || '',
          avatar: userData.avatar || ''
        });
      } catch (e: any) {
        message.error(e.message || 'Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setAvatarFile(files[0]);
      setForm(prev => ({ ...prev, avatar: URL.createObjectURL(files[0]) }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phoneNumber', form.phoneNumber);
      formData.append('address', form.address);
      if (avatarFile) formData.append('avatar', avatarFile);
      const updated = await userService.update(user.id, formData as any);
      message.success('Cập nhật thành công!');
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setForm(prev => ({ ...prev, avatar: updated.avatar }));
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 40 }}><Spin size="large" /></div>;

  return (
    <div className="user-profile-layout">
      <aside className="user-profile-sidebar">
        <div className="user-profile-avatar-block">
          <img
            src={getImageUrl(form.avatar || '/default-avatar.png')}
            alt="avatar"
            className="user-profile-avatar"
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          />
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
        </div>
        <nav className="user-profile-menu">
          <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>Thông tin người dùng</Link>
          <Link to="/profile/order" className={location.pathname.startsWith('/profile/order') ? 'active' : ''}>Đơn hàng của tôi</Link>
          <Link to="/profile/changePassword" className={location.pathname === '/profile/changePassword' ? 'active' : ''}>Đổi mật khẩu</Link>
        </nav>
      </aside>
      <main className="user-profile-main">
        <h2>Thông tin cá nhân</h2>
        <form className="user-profile-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="user-profile-fields">
            <label>Tên</label>
            <Input name="name" value={form.name} onChange={handleChange} />
            <label>Email</label>
            <Input name="email" value={form.email} onChange={handleChange} disabled />
            <label>Số điện thoại</label>
            <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
            <label>Địa chỉ</label>
            <Input name="address" value={form.address} onChange={handleChange} />
            <Button type="primary" htmlType="submit" loading={saving} style={{ marginTop: 18 }}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default UserProfilePage; 