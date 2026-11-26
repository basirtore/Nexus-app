'use strict';
/* ============================================================
   02-apps.js · bölümler + uygulama kartları + canlı simge çekme
   Akış: kart önce kayıtlı (yerel) simgeyle çizilir, sonra canlı simge
   arka planda yüklenir; yüklenirse değişir, yüklenemezse kayıtlı kalır.
   ============================================================ */

let liveTry=0;      /* son canlı deneme zamanı (art arda denemeyi sınırlar) */
let liveBusy=false;

function localIcon(a){return a.iconLocal||('icons/apps/'+a.id+'.png')}

/* Dakikalık önbellek kırıcı: uygulamanın simgesi değişirse en geç 1 dakikada görünür */
function liveBust(){return Math.floor(Date.now()/60000)}
function liveIconUrl(a){
  const sep=a.icon.indexOf('?')>=0?'&':'?';
  return a.url+a.icon+sep+'h='+liveBust();
}

/* Canlı simge önbelleği (id → adres): loadLive doldurur; panelde sonradan çizilen her ekran
   (Herkese açık, Davet linkleri, Durum) simgeyi buradan alır. Simgesi olan her <img> data-ic taşır. */
const LIVE={};
function icUrl(a){return LIVE[a.id]||localIcon(a)}
function liveApply(root){
  $$('img[data-ic]',root).forEach(function(img){
    const u=LIVE[img.dataset.ic];
    if(u&&img.getAttribute('src')!==u){img.src=u;img.classList.add('live')}
  });
}

