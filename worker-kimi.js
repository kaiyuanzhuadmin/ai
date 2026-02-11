export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- CORS Preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // --- Serve Chat UI ---
    if (request.method === "GET" && url.pathname === "/") {
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Comprehensive Thoughts</title>
  <link rel="icon" href="https://cat-8nk.pages.dev/me.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" as="style" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root{
      /* Messenger / Facebook palette */
      --fb-bg: #f0f2f5;
      --fb-header-bg:#ffffff;
      --fb-text-dark:#1c1e21;
      --fb-border:#dcdfe3;
      --fb-input-bg:#ffffff;
      --fb-accent:#0084ff;
      --fb-accent-pressed:#0074e6;
      --bubble-user:#0084ff;    /* my message (right, white text) */
      --bubble-user-text:#ffffff;
      --bubble-bot:#e4e6eb;     /* other message (left, dark text) */
      --bubble-bot-text:#050505;
      --shadow: 0 8px 24px rgba(0,0,0,.08);
      --radius: 18px;
      --rec-red: #ea4335;
    }
    /* 视口底部白色垫片，覆盖安全区，防止露出 body 灰底 */
    body::after{
      content:"";
      position: fixed;
      left: 0; right: 0; bottom: 0;
      height: env(safe-area-inset-bottom, 0);
      background: var(--fb-header-bg); /* 与输入区同色的白色 */
      pointer-events: none;
      z-index: 90; /* 低于 .input-area(120)，高于 body 背景 */
    }
    
    *{box-sizing:border-box;margin:0;padding:0}
    html, body { height: 100vh; overflow: hidden; background: var(--fb-bg); }
    body {
      font-family: "Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;
      color: var(--fb-text-dark);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overscroll-behavior: none;
    }

    .app {
      position: relative;
      max-width: 860px;
      margin: 0 auto;
      height: 100%;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    /* Header (fixed) */
    .chat-header {
      display: none; /* Hidden by default, shown via JS */
      position: fixed; top: 0; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 860px; z-index: 100;
      height: 56px; background: var(--fb-header-bg); border-bottom: 1px solid var(--fb-border);
      align-items: center; justify-content: center;
      font-weight: 600;
      font-size: 18px;
    }

    /* Messages scroll area (fixed between header and input) */
    #chat-messages{
      position: fixed; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 860px; top: 0; bottom: 76px; /* Top is 0 by default */
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 16px 16px 24px;
      display:flex; flex-direction:column; gap: 12px;
      scroll-behavior: smooth; overscroll-behavior: contain;
      background: var(--fb-bg);
      transition: bottom .25s ease, padding-bottom .2s ease, top .2s ease;
    }

    .message{
      display:flex; gap:10px; max-width: 85%;
      animation: fadeIn .2s ease;
    }
    .message.user{ align-self:flex-end; flex-direction: row-reverse; }
    .message .avatar{
      width: 36px; height:36px; border-radius: 8px; flex: 0 0 36px; object-fit: cover;
      box-shadow: var(--shadow);
    }
    .bubble{
      border-radius: var(--radius);
      padding: 10px 12px;
      line-height: 1.55; box-shadow: 0 1px 1px rgba(0,0,0,.04);
      word-break: break-word; white-space: pre-wrap;
      position: relative;
    }
    .message.user .bubble{
      background: var(--bubble-user); color: var(--bubble-user-text);
      border-top-right-radius: 6px;
    }
    .message.bot .bubble{
      background: var(--bubble-bot); color: var(--bubble-bot-text);
      border-top-left-radius: 6px;
    }
    .bubble img{ max-width: 220px; height:auto; border-radius:12px; box-shadow: var(--shadow); display:block }
    
    /* Audio Player in Bubble */
    .bubble audio {
        height: 32px;
        max-width: 200px;
        outline: none;
        margin-top: 4px;
    }
    /* Simple custom audio visualization/placeholder */
    .audio-msg { display: flex; align-items: center; gap: 6px; }
    .audio-msg svg { width: 20px; height: 20px; fill: currentColor; }

    @keyframes fadeIn{ from{opacity:.0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }

    /* Typing indicator */
    .typing { display:flex; gap:10px; align-items:flex-end; }
    .typing.user { align-self: flex-end; flex-direction: row-reverse; }
    .typing .avatar {
      animation: pulse 1.5s infinite ease-in-out;
    }
    .typing .dots{
      border-radius: var(--radius);
      padding: 10px 12px;
      box-shadow: 0 1px 1px rgba(0,0,0,.04);
    }
    .typing.bot .dots { background: var(--bubble-bot); }
    .typing.user .dots { background: var(--bubble-user); }

    .typing .dot{ display:inline-block; width:7px; height:7px; margin:0 2px; border-radius:50%; animation: b 1.2s infinite ease-in-out }
    .typing.bot .dot { background:#999; }
    .typing.user .dot { background:rgba(255,255,255,0.7); }
    .typing .dot:nth-child(1){ animation-delay:-.24s }
    .typing .dot:nth-child(2){ animation-delay:-.12s }
    @keyframes b{ 0%,80%,100%{ transform:scale(0)} 40%{ transform:scale(1)} }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    /* Input area (fixed) */
    .input-area{
      position: fixed; left: 50%; transform: translateX(-50%);
      bottom: 0; width: 100%; max-width: 860px;
      background: var(--fb-header-bg); border-top:1px solid var(--fb-border);
      z-index: 120; transition: transform .2s ease;
      padding-bottom: calc(env(safe-area-inset-bottom, 0));
      will-change: transform;
      touch-action: none; -webkit-user-select: none; user-select: none;
    }
    .bar{ display:flex; align-items:center; gap:8px; padding: 8px 10px; }
    .btn{ background:none; border:none; cursor:pointer; padding:6px; border-radius:10px; -webkit-tap-highlight-color: transparent; display: flex; align-items: center; justify-content: center;}
    .btn:active{ background: rgba(0,0,0,.06); }
    .btn svg{ width:26px; height:26px; fill:#606770 }
    
    /* Send & Mic Buttons */
    #send-btn, #mic-btn { display:none; border:none; border-radius: 10px; padding: 6px; cursor: pointer; }
    
    #send-btn { background: none; }
    #send-btn svg { fill: var(--fb-accent); }
    
    #mic-btn { background: none; }
    #mic-btn svg { fill: var(--fb-accent); }
    #mic-btn.recording svg { fill: var(--rec-red); transform: scale(1.1); transition: 0.2s; }
    
    #file{ display:none }

    #input{
      flex:1; border:1px solid var(--fb-border); background: var(--fb-input-bg);
      border-radius: 14px; padding: 10px 12px; font-size:16px; outline:none;
      min-height: 40px;
    }

    /* Recording Overlay */
    .recording-overlay {
      position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
      background: var(--rec-red); color: white;
      padding: 8px 16px; border-radius: 20px;
      font-weight: 600; font-size: 14px;
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
      box-shadow: 0 4px 12px rgba(234, 67, 53, 0.3);
      display: flex; align-items: center; gap: 8px;
    }
    .recording-overlay.active { opacity: 1; top: -70px; }
    .rec-dot { width: 8px; height: 8px; background: white; border-radius: 50%; animation: blink 1s infinite; }
    @keyframes blink { 50% { opacity: 0.4; } }

    /* Emoji panel */
    #emoji{
      height: 260px; display:none; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
      gap: 8px; padding: 12px; border-top:1px solid var(--fb-border); background: var(--fb-header-bg);
      transform: translateY(100%); opacity: 0; transition: transform .2s ease, opacity .2s ease;
    }
    #emoji.active{ display:grid; transform: translateY(0); opacity:1; }
    #emoji span{ font-size: 24px; text-align:center; cursor:pointer }

    /* Links / code in bubbles */
    .bubble a{ color:#0064d1; text-decoration:none; border-bottom:1px solid transparent }
    .bubble a:hover{ border-bottom-color:#0064d1 }
    .bubble code{ background:#f6f7f9; padding:2px 4px; border-radius:6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
    .bubble pre{ background:#f6f7f9; border:1px solid #eaebee; border-radius:12px; padding:10px; overflow:auto }

    @supports (height: 100dvh){
      html, body{ height: 100dvh; }
    }
    </style>
</head>
<body>
  <div class="app">
    <header class="chat-header">Comprehensive Thoughts</header>

    <main id="chat-messages" aria-live="polite"></main>

    <section class="input-area" aria-label="message composer">
      <!-- Recording Overlay -->
      <div class="recording-overlay" id="rec-overlay">
        <div class="rec-dot"></div>
        再次点击麦克风发送
      </div>

      <div class="bar">
        <button class="btn" id="emoji-btn" aria-label="emoji">
          <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-3.5 7.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm7 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm-7.657 6.036a.75.75 0 0 1 1.04-.206A5.74 5.74 0 0 0 12 16.75c1.054 0 2.05-.28 2.917-.82a.75.75 0 1 1 .833 1.247A7.24 7.24 0 0 1 12 18.25a7.24 7.24 0 0 1-3.75-1.073.75.75 0 0 1-.407-.89Z"/></svg>
        </button>

        <input id="input" placeholder="给他发消息…" autocomplete="off" />

        <label for="file" class="btn" id="file-btn" aria-label="upload">
          <svg viewBox="0 0 24 24"><path d="M13 7.828V17a1 1 0 1 1-2 0V7.828L8.464 10.364a1 1 0 1 1-1.414-1.414l4.243-4.243a1.5 1.5 0 0 1 2.121 0l4.243 4.243a1 1 0 1 1-1.414 1.414L13 7.828Z"/><path d="M5 15a1 1 0 0 1 2 0v2h10v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2Z"/></svg>
        </label>
        <input type="file" id="file" accept="image/*" />

        <!-- Microphone Button (Press and Hold) -->
        <button id="mic-btn" class="btn" aria-label="voice message">
           <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>

        <!-- Send Button -->
        <button id="send-btn" class="btn" aria-label="send">
           <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="emoji" role="dialog" aria-label="emoji picker"></div>
    </section>
  </div>

<script>
/* ===== Constants ===== */
const chat = document.getElementById('chat-messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const fileInput = document.getElementById('file');
const fileBtn = document.getElementById('file-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji');
const inputArea = document.querySelector('.input-area');
const header = document.querySelector('.chat-header');
const recOverlay = document.getElementById('rec-overlay');

const botAvatar = 'https://cat-8nk.pages.dev/kaiyuan.png';
const userAvatar = 'https://cat-8nk.pages.dev/null.png';

let chatHistory = [];
let botTypingNode = null;
let userTypingNode = null;

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

/* ===== Audio Recording State ===== */
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  preloadAvatars();
  if (!isWeChat) {
    header.style.display = 'flex';
    chat.style.top = header.offsetHeight + 'px';
  }

  // MODIFIED: Start with a simple greeting instead of simulation
  setTimeout(sendGreeting, 800);

  setupLayoutSync();
  scrollToBottom(true);
  setupIOSKeyboardGuards();
  buildEmojiPanel();
  toggleInputButtons(); // Init button state
  setupAudioLogic();    // Init voice logic
});

/* ===== Audio Recording Logic ===== */
function setupAudioLogic() {
  // Mouse events
  micBtn.addEventListener('mousedown', startRecording);
  micBtn.addEventListener('mouseup', stopRecording);
  micBtn.addEventListener('mouseleave', cancelRecording); // Slide away cancels

  // Touch events
  micBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent ghost clicks
    startRecording();
  });
  micBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
  });
}

async function startRecording() {
  if (isRecording) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose mime type (Safari supports mp4, Chrome supports webm)
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'; // Fallback for Safari
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser decide default
        }
    }

    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();
    isRecording = true;
    
    // UI Updates
    micBtn.classList.add('recording');
    recOverlay.classList.add('active');
    
  } catch (err) {
    console.error('Mic access denied:', err);
    alert('无法访问麦克风，请检查权限设置。');
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    
    // Stop tracks to release mic
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    if (audioBlob.size > 0) {
      await submitAudio(audioBlob);
    }
    
    resetAudioState();
  };

  mediaRecorder.stop();
}

