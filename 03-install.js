'use strict';
/* ============================================================
   03-install.js · "Yükle" sayfası (alttan açılan)
   Not: tarayıcılar başka bir sitenin PWA'sını bu sayfadan doğrudan
   yüklemeye izin vermez. Bu yüzden "Yükle" adımları gösterir ve siteyi açar.
   ============================================================ */

let sheetApp=null;         /* sayfada gösterilen uygulama */
let sheetPl='desktop';     /* seçili platform sekmesi */
let sheetFrom=null;        /* kapanınca odağın döneceği öğe */

const PLATS=[
  {id:'ios',label:'iPhone'},
  {id:'android',label:'Android'},
  {id:'desktop',label:'Bilgisayar'}
];

/* Adım içi çizgi simgeler (cihazlar arası aynı görünür; ⬆︎ ⋮ ⊕ karakterleri yerine) */
const IC_SHARE='<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>';
const IC_DOTS='<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>';
const IC_INST='<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>';
const IC_X='<path d="M6 6l12 12M18 6L6 18"/>';
function sic(p){return svg(p,18,'st-ic')}

const STEPS={
  ios:[
    'Siteyi <b>Safari</b>\'de aç.',
    'Alttaki <b>Paylaş</b> '+sic(IC_SHARE)+' düğmesine dokun.',
    '<b>Ana Ekrana Ekle</b>\'yi seç, sonra <b>Ekle</b>\'ye dokun.'
  ],
  android:[
    'Siteyi <b>Chrome</b>\'da aç.',
    'Sağ üstteki <b>Menü</b> '+sic(IC_DOTS)+' düğmesine dokun.',
    '<b>Ana ekrana ekle</b> (ya da <b>Uygulamayı yükle</b>) seçeneğine dokun.'
  ],
  desktop:[
    'Siteyi <b>Chrome</b> veya <b>Edge</b>\'de aç.',
    'Adres çubuğunun sağındaki <b>Yükle</b> '+sic(IC_INST)+' simgesine tıkla.',
    '<b>Yükle</b>\'yi onayla.'
  ]
};

function sheetIcon(a){return localIcon(a)}

function renderSheet(){
  const a=sheetApp;
  if(!a)return;
  const tabs=PLATS.map(function(p){
    return '<button class="seg-b" type="button" data-act="pl" data-pl="'+p.id+'" aria-pressed="'+(p.id===sheetPl)+'">'+p.label+'</button>';
  }).join('');
  const steps=STEPS[sheetPl].map(function(s){return '<li><span>'+s+'</span></li>'}).join('');
  /* Android ve bilgisayarda siteyi ?install=1 ile aç: uygulama kendi "Uygulamayı yükle" şeridini gösterir (iPhone'da böyle bir yol yok) */
  const oneTap=sheetPl!=='ios';
  let goUrl=a.url;
  if(oneTap){try{const u=new URL(a.url);u.searchParams.set('install','1');goUrl=u.href}catch(e){}}
  const go='<a class="btn btn-pri sh-go" href="'+esc(goUrl)+'" target="_blank" rel="noopener" data-act="go">'+(oneTap?'Aç ve yükle':'Siteyi aç')+'</a>';
  $('#sheetBody').innerHTML=''
    +'<div class="sh-hd">'
    +  '<img class="app-ic sm" src="'+esc(sheetIcon(a))+'" alt="" width="48" height="48">'
    +  '<div class="sh-tt"><h2 id="shTitle" class="sh-title">'+esc(a.name)+'</h2><p class="sh-sub">Ana ekrana ekle</p></div>'
    +  '<button class="ib" type="button" data-act="close" aria-label="Kapat">'+svg(IC_X,22)+'</button>'
    +'</div>'
    +'<div class="seg" role="group" aria-label="Cihaz türü">'+tabs+'</div>'
    +'<ol class="steps">'+steps+'</ol>'
    +'<p class="sh-note">Ekledikten sonra uygulama ana ekranından kendi başına, tam ekran açılır.'+(oneTap?' <b>Aç ve yükle</b> siteyi açar; üstte çıkan <b>Uygulamayı yükle</b> düğmesine dokunman yeter. Düğme çıkmazsa yukarıdaki adımları izle.':'')+'</p>'
    +'<div class="sh-ac">'+go+'</div>';
}

