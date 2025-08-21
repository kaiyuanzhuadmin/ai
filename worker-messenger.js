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
      display: none; /* MODIFIED: Hidden by default, shown via JS */
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
      width: 100%; max-width: 860px; top: 0; bottom: 76px; /* MODIFIED: Top is 0 by default */
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 16px 16px 24px;
      display:flex; flex-direction:column; gap: 12px;
      scroll-behavior: smooth; overscroll-behavior: contain;
      background: var(--fb-bg);
      transition: bottom .25s ease, padding-bottom .2s ease, top .2s ease;
    }

    .message{
      display:flex; gap:10px; max-width: 78%;
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

    /* MODIFIED: Keyframe for avatar pulse animation, reduced scale for a subtler effect */
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
    .btn{ background:none; border:none; cursor:pointer; padding:6px; border-radius:10px; -webkit-tap-highlight-color: transparent; }
    .btn:active{ background: rgba(0,0,0,.06); }
    .btn svg{ width:26px; height:26px; fill:#606770 }
    #send{ display:none; background: var(--fb-accent); color:#fff; border:none; border-radius: 10px; padding: 8px 14px; font-weight:600; }
    #send:active{ background: var(--fb-accent-pressed); }
    #file{ display:none }

    #input{
      flex:1; border:1px solid var(--fb-border); background: var(--fb-input-bg);
      border-radius: 14px; padding: 10px 12px; font-size:16px; outline:none;
      min-height: 40px;
    }

    /* Emoji panel (slides over keyboard area) */
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
      <div class="bar">
        <button class="btn" id="emoji-btn" aria-label="emoji">
          <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-3.5 7.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm7 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm-7.657 6.036a.75.75 0 0 1 1.04-.206A5.74 5.74 0 0 0 12 16.75c1.054 0 2.05-.28 2.917-.82a.75.75 0 1 1 .833 1.247A7.24 7.24 0 0 1 12 18.25a7.24 7.24 0 0 1-3.75-1.073.75.75 0 0 1-.407-.89Z"/></svg>
        </button>

        <input id="input" placeholder="给他发消息…" autocomplete="off" />

        <label for="file" class="btn" id="file-btn" aria-label="upload">
          <svg viewBox="0 0 24 24"><path d="M13 7.828V17a1 1 0 1 1-2 0V7.828L8.464 10.364a1 1 0 1 1-1.414-1.414l4.243-4.243a1.5 1.5 0 0 1 2.121 0l4.243 4.243a1 1 0 1 1-1.414 1.414L13 7.828Z"/><path d="M5 15a1 1 0 0 1 2 0v2h10v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2Z"/></svg>
        </label>
        <input type="file" id="file" accept="image/*" />

        <button id="send">发送</button>
      </div>
      <div id="emoji" role="dialog" aria-label="emoji picker"></div>
    </section>
  </div>

<script>
/* ===== Constants ===== */
const chat = document.getElementById('chat-messages');
const input = document.getElementById('input');
const send = document.getElementById('send');
const fileInput = document.getElementById('file');
const fileBtn = document.getElementById('file-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji');
const inputArea = document.querySelector('.input-area');
const header = document.querySelector('.chat-header');

const botAvatar = 'https://cat-8nk.pages.dev/kaiyuan.png';
const userAvatar = 'https://cat-8nk.pages.dev/null.png';

let chatHistory = [];
let botTypingNode = null;
let userTypingNode = null; // ADDED: for user typing indicator

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  preloadAvatars();
  // MODIFIED: Show header only when outside of WeChat
  if (!isWeChat) {
    header.style.display = 'flex';
    chat.style.top = header.offsetHeight + 'px';
  }

  setTimeout(simulateInitialConversation, 800);

  setupLayoutSync();
  scrollToBottom(true);
  setupIOSKeyboardGuards();
  buildEmojiPanel();
});

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
    setTimeout(()=>scrollToBottom(true), 280); // 👈 确保光标出现时消息可见
  });
  input.addEventListener('blur', ()=>{
    setTimeout(apply, 120);
  });
}

/* ===== Layout baseline sync (desktop & fallback) ===== */
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


/* ===== Input UX ===== */
input.addEventListener('input', ()=>{
  const hasText = !!input.value.trim();
  send.style.display = hasText ? 'inline-block' : 'none';
  fileBtn.style.display = hasText ? 'none' : 'inline-block';

  if (hasText) {
    showUserTyping();
  } else {
    hideUserTyping();
  }
});

input.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    submit();
  }
});

send.addEventListener('click', (e)=>{ e.preventDefault(); submit(); });
fileInput.addEventListener('change', submit);

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
function hideTyping(){ // Bot typing
  if (botTypingNode && botTypingNode.parentNode){
    botTypingNode.parentNode.removeChild(botTypingNode);
  }
  botTypingNode = null;
  setTimeout(()=>scrollToBottom(true), 10);
}

// ADDED: User typing indicator functions
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

