import React, { useEffect, useRef, useState } from 'react';
import { VITE_HELP_CHATBOT_BASE_URL } from '../../config/env';
import './HelpChat.css';

interface Message { id: string; type: 'user' | 'bot'; content: string; timestamp: string; }
interface HelpChatProps { isOpen: boolean; onClose: () => void; }
interface HealthResponse { chat_available?: boolean; }
interface AskResponse { answer?: string; detail?: unknown; }
interface StoredUser { id?: string | number; name?: string; email?: string; role?: string; }

export const HelpChat: React.FC<HelpChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const addBotMessage = React.useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'bot', content, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const checkServiceStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/health`);
      if (!response.ok) throw new Error('Support service is unavailable');
      const data = (await response.json()) as HealthResponse;
      setChatAvailable(data.chat_available !== false);
      setMessages((prev) => prev.length ? prev : [{ id: `${Date.now()}-${Math.random()}`, type: 'bot', content: data.chat_available !== false ? 'Welcome! I can help with the website, current tournaments, your account, and other support questions.' : 'Help & Support is temporarily unavailable. Please try again later.', timestamp: new Date().toLocaleTimeString() }]);
    } catch (error) {
      console.error('Failed to check help chatbot status:', error);
      setChatAvailable(false);
      setMessages((prev) => prev.length ? prev : [{ id: `${Date.now()}-${Math.random()}`, type: 'bot', content: 'Help & Support is temporarily unavailable. Please try again later.', timestamp: new Date().toLocaleTimeString() }]);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (!isOpen || loading || !chatAvailable) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, loading, chatAvailable, messages.length]);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void checkServiceStatus();
  }, [checkServiceStatus]);

  const getCurrentUser = (): StoredUser | null => {
    try { const raw = localStorage.getItem('user'); return raw ? (JSON.parse(raw) as StoredUser) : null; } catch { return null; }
  };

  const formatApiError = (detail: unknown): string => {
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => typeof item === 'object' && item !== null ? String((item as { msg?: string; message?: string }).msg || (item as { message?: string }).message || '') : '').filter(Boolean);
      if (messages.length) return messages.join('; ');
    }
    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: string }).message;
      if (message) return message;
    }
    return 'The request could not be processed. Please try again.';
  };

  const handleSendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (!chatAvailable) { addBotMessage('Help & Support is temporarily unavailable. Please try again later.'); return; }
    const userMessage: Message = { id: `${Date.now()}-${Math.random()}`, type: 'user', content: question, timestamp: new Date().toLocaleTimeString() };
    const conversation = [...messages, userMessage];
    setMessages(conversation); setInput(''); setLoading(true);
    try {
      const storedUser = getCurrentUser();
      const response = await fetch(`${VITE_HELP_CHATBOT_BASE_URL}/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user: storedUser ? { id: storedUser.id ? Number(storedUser.id) : null, name: storedUser.name || null, email: storedUser.email || null, role: storedUser.role || 'user' } : null,
          history: conversation.slice(-8).map(({ type, content }) => ({ role: type === 'bot' ? 'assistant' : 'user', content })),
        }),
      });
      const data = (await response.json()) as AskResponse;
      if (!response.ok) throw new Error(formatApiError(data.detail));
      addBotMessage(data.answer || 'I could not generate an answer right now.');
    } catch (error) { addBotMessage(`Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSendMessage(); }
  };

  if (!isOpen) return null;
  return (
    <div className="help-chat-overlay"><div className="help-chat-modal">
      <div className="help-chat-header"><h2>Help & Support</h2><button className="close-btn" onClick={onClose} aria-label="Close chat">×</button></div>
      <div className="help-chat-messages">{messages.map((msg) => <div key={msg.id} className={`message message-${msg.type}`}><div className="message-content">{msg.content}</div><div className="message-time">{msg.timestamp}</div></div>)}<div ref={messagesEndRef} /></div>
      <div className="help-chat-footer"><div className="input-section"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={chatAvailable ? 'Ask your question...' : 'Support service unavailable...'} disabled={!chatAvailable || loading} aria-label="Help and support question" /><button onClick={() => void handleSendMessage()} disabled={!chatAvailable || loading || !input.trim()} className="send-btn">{loading ? '...' : 'Send'}</button></div></div>
    </div></div>
  );
};

export default HelpChat;