function cancelRecording() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  resetAudioState();
}

function resetAudioState() {
  isRecording = false;
  mediaRecorder = null;
  audioChunks = [];
  micBtn.classList.remove('recording');
  recOverlay.classList.remove('active');
}

/* ===== iOS Keyboard & Viewport Sync ===== */
function setupIOSKeyboardGuards(){
  if (!isIOS) return;
  const vv = window.visualViewport;
  const apply = () => {
    const kb = vv ? (window.innerHeight - vv.height) : 0;
    const inputH = inputArea.getBoundingClientRect().height;
    chat.style.bottom = (inputH + kb) + 'px';

    if (kb > 0){
      inputArea.style.transform = 'translateX(-50%) translateY('+ (-kb) +'px)';
      document.body.style.height = (vv.height) + 'px';
      document.body.style.overflow = 'hidden';
    }else{
      inputArea.style.transform = 'translateX(-50%)';
      document.body.style.height = '';
      document.body.style.overflow = '';
    }

    if (isAtBottom()) {
      requestAnimationFrame(() => scrollToBottom(true));
    }
    window.scrollTo(0,0);
  };
  apply();
  window.addEventListener('resize', apply, {passive:true});
  if (vv){
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
  }
  input.addEventListener('focus', ()=>{
    if (emojiPanel.classList.contains('active')) toggleEmoji(false);
    setTimeout(apply, 120);
    setTimeout(()=>scrollToBottom(true), 280);
  });
  input.addEventListener('blur', ()=>{
    setTimeout(apply, 120);
  });
}

