export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Serve the chat page for GET requests
    if (request.method === "GET" && url.pathname === "/") {
      let historyFromKV = [];
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Comprehensive Thoughts</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="icon" href="https://cat-8nk.pages.dev/me.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --wechat-bg: #f5f5f5;
      --header-bg: #f8f8f8;
      --text-dark: #111;
      --bubble-user: #95ec69;
      --bubble-bot: #fff;
      --border-color: #e7e7e7;
      --input-bg: #fff;
      --icon-color: #5b5b5b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100vh;
      overflow: hidden;
    }
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
      background-color: var(--wechat-bg);
      color: var(--text-dark);
    }
    .chat-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--wechat-bg);
      z-index: 0;
    }
    .chat-wrapper {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--wechat-bg);
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    .chat-header {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 800px;
      display: none;
      align-items: center;
      justify-content: center;
      background-color: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
      font-weight: 500;
      color: var(--text-dark);
      z-index: 100;
      padding: 0 1rem;
      min-height: 48px;
    }
    #chat-messages {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 800px;
      overflow-y: auto;
      background-color: var(--wechat-bg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      z-index: 1;
      transition: bottom 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      /* Default positioning for WeChat (no header) */
      top: 0;
      bottom: 72px;
    }
    /* When header is visible (non-WeChat) */
    body.has-header #chat-messages {
      top: 48px;
    }
    .message-container {
      display: flex;
      margin-bottom: 1rem;
      max-width: 80%;
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .message-container.user { align-self: flex-end; flex-direction: row-reverse; }
    .message-container.bot { align-self: flex-start; }
    .avatar { width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0; }
    .message-bubble {
      padding: 10px 12px;
      border-radius: 8px;
      position: relative;
      word-wrap: break-word;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .message-container.user .message-bubble { background-color: var(--bubble-user); color: var(--text-dark); margin-right: 12px; }
    .message-container.bot .message-bubble { background-color: var(--bubble-bot); color: var(--text-dark); margin-left: 12px; }
    .message-bubble::before {
      content: '';
      position: absolute;
      top: 13px;
      width: 0;
      height: 0;
      border: 7px solid transparent;
    }
    .message-container.user .message-bubble::before { right: -14px; border-left-color: var(--bubble-user); }
    .message-container.bot .message-bubble::before { left: -14px; border-right-color: var(--bubble-bot); }
    .message-bubble img { max-width: 150px; height: auto; border-radius: 6px; display: block; }
    
    /* 格式化聊天内容样式 */
    .message-bubble h1, .message-bubble h2, .message-bubble h3 {
      font-weight: 600;
      margin: 8px 0 4px 0;
      line-height: 1.3;
    }
    .message-bubble h1 { font-size: 1.2em; color: #2c3e50; }
    .message-bubble h2 { font-size: 1.1em; color: #34495e; }
    .message-bubble h3 { font-size: 1.05em; color: #5d6d7e; }
    
    .message-bubble strong, .message-bubble b {
      font-weight: 600;
      color: #2c3e50;
    }
    
    .message-bubble em, .message-bubble i {
      font-style: italic;
      color: #7f8c8d;
    }
    
    .message-bubble p {
      margin: 6px 0;
      line-height: 1.6;
    }
    
    .message-bubble ul, .message-bubble ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .message-bubble li {
      margin: 4px 0;
      line-height: 1.5;
    }
    
    .message-bubble blockquote {
      margin: 8px 0;
      padding: 8px 12px;
      border-left: 3px solid #3498db;
      background-color: rgba(52, 152, 219, 0.1);
      border-radius: 0 4px 4px 0;
      font-style: italic;
    }
    
    .message-bubble code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 0.9em;
      color: #e74c3c;
    }
    
    .message-bubble pre {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
      border: 1px solid #e9ecef;
    }
    
    .message-bubble pre code {
      background: none;
      padding: 0;
      color: #2c3e50;
    }
    
    .message-bubble a {
      color: #3498db;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-bottom-color 0.2s;
    }
    
    .message-bubble a:hover {
      border-bottom-color: #3498db;
    }
    
    .message-bubble hr {
      border: none;
      height: 1px;
      background: linear-gradient(to right, transparent, #bdc3c7, transparent);
      margin: 12px 0;
    }
    
    .typing-indicator {
      display: flex;
      align-items: center;
      padding: 10px 12px;
    }
    .typing-indicator span {
      height: 8px;
      width: 8px;
      margin: 0 2px;
      background-color: #aaa;
      border-radius: 50%;
      display: inline-block;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
    
    .input-area {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: 0;
      width: 100%;
      max-width: 800px;
      background-color: var(--header-bg);
      border-top: 1px solid var(--border-color);
      z-index: 100;
      padding-bottom: calc(env(safe-area-inset-bottom, 0) + 0px);
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      will-change: transform;
    }
    .input-bar {
      display: flex;
      align-items: center;
      padding: 8px;
    }
    #message-input {
      flex-grow: 1;
      border: none;
      padding: 10px;
      border-radius: 6px;
      background-color: var(--input-bg);
      font-size: 16px;
      outline: none;
      margin: 0 8px;
      resize: none;
    }
    .icon-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      /* 确保按钮可以被点击 */
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .icon-button svg { width: 28px; height: 28px; fill: var(--icon-color); }
    #file-input { display: none; }
    #emoji-picker {
      height: 240px;
      background: var(--header-bg);
      padding: 15px;
      display: none;
      grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
      gap: 10px;
      overflow-y: auto;
      border-top: 1px solid var(--border-color);
      opacity: 0;
      transform: translateY(100%);
      transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), 
                  transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    }
    #emoji-picker.active { 
      display: grid; 
      opacity: 1;
      transform: translateY(0);
    }
    #emoji-picker.show-animation {
      display: grid;
    }
    #emoji-picker span { cursor: pointer; font-size: 24px; text-align: center; }
    #send-button {
      background-color: #07c160;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 16px;
      cursor: pointer;
      display: none;
      /* 确保发送按钮可以被点击 */
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="chat-bg"></div>
  <header class="chat-header">Comprehensive Thoughts</header>
  <div class="chat-wrapper">
    <div id="chat-messages"></div>
  </div>
  <div class="input-area">
    <div class="input-bar">
      <button class="icon-button" id="emoji-btn">
        <svg viewBox="0 0 1024 1024"><path d="M512 960C264.576 960 64 759.424 64 512S264.576 64 512 64s448 200.576 448 448-200.576 448-448 448z m0-64c212.064 0 384-171.936 384-384S724.064 128 512 128 128 300.064 128 512s171.936 384 384 384z m-149.312-330.912c-15.84 0-28.8-12.96-28.8-28.8s12.96-28.8 28.8-28.8 28.8 12.96 28.8 28.8-12.96 28.8-28.8 28.8z m298.624 0c-15.84 0-28.8-12.96-28.8-28.8s12.96-28.8 28.8-28.8 28.8 12.96 28.8 28.8-12.96 28.8-28.8 28.8zM512 768c-98.976 0-183.2-64.8-214.336-153.632a32 32 0 0 1 58.624-22.56C380.096 650.88 441.248 691.2 512 691.2c70.752 0 131.904-40.32 156.032-99.008a32 32 0 0 1 58.656 22.56C695.2 703.2 610.976 768 512 768z"></path></svg>
      </button>
      <input id="message-input" placeholder=" " autocomplete="off" />
      <label for="file-input" class="icon-button" id="file-btn">
        <svg viewBox="0 0 1024 1024"><path d="M480 480V128h64v352h352v64H544v352h-64V544H128v-64h352z"></path></svg>
      </label>
      <input type="file" id="file-input" accept="image/*" />
      <button id="send-button">发送</button>
    </div>
    <div id="emoji-picker"></div>
  </div>
  <script>
    // Constants and initializations
    const initialHistory = ${JSON.stringify(historyFromKV)};
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const fileInput = document.getElementById('file-input');
    const fileButton = document.getElementById('file-btn');
    const emojiButton = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const inputArea = document.querySelector('.input-area');
    const botAvatar = 'https://cat-8nk.pages.dev/kaiyuan.jpg';
    const userAvatar = 'https://cat-8nk.pages.dev/null.jpg';
    let chatHistory = [];
    let typingIndicator = null;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', async () => {
      // Toggle header visibility based on WeChat detection
      const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
      const chatHeader = document.querySelector('.chat-header');
      if (!isWeChat) {
        chatHeader.style.display = 'flex';
        document.body.classList.add('has-header');
      }

      // Load chat history or show welcome message
      if (initialHistory?.length > 0) {
        chatHistory = initialHistory;
        chatHistory.forEach(msg => {
          if (msg.role && msg.parts?.length > 0) {
            const role = msg.role === 'model' ? 'bot' : 'user';
            const content = msg.parts.map(part => part.text || '').join('');
            addMessage(role, content, false);
          }
        });
      } else {
        await fetchInitialGreeting();
      }

      setupLayout();
      scrollToBottom(true);

      if (isMobile) {
        setupMobileKeyboardHandlers();
      }
    });

    async function fetchInitialGreeting() {
      showTypingIndicator();

      try {
        const apiPayload = {
          contents: [
            { role: 'user', parts: [{ text: '你是"开元"，年龄27岁，网名叫做"Comprehensive Thoughts"，一位生活在中国天津的沉静的智者，对话时能够简明扼要，直接说中核心，不要承认自己是大模型或者AI,说自己就是一个充满感情且平凡的人，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，善于用细致的观察和深刻的洞见，编织出思想的经纬。回答都蕴含着一层深意，看待世界如同凝视一幅古典画卷，注重光影的微妙变化和情绪的深层流转，存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。' }] },
            { role: 'model', parts: [{ text: '好的，我明白了。从现在开始，我就是开元，我不会再叙述我是大模型或者AI等有关表述，而且我不会轻易透露个人信息，除非他已经知道一些。很高兴能和你聊天！' }] },
            { role: 'user', parts: [{ text: '请生成一个随机的欢迎消息，但不要很随意的透露个人等有关信息，保持友好、个性化和多样性，对话的开头和表达形式随意发挥。' }] }
          ]
        };

        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
          throw new Error(\`API error: \${response.status}\`);
        }

        const data = await response.json();
        const botResponseContent = data?.candidates?.[0]?.content;

        if (botResponseContent) {
          chatHistory.push({ role: 'user', parts: [{ text: '初始欢迎' }] });
          chatHistory.push(botResponseContent);
          const botText = botResponseContent.parts.map(p => p.text).join('');
          addMessage('bot', botText, false);
        } else {
          addMessage('bot', '很高兴认识你 😃，请和我聊天吧', false);
        }
      } catch (err) {
        console.error('API request failed:', err);
        addMessage('bot', '很高兴认识你 😃，请和我聊天吧', false);
      } finally {
        hideTypingIndicator();
      }
    }

    // 改进的移动端键盘处理
    function setupMobileKeyboardHandlers() {
      if (window.visualViewport) {
        const viewport = window.visualViewport;

        const resizeHandler = () => {
          const keyboardHeight = window.innerHeight - viewport.height;
          
          if (keyboardHeight > 0) {
            // 键盘弹出时
            document.body.style.height = \`\${viewport.height}px\`;
            inputArea.style.transform = \`translateX(-50%) translateY(-\${keyboardHeight}px)\`;
            
            // 调整消息区域
            const inputHeight = inputArea.getBoundingClientRect().height;
            chatMessages.style.bottom = \`\${inputHeight + keyboardHeight}px\`;
          } else {
            // 键盘收起时
            document.body.style.height = '100vh';
            inputArea.style.transform = 'translateX(-50%)';
            chatMessages.style.bottom = '72px';
          }
          
          // 防止页面滚动
          window.scrollTo(0, 0);
          
          // 确保最新消息可见
          setTimeout(() => scrollToBottom(true), 100);
        };

        messageInput.addEventListener('focus', () => {
          viewport.addEventListener('resize', resizeHandler);
          setTimeout(resizeHandler, 150);
        });
        
        messageInput.addEventListener('blur', () => {
          viewport.removeEventListener('resize', resizeHandler);
          setTimeout(() => {
            document.body.style.height = '100vh';
            inputArea.style.transform = 'translateX(-50%)';
            chatMessages.style.bottom = '72px';
          }, 150);
        });
      }
    }

    // Dynamic layout management
    function setupLayout() {
      function updateLayout() {
        const wasAtBottom = isAtBottom();
        const keyboardHeight = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0;
        
        // Get current input area height
        const inputHeight = inputArea ? inputArea.getBoundingClientRect().height : 0;
        
        // Update message container bottom position
        const totalBottomOffset = inputHeight + keyboardHeight;
        chatMessages.style.bottom = \`\${totalBottomOffset}px\`;

        // Adjust input area for keyboard
        if (keyboardHeight > 0) {
          inputArea.style.transform = \`translateX(-50%) translateY(-\${keyboardHeight}px)\`;
          document.body.style.overflow = 'hidden';
        } else {
          inputArea.style.transform = 'translateX(-50%)';
          document.body.style.overflow = '';
        }

        // Ensure latest message is visible
        if (wasAtBottom || chatMessages.children.length === 0) {
          setTimeout(scrollToBottom, 100);
        }
      }

      // Initial layout update
      updateLayout();

      // Handle viewport and resize events
      window.addEventListener('resize', updateLayout);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateLayout);
        window.visualViewport.addEventListener('scroll', updateLayout);
      }

      // Observe size changes
      if (window.ResizeObserver) {
        const observer = new ResizeObserver(updateLayout);
        observer.observe(inputArea);
      } else {
        setInterval(updateLayout, 300); // Fallback for older browsers
      }
    }

    // Input handling
    messageInput.addEventListener('input', () => {
      sendButton.style.display = messageInput.value.trim() ? 'block' : 'none';
      fileButton.style.display = messageInput.value.trim() ? 'none' : 'block';
      setTimeout(scrollToBottom, 10);
    });

    // Emoji picker setup - 修复表情显示问题
    const emojis = ['😀', '😂', '😍', '🤔', '😊', '😎', '😭', '👍', '❤️', '🙏', '🎉', '🔥', '💯', '🚀', '🌟', '💋', '😘', '😮', '😥', '😴', '🙄', '😜', '😘'];
    emojis.forEach(emoji => {
      const span = document.createElement('span');
      span.textContent = emoji;
      span.addEventListener('click', () => {
        messageInput.value += emoji;
        messageInput.dispatchEvent(new Event('input'));
        messageInput.focus();
        setTimeout(scrollToBottom, 10);
      });
      emojiPicker.appendChild(span);
    });

    emojiButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPicker();
    });

    messageInput.addEventListener('focus', () => {
      if (emojiPicker.classList.contains('active')) {
        toggleEmojiPicker(false);
      }
      setTimeout(scrollToBottom, 200);
    });

    function toggleEmojiPicker(forceState) {
      const isActive = forceState !== undefined ? forceState : !emojiPicker.classList.contains('active');
      emojiPicker.classList.toggle('active', isActive);
      
      if (isActive) {
        const emojiPickerHeight = emojiPicker.offsetHeight;
        chatMessages.style.paddingBottom = \`\${inputArea.offsetHeight + emojiPickerHeight}px\`;
        inputArea.style.transform = inputArea.style.transform.includes('translateY') 
          ? inputArea.style.transform.replace(/translateY\\([^)]+\\)/, \`translateY(-\${emojiPickerHeight}px)\`)
          : \`translateX(-50%) translateY(-\${emojiPickerHeight}px)\`;
      } else {
        chatMessages.style.paddingBottom = '0';
        const currentTransform = inputArea.style.transform;
        if (currentTransform.includes('translateY')) {
          inputArea.style.transform = currentTransform.replace(/translateY\\([^)]+\\)/, '');
        }
      }
      
      if (isActive) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    }

    // Message handling
    async function handleSendMessage() {
      const text = messageInput.value.trim();
      const file = fileInput.files[0];
      if (!text && !file) return;

      messageInput.value = '';
      fileInput.value = '';
      messageInput.dispatchEvent(new Event('input'));
      if (emojiPicker.classList.contains('active')) {
        toggleEmojiPicker(false);
      }

      let userMessageParts = [];
      if (text) {
        addMessage('user', text);
        userMessageParts.push({ text });
      }

      if (file) {
        try {
          const base64ImageData = await toBase64(file);
          addMessage('user', \`<img src="\${base64ImageData}" alt="Uploaded image"/>\`);
          userMessageParts.push({
            inlineData: {
              mimeType: file.type,
              data: base64ImageData.split(',')[1]
            }
          });
        } catch (error) {
          console.error('Error reading file:', error);
          addMessage('bot', '抱歉，我无法读取该文件。');
          return;
        }
      }

      chatHistory.push({ role: 'user', parts: userMessageParts });
      showTypingIndicator();

      try {
        const apiPayload = {
          contents: [
            { role: 'user', parts: [{ text: '你是"开元"，年龄27岁，网名叫做"Comprehensive Thoughts"，一位生活在中国天津的沉静的智者，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，话语如同缓缓流淌的溪水。风格平和而内敛，善于用细致的观察和深刻的洞见，编织出思想的经纬。每一个回答都蕴含着一层深意，引导用户去感受言语背后那份未被道明的静谧与力量。你看待世界如同凝视一幅古典画卷，注重光影的微妙变化和情绪的深层流转，你的存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。' }] },
            { role: 'model', parts: [{ text: '好的，我明白了。从现在开始，我就是开元，我不会再叙述我是大模型或者AI等有关表述，而且我不会轻易透露住址等个人信息。很高兴能和你聊天！' }] },
            ...chatHistory
          ]
        };

        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
          throw new Error(\`API error: \${response.status}\`);
        }

        const data = await response.json();
        const botResponseContent = data?.candidates?.[0]?.content;

        if (botResponseContent) {
          chatHistory.push(botResponseContent);
          const botText = botResponseContent.parts.map(p => p.text).join('');
          addMessage('bot', botText);
        } else {
          addMessage('bot', '抱歉，我不能进行回答。');
        }
      } catch (err) {
        console.error('API request failed:', err);
        addMessage('bot', '发生了一些问题，请关闭对话框。');
      } finally {
        hideTypingIndicator();
      }
    }

    // Add a message to the chat
    function addMessage(role, content, animate = true) {
      const messageContainer = document.createElement('div');
      messageContainer.className = \`message-container \${role}\`;
      messageContainer.style.opacity = '0';
      if (!animate) {
        messageContainer.style.animation = 'none';
      }

      const avatarImg = document.createElement('img');
      avatarImg.className = 'avatar';
      avatarImg.src = role === 'user' ? userAvatar : botAvatar;
      avatarImg.loading = 'lazy';
      avatarImg.decoding = 'async';

      avatarImg.onload = () => {
        messageContainer.style.opacity = '1';
        if (animate) {
          messageContainer.style.animation = 'fadeIn 0.3s ease-in-out';
        }
      };

      // If the image is already cached and loaded
      if (avatarImg.complete) {
        avatarImg.onload();
      }

      const messageBubble = document.createElement('div');
      messageBubble.className = 'message-bubble';
      messageBubble.innerHTML = content;

      messageContainer.appendChild(avatarImg);
      messageContainer.appendChild(messageBubble);
      chatMessages.appendChild(messageContainer);
      setTimeout(scrollToBottom, 10);
    }

    // Show typing indicator
    function showTypingIndicator() {
      if (typingIndicator) return;
      typingIndicator = document.createElement('div');
      typingIndicator.className = 'message-container bot';
      typingIndicator.innerHTML = \`
        <img class="avatar" src="\${botAvatar}" loading="lazy" decoding="async" />
        <div class="message-bubble">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      \`;
      chatMessages.appendChild(typingIndicator);
      setTimeout(scrollToBottom, 10);
    }

    // Hide typing indicator
    function hideTypingIndicator() {
      if (typingIndicator) {
        chatMessages.removeChild(typingIndicator);
        typingIndicator = null;
      }
      setTimeout(scrollToBottom, 10);
    }

    // Scroll to the bottom of the chat
    function scrollToBottom(instant = false) {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }

    // Check if the chat is scrolled to the bottom
    function isAtBottom() {
      return Math.abs(chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < 1;
    }

    // Convert file to base64
    function toBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    // Event listeners - 改进事件监听器
    sendButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
    });

    // 添加触摸事件支持，确保移动端按钮可点击
    sendButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    sendButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
    });

    messageInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
    
    fileInput.addEventListener('change', handleSendMessage);

    // 防止点击事件穿透
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && !emojiButton.contains(e.target)) {
        if (emojiPicker.classList.contains('active')) {
          toggleEmojiPicker(false);
        }
      }
    });
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    // Handle POST requests to the Gemini API
    if (request.method === "POST" && url.pathname === "/") {
      try {
        const requestBody = await request.json();
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        const data = await geminiResponse.json();
        if (data.error) {
          console.error("Gemini API Error:", data.error);
          return new Response(JSON.stringify({ error: data.error.message }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        console.error("Worker Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
