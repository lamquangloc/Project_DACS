import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaShoppingCart, FaInfoCircle, FaComments, FaTimes, FaReceipt, FaCalendarAlt, FaUser, FaUserEdit, FaPhone, FaMapMarkerAlt, FaStickyNote } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

import './ChatBox.css';
import { message } from 'antd';
import { API_URL } from '../config/config';
import { getImageUrl } from '../utils/image';

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

interface QRCodeData {
  qrCodeUrl: string;
  qrDataUrl?: string;
  qrContent?: string;
}

interface OrderData {
  id?: string;
  orderCode?: string;
  total?: number;
  qrCode?: QRCodeData;
  paymentStatus?: string; // PENDING, PAID, FAILED
  status?: string; // PENDING, CONFIRMED, DELIVERING, DELIVERED, CANCELLED
  items?: Array<{
    id?: string;
    name?: string;
    price?: number;
    quantity?: number;
    image?: string;
    product?: any;
    combo?: any;
  }>;
  phoneNumber?: string;
  address?: string;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  note?: string;
  createdAt?: string;
}

interface Message {
  text: string;
  isUser: boolean;
  context?: ChatContext;
  orderData?: OrderData; // ✅ Thêm order data để hiển thị QR code
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

/**
 * Component hiển thị QR code thanh toán với polling và nút xác nhận
 */
interface QRCodePaymentCardProps {
  orderData: OrderData;
  onPaymentConfirmed: (orderData: OrderData) => void;
}

// ✅ Component hiển thị thông tin đơn hàng (khi tra cứu đơn hàng)
interface OrderInfoCardProps {
  orderData: OrderData;
}

const OrderInfoCard: React.FC<OrderInfoCardProps> = ({ orderData }) => {
  const navigate = useNavigate();

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'PENDING': return 'Đang chờ';
      case 'CONFIRMED': return 'Đã xác nhận';
      case 'DELIVERING': return 'Đang giao';
      case 'DELIVERED': return 'Đã giao';
      case 'CANCELLED': return 'Đã hủy';
      default: return status || 'N/A';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PENDING': return '#faad14';
      case 'CONFIRMED': return '#1890ff';
      case 'DELIVERING': return '#722ed1';
      case 'DELIVERED': return '#52c41a';
      case 'CANCELLED': return '#ff4d4f';
      default: return '#999';
    }
  };

  const getPaymentStatusText = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'PENDING': return 'Chưa thanh toán';
      case 'PAID': return 'Đã thanh toán';
      case 'FAILED': return 'Thanh toán thất bại';
      default: return paymentStatus || 'N/A';
    }
  };

  const getPaymentStatusColor = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'PENDING': return '#faad14';
      case 'PAID': return '#52c41a';
      case 'FAILED': return '#ff4d4f';
      default: return '#999';
    }
  };

  const handleViewDetail = () => {
    if (orderData.id) {
      // Navigate to order detail page (client side)
      navigate(`/profile/order/${orderData.id}`);
    }
  };

  // ✅ Helper để render product card cho item
  const renderOrderItemCard = (item: any, index: number) => {
    // ✅ Lấy thông tin từ nhiều nguồn (item trực tiếp, product, combo)
    const itemName = item.name || item.product?.name || item.combo?.name || 'N/A';
    const itemPrice = item.price || item.product?.price || item.combo?.price || 0;
    const itemImage = item.image || item.product?.image || item.combo?.image || null;
    const itemQuantity = item.quantity || 1;
    const productId = item.productId || item.product?.id || item.product?._id;
    const comboId = item.comboId || item.combo?.id || item.combo?._id;
    
    // ✅ Lấy image URL với fallback
    let imageUrl: string | null = null;
    if (itemImage) {
      imageUrl = getImageUrl(itemImage);
    } else if (productId) {
      // Nếu không có image nhưng có productId, có thể fetch sau (tùy chọn)
      // Hiện tại chỉ hiển thị placeholder
    } else if (comboId) {
      // Nếu không có image nhưng có comboId, có thể fetch sau (tùy chọn)
      // Hiện tại chỉ hiển thị placeholder
    }

    return (
      <div
        key={index}
        className="product-list-item"
        style={{
          marginBottom: '8px',
        }}
      >
        <div className="product-card-inline">
          <div className="product-card-image-wrapper">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={itemName}
                className="product-card-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                loading="lazy"
              />
            ) : (
              <div className="product-card-placeholder">
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🍽️</span>
              </div>
            )}
          </div>
          <div className="product-card-content">
            <span className="product-card-name">
              {itemName}
            </span>
            <span className="product-card-price">
              {itemPrice.toLocaleString('vi-VN')}₫ x {itemQuantity}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '12px',
        backgroundColor: '#fafafa',
        maxWidth: '100%',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, marginBottom: '12px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
          Thông tin đơn hàng
        </h4>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Mã đơn hàng:</strong> <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{orderData.orderCode || 'N/A'}</code>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Trạng thái đơn hàng:</strong>{' '}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: getStatusColor(orderData.status) + '20',
              color: getStatusColor(orderData.status),
            }}
          >
            {getStatusText(orderData.status)}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Trạng thái thanh toán:</strong>{' '}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: getPaymentStatusColor(orderData.paymentStatus) + '20',
              color: getPaymentStatusColor(orderData.paymentStatus),
            }}
          >
            {getPaymentStatusText(orderData.paymentStatus)}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Tổng cộng:</strong> {orderData.total?.toLocaleString('vi-VN')}₫
        </div>
        {orderData.createdAt && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Ngày đặt:</strong> {new Date(orderData.createdAt).toLocaleString('vi-VN')}
          </div>
        )}
        {orderData.phoneNumber && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Số điện thoại:</strong> {orderData.phoneNumber}
          </div>
        )}
        {orderData.address && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Địa chỉ:</strong>{' '}
            {[
              orderData.address,
              orderData.wardName,
              orderData.districtName,
              orderData.provinceName,
            ]
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
        {orderData.note && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Ghi chú:</strong> {orderData.note}
          </div>
        )}
      </div>

      {orderData.items && orderData.items.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
            Danh sách món:
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {orderData.items.map((item, index) => renderOrderItemCard(item, index))}
          </div>
        </div>
      )}

      {orderData.id && (
        <button
          onClick={handleViewDetail}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginTop: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#40a9ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1890ff';
          }}
        >
          Xem chi tiết đơn hàng
        </button>
      )}
    </div>
  );
};

