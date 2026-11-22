'use strict';
/* ============================================================
   02-apps.js · bölümler + uygulama kartları + canlı simge çekme
   Akış: kart önce kayıtlı (yerel) simgeyle çizilir, sonra canlı simge
   arka planda yüklenir; yüklenirse değişir, yüklenemezse kayıtlı kalır.
   ============================================================ */

let liveTry=0;      /* son canlı deneme zamanı (art arda denemeyi sınırlar) */
let liveBusy=false;

function localIcon(a){return a.iconLocal||('icons/apps/'+a.id+'.png')}

/* Saatlik önbellek kırıcı: simge değişirse en geç 1 saatte görünür */
function liveIconUrl(a){
  const sep=a.icon.indexOf('?')>=0?'&':'?';
  return a.url+a.icon+sep+'h='+Math.floor(Date.now()/3600000);
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
  const badge=(a.badge&&!arch)?'<span class="badge">'+esc(a.badge)+'</span>':'';
  const add=arch?'':'<button class="ib app-add" type="button" data-act="install" data-id="'+esc(a.id)+'" aria-label="'+esc(a.name)+' nasıl yüklenir">'+svg(IC_ADD,22)+'</button>';
  return ''
  +'<article class="app'+(arch?' arch':'')+'" data-id="'+esc(a.id)+'">'
  +  '<img class="app-ic" src="'+esc(localIcon(a))+'" alt="" width="48" height="48" data-ic="'+esc(a.id)+'">'
  +  '<div class="app-bd">'
  +    '<h3 class="app-nm"><a class="app-open" href="'+esc(a.url)+'" target="_blank" rel="noopener" data-act="open">'+esc(a.name)+'</a>'+badge+'</h3>'
  +    '<p class="app-ds">'+esc(a.desc)+'</p>'
  +  '</div>'
  +  '<div class="app-ac">'+add+(window.NEXUS_GUEST?'<span class="app-cta">Aç</span>':svg(IC_GO,16,'app-go'))+'</div>'
  +'</article>';
}

function renderApps(){
  const box=$('#v-apps');
  if(!box)return;
  if(!APPS.length){
    box.innerHTML=APPS_FAIL
      ?'<div class="empty"><p>Uygulama listesi alınamadı. Bağlantını kontrol et.</p><button class="btn btn-pri" type="button" data-act="retry">Tekrar dene</button></div>'
      :'<div class="empty"><p>Henüz uygulama yok.</p></div>';
    return;
  }
  box.innerHTML=SECS.map(function(s){
    const list=APPS.filter(function(a){return a.sec===s.id});
    if(!list.length)return '';
    const arch=s.id==='arch';
    const hd=''
    +'<span class="sec-ic">'+svg(s.ic,16)+'</span>'
    +'<h2 class="sec-t">'+esc(s.title)+'</h2>'
    +'<span class="sec-n" aria-label="'+list.length+' uygulama">'+list.length+'</span>'
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
    el.textContent='Çevrimdışı · kayıtlı simgeler gösteriliyor';
    return;
  }
  if(typeof ok!=='number'){
    if(S.last){el.classList.add('st-on');el.textContent='Son yenileme '+hhmm(S.last)}
    else{el.textContent='Henüz yenilenmedi'}
    return;
  }
  if(ok===APPS.length){
    el.classList.add('st-on');
    el.textContent='Hepsi güncel · '+hhmm(S.last);
  }else if(ok>0){
    el.classList.add('st-part');
    el.textContent=ok+'/'+APPS.length+' simge canlı, kalanı kayıtlı';
  }else{
    el.classList.add('st-part');
    el.textContent='Canlı simge alınamadı · kayıtlı simgeler gösteriliyor';
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
    const img=$('img[data-ic="'+a.id+'"]');
    if(!img){fin();return}
    const p=new Image();
    p.onload=function(){
      /* Bozuk/minik görsel kayıtlı simgenin yerine geçmesin */
      if(p.naturalWidth>=64&&p.naturalHeight>=64){
        img.style.opacity='0';
        setTimeout(function(){img.src=p.src;img.classList.add('live');img.style.opacity=''},150);
        ok++;
      }
      fin();
    };
    p.onerror=function(){fin()};
    p.src=liveIconUrl(a);
  });
}
