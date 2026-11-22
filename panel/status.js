'use strict';
/* ============================================================
   panel/status.js · panelde canlı durum + kısa not (yalnızca panel/index.html)
   API: /panel/api/status (Worker uygulamaları sunucudan dener), /panel/api/notes (KV)
   API yoksa tarayıcıdan "no-cors" denemeye düşer (yalnızca ulaşılıyor mu bilir).
   ============================================================ */

let stBusy=false;
let stNotes={};

function stSet(id,cls,txt){
  const el=$('.app-st[data-st="'+id+'"]');
  if(!el)return;
  el.className='app-st '+cls;
  const t=$('.st-tx',el);
  if(t)t.textContent=txt;
}

function stLabel(r){
  if(r.ok)return 'Açılıyor · '+r.ms+' ms';
  if(!r.status)return 'Yanıt yok · '+Math.round(r.ms/1000)+' sn';
  return 'Açılmıyor · HTTP '+r.status;
}

function stFallback(){
  return Promise.all(APPS.map(function(a){
    const c=new AbortController();
    const to=setTimeout(function(){c.abort()},6000);
    const t0=Date.now();
    return fetch(a.url,{mode:'no-cors',cache:'no-store',signal:c.signal}).then(function(){
      stSet(a.id,'st-ok','Ulaşılıyor · '+(Date.now()-t0)+' ms (kod bilinmiyor)');
    }).catch(function(){
      stSet(a.id,'st-bad','Yanıt yok');
    }).then(function(){clearTimeout(to)});
  }));
}

function stCheck(){
  if(stBusy)return Promise.resolve();
  stBusy=true;
  APPS.forEach(function(a){stSet(a.id,'','Kontrol ediliyor…')});
  const b=$('#stBtn');
  if(b)b.disabled=true;
  return fetch('panel/api/status',{credentials:'same-origin',headers:{'x-nexus':'1'}})
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
    .then(function(j){
      (j.items||[]).forEach(function(r){stSet(r.id,r.ok?'st-ok':'st-bad',stLabel(r))});
    })
    .catch(function(){return stFallback()})
    .then(function(){stBusy=false;if(b)b.disabled=false});
}

function stRenderNotes(){
  $$('.app-note').forEach(function(el){
    el.textContent=stNotes[el.dataset.note]||'';
  });
}

function initStatus(){
  const top=$('.hero-top');
  if(top&&!$('#stBtn')){
    const b=document.createElement('button');
    b.id='stBtn';b.type='button';b.className='pill';b.textContent='Durumu yenile';
    b.addEventListener('click',function(){vib(12);stCheck()});
    top.appendChild(b);
  }
  fetch('panel/api/notes',{credentials:'same-origin',headers:{'x-nexus':'1'}})
    .then(function(r){return r.ok?r.json():{notes:{}}})
    .then(function(j){stNotes=j.notes||{};stRenderNotes()})
    .catch(function(){});
  stCheck();
  document.addEventListener('click',function(e){
    const t=e.target.closest('[data-act="note"]');
    if(!t)return;
    const id=t.dataset.id;
    const v=window.prompt('Kısa not (boş bırakırsan silinir):',stNotes[id]||'');
    if(v===null)return;
    fetch('panel/api/notes/'+encodeURIComponent(id),{
      method:'PUT',credentials:'same-origin',
      headers:{'x-nexus':'1','content-type':'application/json'},
      body:JSON.stringify({note:v})
    }).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
      .then(function(j){
        if(j.note)stNotes[id]=j.note;else delete stNotes[id];
        stRenderNotes();toast('Not kaydedildi');
      }).catch(function(){toast('Not kaydedilemedi (KV ayarını kontrol et)')});
  });
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)stCheck();
  });
}