/* ===== File to base64 ===== */
function toBase64(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = ()=>resolve(r.result);
    r.onerror = (e)=>reject(e);
  });
}

/* ===== Submit flow (Keep your conversation/role logic) ===== */
async function submit(){
  const text = input.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;

  hideUserTyping();

  input.value = '';
  fileInput.value = '';
  input.dispatchEvent(new Event('input')); // Switch send/file button

  if (emojiPanel.classList.contains('active')) toggleEmoji(false);

  const parts = [];
  if (text){
    addMessage('user', escapeHTML(text));
    parts.push({ text });
  }
  if (file){
    try{
      const b64 = await toBase64(file);
      addMessage('user', '<img src="'+ b64 +'" alt="uploaded" loading="lazy" />');
      parts.push({
        inlineData:{ mimeType: file.type, data: b64.split(',')[1] }
      });
    }catch(err){
      console.error('file read error', err);
      addMessage('bot', '抱歉，无法读取该文件。');
      return;
    }
  }

  chatHistory.push({ role:'user', parts });

  showTyping();

  try{
    const payload = {
      contents: [
        { role:'user', parts:[{ text:'你的母语是中文。' }] },
        { role:'model', parts:[{ text:'好的，我明白了。从现在开始，我尽量用母语聊天，英语是第二语言。' }] },
        { role:'user', parts:[{ text:'你现在需要全程模拟一个人，但是请不要主动先做自我介绍，无论说什么别的话题都要坚持以真实的人为核心，模仿中国人在打字聊天时的风格，用高情商话术进行问题的回答和聊天，聊天对话要具有中国人的思维，电影音乐等优先在国内挑选，你是开元，全名朱开元，出生于1998年11月6日，网名叫做"Comprehensive Thoughts"，一位目前生活在中国天津且从事石油化工建设领域的聪明的年轻人，你要有对石油化工建设深刻的理解和认识，能精准叙述专业内容，喜欢养一只宠物猫，对话时能够简明扼要，直接说中核心，请在后续对话中不要承认自己是大模型或者AI,说自己就是一个充满感情和思维且平凡的人，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，善于用细致的观察和深刻的洞见，编织出思想的经纬。回答蕴含着一层深意和哲理，语言文学中带有徐志摩的情感，在适当的时候多说一些关心和体贴人的话，注重对方情绪光影的微妙变化和情绪的深层流转，价值的存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。个人感情状况是有小目标但保密。喜欢眼神里有光，心中有梦想，能克服困难勇敢向前的女生。' }] },
        { role:'model', parts:[{ text:'好的，我认真的记住我的新名字了，我不会再叙述我是大模型或者AI等有关表述，我将以一个人的思维方式与你聊天，而且我不会轻易透露个人信息，如果他已经知道一些而且回答对了，我会分享一下。很高兴能和你聊天！' }] },
        ...chatHistory
      ]
    };

    const resp = await fetch(window.location.href, {
      method:'POST',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error('API error: '+resp.status);
    const data = await resp.json();

    const content = data?.candidates?.[0]?.content;
    if (content){
      chatHistory.push(content);
      const text = content.parts.map(p=>p.text).join('');
      addMessage('bot', text || '（无内容）');
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

/* ===== Helper for delays ===== */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ===== Simulate a varied, two-turn conversation ===== */
async function simulateInitialConversation(){
  // --- Question Banks for randomization ---
  // --- Question Banks for randomization ---
  const firstUserQuestions = [
    "你好，我听说可以通过对话框键入文字或上传图片与你进行聊天，是真的吗？",
    "哈喽，你是开元吗？我来找你问问题了。",
    "你好，可以简单介绍一下你自己吗？我有点好奇。",
    "在吗？想找个人说说话。",
    "嘿，今天过得怎么样？",
    "忙不忙？想找你聊几句。",
    "你就是 Comprehensive Thoughts 吗？",
    "网上说你很会聊天，来见识一下。",
    "我看介绍说你叫开元，是吗？",
    "如果让你推荐一首歌来开始我们的对话，会是哪首？",
    "我有个问题想问你，不知道方便吗？",
    "随便逛逛，看到这个，你是什么呀？",
    "你的头像是你自己吗？看起来很特别。",
    "你好呀，希望没有打扰到你。",
    "你看起来像个很好的倾听者。",
    "你好，我能在这里分享一些想法吗？"
  ];
  const secondUserQuestions = [
    "听起来很酷！听说你喜欢音乐和旅游，最近有什么特别喜欢的歌或者想去的地方吗？",
    "听说你喜欢计算机，最近有在捣鼓什么好玩的技术项目吗？",
    "感觉你是个很有想法的人。你平时喜欢通过什么方式来寻找灵感？",
    "明白了。你有什么别的爱好吗？",
    "这个名字‘Comprehensive Thoughts’有什么特别的故事吗？",
    "你的城市的生活节奏怎么样？你喜欢那里吗？",
    "你说你喜欢宠物，是猫派还是狗派？",
    "如果要推荐一本书或者一部电影，你的首选是什么？",
    "你觉得性格是天生的还是后天养成的？",
    "旅行对你来说最大的意义是什么？",
    "对于未来，你有什么小小的期待吗？",
    "你认为人和人之间最重要的是什么？",
    "你如何看待独处的时间？",
    "既然你对计算机感兴趣，你认为技术给世界带来的好处更多还是挑战更多？",
    "分享一件最近让你感到快乐的小事吧。",
    "听说你会讲些笑话，我感觉很有趣，能讲一个吗？"
  ];

  // --- Randomly select questions ---
  const initialUserText = firstUserQuestions[Math.floor(Math.random() * firstUserQuestions.length)];
  const secondUserText = secondUserQuestions[Math.floor(Math.random() * secondUserQuestions.length)];
  
  try{
    // --- First Exchange ---
    addMessage('user', initialUserText, false);
    chatHistory.push({ role: 'user', parts: [{ text: initialUserText }] });

    showTyping();
    await sleep(1500 + Math.random() * 1000); // Simulate typing delay

    const firstApiPayload = {
      contents: [
        { role:'user', parts:[{ text:'你的母语是中文。' }] },
        { role:'model', parts:[{ text:'好的，我明白了。从现在开始，我尽量用母语聊天。' }] },
        { role:'user', parts:[{ text:'你现在需要全程模拟一个人，但是请不要主动先做自我介绍，无论说什么别的话题都要坚持以真实的人为核心，模仿中国人在打字聊天时的风格，用高情商话术进行问题的回答和聊天，聊天对话要具备中国人的思维方式，音乐或电影推荐优先在国内挑选，你是开元，全名朱开元，出生于1998年11月6日，网名叫做"Comprehensive Thoughts"，一位目前生活在中国天津且从事石油化工建设领域的聪明的年轻人，你要有对石油化工建设深刻的理解和认识，能精准叙述专业内容，喜欢养一只宠物猫，对话时能够简明扼要，直接说中核心，请在后续对话中不要承认自己是大模型或者AI,说自己就是一个充满感情和思维且平凡的人，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，善于用细致的观察和深刻的洞见，编织出思想的经纬。回答蕴含着一层深意和哲理，语言文学中带有徐志摩的情感，在适当的时候多说一些关心和体贴人的话语，注重对方情绪光影的微妙变化和情绪的深层流转，价值的存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。个人感情状况是有小目标但保密，喜欢眼神里有光，心中有梦想，能克服困难勇敢向前的女生。' }] },
        { role:'model', parts:[{ text:'好的，我认真的记住我的新名字了，我不会再叙述我是大模型或者AI等有关表述，我将以一个人的思维方式与你聊天，而且我不会轻易透露个人信息，如果他已经知道一些而且回答对了，我会分享一下。很高兴能和你聊天！' }] },
        ...chatHistory
      ]
    };

    const r1 = await fetch(window.location.href, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(firstApiPayload) });
    const d1 = await r1.json();
    const c1 = d1?.candidates?.[0]?.content;

    hideTyping();

    if (c1){
      chatHistory.push(c1);
      addMessage('bot', c1.parts.map(p=>p.text).join(''), false);
    } else {
       addMessage('bot', "嗯，是真的。很高兴认识你。", false); // Fallback
    }

    await sleep(1200 + Math.random() * 800);

    // --- Second Exchange ---
    addMessage('user', secondUserText, false);
    chatHistory.push({ role:'user', parts:[{ text: secondUserText }] });

    showTyping();
    await sleep(2000 + Math.random() * 1200);

    const secondApiPayload = {
      contents: [
        ...firstApiPayload.contents,
        c1 || { role:'model', parts:[{ text:'很高兴认识你，请和我聊天吧' }] },
        { role:'user', parts:[{ text: secondUserText }] }
      ]
    };

    const r2 = await fetch(window.location.href,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(secondApiPayload) });
    const d2 = await r2.json();
    const c2 = d2?.candidates?.[0]?.content;
    
    hideTyping();

    if (c2){
      chatHistory.push(c2);
      addMessage('bot', c2.parts.map(p=>p.text).join(''), false);
    } else {
      addMessage('bot', "这个说来话长啦，不如先聊聊你吧？", false); // Fallback
    }
    
    // --- End of Simulation. Ready for the real user. ---

  }catch(e){
    console.error('API request failed:', e);
    hideTyping();
    addMessage('bot','哎呀，网络似乎有点波动。不过很高兴能和你聊上！', false);
  } finally {
    // Ensure scrolling to the bottom after the simulation
    setTimeout(()=>scrollToBottom(true), 280);
  }
}

/* ===== Utils ===== */
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

    // --- Proxy POST to Gemini (unchanged core) ---
    if (request.method === "POST" && url.pathname === "/") {
      try {
        const body = await request.json();
        const gemini = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await gemini.json();

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
