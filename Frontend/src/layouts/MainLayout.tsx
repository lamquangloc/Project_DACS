import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ChatBox from '../components/ChatBox';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <ChatBox />
      <Footer />
    </div>
  );
};

export default MainLayout; 