const QRCodePaymentCard: React.FC<QRCodePaymentCardProps> = ({ orderData, onPaymentConfirmed }) => {
  const [paymentStatus, setPaymentStatus] = useState<string>(orderData.paymentStatus || 'PENDING');
  const [isChecking, setIsChecking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = localStorage.getItem('token');

  // ✅ Polling tự động để kiểm tra trạng thái thanh toán
  useEffect(() => {
    if (!orderData.id || paymentStatus === 'PAID') {
      // Dừng polling nếu đã thanh toán hoặc không có orderId
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // ⚠️ QUAN TRỌNG: Clear interval cũ trước khi tạo mới (tránh multiple intervals)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let shouldStopPolling = false; // Flag để dừng polling khi order không tồn tại

    const checkPaymentStatus = async () => {
      // Tránh gọi đồng thời bằng cách check isChecking
      if (isChecking || shouldStopPolling) {
        console.log('⏸️ Payment check already in progress or stopped, skipping...');
        return;
      }
      
      try {
        setIsChecking(true);
        const response = await fetch(`${API_URL}/api/payments/status/${orderData.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // ⚠️ QUAN TRỌNG: Kiểm tra nếu order không tồn tại
          if (!data.success || !data.data) {
            console.error('❌ Order not found or invalid:', orderData.id);
            message.error('Đơn hàng không tồn tại. Vui lòng kiểm tra lại mã đơn hàng.');
            shouldStopPolling = true;
            // Dừng polling ngay lập tức
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          const newStatus = data.data.paymentStatus;
          setPaymentStatus(newStatus);
          
          if (newStatus === 'PAID') {
            // Dừng polling khi đã thanh toán
            shouldStopPolling = true;
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            // Cập nhật orderData và gọi callback
            const updatedOrderData = { ...orderData, paymentStatus: 'PAID' };
            onPaymentConfirmed(updatedOrderData);
            message.success('Thanh toán thành công!');
          }
        } else if (response.status === 404) {
          // ⚠️ QUAN TRỌNG: Nếu order không tồn tại (404), dừng polling ngay
          console.error('❌ Order not found (404):', orderData.id);
          message.error('Đơn hàng không tồn tại. Vui lòng kiểm tra lại mã đơn hàng.');
          shouldStopPolling = true;
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // ⚠️ Nếu lỗi network hoặc lỗi khác, vẫn tiếp tục polling (có thể là tạm thời)
        // Chỉ dừng nếu lỗi rõ ràng là order không tồn tại
      } finally {
        setIsChecking(false);
      }
    };

    // Kiểm tra ngay lập tức (chỉ 1 lần)
    checkPaymentStatus();

    // Polling mỗi 10 giây (tăng từ 5 giây để giảm tải server)
    // ⚠️ CHỈ tạo interval nếu chưa dừng
    if (!shouldStopPolling) {
      pollingIntervalRef.current = setInterval(() => {
        if (!shouldStopPolling) {
          checkPaymentStatus();
        } else {
          // Dừng interval nếu flag đã được set
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 10000);
    }

    // Cleanup khi component unmount hoặc dependencies thay đổi
    return () => {
      shouldStopPolling = true; // Set flag để dừng polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // ⚠️ QUAN TRỌNG: Loại bỏ isChecking khỏi dependencies để tránh re-run useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderData.id, paymentStatus, token, onPaymentConfirmed]);

  // ✅ Xác nhận thanh toán thủ công
  const handleConfirmPayment = async () => {
    // ✅ QUAN TRỌNG: Nếu không có id nhưng có orderCode, fetch id từ database
    let orderId = orderData.id;
    if (!orderId && orderData.orderCode) {
      try {
        const response = await fetch(`${API_URL}/api/orders/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const order = data.orders?.find((o: any) => o.orderCode === orderData.orderCode);
          if (order) {
            orderId = order.id;
            // Cập nhật orderData với id
            orderData = { ...orderData, id: orderId };
            console.log('✅ Fetched order id from database:', orderId);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching order id:', error);
      }
    }
    
    if (!orderId) {
      message.error('Không tìm thấy mã đơn hàng. Vui lòng thử lại sau.');
      return;
    }

    try {
      setIsConfirming(true);
      const response = await fetch(`${API_URL}/api/payments/confirm/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPaymentStatus('PAID');
          // Dừng polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Cập nhật orderData và gọi callback
          const updatedOrderData = { ...orderData, paymentStatus: 'PAID' };
          onPaymentConfirmed(updatedOrderData);
          message.success('Đã xác nhận thanh toán thành công!');
        } else {
          message.error(data.message || 'Không thể xác nhận thanh toán');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        message.error(errorData.message || 'Có lỗi xảy ra khi xác nhận thanh toán');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      message.error('Có lỗi xảy ra khi xác nhận thanh toán');
    } finally {
      setIsConfirming(false);
    }
  };

  const isPaid = paymentStatus === 'PAID';

  return (
    <div className="order-qr-code" style={{
      marginTop: '16px',
      padding: '16px',
      border: isPaid ? '2px solid #4caf50' : '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: isPaid ? '#f1f8f4' : '#f9f9f9',
      textAlign: 'center'
    }}>
      {isPaid ? (
        <>
          <div style={{ fontSize: '18px', color: '#4caf50', marginBottom: '12px', fontWeight: 'bold' }}>
            ✅ Đã thanh toán thành công
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Mã đơn hàng:</strong> {orderData.orderCode}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Số tiền:</strong> {orderData.total?.toLocaleString('vi-VN')}₫
          </div>
        </>
      ) : (
        <>
          <h4 style={{ marginBottom: '12px', color: '#333' }}>
            Quét mã QR để thanh toán
          </h4>
          <div style={{ marginBottom: '12px' }}>
            <img 
              src={orderData.qrCode?.qrCodeUrl} 
              alt="QR Code thanh toán" 
              style={{
                maxWidth: '250px',
                width: '100%',
                height: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: '#fff'
              }}
            />
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Mã đơn hàng:</strong> {orderData.orderCode}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Số tiền:</strong> {orderData.total?.toLocaleString('vi-VN')}₫
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
            Vui lòng quét mã QR bằng ứng dụng ngân hàng để thanh toán
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '12px',
            fontStyle: 'italic'
          }}>
            {isChecking ? 'Đang kiểm tra trạng thái thanh toán...' : 'Đang tự động kiểm tra trạng thái thanh toán...'}
          </div>
          <button
            onClick={handleConfirmPayment}
            disabled={isConfirming || isPaid}
            style={{
              padding: '10px 20px',
              backgroundColor: isPaid ? '#ccc' : '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isPaid || isConfirming ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              width: '100%',
              maxWidth: '250px',
              opacity: isPaid || isConfirming ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {isConfirming ? 'Đang xác nhận...' : isPaid ? 'Đã thanh toán' : 'Tôi đã thanh toán'}
          </button>
        </>
      )}
    </div>
  );
};

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
  
  // ✅ Protection: Prevent duplicate requests
  const isSendingRef = useRef(false);
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  
  // ✅ Cache products data để tạo product cards
  const [productsCache, setProductsCache] = useState<Map<string, { 
    id: string; 
    name: string; 
    image?: string; 
    price?: number;
    slug?: string;
  }>>(new Map());
  
  // ✅ Cache combos data để tạo combo cards
  const [combosCache, setCombosCache] = useState<Map<string, { 
    id: string; 
    name: string; 
    image?: string; 
    price?: number;
    slug?: string;
  }>>(new Map());
  
  // ✅ State để trigger re-render khi image được fetch
  const [imageUpdateTrigger, setImageUpdateTrigger] = useState(0);

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

  // ✅ Helper: Normalize text để so sánh (remove dấu, lowercase, remove special chars)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove dấu
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
  };

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

  // ✅ Fetch TẤT CẢ products để cache data cho product cards (với pagination)
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        let allProducts: any[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 100; // Lấy nhiều products mỗi lần
        
        // ✅ Fetch tất cả products với pagination
        while (hasMore) {
          try {
            const response = await fetch(`${API_URL}/api/products?page=${page}&limit=${limit}`);
            const data = await response.json();
            
            const products = data.data?.items || 
                            data.data?.products || 
                            data.products || 
                            data.data || [];
            
            if (products.length === 0) {
              hasMore = false;
              break;
            }
            
            allProducts = [...allProducts, ...products];
            
            // Kiểm tra xem còn trang tiếp theo không
            const totalPages = data.data?.totalPages || data.totalPages || 1;
            const currentPage = data.data?.currentPage || data.current || page;
            
            if (currentPage >= totalPages || products.length < limit) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (pageError) {
            console.error(`Error fetching page ${page}:`, pageError);
            hasMore = false;
          }
        }
        
        console.log(`📦 Fetched ALL products: ${allProducts.length} total`);
        if (allProducts.length > 0) {
          console.log('📦 Sample product:', allProducts[0]);
        }
        
        const cache = new Map<string, { id: string; name: string; image?: string; price?: number; slug?: string }>();
        let productsWithImage = 0;
        let productsWithoutImage = 0;
        
        allProducts.forEach((product: any) => {
          if (product.name && (product.id || product._id)) {
            const normalizedName = normalizeText(product.name);
            const originalName = product.name.toLowerCase().trim();
            
            // ✅ Lấy image từ nhiều nguồn có thể
            let imagePath = product.image || 
                          product.imagePath || 
                          product.thumbnail || 
                          product.images?.[0] ||
                          null;
            
            if (imagePath) {
              productsWithImage++;
            } else {
              productsWithoutImage++;
            }
            
            const productData = {
              id: product.id || product._id,
              name: product.name,
              image: imagePath,
              price: product.price ? Number(product.price) : undefined,
              slug: `${removeVietnameseTones(product.name)}-${product.id || product._id}`
            };
            
            // ✅ Store với nhiều keys để dễ tìm
            cache.set(normalizedName, productData);
            cache.set(originalName, productData);
            
            // ✅ Store với tên không có dấu (để match tốt hơn)
            const nameWithoutTones = removeVietnameseTones(product.name).toLowerCase();
            if (nameWithoutTones !== normalizedName) {
              cache.set(nameWithoutTones, productData);
            }
            
            // ✅ Store với từng từ trong tên (để fuzzy match)
            const words = product.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
            words.forEach((word: string) => {
              if (word.length > 3) {
                // Store với key là từ quan trọng (ví dụ: "cá kho" từ "Cá Kho Làng Vũ Đại")
                const importantWords = words.filter((w: string) => w.length > 3);
                if (importantWords.length > 0) {
                  const key = importantWords.join(' ');
                  if (key !== normalizedName && key !== originalName) {
                    cache.set(key, productData);
                  }
                }
              }
            });
          }
        });
        
        setProductsCache(cache);
        console.log(`✅ Products cached: ${cache.size} entries from ${allProducts.length} products`);
        console.log(`🖼️ Products with image: ${productsWithImage}, without: ${productsWithoutImage}`);
        
        // Log một vài products để kiểm tra
        const sampleProducts = Array.from(new Set(cache.values())).slice(0, 5);
        sampleProducts.forEach(p => {
          console.log(`📋 Product: ${p.name}, Image: ${p.image ? 'YES' : 'NO'}`);
        });
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    
    fetchAllProducts();
  }, []);

  // ✅ Fetch TẤT CẢ combos để cache data cho combo cards
  useEffect(() => {
    const fetchAllCombos = async () => {
      try {
        let allCombos: any[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 100;
        
        while (hasMore) {
          try {
            const response = await fetch(`${API_URL}/api/combos?page=${page}&limit=${limit}`);
            const data = await response.json();
            
            const combos = data.data?.items || 
                          data.data?.combos || 
                          data.combos || 
                          data.data || [];
            
            if (combos.length === 0) {
              hasMore = false;
              break;
            }
            
            allCombos = [...allCombos, ...combos];
            
            const totalPages = data.data?.totalPages || data.totalPages || 1;
            const currentPage = data.data?.currentPage || data.current || page;
            
            if (currentPage >= totalPages || combos.length < limit) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (pageError) {
            console.error(`Error fetching combo page ${page}:`, pageError);
            hasMore = false;
          }
        }
        
        console.log(`📦 Fetched ALL combos: ${allCombos.length} total`);
        
        const cache = new Map<string, { id: string; name: string; image?: string; price?: number; slug?: string }>();
        
        allCombos.forEach((combo: any) => {
          if (combo.name && (combo.id || combo._id)) {
            const normalizedName = normalizeText(combo.name);
            const originalName = combo.name.toLowerCase().trim();
            
            let imagePath = combo.image || 
                          combo.imagePath || 
                          combo.thumbnail || 
                          combo.images?.[0] ||
                          null;
            
            const comboData = {
              id: combo.id || combo._id,
              name: combo.name,
              image: imagePath,
              price: combo.price ? Number(combo.price) : undefined,
              slug: `${removeVietnameseTones(combo.name)}-${combo.id || combo._id}`
            };
            
            // Store với nhiều keys để dễ tìm
            cache.set(normalizedName, comboData);
            cache.set(originalName, comboData);
            
            const nameWithoutTones = removeVietnameseTones(combo.name).toLowerCase();
            if (nameWithoutTones !== normalizedName) {
              cache.set(nameWithoutTones, comboData);
            }
            
            // Store với từ "combo" + tên (ví dụ: "combo cặp đôi")
            const comboKey = `combo ${normalizedName}`;
            cache.set(comboKey, comboData);
            
            // Store với tên không có "combo" prefix (nếu tên có "combo")
            const nameWithoutCombo = combo.name.replace(/^combo\s+/i, '').trim();
            if (nameWithoutCombo !== combo.name) {
              const normalizedWithoutCombo = normalizeText(nameWithoutCombo);
              cache.set(normalizedWithoutCombo, comboData);
              cache.set(`combo ${normalizedWithoutCombo}`, comboData);
            }
            
            console.log('📦 [Combo Cache] Cached combo:', {
              name: combo.name,
              normalizedName,
              hasImage: !!imagePath,
              keys: [normalizedName, originalName, comboKey]
            });
          }
        });
        
        setCombosCache(cache);
        console.log(`✅ Combos cached: ${cache.size} entries from ${allCombos.length} combos`);
      } catch (error) {
        console.error('Failed to fetch combos:', error);
      }
    };
    
    fetchAllCombos();
  }, []);

  // ✅ Helper: Extract product name và price từ text
  // Ví dụ: "Canh Cua Cà Pháo - 110.000đ" → { name: "Canh Cua Cà Pháo", price: "110.000đ" }
  // ⚠️ QUAN TRỌNG: ReactMarkdown đã loại bỏ dấu `-` ở đầu list item, nên text sẽ là "Tên - giá" (không có dấu `-` ở đầu)
  // ✅ Cache kết quả extractProductInfo để tránh tính toán lại
  const extractProductInfoCache = useRef<Map<string, { name: string; price?: string } | null>>(new Map());

  const extractProductInfo = useCallback((text: string): { name: string; price?: string } | null => {
    if (!text || typeof text !== 'string') return null;
    
    // ✅ Check cache trước
    const cacheKey = text.trim();
    if (extractProductInfoCache.current.has(cacheKey)) {
      return extractProductInfoCache.current.get(cacheKey) || null;
    }
    
    // Remove markdown formatting và clean
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    
    // ✅ Pattern 0: Bắt đầu bằng dấu `-` (list item format với dấu `-` còn lại) - ƯU TIÊN CAO NHẤT
    // Ví dụ: "- Canh Cua Cà Pháo - 110.000₫" (trường hợp hiếm, ReactMarkdown thường loại bỏ dấu `-` ở đầu)
    const match0 = cleanText.match(/^-\s*(.+?)\s*-\s*([\d.,\s]+[₫đ]?)$/i);
    if (match0) {
      const name = match0[1].trim();
      const priceStr = match0[2].trim();
      const priceNum = priceStr.replace(/[^\d]/g, '');
      if (name.length >= 3 && priceNum.length >= 3) {
        const result = {
          name,
          price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
        };
        extractProductInfoCache.current.set(cacheKey, result);
        return result;
      }
    }
    
    // ✅ Pattern 0.5: "Tên món với giá X₫" hoặc "món Tên món với giá X₫" (AI trả lời trong paragraph)
    // Ví dụ: "Lẩu Gà Tre Lá Giang với giá 250.000₫" hoặc "món Lẩu Gà Tre Lá Giang với giá 250.000₫"
    // ⚠️ QUAN TRỌNG: Pattern phải match được cả khi có text trước (ví dụ: "Vậy bạn có thể thử món Lẩu Gà Tre Lá Giang với giá 250.000₫")
    // Tìm pattern "với giá [số]₫" và lấy text trước đó làm tên món
    const withPriceIndex = cleanText.toLowerCase().indexOf('với giá');
    if (withPriceIndex > 0) {
      const beforeWithPrice = cleanText.substring(0, withPriceIndex).trim();
      const afterWithPrice = cleanText.substring(withPriceIndex + 8).trim(); // "với giá" = 8 ký tự
      const priceMatch = afterWithPrice.match(/^([\d.,\s]+[₫đ])/i);
      
      if (priceMatch) {
        const priceStr = priceMatch[1].trim();
        const priceNum = priceStr.replace(/[^\d]/g, '');
        
        // Lấy tên món từ phần trước "với giá"
        // Loại bỏ các từ khóa thường gặp ở đầu: "món", "sản phẩm", "item"
        let name = beforeWithPrice.replace(/^(món|sản\s*phẩm|item|thử\s+món|bạn\s+có\s+thể\s+thử\s+món):?\s*/i, '').trim();
        
        // Nếu name vẫn còn dài, có thể có text trước tên món, tìm tên món (thường bắt đầu bằng chữ hoa hoặc là từ dài)
        // Ví dụ: "Vậy bạn có thể thử món Lẩu Gà Tre Lá Giang" → name = "Lẩu Gà Tre Lá Giang"
        const words = name.split(/\s+/);
        const productNameWords: string[] = [];
        let foundProductStart = false;
        
        for (const word of words) {
          // Tên món thường bắt đầu bằng chữ hoa hoặc là từ dài (>= 3 ký tự)
          if (!foundProductStart && (word[0] === word[0].toUpperCase() || word.length >= 3)) {
            foundProductStart = true;
          }
          if (foundProductStart) {
            productNameWords.push(word);
          }
        }
        
        if (productNameWords.length > 0) {
          name = productNameWords.join(' ');
        }
        
        if (name.length >= 3 && priceNum.length >= 3) {
          const result = {
            name: name.trim(),
            price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
          };
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // ✅ Pattern 0.6: "Tên món giá X₫" hoặc "món Tên món giá X₫" (không có "với")
    // Ví dụ: "Lẩu Gà Tre Lá Giang giá 250.000₫"
    const priceIndex = cleanText.toLowerCase().indexOf(' giá ');
    if (priceIndex > 0) {
      const beforePrice = cleanText.substring(0, priceIndex).trim();
      const afterPrice = cleanText.substring(priceIndex + 5).trim(); // " giá " = 5 ký tự
      const priceMatch = afterPrice.match(/^([\d.,\s]+[₫đ])/i);
      
      if (priceMatch) {
        const priceStr = priceMatch[1].trim();
        const priceNum = priceStr.replace(/[^\d]/g, '');
        
        // Lấy tên món từ phần trước "giá"
        let name = beforePrice.replace(/^(món|sản\s*phẩm|item|thử\s+món|bạn\s+có\s+thể\s+thử\s+món):?\s*/i, '').trim();
        
        // Tương tự như pattern 0.5, tìm tên món thực sự
        const words = name.split(/\s+/);
        const productNameWords: string[] = [];
        let foundProductStart = false;
        
        for (const word of words) {
          if (!foundProductStart && (word[0] === word[0].toUpperCase() || word.length >= 3)) {
            foundProductStart = true;
          }
          if (foundProductStart) {
            productNameWords.push(word);
          }
        }
        
        if (productNameWords.length > 0) {
          name = productNameWords.join(' ');
        }
        
        if (name.length >= 3 && priceNum.length >= 3) {
          const result = {
            name: name.trim(),
            price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
          };
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // ✅ Pattern 1: "Tên món - giá" với ₫ hoặc đ ở cuối - ƯU TIÊN CAO (phổ biến nhất)
    // Ví dụ: "Salad Cải Mầm Trứng - 89.000₫" hoặc "Cá Kho Làng Vũ Đại - 500g - 250.000₫"
    // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
    // Tìm dấu `-` cuối cùng trước giá (có ₫ hoặc đ)
    const lastDashIndex = cleanText.lastIndexOf(' - ');
    if (lastDashIndex > 0) {
      const afterLastDash = cleanText.substring(lastDashIndex + 3).trim();
      const priceMatch = afterLastDash.match(/^([\d.,\s]+[₫đ])$/i);
      
      if (priceMatch) {
        const price = priceMatch[1].trim();
        const priceNum = price.replace(/[^\d]/g, '');
        
        // Lấy phần trước dấu `-` cuối cùng làm tên món
        const namePart = cleanText.substring(0, lastDashIndex).trim();
        
        // Loại bỏ các từ khóa thường gặp ở đầu
        const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
        
        // Kiểm tra: tên phải có ít nhất 3 ký tự và giá phải có ít nhất 3 chữ số
        if (cleanedName.length >= 3 && priceNum.length >= 3) {
          const result = { name: cleanedName, price };
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // Pattern 2: "Tên món - số" (không có ₫, thêm ₫ vào)
    // Ví dụ: "Canh Cua Cà Pháo - 110.000" hoặc "Salad Cải Mầm Trứng - 89.000"
    // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
    const lastDashIndex2 = cleanText.lastIndexOf(' - ');
    if (lastDashIndex2 > 0) {
      const afterLastDash2 = cleanText.substring(lastDashIndex2 + 3).trim();
      const priceMatch2 = afterLastDash2.match(/^([\d.,\s]+)$/);
      
      if (priceMatch2) {
        const priceStr = priceMatch2[1].trim();
      const priceNum = priceStr.replace(/[^\d]/g, '');
        
        // Lấy phần trước dấu `-` cuối cùng làm tên món
        const namePart = cleanText.substring(0, lastDashIndex2).trim();
        const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
        
        if (cleanedName.length >= 3 && priceNum.length >= 3) {
          const result = {
            name: cleanedName,
          price: `${priceStr}₫`
        };
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // Pattern 3: "**Tên món** - giá" (markdown bold)
    const match3 = cleanText.match(/^\*\*(.+?)\*\*\s*-\s*([\d.,\s]+[₫đ]?)$/i);
    if (match3) {
      const name = match3[1].trim();
      const priceStr = match3[2].trim();
      if (name.length > 2) {
        const result = {
          name,
          price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
        };
        extractProductInfoCache.current.set(cacheKey, result);
        return result;
      }
    }
    
    // ✅ Pattern 4: Tìm pattern "Tên - giá" ở bất kỳ đâu trong text (không chỉ ở đầu)
    // Ví dụ: "Giỏ hàng: Canh Cua Cà Pháo - 110.000₫" hoặc "Món: Lẩu Gà Tre Lá Giang - 250.000₫"
    // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
    const lastDashIndex4 = cleanText.lastIndexOf(' - ');
    if (lastDashIndex4 > 0) {
      const afterLastDash4 = cleanText.substring(lastDashIndex4 + 3).trim();
      const priceMatch4 = afterLastDash4.match(/^([\d.,\s]+[₫đ])/i);
      
      if (priceMatch4) {
        const price = priceMatch4[1].trim();
        const priceNum = price.replace(/[^\d]/g, '');
        
        // Lấy phần trước dấu `-` cuối cùng làm tên món
        const namePart = cleanText.substring(0, lastDashIndex4).trim();
        const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
        
        if (cleanedName.length >= 3 && priceNum.length >= 3) {
          const result = { name: cleanedName, price };
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // ✅ Pattern 5: Tìm pattern "Tên - số" ở bất kỳ đâu trong text (không có ₫)
    // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
    const lastDashIndex5 = cleanText.lastIndexOf(' - ');
    if (lastDashIndex5 > 0) {
      const afterLastDash5 = cleanText.substring(lastDashIndex5 + 3).trim();
      const priceMatch5 = afterLastDash5.match(/^([\d.,\s]+)$/);
      
      if (priceMatch5) {
        const priceStr = priceMatch5[1].trim();
        const priceNum = priceStr.replace(/[^\d]/g, '');
        
        // Lấy phần trước dấu `-` cuối cùng làm tên món
        const namePart = cleanText.substring(0, lastDashIndex5).trim();
        const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
        
        if (cleanedName.length >= 3 && priceNum.length >= 3) {
          const result = {
            name: cleanedName,
            price: `${priceStr}₫`
          };
          // ✅ Cache kết quả
          extractProductInfoCache.current.set(cacheKey, result);
          return result;
        }
      }
    }
    
    // ✅ Cache null result để tránh tính toán lại
    extractProductInfoCache.current.set(cacheKey, null);
    return null;
  }, []);

  // ✅ Helper: Loại bỏ các dòng sản phẩm bị lặp lại (ví dụ: cùng món xuất hiện cả dạng bullet và dạng text)
  const removeDuplicateProductLines = (text: string): string => {
    if (!text) return text;
    
    const lines = text.split('\n');
    const processedLines: string[] = [];
    const bulletProductKeys = new Set<string>(); // Các sản phẩm đã xuất hiện trong bullet list
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        processedLines.push(line);
        continue;
      }
      
      const isBulletLine = /^(\s*[-•*]\s+|\s*\d+\.\s+)/.test(trimmedLine);
      const lineWithoutBullet = trimmedLine.replace(/^(\s*[-•*]\s+|\s*\d+\.\s+)/, '').trim();
      const productInfo = extractProductInfo(lineWithoutBullet);
      
      if (productInfo) {
        const productKey = `${normalizeText(productInfo.name)}|${productInfo.price || ''}`;
        
        if (!isBulletLine && bulletProductKeys.has(productKey)) {
          // ⚠️ Đây là dòng text trùng với sản phẩm đã hiển thị trong bullet → bỏ qua để tránh hiển thị 2 lần
          continue;
        }
        
        if (isBulletLine) {
          bulletProductKeys.add(productKey);
        }
      }
      
      processedLines.push(line);
    }
    
    return processedLines.join('\n').replace(/\n{3,}/g, '\n\n');
  };

  // ✅ Helper: Extract combo info từ text dài (ví dụ: "Nhà hàng có Combo cặp đôi với mô tả..., giá 650.000₫")
  const extractComboInfo = (text: string): { name: string; price?: string } | null => {
    if (!text || typeof text !== 'string') return null;
    
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    const lowerText = cleanText.toLowerCase();
    
    // Chỉ xử lý nếu có từ "combo"
    if (!lowerText.includes('combo')) return null;
    
    // Pattern 1: "Combo [tên]" hoặc "- Combo [tên] - giá" - extract tên combo (cải thiện regex)
    // Ví dụ: "Combo cặp đôi" hoặc "Nhà hàng có Combo cặp đôi với mô tả..." hoặc "- Combo cặp đôi - 650.000₫"
    // Hỗ trợ format list item: "- Combo cặp đôi - 650.000₫"
    // Pattern cải thiện: match "- Combo [tên] - [giá]" hoặc "Combo [tên]"
    const comboWithPriceMatch = cleanText.match(/(?:^|\s|-)\s*(?:combo\s+)([^-]+?)\s*-\s*([\d.,\s]+[₫đ]?)(?:\s|$)/i);
    if (comboWithPriceMatch) {
      let comboName = comboWithPriceMatch[1].trim();
      const priceStr = comboWithPriceMatch[2].trim();
      
      // Loại bỏ các từ thừa ở cuối
      comboName = comboName.replace(/\s+(với|mô\s+tả|là|giá).*$/i, '').trim();
      
      // Format price
      let price = priceStr;
      if (!price.includes('₫') && !price.includes('đ')) {
        price = `${price}₫`;
      }
      
      if (comboName.length > 2) {
        // ✅ Trả về tên combo với prefix "combo" để dễ tìm trong cache
        const comboNameWithPrefix = `combo ${comboName}`;
        return { name: comboNameWithPrefix, price };
      }
    }
    
    // Pattern 1b: "Combo [tên]" không có giá (fallback)
    const comboNameMatch = cleanText.match(/(?:^|\s|-)\s*(?:combo\s+)([^,\-\.\n]+?)(?:\s+với|\s+mô\s+tả|\s+là\s+combo|\s+giá|,|\.|$)/i);
    if (comboNameMatch) {
      let comboName = comboNameMatch[1].trim();
      // Loại bỏ các từ thừa ở cuối
      comboName = comboName.replace(/\s+(với|mô\s+tả|là|giá).*$/i, '').trim();
      
      // Extract giá từ text (tìm "giá" + số hoặc "- giá" format)
      let price: string | undefined;
      // Thử tìm giá theo format "giá ..."
      const priceMatch = cleanText.match(/giá\s+([\d.,\s]+[₫đ]?)/i);
      if (priceMatch) {
        price = priceMatch[1].trim();
        if (!price.includes('₫') && !price.includes('đ')) {
          price = `${price}₫`;
        }
      }
      
      if (comboName.length > 2) {
        // ✅ Trả về tên combo với prefix "combo" để dễ tìm trong cache
        const comboNameWithPrefix = `combo ${comboName}`;
        return { name: comboNameWithPrefix, price };
      }
    }
    
    // Pattern 2: "Combo [tên] - giá" (format giống product)
    const comboWithPrice = extractProductInfo(cleanText);
    if (comboWithPrice && lowerText.includes('combo')) {
      return comboWithPrice;
    }
    
    // Pattern 3: Tìm "Combo" và extract text sau đó (fallback cải thiện)
    const comboIndex = lowerText.indexOf('combo');
    if (comboIndex >= 0) {
      const afterCombo = cleanText.substring(comboIndex + 5).trim();
      // Lấy từ đầu đến dấu phẩy, dấu chấm, hoặc từ "với", "mô tả", "là combo"
      const nameMatch = afterCombo.match(/^([^,\-\.\n]+?)(?:\s+với|\s+mô\s+tả|\s+là\s+combo|\s+giá|,|\.|$)/);
      if (nameMatch) {
        let comboName = nameMatch[1].trim();
        // Loại bỏ các từ thừa
        comboName = comboName.replace(/\s+(với|mô\s+tả|là|giá).*$/i, '').trim();
        
        if (comboName.length > 2) {
          // Extract giá nếu có
          let price: string | undefined;
          const priceMatch = cleanText.match(/giá\s+([\d.,\s]+[₫đ]?)/i);
          if (priceMatch) {
            price = priceMatch[1].trim();
            if (!price.includes('₫') && !price.includes('đ')) {
              price = `${price}₫`;
            }
          }
          return { name: comboName, price };
        }
      }
    }
    
    return null;
  };

  // ✅ Helper: Tìm combo trong cache với fuzzy matching
  const findComboInCache = (comboName: string): { id: string; name: string; image?: string; price?: number; slug?: string } | null => {
    if (!comboName || comboName.trim().length < 2) return null;
    
    const normalizedSearch = normalizeText(comboName);
    const lowerSearch = comboName.toLowerCase().trim();
    const searchWithoutTones = removeVietnameseTones(comboName).toLowerCase();
    
    // Tìm exact match
    if (combosCache.has(normalizedSearch)) {
      return combosCache.get(normalizedSearch)!;
    }
    
    if (combosCache.has(lowerSearch)) {
      return combosCache.get(lowerSearch)!;
    }
    
    if (combosCache.has(searchWithoutTones)) {
      return combosCache.get(searchWithoutTones)!;
    }
    
    // Tìm với "combo" prefix
    const comboKey = `combo ${normalizedSearch}`;
    if (combosCache.has(comboKey)) {
      return combosCache.get(comboKey)!;
    }
    
    // Fuzzy match: tìm combo có tên chứa search text
    for (const [key, combo] of combosCache.entries()) {
      if (key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
        return combo;
      }
    }
    
    return null;
  };

  // ✅ Helper: Tìm product trong cache với fuzzy matching nâng cao
  const findProductInCache = (productName: string): { id: string; name: string; image?: string; price?: number; slug?: string } | null => {
    if (!productName || productName.trim().length < 2) return null;
    
    const normalizedSearch = normalizeText(productName);
    const lowerSearch = productName.toLowerCase().trim();
    
    // 1. Exact match (normalized)
    if (productsCache.has(normalizedSearch)) {
      return productsCache.get(normalizedSearch)!;
    }
    
    // 2. Exact match với original name (case insensitive)
    if (productsCache.has(lowerSearch)) {
      return productsCache.get(lowerSearch)!;
    }
    
    // 3. Match với tên không có dấu
    const searchWithoutTones = removeVietnameseTones(productName).toLowerCase();
    if (productsCache.has(searchWithoutTones)) {
      return productsCache.get(searchWithoutTones)!;
    }
    
    // 4. Exact match với product.name
    for (const product of productsCache.values()) {
      if (product.name.toLowerCase().trim() === lowerSearch) {
        return product;
      }
    }
    
    // 5. Partial match - tìm product có tên chứa productName hoặc ngược lại
    for (const [key, product] of productsCache.entries()) {
      const normalizedKey = normalizeText(product.name);
      const productNameLower = product.name.toLowerCase();
      
      // Key chứa search hoặc search chứa key
      if (normalizedKey.includes(normalizedSearch) || normalizedSearch.includes(normalizedKey)) {
        return product;
      }
      
      // Original name match (case insensitive)
      if (productNameLower.includes(lowerSearch) || lowerSearch.includes(productNameLower)) {
        return product;
      }
      
      // Match với tên không có dấu
      const productWithoutTones = removeVietnameseTones(product.name).toLowerCase();
      const searchWithoutTonesLower = searchWithoutTones.toLowerCase();
      if (productWithoutTones.includes(searchWithoutTonesLower) || searchWithoutTonesLower.includes(productWithoutTones)) {
        return product;
      }
    }
    
    // 6. Fuzzy match - tìm product có tên tương tự (ít nhất 50% giống nhau)
    let bestMatch: { product: any; score: number } | null = null;
    const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
    
    for (const product of new Set(productsCache.values())) {
      const normalizedKey = normalizeText(product.name);
      const keyWords = normalizedKey.split(' ').filter(w => w.length > 2);
      
      // Tính độ tương đồng dựa trên số từ chung
      const commonWords = searchWords.filter(word => keyWords.includes(word));
      const totalWords = Math.max(searchWords.length, keyWords.length);
      const score = totalWords > 0 ? commonWords.length / totalWords : 0;
      
      // Nếu có ít nhất 1 từ chung và score >= 0.5
      if (commonWords.length > 0 && score >= 0.5 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { product, score };
      }
    }
    
    if (bestMatch && bestMatch.score >= 0.5) {
      return bestMatch.product;
    }
    
    return null;
  };

  // ✅ Helper: Extract text từ React children
  // ⚠️ QUAN TRỌNG: ReactMarkdown có thể parse list items thành array phức tạp
  // Cần extract đúng text từ tất cả các children
  // ⚠️ QUAN TRỌNG: Phải extract đúng text cho TẤT CẢ các list items, kể cả món cuối cùng
  const extractTextFromChildren = (children: any): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) {
      // ✅ Join với khoảng trắng để đảm bảo text không bị dính liền
      // ⚠️ QUAN TRỌNG: Phải join TẤT CẢ các children, không bỏ sót phần tử nào
      const extracted = children.map(child => extractTextFromChildren(child)).filter(Boolean);
      return extracted.join(' ');
    }
    if (children && typeof children === 'object') {
      // ✅ Xử lý React elements
      if ('props' in children && children.props) {
        return extractTextFromChildren(children.props.children);
      }
      // ✅ Xử lý các object khác có thể chứa text
      if ('children' in children) {
        return extractTextFromChildren(children.children);
      }
    }
    return '';
  };

  // ✅ Helper: Kiểm tra xem có phải order info card không (Số điện thoại, Địa chỉ, Ghi chú)
  const getOrderInfoCardInfo = (text: string): { type: string; icon: React.ReactNode; label: string; value: string; iconColor: string } | null => {
    const cleanText = text.trim();
    
    // Pattern: "Số điện thoại: 0123456789" hoặc "Số điện thoại:0123456789"
    const phoneMatch = cleanText.match(/^số\s*điện\s*thoại\s*:?\s*(.+)$/i);
    if (phoneMatch) {
      return {
        type: 'phone',
        icon: <FaPhone />,
        label: 'Số điện thoại:',
        value: phoneMatch[1].trim(),
        iconColor: '#1976d2' // Blue
      };
    }
    
    // Pattern: "Địa chỉ: ..." hoặc "Địa chỉ:..."
    const addressMatch = cleanText.match(/^địa\s*chỉ\s*:?\s*(.+)$/i);
    if (addressMatch) {
      return {
        type: 'address',
        icon: <FaMapMarkerAlt />,
        label: 'Địa chỉ:',
        value: addressMatch[1].trim(),
        iconColor: '#d32f2f' // Red
      };
    }
    
    // Pattern: "Ghi chú: ..." hoặc "Ghi chú:..." hoặc "Note: ..."
    const noteMatch = cleanText.match(/^(ghi\s*chú|note)\s*:?\s*(.+)$/i);
    if (noteMatch) {
      return {
        type: 'note',
        icon: <FaStickyNote />,
        label: 'Ghi chú:',
        value: noteMatch[2].trim(),
        iconColor: '#ffc107' // Yellow
      };
    }
    
    return null;
  };

  // ✅ Helper: Kiểm tra xem có phải action card không
  const getActionCardInfo = (text: string): { type: string; icon: React.ReactNode; link: string } | null => {
    const lowerText = text.toLowerCase().trim();
    
    // ✅ Loại bỏ các text không phải action card (câu hỏi về combo)
    // Không detect action card nếu text là câu hỏi về combo
    if ((lowerText.includes('bạn có muốn') || lowerText.includes('bạn muốn')) && 
        (lowerText.includes('thêm') || lowerText.includes('combo')) &&
        (lowerText.includes('giỏ hàng') || lowerText.includes('vào giỏ'))) {
      return null; // Không phải action card, chỉ là câu hỏi
    }
    
    // Xem đơn hàng
    if (lowerText.includes('xem đơn hàng') || lowerText.includes('đơn hàng của bạn')) {
      return {
        type: 'orders',
        icon: <FaReceipt />,
        link: '/profile/order'
      };
    }
    
    // Xem đặt bàn
    if (lowerText.includes('xem đặt bàn') || lowerText.includes('đặt bàn của bạn')) {
      return {
        type: 'reservations',
        icon: <FaCalendarAlt />,
        link: '/dat-ban'
      };
    }
    
    // Xem giỏ hàng
    if (lowerText.includes('xem giỏ hàng') || lowerText.includes('giỏ hàng của bạn')) {
      return {
        type: 'cart',
        icon: <FaShoppingCart />,
        link: '/cart'
      };
    }
    
    // Cập nhật thông tin cá nhân
    if (lowerText.includes('cập nhật thông tin') || lowerText.includes('thông tin cá nhân')) {
      return {
        type: 'profile',
        icon: <FaUserEdit />,
        link: '/profile'
      };
    }
    
    return null;
  };

  // ✅ Helper: Extract combo info và vị trí từ text
  const extractComboInfoWithPosition = (text: string): { 
    comboInfo: { name: string; price?: string } | null;
    startIndex: number;
    endIndex: number;
    beforeText: string;
    afterText: string;
  } | null => {
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    const lowerText = cleanText.toLowerCase();
    
    if (!lowerText.includes('combo')) return null;
    
    // Tìm vị trí của "combo" trong text
    const comboIndex = lowerText.indexOf('combo');
    if (comboIndex < 0) return null;
    
    // Extract combo info
    const comboInfo = extractComboInfo(cleanText);
    if (!comboInfo) return null;
    
    // Tìm vị trí bắt đầu và kết thúc của phần combo trong text
    // Pattern: "Combo [tên]" hoặc "Combo [tên] với..." hoặc "Combo [tên], giá..."
    const comboPattern = new RegExp(`(?:^|\\s)(?:combo\\s+)([^,\\-\\n]+?)(?:\\s+với|\\s+mô\\s+tả|\\s+là\\s+combo|\\s+giá|,|\\.|$)`, 'i');
    const match = cleanText.substring(comboIndex).match(comboPattern);
    
    if (match) {
      const matchStart = comboIndex + match.index!;
      const matchEnd = matchStart + match[0].length;
      
      // Tìm giá nếu có (có thể ở sau phần combo)
      let priceEnd = matchEnd;
      const priceMatch = cleanText.substring(matchEnd).match(/giá\s+([\d.,\s]+[₫đ]?)/i);
      if (priceMatch) {
        priceEnd = matchEnd + priceMatch.index! + priceMatch[0].length;
      }
      
      const beforeText = cleanText.substring(0, matchStart).trim();
      let afterText = cleanText.substring(priceEnd).trim();
      
      // ⚠️ QUAN TRỌNG: CHỈ loại bỏ phần câu hỏi về combo CỤ THỂ (có từ "combo")
      // KHÔNG loại bỏ câu hỏi chung về "thêm món" (không có từ "combo")
      // Ví dụ: "Bạn muốn mình thêm món nào vào giỏ hàng không ạ?" → KHÔNG loại bỏ
      // Ví dụ: "Bạn có muốn thêm combo nào vào giỏ hàng không?" → Loại bỏ
      const lowerAfterText = afterText.toLowerCase();
      const isComboSpecificQuestion = (
        (lowerAfterText.includes('bạn có muốn') || lowerAfterText.includes('bạn muốn')) && 
        lowerAfterText.includes('combo') && // ⚠️ PHẢI có từ "combo"
        (lowerAfterText.includes('thêm') || lowerAfterText.includes('giỏ hàng'))
      );
      if (isComboSpecificQuestion) {
        // Chỉ bỏ phần câu hỏi về combo cụ thể
        afterText = '';
      }
      
      return {
        comboInfo,
        startIndex: matchStart,
        endIndex: priceEnd,
        beforeText,
        afterText
      };
    }
    
    return null;
  };

  // ✅ Helper: Render combo card từ combo info (MEMOIZED để tránh re-render)
  const renderComboCardFromInfo = useCallback((comboInfo: { name: string; price?: string }): React.ReactNode | null => {
    let comboName = comboInfo.name;
    let comboDisplayPrice = comboInfo.price || '';
    let combo: { id: string; name: string; image?: string; price?: number; slug?: string } | null = null;
    
    console.log('🎨 Rendering combo card from info:', {
      comboName,
      comboDisplayPrice,
      combosCacheSize: combosCache.size
    });
    
    // Tìm combo trong cache với nhiều cách
    if (comboName) {
      // 1. Tìm với tên đầy đủ (có thể có "combo" prefix)
      combo = findComboInCache(comboName);
      console.log('🔍 First search result:', combo ? { id: combo.id, name: combo.name, hasImage: !!combo.image } : 'Not found');
      
      if (!combo && !comboName.toLowerCase().startsWith('combo')) {
        combo = findComboInCache(`combo ${comboName}`);
        console.log('🔍 Second search result (with "combo" prefix):', combo ? { id: combo.id, name: combo.name, hasImage: !!combo.image } : 'Not found');
      }
      
      // 4. Tìm với tên không có dấu
      if (!combo && cleanComboName) {
        const nameWithoutTones = removeVietnameseTones(cleanComboName).toLowerCase();
        combo = findComboInCache(nameWithoutTones);
        console.log('🔍 Third search result (without tones):', combo ? { id: combo.id, name: combo.name, hasImage: !!combo.image } : 'Not found');
      }
      
      // 5. Fuzzy match trong cache - tìm combo có tên chứa search text hoặc ngược lại
      if (!combo) {
        const normalizedSearch = normalizeText(cleanComboName || comboName);
        // Thử match với tên combo trong cache
        for (const [key, cachedCombo] of combosCache.entries()) {
          const normalizedKey = normalizeText(key);
          const cachedComboName = normalizeText(cachedCombo.name);
          
          // Match nếu search text chứa trong key hoặc combo name, hoặc ngược lại
          if (normalizedKey.includes(normalizedSearch) || 
              normalizedSearch.includes(normalizedKey) ||
              cachedComboName.includes(normalizedSearch) ||
              normalizedSearch.includes(cachedComboName)) {
            combo = cachedCombo;
            console.log('🔍 Fuzzy match found:', { key, combo: { id: combo.id, name: combo.name, hasImage: !!combo.image } });
            break;
          }
        }
      }
    }
    
    console.log('🔍 Final combo found:', combo ? { id: combo.id, name: combo.name, hasImage: !!combo.image, image: combo.image } : 'Not found');
    
    if (!combo && (!comboName || comboName.length < 2)) {
      console.warn('⚠️ Cannot render combo card:', {
        comboName,
        comboNameLength: comboName?.length,
        hasCombo: !!combo
      });
      return null;
    }
    
    const finalComboName = currentCombo?.name || cleanComboName || comboName.replace(/^combo\s+/i, '').trim();
    const comboSlug = currentCombo?.slug || `${removeVietnameseTones(finalComboName)}-${currentCombo?.id || 'unknown'}`;
    let comboImageUrl = currentCombo?.image ? getImageUrl(currentCombo.image) : null;
    
    // ✅ Nếu combo được tìm thấy nhưng không có image, fetch từ API
    if (currentCombo?.id && !comboImageUrl) {
      console.log('📥 [Combo Card] Fetching image for combo:', currentCombo.id, currentCombo.name);
      fetch(`${API_URL}/api/combos/${currentCombo.id}`)
        .then(res => res.json())
        .then(data => {
          const comboDetail = data.data || data;
          console.log('📥 [Combo Card] Combo detail fetched:', {
            id: comboDetail?.id,
            name: comboDetail?.name,
            hasImage: !!(comboDetail?.image || comboDetail?.imagePath || comboDetail?.thumbnail),
            image: comboDetail?.image || comboDetail?.imagePath || comboDetail?.thumbnail
          });
          if (comboDetail?.image || comboDetail?.imagePath || comboDetail?.thumbnail) {
            const imagePath = comboDetail.image || comboDetail.imagePath || comboDetail.thumbnail;
            // Cập nhật cache với image mới
            const updatedCombo = { ...currentCombo, image: imagePath };
            const normalizedName = normalizeText(currentCombo.name);
            const originalName = currentCombo.name.toLowerCase().trim();
            const nameWithoutTones = removeVietnameseTones(currentCombo.name).toLowerCase();
            
            setCombosCache(prev => {
              const newCache = new Map(prev);
              newCache.set(normalizedName, updatedCombo);
              newCache.set(originalName, updatedCombo);
              if (nameWithoutTones !== normalizedName) {
                newCache.set(nameWithoutTones, updatedCombo);
              }
              // Thêm với "combo" prefix
              newCache.set(`combo ${normalizedName}`, updatedCombo);
              newCache.set(`combo ${originalName}`, updatedCombo);
              console.log('✅ [Combo Card] Updated cache with image');
              return newCache;
            });
            setImageUpdateTrigger(prev => prev + 1);
          } else {
            console.warn('⚠️ [Combo Card] Combo detail has no image');
          }
        })
        .catch(error => {
          console.error('❌ [Combo Card] Error fetching combo image:', error);
        });
    }
    
    // Update combo để sử dụng trong render
    combo = currentCombo;
    
    if (!comboDisplayPrice && combo?.price) {
      comboDisplayPrice = `${combo.price.toLocaleString('vi-VN')}₫`;
    }
    
    const comboCardContent = (
      <div className="product-card-inline">
        <div className="product-card-image-wrapper">
          {comboImageUrl ? (
            <img 
              src={comboImageUrl} 
              alt={finalComboName}
              className="product-card-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              loading="lazy"
            />
          ) : (
            <div className="product-card-placeholder">
              <span style={{ fontSize: '32px', opacity: 0.3 }}>🍽️</span>
            </div>
          )}
        </div>
        <div className="product-card-content">
          <span className="product-card-name">
            {finalComboName}
          </span>
          {comboDisplayPrice && (
            <span className="product-card-price">{comboDisplayPrice}</span>
          )}
        </div>
      </div>
    );
    
    if (combo?.id) {
      return (
        <Link 
          to={`/combo/${comboSlug}`}
          className="product-card-link-wrapper"
          onClick={(e) => e.stopPropagation()}
        >
          {comboCardContent}
        </Link>
      );
    }
    
    return comboCardContent;
  }, [combosCache, findComboInCache, removeVietnameseTones, normalizeText, getImageUrl]);

  // ✅ Helper: Parse cart summary từ text (ví dụ: "Giỏ hàng:\n1x Thịt Kho Mắm Ruốc - 89.000₫\nTổng cộng: 89.000₫")
  const parseCartSummary = (text: string): { items: Array<{ name: string; quantity: number; price: string }>; total: string } | null => {
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    const lowerText = cleanText.toLowerCase();
    
    // Kiểm tra xem có phải là cart summary không
    if (!lowerText.includes('giỏ hàng') && !lowerText.includes('tổng cộng')) {
      return null;
    }
    
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: Array<{ name: string; quantity: number; price: string }> = [];
    let total = '';
    
    for (const line of lines) {
      // Pattern: "1x Tên món - giá" hoặc "1x Combo tên - giá"
      const itemMatch = line.match(/^(\d+)x\s+(.+?)\s*-\s*([\d.,\s]+[₫đ]?)$/i);
      if (itemMatch) {
        const quantity = parseInt(itemMatch[1], 10);
        const name = itemMatch[2].trim();
        const price = itemMatch[3].trim();
        items.push({ name, quantity, price });
      }
      
      // Pattern: "Tổng cộng: giá" hoặc "Tổng: giá"
      const totalMatch = line.match(/^tổng\s*(?:cộng)?\s*:?\s*([\d.,\s]+[₫đ]?)$/i);
      if (totalMatch) {
        total = totalMatch[1].trim();
      }
    }
    
    if (items.length > 0 || total) {
      return { items, total };
    }
    
    return null;
  };
  
  // ✅ Helper: Render cart summary card với product/combo cards
  const renderCartSummaryCard = (cartSummary: { items: Array<{ name: string; quantity: number; price: string }>; total: string }): React.ReactNode => {
    return (
      <div className="cart-summary-card">
        <div>
          <h4>Giỏ hàng:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {cartSummary.items.map((item, index) => {
              // Tách quantity và name từ "1x Tên món"
              let itemName = item.name.trim();
              const itemQuantity = item.quantity;
              
              // Loại bỏ các ký tự thừa ở cuối (như "Tổng cộng" nếu còn sót)
              itemName = itemName.replace(/\s*tổng\s*(?:cộng)?\s*:?/i, '').trim();
              
              // Kiểm tra xem có phải combo không
              const isCombo = itemName.toLowerCase().includes('combo');
              
              // Tìm product/combo trong cache
              let foundItem: { id: string; name: string; image?: string; price?: number; slug?: string } | null = null;
              
              if (isCombo) {
                // Loại bỏ "combo" prefix nếu có
                const comboName = itemName.replace(/^combo\s+/i, '').trim();
                foundItem = findComboInCache(comboName) || findComboInCache(`combo ${comboName}`);
              } else {
                // Thử tìm với tên đầy đủ trước
                foundItem = findProductInCache(itemName);
                
                // Nếu không tìm thấy, thử với tên ngắn hơn (lấy phần trước dấu gạch ngang hoặc dấu phẩy)
                if (!foundItem) {
                  const shortName = itemName.split(/[–\-–—]/)[0].trim() || itemName.split(',')[0].trim();
                  if (shortName && shortName !== itemName) {
                    foundItem = findProductInCache(shortName);
                  }
                }
                
                // Nếu vẫn không tìm thấy, thử với tên không có phần trong ngoặc
                if (!foundItem) {
                  const nameWithoutParentheses = itemName.replace(/\s*\([^)]*\)/g, '').trim();
                  if (nameWithoutParentheses && nameWithoutParentheses !== itemName) {
                    foundItem = findProductInCache(nameWithoutParentheses);
                  }
                }
              }
              
              // Render như product/combo card
              const finalName = foundItem?.name || itemName;
              const displayPrice = item.price || (foundItem?.price ? `${foundItem.price.toLocaleString('vi-VN')}₫` : '');
              let imageUrl = foundItem?.image ? getImageUrl(foundItem.image) : null;
              const itemSlug = foundItem?.slug || `${removeVietnameseTones(itemName)}-${foundItem?.id || 'unknown'}`;
              
              // ✅ Nếu không có image trong cache, fetch từ API
              if (!imageUrl && foundItem?.id) {
                const apiEndpoint = isCombo ? `${API_URL}/api/combos/${foundItem.id}` : `${API_URL}/api/products/${foundItem.id}`;
                fetch(apiEndpoint)
                  .then(res => res.json())
                  .then(data => {
                    const itemDetail = data.data || data;
                    if (itemDetail?.image) {
                      const updatedItem = { ...foundItem, image: itemDetail.image };
                      const normalizedName = normalizeText(foundItem.name);
                      const originalName = foundItem.name.toLowerCase().trim();
                      
                      if (isCombo) {
                        setCombosCache(prev => {
                          const newCache = new Map(prev);
                          newCache.set(normalizedName, updatedItem);
                          newCache.set(originalName, updatedItem);
                          return newCache;
                        });
                      } else {
                        setProductsCache(prev => {
                          const newCache = new Map(prev);
                          newCache.set(normalizedName, updatedItem);
                          newCache.set(originalName, updatedItem);
                          return newCache;
                        });
                      }
                      setImageUpdateTrigger(prev => prev + 1);
                    }
                  })
                  .catch(() => {});
              }
              
              // ✅ Sử dụng imageUpdateTrigger để đảm bảo re-render khi image được fetch
              const _ = imageUpdateTrigger; // eslint-disable-line
              
              // Re-fetch image URL sau khi có thể đã được update
              if (foundItem?.image) {
                imageUrl = getImageUrl(foundItem.image);
              }
              
              const cardContent = (
                <div className="product-card-inline" style={{ margin: 0 }}>
                  <div className="product-card-image-wrapper">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={finalName}
                        className="product-card-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-card-placeholder">
                        <span style={{ fontSize: '32px', opacity: 0.3 }}>🍽️</span>
                      </div>
                    )}
                  </div>
                  <div className="product-card-content">
                    <span className="product-card-name">
                      {itemQuantity}x {finalName}
                    </span>
                    {displayPrice && (
                      <span className="product-card-price">{displayPrice}</span>
                    )}
                  </div>
                </div>
              );
              
              // ✅ Nếu có item, wrap trong Link để có thể click
              if (foundItem?.id) {
                const linkPath = isCombo ? `/combo/${itemSlug}` : `/menu/${itemSlug}`;
                return (
                  <Link 
                    key={index}
                    to={linkPath}
                    className="product-card-link-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cardContent}
                  </Link>
                );
              }
              
              return <div key={index}>{cardContent}</div>;
            })}
          </div>
        </div>
        {cartSummary.total && (
          <div className="cart-summary-total">
            <span className="cart-summary-total-label">Tổng cộng:</span>
            <span className="cart-summary-total-amount">
              {cartSummary.total}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ✅ Helper: Parse cart summary từ toàn bộ message text
  const parseCartSummaryFromFullText = (fullText: string): { items: Array<{ name: string; quantity: number; price: string }>; total: string } | null => {
    const cleanText = fullText.replace(/\*\*/g, '').replace(/`/g, '').trim();
    const lowerText = cleanText.toLowerCase();
    
    // Kiểm tra xem có phải là cart summary không
    const hasCartKeywords = lowerText.includes('giỏ hàng') || 
                           lowerText.includes('tổng cộng') ||
                           lowerText.includes('hiện có') ||
                           (lowerText.includes('có') && (lowerText.includes('món') || lowerText.includes('sản phẩm')));
    
    if (!hasCartKeywords) {
      return null;
    }
    
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: Array<{ name: string; quantity: number; price: string }> = [];
    let total = '';
    let foundCartSection = false;
    
    // Cũng thử parse từ text không có newline (có thể là một dòng dài)
    const singleLineMatch = cleanText.match(/(?:giỏ hàng|hiện có)[\s\S]*?(\d+)x\s+(.+?)\s*-\s*([\d.,\s]+[₫đ]?)[\s\S]*?tổng\s*(?:cộng)?\s*:?\s*([\d.,\s]+[₫đ]?)/i);
    if (singleLineMatch) {
      const quantity = parseInt(singleLineMatch[1], 10);
      const name = singleLineMatch[2].trim();
      const price = singleLineMatch[3].trim();
      const totalPrice = singleLineMatch[4].trim();
      items.push({ name, quantity, price });
      total = totalPrice;
      return { items, total };
    }
    
    for (const line of lines) {
      // Tìm phần "Giỏ hàng:" hoặc "hiện có" để bắt đầu parse
      if (line.toLowerCase().includes('giỏ hàng') || 
          line.toLowerCase().includes('hiện có') ||
          (line.toLowerCase().includes('có') && (line.toLowerCase().includes('món') || line.toLowerCase().includes('sản phẩm')))) {
        foundCartSection = true;
        continue;
      }
      
      if (!foundCartSection) continue;
      
      // Pattern: "1x Tên món - giá" hoặc "1x Combo tên - giá"
      // Hỗ trợ tên món có thể có dấu gạch ngang hoặc dấu phẩy
      const itemMatch = line.match(/^(\d+)x\s+(.+?)\s*-\s*([\d.,\s]+[₫đ]?)(?:\s*tổng|$)/i);
      if (itemMatch) {
        const quantity = parseInt(itemMatch[1], 10);
        let name = itemMatch[2].trim();
        const price = itemMatch[3].trim();
        
        // Loại bỏ "Tổng cộng" nếu có trong name
        name = name.replace(/\s*tổng\s*(?:cộng)?\s*:?/i, '').trim();
        
        items.push({ name, quantity, price });
        continue;
      }
      
      // Pattern: "Tổng cộng: giá" hoặc "Tổng: giá"
      const totalMatch = line.match(/^tổng\s*(?:cộng)?\s*:?\s*([\d.,\s]+[₫đ]?)$/i);
      if (totalMatch) {
        total = totalMatch[1].trim();
        break; // Sau khi tìm thấy tổng, dừng lại
      }
    }
    
    // Nếu không tìm thấy items từ lines, thử parse từ toàn bộ text
    if (items.length === 0 && foundCartSection) {
      // Pattern: tìm "1x Tên món - giá" trong text
      const itemPattern = /(\d+)x\s+([^-]+?)\s*-\s*([\d.,\s]+[₫đ]?)/gi;
      let match;
      while ((match = itemPattern.exec(cleanText)) !== null) {
        const quantity = parseInt(match[1], 10);
        let name = match[2].trim();
        const price = match[3].trim();
        
        // Loại bỏ "Tổng cộng" nếu có trong name
        name = name.replace(/\s*tổng\s*(?:cộng)?\s*:?/i, '').trim();
        
        items.push({ name, quantity, price });
      }
      
      // Tìm total
      const totalPattern = /tổng\s*(?:cộng)?\s*:?\s*([\d.,\s]+[₫đ]?)/i;
      const totalMatch = cleanText.match(totalPattern);
      if (totalMatch) {
        total = totalMatch[1].trim();
      }
    }
    
    if (items.length > 0 || total) {
      return { items, total };
    }
    
    return null;
  };
  // ✅ Custom markdown components để render product cards và action cards
  const markdownComponents: Components = {
    p: ({ children, ...props }) => {
      // Extract text từ children
      const childText = extractTextFromChildren(children);
      
      // ⚠️ QUAN TRỌNG: KHÔNG ẩn câu hỏi chung về thêm món vào giỏ hàng (như "Bạn muốn mình thêm món nào vào giỏ hàng không ạ?")
      // CHỈ ẩn câu hỏi cụ thể về combo (như "Bạn có muốn thêm combo nào vào giỏ hàng không?")
      const cleanChildText = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildText = cleanChildText.toLowerCase();
      
      // ⚠️ CHỈ ẩn nếu câu hỏi có từ "combo" rõ ràng (câu hỏi về combo cụ thể)
      // KHÔNG ẩn câu hỏi chung về "thêm món" (không có từ "combo")
      const isComboSpecificQuestion = (
        (lowerChildText.includes('bạn có muốn') || lowerChildText.includes('bạn muốn')) && 
        lowerChildText.includes('combo') && // ⚠️ PHẢI có từ "combo"
        (lowerChildText.includes('thêm') || lowerChildText.includes('vào giỏ') || lowerChildText.includes('giỏ hàng'))
      );
      
      // ⚠️ KHÔNG ẩn câu hỏi chung về "thêm món" (không có từ "combo")
      // Ví dụ: "Bạn muốn mình thêm món nào vào giỏ hàng không ạ?" → KHÔNG ẩn
      if (isComboSpecificQuestion) {
        return null; // Chỉ ẩn câu hỏi về combo cụ thể
      }
      
      // ✅ Loại bỏ "Tổng cộng" khỏi combo card detection
      // ⚠️ QUAN TRỌNG: "Tổng cộng" thường được parse thành `p` tag (không có dấu `-` ở đầu)
      const cleanChildTextForTotal = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildTextForTotal = cleanChildTextForTotal.toLowerCase();
      
      // ⚠️ QUAN TRỌNG: Pattern phải match được "Tổng cộng: 260.000₫" hoặc "Tổng cộng: 260.000₫ [text khác]"
      // ⚠️ QUAN TRỌNG: "Tổng cộng" có thể xuất hiện ở bất kỳ đâu trong text (không nhất thiết phải ở đầu)
      const isTotalLine = lowerChildTextForTotal.includes('tổng cộng') || 
                         lowerChildTextForTotal.includes('tổng:') ||
                         (lowerChildTextForTotal.includes('tổng') && lowerChildTextForTotal.includes('₫'));
      
      // ✅ Debug: Log để kiểm tra "Tổng cộng" có được detect không
      if (isTotalLine) {
        console.log('🔍 [p] Detected total line:', cleanChildTextForTotal, 'lowerText:', lowerChildTextForTotal);
      }
      
      if (isTotalLine) {
        // ⚠️ QUAN TRỌNG: Nếu text có cả "Tổng cộng" và "Để hoàn tất..." → Tách riêng ra
        // Chỉ tô đỏ phần "Tổng cộng: [số]₫", không tô đỏ phần "Để hoàn tất..."
        // Pattern: "Tổng cộng: [số]₫" hoặc "Tổng cộng: [số]₫ [text khác]"
        // ⚠️ QUAN TRỌNG: Pattern phải match được cả khi "Tổng cộng" không ở đầu text
        const totalMatch = cleanChildTextForTotal.match(/(Tổng cộng:\s*[\d.,\s]+[₫đ])/i);
        const hasCompleteOrderText = lowerChildTextForTotal.includes('để hoàn tất') || 
                                     lowerChildTextForTotal.includes('cần một số thông tin');
        
        if (totalMatch && hasCompleteOrderText) {
          // Tách riêng "Tổng cộng" và "Để hoàn tất..."
          const totalText = totalMatch[1];
          const beforeTotalText = cleanChildTextForTotal.substring(0, totalMatch.index || 0).trim();
          const afterTotalText = cleanChildTextForTotal.substring((totalMatch.index || 0) + totalMatch[0].length).trim();
          
          return (
            <p {...props} style={{ marginTop: '8px', marginBottom: '8px' }}>
              {beforeTotalText && <span style={{ color: 'inherit' }}>{beforeTotalText} </span>}
              <span style={{ fontWeight: 'bold', color: '#dc3545' }}>{totalText}</span>
              {afterTotalText && (
                <>
                  <br />
                  <span style={{ color: 'inherit' }}>{afterTotalText}</span>
                </>
              )}
            </p>
          );
        }
        
        // Nếu chỉ có "Tổng cộng" → Tô đỏ cả dòng
        // ⚠️ QUAN TRỌNG: Đảm bảo "Tổng cộng" được render và hiển thị
        // ⚠️ QUAN TRỌNG: Nếu text có "Tổng cộng" nhưng không match pattern trên → Vẫn render với style đỏ
        console.log('✅ [p] Rendering total line with red style:', cleanChildTextForTotal);
        return (
          <p {...props} style={{ fontWeight: 'bold', color: '#dc3545', marginTop: '8px', marginBottom: '8px' }}>
            {children}
          </p>
        );
      }
      
      // ✅ Kiểm tra xem có combo không trong paragraph
      const comboExtract = extractComboInfoWithPosition(childText);
      if (comboExtract && comboExtract.comboInfo) {
        const comboCard = renderComboCardFromInfo(comboExtract.comboInfo);
        if (comboCard) {
          // ✅ Chỉ hiển thị beforeText và comboCard, bỏ phần afterText (đã được loại bỏ câu hỏi)
          return (
            <div style={{ margin: '8px 0' }}>
              {comboExtract.beforeText && <p style={{ margin: 0 }}>{comboExtract.beforeText}</p>}
              {comboCard}
            </div>
          );
        }
      }
      
      // ✅ Kiểm tra xem có product không trong paragraph (QUAN TRỌNG - AI có thể trả lời trong paragraph)
      // Pattern: "Lẩu Gà Tre Lá Giang với giá 250.000₫" hoặc "món Lẩu Gà Tre Lá Giang với giá 250.000₫"
      const productInfo = extractProductInfo(childText);
      if (productInfo) {
        const productName = productInfo.name;
        const displayPrice = productInfo.price || '';
        
        // Tìm product trong cache
        const product = findProductInCache(productName);
        const finalProductName = product?.name || productName;
        const productSlug = product?.slug || `${removeVietnameseTones(productName)}-${product?.id || 'unknown'}`;
        
        // Lấy image URL
        let imageUrl: string | null = null;
        if (product?.image) {
          imageUrl = getImageUrl(product.image);
        }
        
        // Render product card
        const cardContent = (
          <div className="product-card-inline">
            <div className="product-card-image-wrapper">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={finalProductName}
                  className="product-card-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="product-card-placeholder">
                  <span style={{ fontSize: '32px', opacity: 0.3 }}>🍽️</span>
                </div>
              )}
            </div>
            <div className="product-card-content">
              <span className="product-card-name">
                {finalProductName}
              </span>
              {displayPrice && (
                <span className="product-card-price">{displayPrice}</span>
              )}
            </div>
          </div>
        );
        
        // Extract beforeText và afterText từ paragraph
        // Ví dụ: "Chắc chắn rồi. Vậy bạn có thể thử món Lẩu Gà Tre Lá Giang với giá 250.000₫ nhé."
        // → beforeText: "Chắc chắn rồi. Vậy bạn có thể thử món"
        // → afterText: "nhé."
        const productNameIndex = childText.indexOf(productName);
        const priceIndex = childText.indexOf(displayPrice);
        const beforeText = productNameIndex > 0 ? childText.substring(0, productNameIndex).trim() : '';
        const afterText = priceIndex > 0 ? childText.substring(priceIndex + displayPrice.length).trim() : '';
        
        if (product) {
          return (
            <p {...props} style={{ margin: '8px 0' }}>
              {beforeText && <span>{beforeText} </span>}
              <Link 
                to={`/menu/${productSlug}`}
                className="product-card-link-wrapper"
                onClick={(e) => e.stopPropagation()}
              >
                {cardContent}
              </Link>
              {afterText && <span> {afterText}</span>}
            </p>
          );
        }
        
        return (
          <p {...props} style={{ margin: '8px 0' }}>
            {beforeText && <span>{beforeText} </span>}
            {cardContent}
            {afterText && <span> {afterText}</span>}
          </p>
        );
      }
      
      // Render bình thường
      return <p {...props}>{children}</p>;
    },
    li: ({ children, ...props }) => {
      // Extract text từ children (có thể là React elements phức tạp)
      // ⚠️ QUAN TRỌNG: Phải extract đúng text từ TẤT CẢ các children, kể cả món cuối cùng
      const childText = extractTextFromChildren(children);
      
      // ✅ Debug: Log để kiểm tra text extraction cho món cuối cùng
      // if (childText && childText.includes(' - ') && childText.match(/[\d.,\s]+[₫đ]/)) {
      //   console.log('🔍 [li] Extracted text:', childText, 'children type:', Array.isArray(children) ? 'array' : typeof children);
      // }
      
      // ✅ Kiểm tra xem có phải order info card không (ưu tiên cao nhất)
      const orderInfoCardInfo = getOrderInfoCardInfo(childText);
      if (orderInfoCardInfo) {
        return (
          <li className="order-info-card-list-item" {...props}>
            <div className="order-info-card-inline">
              <div 
                className="order-info-card-icon-wrapper"
                style={{ background: `linear-gradient(135deg, ${orderInfoCardInfo.iconColor} 0%, ${orderInfoCardInfo.iconColor}dd 100%)` }}
              >
                {orderInfoCardInfo.icon}
              </div>
              <div className="order-info-card-content">
                <span className="order-info-card-label">{orderInfoCardInfo.label}</span>
                <span className="order-info-card-value">{orderInfoCardInfo.value}</span>
              </div>
            </div>
          </li>
        );
      }
      
      // ⚠️ QUAN TRỌNG: KHÔNG ẩn câu hỏi chung về thêm món vào giỏ hàng (như "Bạn muốn mình thêm món nào vào giỏ hàng không ạ?")
      // CHỈ ẩn câu hỏi cụ thể về combo (như "Bạn có muốn thêm combo nào vào giỏ hàng không?")
      // Phải kiểm tra TRƯỚC action card để tránh render nhầm
      const cleanChildTextForCombo = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildText = cleanChildTextForCombo.toLowerCase();
      
      // ⚠️ CHỈ ẩn nếu câu hỏi có từ "combo" rõ ràng (câu hỏi về combo cụ thể)
      // KHÔNG ẩn câu hỏi chung về "thêm món" (không có từ "combo")
      const isComboSpecificQuestion = (
        (lowerChildText.includes('bạn có muốn') || lowerChildText.includes('bạn muốn')) && 
        lowerChildText.includes('combo') && // ⚠️ PHẢI có từ "combo"
        (lowerChildText.includes('thêm') || lowerChildText.includes('vào giỏ') || lowerChildText.includes('giỏ hàng'))
      );
      
      // ⚠️ KHÔNG ẩn câu hỏi chung về "thêm món" (không có từ "combo")
      // Ví dụ: "Bạn muốn mình thêm món nào vào giỏ hàng không ạ?" → KHÔNG ẩn
      if (isComboSpecificQuestion) {
        return null; // Chỉ ẩn câu hỏi về combo cụ thể
      }
      
      // ✅ Kiểm tra xem có phải action card không (ưu tiên cao hơn product)
      const actionCardInfo = getActionCardInfo(childText);
      if (actionCardInfo) {
        return (
          <li className="action-card-list-item" {...props}>
            <Link 
              to={actionCardInfo.link}
              className="action-card-link-wrapper"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="action-card-inline">
                <div className="action-card-icon-wrapper">
                  {actionCardInfo.icon}
                </div>
                <div className="action-card-content">
                  <span className="action-card-text">{childText}</span>
                </div>
              </div>
            </Link>
          </li>
        );
      }
      
      // ✅ Kiểm tra xem có combo không (ưu tiên trước product)
      const comboExtract = extractComboInfoWithPosition(childText);
      if (comboExtract && comboExtract.comboInfo) {
        const comboCard = renderComboCardFromInfo(comboExtract.comboInfo);
        if (comboCard) {
          // Nếu text chỉ chứa combo (không có text trước), render full card
          if (!comboExtract.beforeText) {
            return (
              <li className="product-list-item" {...props}>
                {comboCard}
              </li>
            );
          }
          // Nếu có text trước, render text trước + comboCard + afterText (nếu có)
          return (
            <li className="product-list-item" {...props}>
              {comboExtract.beforeText && <span>{comboExtract.beforeText} </span>}
              {comboCard}
              {comboExtract.afterText && <span> {comboExtract.afterText}</span>}
            </li>
          );
        }
      }
      
      // ✅ Ẩn các dòng text trùng lặp với combo/product đã được render như card
      // Pattern: "1x Combo [tên] - [giá]₫" hoặc "1x [tên] - [giá]₫"
      // Nếu text này có thể extract được combo/product info, và có pattern số lượng
      // → Có thể đã được render như card ở trên, kiểm tra xem có render được card không
      const cleanTextForDuplicate = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const hasQuantityPattern = /^\d+x\s+/i.test(cleanTextForDuplicate);
      
      if (hasQuantityPattern) {
        // Thử extract combo info
        const comboExtractForDuplicate = extractComboInfoWithPosition(childText);
        if (comboExtractForDuplicate && comboExtractForDuplicate.comboInfo) {
          // Nếu có thể render được combo card → đã render như card, không cần render lại như text
          const comboCardForDuplicate = renderComboCardFromInfo(comboExtractForDuplicate.comboInfo);
          if (comboCardForDuplicate && !comboExtractForDuplicate.beforeText && !comboExtractForDuplicate.afterText) {
            // Đã được render như combo card, không cần render lại như text
            return null;
          }
        }
        
        // Thử extract product info
        const productInfoForDuplicate = extractProductInfo(childText);
        if (productInfoForDuplicate) {
          // Nếu có pattern "Tên - giá" và có số lượng → có thể đã được render như product card
          // Kiểm tra xem có render được product card không (dựa trên logic render product)
          const cleanText = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
          const lowerText = cleanText.toLowerCase();
          const isQuestion = lowerText.includes('bạn muốn') || 
                            lowerText.includes('có thể') ||
                            (lowerText.includes('không') && lowerText.includes('?'));
          
          if (!isQuestion) {
            // Có thể render như product card, không cần render lại như text
            // (Logic render product sẽ tự động xử lý ở bước sau)
            // Nhưng nếu text chỉ là "1x [tên] - [giá]₫" và không có text khác → có thể là trùng lặp
            const isOnlyProductInfo = /^\d+x\s+.+?\s*-\s*[\d.,\s]+[₫đ]/i.test(cleanText);
            if (isOnlyProductInfo) {
              // Để logic render product xử lý, không return null ở đây
              // Vì có thể là item thực sự cần hiển thị
            }
          }
        }
      }
      
      // ✅ Loại bỏ "Tổng cộng" khỏi product/combo card detection
      // ⚠️ QUAN TRỌNG: Phải check TRƯỚC khi extract product info để tránh nhầm lẫn
      // NHƯNG phải đảm bảo món cuối cùng (nếu có pattern "Tên - giá") vẫn được nhận diện
      const cleanChildTextForTotal = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildTextForTotal = cleanChildTextForTotal.toLowerCase();
      
      // ⚠️ QUAN TRỌNG: CHỈ block nếu text CHỈ là "Tổng cộng" hoặc bắt đầu bằng "Tổng cộng"
      // KHÔNG block nếu text có pattern "Tên - giá" (có thể là món cuối cùng cùng dòng với "Tổng cộng")
      const isOnlyTotalLine = (
        lowerChildTextForTotal.startsWith('tổng cộng') || 
        lowerChildTextForTotal.startsWith('tổng:') ||
        (lowerChildTextForTotal.startsWith('tổng') && lowerChildTextForTotal.includes('₫') && !cleanChildTextForTotal.includes(' - '))
      );
      
      // ⚠️ QUAN TRỌNG: Nếu text có pattern "Tên - giá" VÀ có "tổng cộng" → Có thể là món cuối cùng cùng dòng với "Tổng cộng"
      // Cần tách riêng món cuối cùng ra trước khi check isTotalLine
      const hasProductPatternInTotal = cleanChildTextForTotal.includes(' - ') && 
                                       cleanChildTextForTotal.match(/[\d.,\s]+[₫đ]/) &&
                                       lowerChildTextForTotal.includes('tổng');
      
      if (isOnlyTotalLine && !hasProductPatternInTotal) {
        // ⚠️ QUAN TRỌNG: Nếu text có cả "Tổng cộng" và "Để hoàn tất..." → Tách riêng ra
        // Chỉ tô đỏ phần "Tổng cộng: [số]₫", không tô đỏ phần "Để hoàn tất..."
        const totalMatch = cleanChildTextForTotal.match(/^(Tổng cộng:\s*[\d.,\s]+[₫đ])/i);
        const hasCompleteOrderText = lowerChildTextForTotal.includes('để hoàn tất') || 
                                     lowerChildTextForTotal.includes('cần một số thông tin');
        
        if (totalMatch && hasCompleteOrderText) {
          // Tách riêng "Tổng cộng" và "Để hoàn tất..."
          const totalText = totalMatch[1];
          const afterTotalText = cleanChildTextForTotal.substring(totalMatch[0].length).trim();
          
          return (
            <li {...props} style={{ marginTop: '8px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#dc3545' }}>{totalText}</span>
              {afterTotalText && (
                <>
                  <br />
                  <span style={{ color: 'inherit' }}>{afterTotalText}</span>
                </>
              )}
            </li>
          );
        }
        
        // Nếu chỉ có "Tổng cộng" → Tô đỏ cả dòng
        return (
          <li {...props} style={{ fontWeight: 'bold', color: '#dc3545', marginTop: '8px' }}>
            {children}
          </li>
        );
      }
      
      
      // ✅ KHÔNG ẩn các dòng text - hiển thị đầy đủ tất cả các món mà AI trả về
      // Mỗi dòng có thể là một item riêng biệt trong giỏ hàng (có thể có nhiều item cùng tên)
      // Logic render combo/product card sẽ tự động xử lý việc hiển thị
      
      // ✅ QUAN TRỌNG: ReactMarkdown đã loại bỏ dấu `-` ở đầu list item
      // Nên text sẽ là: "Salad Cải Mầm Trứng - 89.000₫" (không có dấu `-` ở đầu)
      // Cần extract text và clean trước khi check
      let cleanChildTextForProduct = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      
      // ⚠️ QUAN TRỌNG: Nếu text có cả món VÀ "Tổng cộng" → Tách riêng món cuối cùng ra
      // Ví dụ: "Lẩu Gà Ác Tiềm Thuốc Bắc - 250.000₫ Tổng cộng: 449.000₫"
      // → Cần extract "Lẩu Gà Ác Tiềm Thuốc Bắc - 250.000₫" làm product
      // ⚠️ QUAN TRỌNG: Đây là nguyên nhân chính khiến món cuối cùng không render như product card!
      const lowerTextForProduct = cleanChildTextForProduct.toLowerCase();
      const hasProductPatternAndTotal = cleanChildTextForProduct.includes(' - ') && 
                                       cleanChildTextForProduct.match(/[\d.,\s]+[₫đ]/) &&
                                       (lowerTextForProduct.includes('tổng cộng') || lowerTextForProduct.includes('tổng:'));
      
      if (hasProductPatternAndTotal) {
        // Tìm vị trí của "Tổng cộng" hoặc "Tổng:"
        const totalIndex = lowerTextForProduct.indexOf('tổng cộng');
        const totalIndex2 = lowerTextForProduct.indexOf('tổng:');
        const totalIndexFinal = totalIndex > -1 ? totalIndex : (totalIndex2 > -1 ? totalIndex2 : -1);
        
        if (totalIndexFinal > 0) {
          // Lấy phần trước "Tổng cộng" làm product text
          const productTextBeforeTotal = cleanChildTextForProduct.substring(0, totalIndexFinal).trim();
          
          // Nếu phần trước có pattern "Tên - giá" → Đây là món cuối cùng, dùng text này để extract product
          if (productTextBeforeTotal.includes(' - ') && productTextBeforeTotal.match(/[\d.,\s]+[₫đ]/)) {
            // ⚠️ QUAN TRỌNG: Override cleanChildTextForProduct để extract product info từ phần món, không phải phần "Tổng cộng"
            cleanChildTextForProduct = productTextBeforeTotal;
          }
        }
      }
      
      // ✅ Debug: Log để kiểm tra text extraction
      // console.log('🔍 [li] childText:', childText, 'cleanChildTextForProduct:', cleanChildTextForProduct);
      
      // ✅ Kiểm tra xem có phải product không (có pattern "Tên - giá")
      // ⚠️ QUAN TRỌNG: Phải check TRƯỚC các điều kiện khác để đảm bảo món ăn được nhận diện
      // ⚠️ QUAN TRỌNG: Logic này phải chạy cho TẤT CẢ các list items, kể cả món cuối cùng
      // ⚠️ QUAN TRỌNG: Phải nhận diện được CẢ món duy nhất và món cuối cùng
      let productInfo = extractProductInfo(cleanChildTextForProduct);
      
      // ✅ Debug: Log để kiểm tra productInfo extraction
      // if (!productInfo && cleanChildTextForProduct.includes(' - ') && cleanChildTextForProduct.match(/[\d.,\s]+[₫đ]/)) {
      //   console.log('⚠️ [li] Failed to extract productInfo for:', cleanChildTextForProduct);
      // }
      
      // ✅ Nếu không match, thử pattern đơn giản nhất: "Tên - giá" (không cần dấu `-` ở đầu)
      // Pattern này sẽ match ngay cả khi có nhiều dấu `-` trong tên món
      // ⚠️ QUAN TRỌNG: Phải tìm dấu `-` cuối cùng, không phải dấu đầu tiên
      if (!productInfo) {
        // Tìm dấu `-` cuối cùng trước giá (có ₫ hoặc đ)
        // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
        const lastDashIndex = cleanChildTextForProduct.lastIndexOf(' - ');
        if (lastDashIndex > 0) {
          // Kiểm tra xem phần sau dấu `-` cuối cùng có phải là giá không
          const afterLastDash = cleanChildTextForProduct.substring(lastDashIndex + 3).trim();
          const priceMatch = afterLastDash.match(/^([\d.,\s]+[₫đ])$/i);
          
          if (priceMatch) {
            const price = priceMatch[1].trim();
            const priceNum = price.replace(/[^\d]/g, '');
            
            // Lấy phần trước dấu `-` cuối cùng làm tên món
            const namePart = cleanChildTextForProduct.substring(0, lastDashIndex).trim();
            
            // Loại bỏ các từ khóa thường gặp ở đầu
            const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
            
            // Kiểm tra: tên phải có ít nhất 3 ký tự và giá phải có ít nhất 3 chữ số
            if (cleanedName.length >= 3 && priceNum.length >= 3) {
              productInfo = {
                name: cleanedName,
                price: price
              };
            }
          }
        }
      }
      
      // ✅ Nếu vẫn không match, thử pattern "Tên - số" (không có ₫)
      if (!productInfo) {
        const lastDashIndex = cleanChildTextForProduct.lastIndexOf(' - ');
        if (lastDashIndex > 0) {
          const afterLastDash = cleanChildTextForProduct.substring(lastDashIndex + 3).trim();
          const priceMatch = afterLastDash.match(/^([\d.,\s]+)$/);
          
          if (priceMatch) {
            const priceStr = priceMatch[1].trim();
            const priceNum = priceStr.replace(/[^\d]/g, '');
            
            // Lấy phần trước dấu `-` cuối cùng làm tên món
            const namePart = cleanChildTextForProduct.substring(0, lastDashIndex).trim();
            const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
            
            if (cleanedName.length >= 3 && priceNum.length >= 3) {
              productInfo = {
                name: cleanedName,
                price: `${priceStr}₫`
              };
            }
          }
        }
      }
      
      // ✅ Nếu vẫn không match, thử pattern đơn giản hơn: chỉ cần có dấu `-` và số ở cuối
      // Để đảm bảo món cuối cùng và món duy nhất cũng được nhận diện
      // ⚠️ QUAN TRỌNG: Phải tìm dấu `-` cuối cùng, không phải dấu đầu tiên
      if (!productInfo) {
        const lastDashIndexSimple = cleanChildTextForProduct.lastIndexOf(' - ');
        if (lastDashIndexSimple > 0) {
          const afterLastDashSimple = cleanChildTextForProduct.substring(lastDashIndexSimple + 3).trim();
          const priceMatchSimple = afterLastDashSimple.match(/^([\d.,\s]+[₫đ]?)$/);
          
          if (priceMatchSimple) {
            const priceStr = priceMatchSimple[1].trim();
            const priceNum = priceStr.replace(/[^\d]/g, '');
            
            // Lấy phần trước dấu `-` cuối cùng làm tên món
            const namePart = cleanChildTextForProduct.substring(0, lastDashIndexSimple).trim();
            const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
            
            if (cleanedName.length >= 3 && priceNum.length >= 3) {
              productInfo = {
                name: cleanedName,
                price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
              };
            }
          }
        }
      }
      
      // ✅ Nếu vẫn không match, thử pattern đơn giản nhất: "Tên - giá" ở bất kỳ đâu
      // Fallback cuối cùng để đảm bảo món cuối cùng và món duy nhất được nhận diện
      // ⚠️ QUAN TRỌNG: Phải tìm dấu `-` cuối cùng, không phải dấu đầu tiên
      // ⚠️ QUAN TRỌNG: Pattern này phải match được TẤT CẢ các món, kể cả món cuối cùng
      if (!productInfo) {
        const lastDashIndexFinal = cleanChildTextForProduct.lastIndexOf(' - ');
        if (lastDashIndexFinal > 0) {
          const afterLastDashFinal = cleanChildTextForProduct.substring(lastDashIndexFinal + 3).trim();
          // Pattern linh hoạt hơn: match số có thể có dấu chấm, phẩy, khoảng trắng và có thể có ₫ hoặc đ
          const priceMatchFinal = afterLastDashFinal.match(/^([\d.,\s]+[₫đ]?)$/);
          
          if (priceMatchFinal) {
            const priceStr = priceMatchFinal[1].trim();
            const priceNum = priceStr.replace(/[^\d]/g, '');
            
            // Lấy phần trước dấu `-` cuối cùng làm tên món
            const namePart = cleanChildTextForProduct.substring(0, lastDashIndexFinal).trim();
            const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
            
            // Kiểm tra: tên phải có ít nhất 3 ký tự và giá phải có ít nhất 3 chữ số
            if (cleanedName.length >= 3 && priceNum.length >= 3) {
              productInfo = {
                name: cleanedName,
                price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
              };
            }
          }
        }
      }
      
      // ✅ Nếu vẫn không match, thử extract trực tiếp từ text với pattern đơn giản nhất
      // Đảm bảo món cuối cùng và món duy nhất được nhận diện
      // ⚠️ QUAN TRỌNG: Đây là fallback cuối cùng, phải match được TẤT CẢ các món
      if (!productInfo && cleanChildTextForProduct.includes(' - ')) {
        // Pattern đơn giản nhất: Tìm dấu `-` cuối cùng và số ở sau
        const lastDashIdx = cleanChildTextForProduct.lastIndexOf(' - ');
        if (lastDashIdx > 0) {
          const afterDash = cleanChildTextForProduct.substring(lastDashIdx + 3).trim();
          // Match số có thể có dấu chấm, phẩy, khoảng trắng và có thể có ₫ hoặc đ
          const pricePattern = /^([\d.,\s]+[₫đ]?)$/;
          if (pricePattern.test(afterDash)) {
            const priceStr = afterDash.trim();
            const priceNum = priceStr.replace(/[^\d]/g, '');
            const namePart = cleanChildTextForProduct.substring(0, lastDashIdx).trim();
            const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
            
            // Kiểm tra: tên phải có ít nhất 3 ký tự và giá phải có ít nhất 3 chữ số
            if (cleanedName.length >= 3 && priceNum.length >= 3) {
              productInfo = {
                name: cleanedName,
                price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
              };
            }
          }
        }
      }
      
      // ✅ Nếu không match, thử tìm trong cache với toàn bộ text
      if (!productInfo) {
        const maybeProduct = findProductInCache(cleanChildTextForProduct);
        if (maybeProduct) {
          productInfo = {
            name: maybeProduct.name,
            price: maybeProduct.price ? `${maybeProduct.price.toLocaleString('vi-VN')}₫` : undefined
          };
        }
      }
      
      // ✅ Nếu vẫn không match, kiểm tra xem có phải là tên món đơn thuần không
      let shouldRenderAsProduct = false;
      let productName = '';
      let displayPrice = '';
      
      // ✅ QUAN TRỌNG: Nếu đã extract được productInfo, LUÔN render như product card
      // KHÔNG bị block bởi các điều kiện khác (isInfoLine, isQuestion, etc.)
      // ⚠️ QUAN TRỌNG: Điều này đảm bảo TẤT CẢ các món có pattern "Tên - giá" đều được render như product card
      if (productInfo) {
        // Có pattern "Tên - giá" hoặc tìm thấy trong cache
        productName = productInfo.name;
        displayPrice = productInfo.price || '';
        shouldRenderAsProduct = true;
      } else {
        // Thử kiểm tra xem có phải là tên món không (không có giá hoặc format khác)
        const lowerText = cleanChildTextForProduct.toLowerCase();
        const isQuestion = lowerText.includes('bạn muốn') || 
                          lowerText.includes('có thể') ||
                          (lowerText.includes('không') && lowerText.includes('?')) ||
                          lowerText.includes('?') ||
                          lowerText.match(/^[a-z]+\?/) ||
                          lowerText.startsWith('bạn') && lowerText.length < 20;
        
        const isNumberOnly = /^\d+([.,]\d+)?[₫đ]?$/.test(cleanChildTextForProduct.trim());
        const isTooShort = cleanChildTextForProduct.length <= 2;
        
        // ✅ Loại bỏ các text không phải tên món
        // ⚠️ QUAN TRỌNG: CHỈ block text bắt đầu bằng "tôi đã thu thập" VÀ không có pattern "Tên - giá"
        // Vì các list items bên dưới có thể chứa "tôi đã thu thập" trong context nhưng vẫn là tên món
        // ⚠️ QUAN TRỌNG: KHÔNG block các list items có pattern "Tên - giá" ngay cả khi có từ "tôi đã thu thập" trong context
        const isInfoLine = lowerText.includes('thông tin liên hệ') ||
                          lowerText.includes('số điện thoại') ||
                          lowerText.includes('địa chỉ') ||
                          lowerText.includes('ghi chú') ||
                          lowerText.includes('tổng cộng') ||
                          lowerText.includes('tổng:') ||
                          lowerText.startsWith('bạn có muốn') ||
                          lowerText.startsWith('bạn muốn xác nhận') ||
                          (lowerText.startsWith('tôi đã thu thập') && !cleanChildTextForProduct.includes(' - ')); // CHỈ block nếu là dòng "Tôi đã thu thập" không có pattern "Tên - giá"
        
        // ✅ Render nếu text có vẻ như tên món (không phải câu hỏi, không phải thông tin)
        // ⚠️ QUAN TRỌNG: Phải check pattern "Tên - giá" TRƯỚC khi check isInfoLine để đảm bảo món cuối cùng được nhận diện
        // Kiểm tra xem có pattern "Tên - giá" không (ngay cả khi có từ "tôi đã thu thập" trong context)
        const hasProductPattern = cleanChildTextForProduct.includes(' - ') && 
                                  cleanChildTextForProduct.match(/[\d.,\s]+[₫đ]/);
        
        if (hasProductPattern || (!isQuestion && !isNumberOnly && !isTooShort && !isInfoLine && cleanChildTextForProduct.length > 2)) {
          // ✅ Thử pattern linh hoạt: Tìm dấu `-` cuối cùng trước giá
          // ⚠️ QUAN TRỌNG: Phải tìm từ cuối lên để xử lý trường hợp có nhiều dấu `-` trong tên món
          const lastDashIndex = cleanChildTextForProduct.lastIndexOf(' - ');
          if (lastDashIndex > 0) {
            const afterLastDash = cleanChildTextForProduct.substring(lastDashIndex + 3).trim();
            const priceMatch = afterLastDash.match(/^([\d.,\s]+[₫đ]?)$/i);
            
            if (priceMatch) {
              const priceStr = priceMatch[1].trim();
              const priceNum = priceStr.replace(/[^\d]/g, '');
              
              // Lấy phần trước dấu `-` cuối cùng làm tên món
              const namePart = cleanChildTextForProduct.substring(0, lastDashIndex).trim();
              const cleanedName = namePart.replace(/^(giỏ\s*hàng|món|đơn\s*hàng|sản\s*phẩm|item):?\s*/i, '').trim();
              
              if (cleanedName.length >= 3 && priceNum.length >= 3) {
                productName = cleanedName;
                displayPrice = priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`;
                shouldRenderAsProduct = true;
              }
            }
          }
          
          // ✅ Nếu chưa match, thử tìm trong cache với tên món
          if (!shouldRenderAsProduct) {
            const maybeProduct = findProductInCache(cleanChildTextForProduct);
          if (maybeProduct) {
            productName = maybeProduct.name;
            displayPrice = maybeProduct.price ? `${maybeProduct.price.toLocaleString('vi-VN')}₫` : '';
            shouldRenderAsProduct = true;
          } else {
              // ✅ Fallback: Render nếu text có vẻ như tên món
              const words = cleanChildTextForProduct.split(/\s+/).filter(w => w.length > 1);
            const wordCount = words.length;
            const hasLongWord = words.some(w => w.length > 5);
            
              if ((wordCount >= 2 || (wordCount === 1 && hasLongWord) || cleanChildTextForProduct.length > 8) && !isInfoLine) {
                productName = cleanChildTextForProduct;
              shouldRenderAsProduct = true;
              }
            }
          }
        }
      }
      
      if (shouldRenderAsProduct) {
        // ✅ Kiểm tra xem có phải là cart item không (dựa trên context hoặc pattern)
        // Nếu text xuất hiện trong context của giỏ hàng, thử lấy từ cart items
        let cartItemImage: string | null = null;
        let cartItemProductId: string | null = null;
        
        try {
          const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            // Tìm cart item có tên khớp với productName
            const matchingCartItem = cartItems.find((item: any) => {
              const itemName = item.product?.name || '';
              const normalizedItemName = normalizeText(itemName);
              const normalizedProductName = normalizeText(productName);
              
              // So sánh tên (case insensitive, không dấu)
              return normalizedItemName === normalizedProductName ||
                     normalizedItemName.includes(normalizedProductName) ||
                     normalizedProductName.includes(normalizedItemName);
            });
            
            if (matchingCartItem?.product) {
              cartItemImage = matchingCartItem.product.image || null;
              cartItemProductId = matchingCartItem.product._id || matchingCartItem.product.id || null;
              
              // Nếu có productId nhưng không có image, thử lấy từ productsCache
              if (cartItemProductId && !cartItemImage) {
                for (const cachedProduct of productsCache.values()) {
                  if (cachedProduct.id === cartItemProductId) {
                    cartItemImage = cachedProduct.image || null;
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          // Silent fail
        }
        
        // Re-fetch từ cache để lấy image mới nhất (sau khi async fetch)
        const product = findProductInCache(productName);
        
        // Nếu không có price từ extract, lấy từ product cache hoặc cart item
        if (!displayPrice) {
          if (product?.price) {
            displayPrice = `${product.price.toLocaleString('vi-VN')}₫`;
          } else {
            // Thử lấy từ cart item
            try {
              const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
              const matchingCartItem = cartItems.find((item: any) => {
                const itemName = item.product?.name || '';
                const normalizedItemName = normalizeText(itemName);
                const normalizedProductName = normalizeText(productName);
                return normalizedItemName === normalizedProductName ||
                       normalizedItemName.includes(normalizedProductName) ||
                       normalizedProductName.includes(normalizedItemName);
              });
              if (matchingCartItem?.product?.price) {
                displayPrice = `${matchingCartItem.product.price.toLocaleString('vi-VN')}₫`;
              }
            } catch (error) {
              // Silent fail
            }
          }
        }
        
        const finalProductName = product?.name || productName;
        const productSlug = product?.slug || `${removeVietnameseTones(productName)}-${product?.id || cartItemProductId || 'unknown'}`;
        
        // ✅ Lấy image URL với fallback: cart item → product cache → fetch API
        let imageUrl: string | null = null;
        
        // Ưu tiên 1: Lấy từ cart item (nếu có)
        if (cartItemImage) {
          imageUrl = getImageUrl(cartItemImage);
        } else if (product?.image) {
          // Ưu tiên 2: Lấy từ product cache
          imageUrl = getImageUrl(product.image);
        } else if (product?.id || cartItemProductId) {
          // Ưu tiên 3: Fetch từ API
          const productIdToFetch = product?.id || cartItemProductId;
          if (productIdToFetch) {
            // Nếu không có image trong cache, fetch product detail async
            fetch(`${API_URL}/api/products/${productIdToFetch}`)
              .then(res => res.json())
              .then(data => {
                const productDetail = data.data || data;
                if (productDetail?.image) {
                  const updatedProduct = product ? {
                    ...product,
                    image: productDetail.image
                  } : {
                    id: productIdToFetch,
                    name: finalProductName,
                    image: productDetail.image,
                    price: productDetail.price,
                    slug: productSlug
                  };
                  const normalizedName = normalizeText(product?.name || productName);
                  const originalName = (product?.name || productName).toLowerCase().trim();
                  setProductsCache(prev => {
                    const newCache = new Map(prev);
                    newCache.set(normalizedName, updatedProduct);
                    newCache.set(originalName, updatedProduct);
                    return newCache;
                  });
                  setImageUpdateTrigger(prev => prev + 1);
                }
              })
              .catch(() => {
                // Silent fail
              });
          }
        } else if (!product && productName.length > 3) {
          // ✅ Nếu không tìm thấy product trong cache, thử search để tìm
          // (có thể tên hơi khác một chút)
          const searchName = productName.toLowerCase().trim();
          // Tìm trong cache với partial match
          for (const [key, cachedProduct] of productsCache.entries()) {
            if (normalizeText(key).includes(normalizeText(searchName)) || 
                normalizeText(searchName).includes(normalizeText(key))) {
              // Tìm thấy, update và re-render
              const updatedProduct = { ...cachedProduct };
              const normalizedName = normalizeText(searchName);
              const originalName = searchName;
              setProductsCache(prev => {
                const newCache = new Map(prev);
                newCache.set(normalizedName, updatedProduct);
                newCache.set(originalName, updatedProduct);
                return newCache;
              });
              // Re-fetch để lấy image
              if (updatedProduct.id) {
                fetch(`${API_URL}/api/products/${updatedProduct.id}`)
                  .then(res => res.json())
                  .then(data => {
                    const productDetail = data.data || data;
                    if (productDetail?.image) {
                      const finalProduct = { ...updatedProduct, image: productDetail.image };
                      setProductsCache(prev => {
                        const newCache = new Map(prev);
                        newCache.set(normalizedName, finalProduct);
                        newCache.set(originalName, finalProduct);
                        return newCache;
                      });
                      setImageUpdateTrigger(prev => prev + 1);
                    }
                  })
                  .catch(() => {});
              }
              break;
            }
          }
        }
        
        // ✅ Sử dụng imageUpdateTrigger để đảm bảo re-render khi image được fetch
        const _ = imageUpdateTrigger; // eslint-disable-line
        
        // ✅ Wrap toàn bộ card trong Link để có thể click vào bất kỳ đâu
        const cardContent = (
          <div className="product-card-inline">
            {/* ✅ Luôn hiển thị image wrapper (có placeholder nếu không có image) */}
            <div className="product-card-image-wrapper">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={finalProductName}
                  className="product-card-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  loading="lazy"
                />
              ) : (
                // Placeholder icon khi không có image
                <div className="product-card-placeholder">
                  <span style={{ fontSize: '32px', opacity: 0.3 }}>🍽️</span>
                </div>
              )}
            </div>
            <div className="product-card-content">
              <span className="product-card-name">
                {finalProductName}
              </span>
              {displayPrice && (
                <span className="product-card-price">{displayPrice}</span>
              )}
            </div>
          </div>
        );

        // ✅ Nếu có product, wrap trong Link để có thể click vào bất kỳ đâu
        if (product) {
          return (
            <li className="product-list-item" {...props}>
              <Link 
                to={`/menu/${productSlug}`}
                className="product-card-link-wrapper"
                onClick={(e) => e.stopPropagation()}
              >
                {cardContent}
              </Link>
            </li>
          );
        }

        // ✅ Nếu không có product, chỉ hiển thị card (không clickable)
        return (
          <li className="product-list-item" {...props}>
            {cardContent}
          </li>
        );
      }
      
      // Không phải product, render bình thường
      return <li {...props}>{children}</li>;
    },
  };

  // Helper: Lấy cart data từ localStorage
  const getCartFromStorage = () => {
    try {
      const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return null;
      }
      
      // Transform từ localStorage format → format phù hợp với AI
      const transformedCart = {
        items: cartItems.map((item: any) => {
          const product = item.product || {};
          const combo = item.combo || {};
          const isCombo = !!item.combo;
          const itemData = isCombo ? combo : product;
          
          return {
            ...(isCombo ? { comboId: combo._id || combo.id } : { productId: product._id || product.id }),
            name: itemData.name || (isCombo ? 'Combo' : 'Sản phẩm'),
            price: itemData.price || 0,
            quantity: item.quantity || 1,
            image: itemData.image || ''
          };
        }),
        total: cartItems.reduce((sum: number, item: any) => {
          const product = item.product || {};
          const combo = item.combo || {};
          const itemData = item.combo ? combo : product;
          return sum + (itemData.price || 0) * (item.quantity || 1);
        }, 0)
      };
      
      return transformedCart;
    } catch (error) {
      console.error('Error reading cart from localStorage:', error);
      return null;
    }
  };

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend) return;

    // ✅ Protection: Prevent duplicate requests
    const now = Date.now();
    const timeSinceLastSend = now - lastSentTimeRef.current;
    const isDuplicateMessage = messageToSend === lastSentMessageRef.current && timeSinceLastSend < 2000; // 2 seconds debounce
    
    if (isSendingRef.current) {
      console.warn('⚠️ Request already in progress, ignoring duplicate send');
      return;
    }
    
    if (isDuplicateMessage) {
      console.warn('⚠️ Duplicate message detected, ignoring:', {
        message: messageToSend,
        timeSinceLastSend: timeSinceLastSend + 'ms'
      });
      return;
    }

    // ✅ Set flags to prevent duplicate
    isSendingRef.current = true;
    lastSentMessageRef.current = messageToSend;
    lastSentTimeRef.current = now;

    // Ẩn FAQ khi người dùng bắt đầu chat
    setShowFAQ(false);

    const userMessage = { text: messageToSend, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const currentSessionId = sessionId || getExistingSessionId(userId);

    // ✅ Đọc cart từ localStorage (nếu có) - LUÔN gửi cart thực tế lên AI
    const cartData = getCartFromStorage();
    
    // ✅ Kiểm tra xem user có đang yêu cầu đặt hàng hoặc hỏi về giỏ hàng không
    // Mở rộng pattern matching để bắt nhiều cách hỏi hơn
    const isOrderRequest = /đặt|order|đơn hàng|thanh toán|checkout|tôi muốn đặt/i.test(messageToSend);
    const isCartQuery = /giỏ hàng|cart|xem giỏ|món trong giỏ|món nào|món ăn nào|có gì trong giỏ|bạn có|tôi có/i.test(messageToSend);
    
    // ✅ QUAN TRỌNG: Nếu user yêu cầu đặt hàng và có cart, ĐẢM BẢO sync cart lên server TRƯỚC
    // Để tránh mất món khi AI gọi "carts Find" và trả về cart rỗng
    // ⚠️ PHẢI đợi sync hoàn thành TRƯỚC KHI gửi chat request
    if (isOrderRequest && cartData && cartData.items.length > 0) {
      try {
        const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
        
        // Tính total từ cartItems
        const total = cartItems.reduce((sum: number, item: any) => {
          return sum + (item.product?.price || item.combo?.price || item.price || 0) * (item.quantity || 1);
        }, 0);
        
        // ⚠️ QUAN TRỌNG: Clear debounce timeout nếu có, và sync ngay lập tức
        if ((window as any).cartSyncTimeout) {
          clearTimeout((window as any).cartSyncTimeout);
        }
        
        // Gọi API sync cart trực tiếp (đợi hoàn thành, không debounce)
        const cartService = (await import('../services/cartService')).default;
        await cartService.saveCart(cartItems);
        
        console.log('✅ Cart synced to server before order request:', {
          itemsCount: cartItems.length,
          total
        });
      } catch (error) {
        console.error('❌ Failed to sync cart before order:', error);
        // Vẫn tiếp tục gửi request, nhưng cart từ request sẽ được ưu tiên
      }
    }
    
    // ✅ QUAN TRỌNG: LUÔN gửi cart nếu có món trong giỏ (kể cả khi user đang nhập địa chỉ)
    // Để AI luôn thấy cart thực tế và không báo "giỏ hàng trống"
    // Đặc biệt quan trọng trong flow đặt hàng (khi user nhập địa chỉ, cart vẫn phải được gửi)
    const shouldSendCart = cartData && 
                           Array.isArray(cartData.items) && 
                           cartData.items.length > 0;

    // ✅ Lấy token từ localStorage để gửi cho backend
    const token = localStorage.getItem('token');

    try {
      // Gọi qua backend proxy để tránh lỗi CORS
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // ✅ Thêm Authorization header nếu có token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/n8n/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: messageToSend,
          userId,
          sessionId: currentSessionId,
          // ✅ Gửi token trong body để đảm bảo backend nhận được
          ...(token ? { token } : {}),
          context: {
            // ✅ LUÔN gửi cart data nếu có (khi đặt hàng, hỏi về giỏ hàng, hoặc có món trong giỏ)
            // Để AI luôn thấy cart thực tế (bao gồm món được thêm bằng tay)
            // ✅ QUAN TRỌNG: Tính toán hasCart và cartItemsCount dựa trên cartData thực tế
            ...(shouldSendCart ? { 
              cart: cartData,
              hasCart: true,
              cartItemsCount: cartData.items.length,
              cartTotal: cartData.total || 0
            } : {
              // ✅ QUAN TRỌNG: Nếu không có cart, PHẢI gửi hasCart = false để backend tính đúng
              hasCart: false,
              cartItemsCount: 0,
              cartTotal: 0
            }),
          },
          // ✅ Gửi cart ở root level để AI dễ truy cập (ưu tiên cao)
          // ✅ QUAN TRỌNG: Tính toán hasCart và cartItemsCount dựa trên cartData thực tế
          ...(shouldSendCart ? { 
            cart: cartData,
            metadata: {
              hasCart: true,
              cartItemsCount: cartData.items.length,
              cartTotal: cartData.total || 0,
              source: 'localStorage' // Đánh dấu cart từ localStorage (cart thực tế)
            }
          } : {
            // ✅ QUAN TRỌNG: Nếu không có cart, PHẢI gửi metadata với hasCart = false để backend tính đúng
            metadata: {
              hasCart: false,
              cartItemsCount: 0,
              cartTotal: 0,
              source: 'localStorage'
            }
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.reply || `Lỗi ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('❌ Failed to parse JSON response:', error);
        throw new Error('Không thể parse response từ server');
      }

      // ⚠️ CỰC KỲ QUAN TRỌNG: Đảm bảo reply KHÔNG rỗng
      let reply = data.reply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
      
      // ✅ Loại bỏ các dòng sản phẩm bị lặp lại (ví dụ: cùng món xuất hiện cả dạng bullet và text)
      reply = removeDuplicateProductLines(reply);
      
      // ✅ Loại bỏ JSON data khỏi reply text (nếu có) - để tránh hiển thị JSON trong chat
      // Pattern: tìm và loại bỏ các block JSON như { "id": "...", "orderCode": "...", ... }
      reply = reply.replace(/\{[\s\S]*?"orderCode"[\s\S]*?\}/g, '').trim();
      reply = reply.replace(/\{[\s\S]*?"id"[\s\S]*?"orderCode"[\s\S]*?\}/g, '').trim();
      // Loại bỏ các dòng có chứa JSON structure
      const lines = reply.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        // Loại bỏ dòng có chứa JSON structure (có nhiều dấu ngoặc nhọn, dấu phẩy, dấu hai chấm)
        if (trimmed.startsWith('{') && trimmed.includes('"') && trimmed.includes(':')) {
          return false;
        }
        // Loại bỏ dòng có chứa các field JSON như "id", "orderCode", "productid", v.v.
        if (trimmed.match(/^\s*"[^"]+"\s*:\s*"[^"]+"\s*,?\s*$/)) {
          return false;
        }
        return true;
      });
      reply = cleanedLines.join('\n').trim();
      
      // Kiểm tra nếu reply rỗng hoặc chỉ có khoảng trắng
      if (!reply || reply.trim() === '') {
        reply = 'Đã thêm món vào giỏ hàng thành công.';
      }
      
      const normalizedContext = normalizeChatContext(data.context || null);

      const activeSessionId = data.sessionId || currentSessionId;
      setSessionId(activeSessionId);
      sessionStorage.setItem('n8n_session_id', activeSessionId);

      // ✅ Helper để transform items từ backend (có product/combo object) sang format cho OrderInfoCard
      const transformOrderItems = (items: any[]) => {
        if (!items || !Array.isArray(items)) return [];
        return items.map((item: any) => {
          // ✅ Lấy thông tin từ product hoặc combo object
          const product = item.product;
          const combo = item.combo;
          
          return {
            id: item.id,
            name: product?.name || combo?.name || item.name || 'N/A',
            price: item.price || product?.price || combo?.price || 0,
            quantity: item.quantity || 1,
            image: product?.image || combo?.image || item.image || null,
            productId: item.productId || product?.id,
            comboId: item.comboId || combo?.id,
            // ✅ Giữ nguyên product và combo object để có thể dùng sau
            product: product,
            combo: combo,
          };
        });
      };

      // ✅ Extract order data từ response (có thể từ data.order hoặc data.data)
      let orderData: OrderData | undefined = undefined;
      if (data.order) {
        console.log('📦 Found order data in data.order:', {
          orderCode: data.order.orderCode,
          hasQrCode: !!data.order.qrCode,
          qrCodeUrl: data.order.qrCode?.qrCodeUrl,
          qrCodeKeys: data.order.qrCode ? Object.keys(data.order.qrCode) : []
        });
        orderData = {
          id: data.order.id,
          orderCode: data.order.orderCode,
          total: data.order.total,
          qrCode: data.order.qrCode || data.data?.qrCode,
          paymentStatus: data.order.paymentStatus,
          status: data.order.status,
          items: transformOrderItems(data.order.items),
          phoneNumber: data.order.phoneNumber,
          address: data.order.address,
          provinceName: data.order.provinceName,
          districtName: data.order.districtName,
          wardName: data.order.wardName,
          note: data.order.note,
          createdAt: data.order.createdAt,
        };
      } else if (data.data) {
        // Kiểm tra nếu data.data có orderCode (đây là order response)
        if (data.data.orderCode || data.data.id) {
          console.log('📦 Found order data in data.data:', {
            orderCode: data.data.orderCode,
            hasQrCode: !!data.data.qrCode,
            qrCodeUrl: data.data.qrCode?.qrCodeUrl,
            qrCodeKeys: data.data.qrCode ? Object.keys(data.data.qrCode) : []
          });
          orderData = {
            id: data.data.id,
            orderCode: data.data.orderCode,
            total: data.data.total,
            qrCode: data.data.qrCode,
            paymentStatus: data.data.paymentStatus,
            status: data.data.status,
            items: transformOrderItems(data.data.items),
            phoneNumber: data.data.phoneNumber,
            address: data.data.address,
            provinceName: data.data.provinceName,
            districtName: data.data.districtName,
            wardName: data.data.wardName,
            note: data.data.note,
            createdAt: data.data.createdAt,
          };
        }
      }
      
      // ⚠️ Debug: Log final orderData để kiểm tra
      if (orderData) {
        console.log('✅ Final orderData to render:', {
          orderCode: orderData.orderCode,
          hasQrCode: !!orderData.qrCode,
          qrCodeUrl: orderData.qrCode?.qrCodeUrl,
          qrCodeKeys: orderData.qrCode ? Object.keys(orderData.qrCode) : []
        });
      } else {
        console.log('⚠️ No orderData found in response');
        console.log('📋 Response structure:', {
          hasOrder: !!data.order,
          hasData: !!data.data,
          dataKeys: Object.keys(data || {})
        });
      }

      // ✅ ĐỒNG BỘ CART TỪ AI RESPONSE VỀ FRONTEND
      // Nếu AI trả về cart data (khi thêm/xem/cập nhật/xóa giỏ hàng), sync vào localStorage
      if (data.cart) {
        syncCartFromAI(data.cart);
      } else if (data.context?.cart) {
        syncCartFromAI(data.context.cart);
      } else {
        // ✅ QUAN TRỌNG: Nếu có order data (đơn hàng đã được tạo thành công) → Clear cart
        if (orderData && orderData.orderCode) {
          console.log('✅ Phát hiện order data trong response, clear cart trong localStorage');
          syncCartFromAI({ items: [], total: 0 });
          // ✅ Gọi API để clear cart trên server (backup solution)
          try {
            const token = localStorage.getItem('token');
            if (token) {
              await fetch(`${API_URL}/api/cart`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              console.log('✅ Cart cleared on server via API');
            }
          } catch (error) {
            console.error('⚠️ Error clearing cart on server (non-critical):', error);
          }
        } else {
          // ✅ Nếu không có order data nhưng reply có từ khóa đặt hàng thành công
          // → Clear cart trong localStorage để đồng bộ với database
          const replyLower = reply.toLowerCase();
          const isOrderSuccess = replyLower.includes('đặt thành công') || 
                                 replyLower.includes('đã đặt thành công') ||
                                 replyLower.includes('mã đơn') ||
                                 replyLower.includes('order code') ||
                                 replyLower.includes('giỏ hàng đã được làm trống') ||
                                 replyLower.includes('đã được làm trống');
          const isClearCart = replyLower.includes('xóa toàn bộ') || 
                              replyLower.includes('xóa hết giỏ hàng') || 
                              replyLower.includes('làm trống giỏ hàng') ||
                              replyLower.includes('clear cart') ||
                              replyLower.includes('đã xóa toàn bộ');
          
          if (isOrderSuccess || isClearCart) {
            console.log('✅ Phát hiện từ khóa đặt hàng thành công/xóa giỏ hàng trong reply, clear cart trong localStorage');
            syncCartFromAI({ items: [], total: 0 });
            // ✅ Gọi API để clear cart trên server
            try {
              const token = localStorage.getItem('token');
              if (token) {
                await fetch(`${API_URL}/api/cart`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                console.log('✅ Cart cleared on server via API');
              }
            } catch (error) {
              console.error('⚠️ Error clearing cart on server (non-critical):', error);
            }
          }
        }
      }

      const newMessage = { 
        text: reply,
        isUser: false,
        context: normalizedContext,
        orderData: orderData, // ✅ Thêm order data để hiển thị QR code
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending message to N8N:', error);
      const errorMessage = error instanceof Error ? error.message : 'Xin lỗi, đã có lỗi xảy ra khi kết nối với trợ lý.';
      setMessages(prev => [...prev, { 
        text: errorMessage,
        isUser: false,
      }]);
    } finally {
      setIsLoading(false);
      // ✅ Reset flag để cho phép request tiếp theo
      isSendingRef.current = false;
    }
  };

  // Sync cart từ AI response về localStorage - REPLACE hoàn toàn (để đồng bộ với database)
  const syncCartFromAI = (cartData: any) => {
    // ✅ Xử lý trường hợp cart rỗng (items = [])
    if (!cartData) {
      return; // Không có cart data, bỏ qua
    }
    
    // ✅ QUAN TRỌNG: Nếu items là array rỗng [], vẫn phải sync để clear cart
    if (!Array.isArray(cartData.items)) {
      // Nếu items không phải array, nhưng có total = 0 → có thể là cart rỗng
      if (cartData.total === 0 || cartData.total === undefined) {
        console.log('✅ Cart data có total = 0, clear cart trong localStorage');
        cartData.items = [];
      } else {
        return; // Không có items hợp lệ, bỏ qua
      }
    }

    // ✅ Lấy cart hiện tại từ localStorage để so sánh
    let currentCartItems: any[] = [];
    try {
      currentCartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch (error) {
      currentCartItems = [];
    }

    // ✅ Transform cart data từ AI format → localStorage format
    const newCartItems: any[] = [];
    
    cartData.items.forEach((item: any) => {
      const productId = item.productId;
      const comboId = item.comboId;
      
      // Phải có ít nhất productId hoặc comboId
      if (!productId && !comboId) return;
      
      const isCombo = !!comboId;
      const itemId = comboId || productId;
      
      let image = item.image || '';
      
      // ✅ Nếu không có image từ AI, thử lấy từ cache
      if (!image && itemId) {
        if (isCombo) {
          // Tìm trong combosCache
          for (const cachedCombo of combosCache.values()) {
            if (cachedCombo.id === itemId) {
              image = cachedCombo.image || '';
              break;
            }
          }
        } else {
          // Tìm trong productsCache
          for (const cachedProduct of productsCache.values()) {
            if (cachedProduct.id === itemId) {
              image = cachedProduct.image || '';
              break;
            }
          }
        }
      }
      
      // ✅ Nếu vẫn không có image, fetch từ API (async)
      if (!image && itemId) {
        const apiEndpoint = isCombo ? `${API_URL}/api/combos/${itemId}` : `${API_URL}/api/products/${itemId}`;
        fetch(apiEndpoint)
          .then(res => res.json())
          .then(data => {
            const itemDetail = data.data || data;
            if (itemDetail?.image) {
              // Cập nhật cart item với image mới
              try {
                const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
                const itemIndex = cartItems.findIndex((cartItem: any) => {
                  if (isCombo) {
                    return (cartItem.combo?._id === itemId) || (cartItem.combo?.id === itemId);
                  } else {
                    return (cartItem.product?._id === itemId) || (cartItem.product?.id === itemId);
                  }
                });
                if (itemIndex >= 0) {
                  if (isCombo) {
                    if (!cartItems[itemIndex].combo) {
                      cartItems[itemIndex].combo = {};
                    }
                    cartItems[itemIndex].combo.image = itemDetail.image;
                  } else {
                    if (!cartItems[itemIndex].product) {
                      cartItems[itemIndex].product = {};
                    }
                    cartItems[itemIndex].product.image = itemDetail.image;
                  }
                  localStorage.setItem('cartItems', JSON.stringify(cartItems));
                  window.dispatchEvent(new Event('storage'));
                }
              } catch (error) {
                // Silent fail
              }
            }
          })
          .catch(() => {
            // Silent fail
          });
      }
      
      // Format phải match với CartPage.tsx interface CartItem
      // CartPage hỗ trợ cả product và combo
      if (isCombo) {
        newCartItems.push({
          combo: {
            _id: comboId,
            id: comboId,
            name: item.name || 'Combo',
            price: item.price || 0,
            image: image, // Image từ AI hoặc cache
          },
          quantity: item.quantity || 1,
        });
      } else {
        newCartItems.push({
          product: {
            _id: productId,
            id: productId,
            name: item.name || 'Sản phẩm',
            price: item.price || 0,
            image: image, // Image từ AI hoặc cache
          },
          quantity: item.quantity || 1,
        });
      }
    });

    // ✅ REPLACE hoàn toàn cart từ AI (không merge) để đồng bộ với database
    // Điều này đảm bảo khi AI xóa món, frontend cũng xóa món đó
    localStorage.setItem('cartItems', JSON.stringify(newCartItems));
    
    // Cập nhật cart count
    const count = newCartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', String(count));
    
    // Dispatch event để các component khác (CartPage, Header, etc.) biết cart đã thay đổi
    window.dispatchEvent(new Event('storage'));
    
    // ✅ Sync cart lên server
    import('../utils/cartSync').then(({ syncCartToServer }) => {
      syncCartToServer(newCartItems);
    }).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
    
    console.log('✅ Đã REPLACE giỏ hàng từ AI (đồng bộ với database):', {
      aiItems: cartData.items.length,
      previousItems: currentCartItems.length,
      newItems: newCartItems.length,
      total: cartData.total || 0
    });
    
    // Chỉ hiển thị message khi có thay đổi
    if (newCartItems.length !== currentCartItems.length) {
      message.success('Đã cập nhật giỏ hàng!', 1.5);
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
    
    // ✅ Sync cart lên server
    import('../utils/cartSync').then(({ syncCartToServer }) => {
      syncCartToServer(cartItems);
    }).catch((error) => {
      console.error('Failed to sync cart:', error);
    });
    
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
            {messages.map((message, index) => {
              // ⚠️ QUAN TRỌNG: Đảm bảo message.text không rỗng trước khi render
              const messageText = message.text || '';
              const hasContent = messageText.trim() || message.context;
              
              // Bỏ qua message hoàn toàn rỗng
              if (!hasContent) {
                return null;
              }
              
              // Tạo key tốt hơn để tránh re-render không cần thiết
              const messageKey = message.isUser 
                ? `user-${index}-${messageText.substring(0, 20)}`
                : `ai-${index}-${messageText.substring(0, 20)}`;
              
              return (
                <div
                  key={messageKey}
                className={`message ${message.isUser ? 'user' : 'ai'}`}
              >
                <div className="message-content">
                    {messageText.trim() && (
                  <div className="message-text">
                    <ReactMarkdown components={message.isUser ? undefined : markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                    )}
                  {message.context && (
                    <div className="message-context">
                      {renderProducts(message.context)}
                    </div>
                  )}
                    {/* ✅ Hiển thị QR code nếu có order data */}
                    {/* ✅ Hiển thị QR code nếu có order data và có qrCode */}
                    {message.orderData && message.orderData.qrCode && (
                      <QRCodePaymentCard 
                        orderData={message.orderData}
                        onPaymentConfirmed={(orderData) => {
                          // Cập nhật orderData trong message khi thanh toán thành công
                          setMessages(prev => prev.map(msg => 
                            msg === message 
                              ? { ...msg, orderData: { ...msg.orderData, paymentStatus: 'PAID' } }
                              : msg
                          ));
                          
                          // ✅ Tự động thêm message mới với câu "Đây là đơn hàng của bạn, hãy xem lại nếu muốn." và hiển thị OrderInfoCard
                          // ⚠️ QUAN TRỌNG: Kiểm tra xem message đã được thêm chưa để tránh duplicate
                          setTimeout(() => {
                            setMessages(prev => {
                              // Kiểm tra xem đã có message với text "Đây là đơn hàng của bạn" và cùng orderCode chưa
                              const existingMessage = prev.find(msg => 
                                !msg.isUser && 
                                msg.text?.includes('Đây là đơn hàng của bạn') &&
                                msg.orderData?.orderCode === orderData.orderCode &&
                                !msg.orderData?.qrCode // Chỉ check message không có qrCode (đã là OrderInfoCard)
                              );
                              
                              // Nếu đã có message rồi, không thêm nữa
                              if (existingMessage) {
                                console.log('⚠️ Message đã tồn tại, không thêm duplicate');
                                return prev;
                              }
                              
                              // Thêm message mới
                              return [...prev, {
                                id: `order-${orderData.orderCode}-${Date.now()}`,
                                text: 'Đây là đơn hàng của bạn, hãy xem lại nếu muốn.',
                                isUser: false,
                                timestamp: new Date(),
                                orderData: {
                                  ...orderData,
                                  paymentStatus: 'PAID',
                                  // Xóa qrCode để hiển thị OrderInfoCard thay vì QRCodePaymentCard
                                  qrCode: undefined
                                }
                              }];
                            });
                          }, 500); // Delay 500ms để đảm bảo message trước đã được cập nhật
                        }}
                      />
                    )}
                    {/* ✅ Hiển thị thông tin đơn hàng nếu có order data (khi tra cứu đơn hàng) */}
                    {message.orderData && message.orderData.orderCode && !message.orderData.qrCode && (
                      <OrderInfoCard orderData={message.orderData} />
                  )}
                </div>
              </div>
              );
            })}
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