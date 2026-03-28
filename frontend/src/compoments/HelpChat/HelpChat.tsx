import React, { useState, useRef, useEffect } from 'react';
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

export const HelpChat: React.FC<HelpChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Scroll to bottom when messages change
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

  // Check if document is loaded on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    checkDocumentStatus();
  }, []);

  const checkDocumentStatus = async () => {
    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/health`);
      const data = await response.json();
      setDocumentLoaded(data.document_loaded);

      if (data.document_loaded && messages.length === 0) {
        addBotMessage(
          'Welcome! How can I help you today?'
        );
      } else if (!data.document_loaded && messages.length === 0) {
        addBotMessage('Help information is not available right now. Please try again later.');
      }
    } catch (error) {
      console.error('Failed to check document status:', error);
    }
  };

  const addBotMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!documentLoaded) {
      addBotMessage('Help information is not available right now. Please try again later.');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get answer');
      }

      const data = await response.json();
      addBotMessage(data.answer);
    } catch (error) {
      addBotMessage(
        `Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="help-chat-overlay">
      <div className="help-chat-modal">
        <div className="help-chat-header">
          <h2>Help & Support</h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div className="help-chat-messages">
          {messages.length === 0 && !documentLoaded && (
            <div className="welcome-message">
              <p>Welcome to Help & Support!</p>
              <p>Help information is not available right now.</p>
            </div>
          )}
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
              onKeyPress={handleKeyPress}
              placeholder={
                documentLoaded
                  ? 'Ask your question...'
                  : 'Help document not available...'
              }
              disabled={!documentLoaded || loading}
            />
            <button
              onClick={handleSendMessage}
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
