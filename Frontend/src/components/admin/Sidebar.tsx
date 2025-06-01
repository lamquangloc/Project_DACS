import  { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaBox,
  FaList,
  FaBoxes,
  FaShoppingCart,
  FaChair,
  FaUsers,
  FaAngleDown,
  FaAngleUp
} from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();
  const [isTableSubmenuOpen, setIsTableSubmenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isTableSection = () => {
    return location.pathname.startsWith('/admin/tables') || 
           location.pathname.startsWith('/admin/reservations');
  };

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>
      <nav className="mt-4">
        <Link
          to="/admin"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            isActive('/admin') ? 'bg-gray-700' : ''
          }`}
        >
          <FaHome className="mr-3" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/products"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            location.pathname.startsWith('/admin/products') ? 'bg-gray-700' : ''
          }`}
        >
          <FaBox className="mr-3" />
          <span>Sản phẩm</span>
        </Link>

        <Link
          to="/admin/categories"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            location.pathname.startsWith('/admin/categories') ? 'bg-gray-700' : ''
          }`}
        >
          <FaList className="mr-3" />
          <span>Danh mục</span>
        </Link>

        <Link
          to="/admin/combos"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            location.pathname.startsWith('/admin/combos') ? 'bg-gray-700' : ''
          }`}
        >
          <FaBoxes className="mr-3" />
          <span>Combo</span>
        </Link>

        <Link
          to="/admin/orders"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            location.pathname.startsWith('/admin/orders') ? 'bg-gray-700' : ''
          }`}
        >
          <FaShoppingCart className="mr-3" />
          <span>Đơn hàng</span>
        </Link>

        <div>
          <button
            onClick={() => setIsTableSubmenuOpen(!isTableSubmenuOpen)}
            className={`flex items-center justify-between w-full px-6 py-3 hover:bg-gray-700 ${
              isTableSection() ? 'bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center">
              <FaChair className="mr-3" />
              <span>Đặt bàn</span>
            </div>
            {isTableSubmenuOpen ? <FaAngleUp /> : <FaAngleDown />}
          </button>
          {isTableSubmenuOpen && (
            <div className="bg-gray-900">
              <Link
                to="/admin/tables"
                className={`flex items-center px-10 py-2 hover:bg-gray-700 ${
                  location.pathname.startsWith('/admin/tables') ? 'bg-gray-700' : ''
                }`}
              >
                <span>Quản lý bàn</span>
              </Link>
              <Link
                to="/admin/reservations"
                className={`flex items-center px-10 py-2 hover:bg-gray-700 ${
                  location.pathname.startsWith('/admin/reservations') ? 'bg-gray-700' : ''
                }`}
              >
                <span>Quản lý đặt bàn</span>
              </Link>
            </div>
          )}
        </div>

        <Link
          to="/admin/users"
          className={`flex items-center px-6 py-3 hover:bg-gray-700 ${
            location.pathname.startsWith('/admin/users') ? 'bg-gray-700' : ''
          }`}
        >
          <FaUsers className="mr-3" />
          <span>Người dùng</span>
        </Link>


      </nav>
    </div>
  );
};

export default Sidebar; 