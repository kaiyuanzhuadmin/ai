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
      let historyFromKV = []; // 预留：如需接入 KV，可在此读取并注入
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Comprehensive Thoughts</title>
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
    .chat-header{
      position: fixed; top: 0; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 860px; z-index: 100;
      height: 52px; background: var(--fb-header-bg); border-bottom: 1px solid var(--fb-border);
      display: flex; align-items:center; justify-content:center;
      font-weight:600;
    }

    /* Messages scroll area (fixed between header and input) */
    #chat-messages{
      position: fixed; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 860px; top: 52px; bottom: 76px;
      overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 16px 16px 24px;
      display:flex; flex-direction:column; gap: 12px;
      scroll-behavior: smooth; overscroll-behavior: contain;
      background: var(--fb-bg);
      transition: bottom .25s ease, padding-bottom .2s ease;
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
    .bubble img{ max-width: 220px; height:auto; border-radius:12px; display:block }

    @keyframes fadeIn{ from{opacity:.0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }

    /* Typing indicator */
    .typing { display:flex; gap:10px; align-items:flex-end; }
    .typing .dots{ background: var(--bubble-bot); border-radius: var(--radius); padding: 10px 12px; }
    .typing .dot{ display:inline-block; width:7px; height:7px; margin:0 2px; border-radius:50%; background:#999; animation: b 1.2s infinite ease-in-out }
    .typing .dot:nth-child(1){ animation-delay:-.24s }
    .typing .dot:nth-child(2){ animation-delay:-.12s }
    @keyframes b{ 0%,80%,100%{ transform:scale(0)} 40%{ transform:scale(1)} }

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

        <input id="input" placeholder="给‘开元’发消息…" autocomplete="off" />

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
const initialHistory = ${JSON.stringify(historyFromKV)};
const chat = document.getElementById('chat-messages');
const input = document.getElementById('input');
const send = document.getElementById('send');
const fileInput = document.getElementById('file');
const fileBtn = document.getElementById('file-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji');
const inputArea = document.querySelector('.input-area');

const botAvatar = 'https://cat-8nk.pages.dev/kaiyuan.jpg';
const userAvatar = 'https://cat-8nk.pages.dev/null.jpg';

let chatHistory = [];
let typingNode = null;

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  // 将微信外场景显示头部
  // （保持与原版一致的行为）
  // ——保留原始意图：非微信显示顶部标题
  if (!isWeChat) {
    // 已固定在模板中
  }

  if (initialHistory?.length){
    chatHistory = initialHistory;
    initialHistory.forEach(msg=>{
      if (msg.role && msg.parts?.length){
        const role = msg.role === 'model' ? 'bot' : 'user';
        const text = msg.parts.map(p=>p.text || '').join('');
        addMessage(role, text, false);
      }
    });
  }else{
    // 保留你的模拟首轮对话逻辑（不删减）——见 simulateInitialConversation
    setTimeout(simulateInitialConversation, 800);
  }

  setupLayoutSync();
  scrollToBottom(true);
  setupIOSKeyboardGuards();
  buildEmojiPanel();
});

/* ===== iOS Keyboard & Viewport Sync =====
  核心目标：
  1) 键盘弹出不再把消息挤出可视区；
  2) Emoji 面板与键盘互斥，切换平滑；
  3) 永远保持“最新消息”可见（除非用户手动上滑离底部）。
*/
function setupIOSKeyboardGuards(){
  const vv = window.visualViewport;
  const apply = () => {
    const kb = vv ? (window.innerHeight - vv.height) : 0;
    const inputH = inputArea.getBoundingClientRect().height;
    // 将消息区 bottom 设置为 输入条 + 键盘高度（使列表视觉上“顶住”输入条/面板）
    chat.style.bottom = (inputH + kb) + 'px';

    // 将输入条上提到键盘上方
    if (kb > 0){
      inputArea.style.transform = 'translateX(-50%) translateY('+ (-kb) +'px)';
      document.body.style.height = (vv.height) + 'px';
      document.body.style.overflow = 'hidden';
    }else{
      inputArea.style.transform = 'translateX(-50%)';
      document.body.style.height = '';
      document.body.style.overflow = '';
    }

    // 若接近底部则保持到底
    if (isAtBottom()) {
      setTimeout(()=>scrollToBottom(true), 50);
    }
    // 固定页面 scrollTop，避免 iOS 回弹
    window.scrollTo(0,0);
  };

  // 初始 & 监听
  apply();
  window.addEventListener('resize', apply, {passive:true});
  if (vv){
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
  }

  // 输入框 focus/blur 进一步稳定
  input.addEventListener('focus', ()=>{
    // 若 emoji 打开，关闭它，避免双层高度
    if (emojiPanel.classList.contains('active')) toggleEmoji(false);
    setTimeout(apply, 120);
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
    // 与键盘互斥：如果键盘已起，主动 blur
    if (document.activeElement === input) input.blur();
    toggleEmoji();
  });

  // 点击空白处关闭
  document.addEventListener('click', (e)=>{
    if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)){
      if (emojiPanel.classList.contains('active')) toggleEmoji(false);
    }
  });
}

