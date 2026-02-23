// React component example for Chatbot integration
import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const response = await api.get('/chatbot/session');

      if (response.data.success) {
        setMessages(response.data.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(
        '/chatbot/query',
        { query: input }
      );

      if (response.data.success) {
        const botMessage = { role: 'assistant', content: response.data.answer };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearSession = async () => {
    try {
      await api.delete('/chatbot/session');
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>TinyTots Assistant</h3>
        <button onClick={clearSession} className="clear-btn">Clear Chat</button>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-content typing">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chatbot-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={loading}
          className="chatbot-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
