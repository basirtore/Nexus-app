'use strict';
/* ============================================================
   01-core.js · sabitler, bölümler (SECS), uygulama listesi (APPS),
   durum (S), yardımcılar
   Yeni uygulama: kod gerekmez; Cloudflare'de Worker açılınca panel > Uygulamalar'dan işaretlenir
   Yeni bölüm: SECS'e satır (başka bir şey gerekmez)
   ============================================================ */

const KEY='nexus.v1';

/* Bölümler (ekranda bu sırayla). ic = 24x24 çizgi simge içeriği (sabit, güvenilir) */
const SECS=[
  {id:'life',title:'Yaşam ve Sağlık',
   ic:'<path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.6-9.5 9-9.5 9z"/>'},
  {id:'trade',title:'Trader Araçları',
   ic:'<path d="M3 17l5-6 4 3 8-9"/><path d="M3 21h18"/>'},
  {id:'arch',title:'Arşiv',
   ic:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>'}
];

/* Ana sayfada liste /api/public'ten (panelde işaretlenen herkese açıklar) yüklenir;
   panelde /api/apps'ten (Nexus'ta görünmesi işaretli tüm uygulamalar; yalnız giriş yapmış yönetici). Alanlar:
   id, sec, public, name, url, icon (url + icon = canlı simge), desc,
   badge?, iconLocal? (yerel simge yolu); panelde ek olarak pub (herkese açık mı).
   Liste Cloudflare Worker'larından ve KV'deki ayarlardan Worker'da üretilir (repoda uygulama adresi yok).
   Yerel yedek simge varsayılan icons/apps/<id>.png */
let APPS=[];
const PANEL=!!window.NEXUS_PANEL;

function loadApps(){
  const get=function(u){
    return fetch(u,{cache:'no-cache',credentials:'same-origin'}).then(function(r){
      if(!r.ok)throw new Error(u+' '+r.status);
      return r.json();
    });
  };
  /* Ana sayfa: yalnız panelde "herkese açık" işaretlenenler (/api/public). Gizliler hiç gelmez. */
  if(!PANEL){
    return get('/api/public').then(function(r){
      APPS=((r&&r.apps)||[]).filter(function(a){return a&&a.id&&a.url&&a.public!==false});
    });
  }
  /* Panel: Nexus'ta görünenlerin hepsi; a.pub = herkese açık mı (sunucu işaretler) */
  return get('/api/apps').then(function(r){
    APPS=((r&&r.apps)||[]).filter(function(a){return a&&a.id&&a.url});
  });
}

/* Liste alınamadı mı (ağ/sunucu hatası)? Boş ama hatasız liste "Henüz uygulama yok" gösterir */
let APPS_FAIL=false;

/* Durum (cihazda): last = son canlı simge zamanı, snd = tıklama sesi, push/pushAt = son GitHub push (önbellek) */
let S={v:1,last:0,snd:true,push:0,pushAt:0};

/* ---------- Yardımcılar ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.from((r||document).querySelectorAll(s))}

/* Kullanıcı/dış metni innerHTML'e koyarken her zaman esc */
function esc(t){
  return String(t==null?'':t).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw)S=Object.assign({v:1,last:0,snd:true,push:0,pushAt:0},JSON.parse(raw));
  }catch(e){}
}

/* Şema yükseltmeleri buraya (S.v) */
function migrate(){
  if(!S||typeof S!=='object')S={v:1,last:0};
  if(!S.v)S.v=1;
  if(typeof S.last!=='number')S.last=0;
  if(typeof S.snd!=='boolean')S.snd=true;
  if(typeof S.push!=='number')S.push=0;
  if(typeof S.pushAt!=='number')S.pushAt=0;
  save();
}

/* Titreşim: tek yerden; iOS'ta yoksa sessizce geçer */
function vib(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}

/* Bildirim: type = ok (yeşil, tik çizilir + ses) | err (kırmızı + ses) | info (varsayılan, sessiz); sub = ince alt satır */
const TOAST_IC={
  ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  err:'<path d="M6 6l12 12M18 6L6 18"/>',
  info:'<path d="M12 11v5M12 8h.01"/>'
};
let toastT=0;
function toast(msg,type,sub){
  const el=$('#toast');
  if(!el)return;
  type=TOAST_IC[type]?type:'info';
  el.className='toast '+type;
  el.innerHTML='<span class="toast-ic">'+svg(TOAST_IC[type],18)+'</span><span class="toast-tx">'+esc(msg)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>';
  void el.offsetWidth;                      /* animasyon baştan başlasın */
  el.classList.add('show');
  if(type!=='info'&&typeof snd==='function')snd(type);
  clearTimeout(toastT);
  toastT=setTimeout(function(){el.classList.remove('show')},2800);
}

/* Yerel saat (toISOString UTC verir, kullanma) */
function hhmm(ts){
  const d=new Date(ts);
  const p=function(n){return n<10?'0'+n:''+n};
  return p(d.getHours())+':'+p(d.getMinutes());
}

/* 'ios' | 'android' | 'desktop' */
function platform(){
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua))return 'ios';
  if(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)return 'ios';
  if(/Android/i.test(ua))return 'android';
  return 'desktop';
}

function isStandalone(){
  try{
    return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  }catch(e){return false}
}
