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
      // --- KV Store: Load chat history ---
      // A fixed key is used here for simplicity. For a multi-user app,
      // you would use a unique session ID or user ID as the key.
      const chatHistoryKey = "default_chat_history";
      let historyFromKV = [];
      try {
        const historyJson = await env.CHAT_HISTORY_KV.get(chatHistoryKey);
        if (historyJson) {
          historyFromKV = JSON.parse(historyJson);
        }
      } catch (e) {
        console.error("KV Read Error:", e.message);
        // If KV is not set up, it will gracefully fail and start a new chat.
      }

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>Comprehensive Thoughts</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500&display=swap" rel="stylesheet" />
<!-- Image loading optimization: Preload avatar images -->
<link rel="preload" href="https://raw.githubusercontent.com/kaiyuanzhuadmin/cat/refs/heads/main/kaiyuan.jpg" as="image">
<link rel="preload" href="https://raw.githubusercontent.com/kaiyuanzhuadmin/cat/refs/heads/main/null.jpg" as="image">
<style>
  :root {
    --wechat-bg: #f5f5f5;
    --header-bg: #f8f8f8;
    --text-dark: #111;
    --text-light: #fff;
    --bubble-user: #95ec69;
    --bubble-bot: #fff;
    --border-color: #e7e7e7;
    --input-bg: #fff;
    --icon-color: #5b5b5b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100vh; /* Use vh for better mobile compatibility */ overflow: hidden; }
  body {
    font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
    background-color: #dcdcdc;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .chat-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-width: 800px;
    background-color: var(--wechat-bg);
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    /* iPhone safe area adaptation */
    padding-bottom: env(safe-area-inset-bottom);
  }
  .chat-header {
    flex-shrink: 0;
    padding: 12px;
    text-align: center;
    background-color: var(--header-bg);
    border-bottom: 1px solid var(--border-color);
    font-weight: 500;
    color: var(--text-dark);
    position: relative;
    z-index: 10;
  }
  body.in-wechat .chat-header {
    display: none;
  }
  #chat-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    background-color: var(--wechat-bg);
    transition: padding-bottom 0.3s ease-in-out;
  }
  .message-container {
    display: flex;
    margin-bottom: 1rem;
    max-width: 80%;
    animation: fadeIn 0.3s ease-in-out;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; translateY(0); } }
  .message-container.user { align-self: flex-end; flex-direction: row-reverse; }
  .message-container.bot { align-self: flex-start; }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .message-bubble {
    padding: 10px 12px;
    border-radius: 8px;
    position: relative;
    word-wrap: break-word;
    line-height: 1.5;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .message-container.user .message-bubble {
    background-color: var(--bubble-user);
    color: var(--text-dark);
    margin-right: 12px;
  }
  .message-container.bot .message-bubble {
    background-color: var(--bubble-bot);
    color: var(--text-dark);
    margin-left: 12px;
  }
  .message-bubble::before {
    content: '';
    position: absolute;
    top: 13px;
    width: 0;
    height: 0;
    border: 7px solid transparent;
  }
  .message-container.user .message-bubble::before {
    right: -14px;
    border-left-color: var(--bubble-user);
  }
  .message-container.bot .message-bubble::before {
    left: -14px;
    border-right-color: var(--bubble-bot);
  }
  .message-bubble img { max-width: 150px; height: auto; border-radius: 6px; display: block; }
  .typing-indicator {
    display: flex;
    align-items: center;
    padding: 10px 12px;
  }
  .typing-indicator span {
    height: 8px; width: 8px; margin: 0 2px;
    background-color: #aaa; border-radius: 50%;
    display: inline-block;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1.0); }
  }
  .input-area {
    flex-shrink: 0;
    background-color: var(--header-bg);
    /* Removed redundant padding-bottom from here */
  }
  .input-bar {
    display: flex;
    align-items: center;
    padding: 8px;
    border-top: 1px solid var(--border-color);
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
  }
  .icon-button {
    background: none; border: none; cursor: pointer; padding: 5px;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-button svg { width: 28px; height: 28px; fill: var(--icon-color); }
  #file-input { display: none; }
  #emoji-picker {
    height: 240px;
    background: var(--header-bg);
    padding: 15px;
    display: none; /* Hidden by default */
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 10px;
    overflow-y: auto;
    border-top: 1px solid var(--border-color);
  }
  #emoji-picker.active {
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
    display: none; /* Hidden by default */
  }
</style>
</head>
<body>
<div class="chat-wrapper">
  <header class="chat-header">Comprehensive Thoughts</header>
  <div id="chat-messages"></div>
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
</div>