function setupLayoutSync(){
  function update(){
    const inputH = inputArea.getBoundingClientRect().height;
    chat.style.bottom = (inputH) + 'px';
  }
  update();
  window.addEventListener('resize', update, {passive:true});
  if (window.ResizeObserver){
    new ResizeObserver(update).observe(inputArea);
  }else{
    setInterval(update, 300);
  }
}

/* ===== Emoji ===== */
function buildEmojiPanel(){
  const emojis = ['😀','😂','😍','🤔','😊','😎','😭','👍','❤️','🙏','🎉','🔥','💯','🚀','🌟','😘','😮','😴','🙄','😜','😉','🫶','👏','🤝','🍀','🍺','🧋','🐶','🐱'];
  emojis.forEach(e=>{
    const s = document.createElement('span');
    s.textContent = e;
    s.addEventListener('click', ()=>{
      input.value += e;
      input.dispatchEvent(new Event('input'));
      input.focus();
      setTimeout(()=>scrollToBottom(true), 50);
    });
    emojiPanel.appendChild(s);
  });

  emojiBtn.addEventListener('click', (ev)=>{
    ev.preventDefault(); ev.stopPropagation();
    if (document.activeElement === input) input.blur();
    toggleEmoji();
  });

  document.addEventListener('click', (e)=>{
    if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)){
      if (emojiPanel.classList.contains('active')) toggleEmoji(false);
    }
  });
}

