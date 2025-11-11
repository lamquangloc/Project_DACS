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
}

class N8nService {
  private webhookUrl: string;
  private apiKey?: string;

  constructor() {
    // Sử dụng webhook URL mặc định nếu chưa được cấu hình
    // LƯU Ý: Phải dùng Production URL, không dùng Test URL
    // Test URL: https://tunz123.app.n8n.cloud/webhook-test/restaurant-chat (chỉ test trong editor)
    // Production URL: https://tunz123.app.n8n.cloud/webhook/restaurant-chat (dùng cho production)
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://tunz123.app.n8n.cloud/webhook/restaurant-chat';
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
      
      // Nếu không có cart trong request, thử lấy từ database
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        try {
          const cartService = (await import('./cart.service')).default;
          const dbCart = await cartService.getCart(request.userId);
          if (dbCart && dbCart.items && dbCart.items.length > 0) {
            cartData = dbCart;
            console.log('📦 Cart loaded from database:', {
              itemsCount: dbCart.items.length,
              total: dbCart.total
            });
          }
        } catch (error) {
          console.error('Failed to load cart from database:', error);
          // Tiếp tục với cartData = null
        }
      }
      
      const payload = {
        // Chat Trigger Node sẽ nhận các field này từ Webhook body
        message: request.input,
        input: request.input, // Thêm cả input để đảm bảo
        userId: request.userId,
        sessionId: generatedSessionId,
        // Đặt sessionId ở root level để Chat Trigger Node có thể đọc được
        // Chat Trigger Node thường tự động extract sessionId từ body
        context: {
          ...(request.context || {}),
          // Forward cart data nếu có
          ...(cartData ? { cart: cartData, hasCart: true } : {}),
        },
        // ✅ Gửi cart ở root level để AI dễ truy cập (QUAN TRỌNG!)
        ...(cartData ? { cart: cartData } : {}),
        timestamp: new Date().toISOString(),
        // Thêm metadata cho AI Agent
        metadata: {
          source: 'webhook',
          userType: 'user', // hoặc 'admin' tùy theo logic
          conversationId: generatedSessionId,
          sessionId: generatedSessionId, // Thêm vào metadata để chắc chắn
          // ✅ Thêm cart info vào metadata để AI biết có cart không
          ...(cartData ? { 
            hasCart: true,
            cartItemsCount: cartData.items?.length || 0,
            cartTotal: cartData.total || 0,
            source: 'localStorage' // Đánh dấu cart từ localStorage (cart thực tế)
          } : {}),
        },
        // Đảm bảo sessionId được expose ở nhiều level
        'chat-session-id': generatedSessionId,
        // ✅ Gửi token để tool có thể dùng
        token: token, // Token để authenticate với backend API
      };

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
        console.error('   4. AI Agent not returning any response');
        
