import React, { useEffect, useRef } from 'react';
import '@n8n/chat/style.css';
import './N8nChatWidget.css';

interface N8nChatWidgetProps {
  webhookUrl: string;
  isVisible?: boolean;
  onClose?: () => void;
}

const N8nChatWidget: React.FC<N8nChatWidgetProps> = ({ 
  webhookUrl, 
  isVisible = true, 
  onClose 
}) => {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!webhookUrl || !isVisible) return;

    // Import createChat dynamically
    const initChat = async () => {
      try {
        const { createChat } = await import('@n8n/chat');
        
        // Clear any existing chat
        if (chatRef.current) {
          chatRef.current.innerHTML = '';
        }

        // Collect user metadata from localStorage/session
        let userId: string | undefined;
        try {
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          userId = (user && (user._id || user.id)) || undefined;
        } catch {}
        const token = localStorage.getItem('token') || undefined;
        const email = (() => {
          try { return JSON.parse(localStorage.getItem('user') || 'null')?.email; } catch { return undefined; }
        })();

        // Create new chat instance
        createChat({
          webhookUrl: webhookUrl,
          target: chatRef.current || undefined,
          // Additional configuration options
          theme: {
            primaryColor: '#0084ff',
            textColor: '#333',
            backgroundColor: '#fff',
          },
          // Pass user metadata so n8n can authenticate/segment
          metadata: {
            userId: userId || sessionStorage.getItem('guest_chat_id') || 'guest',
            token,
            email,
            source: 'web',
          },
          // You can add more configuration here
        });
      } catch (error) {
        console.error('Failed to initialize N8N chat:', error);
      }
    };

    initChat();
  }, [webhookUrl, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="n8n-chat-container">
      <div className="n8n-chat-header">
        <h3>AI Assistant</h3>
        {onClose && (
          <button 
            className="n8n-chat-close" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1.2em',
              padding: '4px'
            }}
          >
            ×
          </button>
        )}
      </div>
      <div ref={chatRef} className="n8n-chat-widget" />
    </div>
  );
};

export default N8nChatWidget;