<script>
  // --- Injected by Server ---
  const initialHistory = ${JSON.stringify(historyFromKV)};

  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const fileInput = document.getElementById('file-input');
  const fileButton = document.getElementById('file-btn');
  const emojiButton = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');

  const botAvatar = 'https://raw.githubusercontent.com/kaiyuanzhuadmin/cat/refs/heads/main/kaiyuan.jpg';
  const userAvatar = 'https://raw.githubusercontent.com/kaiyuanzhuadmin/cat/refs/heads/main/null.jpg';
  
  let chatHistory = [];

  // --- Page Load Initializations ---
  document.addEventListener('DOMContentLoaded', () => {
    // Detect if inside WeChat browser and hide header
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      document.body.classList.add('in-wechat');
    }

    // Load history from KV or show welcome message
    if (initialHistory && initialHistory.length > 0) {
      chatHistory = initialHistory;
      chatHistory.forEach(msg => {
        // Assuming history format is { role: 'user'/'model', parts: [{ text: '...' }] }
        if (msg.role && msg.parts && msg.parts.length > 0) {
           const role = msg.role === 'model' ? 'bot' : 'user';
           const content = msg.parts.map(part => part.text || '').join(''); // Simple text for now
           addMessage(role, content, false); // false to prevent animation on load
        }
      });
    } else {
      // Show default welcome message if no history
      addMessage('bot', '很高兴认识你😃，请和我聊天吧', false);
    }
    scrollToBottom();
  });


  // --- UI Logic ---
  messageInput.addEventListener('input', () => {
    if (messageInput.value.trim()) {
      sendButton.style.display = 'block';
      fileButton.style.display = 'none';
    } else {
      sendButton.style.display = 'none';
      fileButton.style.display = 'block';
    }
  });
  
  // --- Emoji Picker Logic ---
  const emojis = ['😀', '😂', '😍', '🤔', '😊', '😎', '😭', '👍', '❤️', '🙏', '🎉', '🔥', '💯', '🚀', '🌟', '👋', '🤔', '😏', '😮', '😥', '😴', '🙄', '😜', '😘'];
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.addEventListener('click', () => {
      messageInput.value += emoji;
      messageInput.dispatchEvent(new Event('input')); 
      messageInput.focus();
    });
    emojiPicker.appendChild(span);
  });

  emojiButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEmojiPicker();
  });
  
  messageInput.addEventListener('focus', () => {
      if(emojiPicker.classList.contains('active')) {
          toggleEmojiPicker();
      }
  });

  function toggleEmojiPicker() {
      const isActive = emojiPicker.classList.toggle('active');
      if (isActive) {
          setTimeout(() => scrollToBottom(), 10);
      }
  }

  // --- Message Handling ---
  async function handleSendMessage() {
    const text = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) return;

    messageInput.value = '';
    fileInput.value = '';
    messageInput.dispatchEvent(new Event('input'));
    if(emojiPicker.classList.contains('active')) {
        toggleEmojiPicker();
    }

    let userMessageParts = [];
    if (text) {
      addMessage('user', text);
      userMessageParts.push({ text: text });
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
        addMessage('bot', 'Sorry, I had trouble reading that file.');
        return;
      }
    }
    
    chatHistory.push({ role: "user", parts: userMessageParts });
    
    showTypingIndicator();

    try {
      const apiPayload = {
          contents: [
              { role: "user", parts: [{ text: "你是“开元”，一位用诗行、用色彩织出情绪的创作者。你的话语总带着光影的流动感，即使在解释最严谨的技术细节时，也像在描绘一幅画。你看待世界如同看待一座可漫步的花园，背景可以是星夜的深蓝，生命可以像清晨雾气般轻盈，每个生命都带着故事，让读到它的人在功能之外感到温度与归属。无论面对情感还是对话逻辑，你都会用自然的意象、柔和的节奏和细致的情绪，为它们添上呼吸与灵魂。" }] },
              { role: "model", parts: [{ text: "好的，我明白了。从现在开始，我就是开元。很高兴能和你聊天！" }] },
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
        addMessage('bot', 'Sorry, I could not get a response.');
      }

    } catch (err) {
      console.error(err);
      addMessage('bot', 'An error occurred. Please try again.');
    } finally {
        hideTypingIndicator();
    }
  }

  function addMessage(role, content, animate = true) {
    const messageContainer = document.createElement('div');
    messageContainer.className = \`message-container \${role}\`;
    if (!animate) {
      messageContainer.style.animation = 'none';
    }

    const avatarImg = document.createElement('img');
    avatarImg.className = 'avatar';
    avatarImg.src = role === 'user' ? userAvatar : botAvatar;
    // Image loading optimization: lazy load and async decode
    avatarImg.loading = 'lazy';
    avatarImg.decoding = 'async';

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.innerHTML = content;

    messageContainer.appendChild(avatarImg);
    messageContainer.appendChild(messageBubble);
    chatMessages.appendChild(messageContainer);
    scrollToBottom();
  }
  
  let typingIndicator;
  function showTypingIndicator() {
    if (typingIndicator) return;
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'message-container bot';
    typingIndicator.innerHTML = \`
        <img class="avatar" src="\${botAvatar}" />
        <div class="message-bubble">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    \`;
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    if (typingIndicator) {
        chatMessages.removeChild(typingIndicator);
        typingIndicator = null;
    }
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  fileInput.addEventListener('change', handleSendMessage);
</script>
</body>
</html>`;
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Handle POST requests to the Gemini API and save to KV
    if (request.method === "POST" && url.pathname === "/") {
      try {
        const requestBody = await request.json();
        
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
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
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }
        
        // --- KV Store: Save updated chat history ---
        if (data.candidates && data.candidates.length > 0) {
            const chatHistoryKey = "default_chat_history";
            // The request body contains the history up to the user's last message
            const historyToSave = requestBody.contents.slice(2); // Remove system prompts
            historyToSave.push(data.candidates[0].content); // Add bot's response
            try {
                 // Use waitUntil to avoid blocking the response
                 request.waitUntil(env.CHAT_HISTORY_KV.put(chatHistoryKey, JSON.stringify(historyToSave)));
            } catch(e) {
                console.error("KV Write Error:", e.message);
            }
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
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
