/**
 * Service for integrating with n8n AI Agent
 * @module n8nService
 */

interface N8nRequest {
  input: string;
  userId: string;
  sessionId?: string;
  context?: any;
  token?: string; // ✅ Token để authenticate với backend API
}

interface N8nResponse {
  reply: string;
  context?: any;
  sessionId?: string;
  metadata?: any;
  cart?: any; // Cart data for frontend synchronization
  order?: any; // Order data with QR code for payment
}

class N8nService {
  private webhookUrl: string;
  private apiKey?: string;

  constructor() {
    // Sử dụng webhook URL mặc định nếu chưa được cấu hình
    // LƯU Ý: Phải dùng Production URL, không dùng Test URL
    // Test URL: https://tunz123456.app.n8n.cloud/webhook-test/restaurant-chat (chỉ test trong editor)
    // Production URL: https://tunz123456.app.n8n.cloud/webhook/restaurant-chat (dùng cho production)
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://tunz123456.app.n8n.cloud/webhook/restaurant-chat';
    this.apiKey = process.env.N8N_API_KEY;
    
    if (!process.env.N8N_WEBHOOK_URL) {
      console.log(`✅ Using default N8N webhook URL: ${this.webhookUrl}`);
      console.log(`⚠️  Make sure this is the PRODUCTION URL (not test URL)`);
    } else {
      console.log(`✅ Using configured N8N webhook URL: ${this.webhookUrl}`);
    }
  }

