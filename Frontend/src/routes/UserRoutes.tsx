import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Home from '../pages/client/Home';
import MenuProductDetailPage from '../pages/client/MenuProductDetailPage';

const UserRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<div>Menu Page</div>} />
        <Route path="menu/:slug" element={<MenuProductDetailPage />} />
        <Route path="gioi-thieu" element={<div>Giới thiệu</div>} />
        <Route path="dat-ban" element={<div>Đặt bàn</div>} />
        <Route path="combo" element={<div>Combo</div>} />
      </Route>
    </Routes>
  );
};

export default UserRoutes; 