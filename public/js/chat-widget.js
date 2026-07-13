/**
 * AI Chat Widget - Priority Citizenship Limited
 * Phase 2 AI Integration
 */
(function() {
  'use strict';

  const API_BASE = '/api';
  let messageHistory = [];
  let isProcessing = false;

  // Create widget DOM elements
  function createWidget() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.className = 'chat-trigger';
    trigger.id = 'chatTrigger';
    trigger.setAttribute('aria-label', 'Open AI chat assistant');
    trigger.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="chat-unread" id="chatUnread"></span>
    `;
    document.body.appendChild(trigger);

    // Widget container
    const widget = document.createElement('div');
    widget.className = 'chat-widget';
    widget.id = 'chatWidget';
    widget.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-header-avatar">PC</div>
          <div class="chat-header-info">
            <h4>AI Assistant</h4>
            <p>Priority Citizenship Limited</p>
          </div>
        </div>
        <button class="chat-header-close" id="chatClose" aria-label="Close chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="chat-messages" id="chatMessages">
        <div class="chat-message bot">
          <div class="chat-avatar-small">PC</div>
          <div class="chat-bubble">
            Hello! I'm Priority Citizenship's AI immigration assistant. I can help you with questions about Vanuatu citizenship, residence permits, visa services, and our application process. How can I help you today?
          </div>
        </div>
      </div>
      <div class="chat-quick-actions" id="chatQuickActions"></div>
      <div class="chat-typing" id="chatTyping">
        <div class="chat-typing-dots"><span></span><span></span><span></span></div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chatInput" placeholder="Type your question..." autocomplete="off">
        <button class="chat-send-btn" id="chatSend" aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(widget);

    // Load quick actions
    loadQuickActions();
  }

  function loadQuickActions() {
    const container = document.getElementById('chatQuickActions');
    const actions = [
      'How long for citizenship?',
      'What are the costs?',
      'Can my family apply?',
      'Do I need to live there?',
      'Is dual citizenship OK?',
      'Book a consultation'
    ];
    actions.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => sendMessage(text));
      container.appendChild(btn);
    });
  }

  function addMessage(text, role) {
    const msgs = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = `chat-message ${role}`;
    if (role === 'bot') {
      msg.innerHTML = `<div class="chat-avatar-small">PC</div><div class="chat-bubble">${text}</div>`;
    } else {
      msg.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
    }
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showTyping() {
    document.getElementById('chatTyping').classList.add('show');
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
  }

  function hideTyping() {
    document.getElementById('chatTyping').classList.remove('show');
  }

  async function sendMessage(text) {
    if (isProcessing || !text.trim()) return;

    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const msgText = text.trim();

    // Clear input and show user message
    input.value = '';
    addMessage(msgText, 'user');
    messageHistory.push({ role: 'user', content: msgText });

    // Show typing indicator
    isProcessing = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          history: messageHistory.slice(-20)
        })
      });

      const data = await res.json();
      hideTyping();

      if (data.reply) {
        addMessage(data.reply, 'bot');
        messageHistory.push({ role: 'assistant', content: data.reply });
      } else {
        addMessage('I apologize, but I encountered an issue. Please try again or contact our team at info@prioritycitizenship.vu.', 'bot');
      }
    } catch (err) {
      hideTyping();
      addMessage('I apologize, but I encountered a connection issue. Please try again or contact our team at info@prioritycitizenship.vu.', 'bot');
    }

    isProcessing = false;
    sendBtn.disabled = false;
    document.getElementById('chatInput').focus();
  }

  // Event listeners
  function initEvents() {
    const trigger = document.getElementById('chatTrigger');
    const widget = document.getElementById('chatWidget');
    const close = document.getElementById('chatClose');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');

    trigger.addEventListener('click', () => {
      const isOpen = widget.classList.contains('open');
      if (isOpen) {
        widget.classList.remove('open');
        trigger.classList.remove('active');
      } else {
        widget.classList.add('open');
        trigger.classList.add('active');
        input.focus();
        // Mark unread as read
        document.getElementById('chatUnread').classList.remove('show');
      }
    });

    close.addEventListener('click', () => {
      widget.classList.remove('open');
      trigger.classList.remove('active');
    });

    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage(input.value);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createWidget();
      initEvents();
    });
  } else {
    createWidget();
    initEvents();
  }
})();