  /**
   * Send message to n8n AI agent
   */
  async sendMessage(request: N8nRequest): Promise<N8nResponse> {
    if (!this.webhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Format dữ liệu phù hợp với N8N workflow
      // N8N Chat Trigger Node expects specific format
      const generatedSessionId = request.sessionId || `session_${request.userId}_${Date.now()}`;
      
      // ✅ Lấy token từ request (để AI có thể dùng cho tool "carts Save")
      const token = request.token || null;
      
      // Extract cart data từ context (nếu có)
      let cartData = request.context?.cart || null;
      
      // ✅ QUAN TRỌNG: Validate và normalize cart data để tránh lỗi "Cannot read properties of undefined (reading 'reduce')" trong n8n
      if (cartData) {
        // Đảm bảo items luôn là array, không phải undefined
        if (!Array.isArray(cartData.items)) {
          console.warn('⚠️ cartData.items is not an array, normalizing...', {
            itemsType: typeof cartData.items,
            itemsValue: cartData.items
          });
          cartData.items = [];
        }
        
        // Đảm bảo total là number
        if (typeof cartData.total !== 'number') {
          cartData.total = 0;
        }
        
        // Validate từng item trong cart
        if (cartData.items && cartData.items.length > 0) {
          cartData.items = cartData.items.filter((item: any) => {
            // Chỉ giữ lại items hợp lệ (có productId hoặc comboId)
            return item && (item.productId || item.comboId) && item.quantity && item.price;
          });
          
          // Recalculate total nếu items đã thay đổi
          if (cartData.items.length === 0) {
            cartData.total = 0;
          }
        }
      }
      
      // Nếu không có cart trong request hoặc cart rỗng, thử lấy từ database
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        try {
          const cartService = (await import('./cart.service')).default;
          const dbCart = await cartService.getCart(request.userId);
          if (dbCart && dbCart.items && Array.isArray(dbCart.items) && dbCart.items.length > 0) {
            cartData = {
              items: dbCart.items,
              total: dbCart.total || 0
            };
            console.log('📦 Cart loaded from database:', {
              itemsCount: dbCart.items.length,
              total: dbCart.total
            });
          } else {
            // Nếu không có cart, set cartData = null để không gửi cart undefined
            cartData = null;
          }
        } catch (error) {
          console.error('Failed to load cart from database:', error);
          // Tiếp tục với cartData = null
          cartData = null;
        }
      }
      
      // ✅ QUAN TRỌNG: Normalize context để tránh undefined values
      const normalizedContext = { ...(request.context || {}) };
      
      // Loại bỏ các field undefined trong context
      Object.keys(normalizedContext).forEach(key => {
        if (normalizedContext[key] === undefined) {
          delete normalizedContext[key];
        }
      });
      
      // ✅ QUAN TRỌNG: Tính toán hasCart và cartItemsCount dựa trên cartData thực tế (sau khi normalize và load từ database)
      const hasCartActual = !!(cartData && Array.isArray(cartData.items) && cartData.items.length > 0);
      const cartItemsCountActual = (cartData && Array.isArray(cartData.items)) ? cartData.items.length : 0;
      const cartTotalActual = (cartData && typeof cartData.total === 'number') ? cartData.total : 0;
      
      // ✅ Đảm bảo cart trong context có format đúng và hasCart/cartItemsCount đúng với cartData thực tế
      if (cartData && hasCartActual) {
        normalizedContext.cart = {
          items: Array.isArray(cartData.items) ? cartData.items : [],
          total: typeof cartData.total === 'number' ? cartData.total : 0
        };
        normalizedContext.hasCart = true;
        normalizedContext.cartItemsCount = cartItemsCountActual;
        normalizedContext.cartTotal = cartTotalActual;
      } else {
        // Nếu không có cart, đảm bảo không gửi cart undefined và hasCart = false
        normalizedContext.hasCart = false;
        normalizedContext.cartItemsCount = 0;
        normalizedContext.cartTotal = 0;
        // Xóa cart khỏi context nếu có (từ request cũ)
        delete normalizedContext.cart;
      }
      
      const payload = {
        // Chat Trigger Node sẽ nhận các field này từ Webhook body
        message: request.input,
        input: request.input, // Thêm cả input để đảm bảo
        userId: request.userId,
        sessionId: generatedSessionId,
        // Đặt sessionId ở root level để Chat Trigger Node có thể đọc được
        // Chat Trigger Node thường tự động extract sessionId từ body
        context: normalizedContext,
        // ✅ Gửi cart ở root level để AI dễ truy cập (QUAN TRỌNG!)
        // CHỈ gửi nếu cartData hợp lệ và có items
        ...(hasCartActual ? { 
          cart: {
            items: cartData.items,
            total: cartData.total || 0
          }
        } : {}),
        timestamp: new Date().toISOString(),
        // Thêm metadata cho AI Agent
        metadata: {
          source: 'webhook',
          userType: 'user', // hoặc 'admin' tùy theo logic
          conversationId: generatedSessionId,
          sessionId: generatedSessionId, // Thêm vào metadata để chắc chắn
          // ✅ QUAN TRỌNG: Tính toán hasCart và cartItemsCount dựa trên cartData thực tế (sau khi normalize và load từ database)
          // KHÔNG dùng giá trị từ request.context vì có thể không đúng
          hasCart: hasCartActual,
          cartItemsCount: cartItemsCountActual,
          cartTotal: cartTotalActual,
          source: 'localStorage' // Đánh dấu cart từ localStorage (cart thực tế)
        },
        // Đảm bảo sessionId được expose ở nhiều level
        'chat-session-id': generatedSessionId,
        // ✅ Gửi token để tool có thể dùng
        token: token || null, // Token để authenticate với backend API
      };
      
      // ✅ QUAN TRỌNG: Loại bỏ các field undefined trong payload để tránh lỗi trong n8n
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      // ✅ Validate payload trước khi gửi
      if (!payload.input || !payload.userId) {
        throw new Error('Invalid payload: missing required fields (input, userId)');
      }

      console.log('🌐 Sending request to N8N webhook:', this.webhookUrl);
      console.log('📤 Request payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('❌ N8N API error response:', errorText);
        console.error('❌ N8N API error status:', response.status, response.statusText);
        console.error('❌ N8N API error headers:', Object.fromEntries(response.headers.entries()));
        
        // ✅ Xử lý đặc biệt cho lỗi 429 (Too Many Requests)
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : 15;
          
          console.error(`⚠️ Rate limit error (429) detected. Retry after: ${retryAfterSeconds} seconds`);
          
          return {
            reply: `Xin lỗi, hệ thống AI đang quá tải do quá nhiều yêu cầu. Vui lòng đợi ${retryAfterSeconds} giây rồi thử lại.\n\n` +
                   '💡 Gợi ý: Bạn có thể thử lại sau vài phút.',
            context: null,
            sessionId: payload.sessionId,
            metadata: { 
              warning: 'rate_limit_error',
              error: '429_too_many_requests',
              suggestion: `Wait ${retryAfterSeconds} seconds before retrying`,
              retryAfter: retryAfterSeconds
            }
          };
        }
        
        // ✅ Xử lý đặc biệt cho lỗi 500 (Internal Server Error) - có thể do n8n workflow crash
        if (response.status === 500) {
          console.error('⚠️ N8N workflow may have crashed (500 error)');
          const isReduceError = errorText.includes('reduce') || errorText.includes('Cannot read properties');
          
          if (isReduceError) {
            return {
              reply: 'Xin lỗi, hệ thống AI gặp lỗi khi xử lý dữ liệu. Vui lòng thử lại sau vài giây.\n\n' +
                     '💡 Gợi ý: Nếu lỗi vẫn tiếp tục, vui lòng liên hệ quản trị viên.',
              context: null,
              sessionId: payload.sessionId,
              metadata: { 
                warning: 'workflow_error',
                error: 'n8n_workflow_crash',
                suggestion: 'Retry after a few seconds',
                errorDetails: 'Possible "reduce" error in AI Agent node'
              }
            };
          }
        }
        
        throw new Error(`N8N API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Xử lý response text và JSON
      const responseText = await response.text();
      const contentLength = response.headers.get('content-length');
      
      console.log('📥 N8N Response Status:', response.status);
      console.log('📥 N8N Response Content-Length:', contentLength);
      console.log('📥 N8N Response Text Length:', responseText.length);
      console.log('📥 N8N Response Text:', responseText || '(empty)');
      
      // Kiểm tra nếu response hoàn toàn rỗng
      if (!responseText || responseText.trim() === '' || contentLength === '0') {
        console.error('❌ EMPTY RESPONSE FROM N8N WEBHOOK!');
        console.error('🔍 Possible causes:');
        console.error('   1. Workflow is not ACTIVE (check toggle in n8n)');
        console.error('   2. Missing "Respond to Webhook" node in workflow');
        console.error('   3. "Respond to Webhook" node not connected to AI Agent output');
        console.error('   4. AI Agent not returning any response (có thể do lỗi 429 Too Many Requests từ Gemini)');
        console.error('   5. N8N workflow bị lỗi và không trả về response');
        
        // ✅ Kiểm tra xem có phải do lỗi 429 không (thông qua response headers hoặc status)
        // Nếu N8N workflow gặp lỗi 429, nó có thể không trả về response
        const retryAfter = response.headers.get('retry-after');
        const isRateLimitError = response.status === 429 || retryAfter !== null;
        
        // ✅ QUAN TRỌNG: Nếu response empty và status 200, có thể là do lỗi 429 từ Gemini
        // (N8N workflow có thể đã nhận request nhưng Gemini API trả về 429, khiến workflow không trả về response)
        // Dựa vào thời gian response nhanh (< 2s) và empty response → có thể là lỗi 429
        const responseTime = Date.now() - new Date(payload.timestamp).getTime();
        const isLikelyRateLimit = response.status === 200 && responseTime < 2000; // Response nhanh + empty = có thể là lỗi 429
        
        if (isRateLimitError || isLikelyRateLimit) {
          console.error('⚠️ Detected rate limit error (429) - N8N workflow may have hit Gemini API rate limit');
          console.error(`   Response time: ${responseTime}ms, Status: ${response.status}, Empty: true`);
          return {
            reply: 'Xin lỗi, hệ thống AI đang quá tải do quá nhiều yêu cầu từ Google Gemini API.\n\n' +
                   '⚠️ Lỗi: 429 Too Many Requests\n' +
                   '💡 Vui lòng đợi 20-30 giây rồi thử lại.\n\n' +
                   'Nguyên nhân: Google Gemini API có giới hạn số lượng request. Hệ thống đã vượt quá giới hạn này.',
            context: null,
            sessionId: payload.sessionId,
            metadata: { 
              warning: 'rate_limit_error',
              error: '429_too_many_requests',
              suggestion: 'Wait 20-30 seconds before retrying',
              retryAfter: retryAfter ? parseInt(retryAfter) : 30,
              responseTime: responseTime,
              likelyCause: 'Gemini API rate limit exceeded'
            }
          };
        }
        
        return {
          reply: 'Xin lỗi, hệ thống AI chưa trả lời. Vui lòng kiểm tra:\n' +
                 '1. Workflow n8n đã được kích hoạt chưa?\n' +
                 '2. Node "Respond to Webhook" đã được cấu hình đúng chưa?\n' +
                 '3. Có thể hệ thống đang quá tải (lỗi 429 từ Gemini API), vui lòng thử lại sau 20-30 giây.',
          context: null,
          sessionId: payload.sessionId,
          metadata: { 
            warning: 'empty_response',
            error: 'n8n_workflow_not_responding',
            suggestion: 'Check n8n workflow configuration and activation status. If persists, may be Gemini API rate limit (429)',
            responseTime: responseTime
          }
        };
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ N8N Parsed Data (type):', typeof data);
        console.log('✅ N8N Parsed Data (keys):', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
        console.log('✅ N8N Parsed Data (full):', JSON.stringify(data, null, 2));
        
        // ✅ Kiểm tra xem response có chứa error về 429 không
        if (data && typeof data === 'object') {
          const errorMessage = JSON.stringify(data).toLowerCase();
          const isRateLimitError = errorMessage.includes('429') || 
                                   errorMessage.includes('too many requests') ||
                                   errorMessage.includes('rate limit') ||
                                   errorMessage.includes('quota exceeded') ||
                                   errorMessage.includes('quota limit');
          
          if (isRateLimitError) {
            console.error('⚠️ Rate limit error detected in N8N response body');
            return {
              reply: 'Xin lỗi, hệ thống AI đang quá tải do quá nhiều yêu cầu. Vui lòng đợi 15-30 giây rồi thử lại.\n\n' +
                     '💡 Gợi ý: Bạn có thể thử lại sau vài phút.',
              context: null,
              sessionId: payload.sessionId,
              metadata: { 
                warning: 'rate_limit_error',
                error: '429_too_many_requests',
                suggestion: 'Wait 15-30 seconds before retrying',
                retryAfter: 30,
                rawResponse: data
              }
            };
          }
        }
        
        // ⚠️ QUAN TRỌNG: Khi dùng "All Incoming Items", n8n có thể trả về array
        // Nếu là array, lấy phần tử đầu tiên (thường là output từ AI Agent)
        if (Array.isArray(data) && data.length > 0) {
          console.log('⚠️ N8N Response is array, taking first item');
          data = data[0];
          console.log('✅ Extracted first item:', JSON.stringify(data, null, 2));
        }
      } catch (e) {
        // Nếu không phải JSON, coi như string response
        console.log('⚠️ N8N Response is not JSON, treating as string');
        console.log('⚠️ Raw response text:', responseText.substring(0, 500));
        data = { message: responseText };
      }
      
      // Kiểm tra nếu response có dữ liệu nhưng tất cả đều rỗng
      if (!data || 
          (typeof data === 'object' && 
           Object.keys(data).length === 0) ||
          (data.message === '' && !data.output && !data.reply && !data.text && !data.content)) {
        console.error('⚠️ Response object is empty or all fields are empty');
        console.error('Raw data:', JSON.stringify(data, null, 2));
        
        return {
          reply: 'Xin lỗi, hệ thống AI nhận được request nhưng không trả về nội dung. ' +
                 'Vui lòng kiểm tra cấu hình workflow n8n và node "Respond to Webhook".',
          context: null,
          sessionId: payload.sessionId,
          metadata: { 
            warning: 'empty_response_data',
            rawData: data
          }
        };
      }
      
      // Xử lý response từ N8N AI Agent
      // N8N AI Agent có thể trả về nhiều format khác nhau
      let reply = '';
      
      // Helper function để extract text từ nested objects
      const extractText = (obj: any): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number') return String(obj);
        
        // ⚠️ QUAN TRỌNG: Ưu tiên "output" trước (N8N thường trả về format này)
        if (obj.output) return extractText(obj.output);
        
        // Thử các key phổ biến khác
        if (obj.text) return extractText(obj.text);
        if (obj.message) return extractText(obj.message);
        if (obj.content) return extractText(obj.content);
        if (obj.response) return extractText(obj.response);
        if (obj.reply) return extractText(obj.reply);
        if (obj.answer) return extractText(obj.answer);
        
        // N8N AI Agent thường trả về messages array
        if (Array.isArray(obj.messages) && obj.messages.length > 0) {
          const lastMessage = obj.messages[obj.messages.length - 1];
          if (typeof lastMessage === 'string') return lastMessage;
          if (lastMessage?.content) return extractText(lastMessage.content);
          if (lastMessage?.text) return extractText(lastMessage.text);
          if (lastMessage?.message) return extractText(lastMessage.message);
        }
        
        // Nếu là array, lấy phần tử cuối
        if (Array.isArray(obj) && obj.length > 0) {
          return extractText(obj[obj.length - 1]);
        }
        
        // Thử lấy data field
        if (obj.data) return extractText(obj.data);
        
        return null;
      };
      
      // ⚠️ QUAN TRỌNG: Ưu tiên extract từ field "output" trước (N8N thường trả về format này)
      // N8N thường trả về: [{"output": "text"}]
      if (data.output) {
        reply = typeof data.output === 'string' ? data.output : extractText(data.output) || '';
        console.log('✅ Extracted reply from data.output:', {
          type: typeof data.output,
          length: reply.length,
          preview: reply.substring(0, 100)
        });
      }
      
      // Nếu chưa có, thử extract từ các format phổ biến khác
      if (!reply || reply.trim() === '') {
      reply = extractText(data) || '';
        console.log('✅ Extracted reply from extractText(data):', {
          length: reply.length,
          preview: reply.substring(0, 100) || '(empty)'
        });
      }
      
      // Nếu vẫn không có, thử các field trực tiếp (fallback)
      if (!reply || reply.trim() === '') {
        if (typeof data === 'string') {
          reply = data;
      } else if (data.response) {
          reply = typeof data.response === 'string' ? data.response : extractText(data.response) || '';
      } else if (data.message) {
          reply = typeof data.message === 'string' ? data.message : extractText(data.message) || '';
      } else if (data.reply) {
          // ⚠️ QUAN TRỌNG: Nếu reply là JSON string, parse lại
          if (typeof data.reply === 'string' && data.reply.trim().startsWith('{')) {
            try {
              const parsedReply = JSON.parse(data.reply);
              // Nếu parsed là object có field reply, lấy field đó
              if (parsedReply && typeof parsedReply === 'object' && parsedReply.reply) {
                reply = typeof parsedReply.reply === 'string' ? parsedReply.reply : extractText(parsedReply.reply) || '';
              } else {
                // Nếu không, dùng reply gốc
                reply = data.reply;
              }
            } catch (e) {
              // Không parse được, dùng reply gốc
              reply = data.reply;
            }
          } else {
          reply = typeof data.reply === 'string' ? data.reply : extractText(data.reply) || '';
          }
      } else if (data.text) {
          reply = typeof data.text === 'string' ? data.text : extractText(data.text) || '';
      } else if (data.content) {
          reply = typeof data.content === 'string' ? data.content : extractText(data.content) || '';
      } else if (data.answer) {
          reply = typeof data.answer === 'string' ? data.answer : extractText(data.answer) || '';
      } else if (data.data && typeof data.data === 'string') {
        reply = data.data;
        }
      }
      
      // Nếu vẫn không tìm thấy, log để debug
      if (!reply || reply.trim() === '') {
        console.log('⚠️ Unknown or empty response format from N8N:');
        console.log('Raw data:', JSON.stringify(data, null, 2));
        console.log('Data type:', typeof data);
        console.log('Data keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
        reply = 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
      }
      
      console.log('✅ Final extracted reply:', reply);
      console.log('✅ Reply length:', reply.length);
      
      // ⚠️ QUAN TRỌNG: Clean reply để loại bỏ debug info từ N8N (ví dụ: "[Used tools: Tool: carts_Add, Input: {}, Result: [...]]")
      // Pattern: [Used tools: ...] ở đầu reply, sau đó là text thực tế
      if (reply && typeof reply === 'string') {
        // Tìm pattern: [Used tools: ...] và loại bỏ nó (kết thúc bằng ] hoặc ]])
        // Pattern phải match từ đầu reply đến khi gặp dấu đóng "]" hoặc "]]"
        const usedToolsPattern = /^\[Used tools:[\s\S]*?\]\s*/;
        if (usedToolsPattern.test(reply)) {
          const beforeClean = reply;
          reply = reply.replace(usedToolsPattern, '').trim();
          console.log('✅ Cleaned "[Used tools: ...]]" debug info from reply:', {
            beforeLength: beforeClean.length,
            afterLength: reply.length,
            beforePreview: beforeClean.substring(0, 150),
            afterPreview: reply.substring(0, 100)
          });
        } else {
          // Thử pattern khác: có thể không bắt đầu bằng [Used tools
          // Tìm pattern: [Used tools: ...] ở bất kỳ đâu trong reply
          const usedToolsPattern2 = /\[Used tools:[\s\S]*?\]\s*/;
          if (usedToolsPattern2.test(reply)) {
            const beforeClean = reply;
            reply = reply.replace(usedToolsPattern2, '').trim();
            console.log('✅ Cleaned "[Used tools: ...]]" debug info from reply (pattern 2):', {
              beforeLength: beforeClean.length,
              afterLength: reply.length,
              beforePreview: beforeClean.substring(0, 150),
              afterPreview: reply.substring(0, 100)
            });
          }
        }
      }
      
      // Extract cart data và order data nếu có trong response (để đồng bộ với frontend)
      // Thử nhiều cách: từ root, context, hoặc parse từ reply text nếu có JSON block
      let responseCartData = data.cart || data.context?.cart || null;
      let responseOrderData = data.order || data.context?.order || null;
      let cleanedReply = reply; // Reply sau khi loại bỏ JSON block
      
      console.log('🔍 Checking for cart data in reply:', {
        hasCartInData: !!responseCartData,
        replyLength: reply?.length || 0,
        replyEndsWithBrace: reply?.endsWith('}') || false,
        replyLast100Chars: reply?.substring(Math.max(0, reply.length - 100)) || ''
      });
      
      // Helper: validate order data để tránh dùng order "ảo" do AI bịa ra
      const isValidOrderData = (order: any): boolean => {
        if (!order || typeof order !== 'object') return false;

        // ✅ SỬA: Không require `id` vì AI response có thể không có `id` (chỉ có `orderCode`)
        // `id` chỉ có sau khi tạo order trong database, nhưng AI có thể trả về order data với `orderCode` và `qrCode`
        // Chỉ validate `id` nếu có, nhưng không bắt buộc
        if (order.id && (typeof order.id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(order.id))) {
          console.warn('⚠️ Invalid order.id detected in N8N response, but continuing validation:', order.id);
          // Không return false, chỉ warn
        }

        // ✅ QUAN TRỌNG: Phải có `orderCode` (bắt buộc để validate order thực sự được tạo)
        if (!order.orderCode || typeof order.orderCode !== 'string') {
          console.warn('⚠️ Order orderCode missing in N8N response, ignoring order data');
          return false;
        }

        // Tổng tiền phải > 0
        const total = typeof order.totalAmount === 'number'
          ? order.totalAmount
          : typeof order.total === 'number'
            ? order.total
            : 0;
        if (!total || total <= 0) {
          console.warn('⚠️ Invalid order total detected in N8N response, ignoring order data:', total);
          return false;
        }

        // ✅ SỬA: Không require `items` vì AI có thể chỉ trả về `orderCode` và `qrCode` sau khi tạo order
        // `items` chỉ cần nếu có, nhưng không bắt buộc cho validation
        if (order.items && (!Array.isArray(order.items) || order.items.length === 0)) {
          console.warn('⚠️ Order items invalid in N8N response, but continuing validation');
          // Không return false, chỉ warn
        }

        // ✅ SỬA: Không require `phoneNumber` vì AI có thể chỉ trả về order data với `orderCode` và `qrCode`
        // `phoneNumber` chỉ cần nếu có, nhưng không bắt buộc cho validation
        if (order.phoneNumber && typeof order.phoneNumber !== 'string') {
          console.warn('⚠️ Order phoneNumber invalid in N8N response, but continuing validation');
          // Không return false, chỉ warn
        }

        // ✅ QUAN TRỌNG: Phải có `qrCode` để hiển thị QR code
        if (!order.qrCode || typeof order.qrCode !== 'object') {
          console.warn('⚠️ Order qrCode missing in N8N response, but continuing validation (order may still be valid)');
          // Không return false, chỉ warn (vì có thể order hợp lệ nhưng chưa có QR code)
        }

        return true;
      };
      
      // ⚠️ QUAN TRỌNG: Nếu reply chứa JSON block (```json ... ```), extract reply text từ JSON block TRƯỚC KHI clean
      // Vì AI Agent có thể trả về JSON trong code block, và reply text nằm BÊN TRONG JSON block
      if (reply) {
        try {
          // Tìm JSON block trong reply text (ví dụ: ```json {...} ```)
          // Pattern: có thể có newlines trước/sau ```json và ```
          const jsonBlockMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            try {
              const parsedJson = JSON.parse(jsonBlockMatch[1].trim());
              
              // ⚠️ QUAN TRỌNG: Extract reply text từ JSON block TRƯỚC KHI clean
              if (parsedJson.reply && typeof parsedJson.reply === 'string') {
                cleanedReply = parsedJson.reply;
                console.log('✅ Extracted reply text from JSON block:', cleanedReply.substring(0, 100));
              } else {
                // Nếu không có reply trong JSON block, thử clean JSON block khỏi reply gốc
                cleanedReply = reply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
                cleanedReply = cleanedReply.replace(/\n{3,}/g, '\n\n').trim();
                console.log('⚠️ No reply field in JSON block, cleaned JSON block from original reply');
              }
              
              // Extract cart data từ JSON block
              if (parsedJson.cart) {
                // Nếu chưa có cart data, extract từ JSON block
                if (!responseCartData) {
                  responseCartData = parsedJson.cart;
                  console.log('✅ Found cart data in JSON block from reply text');
                }
              }
              
              // ✅ Extract order data từ JSON block (chứa QR code)
              if (parsedJson.order) {
                // Nếu chưa có order data, extract từ JSON block
                if (!responseOrderData && isValidOrderData(parsedJson.order)) {
                  responseOrderData = parsedJson.order;
                  console.log('✅ Found VALID order data in JSON block from reply text:', {
                    orderCode: responseOrderData.orderCode,
                    hasQrCode: !!responseOrderData.qrCode,
                    qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl
                  });
                } else if (!isValidOrderData(parsedJson.order)) {
                  console.warn('⚠️ Ignoring INVALID order data found in JSON block from reply text');
                }
              }
            } catch (e) {
              // Không parse được, nhưng vẫn clean JSON block khỏi reply
              cleanedReply = reply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
              // Loại bỏ các newlines thừa ở cuối
              cleanedReply = cleanedReply.replace(/\n{3,}/g, '\n\n').trim();
              console.log('⚠️ Failed to parse JSON block, cleaned JSON block from reply');
            }
          }
          
          // ⚠️ QUAN TRỌNG: Nếu cleanedReply vẫn rỗng sau khi xử lý, có thể đã bị xóa nhầm
          // Thử extract lại từ reply gốc nếu có JSON block
          if (!cleanedReply || cleanedReply.trim() === '') {
            console.warn('⚠️ cleanedReply is empty after processing, trying to re-extract from original reply');
            const jsonBlockMatch2 = reply.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch2 && jsonBlockMatch2[1]) {
              try {
                const parsedJson2 = JSON.parse(jsonBlockMatch2[1].trim());
                if (parsedJson2.reply && typeof parsedJson2.reply === 'string') {
                  cleanedReply = parsedJson2.reply;
                  console.log('✅ Re-extracted reply text from JSON block:', cleanedReply.substring(0, 100));
                }
              } catch (e2) {
                console.warn('⚠️ Failed to re-parse JSON block:', e2);
              }
            }
          }
          
          // Thử parse toàn bộ reply nếu nó là JSON (nhưng giữ lại text phía trước)
          // ⚠️ QUAN TRỌNG: CHỈ xử lý nếu chưa có cleanedReply hoặc chưa có cart/order data
          if (!responseCartData || !responseOrderData) {
            // Tìm pattern: text... ```json {...} ```
            const textThenJsonMatch = reply.match(/(.*?)```json\s*([\s\S]*?)\s*```/);
            if (textThenJsonMatch) {
              const textPart = textThenJsonMatch[1].trim();
              const jsonPart = textThenJsonMatch[2].trim();
              try {
                const parsedJson = JSON.parse(jsonPart);
                if (parsedJson.cart && !responseCartData) {
                  responseCartData = parsedJson.cart;
                  // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                  if (!cleanedReply || cleanedReply.trim() === '') {
                  cleanedReply = textPart; // Chỉ giữ lại phần text
                  }
                  console.log('✅ Found cart data by parsing JSON block after text');
                }
                // ✅ Extract order data từ JSON block
                if (parsedJson.order && !responseOrderData) {
                  responseOrderData = parsedJson.order;
                  console.log('✅ Found order data by parsing JSON block after text');
                }
              } catch (e) {
                // Không parse được
              }
            }
          }
          
          // THÊM: Tìm JSON ở cuối reply text (không có code block, chỉ là JSON thuần)
          // Pattern phổ biến: text...\n{"cart": {...}} hoặc text...{"cart": {...}}
          if (!responseCartData) {
            // Tách reply thành các dòng và tìm dòng JSON ở cuối
            const lines = reply.split('\n');
            let jsonLineIndex = -1;
            let jsonLine = '';
            
            // Tìm dòng bắt đầu bằng { và kết thúc bằng } (có thể là JSON)
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim();
              if (line.startsWith('{') && line.endsWith('}')) {
                jsonLine = line;
                jsonLineIndex = i;
                break;
              }
            }
            
            // Nếu tìm thấy, thử parse
            if (jsonLineIndex >= 0 && jsonLine) {
              try {
                const parsedJson = JSON.parse(jsonLine);
                if (parsedJson.cart && !responseCartData) {
                  responseCartData = parsedJson.cart;
                  // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                  if (!cleanedReply || cleanedReply.trim() === '') {
                  cleanedReply = lines.slice(0, jsonLineIndex).join('\n').trim();
                  }
                  console.log('✅ Found cart data by parsing JSON line at end of reply');
                }
                // ✅ Extract order data từ JSON line
                if (parsedJson.order && !responseOrderData) {
                  responseOrderData = parsedJson.order;
                  console.log('✅ Found order data by parsing JSON line at end of reply');
                }
              } catch (e) {
                // Không parse được JSON từ dòng đơn, thử tìm JSON object multi-line
                // Tìm từ vị trí cuối cùng có "{" đến hết reply
                const lastOpenBrace = reply.lastIndexOf('{');
                if (lastOpenBrace >= 0) {
                  const jsonCandidate = reply.substring(lastOpenBrace).trim();
                  try {
                    const parsedJson = JSON.parse(jsonCandidate);
                    if (parsedJson.cart && !responseCartData) {
                      responseCartData = parsedJson.cart;
                      // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                      if (!cleanedReply || cleanedReply.trim() === '') {
                      cleanedReply = reply.substring(0, lastOpenBrace).trim();
                      }
                      console.log('✅ Found cart data by parsing JSON from last { brace');
                    }
                    // ✅ Extract order data từ JSON
                    if (parsedJson.order && !responseOrderData) {
                      responseOrderData = parsedJson.order;
                      console.log('✅ Found order data by parsing JSON from last { brace');
                    }
                  } catch (e2) {
                    // Không parse được từ lastOpenBrace, thử tìm JSON ở cuối text (append trực tiếp)
                    // Pattern: text...{"cart": {...}} (không có newline)
                    // Tìm từ cuối reply ngược lại để tìm JSON object
                    let jsonStart = -1;
                    let braceCount = 0;
                    let jsonEnd = reply.length;
                    
                    // Tìm từ cuối reply ngược lại để tìm JSON object hoàn chỉnh
                    for (let i = reply.length - 1; i >= 0; i--) {
                      if (reply[i] === '}') {
                        if (braceCount === 0) {
                          jsonEnd = i + 1;
                        }
                        braceCount++;
                      } else if (reply[i] === '{') {
                        braceCount--;
                        if (braceCount === 0) {
                          jsonStart = i;
                          break;
                        }
                      }
                    }
                    
                    // Nếu tìm thấy JSON object hoàn chỉnh
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                      const jsonCandidate = reply.substring(jsonStart, jsonEnd).trim();
                      try {
                        const parsedJson = JSON.parse(jsonCandidate);
                      if (parsedJson.cart && !responseCartData) {
                          responseCartData = parsedJson.cart;
                        // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                        if (!cleanedReply || cleanedReply.trim() === '') {
                          cleanedReply = reply.substring(0, jsonStart).trim();
                        }
                          console.log('✅ Found cart data by parsing JSON appended at end of reply');
                        }
                      // ✅ Extract order data từ JSON
                      if (parsedJson.order && !responseOrderData) {
                        responseOrderData = parsedJson.order;
                        console.log('✅ Found order data by parsing JSON appended at end of reply');
                        
                        // ✅ QUAN TRỌNG: Nếu order data chỉ có orderCode mà không có id, cần fetch id từ database
                        if (responseOrderData.orderCode && !responseOrderData.id) {
                          try {
                            const { PrismaClient } = await import('@prisma/client');
                            const prisma = new PrismaClient();
                            const order = await prisma.order.findUnique({
                              where: { orderCode: responseOrderData.orderCode },
                              select: { id: true }
                            });
                            if (order) {
                              responseOrderData.id = order.id;
                              console.log('✅ Fetched order id from database:', order.id);
                            } else {
                              console.warn('⚠️ Order not found in database with orderCode:', responseOrderData.orderCode);
                            }
                            await prisma.$disconnect();
                          } catch (error) {
                            console.error('❌ Error fetching order id from database:', error);
                            // Không throw error, chỉ log để không làm gián đoạn flow
                          }
                        }
                      }
                      } catch (e3) {
                        // Không parse được
                      }
                    }
                  }
                }
              }
            } else {
              // Không tìm thấy JSON trên dòng riêng, thử tìm JSON append trực tiếp vào cuối text
              // Pattern: text...{"cart": {...}} (không có newline)
              // Dùng regex để tìm JSON object ở cuối reply (có thể chứa "cart" hoặc "order")
              const jsonAtEndRegex = /\{[\s\S]*("cart"|"order")[\s\S]*\}$/;
              const jsonMatch = reply.match(jsonAtEndRegex);
              
              if (jsonMatch) {
                const jsonCandidate = jsonMatch[0].trim();
                try {
                  const parsedJson = JSON.parse(jsonCandidate);
                  if (parsedJson.cart && !responseCartData) {
                    // Nếu chưa có cart data, extract từ JSON
                      responseCartData = parsedJson.cart;
                      console.log('✅ Found cart data by regex match at end of reply');
                    }
                  // ✅ Extract order data từ JSON
                  if (parsedJson.order && !responseOrderData) {
                    responseOrderData = parsedJson.order;
                    console.log('✅ Found order data by regex match at end of reply');
                    
                    // ✅ QUAN TRỌNG: Nếu order data chỉ có orderCode mà không có id, cần fetch id từ database
                    if (responseOrderData.orderCode && !responseOrderData.id) {
                      try {
                        const order = await prisma.order.findUnique({
                          where: { orderCode: responseOrderData.orderCode },
                          select: { id: true }
                        });
                        if (order) {
                          responseOrderData.id = order.id;
                          console.log('✅ Fetched order id from database:', order.id);
                        } else {
                          console.warn('⚠️ Order not found in database with orderCode:', responseOrderData.orderCode);
                        }
                      } catch (error) {
                        console.error('❌ Error fetching order id from database:', error);
                        // Không throw error, chỉ log để không làm gián đoạn flow
                      }
                    }
                  }
                  // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                  if ((parsedJson.cart || parsedJson.order) && (!cleanedReply || cleanedReply.trim() === '')) {
                    cleanedReply = reply.substring(0, reply.length - jsonCandidate.length).trim();
                    console.log('✅ Cleaned JSON from end of reply (regex match)');
                    console.log('✅ Cleaned reply:', cleanedReply.substring(0, 100));
                  }
                } catch (e4) {
                  console.log('⚠️ Failed to parse JSON from regex match:', e4);
                }
              }
              
              // Fallback: Tìm từ lastOpenBrace nếu regex không match
              // Chỉ tìm nếu chưa clean được JSON (cleanedReply vẫn bằng reply ban đầu)
              if (cleanedReply === reply) {
                const lastOpenBrace = reply.lastIndexOf('{');
                if (lastOpenBrace >= 0) {
                  // Tìm JSON object hoàn chỉnh từ lastOpenBrace
                  let braceCount = 0;
                  let jsonEnd = reply.length;
                  
                  for (let i = lastOpenBrace; i < reply.length; i++) {
                    if (reply[i] === '{') braceCount++;
                    if (reply[i] === '}') {
                      braceCount--;
                      if (braceCount === 0) {
                        jsonEnd = i + 1;
                        break;
                      }
                    }
                  }
                  
                  if (jsonEnd > lastOpenBrace) {
                    const jsonCandidate = reply.substring(lastOpenBrace, jsonEnd).trim();
                    try {
                      const parsedJson = JSON.parse(jsonCandidate);
                      if (parsedJson.cart && !responseCartData) {
                        // Nếu chưa có cart data, extract từ JSON
                          responseCartData = parsedJson.cart;
                          console.log('✅ Found cart data by parsing JSON appended directly at end of reply');
                        }
                      // ✅ Extract order data từ JSON
                      if (parsedJson.order && !responseOrderData) {
                        responseOrderData = parsedJson.order;
                        console.log('✅ Found order data by parsing JSON appended directly at end of reply');
                      }
                      // ⚠️ QUAN TRỌNG: CHỈ set cleanedReply nếu chưa có (đã extract từ JSON block ở trên)
                      if ((parsedJson.cart || parsedJson.order) && (!cleanedReply || cleanedReply.trim() === '')) {
                        cleanedReply = reply.substring(0, lastOpenBrace).trim();
                        console.log('✅ Cleaned JSON from end of reply (lastOpenBrace)');
                        console.log('✅ Cleaned reply:', cleanedReply.substring(0, 100));
                      }
                    } catch (e4) {
                      console.log('⚠️ Failed to parse JSON from lastOpenBrace:', e4);
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          // Không phải JSON, bỏ qua
          console.log('⚠️ Error parsing cart from reply:', e);
        }
      }
      
      if (responseCartData) {
        console.log('✅ Cart data extracted:', {
          itemsCount: responseCartData.items?.length || 0,
          total: responseCartData.total
        });
      }
      
      if (responseOrderData) {
        console.log('✅ Order data extracted:', {
          orderCode: responseOrderData.orderCode,
          total: responseOrderData.total,
          hasQrCode: !!responseOrderData.qrCode,
          qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl,
          qrCodeStructure: responseOrderData.qrCode ? Object.keys(responseOrderData.qrCode) : []
        });
      } else {
        console.log('⚠️ No order data extracted from N8N response JSON block');
        // Thử extract từ data.data hoặc data.order nếu có (response trực tiếp từ N8N)
        if (data.data && (data.data.orderCode || data.data.id)) {
          if (isValidOrderData(data.data)) {
            responseOrderData = data.data;
            console.log('✅ Found VALID order data in data.data:', {
              orderCode: responseOrderData.orderCode,
              hasQrCode: !!responseOrderData.qrCode,
              qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl
            });
          } else {
            console.warn('⚠️ Ignoring INVALID order data in data.data');
          }
        } else if (data.order) {
          if (isValidOrderData(data.order)) {
            responseOrderData = data.order;
            console.log('✅ Found VALID order data in data.order:', {
              orderCode: responseOrderData.orderCode,
              hasQrCode: !!responseOrderData.qrCode,
              qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl
            });
          } else {
            console.warn('⚠️ Ignoring INVALID order data in data.order');
          }
        } else {
          // Thử tìm order data trong toàn bộ response object
          console.log('🔍 Searching for order data in entire response object...');
          console.log('📋 Response keys:', Object.keys(data || {}));
          if (data && typeof data === 'object') {
            // Tìm bất kỳ field nào có orderCode hoặc id
            for (const key in data) {
              if (data[key] && typeof data[key] === 'object') {
                const candidate = data[key];
                if ((candidate.orderCode || candidate.id) && !responseOrderData) {
                  if (isValidOrderData(candidate)) {
                    responseOrderData = candidate;
                    console.log(`✅ Found VALID order data in data.${key}:`, {
                      orderCode: responseOrderData.orderCode,
                      hasQrCode: !!responseOrderData.qrCode,
                      qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl
                    });
                  } else {
                    console.warn(`⚠️ Ignoring INVALID order data in data.${key}`);
                  }
                  break;
                }
              }
            }
          }
        }
      }
      
      // 🔒 Lớp bảo vệ cuối: Nếu order data cuối cùng vẫn không hợp lệ → bỏ luôn, không gửi xuống frontend
      if (responseOrderData && !isValidOrderData(responseOrderData)) {
        console.warn('⚠️ Final order data is INVALID, dropping order before sending to frontend');
        responseOrderData = null;
      }
      
      // ⚠️ QUAN TRỌNG: Log final order data để debug
      if (responseOrderData) {
        console.log('📦 Final order data to send to frontend:', {
          orderCode: responseOrderData.orderCode,
          hasQrCode: !!responseOrderData.qrCode,
          qrCodeUrl: responseOrderData.qrCode?.qrCodeUrl,
          qrCodeKeys: responseOrderData.qrCode ? Object.keys(responseOrderData.qrCode) : []
        });
      } else {
        console.error('❌ NO ORDER DATA FOUND IN N8N RESPONSE!');
        console.error('📋 Full N8N response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
      }
      
      // ⚠️ QUAN TRỌNG: Nếu đã extract được order data, PHẢI loại bỏ JSON khỏi cleanedReply
      // (ngay cả khi cleanedReply đã có giá trị, vì có thể JSON vẫn còn trong đó)
      if (responseOrderData && cleanedReply) {
        // Tìm và loại bỏ JSON object ở cuối reply (nếu có)
        // Pattern: text...{"order": {...}} hoặc text...{"cart": {...}, "order": {...}}
        const jsonAtEndPattern = /\{[\s\S]*("order"|"cart")[\s\S]*\}$/;
        if (jsonAtEndPattern.test(cleanedReply)) {
          const jsonMatch = cleanedReply.match(jsonAtEndPattern);
          if (jsonMatch) {
            try {
              const parsedJson = JSON.parse(jsonMatch[0]);
              // Nếu JSON này chứa order hoặc cart, loại bỏ nó
              if (parsedJson.order || parsedJson.cart) {
                cleanedReply = cleanedReply.substring(0, cleanedReply.length - jsonMatch[0].length).trim();
                console.log('✅ Removed JSON object from cleanedReply after extracting order data');
              }
            } catch (e) {
              // Không parse được, thử tìm từ lastOpenBrace
              const lastOpenBrace = cleanedReply.lastIndexOf('{');
              if (lastOpenBrace >= 0) {
                const jsonCandidate = cleanedReply.substring(lastOpenBrace).trim();
                try {
                  const parsedJson = JSON.parse(jsonCandidate);
                  if (parsedJson.order || parsedJson.cart) {
                    cleanedReply = cleanedReply.substring(0, lastOpenBrace).trim();
                    console.log('✅ Removed JSON object from cleanedReply (lastOpenBrace method)');
                  }
                } catch (e2) {
                  // Không parse được, bỏ qua
                }
              }
            }
          }
        }
        
        // Loại bỏ JSON code block nếu còn sót lại
        cleanedReply = cleanedReply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
        cleanedReply = cleanedReply.replace(/\n{3,}/g, '\n\n').trim();
      }
      
      // Log để debug
      console.log('📝 Reply cleaning result:', {
        originalLength: reply?.length || 0,
        cleanedLength: cleanedReply?.length || 0,
        wasCleaned: cleanedReply !== reply,
        cleanedReplyPreview: cleanedReply?.substring(0, 150) || ''
      });
      
      // ⚠️ QUAN TRỌNG: Đảm bảo reply là string, không phải object hoặc JSON string
      let finalReply = cleanedReply || reply;
      if (typeof finalReply !== 'string') {
        // Nếu reply là object, thử stringify hoặc extract text
        if (finalReply && typeof finalReply === 'object') {
          // Nếu object có field reply, lấy field đó
          if (finalReply.reply && typeof finalReply.reply === 'string') {
            finalReply = finalReply.reply;
          } else {
            // Nếu không, stringify object (nhưng đây không phải điều mong muốn)
            console.warn('⚠️ Reply is object, stringifying:', JSON.stringify(finalReply, null, 2));
            finalReply = JSON.stringify(finalReply);
          }
        } else {
          finalReply = String(finalReply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.');
        }
      }
      
      // ⚠️ QUAN TRỌNG: Nếu reply vẫn là JSON string (bắt đầu bằng {), thử parse lại
      if (finalReply.trim().startsWith('{') && finalReply.trim().endsWith('}')) {
        try {
          const parsedReply = JSON.parse(finalReply);
          if (parsedReply && typeof parsedReply === 'object' && parsedReply.reply) {
            finalReply = typeof parsedReply.reply === 'string' ? parsedReply.reply : String(parsedReply.reply);
            console.log('✅ Parsed JSON string in reply, extracted reply field');
          }
        } catch (e) {
          // Không parse được, giữ nguyên
        }
      }
      
      // ⚠️ CỰC KỲ QUAN TRỌNG: Đảm bảo finalReply KHÔNG rỗng
      // Nếu finalReply rỗng hoặc chỉ có khoảng trắng, dùng cleanedReply hoặc reply gốc
      if (!finalReply || finalReply.trim() === '') {
        console.error('❌ finalReply is EMPTY! Trying fallback...');
        console.error('   cleanedReply:', cleanedReply?.substring(0, 100) || '(empty)');
        console.error('   reply:', reply?.substring(0, 100) || '(empty)');
        
        // Fallback 1: Dùng cleanedReply nếu có
        if (cleanedReply && cleanedReply.trim() !== '') {
          finalReply = cleanedReply;
          console.log('✅ Using cleanedReply as fallback');
        } 
        // Fallback 2: Dùng reply gốc nếu có
        else if (reply && reply.trim() !== '') {
          finalReply = reply;
          console.log('✅ Using original reply as fallback');
        }
        // Fallback 3: Dùng message mặc định
        else {
          finalReply = 'Đã thêm món vào giỏ hàng thành công.';
          console.error('❌ All fallbacks failed, using default message');
        }
      }
      
      // ⚠️ Đảm bảo finalReply không bị cắt (trim chỉ loại bỏ khoảng trắng đầu/cuối, không cắt nội dung)
      finalReply = finalReply.trim();
      
      // Log final reply để debug
      console.log('✅ Final reply before return:', {
        length: finalReply.length,
        preview: finalReply.substring(0, 150),
        isEmpty: finalReply.trim() === '',
        first50Chars: finalReply.substring(0, 50),
        last50Chars: finalReply.substring(Math.max(0, finalReply.length - 50))
      });
      
      // ⚠️ QUAN TRỌNG: Nếu không có cart data từ N8N response nhưng reply có từ khóa "thêm" hoặc "đã thêm"
      // → Tự động lấy cart từ database để trả về cho frontend
      if (!responseCartData && finalReply) {
        const replyLower = finalReply.toLowerCase();
        const isAddToCart = replyLower.includes('đã thêm') || 
                           replyLower.includes('thêm') ||
                           replyLower.includes('vào giỏ hàng') ||
                           replyLower.includes('giỏ hàng hiện có');
        
        if (isAddToCart && request.userId) {
          try {
            console.log('🔄 Auto-fetching cart from database (reply indicates cart action)...');
            const cartService = (await import('./cart.service')).default;
            const dbCart = await cartService.getCart(request.userId);
            
            if (dbCart && dbCart.items && dbCart.items.length > 0) {
              responseCartData = {
                items: dbCart.items,
                total: dbCart.total
              };
              console.log('✅ Auto-fetched cart from database:', {
                itemsCount: responseCartData.items.length,
                total: responseCartData.total
              });
            }
          } catch (error) {
            console.error('⚠️ Failed to auto-fetch cart from database:', error);
            // Tiếp tục với responseCartData = null
          }
        }
      }

      // ⚠️ Nếu không có order data nhưng reply chứa "Mã đơn: ORD-..."
      // → tự lấy đơn hàng + QR code từ database để frontend hiển thị QR
      if (!responseOrderData && finalReply) {
        const orderCodeMatch = finalReply.match(/Mã đơn:\s*(ORD-[0-9-]+)/);
        const orderCode = orderCodeMatch?.[1];

        if (orderCode) {
          try {
            console.log('🔍 Trying to fetch order by orderCode from database for QR:', orderCode);
            const { PrismaClient } = await import('@prisma/client');
            const { vietqr } = await import('../utils/vietqr');

            const prisma = new PrismaClient();

            const order = await prisma.order.findFirst({
              where: { orderCode },
              include: {
                items: {
                  include: {
                    product: true,
                    combo: true,
                  },
                },
              },
            });

            if (order) {
              let qrCodeData: any = null;
              try {
                const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
                const callbackUrl = `${backendUrl}/api/payments/vietqr/callback`;

                qrCodeData = await vietqr.generateQRCode({
                  orderId: order.id,
                  orderCode: order.orderCode,
                  amount: order.total,
                  content: `Thanh toan don hang ${order.orderCode}`,
                  callbackUrl,
                });

                console.log('✅ VietQR code generated from fallback in n8n.service:', {
                  orderId: order.id,
                  orderCode: order.orderCode,
                  qrCodeUrl: qrCodeData.qrCodeUrl,
                });
              } catch (qrErr) {
                console.error('⚠️ Error generating VietQR code in n8n.service fallback:', qrErr);
              }

              responseOrderData = {
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
                qrCode: qrCodeData
                  ? {
                      qrCodeUrl: qrCodeData.qrCodeUrl,
                      qrDataUrl: qrCodeData.qrDataUrl,
                      qrContent: qrCodeData.qrContent,
                    }
                  : null,
              };
            } else {
              console.warn('⚠️ No order found in database for orderCode:', orderCode);
            }
          } catch (dbErr) {
            console.error('⚠️ Error fetching order by code in n8n.service fallback:', dbErr);
          }
        }
      }
      
      return {
        reply: finalReply, // Đảm bảo là string và KHÔNG rỗng
        context: data.context || data.metadata || null,
        cart: responseCartData, // Forward cart data về frontend để sync
        order: responseOrderData, // ✅ Forward order data về frontend để hiển thị QR code
        sessionId: data.sessionId || payload.sessionId,
        metadata: data.metadata || payload.metadata,
      };
    } catch (error) {
      console.error('N8N Service error:', error);
      
      // ✅ Kiểm tra xem có phải lỗi 429 không
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimitError = errorMessage.includes('429') || 
                               errorMessage.includes('Too Many Requests') ||
                               errorMessage.includes('rate limit') ||
                               errorMessage.includes('quota exceeded');
      
      if (isRateLimitError) {
        console.error('⚠️ Rate limit error detected in catch block');
        return {
          reply: 'Xin lỗi, hệ thống AI đang quá tải do quá nhiều yêu cầu. Vui lòng đợi 15-30 giây rồi thử lại.\n\n' +
                 '💡 Gợi ý: Bạn có thể thử lại sau vài phút.',
          context: null,
          sessionId: request.sessionId || `session_${request.userId}_${Date.now()}`,
          metadata: { 
            warning: 'rate_limit_error',
            error: '429_too_many_requests',
            suggestion: 'Wait 15-30 seconds before retrying',
            retryAfter: 30
          }
        };
      }
      
      throw new Error('Không thể kết nối với AI agent');
    }
  }

  /**
   * Test connection to n8n webhook
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPayload = {
        message: 'test',
        userId: 'test-user',
        sessionId: 'test-session',
        context: {},
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'test',
          userType: 'user',
          conversationId: 'test-conversation',
        }
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(testPayload),
      });
      
      return response.ok;
    } catch (error) {
      console.error('N8N connection test failed:', error);
      return false;
    }
  }
}

export default new N8nService();