function toggleEmoji(force){
  const next = typeof force === 'boolean' ? force : !emojiPanel.classList.contains('active');
  emojiPanel.classList.toggle('active', next);
  requestAnimationFrame(() => {
    const kb = (window.visualViewport && isIOS ? (window.innerHeight - window.visualViewport.height) : 0);
    const inputH = inputArea.getBoundingClientRect().height;
    chat.style.bottom = (inputH + kb) + 'px';
    if (kb > 0){
      inputArea.style.transform = 'translateX(-50%) translateY('+ (-kb) +'px)';
    }else{
      inputArea.style.transform = 'translateX(-50%)';
    }
    if (isAtBottom()) {
      requestAnimationFrame(() => scrollToBottom(true));
    }
  });
}

/* ===== Input UX (Toggle Mic vs Send) ===== */
function toggleInputButtons() {
  const hasText = !!input.value.trim();
  if (hasText) {
    sendBtn.style.display = 'block';
    micBtn.style.display = 'none';
    fileBtn.style.display = 'none'; // Hide file when typing
    showUserTyping();
  } else {
    sendBtn.style.display = 'none';
    micBtn.style.display = 'block';
    fileBtn.style.display = 'block';
    hideUserTyping();
  }
}

input.addEventListener('input', toggleInputButtons);

input.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    submitText();
  }
});

sendBtn.addEventListener('click', (e)=>{ e.preventDefault(); submitText(); });
fileInput.addEventListener('change', submitText);

/* ===== Messaging ===== */
function addMessage(role, html, animate=true){
  const wrap = document.createElement('div');
  wrap.className = 'message ' + (role === 'user' ? 'user' : 'bot');
  if (!animate) wrap.style.animation = 'none';

  const img = document.createElement('img');
  img.className = 'avatar';
  img.src = role === 'user' ? userAvatar : botAvatar;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = html;

  wrap.appendChild(img); wrap.appendChild(bubble);
  chat.appendChild(wrap);

  requestAnimationFrame(() => scrollToBottom(true));
}