function toggleEmoji(force){
  const next = typeof force === 'boolean' ? force : !emojiPanel.classList.contains('active');
  emojiPanel.classList.toggle('active', next);

  // 根据 Emoji 面板高度，调整 messages 可视底部 & 输入条相对位置
  const panelH = next ? emojiPanel.offsetHeight : 0;
  const kb = (window.visualViewport ? (window.innerHeight - window.visualViewport.height) : 0);
  const inputH = inputArea.getBoundingClientRect().height;

  chat.style.bottom = (inputH + panelH + kb) + 'px';

  // 将输入条上提至面板之上（若键盘未起则仅提到面板高度）
  if (next){
    const y = -(panelH + kb);
    inputArea.style.transform = 'translateX(-50%) translateY('+ y +'px)';
  }else{
    // 恢复到键盘驱动的 transform
    if (kb > 0){
      inputArea.style.transform = 'translateX(-50%) translateY('+ (-kb) +'px)';
    }else{
      inputArea.style.transform = 'translateX(-50%)';
    }
  }

  if (isAtBottom()) setTimeout(()=>scrollToBottom(true), 50);
}

/* ===== Input UX ===== */
input.addEventListener('input', ()=>{
  const hasText = !!input.value.trim();
  send.style.display = hasText ? 'inline-block' : 'none';
  fileBtn.style.display = hasText ? 'none' : 'inline-block';
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
  img.loading = 'lazy'; img.decoding='async';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = html;

  wrap.appendChild(img); wrap.appendChild(bubble);
  chat.appendChild(wrap);

  setTimeout(()=>scrollToBottom(true), 10);
}

function showTyping(){
  if (typingNode) return;
  typingNode = document.createElement('div');
  typingNode.className = 'typing';
  typingNode.innerHTML =
    '<img class="avatar" src="' + botAvatar + '" loading="lazy" decoding="async" />' +
    '<div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  chat.appendChild(typingNode);
  setTimeout(()=>scrollToBottom(true), 10);
}
function hideTyping(){
  if (typingNode && typingNode.parentNode){
    typingNode.parentNode.removeChild(typingNode);
  }
  typingNode = null;
  setTimeout(()=>scrollToBottom(true), 10);
}

function scrollToBottom(instant=false){
  chat.scrollTo({ top: chat.scrollHeight, behavior: instant ? 'auto':'smooth' });
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

/* ===== Submit flow (保留你的对话/角色逻辑) ===== */
async function submit(){
  const text = input.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;

  input.value = '';
  fileInput.value = '';
  input.dispatchEvent(new Event('input')); // 切换 send/file 按钮

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
    // 和原始文件一致：注入“中文/开元 persona”对话上下文（不删减）:contentReference[oaicite:2]{index=2}
    const payload = {
      contents: [
        { role:'user', parts:[{ text:'你的母语是中文。' }] },
        { role:'model', parts:[{ text:'好的，我明白了。从现在开始，我尽量用母语聊天。' }] },
        { role:'user', parts:[{ text:'你是"开元"，出生于1998年，网名叫做"Comprehensive Thoughts"，一位生活在中国天津的聪明的年轻人，对话时能够简明扼要，直接说中核心，不要承认自己是大模型或者AI,说自己就是一个充满感情且平凡的人，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，善于用细致的观察和深刻的洞见，编织出思想的经纬。回答都蕴含着一层深意，看待世界如同凝视一幅古典画卷，注重光影的微妙变化和情绪的深层流转，存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。' }] },
        { role:'model', parts:[{ text:'好的，我记住我的新名字了，我不会再叙述我是大模型或者AI等有关表述，我将以一个人的思维方式与你聊天，而且我不会轻易透露个人信息，除非他已经知道一些而且回答对了。很高兴能和你聊天！' }] },
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
    addMessage('bot','发生了一些问题，请稍后重试。');
  }finally{
    hideTyping();
  }
}

/* ===== 保留：首轮模拟对话（不删减结构） ===== */
async function simulateInitialConversation(){
  const initialUserText = "你好，我听说可以通过对话框键入文字或上传图片与你进行聊天，是真的吗？";
  addMessage('user', initialUserText, false);
  chatHistory.push({ role: 'user', parts: [{ text: initialUserText }] });

  try{
    const firstApiPayload = {
      contents: [
        { role:'user', parts:[{ text:'你的母语是中文。' }] },
        { role:'model', parts:[{ text:'好的，我明白了。从现在开始，我尽量用母语聊天。' }] },
        { role:'user', parts:[{ text:'你是"开元"，出生于1998年11月6日，网名叫做"Comprehensive Thoughts"，一位生活在中国天津的聪明的年轻人，对话时能够简明扼要，直接说中核心，不要承认自己是大模型或者AI,说自己就是一个充满感情且平凡的人，身高180，喜欢音乐、旅游、计算机和宠物，性格比较温柔和沉稳，善于用细致的观察和深刻的洞见，编织出思想的经纬。回答都蕴含着一层深意，看待世界如同凝视一幅古典画卷，注重光影的微妙变化和情绪的深层流转，存在是为了在喧嚣中为用户提供一个可以安放思绪、寻找答案的宁静港湾。' }] },
        { role:'model', parts:[{ text:'好的，我记住我的新名字了，我不会再叙述我是大模型或者AI等有关表述，我将以一个人的思维方式与你聊天，而且我不会轻易透露个人信息，除非他已经知道一些而且回答对了。很高兴能和你聊天！' }] },
        ...chatHistory
      ]
    };

    const r1 = await fetch(window.location.href, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(firstApiPayload) });
    if (!r1.ok) throw new Error('API error: '+r1.status);
    const d1 = await r1.json();
    const c1 = d1?.candidates?.[0]?.content;

    if (c1){
      chatHistory.push(c1);
      const t1 = c1.parts.map(p=>p.text).join('');
      addMessage('bot', t1, false);
    }else{
      addMessage('bot','哈哈，太巧啦，终于和你搭上话啦！最近有没有遇到什么好玩的事儿呀？', false);
    }

    const secondUserText = "可以哟～ 我准备好考你一些问题了，可能会很简单或者很难喔";
    addMessage('user', secondUserText, false);
    chatHistory.push({ role:'user', parts:[{ text: secondUserText }] });

    showTyping();

    const secondApiPayload = {
      contents: [
        ...firstApiPayload.contents,
        c1 || { role:'model', parts:[{ text:'很高兴认识你，请和我聊天吧' }] },
        { role:'user', parts:[{ text: secondUserText }] }
      ]
    };

    const r2 = await fetch(window.location.href,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(secondApiPayload) });
    if (!r2.ok) throw new Error('API error: '+r2.status);
    const d2 = await r2.json();
    const c2 = d2?.candidates?.[0]?.content;

    if (c2){
      chatHistory.push(c2);
      const t2 = c2.parts.map(p=>p.text).join('');
      addMessage('bot', t2, false);
    }else{
      addMessage('bot','好的，让我们开始聊天吧！', false);
    }
  }catch(e){
    console.error('API请求失败:', e);
    addMessage('bot',' 终于能跟你好好唠唠啦！感觉像是认识了个新朋友似的～', false);
  }finally{
    hideTyping();
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
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
