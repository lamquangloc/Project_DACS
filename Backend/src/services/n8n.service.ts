/**
 * Service for integrating with n8n AI Agent
 * @module n8nService
 */

interface N8nRequest {
  input: string;
  userId: string;
  sessionId?: string;
  context?: any;
}

interface N8nResponse {
  reply: string;
  context?: any;
  sessionId?: string;
  metadata?: any;
}

class N8nService {
  private webhookUrl: string;
  private apiKey?: string;

  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || '';
    this.apiKey = process.env.N8N_API_KEY;
    
    if (!this.webhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured');
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
      const payload = {
        // Format cho webhook trigger
        message: request.input,
        userId: request.userId,
        sessionId: request.sessionId || `session_${request.userId}_${Date.now()}`,
        context: request.context || {},
        timestamp: new Date().toISOString(),
        // Thêm metadata cho AI Agent
        metadata: {
          source: 'webhook',
          userType: 'user', // hoặc 'admin' tùy theo logic
          conversationId: request.sessionId || `conv_${request.userId}_${Date.now()}`,
        }
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`N8N API error: ${response.status} ${response.statusText}`);
      }

      // Xử lý response text và JSON
      const responseText = await response.text();
      console.log('N8N Response Status:', response.status);
      console.log('N8N Response Text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('N8N Parsed Data:', data);
      } catch (e) {
        // Nếu không phải JSON, coi như string response
        console.log('N8N Response is not JSON, treating as string');
        data = { message: responseText };
      }
      
      // Xử lý response từ N8N AI Agent
      let reply = '';
      
      // Hỗ trợ nhiều format response từ N8N
      if (data.output) {
        reply = data.output;
      } else if (data.response) {
        reply = data.response;
      } else if (data.message) {
        reply = data.message;
      } else if (data.reply) {
        reply = data.reply;
      } else if (data.text) {
        reply = data.text;
      } else if (data.content) {
        reply = data.content;
      } else if (data.answer) {
        reply = data.answer;
      } else if (typeof data === 'string') {
        reply = data;
      } else if (data.data && typeof data.data === 'string') {
        reply = data.data;
      } else {
        // Fallback - log để debug
        console.log('Unknown response format:', data);
        reply = 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
      }
      
      console.log('Final reply:', reply);
      
      return {
        reply: reply,
        context: data.context || data.metadata || null,
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
