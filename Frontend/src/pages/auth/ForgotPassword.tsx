import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [_resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Vui lòng nhập email');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Vui lòng nhập đúng định dạng email');
      setLoading(false);
      return;
    }

    try {
      // Giả định rằng authService.forgotPassword trả về { success, token, message }
      const res = await authService.forgotPassword(email);
      const result = res as any;
      if (result.success) {
        setSuccess(true);
        setResetLink(`/reset-password?token=${result.token}`); // token tồn tại 10 phút
      } else if (result.message === 'EMAIL_NOT_FOUND') {
        setError('Email không tồn tại trong hệ thống');
      } else {
        setError(result.message || 'Gửi yêu cầu đặt lại mật khẩu thất bại');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gửi yêu cầu đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="m-auto bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Quên mật khẩu</h2>
          <p className="text-gray-600 mb-8">
            Nhập email của bạn và chúng tôi sẽ gửi liên kết đặt lại mật khẩu
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              Liên kết đặt lại mật khẩu đã được gửi đến email của bạn
            </div>
            <p className="text-gray-600 my-4">
              Vui lòng kiểm tra hộp thư đến (và thư mục spam) để tìm email với hướng dẫn đặt lại mật khẩu
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập email của bạn"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>

            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 