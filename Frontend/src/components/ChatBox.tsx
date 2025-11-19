import React, { useState, useRef, useEffect } from 'react';
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
            
            cache.set(normalizedName, comboData);
            cache.set(originalName, comboData);
            
            const nameWithoutTones = removeVietnameseTones(combo.name).toLowerCase();
            if (nameWithoutTones !== normalizedName) {
              cache.set(nameWithoutTones, comboData);
            }
            
            // Store với từ "combo" + tên (ví dụ: "combo cặp đôi")
            const comboKey = `combo ${normalizedName}`;
            cache.set(comboKey, comboData);
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
  const extractProductInfo = (text: string): { name: string; price?: string } | null => {
    if (!text || typeof text !== 'string') return null;
    
    // Remove markdown formatting và clean
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    
    // Pattern 1: "Tên món - giá" với ₫ hoặc đ ở cuối
    // Ví dụ: "Canh Cua Cà Pháo - 110.000₫" hoặc "Canh Cua Cà Pháo - 110.000đ"
    const match1 = cleanText.match(/^(.+?)\s*-\s*([\d.,\s]+[₫đ])$/i);
    if (match1) {
      const name = match1[1].trim();
      const price = match1[2].trim();
      // Kiểm tra xem có phải số hợp lệ không
      if (name.length > 2 && /[\d.,\s]+/.test(price)) {
        return { name, price };
      }
    }
    
    // Pattern 2: "Tên món - số" (không có ₫, thêm ₫ vào)
    // Ví dụ: "Canh Cua Cà Pháo - 110.000" hoặc "Salad Cải Mầm Trứng - 89.000"
    const match2 = cleanText.match(/^(.+?)\s*-\s*([\d.,\s]+)$/);
    if (match2) {
      const name = match2[1].trim();
      const priceStr = match2[2].trim();
      // Kiểm tra xem có phải số không (ít nhất 3 chữ số)
      const priceNum = priceStr.replace(/[^\d]/g, '');
      if (name.length > 2 && priceNum.length >= 3) {
        return {
          name,
          price: `${priceStr}₫`
        };
      }
    }
    
    // Pattern 3: "**Tên món** - giá" (markdown bold)
    const match3 = cleanText.match(/^\*\*(.+?)\*\*\s*-\s*([\d.,\s]+[₫đ]?)$/i);
    if (match3) {
      const name = match3[1].trim();
      const priceStr = match3[2].trim();
      if (name.length > 2) {
        return {
          name,
          price: priceStr.includes('₫') || priceStr.includes('đ') ? priceStr : `${priceStr}₫`
        };
      }
    }
    
    return null;
  };

  // ✅ Helper: Extract combo info từ text dài (ví dụ: "Nhà hàng có Combo cặp đôi với mô tả..., giá 650.000₫")
  const extractComboInfo = (text: string): { name: string; price?: string } | null => {
    if (!text || typeof text !== 'string') return null;
    
    const cleanText = text.replace(/\*\*/g, '').replace(/`/g, '').trim();
    const lowerText = cleanText.toLowerCase();
    
    // Chỉ xử lý nếu có từ "combo"
    if (!lowerText.includes('combo')) return null;
    
    // Pattern 1: "Combo [tên]" - extract tên combo (cải thiện regex)
    // Ví dụ: "Combo cặp đôi" hoặc "Nhà hàng có Combo cặp đôi với mô tả..."
    // Match: "combo" + tên (có thể có dấu cách, không có dấu phẩy, dấu chấm, hoặc từ "với", "mô tả", "giá")
    const comboNameMatch = cleanText.match(/(?:^|\s)(?:combo\s+)([^,\-\.\n]+?)(?:\s+với|\s+mô\s+tả|\s+là\s+combo|\s+giá|,|\.|$)/i);
    if (comboNameMatch) {
      let comboName = comboNameMatch[1].trim();
      // Loại bỏ các từ thừa ở cuối
      comboName = comboName.replace(/\s+(với|mô\s+tả|là|giá).*$/i, '').trim();
      
      // Extract giá từ text (tìm "giá" + số)
      let price: string | undefined;
      const priceMatch = cleanText.match(/giá\s+([\d.,\s]+[₫đ]?)/i);
      if (priceMatch) {
        price = priceMatch[1].trim();
        if (!price.includes('₫') && !price.includes('đ')) {
          price = `${price}₫`;
        }
      }
      
      if (comboName.length > 2) {
        return { name: comboName, price };
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
  const extractTextFromChildren = (children: any): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) {
      return children.map(child => extractTextFromChildren(child)).join('');
    }
    if (children && typeof children === 'object' && 'props' in children) {
      return extractTextFromChildren(children.props?.children);
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
      
      // ✅ Loại bỏ phần câu hỏi về combo trong afterText (như "Bạn có muốn thêm nào vào giỏ hàng không?")
      const lowerAfterText = afterText.toLowerCase();
      if (lowerAfterText.includes('bạn có muốn') || 
          lowerAfterText.includes('bạn muốn') ||
          (lowerAfterText.includes('thêm') && lowerAfterText.includes('giỏ hàng'))) {
        // Bỏ toàn bộ phần câu hỏi
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

  // ✅ Helper: Render combo card từ combo info
  const renderComboCardFromInfo = (comboInfo: { name: string; price?: string }): React.ReactNode | null => {
    let comboName = comboInfo.name;
    let comboDisplayPrice = comboInfo.price || '';
    let combo: { id: string; name: string; image?: string; price?: number; slug?: string } | null = null;
    
    // Tìm combo trong cache
    if (comboName) {
      combo = findComboInCache(comboName);
      if (!combo && !comboName.toLowerCase().startsWith('combo')) {
        combo = findComboInCache(`combo ${comboName}`);
      }
    }
    
    if (!combo && (!comboName || comboName.length < 2)) {
      return null;
    }
    
    const finalComboName = combo?.name || comboName;
    const comboSlug = combo?.slug || `${removeVietnameseTones(comboName)}-${combo?.id || 'unknown'}`;
    const comboImageUrl = combo?.image ? getImageUrl(combo.image) : null;
    
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
  };

  // ✅ Custom markdown components để render product cards và action cards
  const markdownComponents: Components = {
    p: ({ children, ...props }) => {
      // Extract text từ children
      const childText = extractTextFromChildren(children);
      
      // ✅ Ẩn các paragraph chỉ chứa câu hỏi về combo (như "Bạn có muốn thêm nào vào giỏ hàng không?")
      const cleanChildText = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildText = cleanChildText.toLowerCase();
      // Detect cả trường hợp text bị tách (như "nào vào giỏ hàng không?" hoặc "Bạn có muốn thêm")
      const isComboQuestionOnly = (
        (lowerChildText.includes('bạn có muốn') || lowerChildText.includes('bạn muốn')) && 
        (lowerChildText.includes('thêm') || lowerChildText.includes('combo') || lowerChildText.includes('vào giỏ') || lowerChildText.includes('giỏ hàng'))
      ) || (
        (lowerChildText.includes('nào vào giỏ hàng') || lowerChildText.includes('vào giỏ hàng không')) &&
        !lowerChildText.match(/combo\s+\w+/) // Không ẩn nếu có tên combo cụ thể
      );
      if (isComboQuestionOnly) {
        return null; // Không render paragraph này
      }
      
      // ✅ Loại bỏ "Tổng cộng" khỏi combo card detection
      const cleanChildTextForTotal = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildTextForTotal = cleanChildTextForTotal.toLowerCase();
      const isTotalLine = lowerChildTextForTotal.includes('tổng cộng') || 
                         lowerChildTextForTotal.includes('tổng:') ||
                         (lowerChildTextForTotal.startsWith('tổng') && lowerChildTextForTotal.includes('₫'));
      if (isTotalLine) {
        // Render như text thông thường, không phải combo card
        return <p {...props}>{children}</p>;
      }
      
      // ✅ Kiểm tra xem có combo không trong paragraph
      const comboExtract = extractComboInfoWithPosition(childText);
      if (comboExtract && comboExtract.comboInfo) {
        const comboCard = renderComboCardFromInfo(comboExtract.comboInfo);
        if (comboCard) {
          // ✅ Chỉ hiển thị beforeText và comboCard, bỏ phần afterText (đã được loại bỏ câu hỏi)
          return (
            <p {...props} style={{ margin: '8px 0' }}>
              {comboExtract.beforeText && <span>{comboExtract.beforeText} </span>}
              {comboCard}
            </p>
          );
        }
      }
      
      // Render bình thường
      return <p {...props}>{children}</p>;
    },
    li: ({ children, ...props }) => {
      // Extract text từ children (có thể là React elements phức tạp)
      const childText = extractTextFromChildren(children);
      
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
      
      // ✅ Ẩn các list item chỉ chứa câu hỏi về combo (như "Bạn có muốn thêm nào vào giỏ hàng không?")
      // Phải kiểm tra TRƯỚC action card để tránh render nhầm
      const cleanChildText = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildText = cleanChildText.toLowerCase();
      // Detect cả trường hợp text bị tách (như "nào vào giỏ hàng không?" hoặc "Bạn có muốn thêm")
      const isComboQuestionOnly = (
        (lowerChildText.includes('bạn có muốn') || lowerChildText.includes('bạn muốn')) && 
        (lowerChildText.includes('thêm') || lowerChildText.includes('combo') || lowerChildText.includes('vào giỏ') || lowerChildText.includes('giỏ hàng'))
      ) || (
        (lowerChildText.includes('nào vào giỏ hàng') || lowerChildText.includes('vào giỏ hàng không')) &&
        !lowerChildText.match(/combo\s+\w+/) // Không ẩn nếu có tên combo cụ thể
      );
      if (isComboQuestionOnly) {
        return null; // Không render list item này
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
          // Nếu có text trước, chỉ render text trước + comboCard, bỏ phần afterText (đã được loại bỏ câu hỏi)
          return (
            <li className="product-list-item" {...props}>
              {comboExtract.beforeText && <span>{comboExtract.beforeText} </span>}
              {comboCard}
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
      const cleanChildTextForTotal = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
      const lowerChildTextForTotal = cleanChildTextForTotal.toLowerCase();
      const isTotalLine = lowerChildTextForTotal.includes('tổng cộng') || 
                         lowerChildTextForTotal.includes('tổng:') ||
                         (lowerChildTextForTotal.startsWith('tổng') && lowerChildTextForTotal.includes('₫'));
      if (isTotalLine) {
        // Render như text thông thường, không phải product/combo card
        return <li {...props}>{children}</li>;
      }
      
      // ✅ KHÔNG ẩn các dòng text - hiển thị đầy đủ tất cả các món mà AI trả về
      // Mỗi dòng có thể là một item riêng biệt trong giỏ hàng (có thể có nhiều item cùng tên)
      // Logic render combo/product card sẽ tự động xử lý việc hiển thị
      
      // ✅ Kiểm tra xem có phải product không (có pattern "Tên - giá" hoặc chỉ là tên món)
      const productInfo = extractProductInfo(childText);
      
      // ✅ Nếu không match pattern "Tên - giá", thử kiểm tra xem có phải là tên món đơn thuần không
      // (ví dụ: "Rau Tập Tàng Luộc Chấm Tương" không có giá)
      let shouldRenderAsProduct = false;
      let productName = '';
      let displayPrice = '';
      
      if (productInfo) {
        // Có pattern "Tên - giá"
        productName = productInfo.name;
        displayPrice = productInfo.price || '';
        shouldRenderAsProduct = true;
      } else {
        // Thử kiểm tra xem có phải là tên món không (không có giá)
        const cleanText = childText.replace(/\*\*/g, '').replace(/`/g, '').trim();
        
        // ✅ Kiểm tra nếu text có vẻ như tên món (không phải số, không phải câu hỏi, có độ dài hợp lý)
        // Loại bỏ các text không phải tên món
        const lowerText = cleanText.toLowerCase();
        const isQuestion = lowerText.includes('bạn muốn') || 
                          lowerText.includes('có thể') ||
                          (lowerText.includes('không') && lowerText.includes('?')) ||
                          lowerText.includes('?') ||
                          lowerText.match(/^[a-z]+\?/) || // Câu hỏi ngắn
                          lowerText.startsWith('bạn') && lowerText.length < 20; // Câu hỏi bắt đầu bằng "bạn"
        
        const isNumberOnly = /^\d+([.,]\d+)?[₫đ]?$/.test(cleanText.trim());
        const isTooShort = cleanText.length <= 2;
        
        // ✅ Render TẤT CẢ các text có vẻ như tên món (không phải câu hỏi)
        if (!isQuestion && !isNumberOnly && !isTooShort && cleanText.length > 2) {
          // Tìm trong cache
          const maybeProduct = findProductInCache(cleanText);
          if (maybeProduct) {
            productName = maybeProduct.name;
            displayPrice = maybeProduct.price ? `${maybeProduct.price.toLocaleString('vi-VN')}₫` : '';
            shouldRenderAsProduct = true;
          } else {
            // ✅ Nếu không tìm thấy trong cache, VẪN render thành product card
            // (để đảm bảo TẤT CẢ món đều hiển thị)
            // Chỉ render nếu text có vẻ như tên món (có ít nhất 2 từ hoặc 1 từ dài)
            const words = cleanText.split(/\s+/).filter(w => w.length > 1);
            const wordCount = words.length;
            const hasLongWord = words.some(w => w.length > 5);
            
            // Render nếu: có ít nhất 2 từ HOẶC có 1 từ dài (ví dụ: "CanhCuaCàPháo")
            if (wordCount >= 2 || (wordCount === 1 && hasLongWord) || cleanText.length > 8) {
              productName = cleanText;
              shouldRenderAsProduct = true;
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
    const isOrderRequest = /đặt|order|đơn hàng|thanh toán|checkout/i.test(messageToSend);
    const isCartQuery = /giỏ hàng|cart|xem giỏ|món trong giỏ|món nào|món ăn nào|có gì trong giỏ|bạn có|tôi có/i.test(messageToSend);
    
    // ✅ Nếu có cart và user hỏi về bất kỳ điều gì liên quan đến món ăn/giỏ hàng, LUÔN gửi cart
    // Để AI có thể trả lời chính xác về cart hiện tại
    const shouldSendCart = cartData && (isOrderRequest || isCartQuery || cartData.items.length > 0);

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
            ...(shouldSendCart ? { 
              cart: cartData,
              hasCart: true,
              cartItemsCount: cartData.items.length,
              cartTotal: cartData.total
            } : {}),
          },
          // ✅ Gửi cart ở root level để AI dễ truy cập (ưu tiên cao)
          ...(shouldSendCart ? { 
            cart: cartData,
            metadata: {
              hasCart: true,
              cartItemsCount: cartData.items.length,
              cartTotal: cartData.total,
              source: 'localStorage' // Đánh dấu cart từ localStorage (cart thực tế)
            }
          } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.reply || `Lỗi ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const reply = data.reply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
      const normalizedContext = normalizeChatContext(data.context || null);

      // ✅ ĐỒNG BỘ CART TỪ AI RESPONSE VỀ FRONTEND
      // Nếu AI trả về cart data (khi thêm/xem/cập nhật/xóa giỏ hàng), sync vào localStorage
      if (data.cart) {
        syncCartFromAI(data.cart);
      } else if (data.context?.cart) {
        syncCartFromAI(data.context.cart);
      } else {
        // ✅ Nếu không có cart data nhưng reply có từ khóa đặt hàng thành công
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
        }
      }

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
            {messages.map((message, index) => (
              <div
                key={`message-${index}`}
                className={`message ${message.isUser ? 'user' : 'ai'}`}
              >
                <div className="message-content">
                  <div className="message-text">
                    <ReactMarkdown components={message.isUser ? undefined : markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
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