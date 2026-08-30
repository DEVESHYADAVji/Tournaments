import React, { useEffect, useRef, useState } from 'react';
import { VITE_HELP_CHATBOT_BASE_URL } from '../../config/env';
import './HelpChat.css';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface HelpChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HealthResponse {
  document_loaded?: boolean;
  chat_available?: boolean;
}

interface AskResponse {
  answer?: string;
  detail?: string;
}

interface StoredUser {
  id?: string | number;
  role?: string;
}

export const HelpChat: React.FC<HelpChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const addBotMessage = React.useCallback((content: string) => {
    setMessages((prev) => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      type: 'bot',
      content,
      timestamp: new Date().toLocaleTimeString(),
    }]);
  }, []);

  const checkServiceStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/health`);
      if (!response.ok) throw new Error('Support service is unavailable');
      const data = (await response.json()) as HealthResponse;
      setChatAvailable(data.chat_available !== false);
      setMessages((prev) => prev.length > 0 ? prev : [{
        id: `${Date.now()}-${Math.random()}`,
        type: 'bot',
        content: data.chat_available !== false
          ? 'Welcome! I can help with the website using the help guide and current public product information.'
          : 'Help & Support is temporarily unavailable. Please try again later.',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (error) {
      console.error('Failed to check help chatbot status:', error);
      setChatAvailable(false);
      setMessages((prev) => prev.length > 0 ? prev : [{
        id: `${Date.now()}-${Math.random()}`,
        type: 'bot',
        content: 'Help & Support is temporarily unavailable. Please try again later.',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || loading || !chatAvailable) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, loading, chatAvailable, messages.length]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void checkServiceStatus();
  }, [checkServiceStatus]);

  const handleSendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (!chatAvailable) {
      addBotMessage('Help & Support is temporarily unavailable. Please try again later.');
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput('');
    setLoading(true);

    try {
      const storedUserRaw = localStorage.getItem('user');
      const storedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as StoredUser) : null;
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          role: storedUser?.role ?? 'user',
          user_id: storedUser?.id ? Number(storedUser.id) : null,
          history: conversation.slice(-8).map(({ type, content }) => ({ role: type, content })),
        }),
      });

      const data = (await response.json()) as AskResponse;
      if (!response.ok) throw new Error(data.detail || 'Failed to get answer');
      addBotMessage(data.answer || 'I could not generate an answer right now.');
    } catch (error) {
      addBotMessage(`Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="help-chat-overlay">
      <div className="help-chat-modal">
        <div className="help-chat-header">
          <h2>Help & Support</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close chat">×</button>
        </div>
        <div className="help-chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.type}`}>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">{msg.timestamp}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="help-chat-footer">
          <div className="input-section">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatAvailable ? 'Ask your question...' : 'Support service unavailable...'}
              disabled={!chatAvailable || loading}
              aria-label="Help and support question"
            />
            <button onClick={() => void handleSendMessage()} disabled={!chatAvailable || loading || !input.trim()} className="send-btn">
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpChat;
