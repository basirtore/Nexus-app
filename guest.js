'use strict';
/* guest.js · davet sayfası (guest.html): 01-core.js'teki loadApps'ı, yalnız linkte seçilen
   uygulamaları /api/g/<kod>'dan alacak şekilde değiştirir; karşılama notu, süre ve tek kullanımlık
   bilgisini gösterir. 01-core.js'ten sonra, 04-boot.js'ten önce yüklenir.
   Ayrı dosya olduğu için servis çalışanının eski önbelleğinden etkilenmez. */
const G_IC_CLOCK='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
const G_IC_MAIL='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>';
const G_IC_ONCE='<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>';
const G_IC_USER='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>';
const G_IC_OK='<path d="M5 12.5l4.5 4.5L19 7.5"/>';
const G_IC_GRID='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
const G_IC_INF='<path d="M7 12c0-2 1.5-4 3.5-4s3 3 3.5 4 1.5 4 3.5 4 3.5-2 3.5-4-1.5-4-3.5-4-3 3-3.5 4-1.5 4-3.5 4S7 14 7 12z"/>';
function gLeft(exp){
  const m=Math.round((exp-Date.now())/60000);
  if(m<=0)return T('Süresi doldu');
  if(m<60)return T('{n} dk geçerli',{n:m});
  if(m<1440)return T('{n} sa geçerli',{n:Math.round(m/60)});
  return T('{n} gün geçerli',{n:Math.round(m/1440)});
}
function gChip(ic,t){return '<span class="chip">'+svg(ic,14)+esc(t)+'</span>'}
/* Tek liste: kartlar 02-apps.js'teki appCard ile çizilir (canlı simge çekme çalışsın diye), her karta bölüm etiketi eklenir.
   02-apps.js renderApps bu sayfada gRender'ı çağırır. */
function gRender(){
  const n=APPS.length;
  const hd='<div class="g-sh"><span class="g-sh-ic">'+svg(G_IC_GRID,22)+'</span><h2 class="g-sh-t">'+T('Sana özel uygulamalar')+'</h2>'
    +'<span class="g-cnt">'+T('{n} Uygulama',{n:n})+'</span></div>';
  const cards=APPS.map(function(a){
    const s=SECS.filter(function(x){return x.id===a.sec})[0]||SECS[0];
    return appCard(a).replace('</p></div>','</p><span class="g-tag">'+svg(s.ic,13)+esc(secTitle(s))+'</span></div>');
  }).join('');
  return '<section class="sec">'+hd+'<div class="sec-list">'+cards+'</div></section>';
}
/* Davet yanıtı bellekte tutulur: dil değişince yeniden istek atılmaz (her istek bir kullanım hakkı düşer) */
let G_RES=null;
function gMeta(){
  const j=G_RES;
  if(!j)return;
  const w=document.getElementById('welcome');
  if(w&&j.note){
    w.innerHTML='<span class="g-note-ic">'+svg(G_IC_MAIL,30)+'</span>'
      +'<div class="g-note-bd"><span class="g-note-lb">'+T('SANA ÖZEL MESAJ')+'</span><p class="g-note-tx">'+esc(j.note)+'</p>'
      +'<span class="g-note-by">'+svg(G_IC_USER,14)+T('Nexus tarafından gönderildi')+'</span></div>'
      +'<span class="g-note-ok">'+svg(G_IC_OK,14)+T('Özel')+'</span>';
    w.classList.remove('off');
  }
  const sub=document.getElementById('gSub');
  if(sub)sub.textContent=T(APPS.length>1?'Nexus tarafından seninle özel olarak paylaşılan uygulamalar.':'Nexus tarafından seninle özel olarak paylaşılan uygulama.');
  const ch=document.getElementById('gChips');
  if(ch){
    ch.innerHTML=(j.exp?gChip(G_IC_CLOCK,gLeft(j.exp)):gChip(G_IC_INF,T('Süresiz erişim')))
      +(j.max===1||(!j.max&&j.once)?gChip(G_IC_ONCE,T('Tek kullanımlık · sayfayı yenileme'))
        :j.max>1?gChip(G_IC_ONCE,(j.left>0?T('{n} hak kaldı',{n:j.left}):T('Son hak'))+' · '+T('yenileme hak harcar')):'');
  }
}
window.addEventListener('nx:lang',gMeta);
loadApps=function(){
  const code=location.pathname.split('/')[2]||'';
  return fetch('/api/g/'+encodeURIComponent(code),{cache:'no-store'}).then(function(r){
    if(!r.ok)throw new Error('davet '+r.status);
    return r.json();
  }).then(function(j){
    setSecs(j.secs);
    APPS=(j.apps||[]).filter(function(a){return a&&a.id&&a.url});
    window.APKURL=j.apk||{};   /* yalnız davetliye verilen, kısa ömürlü APK indirme adresleri */
    G_RES=j;
    gMeta();
  });
};