/* Alttan açılan sayfayı gösterir (Yükle ve Ayarlar ortak): arka plan inert + kaydırma kilidi */
function sheetShow(){
  sheetFrom=document.activeElement;
  const s=$('#sheet');
  s.classList.add('open');
  s.setAttribute('aria-hidden','false');
  const app=$('#app');
  if(app)app.inert=true;                       /* arkadaki sayfa odak/kaydırma almaz */
  document.documentElement.classList.add('lock');
  const first=$('#sheetBody .btn-pri')||$('#sheetBody .tm[aria-pressed="true"]')||$('#sheetBody .btn');
  if(first)first.focus({preventScroll:true});
}

function openSheet(id){
  const a=APPS.find(function(x){return x.id===id});
  if(!a)return;
  sheetApp=a;
  sheetPl=platform();
  renderSheet();
  sheetShow();
}

function closeSheet(){
  const s=$('#sheet');
  if(!s||!s.classList.contains('open'))return;
  s.classList.remove('open');
  s.setAttribute('aria-hidden','true');
  const app=$('#app');
  if(app)app.inert=false;
  document.documentElement.classList.remove('lock');
  if(sheetFrom&&sheetFrom.focus){try{sheetFrom.focus({preventScroll:true})}catch(e){}}
  sheetFrom=null;
}

function setPlat(pl){
  sheetPl=pl;
  renderSheet();
  const b=$('#sheetBody [data-pl="'+pl+'"]');
  if(b)b.focus({preventScroll:true});
}

/* ---------- Nexus'un kendi "Yükle" kartı (yukarıdan sarkar; yeni sayfa açmaz) ---------- */
let nxBar=null;

function nxCanInstall(){return !isStandalone()&&!window.__nxDone}

/* Üst çubuktaki Yükle düğmesi: uygulama yüklü değilse görünür */
function nxInstSync(){
  const b=$('#topInst');
  if(b)b.classList.toggle('off',!nxCanInstall()||PANEL);
}

function nxHide(){
  const b=nxBar;nxBar=null;
  if(!b||!b.parentNode)return;
  b.className='nxi nxi-out';
  setTimeout(function(){if(b.parentNode)b.parentNode.removeChild(b)},320);
}

function nxShow(){
  if(nxBar||!nxCanInstall())return;
  const ev=window.__nxIP;
  const ios=platform()==='ios';
  const sub=ev?'Ana ekrana ekle, tam ekran çalışır'
    :ios?'Safari\'de Paylaş ▸ Ana Ekrana Ekle'
    :'Tarayıcı menüsünden Ana ekrana ekle\'yi seç';
  const bar=document.createElement('div');
  bar.className='nxi';bar.setAttribute('role','region');bar.setAttribute('aria-label','Nexus\'u yükle');
  bar.innerHTML='<img class="nxi-ic" src="icons/icon-192.png" alt="" width="46" height="46">'
    +'<div class="nxi-tx"><b>Nexus</b><span>'+esc(sub)+'</span></div>'
    +'<button class="nxi-go" type="button" data-snd="none">'+(ev?'Yükle':'Tamam')+'</button>'
    +'<button class="nxi-x" type="button" data-snd="none" aria-label="Kapat">'+svg(IC_X,16)+'</button>';
  bar.querySelector('.nxi-go').onclick=function(){
    const e=window.__nxIP;
    nxHide();
    if(!e){snd('tap');return}
    window.__nxIP=null;
    try{e.prompt()}catch(x){}
    try{e.userChoice.then(function(r){if(r&&r.outcome==='accepted'){snd('ok')}}).catch(function(){})}catch(x){}
    nxInstSync();
  };
  bar.querySelector('.nxi-x').onclick=function(){snd('tap');nxHide()};
  document.body.appendChild(bar);
  snd('open');vib(12);
  nxBar=bar;
}

window.nxInstSync=nxInstSync;
window.addEventListener('appinstalled',function(){nxHide();nxInstSync();if(typeof snd==='function')snd('ok')});
