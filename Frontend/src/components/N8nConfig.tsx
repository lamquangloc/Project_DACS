import React, { useState, useEffect } from 'react';
import { message } from 'antd';

interface N8nConfigProps {
  onConfigChange?: (config: { webhookUrl: string; apiKey?: string }) => void;
}

const N8nConfig: React.FC<N8nConfigProps> = ({ onConfigChange }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('n8n-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setWebhookUrl(config.webhookUrl || 'https://tunz.app.n8n.cloud/webhook/250be22b-841f-4802-a3f5-9c661ba362d0');
      setApiKey(config.apiKey || '');
    } else {
      // Set default webhook URL
      setWebhookUrl('https://tunz.app.n8n.cloud/webhook/250be22b-841f-4802-a3f5-9c661ba362d0');
    }
  }, []);

  const testConnection = async () => {
    if (!webhookUrl) {
      message.error('Vui lòng nhập N8N Webhook URL');
      return;
    }

    setIsLoading(true);
    try {
      // Test trực tiếp webhook URL
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });
      
      if (response.ok) {
        setIsConnected(true);
        message.success('Kết nối N8N thành công!');
      } else {
        setIsConnected(false);
        message.error(`Không thể kết nối với N8N (${response.status})`);
      }
    } catch (error) {
      setIsConnected(false);
      message.error('Lỗi khi kiểm tra kết nối N8N');
      console.error('N8N connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    const config = { webhookUrl, apiKey };
    localStorage.setItem('n8n-config', JSON.stringify(config));
    onConfigChange?.(config);
    try {
      // đồng bộ cấu hình lên backend để proxy
      await fetch('http://localhost:5000/api/n8n/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch {}
    message.success('Đã lưu cấu hình N8N');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Cấu hình N8N AI Agent</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          N8N Webhook URL:
        </label>
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://tunz.app.n8n.cloud/webhook/250be22b-841f-4802-a3f5-9c661ba362d0"
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            fontSize: '12px',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          API Key (tùy chọn):
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key nếu cần"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={testConnection}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
        </button>

        <button
          onClick={saveConfig}
          style={{
            padding: '8px 16px',
            backgroundColor: '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Lưu cấu hình
        </button>
      </div>

      {isConnected && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
          color: '#52c41a'
        }}>
          ✓ N8N AI Agent đã sẵn sàng
        </div>
      )}
      
      {!isConnected && webhookUrl && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#fff2e8', 
          border: '1px solid #ffd591',
          borderRadius: '4px',
          color: '#fa8c16'
        }}>
          ⚠️ N8N AI Agent chưa kết nối được
          <br />
          <small>URL: {webhookUrl}</small>
        </div>
      )}
    </div>
  );
};

export default N8nConfig;
