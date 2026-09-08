const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const cors = h => { h.set('access-control-allow-origin','*'); h.set('access-control-allow-methods','GET,POST,PATCH,DELETE,OPTIONS'); h.set('access-control-allow-headers','content-type,authorization'); return h; };
function token(){ return crypto.randomUUID()+'.'+crypto.randomUUID(); }
function auth(req, env){ const x=req.headers.get('authorization')||''; return x.startsWith('Bearer ') && x.slice(7)===env.ADMIN_SESSION_TOKEN; }
async function api(req, env){
  const u=new URL(req.url), p=u.pathname, method=req.method;
  if(method==='OPTIONS') return new Response(null,{status:204,headers:cors(new Headers())});
  if(p==='/api/login' && method==='POST'){ const b=await req.json().catch(()=>({})); if(!env.ADMIN_PASSWORD || b.password!==env.ADMIN_PASSWORD) return json({error:'Invalid password'},401); return json({token:env.ADMIN_SESSION_TOKEN}); }
  if(p.startsWith('/api/admin/') && !auth(req,env)) return json({error:'Unauthorized'},401);
  if(p==='/api/settings' && method==='GET'){ const r=await env.DB.prepare('SELECT key,value FROM settings').all(); return json(Object.fromEntries(r.results.map(x=>[x.key,x.value]))); }
  if(p==='/api/settings' && method==='POST'){ const b=await req.json(); for(const [k,v] of Object.entries(b)) await env.DB.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind(k,String(v)).run(); return json({ok:true}); }
  if(p==='/api/products' && method==='GET'){ const r=await env.DB.prepare('SELECT * FROM products WHERE visible=1 ORDER BY id DESC').all(); return json(r.results); }
  if(p==='/api/admin/products' && method==='GET'){ const r=await env.DB.prepare('SELECT * FROM products ORDER BY id DESC').all(); return json(r.results); }
  if(p==='/api/admin/products' && method==='POST'){ const b=await req.json(); const r=await env.DB.prepare('INSERT INTO products(code,name,price,description,images,video,category,visible) VALUES(?,?,?,?,?,?,?,?)').bind(b.code,b.name,Number(b.price),b.description||'',JSON.stringify(b.images||[]),b.video||'',b.category||'',b.visible===false?0:1).run(); return json({id:r.meta.last_row_id}); }
  const pm=p.match(/^\/api\/admin\/products\/(\d+)$/); if(pm){ const id=Number(pm[1]); if(method==='PATCH'){ const b=await req.json(); await env.DB.prepare('UPDATE products SET code=?,name=?,price=?,description=?,images=?,video=?,category=?,visible=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.code,b.name,Number(b.price),b.description||'',JSON.stringify(b.images||[]),b.video||'',b.category||'',b.visible?1:0,id).run(); return json({ok:true}); } if(method==='DELETE'){ await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run(); return json({ok:true}); }}
  if(p.startsWith('/api/product/') && method==='GET'){ const code=decodeURIComponent(p.split('/').pop()); const r=await env.DB.prepare('SELECT * FROM products WHERE code=? AND visible=1').bind(code).first(); if(!r)return json({error:'Not found'},404); return json(r); }
  if(p==='/api/chat/messages' && method==='GET'){
    const sid=(new URL(req.url)).searchParams.get('session_id')||'';
    if(!/^[a-zA-Z0-9_-]{16,100}$/.test(sid)) return json({error:'Invalid session'},400);
    const r=await env.DB.prepare('SELECT id,sender,message,created_at FROM chat_messages WHERE session_id=? ORDER BY id ASC LIMIT 200').bind(sid).all();
    return json({messages:r.results});
  }
  if(p==='/api/chat/messages' && method==='POST'){
    const b=await req.json().catch(()=>({})); const sid=String(b.session_id||''); const msg=String(b.message||'').trim();
    if(!/^[a-zA-Z0-9_-]{16,100}$/.test(sid)) return json({error:'Invalid session'},400);
    if(!msg || msg.length>1000) return json({error:'Message must be 1-1000 characters'},400);
    const r=await env.DB.prepare('INSERT INTO chat_messages(session_id,sender,message) VALUES(?,?,?)').bind(sid,'customer',msg).run();
    return json({ok:true,id:r.meta.last_row_id});
  }
  if(p==='/api/admin/chat/sessions' && method==='GET'){
    const r=await env.DB.prepare(`SELECT session_id, MAX(id) AS last_id, MAX(created_at) AS last_at, COUNT(*) AS message_count, (SELECT message FROM chat_messages c2 WHERE c2.session_id=c1.session_id ORDER BY id DESC LIMIT 1) AS last_message FROM chat_messages c1 GROUP BY session_id ORDER BY last_id DESC LIMIT 100`).all();
    return json(r.results);
  }
  const cs=p.match(/^\/api\/admin\/chat\/([^/]+)$/); if(cs){
    const sid=decodeURIComponent(cs[1]);
    if(method==='GET'){ const r=await env.DB.prepare('SELECT id,sender,message,created_at FROM chat_messages WHERE session_id=? ORDER BY id ASC LIMIT 500').bind(sid).all(); return json({messages:r.results}); }
    if(method==='POST'){ const b=await req.json().catch(()=>({})); const msg=String(b.message||'').trim(); if(!msg||msg.length>1000)return json({error:'Message must be 1-1000 characters'},400); const r=await env.DB.prepare('INSERT INTO chat_messages(session_id,sender,message) VALUES(?,?,?)').bind(sid,'admin',msg).run(); return json({ok:true,id:r.meta.last_row_id}); }
  }
  if(p==='/api/orders' && method==='POST'){ const b=await req.json(); const prod=await env.DB.prepare('SELECT * FROM products WHERE code=? AND visible=1').bind(b.product_code).first(); if(!prod)return json({error:'Product not found'},404); const q=Math.max(1,Math.min(99,Number(b.quantity)||1)); const amount=prod.price*q; const oid='ORD-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*900+100); await env.DB.prepare('INSERT INTO orders(order_id,product_id,product_code,product_name,quantity,amount,customer_name,whatsapp,house_no,address,pin_code) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(oid,prod.id,prod.code,prod.name,q,amount,b.name,b.whatsapp,b.house_no||'',b.address||'',b.pin_code||'').run(); await env.DB.prepare('INSERT INTO order_updates(order_id,update_text) VALUES(?,?)').bind(oid,'ऑर्डर प्राप्त हो गया है').run(); return json({order_id:oid,amount,product:prod.name,quantity:q}); }
  if(p==='/api/order/track' && method==='POST'){ const b=await req.json(); const r=await env.DB.prepare('SELECT order_id,product_name,quantity,amount,custom_status,created_at,updated_at FROM orders WHERE order_id=? AND whatsapp=?').bind(b.order_id,b.whatsapp).first(); if(!r)return json({error:'Order not found'},404); const h=await env.DB.prepare('SELECT update_text,created_at FROM order_updates WHERE order_id=? ORDER BY id ASC').bind(r.order_id).all(); return json({...r,updates:h.results}); }
  if(p==='/api/admin/orders' && method==='GET'){ const r=await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all(); return json(r.results); }
  const om=p.match(/^\/api\/admin\/orders\/([^/]+)$/); if(om && method==='PATCH'){ const oid=decodeURIComponent(om[1]); const b=await req.json(); await env.DB.prepare('UPDATE orders SET custom_status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(b.status,oid).run(); await env.DB.prepare('INSERT INTO order_updates(order_id,update_text) VALUES(?,?)').bind(oid,b.status).run(); return json({ok:true}); }
  return json({error:'Not found'},404);
}
export default {async fetch(req,env){ const u=new URL(req.url); if(u.pathname.startsWith('/api/')) return api(req,env); const h=new Headers(); const res=await env.ASSETS.fetch(req); if(res.status===404){ return env.ASSETS.fetch(new Request(new URL('/index.html',req.url),req)); } return res; }};
