import React, { useEffect, useRef, useState } from 'react';
import { getChatHistory, sendMessage } from '../api/chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const history = await getChatHistory();
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const response = await sendMessage(text);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('Error sending message:', err);
      const tempErrorMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: '⚠️ ไม่สามารถรับคำตอบจากผู้ช่วย AI ได้ กรุณาลองใหม่อีกครั้ง',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempErrorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="chat-page">
      {/* Scrollable messages container */}
      <div className="chat-messages">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
              เริ่มต้นการสนทนากับ AI สายตรวจลานสัก<br />
              สามารถถามเกี่ยวกับกำลังพล จุดตรวจ คดี หรือเรื่องกฎหมายเบื้องต้นได้
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div className="bubble-content">
                {msg.content}
                <span className="bubble-time">
                  {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="chat-bubble assistant">
            <div className="bubble-content" style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar at the bottom */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <textarea
          placeholder="พิมพ์คำถามของคุณที่นี่..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '44px', height: '44px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
          disabled={!input.trim() || sending}
        >
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}
