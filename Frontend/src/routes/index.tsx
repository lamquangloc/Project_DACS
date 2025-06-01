import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import MainLayout from '../layouts/MainLayout';
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
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ResetPassword from '../pages/auth/ResetPassword';
import NotFound from '../pages/NotFound';
import Home from '../pages/client/Home';
import CartPage from '../pages/client/CartPage';
import OrderHistoryPage from '../pages/client/OrderHistoryPage';
import ConfirmOrderPage from '../pages/client/ConfirmOrderPage';
import VnpayReturnPage from '../pages/client/VnpayReturnPage';
import MenuPage from '../pages/client/MenuPage';
import MenuProductDetailPage from '../pages/client/MenuProductDetailPage';
import ComboPage from '../pages/client/ComboPage';
import ComboDetailPage from '../pages/client/ComboDetailPage';
import ReservationPage from '../pages/client/ReservationPage';
import AboutPage from '../pages/client/AboutPage';
import SearchPage from '../pages/client/SearchPage';
import UserProfilePage from '../pages/client/UserProfilePage';
import ChangePasswordPage from '../pages/client/ChangePasswordPage';
import MyOrderPage from '../pages/client/MyOrderPage';
import OrderDetailPage from '../pages/client/OrderDetailPage';
import ForgotPassword from '../pages/auth/ForgotPassword';
import NoAdminAccess from '../pages/NoAdminAccess';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: '',
        element: <Home />
      },
      {
        path: 'menu',
        element: <MenuPage />
      },
      {
        path: 'menu/:slug',
        element: <MenuProductDetailPage />
      },
      {
        path: 'gioi-thieu',
        element: <AboutPage />
      },
      {
        path: 'dat-ban',
        element: <ReservationPage />
      },
      {
        path: 'combo',
        element: <ComboPage />
      },
      {
        path: 'combo/:slug',
        element: <ComboDetailPage />
      },
      {
        path: 'cart',
        element: <CartPage />
      },
      {
        path: 'orders/history',
        element: <OrderHistoryPage />
      },
      {
        path: 'confirmOrder',
        element: <ConfirmOrderPage />
      },
      {
        path: 'vnpay-return',
        element: <VnpayReturnPage />
      },
      {
        path: 'orders/vnpay-return',
        element: <VnpayReturnPage />
      },
      {
        path: 'search',
        element: <SearchPage />
      },
      {
        path: 'profile',
        element: <UserProfilePage />
      },
      {
        path: 'profile/changePassword',
        element: <ChangePasswordPage />
      },
      {
        path: 'profile/order',
        element: <MyOrderPage />
      },
      {
        path: 'profile/order/:id',
        element: <OrderDetailPage />
      }
    ]
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: '',
        element: <Dashboard />
      },
      {
        path: 'categories',
        element: <CategoryManagement />
      },
      {
        path: 'categories/:id',
        element: <CategoryDetail />
      },
      {
        path: 'products',
        element: <ProductManagement />
      },
      {
        path: 'products/:id',
        element: <ProductDetail />
      },
      {
        path: 'combos',
        element: <ComboManagement />
      },
      {
        path: 'combos/new',
        element: <ComboDetail />
      },
      {
        path: 'combos/:id',
        element: <ComboDetail />
      },
      {
        path: 'tables',
        element: <TableManagement />
      },
      {
        path: 'tables/:id',
        element: <TableDetail />
      },
      {
        path: 'reservations',
        element: <ReservationManagement />
      },
      {
        path: 'reservations/:id',
        element: <ReservationDetail />
      },
      {
        path: 'users',
        element: <UserManagement />
      },
      {
        path: 'users/:id',
        element: <UserDetail />
      },
      {
        path: 'orders',
        element: <OrderManagement />
      },
      {
        path: 'orders/:id',
        element: <OrderDetail />
      }
    ]
  },
  {
    path: '/no-admin-access',
    element: <NoAdminAccess />
  }
]); 