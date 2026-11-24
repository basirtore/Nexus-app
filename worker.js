/* worker.js · Nexus sunucu katmanı: panel girişi, davet linkleri, durum, herkese açık liste.
   Statik dosyalar ASSETS'ten gelir; yalnız /panel/*, /api/*, /g/* buradan geçer.
   Gerekenler: KV bağlantısı LINKS; Secret: ADMIN_KEY, CF_ACCOUNT_ID, CF_API_TOKEN (Workers Scripts Read);
   isteğe bağlı Secret: CF_SUBDOMAIN (API'den alınamazsa yedek). Hiçbiri repoda durmaz. */
const enc=new TextEncoder();
const HD={'cache-control':'no-store','referrer-policy':'no-referrer','x-robots-tag':'noindex'};
const J=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:{...HD,'content-type':'application/json'}});
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Durum sayfası (geçersiz link vb.): stil /style.css'ten (tek kaynak, tema desteği dahil), simge SVG satır içi */
const SV=p=>'<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const SVS=p=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICO={
  broken:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/><path d="M4 4l16 16"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'
};
/* o: {ic, tone (''|warn|ok), h, p, why:[[ikon,metin]], btn:[href,metin]} */
function page(title,o,s){
  const why=(o.why||[]).map(w=>'<li>'+SVS(w[0])+'<span>'+esc(w[1])+'</span></li>').join('');
  return new Response('<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="color-scheme" content="light dark"><title>'+esc(title)+'</title>'
    +'<script>try{var t=localStorage.getItem("nexus.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>'
    +'<link rel="stylesheet" href="/style.css"></head><body class="stp"><div class="g-deco" aria-hidden="true"><svg class="g-wv g-wv-t" viewBox="0 0 400 240" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M-10 40C60 10 130 120 200 80S340 -20 410 50"/><path d="M-10 70C60 40 130 150 200 110S340 10 410 80"/><path d="M-10 100C60 70 130 180 200 140S340 40 410 110"/></svg><svg class="g-wv g-wv-b" viewBox="0 0 400 240" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M-10 170C70 120 150 230 230 180S350 110 410 150"/><path d="M-10 200C70 150 150 260 230 210S350 140 410 180"/><path d="M-10 230C70 180 150 290 230 240S350 170 410 210"/></svg></div><main class="st-card">'
    +'<div class="st-ic '+esc(o.tone||'')+'">'+SV(o.ic)+'</div>'
    +'<h1 class="st-h">'+esc(o.h)+'</h1><p class="st-p">'+esc(o.p)+'</p>'
    +(why?'<ul class="st-why">'+why+'</ul>':'')
    +(o.btn?'<div class="st-ac"><a class="btn btn-pri" href="'+esc(o.btn[0])+'">'+esc(o.btn[1])+'</a></div>':'')
    +'<p class="st-foot">NEXUS</p></main></body></html>',
    {status:s||200,headers:{...HD,'content-type':'text/html;charset=utf-8'}});
}
/* Oturum numarası (KV 'ep'): "Tüm cihazlardan çık" bunu artırır, eski çerezler geçersiz olur. Yoksa eski biçim ('nexus-admin') geçerli */
async function epoch(env){return String(await env.LINKS.get('ep')||'')}
async function tok(env,ep){
  const k=await crypto.subtle.importKey('raw',enc.encode(env.ADMIN_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const s=await crypto.subtle.sign('HMAC',k,enc.encode(ep?'nexus-admin:'+ep:'nexus-admin'));
  return [...new Uint8Array(s)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function eq(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
async function isAdmin(req,env){
  if(!env.ADMIN_KEY)return false;
  const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)nx=([0-9a-f]+)/);
  return !!m&&eq(m[1],await tok(env,await epoch(env)));
}
/* ---------- Uygulama listesi ----------
   Kaynak: Cloudflare Worker listesi (API) + panelde yapılan ayarlar (KV 'apps').
   KV 'apps' = {v,a:[{id,w,show,name,desc,sec,badge,icon,loc}],seen:[workerAdı]|null}
   KV 'cfl'  = {at,sub,names}: Cloudflare'den son bilinen liste (yalnız değişince yazılır; KV yazmayı azaltır)
   Adres = https://<worker>.<alt alan adı>.workers.dev/ ; alt alan adı API'den gelir (repoda yok). */
const SECOK=['life','trade','arch'];
const NM=/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;
/* İlk açılış tohumu: eski panel/private.json değerleri (id'ler davet linkleri ve 'pub' için aynı kalır) */
const SEED=[
  {id:'life',w:'vitaflow-life',sec:'life',name:'VitaFlow Life',desc:'Günlük plan, rutin ve alışkanlık takibi.',icon:'icons/icon-192.png'},
  {id:'health',w:'vitaflow-health',sec:'life',name:'VitaFlow Health',desc:'Uyku, beslenme ve kilo takibi.',icon:'icons/icon-192.png'},
  {id:'jurnalist',w:'jurnalist',sec:'trade',name:'Journalist',desc:'Trading günlüğü: işlem kaydı, istatistik ve analiz.',icon:'icons/icon-192.png?v=2'},
  {id:'edgeflow',w:'edgeflow',sec:'trade',name:'EdgeFlow',desc:'Trader için risk ve disiplin aracı.',icon:'icons/icon-192.png'},
  {id:'vitaflow',w:'vitaflow',sec:'arch',name:'VitaFlow',desc:'Birleşik eski sürüm. Artık güncellenmiyor.',badge:'Arşiv',icon:'icons/icon-192.png'}
];
const seedCfg=()=>({v:1,a:SEED.map(e=>({...e,loc:1,show:true})),seen:null});
async function cfgGet(env){
  const raw=await env.LINKS.get('apps');
  if(raw){
    try{const c=JSON.parse(raw);if(c&&Array.isArray(c.a))return c}catch(e){}
    return seedCfg(); /* bozuk kayıt: bellekte tohum, üzerine yazma */
  }
  const c=seedCfg();
  try{await env.LINKS.put('apps',JSON.stringify(c))}catch(e){}
  return c;
}
async function cfCache(env){
  try{const c=JSON.parse(await env.LINKS.get('cfl')||'null');if(c&&Array.isArray(c.names))return {at:+c.at||0,sub:String(c.sub||''),names:c.names}}catch(e){}
  return {at:0,sub:'',names:[]};
}
async function cfGet(env,path){
  if(!env.CF_ACCOUNT_ID||!env.CF_API_TOKEN)throw new Error('CF_ACCOUNT_ID ve CF_API_TOKEN Worker\'da tanımlı değil');
  let r;
  try{r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.CF_ACCOUNT_ID)+path,
    {headers:{authorization:'Bearer '+env.CF_API_TOKEN},signal:AbortSignal.timeout(8000)})}
  catch(e){throw new Error('Cloudflare API\'ye bağlanılamadı')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok||!j||!j.success){
    const m=j&&j.errors&&j.errors[0]&&j.errors[0].message;
    throw new Error(r.status===401||r.status===403?'Token reddedildi ('+r.status+')':'Cloudflare '+r.status+(m?': '+m:''));
  }
  return j.result;
}
const SUBOK=/^[a-z0-9][a-z0-9-]*$/i;
/* Cloudflare'den Worker listesi + alt alan adı; KV'ye yalnız değişince yazar */
async function cfRefresh(env,old){
  const [sc,sd]=await Promise.all([cfGet(env,'/workers/scripts'),cfGet(env,'/workers/subdomain').catch(()=>null)]);
  const names=(Array.isArray(sc)?sc:[]).map(x=>x&&x.id).filter(n=>typeof n==='string'&&NM.test(n)).sort();
  const sub=String(env.CF_SUBDOMAIN||(sd&&sd.subdomain)||old.sub||'');
  const c={at:Date.now(),sub:SUBOK.test(sub)?sub:'',names};
  if(c.sub!==old.sub||c.names.join()!==old.names.join())await env.LINKS.put('cfl',JSON.stringify(c));
  return c;
}
async function getSub(env){
  if(env.CF_SUBDOMAIN&&SUBOK.test(env.CF_SUBDOMAIN))return String(env.CF_SUBDOMAIN);
  const c=await cfCache(env);
  if(c.sub)return c.sub;
  try{
    const sd=await cfGet(env,'/workers/subdomain');
    if(sd&&SUBOK.test(sd.subdomain||'')){c.sub=sd.subdomain;await env.LINKS.put('cfl',JSON.stringify(c));return c.sub}
  }catch(e){}
  return '';
}
const toApp=(e,sub)=>({id:e.id,sec:SECOK.includes(e.sec)?e.sec:'life',name:e.name||e.w,
  url:'https://'+e.w+'.'+sub+'.workers.dev/',icon:e.icon||'icons/icon-192.png',desc:e.desc||'',
  ...(e.badge?{badge:e.badge}:{}),...(e.loc?{}:{iconLocal:'icons/icon-192.png'})});
/* Nexus'ta görünmesi işaretli uygulamalar (adresli); alt alan adı yoksa hata */
async function appList(env){
  const cfg=await cfgGet(env);
  const list=cfg.a.filter(e=>e&&e.show&&NM.test(e.w||''));
  if(!list.length)return [];
  const sub=await getSub(env);
  if(!sub)throw new Error('sub');
  return list.map(e=>toApp(e,sub));
}
const appFull=appList;
/* Herkese açık liste: KV 'pub' = [id,...]; panelde işaretlenir (POST /api/public) */
async function pubIds(env){try{const a=JSON.parse(await env.LINKS.get('pub')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
/* Kullanım sınırı: L.max (0 = sınırsız). Eski kayıtlardaki once:true tek kullanım sayılır */
const lmax=L=>L.max!=null?(+L.max||0):(L.once?1:0);
const ttl=L=>L.exp?{expirationTtl:Math.max(60,Math.ceil((L.exp-Date.now())/1000)+3600)}:{};

const SHORT=43200; /* "Beni hatırla" kapalıyken oturum süresi: 12 saat */
const LIM=10; /* IP başına hatalı deneme hakkı; dolunca son hatadan 10 dk (TTL 600 sn) beklenir, sonra yine LIM hak */
async function login(req,env){
  const rk='rl:'+(req.headers.get('cf-connecting-ip')||'x');
  const n=+(await env.LINKS.get(rk)||0);
  if(n>=LIM)return J({e:'Çok deneme, 10 dk bekle'},429);
  let b={};try{b=await req.json()}catch(e){}
  if(!env.ADMIN_KEY)return J({e:'Sunucuda ADMIN_KEY tanımlı değil'},401);
  if(!eq(String(b.key||''),env.ADMIN_KEY)){
    await env.LINKS.put(rk,String(n+1),{expirationTtl:600});
    return J({e:n+1>=LIM?'Çok deneme, 10 dk bekle':'Hatalı anahtar ('+(LIM-n-1)+' hak kaldı)'},n+1>=LIM?429:401);
  }
  if(n)await env.LINKS.delete(rk);
  await logAdd(req,env);
  /* Beni hatırla: açık (varsayılan) = 30 gün; kapalı = kısa ömürlü çerez (SHORT sn). Oturum çerezi (Max-Age'siz) telefon tarayıcısında kapanınca silinmediği için kullanılmıyor */
  const keep=b.remember!==false;
  return new Response('{"ok":1}',{headers:{...HD,'content-type':'application/json',
    'set-cookie':'nx='+await tok(env,await epoch(env))+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+(keep?2592000:SHORT)}});
}
/* Son girişler: KV 'lg' = [{t,d,c}] en yeni başta, en çok 20 (tarih, cihaz, ülke; IP tutulmaz) */
function devName(ua){
  const os=/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Mac OS X|Macintosh/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'Bilinmeyen cihaz';
  const br=/Edg\//.test(ua)?'Edge':/OPR\/|Opera/.test(ua)?'Opera':/SamsungBrowser/.test(ua)?'Samsung Internet':/Firefox\/|FxiOS/.test(ua)?'Firefox':/CriOS|Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'';
  return br?os+' · '+br:os;
}
async function logGet(env){try{const a=JSON.parse(await env.LINKS.get('lg')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
async function logAdd(req,env){
  try{
    const a=await logGet(env);
    a.unshift({t:Date.now(),d:devName(req.headers.get('user-agent')||''),c:String(req.cf&&req.cf.country||'')});
    await env.LINKS.put('lg',JSON.stringify(a.slice(0,20)));
  }catch(e){}
}

/* KV list() geç güncellenir (yeni kayıt ~1 dk görünmez); bu yüzden kodlar ayrıca 'idx' kaydında tutulur */
async function idxGet(env){try{return JSON.parse(await env.LINKS.get('idx')||'[]')}catch(e){return []}}
async function idxSet(env,a){await env.LINKS.put('idx',JSON.stringify([...new Set(a)].slice(-200)))}
async function codes(env){
  const ks=await env.LINKS.list({prefix:'l:'});
  return [...new Set([...(await idxGet(env)),...ks.keys.map(k=>k.name.slice(2))])];
}

async function api(req,env,u,p){
  const m=req.method;
  if(p==='/api/links'&&m==='GET'){
    const cs=await codes(env);
    const rows=await Promise.all(cs.map(async c=>{
      try{const L=JSON.parse(await env.LINKS.get('l:'+c));if(!L)return null;L.code=c;L.max=lmax(L);return L}catch(e){return null}
    }));
    const ok=rows.filter(Boolean);
    if(ok.length!==cs.length)await idxSet(env,ok.map(L=>L.code));
    return J(ok.sort((a,b)=>b.created-a.created));
  }
  if(p==='/api/links'&&m==='POST'){
    let b={};try{b=await req.json()}catch(e){}
    const all=await appList(env,u.origin);
    const ids=(Array.isArray(b.apps)?b.apps:[]).filter(id=>all.some(a=>a.id===id)).slice(0,10);
    if(!ids.length)return J({e:'Uygulama seç'},400);
    /* Süre dakika olarak (en çok 365 gün; 0 = süresiz). Eski istemci: hours; eski tek kullanımlık: once */
    const mins=Math.min(Math.max(Math.round(b.minutes!=null?(+b.minutes||0):(+b.hours||0)*60),0),525600);
    const mx=Math.min(Math.max(Math.round(b.max!=null?(+b.max||0):(b.once?1:0)),0),1000);
    const code=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    const L={apps:ids,exp:mins?Date.now()+mins*60000:0,max:mx,once:mx===1,note:String(b.note||'').slice(0,120),created:Date.now(),hits:0,last:0};
    await env.LINKS.put('l:'+code,JSON.stringify(L),ttl(L));
    await idxSet(env,[...(await idxGet(env)),code]);
    return J({code,url:u.origin+'/g/'+code});
  }
  if(p==='/api/links/clear'&&m==='POST'){
    await Promise.all((await codes(env)).map(c=>env.LINKS.delete('l:'+c)));
    await env.LINKS.delete('idx');
    return J({ok:1});
  }
  if(p.startsWith('/api/links/')&&m==='DELETE'){
    const c=p.slice(11);
    await env.LINKS.delete('l:'+c);
    await idxSet(env,(await idxGet(env)).filter(x=>x!==c));
    return J({ok:1});
  }
  if(p==='/api/apps'&&m==='GET'){
    const [all,ids]=await Promise.all([appList(env),pubIds(env)]);
    return J({apps:all.map(a=>({...a,pub:ids.includes(a.id)}))});
  }
  if(p==='/api/workers'&&m==='GET'){
    const cfg=await cfgGet(env),old=await cfCache(env);
    let c=old,err='';
    try{c=await cfRefresh(env,old)}catch(e){err=e&&e.message||'Cloudflare\'e ulaşılamadı'}
    if(!err&&cfg.seen==null){cfg.seen=c.names.slice();await env.LINKS.put('apps',JSON.stringify(cfg))} /* ilk açılış: mevcutlar "yeni" sayılmaz */
    const ids=await pubIds(env),seen=cfg.seen||[],self=u.hostname.split('.')[0];
    const by={};cfg.a.forEach(e=>{by[e.w]=e});
    const items=[...new Set([...c.names,...cfg.a.map(e=>e.w)])].map(w=>{
      const e=by[w];
      return {w,show:!!(e&&e.show),name:e&&e.name||'',desc:e&&e.desc||'',sec:e&&SECOK.includes(e.sec)?e.sec:'life',badge:e&&e.badge||'',
        pub:!!(e&&ids.includes(e.id)),isNew:!e&&!seen.includes(w),miss:!err&&!c.names.includes(w),self:w===self,
        url:c.sub&&c.names.includes(w)?'https://'+w+'.'+c.sub+'.workers.dev/':'',icon:e&&e.icon||'icons/icon-192.png'};
    }).sort((a,b)=>(b.isNew-a.isNew)||(b.show-a.show)||a.w.localeCompare(b.w));
    return J({items,err,at:c.at});
  }
  if(p==='/api/apps'&&m==='POST'){
    let b={};try{b=await req.json()}catch(e){}
    const cfg=await cfgGet(env),c=await cfCache(env),before=JSON.stringify(cfg);
    const by={};cfg.a.forEach(e=>{by[e.w]=e});
    const t=(v,n)=>String(v==null?'':v).trim().slice(0,n);
    for(const it of (Array.isArray(b.items)?b.items:[]).slice(0,300)){
      if(!it||typeof it.w!=='string'||!NM.test(it.w)||!(c.names.includes(it.w)||by[it.w]))continue;
      let e=by[it.w];
      if(!e){
        if(!it.show&&!t(it.name,1)&&!t(it.desc,1)&&!t(it.badge,1))continue;
        e={id:cfg.a.some(x=>x.id===it.w)?it.w+'-w':it.w,w:it.w,icon:'icons/icon-192.png'};
        cfg.a.push(e);by[it.w]=e;
      }
      e.show=!!it.show;e.name=t(it.name,40);e.desc=t(it.desc,140);e.badge=t(it.badge,16);e.sec=SECOK.includes(it.sec)?it.sec:'life';
    }
    const sn=(Array.isArray(b.seen)?b.seen:[]).filter(w=>typeof w==='string'&&NM.test(w));
    cfg.seen=[...new Set([...(cfg.seen||[]),...sn])].slice(-300);
    /* Silme: yalnız Cloudflare'de artık olmayan Worker'ların kayıtları silinir (Cloudflare'e ulaşılamazsa silinmez) */
    const dl=(Array.isArray(b.del)?b.del:[]).filter(w=>typeof w==='string'&&NM.test(w));
    let deleted=0;
    if(dl.length){
      let live=null;try{live=await cfRefresh(env,c)}catch(e){}
      if(!live)return J({e:'Cloudflare\'e ulaşılamadı, silinemedi'},502);
      const gone=dl.filter(w=>!live.names.includes(w));
      if(gone.length){
        const rm=cfg.a.filter(e=>gone.includes(e.w)).map(e=>e.id);
        deleted=cfg.a.length;
        cfg.a=cfg.a.filter(e=>!gone.includes(e.w));
        deleted-=cfg.a.length;
        cfg.seen=(cfg.seen||[]).filter(w=>!gone.includes(w));
        if(rm.length){
          const ids=await pubIds(env),nx=ids.filter(id=>!rm.includes(id));
          if(nx.length!==ids.length)await env.LINKS.put('pub',JSON.stringify(nx));
        }
      }
    }
    if(JSON.stringify(cfg)!==before)await env.LINKS.put('apps',JSON.stringify(cfg));
    return J({ok:1,deleted});
  }
  if(p==='/api/public'&&m==='POST'){
    let b={};try{b=await req.json()}catch(e){}
    const all=await appList(env,u.origin);
    const ids=[...new Set((Array.isArray(b.ids)?b.ids:[]).filter(id=>all.some(a=>a.id===id)))];
    await env.LINKS.put('pub',JSON.stringify(ids));
    return J({ok:1,ids});
  }
  if(p==='/api/status'&&m==='GET'){
    const all=await appList(env,u.origin);
    return J(await Promise.all(all.map(async a=>{
      const t=Date.now();
      try{const r=await fetch(a.url,{signal:AbortSignal.timeout(5000)});return {id:a.id,name:a.name,ok:r.ok,ms:Date.now()-t}}
      catch(e){return {id:a.id,name:a.name,ok:false,ms:0}}
    })));
  }
  if(p==='/api/logins'&&m==='GET')return J({items:await logGet(env)});
  if(p==='/api/logout-all'&&m==='POST'){
    await env.LINKS.put('ep',String((+(await epoch(env))||0)+1));
    return new Response('{"ok":1}',{headers:{...HD,'content-type':'application/json','set-cookie':'nx=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
  }
  return J({e:'yok'},404);
}

async function getLink(env,code){
  if(!/^[\w-]{10,40}$/.test(code))return null;
  const raw=await env.LINKS.get('l:'+code);
  let L=null;try{L=raw&&JSON.parse(raw)}catch(e){}
  if(!L||(L.exp&&L.exp<Date.now())||(lmax(L)&&(+L.hits||0)>=lmax(L)))return null;
  return L;
}
/* /api/public: ana sayfanın listesi (giriş gerekmez); yalnız panelde "herkese açık" işaretlenenler */
async function publicApi(env,u){
  const ids=await pubIds(env);
  const all=await appFull(env,u.origin);
  return J({apps:all.filter(a=>ids.includes(a.id)).map(a=>({...a,public:true}))});
}
const bad=()=>page('Link geçersiz',{ic:ICO.broken,h:'Link geçersiz',p:'Bu link artık çalışmıyor. Gönderen kişiden yenisini isteyebilirsin.',
  why:[[ICO.clock,'Süresi dolmuş olabilir'],[ICO.star,'Tek kullanımlıktı ve açıldı'],[ICO.ban,'Gönderen iptal etmiş olabilir']],btn:['/','Nexus\'a git']},410);

/* /g/<kod>: davet sayfası (Nexus ekranı, yalnız seçilen uygulamalar) */
async function guest(env,u,p){
  const L=await getLink(env,p.slice(3));
  if(!L)return bad();
  let r=await env.ASSETS.fetch(new Request(u.origin+'/guest'));
  if(r.status>=300&&r.status<400&&r.headers.get('location'))r=await env.ASSETS.fetch(new Request(new URL(r.headers.get('location'),u.origin)));
  return new Response(r.body,{status:r.status,headers:{...HD,'content-type':'text/html;charset=utf-8'}});
}
/* /api/g/<kod>: seçilen uygulamaların listesi; kullanım hakkı (tek ya da N kullanımlık) burada düşer
   (mesaj önizleme botları JS çalıştırmadığı için linki harcayamaz) */
async function guestApi(env,u,p,ctx){
  const code=p.slice(7);
  const L=await getLink(env,code);
  if(!L)return J({e:'geçersiz'},410);
  const all=await appFull(env,u.origin);
  const apps=L.apps.map(id=>all.find(a=>a.id===id)).filter(Boolean);
  if(!apps.length)return J({e:'geçersiz'},410);
  const mx=lmax(L),hits=(+L.hits||0)+1;
  if(mx&&hits>=mx)ctx.waitUntil(env.LINKS.delete('l:'+code));   /* son hak kullanıldı: link kapanır */
  else{L.hits=hits;L.last=Date.now();ctx.waitUntil(env.LINKS.put('l:'+code,JSON.stringify(L),ttl(L)))}
  const apk={};
  for(const a of apps)if(APK[a.id])apk[a.id]='/apk/'+a.id+'?t='+await mkTok(env,a.id);
  return J({apk,apps:apps.map(a=>({...a,public:true})),note:L.note||'',exp:L.exp||0,once:mx===1,max:mx,left:mx?Math.max(mx-hits,0):0});
}

/* ---- APK indirme (yalnız davetliler): APK özel bir repoda durur, Worker kısa ömürlü imzalı biletle kontrol edip akıtır.
   Gerekenler: Secret GH_APK_TOKEN (APK'nın bulunduğu repoda "Contents: Read" yetkili, salt okunur token).
   Yeni APK'lı uygulama için APK tablosuna satır ekle ve 03-install.js'in gösterdiği id ile eşleştir. */
const APK={life:{repo:'basirtore/VitaFlow-Life',tag:'apk-latest',asset:'vitaflow-life.apk'},health:{repo:'basirtore/VitaFlow-Health',tag:'apk-latest',asset:'vitaflow-health.apk'}};
async function hmac(env,s){
  const k=await crypto.subtle.importKey('raw',enc.encode('apk|'+env.ADMIN_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function mkTok(env,id){const exp=Date.now()+2*36e5;return exp.toString(36)+'.'+await hmac(env,id+'.'+exp)}
async function okTok(env,id,t){
  const [e,sig]=String(t||'').split('.'),exp=parseInt(e,36);
  if(!exp||exp<Date.now()||!sig)return false;
  const w=await hmac(env,id+'.'+exp);
  if(w.length!==sig.length)return false;
  let d=0;for(let i=0;i<w.length;i++)d|=w.charCodeAt(i)^sig.charCodeAt(i);
  return d===0;
}
async function apkDl(env,u,p){
  const id=p.slice(5),A=APK[id];
  if(!A||!await okTok(env,id,u.searchParams.get('t')))
    return page('İndirme süresi doldu',{ic:ICO.clock,h:'İndirme süresi doldu',p:'Davet linkini yeniden açıp APK indir düğmesine tekrar dokun.',btn:['/','Nexus\'a git']},403);
  if(!env.GH_APK_TOKEN)return J({e:'APK ayarı eksik'},503);
  const H={authorization:'Bearer '+env.GH_APK_TOKEN,'user-agent':'nexus-apk','x-github-api-version':'2022-11-28'};
  const rel=await fetch('https://api.github.com/repos/'+A.repo+'/releases/tags/'+A.tag,{headers:{...H,accept:'application/vnd.github+json'}});
  if(!rel.ok)return J({e:'APK bulunamadı'},502);
  const as=((await rel.json()).assets||[]).find(x=>x.name===A.asset);
  if(!as)return J({e:'APK bulunamadı'},502);
  /* GitHub imzalı depolama adresine yönlendirir; Authorization o adrese gitmesin diye yönlendirmeyi elle izle */
  let r=await fetch(as.url,{headers:{...H,accept:'application/octet-stream'},redirect:'manual'});
  if(r.status>=300&&r.status<400&&r.headers.get('location'))r=await fetch(r.headers.get('location'));
  if(!r.ok)return J({e:'APK indirilemedi'},502);
  const h={...HD,'content-type':'application/vnd.android.package-archive','content-disposition':'attachment; filename="'+A.asset+'"'};
  const n=r.headers.get('content-length');if(n)h['content-length']=n;
  return new Response(r.body,{headers:h});
}

async function route(req,env,ctx){
    const u=new URL(req.url),p=u.pathname;
    if(p==='/api/login'&&req.method==='POST')return login(req,env);
    if(p==='/api/logout')return new Response('{"ok":1}',{headers:{...HD,'content-type':'application/json','set-cookie':'nx=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
    if(p.startsWith('/api/g/')&&req.method==='GET')return guestApi(env,u,p,ctx);
    if(p==='/api/public'&&req.method==='GET')return publicApi(env,u);
    if(p.startsWith('/api/')){
      if(!await isAdmin(req,env))return J({e:'yetkisiz'},401);
      return api(req,env,u,p);
    }
    if(p.startsWith('/apk/')&&req.method==='GET')return apkDl(env,u,p);
    if(p.startsWith('/g/'))return guest(env,u,p);
    /* Ana sayfa herkese açık (liste /api/public'ten); yönetici girişi gizli: alt yazıya 5 dokunuş → /panel/login */
    if(p==='/index.html'||p==='/index')return Response.redirect(u.origin+'/',302);
    if(p==='/')return env.ASSETS.fetch(req);
    if(p==='/panel'||p.startsWith('/panel/')){
      if(p==='/panel/login'||p==='/panel/login.html'){
        if(await isAdmin(req,env))return Response.redirect(u.origin+'/panel/',302);
        return env.ASSETS.fetch(req);
      }
      if(p==='/panel/login.js'||await isAdmin(req,env))return env.ASSETS.fetch(req);
      return Response.redirect(u.origin+'/panel/login',302);
    }
    return env.ASSETS.fetch(req);
}
export default{
  async fetch(req,env,ctx){
    try{return await route(req,env,ctx)}
    catch(e){return J({e:'Liste alınamadı'},502)}
  }
};
