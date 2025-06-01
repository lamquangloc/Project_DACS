/**
 * AI Chat route for Gemini + Prisma
 * @module aiChatRoutes
 */
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
}

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

async function getContext(userId, input) {
  let context = '';
  let products = [];
  let displayType = 'list'; // 'single', 'list', 'pagination'
  let page = 1;
  
  // Danh sách stopwords để loại bỏ khi lọc sản phẩm
  const stopwords = [
    "hãy", "gợi", "ý", "cho", "tôi", "món", "cần", "giúp", "xin", "vui", "lòng", "bạn", "đề", "xuất", "nên", "ăn", "uống", "sản", "phẩm", "các", "một", "những", "và", "hoặc", "của", "là", "được", "với", "trong", "đến", "có", "không", "gì", "nào", "mấy", "bao", "nhiêu"
  ];

  // Nếu câu hỏi liên quan đến món ăn, sản phẩm hoặc gợi ý
  if (/món ăn|sản phẩm|product|gợi ý|đề xuất|nên ăn|nên uống|món nào|món gì/i.test(input)) {
    // Tách từ khóa từ câu hỏi (không chuẩn hóa, không bỏ dấu)
    let keywords = input
      .toLowerCase()
      .split(/\s|,|\.|\?|!|\//)
      .filter(kw => kw && !stopwords.includes(kw) && isNaN(Number(kw))); // bỏ stopwords và số
    // Nếu không còn từ khóa nào, fallback về từ khóa cũ (tránh lọc hết)
    if (keywords.length === 0) {
      keywords = input.toLowerCase().split(/\s|,|\.|\?|!|\//).filter(Boolean);
    }
    // Lấy tất cả sản phẩm
    const allProducts = await prisma.product.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        image: true,
        categories: {
          select: {
            category: {
              select: { name: true }
            }
          }
        }
      }
    });
    // Lọc sản phẩm theo tên hoặc danh mục chứa từ khóa (không chuẩn hóa, không bỏ dấu)
    products = allProducts.filter(p => {
      const name = p.name.toLowerCase();
      const catNames = p.categories.map(c => c.category.name.toLowerCase()).join(' ');
      return keywords.some(kw => name.includes(kw) || catNames.includes(kw));
    });
    // Nếu không tìm thấy sản phẩm phù hợp, trả về thông báo
    if (products.length === 0) {
      context = {
        type: 'products',
        displayType: 'list',
        page,
        totalProducts: 0,
        products: [],
        notFound: true
      };
      return context;
    }
    // Phân tích số lượng món ăn từ câu hỏi
    const numberMatch = input.match(/(\d+)\s*món/);
    const requestedCount = numberMatch ? parseInt(numberMatch[1]) : 0;
    if (requestedCount === 1 || requestedCount === 2) {
      displayType = 'single';
      products = products.slice(0, requestedCount);
    } else if (requestedCount >= 3 && requestedCount <= 6) {
      displayType = 'list';
      products = products.slice(0, requestedCount);
    } else if (requestedCount > 6 || requestedCount === 0) {
      displayType = 'pagination';
      products = products.slice(0, 6);
    }
    // Format dữ liệu sản phẩm
    const productsInfo = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description || 'Không có mô tả',
      image: p.image,
      categories: p.categories.map(c => c.category.name).join(', ')
    }));
    context = {
      type: 'products',
      displayType,
      page,
      totalProducts: products.length,
      products: productsInfo
    };
  }

  // Thêm thông tin về đơn hàng nếu người dùng hỏi về thống kê
  if (/thống kê|tổng tiền|bao nhiêu đơn/i.test(input) && userId && isValidObjectId(userId)) {
    const orders = await prisma.order.findMany({ 
      where: { userId }, 
      select: { total: true } 
    });
    const total = orders.reduce((sum, o) => sum + o.total, 0);
    if (typeof context === 'string') {
      context += `Bạn đã đặt ${orders.length} đơn hàng, tổng tiền là ${total}đ.`;
    } else {
      context.orderInfo = `Bạn đã đặt ${orders.length} đơn hàng, tổng tiền là ${total}đ.`;
    }
  } else if (/thống kê|tổng tiền|bao nhiêu đơn/i.test(input)) {
    if (typeof context === 'string') {
      context += 'Bạn cần đăng nhập để xem thống kê đơn hàng.';
    } else {
      context = context || {};
      context.orderInfo = 'Bạn cần đăng nhập để xem thống kê đơn hàng.';
    }
  }

  // Thêm thông tin về trạng thái đơn hàng gần nhất
  if (/trạng thái|status/i.test(input) && userId) {
    const order = await prisma.order.findFirst({ 
      where: { userId }, 
      orderBy: { createdAt: 'desc' }, 
      select: { orderCode: true, status: true } 
    });
    if (order) {
      if (typeof context === 'string') {
        context += `Đơn hàng gần nhất: ${order.orderCode}, trạng thái: ${order.status}.`;
      } else {
        context.orderStatus = `Đơn hàng gần nhất: ${order.orderCode}, trạng thái: ${order.status}.`;
      }
    }
  }

  return context;
}

// Thêm hàm chuẩn hóa input
function normalizeInput(input) {
  // Thêm dấu cách giữa số và chữ (vd: 1món -> 1 món)
  return input.replace(/(\d+)([a-zA-Zà-ỹÀ-Ỹ]+)/g, '$1 $2');
}

router.post('/chat', async (req, res) => {
  let { input, userId } = req.body;
  input = normalizeInput(input); // Chuẩn hóa input trước khi xử lý
  try {
    const context = await getContext(userId, input);
    // Nếu đã có thống kê đơn hàng, trả về luôn, không gọi AI
    if (typeof context === 'object' && context.orderInfo) {
      return res.json({ reply: context.orderInfo, context });
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Tạo prompt với context và câu hỏi của user
    let promptText;
    if (typeof context === 'object' && context.type === 'products') {
      promptText = `Dựa trên danh sách món ăn hiện có, hãy gợi ý cho khách hàng một cách tự nhiên và hữu ích. 
      Nếu khách hàng yêu cầu số lượng cụ thể, hãy gợi ý đúng số lượng đó.
      Nếu không có yêu cầu số lượng, hãy gợi ý 3-4 món phù hợp nhất.
      
      Khách hàng hỏi: ${input}`;
    } else {
      promptText = context 
        ? `${context}\n\nDựa trên thông tin trên, hãy trả lời câu hỏi của khách hàng một cách tự nhiên và hữu ích.\n\nKhách hàng hỏi: ${input}`
        : input;
    }

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: promptText }] }
      ]
    });
    
    const aiMsg = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa hiểu ý bạn.';
    
    // Trả về cả tin nhắn AI và context nếu có
    res.json({ 
      reply: aiMsg,
      context: typeof context === 'object' ? context : undefined
    });
  } catch (e) {
    console.error('AI Chat error:', e);
    res.status(500).json({ reply: 'Lỗi AI hoặc backend.' });
  }
});

module.exports = router; 
// For TypeScript default import compatibility
module.exports.default = router; 