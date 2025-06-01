import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import CategoryManagement from '../pages/admin/CategoryManagement';
import CategoryDetail from '../pages/admin/CategoryDetail';
import ProductManagement from '../pages/admin/ProductManagement';
import ProductDetail from '../pages/admin/ProductDetail';
import ComboManagement from '../pages/admin/ComboManagement';
import ComboDetail from '../pages/admin/ComboDetail';
import TableManagement from '../pages/admin/TableManagement';
import TableDetail from '../pages/admin/TableDetail';
import ReservationManagement from '../pages/admin/ReservationManagement';
import ReservationDetail from '../pages/admin/ReservationDetail';
import UserManagement from '../pages/admin/UserManagement';
import UserDetail from '../pages/admin/UserDetail';
import OrderManagement from '../pages/admin/OrderManagement';
import OrderDetail from '../pages/admin/OrderDetail';

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="categories/:id" element={<CategoryDetail />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="combos" element={<ComboManagement />} />
        <Route path="combos/new" element={<ComboDetail />} />
        <Route path="combos/:id" element={<ComboDetail />} />
        <Route path="tables" element={<TableManagement />} />
        <Route path="tables/:id" element={<TableDetail />} />
        <Route path="reservations" element={<ReservationManagement />} />
        <Route path="reservations/:id" element={<ReservationDetail />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="users/create" element={<UserDetail />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="orders/:id" element={<OrderDetail />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes; 