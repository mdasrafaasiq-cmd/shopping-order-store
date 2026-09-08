(()=>{
  const KEY='shop_chat_session';
  let sid=localStorage.getItem(KEY);
  if(!sid){sid=crypto.randomUUID().replaceAll('-','');localStorage.setItem(KEY,sid)}
  const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const style=document.createElement('style');style.textContent=`#shop-chat-btn{position:fixed;right:18px;bottom:18px;width:58px;height:58px;border:0;border-radius:50%;background:#111;color:#fff;font-size:26px;box-shadow:0 4px 18px #0003;z-index:9999}#shop-chat{position:fixed;right:18px;bottom:86px;width:min(360px,calc(100vw - 36px));height:460px;background:#fff;border-radius:16px;box-shadow:0 8px 30px #0003;z-index:9999;display:none;overflow:hidden;border:1px solid #ddd}#shop-chat.open{display:flex;flex-direction:column}#shop-chat-head{padding:14px 16px;background:#111;color:#fff;font-weight:700;display:flex;justify-content:space-between}#shop-chat-close{background:none;border:0;color:#fff;padding:0;font-size:22px}#shop-chat-log{flex:1;padding:12px;overflow:auto;background:#f6f7f9}.shop-chat-msg{max-width:82%;padding:9px 11px;margin:7px 0;border-radius:12px;word-break:break-word}.shop-chat-c{margin-left:auto;background:#111;color:#fff}.shop-chat-a{background:#fff;border:1px solid #ddd}#shop-chat-form{display:flex;gap:7px;padding:10px;border-top:1px solid #ddd}#shop-chat-input{flex:1;margin:0}#shop-chat-send{margin:0}`;document.head.appendChild(style);
  const btn=document.createElement('button');btn.id='shop-chat-btn';btn.type='button';btn.textContent='💬';btn.title='Online Chat';
  const box=document.createElement('div');box.id='shop-chat';box.innerHTML='<div id="shop-chat-head"><span>Online Chat</span><button id="shop-chat-close" type="button">×</button></div><div id="shop-chat-log"></div><form id="shop-chat-form"><input id="shop-chat-input" maxlength="1000" placeholder="अपना संदेश लिखें..." autocomplete="off"><button id="shop-chat-send" type="submit">Send</button></form>';
  document.body.append(btn,box);
  const log=box.querySelector('#shop-chat-log'), input=box.querySelector('#shop-chat-input');
  function render(ms){log.innerHTML=ms.map(m=>`<div class="shop-chat-msg ${m.sender==='customer'?'shop-chat-c':'shop-chat-a'}">${esc(m.message)}</div>`).join('');log.scrollTop=log.scrollHeight}
  async function load(){try{const r=await fetch('/api/chat/messages?session_id='+encodeURIComponent(sid));const d=await r.json();if(r.ok)render(d.messages||[])}catch(e){}}
  btn.onclick=()=>{box.classList.toggle('open');if(box.classList.contains('open')){load();input.focus()}};
  box.querySelector('#shop-chat-close').onclick=()=>box.classList.remove('open');
  box.querySelector('#shop-chat-form').onsubmit=async e=>{e.preventDefault();const message=input.value.trim();if(!message)return;input.disabled=true;try{const r=await fetch('/api/chat/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:sid,message})});if(r.ok){input.value='';await load()}}finally{input.disabled=false;input.focus()}};
  setInterval(()=>{if(box.classList.contains('open'))load()},5000);
})();
