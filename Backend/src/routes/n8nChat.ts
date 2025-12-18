/**
 * N8N AI Chat route
 * @module n8nChatRoutes
 */
import express from 'express';
import n8nService from '../services/n8n.service';
import { OrderService } from '../services/order.service';

const router = express.Router();

/**
 * POST /api/n8n/chat
 * Send message to n8n AI agent
 */
router.post('/chat', async (req, res) => {
  try {
    console.log('📨 Received chat request:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    // Chấp nhận cả 'input' và 'message' để linh hoạt hơn
    const { input, message, userId, sessionId, context } = req.body;
    const messageText = input || message;

    // Validate required fields
    if (!messageText || !userId) {
      console.log('❌ Missing required fields:', { messageText, userId });
      return res.status(400).json({ 
        reply: 'Thiếu thông tin cần thiết (input/message, userId)',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    console.log('✅ Validated request:', { messageText, userId, sessionId });

    // Validate input length
    if (messageText.length > 1000) {
      return res.status(400).json({
        reply: 'Tin nhắn quá dài. Vui lòng rút gọn xuống dưới 1000 ký tự.',
        error: 'INPUT_TOO_LONG'
      });
    }

    // ✅ XỬ LÝ ĐẶC BIỆT: Nếu user yêu cầu "xem đơn hàng" → tự động lấy chi tiết đơn từ database
    const viewOrderPattern = /(?:xem|chi\s+tiết|thông\s+tin|kiểm\s+tra).*?(?:đơn|order).*?(?:ORD-[\d-]+|[\d]{1,4})/i;
    const orderCodeMatch = messageText.match(/(?:ORD-[\d-]+|[\d]{1,4})/i);
    
    if (viewOrderPattern.test(messageText) && orderCodeMatch) {
      try {
        const orderCodeOrSuffix = orderCodeMatch[0].trim();
        console.log('🔍 Detected "view order" request, fetching order:', orderCodeOrSuffix);
        
        const order = await OrderService.getOrderByCode(orderCodeOrSuffix, userId);
        
        if (!order) {
          return res.json({
            reply: `Xin lỗi, không tìm thấy đơn hàng với mã "${orderCodeOrSuffix}". Vui lòng kiểm tra lại mã đơn hàng.`,
            context: null,
            cart: null,
            order: null,
            sessionId: sessionId,
            metadata: null
          });
        }

        // Reply ngắn gọn, để frontend hiển thị khung chi tiết đơn hàng
        const reply = `Đây là đơn hàng của bạn, hãy xem lại nếu muốn.`;

        console.log('✅ Order found, returning order details:', {
          orderCode: order.orderCode,
          total: order.total,
          itemsCount: order.items.length
        });

        return res.json({
          reply,
          context: null,
          cart: null,
          order: {
            id: order.id,
            orderCode: order.orderCode,
            userId: order.userId,
            items: order.items,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            address: order.address,
            phoneNumber: order.phoneNumber,
            provinceCode: order.provinceCode,
            provinceName: order.provinceName,
            districtCode: order.districtCode,
            districtName: order.districtName,
            wardCode: order.wardCode,
            wardName: order.wardName,
            note: order.note,
            createdAt: order.createdAt,
            qrCode: null // Không có QR code cho đơn cũ
          },
          sessionId: sessionId,
          metadata: {
            source: 'backend-direct',
            action: 'view_order',
            orderCode: order.orderCode
          }
        });
      } catch (error) {
        console.error('❌ Error fetching order by code:', error);
        // Nếu lỗi, tiếp tục gửi request tới N8N như bình thường
      }
    }

    // ✅ Extract cart từ request body (có thể ở root hoặc trong context)
    const cartData = req.body.cart || context?.cart || null;
    
    // ✅ Lấy token từ request (có thể từ header hoặc body)
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;
    
    console.log('🔄 Calling n8nService.sendMessage...', {
      hasCart: !!cartData,
      hasToken: !!token,
      cartItemsCount: cartData?.items?.length || 0,
      cartTotal: cartData?.total || 0
    });
    
    const response = await n8nService.sendMessage({
      input: messageText.trim(),
      userId,
      sessionId,
      context: {
        ...(context || {}),
        // ✅ Đảm bảo cart được truyền vào context
        ...(cartData ? { cart: cartData } : {}),
      },
      // ✅ Thêm token vào request để AI có thể dùng cho tool "carts Save"
      token: token,
    });

    console.log('📤 N8N Service response:', {
      hasReply: !!response.reply,
      replyLength: response.reply?.length || 0,
      hasContext: !!response.context,
      hasCart: !!response.cart, // Log để debug
      cartItemsCount: response.cart?.items?.length || 0,
      hasOrder: !!response.order, // ✅ Log order data
      hasQrCode: !!response.order?.qrCode?.qrCodeUrl, // ✅ Log QR code
      sessionId: response.sessionId
    });

    // ⚠️ CỰC KỲ QUAN TRỌNG: Đảm bảo reply KHÔNG rỗng
    let finalReply = response.reply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
    
    // Kiểm tra nếu reply rỗng hoặc chỉ có khoảng trắng
    if (!finalReply || finalReply.trim() === '') {
      console.error('❌ Reply is EMPTY in route handler! Using fallback message.');
      finalReply = 'Đã thêm món vào giỏ hàng thành công.';
    }
    
    // Log final reply để debug
    console.log('📝 Final reply in route handler:', {
      length: finalReply.length,
      preview: finalReply.substring(0, 150),
      isEmpty: finalReply.trim() === '',
      first50Chars: finalReply.substring(0, 50),
      last50Chars: finalReply.substring(Math.max(0, finalReply.length - 50))
    });

    // Ensure response has required fields
    const formattedResponse = {
      reply: finalReply, // Đảm bảo KHÔNG rỗng
      context: response.context || null,
      cart: response.cart || null, // Forward cart data để frontend sync
      order: response.order || null, // ✅ Forward order data để frontend hiển thị QR code
      formattedOrderSummary: response.formattedOrderSummary || null, // ✅ Auto-formatted order summary từ backend (ưu tiên hiển thị này thay vì reply từ AI)
      sessionId: response.sessionId || sessionId,
      metadata: response.metadata || null
    };

    console.log('✅ Sending response to client:', {
      replyLength: formattedResponse.reply.length,
      replyPreview: formattedResponse.reply.substring(0, 100),
      hasCart: !!formattedResponse.cart,
      cartItemsCount: formattedResponse.cart?.items?.length || 0,
      hasOrder: !!formattedResponse.order, // ✅ Log order data
      hasQrCode: !!formattedResponse.order?.qrCode?.qrCodeUrl, // ✅ Log QR code
      hasFormattedOrderSummary: !!formattedResponse.formattedOrderSummary, // ✅ Log formattedOrderSummary
      formattedOrderSummaryLength: formattedResponse.formattedOrderSummary?.length || 0,
      replyType: typeof formattedResponse.reply,
      replyIsEmpty: !formattedResponse.reply || formattedResponse.reply.trim() === ''
    });
    
    // ⚠️ QUAN TRỌNG: Log toàn bộ response để debug
    console.log('📤 Full response being sent:', JSON.stringify({
      reply: formattedResponse.reply.substring(0, 200),
      hasCart: !!formattedResponse.cart,
      cartItemsCount: formattedResponse.cart?.items?.length || 0
    }, null, 2));
    
    return res.json(formattedResponse);
  } catch (error) {
    console.error('N8N Chat error:', error);
    
    // Return appropriate error based on error type
    if (error instanceof Error) {
      if (error.message.includes('N8N webhook URL not configured')) {
        return res.status(503).json({ 
          reply: 'AI agent chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
          error: 'SERVICE_NOT_CONFIGURED'
        });
      }
      
      if (error.message.includes('N8N API error')) {
        return res.status(502).json({ 
          reply: 'AI agent tạm thời không khả dụng. Vui lòng thử lại sau.',
          error: 'SERVICE_UNAVAILABLE'
        });
      }
    }

    return res.status(500).json({ 
      reply: 'Xin lỗi, đã có lỗi xảy ra khi kết nối với AI agent.',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * GET /api/n8n/health
 * Test n8n connection
 */
router.get('/health', async (_req, res) => {
  try {
    const isConnected = await n8nService.testConnection();
    
    if (isConnected) {
      res.json({ 
        status: 'connected', 
        message: 'N8N AI agent is accessible',
        timestamp: new Date().toISOString(),
        service: 'n8n-chat'
      });
    } else {
      res.status(503).json({ 
        status: 'disconnected', 
        message: 'N8N AI agent is not accessible',
        timestamp: new Date().toISOString(),
        service: 'n8n-chat'
      });
    }
  } catch (error) {
    console.error('N8N health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to check N8N connection',
      timestamp: new Date().toISOString(),
      service: 'n8n-chat',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/n8n/test
 * Test n8n with a simple message and return raw response
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Test endpoint called');
    const testMessage = req.body.message || 'Xin chào';
    const testUserId = req.body.userId || 'test-user-' + Date.now();
    
    const response = await n8nService.sendMessage({
      input: testMessage,
      userId: testUserId,
      sessionId: `test-session-${Date.now()}`,
      context: {},
    });
    
    res.json({
      success: true,
      message: 'Test completed',
      request: {
        message: testMessage,
        userId: testUserId
      },
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('N8N test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/n8n/config
 * Update n8n webhook configuration
 */
router.post('/config', async (req, res) => {
  try {
    const { webhookUrl, apiKey } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL is required',
        error: 'MISSING_WEBHOOK_URL'
      });
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL format',
        error: 'INVALID_URL_FORMAT'
      });
    }

    // Update environment variables (in production, you'd want to persist this)
    process.env.N8N_WEBHOOK_URL = webhookUrl;
    if (apiKey) {
      process.env.N8N_API_KEY = apiKey;
    }

    return res.json({
      success: true,
      message: 'N8N configuration updated successfully',
      webhookUrl: webhookUrl,
      hasApiKey: !!apiKey,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('N8N config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update N8N configuration',
      error: 'CONFIG_UPDATE_FAILED'
    });
  }
});

/**
 * GET /api/n8n/config
 * Get current n8n configuration
 */
router.get('/config', async (_req, res) => {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const hasApiKey = !!process.env.N8N_API_KEY;

    res.json({
      webhookUrl: webhookUrl || null,
      hasApiKey,
      isConfigured: !!webhookUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('N8N config get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get N8N configuration',
      error: 'CONFIG_GET_FAILED'
    });
  }
});

export default router;
