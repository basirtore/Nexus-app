'use strict';
/* ============================================================
   fx.js · tema (5 seçenek), tıklama sesi, sürüm + son push, ayarlar sayfası
   03-install.js'ten sonra, 04-boot.js'ten önce yüklenir (hem ana sayfa, hem panel, hem davet sayfası).
   Tema = <html data-theme>; yok = cihaza uy. İlk boyamadan önce her sayfanın <head>'indeki
   küçük betik temayı uygular (yanıp sönmesin); burada yalnızca değiştirme ve meta rengi var.
   ============================================================ */

/* GitHub deposu "kullanici/depo" biçiminde. Boşsa "Son push" gösterilmez.
   Depo herkese açık olmalı (gizli depoda GitHub yanıt vermez; son bilinen değer gösterilir). */
const GH_REPO='https://github.com/basirtore/Nexus-app';

const THEME_KEY='nexus.theme';
const THEMES=[
  {id:'auto',t:'Otomatik'},
  {id:'light',t:'Açık'},
  {id:'dark',t:'Koyu'},
  {id:'midnight',t:'Gece'},
  {id:'amoled',t:'Siyah'}
];
const IC_SUN='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';

/* ---------- Tema ---------- */
function themeGet(){
  try{
    const t=localStorage.getItem(THEME_KEY);
    if(THEMES.some(function(o){return o.id===t}))return t;
  }catch(e){}
  return 'auto';
}
function themeName(){
  const id=themeGet();
  const o=THEMES.find(function(x){return x.id===id});
  return o?o.t:'Otomatik';
}
function themeApply(id){
  const h=document.documentElement;
  if(id==='auto')h.removeAttribute('data-theme');else h.setAttribute('data-theme',id);
  const bg=getComputedStyle(h).getPropertyValue('--bg').trim();
  $$('meta[name="theme-color"]').forEach(function(m){
    if(!m.dataset.o)m.dataset.o=m.getAttribute('content');
    m.setAttribute('content',id==='auto'?m.dataset.o:(bg||m.dataset.o));
  });
}
function themeSet(id){
  const h=document.documentElement;
  h.classList.add('tx');                    /* geçiş yumuşak olsun */
  try{if(id==='auto')localStorage.removeItem(THEME_KEY);else localStorage.setItem(THEME_KEY,id)}catch(e){}
  themeApply(id);
  setTimeout(function(){h.classList.remove('tx')},500);
}

/* ---------- Ses (Web Audio, dosya yok) ---------- */
let AC=null;
function actx(){
  try{
    if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}
    if(AC&&AC.state==='suspended')AC.resume();
  }catch(e){}
  return AC;
}
function beep(c,f,t,d,g,type,f2){
  const o=c.createOscillator(),v=c.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.008);
  v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(v);v.connect(c.destination);
  o.start(t);o.stop(t+d+0.03);
}
/* k: tap | open | ok | err | on | off | theme */
function snd(k){
  if(S.snd===false)return;
  const c=actx();
  if(!c)return;
  const t=c.currentTime;
  if(k==='ok'){beep(c,660,t,.16,.07);beep(c,880,t+.09,.16,.07);beep(c,1320,t+.18,.3,.06)}
  else if(k==='err'){beep(c,220,t,.2,.06,'triangle',150);beep(c,170,t+.13,.24,.06,'triangle',110)}
  else if(k==='on'){beep(c,700,t,.09,.06);beep(c,1050,t+.06,.13,.06)}
  else if(k==='off'){beep(c,900,t,.09,.05);beep(c,600,t+.06,.13,.05)}
  else if(k==='theme'){beep(c,480,t,.28,.05,'sine',900)}
  else if(k==='open'){beep(c,520,t,.1,.05);beep(c,780,t+.05,.15,.05)}
  else beep(c,1100,t,.05,.05,'sine',700);
}
/* Her düğme/bağlantı dokunuşunda kısa tık (anahtar satırları kendi sesini change'de çalar) */
document.addEventListener('click',function(e){
  const t=e.target.closest('button,a,summary,[data-act]');
  if(!t||t.disabled||t.dataset.snd==='none')return;
  const a=t.dataset.act;
  snd(t.dataset.snd||(a==='open'||a==='go'?'open':'tap'));
},true);

/* ---------- Tarih ---------- */
const MON=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function fmtDT(ts){
  const d=new Date(ts);
  return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+' · '+hhmm(ts);
}
function fmtShort(ts){
  const d=new Date(ts);
  return d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'')+' · '+hhmm(ts);
}
function ago(ts){
  const m=Math.round((Date.now()-ts)/60000);
  if(m<1)return 'az önce';
  if(m<60)return m+' dk önce';
  const h=Math.round(m/60);
  if(h<48)return h+' sa önce';
  return Math.round(h/24)+' gün önce';
}