function svg(p,size,cls){
  return '<svg'+(cls?' class="'+cls+'"':'')+' viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
const IC_ADD='<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>';
const IC_GO='<path d="M9 6l6 6-6 6"/>';
const IC_DOWN='<path d="M6 9l6 6 6-6"/>';

/* Satır kart: ad bağlantısı ::after ile tüm satırı kaplar ("Aç"), kurulum düğmesi üstte kalır */
function appCard(a){
  const arch=a.sec==='arch';
  const badge=(a.badge&&!arch)?'<span class="badge">'+esc(T(a.badge))+'</span>':'';
  const add=arch?'':'<button class="ib app-add" type="button" data-act="install" data-id="'+esc(a.id)+'" aria-label="'+esc(T('{name} nasıl yüklenir',{name:a.name}))+'">'+svg(IC_ADD,22)+'</button>';
  return ''
  +'<article class="app'+(arch?' arch':'')+'" data-id="'+esc(a.id)+'">'
  +  '<img class="app-ic" src="'+esc(localIcon(a))+'" alt="" width="48" height="48" data-ic="'+esc(a.id)+'">'
  +  '<div class="app-bd">'
  +    '<h3 class="app-nm"><a class="app-open" href="'+esc(a.url)+'" target="_blank" rel="noopener" data-act="open">'+esc(a.name)+'</a>'+badge+'</h3>'
  +    '<p class="app-ds">'+esc(T(a.desc))+'</p>'
  +  '</div>'
  +  '<div class="app-ac">'+add+'<span class="app-cta">'+T('Aç')+'</span>'+'</div>'
  +'</article>';
}

/* Ana sayfa (herkese açık): ilk görseldeki tasarım. Boş hal = büyük logo + bilgilendirme kartı; dolu hal = tek liste.
   Kartlar appCard ile çizilir (canlı simge çekme çalışsın diye), her karta rozet ya da bölüm etiketi eklenir. */
const P_IC_INFO='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>';
const P_IC_GRID='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
/* Yörüngede yavaşça gezen küçük ışık; hareket azaltma açıksa çizilmez */
function pDot(){
  try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return ''}catch(e){}
  return '<circle class="pub-dot" r="3.2" fill="currentColor"><animateMotion dur="16s" repeatCount="indefinite" path="M10 80a150 46 0 1 0 300 0a150 46 0 1 0 -300 0"/></circle>';
}
function pHero(mode){
  const logo=mode==='full'
    ?'<div class="g-logo-wrap pub-logo"><svg class="pub-orbit" viewBox="0 0 320 160" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><g transform="rotate(-14 160 80)"><ellipse cx="160" cy="80" rx="150" ry="46"/>'+pDot()+'</g></svg><img class="g-logo" src="icons/icon-512.png" alt="" width="112" height="112"></div>'
    :'';
  const sub=mode==='full'
    ?T('Uygulamalar henüz yayında değil;<br>hazır oldukça burada görünecek.')
    :T('İşte senin için sunulan uygulamalar.');
  return logo+'<h1 class="g-h pub-h">'+T('Nexus\'a <em>hoş geldin.</em>')+'</h1><p class="g-sub pub-sub">'+sub+'</p>';
}
function pRender(){
  const hero=$('#pubHero');
  const list=PANEL?APPS.filter(function(a){return a.pub}):APPS;   /* panel önizlemesi = ana sayfada herkesin göreceği liste */
  const n=list.length;
  if(hero){hero.classList.toggle('pub-full',n===0);hero.innerHTML=pHero(n===0?'full':'list')}
  const box=$('#v-apps');
  if(!n){
    box.innerHTML=APPS_FAIL
      ?'<div class="pub-info pub-err"><span class="pub-info-ic">'+svg(P_IC_INFO,26)+'</span><div class="pub-info-bd"><b>'+T('Bağlantı sorunu')+'</b><p>'+T('Uygulama listesi alınamadı. Bağlantını kontrol et.')+'</p></div><button class="btn btn-pri" type="button" data-act="retry">'+T('Tekrar dene')+'</button></div>'
      :'<div class="pub-info"><span class="pub-info-ic">'+svg(P_IC_INFO,26)+'</span><div class="pub-info-bd"><b>'+T('Bilgilendirme')+'</b><p>'+T('Birkaç gün sonra tekrar uğrayabilirsin.')+'</p></div></div>';
    return;
  }
  const hd='<div class="g-sh"><span class="g-sh-ic">'+svg(P_IC_GRID,22)+'</span><h2 class="g-sh-t">'+T('Public Uygulamalar')+'</h2><span class="g-cnt">'+T('{n} Uygulama',{n:n})+'</span></div>';
  const cards=list.map(function(a){
    const sc=SECS.filter(function(x){return x.id===a.sec})[0]||SECS[0];
    const tag=a.badge&&a.sec!=='arch'?T(a.badge):secTitle(sc);
    return appCard(Object.assign({},a,{badge:''})).replace('</p></div>','</p><span class="g-tag">'+svg(sc.ic,13)+esc(tag)+'</span></div>');
  }).join('');
  box.innerHTML='<section class="sec">'+hd+'<div class="sec-list">'+cards+'</div></section>';
}

