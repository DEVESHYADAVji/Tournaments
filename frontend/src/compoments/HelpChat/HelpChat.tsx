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
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if document is loaded on mount
  useEffect(() => {
    checkDocumentStatus();
  }, []);

  const checkDocumentStatus = async () => {
    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/health`);
      const data = await response.json();
      setDocumentLoaded(data.document_loaded);

      if (data.document_loaded && messages.length === 0) {
        addBotMessage(
          `Welcome! I have access to "${data.current_document}". Ask me anything about the website or services!`
        );
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload document');
      }

      const data = await response.json();
      setDocumentLoaded(true);
      addBotMessage(
        `Great! I've loaded "${data.filename}". Now I can answer your questions based on this document. What would you like to know?`
      );
    } catch (error) {
      addBotMessage(
        `Sorry, I couldn't load the document. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!documentLoaded) {
      addBotMessage('Please upload a document first before asking questions.');
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
              <p>Upload a document to get started.</p>
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
          {!documentLoaded && (
            <div className="file-upload-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.txt"
                disabled={uploadingDoc}
              />
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
              >
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          )}

          <div className="input-section">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                documentLoaded
                  ? 'Ask your question...'
                  : 'Upload a document first...'
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
