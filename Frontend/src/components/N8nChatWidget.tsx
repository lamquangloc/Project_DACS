import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (!webhookUrl || !isVisible) return;

    // Import createChat dynamically
    const initChat = async () => {
      try {
        const { createChat } = await import('@n8n/chat');
        
        // No target: let n8n render its own floating widget

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
          // target omitted to use default floating UI
          theme: {
            primaryColor: '#111827',
            textColor: '#111827',
            backgroundColor: '#ffffff',
          },
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

  // Render nothing; n8n manages its own floating button/panel
  return null;
};

export default N8nChatWidget;