function renderApps(){
  const box=$('#v-apps');
  if(!box)return;
  if(window.NEXUS_PUB&&!window.NEXUS_GUEST){pRender();return}
  const hi=$('#hello');   /* panel önizlemesindeki eski karşılama notu */
  if(hi){
    const n=APPS.length,t=$('#helloTx');
    hi.classList.toggle('off',APPS_FAIL);
    if(t)t.innerHTML=n===0
      ?T('Nexus\'a hoş geldin. Uygulamalar henüz yayında değil; hazır oldukça burada görünecek. Birkaç gün sonra tekrar uğrayabilirsin.')
      :n===1
        ?T('Şu an yayında tek bir uygulama var. Beğenirsen <b>Yükle</b> ile ana ekranına ekle, <b>Aç</b> ile hemen dene. Yenileri geldikçe burada olacak.')
        :T('{n} uygulama burada, tek yerde. Beğendiğini <b>Yükle</b> ile ana ekranına ekleyebilir, <b>Aç</b> ile hemen deneyebilirsin.',{n:n});
  }
  if(!APPS.length){
    box.innerHTML=APPS_FAIL
      ?'<div class="empty"><p>'+T('Uygulama listesi alınamadı. Bağlantını kontrol et.')+'</p><button class="btn btn-pri" type="button" data-act="retry">'+T('Tekrar dene')+'</button></div>'
      :hi?'':'<div class="empty"><p>'+T('Henüz uygulama yok.')+'</p></div>';
    return;
  }
  if(window.NEXUS_GUEST&&typeof gRender==='function'){box.innerHTML=gRender();return}   /* davet sayfası: tek liste (guest.js) */
  box.innerHTML=SECS.map(function(s){
    const list=APPS.filter(function(a){return a.sec===s.id});
    if(!list.length)return '';
    const arch=s.id==='arch';
    const hd=''
    +'<span class="sec-ic">'+svg(s.ic,16)+'</span>'
    +'<h2 class="sec-t">'+esc(secTitle(s))+'</h2>'
    +'<span class="sec-n" aria-label="'+T('{n} uygulama',{n:list.length})+'">'+list.length+'</span>'
    +(arch?'<span class="sec-chev">'+svg(IC_DOWN,16)+'</span>':'');
    const cards='<div class="sec-list">'+list.map(appCard).join('')+'</div>';
    /* Arşiv katlanır, varsayılan kapalı */
    return arch
      ?'<details class="sec sec-'+esc(s.id)+'"><summary class="sec-hd">'+hd+'</summary>'+cards+'</details>'
      :'<section class="sec sec-'+esc(s.id)+'"><div class="sec-hd">'+hd+'</div>'+cards+'</section>';
  }).join('');
}

/* Panel > Bilgi "Simgeler" satırı: ağ ve simge durumu (öğe yoksa hiçbir şey yapmaz) */
function updNet(ok){
  const el=$('#netState');
  if(!el)return;
  el.className='inf-st';
  if(!navigator.onLine){
    el.classList.add('st-off');
    el.textContent=T('Çevrimdışı · kayıtlı simgeler gösteriliyor');
    return;
  }
  if(typeof ok!=='number'){
    if(S.last){el.classList.add('st-on');el.textContent=T('Son yenileme {t}',{t:hhmm(S.last)})}
    else{el.textContent=T('Henüz yenilenmedi')}
    return;
  }
  if(ok===APPS.length){
    el.classList.add('st-on');
    el.textContent=T('Hepsi güncel · {t}',{t:hhmm(S.last)});
  }else if(ok>0){
    el.classList.add('st-part');
    el.textContent=T('{ok}/{n} simge canlı, kalanı kayıtlı',{ok:ok,n:APPS.length});
  }else{
    el.classList.add('st-part');
    el.textContent=T('Canlı simge alınamadı · kayıtlı simgeler gösteriliyor');
  }
}

/* Canlı simgeleri dener; başarısız olan kartta kayıtlı simge kalır */
function loadLive(force){
  if(liveBusy)return;
  if(!force&&Date.now()-liveTry<30000)return;
  if(!navigator.onLine){updNet();return}
  liveBusy=true;
  liveTry=Date.now();
  let ok=0,done=0;
  const total=APPS.length;
  if(!total){liveBusy=false;updNet();return}
  function fin(){
    done++;
    if(done<total)return;
    liveBusy=false;
    if(ok){S.last=Date.now();save()}
    updNet(ok);
  }
  APPS.forEach(function(a){
    const p=new Image();
    p.onload=function(){
      /* Bozuk/minik görsel kayıtlı simgenin yerine geçmesin */
      if(p.naturalWidth>=64&&p.naturalHeight>=64){
        LIVE[a.id]=p.src;
        $$('img[data-ic="'+a.id+'"]').forEach(function(img){
          if(img.getAttribute('src')===p.src)return;
          img.style.opacity='0';
          setTimeout(function(){img.src=p.src;img.classList.add('live');img.style.opacity=''},150);
        });
        ok++;
      }
      fin();
    };
    p.onerror=function(){fin()};
    p.src=liveIconUrl(a);
  });
}
