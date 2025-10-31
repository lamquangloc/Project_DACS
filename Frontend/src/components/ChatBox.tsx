import React, { useState, useRef, useEffect } from 'react';
import { FaShoppingCart, FaInfoCircle, FaComments, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import './ChatBox.css';
import { message } from 'antd';
import { API_URL } from '../config/config';

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

const getChatHistory = (userIdOverride?: string) => {
  const userId = userIdOverride || getUserId();
  const history = localStorage.getItem(`chat_history_${userId}`);
  return history ? JSON.parse(history) : [];
};

const saveChatHistory = (messages: any[], userIdOverride?: string) => {
  const userId = userIdOverride || getUserId();
  localStorage.setItem(`chat_history_${userId}`, JSON.stringify(messages));
};

const clearGuestChat = (userIdOverride?: string) => {
  const userId = userIdOverride || getUserId();
  if (userId.startsWith('guest_')) {
    localStorage.removeItem(`chat_history_${userId}`);
    sessionStorage.removeItem('guest_chat_id');
  }
};

const generateSessionId = (userId: string) => `session_${userId}_${Date.now()}`;

const getExistingSessionId = (userId: string) => {
  const stored = sessionStorage.getItem('n8n_session_id');
  if (stored && stored.startsWith(`session_${userId}`)) {
    return stored;
  }
  const newSessionId = generateSessionId(userId);
  sessionStorage.setItem('n8n_session_id', newSessionId);
  return newSessionId;
};

const extractReplyFromResponse = (data: any): string => {
  if (!data) return 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';

  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    const joined = data.map((item) => extractReplyFromResponse(item)).filter(Boolean).join('\n');
    return joined || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
  }

  return (
    data.reply ||
    data.output ||
    data.response ||
    data.message ||
    data.text ||
    data.answer ||
    data.content ||
    (typeof data.data === 'string' ? data.data : undefined) ||
    'Xin lỗi, tôi không thể trả lời ngay bây giờ.'
  );
};

const normalizeChatContext = (context: any): ChatContext | undefined => {
  if (!context || context.type !== 'products' || !Array.isArray(context.products)) {
    return undefined;
  }

  const products: Product[] = context.products
    .map((product: any) => {
      if (!product) return undefined;
      const id = String(product.id || product._id || product.productId || product.sku || '');
      if (!id) return undefined;
      return {
        id,
        name: product.name || product.title || 'Sản phẩm',
        price: Number(product.price || product.cost || 0),
        description: product.description || product.summary || '',
        image: product.image || product.thumbnail || '',
        categories: product.categories || product.category || '',
      } as Product;
    })
    .filter(Boolean) as Product[];

  if (!products.length) {
    return undefined;
  }

  const displayType = ['single', 'list', 'pagination'].includes(context.displayType)
    ? context.displayType
    : 'list';

  return {
    type: 'products',
    displayType,
    page: Number(context.page) || 1,
    totalProducts: Number(context.totalProducts) || products.length,
    products,
    orderInfo: context.orderInfo,
  };
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

// Câu hỏi thường gặp
const FAQ_QUESTIONS = [
  "Xin chào",
  "Bạn có những món ăn gì?",
  "Cách đặt bàn như thế nào?",
  "Thực đơn combo của bạn?",
];

const ChatBox: React.FC = () => {
  const initialUserId = getUserId();
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(initialUserId);
  const [sessionId, setSessionId] = useState(() => getExistingSessionId(initialUserId));
  const [messages, setMessages] = useState<Message[]>(() => getChatHistory(initialUserId));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showFAQ, setShowFAQ] = useState(true); // Hiển thị FAQ khi mở chatbox
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    saveChatHistory(messages, userId);
  }, [messages, userId]);

  useEffect(() => {
    const handleUnload = () => clearGuestChat(userId);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [userId]);

  useEffect(() => {
    const loadedMessages = getChatHistory(userId);
    setMessages(loadedMessages);
    // Hiển thị FAQ khi load lại trang nếu chưa có tin nhắn
    setShowFAQ(loadedMessages.length === 0);
    const ensuredSessionId = getExistingSessionId(userId);
    setSessionId(ensuredSessionId);
  }, [userId]);


  useEffect(() => {
    const handleStorage = () => {
      const updatedUserId = getUserId();
      setUserId(updatedUserId);
      setSessionId(getExistingSessionId(updatedUserId));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Khi mở chatbox, hiển thị FAQ nếu chưa có tin nhắn
      setShowFAQ(messages.length === 0);
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [isOpen, messages.length]);

  // Detect scroll position to adjust chat button position
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // ScrollToTopButton xuất hiện khi scrollTop > 80
      setShowScrollToTop(scrollTop > 80);
    };
    
    // Check initial scroll position
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend) return;

    // Ẩn FAQ khi người dùng bắt đầu chat
    setShowFAQ(false);

    const userMessage = { text: messageToSend, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const currentSessionId = sessionId || getExistingSessionId(userId);

    try {
      // Gọi qua backend proxy để tránh lỗi CORS
      const response = await fetch(`${API_URL}/api/n8n/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: messageToSend,
          userId,
          sessionId: currentSessionId,
          context: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.reply || `Lỗi ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const reply = data.reply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
      const normalizedContext = normalizeChatContext(data.context || null);

      const activeSessionId = data.sessionId || currentSessionId;
      setSessionId(activeSessionId);
      sessionStorage.setItem('n8n_session_id', activeSessionId);

      setMessages(prev => [...prev, {
        text: reply,
        isUser: false,
        context: normalizedContext,
      }]);
    } catch (error) {
      console.error('Error sending message to N8N:', error);
      const errorMessage = error instanceof Error ? error.message : 'Xin lỗi, đã có lỗi xảy ra khi kết nối với trợ lý.';
      setMessages(prev => [...prev, {
        text: errorMessage,
        isUser: false,
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
          className={`chat-button ${showScrollToTop ? 'scrolled' : ''}`}
          onClick={() => setIsOpen(true)}
        >
          <FaComments />
        </button>
      )}
      {isOpen && (
        <div className="chat-box">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-header-icon">
                <FaComments />
              </div>
              <h3>Trợ lý Ice Restaurents - Tũn</h3>
            </div>
            <button
              className="chat-close-button"
              onClick={() => {
                setIsOpen(false);
                // Khi đóng chatbox, reset showFAQ để hiển thị lại khi mở
                if (messages.length === 0) {
                  setShowFAQ(true);
                }
              }}
              aria-label="Đóng chat"
            >
              <FaTimes />
            </button>
          </div>
          <div className="messages">
            {showFAQ && (
              <div className="welcome-message">
                <div className="welcome-icon">
                  <FaComments />
                </div>
                <p>Chào bạn! Tôi có thể giúp gì cho bạn?</p>
                <div className="faq-questions">
                  <p className="faq-title">Câu hỏi thường gặp:</p>
                  <div className="faq-grid">
                    {FAQ_QUESTIONS.map((question, index) => (
                      <button
                        key={index}
                        className="faq-button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSend(question);
                        }}
                        disabled={isLoading}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`message-${index}`}
                className={`message ${message.isUser ? 'user' : 'ai'}`}
              >
                <div className="message-content">
                  <p className="message-text">{message.text}</p>
                  {message.context && (
                    <div className="message-context">
                      {renderProducts(message.context)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-content typing">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">Đang phản hồi...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
                className="chat-input"
              />
              <button
                className="send-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                disabled={isLoading || !input.trim()}
                aria-label="Gửi tin nhắn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBox; 