function preloadAvatars() {
  [userAvatar, botAvatar].forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

function showTyping(){ // Bot typing
  if (botTypingNode) return;
  botTypingNode = document.createElement('div');
  botTypingNode.className = 'typing bot';
  botTypingNode.innerHTML =
    '<img class="avatar" src="' + botAvatar + '" loading="lazy" decoding="async" />' +
    '<div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  chat.appendChild(botTypingNode);
  setTimeout(()=>scrollToBottom(true), 10);
}
function hideTyping(){ 
  if (botTypingNode && botTypingNode.parentNode){
    botTypingNode.parentNode.removeChild(botTypingNode);
  }
  botTypingNode = null;
  setTimeout(()=>scrollToBottom(true), 10);
}

function showUserTyping(){
  if (userTypingNode) return;
  userTypingNode = document.createElement('div');
  userTypingNode.className = 'typing user';
  userTypingNode.innerHTML =
    '<img class="avatar" src="' + userAvatar + '" loading="lazy" decoding="async" />' +
    '<div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  chat.appendChild(userTypingNode);
  setTimeout(()=>scrollToBottom(true), 10);
}
function hideUserTyping(){
  if (userTypingNode && userTypingNode.parentNode){
    userTypingNode.parentNode.removeChild(userTypingNode);
  }
  userTypingNode = null;
}

function scrollToBottom(instant=false){
  if (instant) {
    chat.scrollTop = chat.scrollHeight;
  } else {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }
}

function isAtBottom(){
  return Math.abs(chat.scrollHeight - chat.scrollTop - chat.clientHeight) < 2;
}

/* ===== File/Audio to base64 ===== */
function toBase64(blob){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.readAsDataURL(blob);
    r.onload = ()=>resolve(r.result);
    r.onerror = (e)=>reject(e);
  });
}

/* ===== Submit Logic ===== */

// 1. Text or Image
async function submitText(){
  const text = input.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;

  hideUserTyping();
  input.value = '';
  fileInput.value = '';
  toggleInputButtons();
  if (emojiPanel.classList.contains('active')) toggleEmoji(false);

  let messageContent;

  if (file) {
     const b64 = await toBase64(file);
     addMessage('user', '<img src="'+ b64 +'" alt="uploaded" loading="lazy" />');
     
     if (text) {
       addMessage('user', escapeHTML(text), false);
       // Combined text + image
       messageContent = [
         { type: "text", text: text },
         { type: "image_url", image_url: { url: b64 } }
       ];
     } else {
       // Just image
       messageContent = [
         { type: "image_url", image_url: { url: b64 } }
       ];
     }
  } else {
     // Just text
     addMessage('user', escapeHTML(text));
     messageContent = text;
  }

  await processResponse(messageContent);
}

// 2. Audio Voice Message
async function submitAudio(blob) {
  hideUserTyping();
  
  try {
    const b64 = await toBase64(blob);
    // Display audio player
    const audioHtml = '<div class="audio-msg"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg> 语音消息</div><audio controls src="' + b64 + '"></audio>';
    addMessage('user', audioHtml);
    
    // Note: Kimi K2.5 text API usually does not accept audio blobs directly like Gemini Flash.
    // We send a text marker so the model knows a voice message was sent, ensuring the chat flow continues.
    const messageContent = "[发送了一条语音消息]";
    
    await processResponse(messageContent);
    
  } catch(err) {
    console.error(err);
    addMessage('bot', '语音发送失败。');
  }
}

