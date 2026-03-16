/* Richard Aceves AI Chatbot — Frontend Logic */

(function () {
  // ─── Dark Mode Toggle ───────────────────────────────────
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;
  let currentTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  html.setAttribute('data-theme', currentTheme);

  function updateToggleIcon() {
    if (!themeToggle) return;
    themeToggle.setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
    themeToggle.innerHTML = currentTheme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
  updateToggleIcon();
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', currentTheme);
      updateToggleIcon();
    });
  }

  // ─── Chat State ──────────────────────────────────────────
  const messagesContainer = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearChat');
  const suggestedPrompts = document.getElementById('suggestedPrompts');
  const promptChips = document.querySelectorAll('.prompt-chip');
  const embedCode = document.getElementById('embedCode');
  const copyBtn = document.getElementById('copyEmbed');

  let conversationHistory = [];
  let isStreaming = false;

  // Update embed code with current URL
  if (embedCode) {
    const siteUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    embedCode.querySelector('code').textContent = `<script src="${siteUrl}widget.js"><\/script>`;
  }

  // ─── Welcome Message ─────────────────────────────────────
  function addWelcomeMessage() {
    const welcomeText = `Hey, I'm Richard — thanks for stopping by. Whether you're dealing with nagging pain, want to move better, or just curious about sandbag training or breathwork, I'm here to help.\n\nWhat's going on with your body today?`;
    addMessage('assistant', welcomeText);
  }

  // ─── Message Rendering ───────────────────────────────────
  function parseMarkdown(text) {
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^(?:•|-)\s+(.*)/gm, '<ul-li>$1</ul-li>')
      .replace(/^\d+\.\s+(.*)/gm, '<ol-li>$1</ol-li>')
      .replace(/((?:<ul-li>.*<\/ul-li>\n?)+)/g, match =>
        '<ul>' + match.replace(/<\/?ul-li>/g, m => m === '<ul-li>' ? '<li>' : '</li>') + '</ul>'
      )
      .replace(/((?:<ol-li>.*<\/ol-li>\n?)+)/g, match =>
        '<ol>' + match.replace(/<\/?ol-li>/g, m => m === '<ol-li>' ? '<li>' : '</li>') + '</ol>'
      )
      .split('\n\n')
      .map(para => para.trim())
      .filter(p => p)
      .map(para => (para.startsWith('<ul>') || para.startsWith('<ol>')) ? para : `<p>${para}</p>`)
      .join('');
  }

  function addMessage(role, text, isStreaming = false) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', role);
    if (isStreaming) messageEl.id = 'streaming-message';

    const avatarEl = document.createElement(role === 'assistant' ? 'img' : 'div');
    if (role === 'assistant') {
      avatarEl.src = './assets/avatar.jpg';
      avatarEl.alt = 'Richard Aceves';
      avatarEl.className = 'msg-avatar';
      avatarEl.onerror = function() {
        const div = document.createElement('div');
        div.className = 'msg-avatar';
        div.style.cssText = 'background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:var(--text-sm);';
        div.textContent = 'R';
        this.replaceWith(div);
      };
    } else {
      avatarEl.className = 'msg-avatar-user';
      avatarEl.textContent = 'You';
    }

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'msg-bubble';
    bubbleEl.innerHTML = role === 'assistant' ? parseMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br>');

    messageEl.appendChild(avatarEl);
    messageEl.appendChild(bubbleEl);
    messagesContainer.appendChild(messageEl);
    scrollToBottom();

    return { messageEl, bubbleEl };
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('message', 'assistant', 'typing-indicator');
    indicator.id = 'typing-indicator';

    const avatarEl = document.createElement('img');
    avatarEl.src = './assets/avatar.jpg';
    avatarEl.alt = 'Richard';
    avatarEl.className = 'msg-avatar';
    avatarEl.onerror = function () {
      const div = document.createElement('div');
      div.className = 'msg-avatar';
      div.style.cssText = 'background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:var(--text-sm);';
      div.textContent = 'R';
      this.replaceWith(div);
    };

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'msg-bubble';
    bubbleEl.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';

    indicator.appendChild(avatarEl);
    indicator.appendChild(bubbleEl);
    messagesContainer.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ─── Send Message ─────────────────────────────────────────
  async function sendMessage(userText) {
    if (!userText.trim() || isStreaming) return;

    isStreaming = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    // Hide suggested prompts after first message
    if (suggestedPrompts) suggestedPrompts.style.display = 'none';

    // Add user message
    addMessage('user', userText.trim());
    conversationHistory.push({ role: 'user', content: userText.trim() });

    // Show typing indicator
    addTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      removeTypingIndicator();

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sseBuffer = '';

      // Create streaming bubble
      const { bubbleEl } = addMessage('assistant', '', true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                bubbleEl.innerHTML = parseMarkdown(fullText);
                scrollToBottom();
              }
            } catch {}
          }
        }
      }

      // Remove streaming ID
      const streamingMsg = document.getElementById('streaming-message');
      if (streamingMsg) streamingMsg.removeAttribute('id');

      // Save to history
      conversationHistory.push({ role: 'assistant', content: fullText });

    } catch (err) {
      removeTypingIndicator();
      addMessage('assistant', "Sorry, I'm having trouble connecting right now. Please try again in a moment.");
      console.error('Chat error:', err);
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  // ─── Form Submit ──────────────────────────────────────────
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendMessage(text);
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  });

  // Shift+Enter for newlines, Enter to send
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // ─── Suggested Prompts ────────────────────────────────────
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      chatInput.value = text;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // ─── Clear Chat ───────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    conversationHistory = [];
    messagesContainer.innerHTML = '';
    if (suggestedPrompts) suggestedPrompts.style.display = '';
    addWelcomeMessage();
  });

  // ─── Copy Embed ───────────────────────────────────────────
  if (copyBtn && embedCode) {
    copyBtn.addEventListener('click', () => {
      const text = embedCode.querySelector('code').textContent;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
        }, 2000);
      });
    });
  }

  // ─── Smooth scroll CTA ────────────────────────────────────
  document.querySelectorAll('a[href="#chatbot"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('chatbot').scrollIntoView({ behavior: 'smooth' });
      chatInput.focus();
    });
  });

  // ─── Init ─────────────────────────────────────────────────
  addWelcomeMessage();

})();
