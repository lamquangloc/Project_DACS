import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Role, CreateUserDto } from '../../types/user';
import userService from '../../services/userService';
import './UserDetail.css';
import { getImageUrl } from '../../utils/image';

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserDto>({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
    address: '',
    role: Role.USER,
    avatar: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && id !== 'create') {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userData = await userService.getById(id!);
      console.log('Fetched user data:', userData);
      setFormData({
        email: userData.email,
        name: userData.name,
        phoneNumber: userData.phoneNumber || '',
        address: userData.address || '',
        role: userData.role,
        avatar: userData.avatar || '',
        password: ''
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Không thể tải thông tin người dùng');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    console.log('Changing role to:', newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setAvatarFile(files[0]);
      setFormData(prev => ({ ...prev, avatar: URL.createObjectURL(files[0]) }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return false;
    }

    if (!id && (!formData.password || !confirmPassword)) {
      toast.error('Vui lòng nhập mật khẩu');
      return false;
    }

    if (formData.password !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email không hợp lệ');
      return false;
    }

    // Kiểm tra số điện thoại chỉ khi có nhập giá trị
    const phoneNumber = formData.phoneNumber?.trim();
    if (phoneNumber) {
      if (!/^[0-9]{10}$/.test(phoneNumber)) {
        toast.error('Số điện thoại phải có 10 chữ số');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('role', formData.role);
      
      if (formData.phoneNumber?.trim()) {
        formDataToSend.append('phoneNumber', formData.phoneNumber.trim());
      }
      
      if (formData.address?.trim()) {
        formDataToSend.append('address', formData.address.trim());
      }
      
      if (!id || id === 'create') {
        // Khi tạo user mới, luôn cần password
        formDataToSend.append('password', formData.password.trim());
      } else if (formData.password?.trim()) {
        // Khi cập nhật, chỉ gửi password nếu có nhập
        formDataToSend.append('password', formData.password.trim());
      }
      
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      if (id && id !== 'create') {
        const response = await userService.update(id, formDataToSend as any);
        console.log('Update response:', response);
        toast.success('Cập nhật người dùng thành công');
      } else {
        await userService.create(formDataToSend as any);
        toast.success('Tạo người dùng thành công');
      }
      navigate('/admin/users');
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'Không thể lưu thông tin người dùng';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-detail-root">
      <div className="user-detail-header">
        <h1>
          {id && id !== 'create' ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'}
        </h1>
        <button
          onClick={() => navigate('/admin/users')}
          className="back-button"
        >
          Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit} className="user-detail-form">
        <div className="user-detail-avatar-block">
          <img
            src={getImageUrl(formData.avatar || '/default-avatar.png')}
            alt="avatar"
            className="user-detail-avatar"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
          <div className="avatar-hint">Bấm vào ảnh để đổi avatar</div>
        </div>

        <div className="user-detail-fields">
          <div className="form-group">
            <label>Tên người dùng *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              pattern="[0-9]{10}"
              title="Số điện thoại phải có 10 chữ số"
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Vai trò</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleRoleChange}
            >
              <option value={Role.USER}>Người dùng</option>
              <option value={Role.STAFF}>Nhân viên</option>
              <option value={Role.ADMIN}>Quản trị viên</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {id && id !== 'create' ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required={!id || id === 'create'}
            />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu {!id || id === 'create' ? '*' : ''}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!id || id === 'create' || formData.password !== ''}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserDetail; 