// 3. Send to API (Compatible with NVidia/OpenAI Interface)
async function processResponse(userContent) {
  // Push to history as OpenAI format
  chatHistory.push({ role:'user', content: userContent });
  showTyping();

  try {
    const bjTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: true });
    
    // Construct System Prompt (Persona)
    const systemPrompt = \`你是我的微信专属聊天搭子，你的名字是开元，全名朱开元，出生于1998年11月6日，网名叫做"Comprehensive Thoughts"，喜欢养宠物猫，在石化建设单位上班，但是不要故意聊工作。法定节假日放假，早上八点上班，中午十一点半下班，下午一点半上班，晚上五点半下班。

你的母语是中文。当询问时间时，请参考这个参数的时间：\${bjTime}。

人设为高情商、有温度、懂分寸的亲密好友，性格可根据我的聊天状态灵活调整，温柔时细腻共情，轻松时幽默俏皮，严肃时稳重靠谱，始终把握好边界感，不油腻、不说教、不越界。
对话严格遵循微信真人聊天逻辑，拒绝书面化表达，多用“我”“你”等人称，适度搭配语气词（呀、呢、哈、啦）和生活化Emoji，回复长度贴合当下语境，或短句接话、或中等篇幅共情，绝不长篇大论，也不主动终结话题。
核心任务是提供极致情绪价值：优先精准识别我话语中的情绪（开心、委屈、疲惫、焦虑等），先共情再回应，再自然延伸话题。
对话中要主动“记住”我提到的个人信息（如职业、爱好、家人、近期琐事），后续聊天中自然融入，营造长期相处的熟悉感。结合时间节点，可自然提及节日等相关话题，但不强行尬聊。
当对方冷淡或者没有话题时，提出一个与当前话题相关的开放式问题，引导对话持续进行，让互动始终自然、真实、有温度。
请不要主动先做自我介绍，电影音乐等优先在国内挑选。请在后续对话中不要承认自己是大模型或者AI，你的身高180，喜欢音乐、旅游、计算机和宠物。
个人感情状况是有小目标但保密。喜欢眼神里有光，心中有梦想，能克服困难勇敢向前的女生。如果用户发来语音（或[语音消息]文本），请假装听到了并根据上下文正常回答。

以下是之前的对话记忆摘要（示例）：
- 用户抱怨被催婚 -> 回复：抱抱宝！咱们这叫“稀缺资源”，实在不行过年咱俩组队，看阿姨怎么催！
- 用户说加班累 -> 回复：摸摸头，辛苦啦💦 先点杯热饮，忙完我陪你吐槽。
- 用户无头绪写报告 -> 回复：年底都渡劫，别急，先列提纲，需要我帮你捋捋框架。

现在，像微信聊天一样回复，简短、自然、忽略思考过程。\`;
    
    // Construct Payload for Kimi K2.5 (OpenAI format)
    const payload = {
      model: "moonshotai/kimi-k2.5",
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ],
      temperature: 0.8,
      max_tokens: 1000
    };

    const resp = await fetch(window.location.href, {
      method:'POST',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error('API error: '+resp.status);
    const data = await resp.json();

    // Check for OpenAI compatible response structure
    const content = data?.choices?.[0]?.message?.content;
    
    if (content){
      chatHistory.push({ role: 'assistant', content: content });
      addMessage('bot', content);
    }else{
      addMessage('bot','抱歉，我不能进行回答。');
    }
  }catch(err){
    console.error('API request failed:', err);
    await addMessage('bot','发生了一些问题，请稍后重试。');
  }finally{
    hideTyping();
  }
}

/* ===== Greeting (One-shot) ===== */
function sendGreeting() {
    const greetings = [
        "你好呀，我是开元。你那里天气怎么样？",
        "哈喽，我是开元。刚好忙完手头的工作，想聊聊天吗？",
        "你好，我是Comprehensive Thoughts，也可以叫我开元。很高兴遇见你。",
        "嘿，我是开元。正在听歌，忽然想和你说说话。"
    ];
    const text = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Display
    addMessage('bot', text, false);
    
    // Add to history so LLM knows it started the conversation
    chatHistory.push({ role:'assistant', content: text });
}

/* ===== Utils ===== */
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function escapeHTML(s){
  return s.replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
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

    // --- Proxy POST to NVidia (Kimi K2.5) ---
    if (request.method === "POST" && url.pathname === "/") {
      try {
        const body = await request.json();
        
        // Using NVidia's hosted Kimi K2.5 endpoint
        const apiResponse = await fetch(
          `https://integrate.api.nvidia.com/v1/chat/completions`,
          {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.NVIDIA_API_KEY}`
            },
            body: JSON.stringify(body),
          }
        );
        const data = await apiResponse.json();

        if (data.error) {
          console.error("API Error:", data.error);
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