/* ---------- Son push (GitHub'dan en son commit zamanı) ---------- */
function ghPush(){
  if(!GH_REPO)return Promise.resolve(0);
  if(S.push&&Date.now()-S.pushAt<600000)return Promise.resolve(S.push);   /* 10 dk önbellek (GitHub sınırı saatte 60) */
  return fetch('https://api.github.com/repos/'+GH_REPO+'/commits?per_page=1',{headers:{accept:'application/vnd.github+json'}})
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
    .then(function(j){
      const c=j&&j[0]&&j[0].commit;
      const d=c&&((c.committer&&c.committer.date)||(c.author&&c.author.date));
      const t=d?Date.parse(d):0;
      if(!t)throw new Error('tarih yok');
      S.push=t;S.pushAt=Date.now();save();
      return t;
    })
    .catch(function(){return S.push||0});
}
/* el'e son push yazar. long=true: tam tarih + "3 sa önce"; false: kısa */
function pushInto(el,long){
  if(!el)return;
  if(!GH_REPO){el.textContent=long?'GitHub deposu tanımlı değil':'';return}
  ghPush().then(function(t){
    if(!t){el.textContent=long?'Alınamadı':'';return}
    el.innerHTML=long
      ?esc(fmtDT(t))+' <small>· '+esc(ago(t))+'</small>'
      :'Son push '+esc(fmtShort(t));
  });
}

/* ---------- Sürüm (çalışan servis çalışanındaki VER) ---------- */
function verInto(el,prefix){
  if(!el||!navigator.serviceWorker)return;
  navigator.serviceWorker.ready.then(function(r){
    if(!r.active)return;
    const ch=new MessageChannel();
    ch.port1.onmessage=function(e){el.innerHTML=(prefix||'')+'<b>'+esc(e.data)+'</b>';el.classList.remove('off')};
    r.active.postMessage('ver',[ch.port2]);
  }).catch(function(){});
}

/* ---------- Ayarlar sayfası (alttan açılan): tema + ses ---------- */
function settingsHTML(){
  const cur=themeGet();
  const tm=THEMES.map(function(o){
    const sw=o.id==='auto'
      ?'<span class="tm-sw tm-auto"><i data-theme="light"></i><i data-theme="dark"></i></span>'
      :'<span class="tm-sw" data-theme="'+o.id+'"></span>';
    return '<button class="tm" type="button" data-act="theme" data-t="'+o.id+'" aria-pressed="'+(o.id===cur)+'">'+sw+'<span>'+o.t+'</span></button>';
  }).join('');
  return ''
    +'<div class="sh-hd"><div class="sh-tt"><h2 id="shTitle" class="sh-title">Görünüm ve ses</h2><p class="sh-sub">Bu cihazda saklanır</p></div>'
    +'<button class="ib" type="button" data-act="close" aria-label="Kapat">'+svg(IC_X,22)+'</button></div>'
    +'<div class="set-h" role="presentation">TEMA</div>'
    +'<div class="tm-grid" role="group" aria-label="Tema">'+tm+'</div>'
    +'<div class="set-h" role="presentation">SES</div>'
    +'<label class="sw-row"><span class="sw-tx">Tıklama sesi<small>Düğmelerde ve bildirimlerde kısa ses</small></span>'
    +'<input class="sw" type="checkbox" name="snd"'+(S.snd!==false?' checked':'')+'></label>';
}
function openSettings(){
  $('#sheetBody').innerHTML=settingsHTML();
  sheetShow();
}
function bindLive(){
  $$('[data-bind="theme"]').forEach(function(el){el.textContent=themeName()});
  $$('[data-bind="snd"]').forEach(function(el){el.textContent=S.snd===false?'Kapalı':'Açık'});
}

document.addEventListener('click',function(e){
  const t=e.target.closest('[data-act]');
  if(!t)return;
  if(t.dataset.act==='set'){vib(12);openSettings()}
  else if(t.dataset.act==='theme'){
    vib(10);
    themeSet(t.dataset.t);
    $$('.tm').forEach(function(b){b.setAttribute('aria-pressed',b===t?'true':'false')});
    bindLive();
    snd('theme');
  }
});
document.addEventListener('change',function(e){
  const t=e.target;
  if(!t||t.name!=='snd')return;
  if(t.checked){S.snd=true;save();snd('on')}
  else{snd('off');S.snd=false;save()}
  bindLive();
  vib(10);
});

themeApply(themeGet());
