/**
 * RAG Chatbot Widget
 * Lightweight, embeddable chat widget for any website.
 * Zero dependencies, WCAG 2.1 AA accessible, ~15KB.
 *
 * USAGE:
 *   <script>
 *     window.RAG_CHATBOT_CONFIG = {
 *       apiEndpoint: 'https://your-worker.your-account.workers.dev/chat',
 *       name: 'Your Name',
 *       greeting: 'Hi! Ask me anything about [Your Name].',
 *       suggestedQuestions: [
 *         "What's your background?",
 *         "What services do you offer?",
 *         "How can I get in touch?"
 *       ]
 *     };
 *   </script>
 *   <script src="chatbot-widget.js"></script>
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION — Override via window.RAG_CHATBOT_CONFIG
  // ============================================================================

  const CONFIG = {
    apiEndpoint: '',  // REQUIRED: Your Cloudflare Worker URL + /chat
    name: 'AI Assistant',
    position: 'bottom-right',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    bubbleSize: 60,
    spacing: 20,
    bottomSpacing: 20,
    desktopWidth: 400,
    desktopHeight: 600,
    greeting: 'Hi! I\'m an AI assistant. Ask me anything!',
    placeholder: 'Type your question...',
    suggestedQuestions: [
      "What can you tell me?",
      "What services are available?",
      "How can I get in touch?"
    ],
    bubbleLabel: 'AI Assistant',
    debug: false
  };

  if (window.RAG_CHATBOT_CONFIG) {
    Object.assign(CONFIG, window.RAG_CHATBOT_CONFIG);
  }

  if (!CONFIG.apiEndpoint) {
    console.error('[RAG Chatbot] apiEndpoint is required in RAG_CHATBOT_CONFIG');
    return;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function log(...args) {
    if (CONFIG.debug) console.log('[RAG Chatbot]', ...args);
  }

  let messageCount = 0;

  function getOrCreateSessionId() {
    const key = 'rag-chatbot-session-id';
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  }

  async function sendMessageToAPI(message, sessionId) {
    messageCount++;
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify({ message, messageNumber: messageCount }),
      signal: AbortSignal.timeout(15000)
    });

    if (response.status === 429) {
      const data = await response.json();
      throw { type: 'rate_limit', message: data.error, retryAfter: data.retryAfter };
    }

    if (!response.ok) {
      throw { type: 'api_error', message: 'Server error (' + response.status + ')' };
    }

    return await response.json();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // STYLES
  // ============================================================================

  function injectStyles() {
    if (document.getElementById('rag-chatbot-styles')) return;
    const style = document.createElement('style');
    style.id = 'rag-chatbot-styles';
    style.textContent = `
      .rag-chatbot-widget * { box-sizing: border-box; margin: 0; padding: 0; }

      .rag-chatbot-widget {
        position: fixed;
        ${CONFIG.position.includes('right') ? 'right' : 'left'}: ${CONFIG.spacing}px;
        bottom: ${CONFIG.bottomSpacing}px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-direction: ${CONFIG.position.includes('right') ? 'row-reverse' : 'row'};
      }

      .rag-chatbot-bubble-label {
        background: white;
        color: ${CONFIG.primaryColor};
        padding: 10px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        white-space: nowrap;
        opacity: 0;
        animation: rag-label-in 0.4s ease-out 0.5s forwards;
      }

      @keyframes rag-label-in {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .rag-chatbot-bubble {
        width: ${CONFIG.bubbleSize}px;
        height: ${CONFIG.bubbleSize}px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
      }

      .rag-chatbot-bubble:hover { background: ${CONFIG.secondaryColor}; transform: scale(1.05); }
      .rag-chatbot-bubble:active { transform: scale(0.95); }
      .rag-chatbot-bubble:focus { outline: 3px solid ${CONFIG.primaryColor}; outline-offset: 2px; }

      .rag-chatbot-bubble svg { width: 28px; height: 28px; fill: white; }

      .rag-chatbot-window {
        width: ${CONFIG.desktopWidth}px;
        height: ${CONFIG.desktopHeight}px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: rag-slide-up 0.3s cubic-bezier(0.4,0,0.2,1);
      }

      @keyframes rag-slide-up {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @media (max-width: 768px) {
        .rag-chatbot-window {
          width: 100vw; height: 100vh; height: 100dvh;
          border-radius: 0;
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        }
      }

      .rag-chatbot-header {
        background: ${CONFIG.primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .rag-chatbot-header h2 { font-size: 16px; font-weight: 600; margin: 0; }

      .rag-chatbot-close-btn {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        width: 44px; height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .rag-chatbot-close-btn:hover { background: rgba(255,255,255,0.2); }
      .rag-chatbot-close-btn:focus { outline: 2px solid white; outline-offset: 2px; }
      .rag-chatbot-close-btn svg { width: 20px; height: 20px; fill: white; }

      .rag-chatbot-messages {
        flex: 1; overflow-y: auto; padding: 16px;
        background: #f9fafb; scroll-behavior: smooth;
      }

      .rag-chatbot-greeting { text-align: center; color: #6b7280; padding: 40px 20px; }
      .rag-chatbot-greeting-text { font-size: 16px; margin-bottom: 24px; }

      .rag-chatbot-msg { margin-bottom: 16px; display: flex; animation: rag-msg-in 0.3s ease-out; }
      @keyframes rag-msg-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      .rag-chatbot-msg-user { justify-content: flex-end; }
      .rag-chatbot-msg-bot { justify-content: flex-start; }

      .rag-chatbot-msg-bubble {
        max-width: 80%; padding: 10px 14px;
        border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word;
      }

      .rag-chatbot-msg-user .rag-chatbot-msg-bubble {
        background: ${CONFIG.primaryColor}; color: white; border-bottom-right-radius: 4px;
      }

      .rag-chatbot-msg-bot .rag-chatbot-msg-bubble {
        background: white; color: #374151; border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }

      .rag-chatbot-msg-error .rag-chatbot-msg-bubble {
        background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
      }

      .rag-chatbot-typing {
        display: flex; align-items: center; gap: 4px;
        padding: 10px 14px; background: white; border-radius: 12px;
        border-bottom-left-radius: 4px; max-width: 60px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }

      .rag-chatbot-typing-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #9ca3af; animation: rag-bounce 1.4s infinite;
      }

      .rag-chatbot-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .rag-chatbot-typing-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes rag-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }

      .rag-chatbot-rate-limit {
        background: #fffbeb; border: 1px solid #fde68a;
        border-radius: 8px; padding: 12px; margin-bottom: 16px;
        font-size: 14px; color: #92400e;
      }

      .rag-chatbot-rate-limit strong { display: block; margin-bottom: 4px; }

      .rag-chatbot-suggestions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }

      .rag-chatbot-suggestion {
        background: white; border: 1px solid #e5e7eb; border-radius: 8px;
        padding: 14px 16px; min-height: 44px; text-align: left;
        cursor: pointer; transition: all 0.2s; font-size: 14px; color: #374151;
      }

      .rag-chatbot-suggestion:hover { background: #f3f4f6; border-color: ${CONFIG.primaryColor}; color: ${CONFIG.primaryColor}; }
      .rag-chatbot-suggestion:focus { outline: 2px solid ${CONFIG.primaryColor}; outline-offset: 2px; }

      .rag-chatbot-input-area {
        padding: 16px; background: white; border-top: 1px solid #e5e7eb; flex-shrink: 0;
      }

      .rag-chatbot-input-row { display: flex; gap: 8px; align-items: flex-end; }

      .rag-chatbot-input {
        flex: 1; border: 1px solid #d1d5db; border-radius: 8px;
        padding: 10px 12px; font-size: 14px; font-family: inherit;
        resize: none; min-height: 44px; max-height: 120px; line-height: 1.5;
        transition: border-color 0.2s;
      }

      .rag-chatbot-input:focus { outline: none; border-color: ${CONFIG.primaryColor}; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
      .rag-chatbot-input::placeholder { color: #9ca3af; }

      .rag-chatbot-send {
        background: ${CONFIG.primaryColor}; color: white; border: none;
        border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 500;
        cursor: pointer; transition: background 0.2s;
        min-width: 60px; height: 44px;
        display: flex; align-items: center; justify-content: center;
      }

      .rag-chatbot-send:hover:not(:disabled) { background: ${CONFIG.secondaryColor}; }
      .rag-chatbot-send:disabled { background: #d1d5db; cursor: not-allowed; opacity: 0.6; }
      .rag-chatbot-send:focus { outline: 2px solid ${CONFIG.primaryColor}; outline-offset: 2px; }

      .rag-chatbot-sr-only {
        position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
        overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================================
  // WIDGET
  // ============================================================================

  const Widget = (function() {
    let state = {
      isOpen: false,
      sessionId: getOrCreateSessionId(),
      messages: [],
      isTyping: false,
      rateLimitRetryAfter: null,
      initialized: false
    };

    let container = null;

    function setState(updates) {
      state = { ...state, ...updates };
      render();
    }

    function addMessage(sender, text) {
      setState({ messages: [...state.messages, { sender, text, ts: Date.now() }] });
      setTimeout(scrollToBottom, 100);
    }

    function scrollToBottom() {
      const el = container.querySelector('.rag-chatbot-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }

    function render() {
      if (!container) return;
      container.innerHTML = state.isOpen ? renderWindow() : renderBubble();
      attachEvents();
      if (state.isOpen && state.messages.length === 0) {
        setTimeout(() => {
          const input = container.querySelector('.rag-chatbot-input');
          if (input) input.focus();
        }, 100);
      }
    }

    function renderBubble() {
      return `
        <div class="rag-chatbot-bubble-label">${escapeHtml(CONFIG.bubbleLabel)}</div>
        <button class="rag-chatbot-bubble" aria-label="Open ${escapeHtml(CONFIG.name)} assistant" aria-expanded="false" role="button" tabindex="0">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg>
          <span class="rag-chatbot-sr-only">Click to open chat</span>
        </button>`;
    }

    function renderWindow() {
      const msgs = state.messages.length > 0
        ? state.messages.map(m => {
            const cls = m.sender === 'user' ? 'rag-chatbot-msg-user' : m.sender === 'error' ? 'rag-chatbot-msg-error' : 'rag-chatbot-msg-bot';
            return `<div class="rag-chatbot-msg ${cls}"><div class="rag-chatbot-msg-bubble">${escapeHtml(m.text)}</div></div>`;
          }).join('')
        : `<div class="rag-chatbot-greeting">
            <div class="rag-chatbot-greeting-text">${escapeHtml(CONFIG.greeting)}</div>
            <div class="rag-chatbot-suggestions">
              ${CONFIG.suggestedQuestions.map(q => `<button class="rag-chatbot-suggestion" data-q="${escapeHtml(q)}" aria-label="Ask: ${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
            </div>
          </div>`;

      const typing = state.isTyping
        ? `<div class="rag-chatbot-msg rag-chatbot-msg-bot"><div class="rag-chatbot-typing" aria-label="Typing"><div class="rag-chatbot-typing-dot"></div><div class="rag-chatbot-typing-dot"></div><div class="rag-chatbot-typing-dot"></div></div></div>`
        : '';

      const rateLimit = state.rateLimitRetryAfter
        ? `<div class="rag-chatbot-rate-limit"><strong>Rate Limit Reached</strong>Please try again in ${Math.ceil(state.rateLimitRetryAfter / 60)} minute(s).</div>`
        : '';

      return `
        <div class="rag-chatbot-window" role="dialog" aria-label="${escapeHtml(CONFIG.name)} Assistant" aria-modal="true">
          <div class="rag-chatbot-header">
            <h2>${escapeHtml(CONFIG.name)}</h2>
            <button class="rag-chatbot-close-btn" aria-label="Close chat">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="rag-chatbot-messages" role="log" aria-live="polite" aria-label="Conversation">
            ${rateLimit}${msgs}${typing}
          </div>
          <div class="rag-chatbot-input-area">
            <div class="rag-chatbot-input-row">
              <textarea class="rag-chatbot-input" placeholder="${escapeHtml(CONFIG.placeholder)}" rows="1" aria-label="Type your message" maxlength="500" autocomplete="off"></textarea>
              <button class="rag-chatbot-send" aria-label="Send message" disabled>Send</button>
            </div>
          </div>
        </div>`;
    }

    function attachEvents() {
      if (state.isOpen) {
        const closeBtn = container.querySelector('.rag-chatbot-close-btn');
        const input = container.querySelector('.rag-chatbot-input');
        const sendBtn = container.querySelector('.rag-chatbot-send');

        if (closeBtn) closeBtn.addEventListener('click', close);
        if (input) {
          input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            if (sendBtn) sendBtn.disabled = !input.value.trim();
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          });
        }
        if (sendBtn) sendBtn.addEventListener('click', handleSend);

        container.querySelectorAll('.rag-chatbot-suggestion').forEach(btn => {
          btn.addEventListener('click', () => handleSuggestion(btn.dataset.q));
        });

        document.addEventListener('keydown', handleEsc);
      } else {
        const bubble = container.querySelector('.rag-chatbot-bubble');
        if (bubble) {
          bubble.addEventListener('click', open);
          bubble.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
          });
        }
      }
    }

    async function handleSend() {
      const input = container.querySelector('.rag-chatbot-input');
      if (!input) return;
      const msg = input.value.trim();
      if (!msg) return;

      addMessage('user', msg);
      input.value = '';
      input.style.height = 'auto';
      const sendBtn = container.querySelector('.rag-chatbot-send');
      if (sendBtn) sendBtn.disabled = true;

      setState({ isTyping: true, rateLimitRetryAfter: null });

      try {
        const data = await sendMessageToAPI(msg, state.sessionId);
        setState({ isTyping: false });
        addMessage('bot', data.message);
      } catch (error) {
        setState({ isTyping: false });
        if (error.type === 'rate_limit') {
          setState({ rateLimitRetryAfter: error.retryAfter });
        } else {
          addMessage('error', error.message || 'Something went wrong. Please try again.');
        }
      }
    }

    async function handleSuggestion(question) {
      addMessage('user', question);
      setState({ isTyping: true, rateLimitRetryAfter: null });

      try {
        const data = await sendMessageToAPI(question, state.sessionId);
        setState({ isTyping: false });
        addMessage('bot', data.message);
      } catch (error) {
        setState({ isTyping: false });
        if (error.type === 'rate_limit') {
          setState({ rateLimitRetryAfter: error.retryAfter });
        } else {
          addMessage('error', error.message || 'Something went wrong. Please try again.');
        }
      }
    }

    function handleEsc(e) {
      if (e.key === 'Escape' && state.isOpen) close();
    }

    function open() {
      log('Opening');
      setState({ isOpen: true });
    }

    function close() {
      log('Closing');
      document.removeEventListener('keydown', handleEsc);
      setState({ isOpen: false });
    }

    function init() {
      if (state.initialized) return;
      injectStyles();
      container = document.createElement('div');
      container.className = 'rag-chatbot-widget';
      container.setAttribute('lang', 'en');
      document.body.appendChild(container);
      render();
      setState({ initialized: true });
      log('Initialized');
    }

    return { init, open, close };
  })();

  // ============================================================================
  // INIT
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Widget.init());
  } else {
    Widget.init();
  }

  if (CONFIG.debug) window.RAG_CHATBOT = Widget;
})();
