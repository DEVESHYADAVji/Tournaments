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
}

interface AskResponse {
  answer?: string;
  detail?: string;
}

export const HelpChat: React.FC<HelpChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const addBotMessage = React.useCallback((content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, message]);
  }, []);

  const checkDocumentStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/health`);
      const data = (await response.json()) as HealthResponse;
      const isLoaded = Boolean(data.document_loaded);
      setDocumentLoaded(isLoaded);

      setMessages((prev) => {
        if (prev.length > 0) {
          return prev;
        }

        return [
          {
            id: Date.now().toString(),
            type: 'bot',
            content: isLoaded
              ? 'Welcome! How can I help you today?'
              : 'Help information is not available right now. Please try again later.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
      });
    } catch (error) {
      console.error('Failed to check document status:', error);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || loading || !documentLoaded) return;

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen, loading, documentLoaded, messages.length]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void checkDocumentStatus();
  }, [checkDocumentStatus]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!documentLoaded) {
      addBotMessage('Help information is not available right now. Please try again later.');
      return;
    }

    const question = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = (await response.json()) as AskResponse;

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get answer');
      }

      addBotMessage(data.answer || 'No answer was returned.');
    } catch (error) {
      addBotMessage(
        `Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
          <button className="close-btn" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

        <div className="help-chat-messages">
          {messages.length === 0 && !documentLoaded ? (
            <div className="welcome-message">
              <p>Welcome to Help & Support!</p>
              <p>Help information is not available right now.</p>
            </div>
          ) : null}
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
              onKeyDown={handleKeyPress}
              placeholder={documentLoaded ? 'Ask your question...' : 'Help document not available...'}
              disabled={!documentLoaded || loading}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={!documentLoaded || loading || !input.trim()}
              className="send-btn"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpChat;
