'use strict';
/* ============================================================
   01-core.js · sabitler, bölümler (SECS), uygulama listesi (APPS),
   durum (S), yardımcılar
   (SECS = kategoriler)
   Yeni uygulama: kod gerekmez; Cloudflare'de Worker açılınca panel > Uygulamalar'dan işaretlenir
   Yeni kategori: panel > Uygulamalar > Kategoriler (kod gerekmez)
   ============================================================ */

const KEY='nexus.v1';

/* Kategori simgeleri: 24x24 çizgi içeriği (sabit, güvenilir). Sunucu yalnız anahtarı saklar (worker.js SECICS ile aynı liste) */
const SEC_ICS={
  heart:'<path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.6-9.5 9-9.5 9z"/>',
  chart:'<path d="M3 17l5-6 4 3 8-9"/><path d="M3 21h18"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  game:'<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4M15.5 11.5h.01M17.5 13.5h.01"/>',
  chess:'<circle cx="12" cy="6.5" r="3"/><path d="M9 11h6M10.3 11c0 3-1.3 5-3.3 7h10c-2-2-3.3-4-3.3-7M6 21h12"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h14v-3"/>',
  tool:'<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.5-8.5"/><path d="M14.5 6.5a4 4 0 0 1 5-3l-2.5 2.5 1 2 2 1 2.5-2.5a4 4 0 0 1-3.5 5"/>',
  money:'<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M7 12h.01M17 12h.01"/>',
  star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
/* Kategoriler (ekranda bu sırayla). Panelden eklenir/düzenlenir; liste sunucudan gelir, bu üçü yalnız yedek.
   'arch' kimlikli kategori arşiv gibi davranır. */
const SECDEF=[
  {id:'life',title:'Yaşam ve Sağlık',en:'',ic:'heart'},
  {id:'trade',title:'Trader Araçları',en:'',ic:'chart'},
  {id:'arch',title:'Arşiv',en:'',ic:'archive'}
];
let SECS=[];
function setSecs(list){
  const l=(Array.isArray(list)?list:[]).filter(function(s){return s&&s.id&&s.title});
  SECS=(l.length?l:SECDEF).map(function(s){return {id:s.id,title:s.title,en:s.en||'',ic:SEC_ICS[s.ic]||SEC_ICS.grid}});
}
setSecs();
/* Ekrandaki ad: İngilizcede girilmiş İngilizce ad; yoksa çeviri tablosu, o da yoksa yazıldığı gibi */
function secTitle(s){return nxLang()==='en'&&s.en?s.en:T(s.title)}

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
      setSecs(r&&r.secs);
      APPS=((r&&r.apps)||[]).filter(function(a){return a&&a.id&&a.url&&a.public!==false});
    });
  }
  /* Panel: Nexus'ta görünenlerin hepsi; a.pub = herkese açık mı (sunucu işaretler) */
  return get('/api/apps').then(function(r){
    setSecs(r&&r.secs);
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
