import React, { useState, useRef, useEffect } from 'react';
import { FaShoppingCart, FaInfoCircle, FaComments, FaTimes, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';


import './ChatBox.css';
import { message } from 'antd';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  categories: string;
}

interface ChatContext {
  type: 'products';
  displayType: 'single' | 'list' | 'pagination';
  page: number;
  totalProducts: number;
  products: Product[];
  orderInfo?: string;
}

interface Message {
  text: string;
  isUser: boolean;
  context?: ChatContext;
}

const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && (user._id || user.id)) return user._id || user.id;
  let guestId = sessionStorage.getItem('guest_chat_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('guest_chat_id', guestId);
  }
  return guestId;
};

const getChatHistory = () => {
  const userId = getUserId();
  const history = localStorage.getItem(`chat_history_${userId}`);
  return history ? JSON.parse(history) : [];
};

const saveChatHistory = (messages: any[]) => {
  const userId = getUserId();
  localStorage.setItem(`chat_history_${userId}`, JSON.stringify(messages));
};

const clearGuestChat = () => {
  const userId = getUserId();
  if (userId.startsWith('guest_')) {
    localStorage.removeItem(`chat_history_${userId}`);
    sessionStorage.removeItem('guest_chat_id');
  }
};

function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

const ChatBox: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(getChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(getUserId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    const handleUnload = () => clearGuestChat();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    setMessages(getChatHistory());
  }, [userId]);

  useEffect(() => {
    const handleStorage = () => {
      setUserId(getUserId());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, userId }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { 
        text: data.reply, 
        isUser: false,
        context: data.context 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Xin lỗi, đã có lỗi xảy ra.', 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/login');
      return;
    }
    let cartItems = [];
    try {
      cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch { cartItems = []; }
    const idx = cartItems.findIndex((item: any) => item.product && (item.product.id === product.id || item.product._id === product.id));
    if (idx > -1) {
      cartItems[idx].quantity += 1;
    } else {
      cartItems.push({ product: { ...product, _id: product.id }, quantity: 1 });
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    window.dispatchEvent(new Event('storage'));
    message.success('Đã thêm vào giỏ hàng!', 1.5);
  };

  const handleViewDetails = (productId: string, productName?: string) => {
    const slug = `${removeVietnameseTones(productName || '')}-${productId}`;
    navigate(`/menu/${slug}`);
  };

  const handleClearChat = () => {
    setMessages([]);
    const userId = getUserId();
    localStorage.removeItem(`chat_history_${userId}`);
  };

  const renderProducts = (context: ChatContext) => {
    const { displayType, products } = context;

    if (displayType === 'single') {
      return (
        <div className="products-single">
          {products.map(product => (
            <div key={product.id} className="product-card-single">
              <div className="product-image-wrapper">
                <img src={product.image} alt={product.name} className="product-image" />
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="price">{product.price.toLocaleString('vi-VN')}đ</p>
                <p className="description">
                  {product.description.length > 80
                    ? product.description.substring(0, 80) + '...'
                    : product.description}
                </p>
                <div className="product-actions">
                  <button 
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                    title="Thêm vào giỏ hàng"
                  >
                    <FaShoppingCart />
                  </button>
                  <button 
                    className="view-details-btn"
                    onClick={() => handleViewDetails(product.id, product.name)}
                    title="Xem chi tiết"
                  >
                    <FaInfoCircle />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (displayType === 'list') {
      return (
        <div className="products-list">
          {products.map(product => (
            <div key={product.id} className="product-card-list">
              <div className="product-header">
                <h3>{product.name}</h3>
                <p className="price">{product.price.toLocaleString('vi-VN')}đ</p>
              </div>
              <p className="description">
                {product.description.length > 80
                  ? product.description.substring(0, 80) + '...'
                  : product.description}
              </p>
              <div className="product-actions">
                <button 
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(product)}
                  title="Thêm vào giỏ hàng"
                >
                  <FaShoppingCart />
                </button>
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewDetails(product.id, product.name)}
                  title="Xem chi tiết"
                >
                  <FaInfoCircle />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Pagination display
    return (
      <div className="products-pagination">
        <div className="products-list">
          {products.map(product => (
            <div key={product.id} className="product-card-list">
              <div className="product-header">
                <h3>{product.name}</h3>
                <p className="price">{product.price.toLocaleString('vi-VN')}đ</p>
              </div>
              <p className="description">
                {product.description.length > 80
                  ? product.description.substring(0, 80) + '...'
                  : product.description}
              </p>
              <div className="product-actions">
                <button 
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(product)}
                  title="Thêm vào giỏ hàng"
                >
                  <FaShoppingCart />
                </button>
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewDetails(product.id, product.name)}
                  title="Xem chi tiết"
                >
                  <FaInfoCircle />
                </button>
              </div>
            </div>
          ))}
        </div>
        {context.totalProducts > 6 && (
          <div className="pagination-controls">
            <button 
              className="load-more-btn"
              onClick={() => {
                setMessages(prev => [...prev, { 
                  text: 'Bạn có muốn xem thêm món khác không?', 
                  isUser: false 
                }]);
              }}
            >
              Xem thêm món khác
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <button 
          className="chat-button"
          onClick={() => setIsOpen(true)}
        >
          <FaComments />
        </button>
      )}
      {isOpen && (
        <div className="chat-box">
          <div className="chat-header">
            <h3>Chatbox</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="clear-button" onClick={handleClearChat} title="Xóa lịch sử chat">
                <FaTrash />
              </button>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                <FaTimes />
              </button>
            </div>
          </div>
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                <div className="message-content">
                  {message.context?.type === 'products' ? (
                    <>
                      <p>Đây là sản phẩm mà tôi gợi ý dựa theo yêu cầu của bạn.</p>
                      {renderProducts(message.context)}
                      {message.context.orderInfo && (
                        <p>{message.context.orderInfo}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>{message.text}</p>
                      {message.context?.orderInfo && (
                        <p>{message.context.orderInfo}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-content">
                  <p>Đang tìm kiếm...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập tin nhắn..."
            />
            <button onClick={handleSend} disabled={isLoading}>
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBox; 