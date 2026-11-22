'use strict';
/* guest.js · davet sayfası (guest.html): 01-core.js'teki loadApps'ı, yalnız linkte seçilen
   uygulamaları /api/g/<kod>'dan alacak şekilde değiştirir; karşılama notu, süre ve tek kullanımlık
   bilgisini gösterir. 01-core.js'ten sonra, 04-boot.js'ten önce yüklenir.
   Ayrı dosya olduğu için servis çalışanının eski önbelleğinden etkilenmez. */
const G_IC_CLOCK='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
const G_IC_MAIL='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>';
const G_IC_ONCE='<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>';
const G_IC_INF='<path d="M7 12c0-2 1.5-4 3.5-4s3 3 3.5 4 1.5 4 3.5 4 3.5-2 3.5-4-1.5-4-3.5-4-3 3-3.5 4-1.5 4-3.5 4S7 14 7 12z"/>';
function gLeft(exp){
  const m=Math.round((exp-Date.now())/60000);
  if(m<=0)return 'Süresi doldu';
  if(m<60)return m+' dk geçerli';
  if(m<1440)return Math.round(m/60)+' sa geçerli';
  return Math.round(m/1440)+' gün geçerli';
}
function gChip(ic,t){return '<span class="chip">'+svg(ic,14)+esc(t)+'</span>'}
loadApps=function(){
  const code=location.pathname.split('/')[2]||'';
  return fetch('/api/g/'+encodeURIComponent(code),{cache:'no-store'}).then(function(r){
    if(!r.ok)throw new Error('davet '+r.status);
    return r.json();
  }).then(function(j){
    APPS=(j.apps||[]).filter(function(a){return a&&a.id&&a.url});
    const w=document.getElementById('welcome');
    if(w&&j.note){
      w.innerHTML='<span class="g-note-lb">'+svg(G_IC_MAIL,16)+'SANA ÖZEL NOT</span>'+esc(j.note);
      w.classList.remove('off');
    }
    const sub=document.getElementById('gSub');
    if(sub)sub.textContent=APPS.length>1?APPS.length+' uygulama seninle paylaşıldı. Aç ya da ana ekrana ekle.':'Bir uygulama seninle paylaşıldı. Aç ya da ana ekrana ekle.';
    const ch=document.getElementById('gChips');
    if(ch){
      ch.innerHTML=(j.exp?gChip(G_IC_CLOCK,gLeft(j.exp)):gChip(G_IC_INF,'Süresiz link'))
        +(j.once?gChip(G_IC_ONCE,'Tek kullanımlık · sayfayı yenileme'):'');
    }
  });
};