        return {
          reply: 'Xin lỗi, hệ thống AI chưa trả lời. Vui lòng kiểm tra:\n' +
                 '1. Workflow n8n đã được kích hoạt chưa?\n' +
                 '2. Node "Respond to Webhook" đã được cấu hình đúng chưa?',
          context: null,
          sessionId: payload.sessionId,
          metadata: { 
            warning: 'empty_response',
            error: 'n8n_workflow_not_responding',
            suggestion: 'Check n8n workflow configuration and activation status'
          }
        };
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ N8N Parsed Data (type):', typeof data);
        console.log('✅ N8N Parsed Data (keys):', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
        console.log('✅ N8N Parsed Data (full):', JSON.stringify(data, null, 2));
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
        
        // Thử các key phổ biến
        if (obj.text) return extractText(obj.text);
        if (obj.message) return extractText(obj.message);
        if (obj.content) return extractText(obj.content);
        if (obj.response) return extractText(obj.response);
        if (obj.reply) return extractText(obj.reply);
        if (obj.output) return extractText(obj.output);
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
      
      // Thử extract từ các format phổ biến
      reply = extractText(data) || '';
      
      // Nếu vẫn không có, thử các field trực tiếp
      if (!reply) {
        if (typeof data === 'string') {
          reply = data;
        } else if (data.output) {
          reply = typeof data.output === 'string' ? data.output : extractText(data.output) || '';
      } else if (data.response) {
          reply = typeof data.response === 'string' ? data.response : extractText(data.response) || '';
      } else if (data.message) {
          reply = typeof data.message === 'string' ? data.message : extractText(data.message) || '';
      } else if (data.reply) {
          reply = typeof data.reply === 'string' ? data.reply : extractText(data.reply) || '';
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
      
      // Extract cart data nếu có trong response (để đồng bộ với frontend)
      // Thử nhiều cách: từ root, context, hoặc parse từ reply text nếu có JSON block
      let responseCartData = data.cart || data.context?.cart || null;
      let cleanedReply = reply; // Reply sau khi loại bỏ JSON block
      
      console.log('🔍 Checking for cart data in reply:', {
        hasCartInData: !!responseCartData,
        replyLength: reply?.length || 0,
        replyEndsWithBrace: reply?.endsWith('}') || false,
        replyLast100Chars: reply?.substring(Math.max(0, reply.length - 100)) || ''
      });
      
      // QUAN TRỌNG: Luôn clean JSON khỏi reply (dù đã có cart data hay chưa)
      // Nếu chưa có cart data, thử parse từ reply text (n8n có thể trả về JSON trong reply)
      // Nếu đã có cart data nhưng reply vẫn có JSON, vẫn phải clean JSON khỏi reply
      if (reply) {
        try {
          // Tìm JSON block trong reply text (ví dụ: ```json {...} ```)
          // Pattern: có thể có newlines trước/sau ```json và ```
          const jsonBlockMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            try {
              const parsedJson = JSON.parse(jsonBlockMatch[1].trim());
              if (parsedJson.cart) {
                // Nếu chưa có cart data, extract từ JSON block
                if (!responseCartData) {
                  responseCartData = parsedJson.cart;
                  console.log('✅ Found cart data in JSON block from reply text');
                }
                // Luôn loại bỏ JSON block khỏi reply để user không thấy JSON
                // Pattern: ```json ... ``` (có thể có newlines trước/sau)
                cleanedReply = reply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
                // Loại bỏ các newlines thừa ở cuối (có thể có \n\n\n sau khi remove JSON block)
                cleanedReply = cleanedReply.replace(/\n{3,}/g, '\n\n').trim();
                console.log('✅ Cleaned JSON block from reply');
              }
            } catch (e) {
              // Không parse được, nhưng vẫn clean JSON block khỏi reply
              cleanedReply = reply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
              // Loại bỏ các newlines thừa ở cuối
              cleanedReply = cleanedReply.replace(/\n{3,}/g, '\n\n').trim();
            }
          }
          
          // Thử parse toàn bộ reply nếu nó là JSON (nhưng giữ lại text phía trước)
          if (!responseCartData) {
            // Tìm pattern: text... ```json {...} ```
            const textThenJsonMatch = reply.match(/(.*?)```json\s*([\s\S]*?)\s*```/);
            if (textThenJsonMatch) {
              const textPart = textThenJsonMatch[1].trim();
              const jsonPart = textThenJsonMatch[2].trim();
              try {
                const parsedJson = JSON.parse(jsonPart);
                if (parsedJson.cart) {
                  responseCartData = parsedJson.cart;
                  cleanedReply = textPart; // Chỉ giữ lại phần text
                  console.log('✅ Found cart data by parsing JSON block after text');
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
                if (parsedJson.cart) {
                  responseCartData = parsedJson.cart;
                  // Loại bỏ dòng JSON khỏi reply
                  cleanedReply = lines.slice(0, jsonLineIndex).join('\n').trim();
                  console.log('✅ Found cart data by parsing JSON line at end of reply');
                }
              } catch (e) {
                // Không parse được JSON từ dòng đơn, thử tìm JSON object multi-line
                // Tìm từ vị trí cuối cùng có "{" đến hết reply
                const lastOpenBrace = reply.lastIndexOf('{');
                if (lastOpenBrace >= 0) {
                  const jsonCandidate = reply.substring(lastOpenBrace).trim();
                  try {
                    const parsedJson = JSON.parse(jsonCandidate);
                    if (parsedJson.cart) {
                      responseCartData = parsedJson.cart;
                      cleanedReply = reply.substring(0, lastOpenBrace).trim();
                      console.log('✅ Found cart data by parsing JSON from last { brace');
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
                        if (parsedJson.cart) {
                          responseCartData = parsedJson.cart;
                          cleanedReply = reply.substring(0, jsonStart).trim();
                          console.log('✅ Found cart data by parsing JSON appended at end of reply');
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
              // Dùng regex để tìm JSON object ở cuối reply
              const jsonAtEndRegex = /\{[\s\S]*"cart"[\s\S]*\}$/;
              const jsonMatch = reply.match(jsonAtEndRegex);
              
              if (jsonMatch) {
                const jsonCandidate = jsonMatch[0].trim();
                try {
                  const parsedJson = JSON.parse(jsonCandidate);
                  if (parsedJson.cart) {
                    // Nếu chưa có cart data, extract từ JSON
                    if (!responseCartData) {
                      responseCartData = parsedJson.cart;
                      console.log('✅ Found cart data by regex match at end of reply');
                    }
                    // Luôn clean JSON khỏi reply
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
                      if (parsedJson.cart) {
                        // Nếu chưa có cart data, extract từ JSON
                        if (!responseCartData) {
                          responseCartData = parsedJson.cart;
                          console.log('✅ Found cart data by parsing JSON appended directly at end of reply');
                        }
                        // Luôn clean JSON khỏi reply
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
      
      // Log để debug
      console.log('📝 Reply cleaning result:', {
        originalLength: reply?.length || 0,
        cleanedLength: cleanedReply?.length || 0,
        wasCleaned: cleanedReply !== reply,
        cleanedReplyPreview: cleanedReply?.substring(0, 150) || ''
      });
      
      return {
        reply: cleanedReply || reply, // Sử dụng cleaned reply (đã loại bỏ JSON block)
        context: data.context || data.metadata || null,
        cart: responseCartData, // Forward cart data về frontend để sync
        sessionId: data.sessionId || payload.sessionId,
        metadata: data.metadata || payload.metadata,
      };
    } catch (error) {
      console.error('N8N Service error:', error);
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