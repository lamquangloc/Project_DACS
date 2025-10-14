/**
 * N8N AI Chat route
 * @module n8nChatRoutes
 */
import express from 'express';
import n8nService from '../services/n8n.service';

const router = express.Router();

/**
 * POST /api/n8n/chat
 * Send message to n8n AI agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { input, userId, sessionId, context } = req.body;

    // Validate required fields
    if (!input || !userId) {
      return res.status(400).json({ 
        reply: 'Thiếu thông tin cần thiết (input, userId)',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate input length
    if (input.length > 1000) {
      return res.status(400).json({
        reply: 'Tin nhắn quá dài. Vui lòng rút gọn xuống dưới 1000 ký tự.',
        error: 'INPUT_TOO_LONG'
      });
    }

    const response = await n8nService.sendMessage({
      input: input.trim(),
      userId,
      sessionId,
      context,
    });

    // Ensure response has required fields
    const formattedResponse = {
      reply: response.reply || 'Xin lỗi, tôi không thể trả lời ngay bây giờ.',
      context: response.context || null,
      sessionId: response.sessionId || sessionId,
      metadata: response.metadata || null
    };

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
