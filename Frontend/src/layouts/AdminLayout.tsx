import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Kiểm tra quyền truy cập admin
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user || user.role !== 'ADMIN') {
        navigate('/no-admin-access', { replace: true });
      }
    } catch {
      navigate('/no-admin-access', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 