'use strict';
/* ============================================================
   panel/invites.js · panelde "Davet linkleri" bölümü (yalnızca panel/index.html)
   API: /panel/api/invites (worker.js). 04-boot.js uygulamalar çizilince initInvites() çağırır.
   ============================================================ */

const INV_TTL=[
  {s:3600,l:'1 saat'},{s:86400,l:'1 gün'},{s:604800,l:'7 gün'},{s:0,l:'Süresiz'}
];
let invItems=[];

function invApi(method,path,body){
  const h={'x-nexus':'1'};
  if(body)h['content-type']='application/json';
  return fetch('panel/api/invites'+(path||''),{method:method,headers:h,credentials:'same-origin',body:body?JSON.stringify(body):undefined})
    .then(function(r){
      return r.json().catch(function(){return {}}).then(function(j){
        if(!r.ok){const e=new Error(j.error||('http '+r.status));e.code=j.error||r.status;throw e}
        return j;
      });
    });
}

function invErr(e){
  const c=e&&e.code;
  if(c==='not_configured'||c==='no_kv'||c===503)return 'Davet servisi hazır değil (KV ve Access ayarları, bkz. harita bölüm 8-9).';
  if(c===403)return 'Erişim reddedildi. Access ile giriş yaptığından emin ol.';
  if(c===404||c==='not_found')return 'Davet servisi bulunamadı (Worker dağıtılmamış olabilir).';
  if(c==='once_needs_single')return 'Tek kullanımlık link yalnızca tek uygulama için.';
  if(c==='bad_apps')return 'En az bir uygulama seç.';
  return 'İşlem başarısız. Bağlantını kontrol et.';
}

function invLeft(v){
  if(!v.exp)return 'Süresiz';
  const ms=v.exp-Date.now();
  if(ms<=0)return 'Süresi doldu';
  const m=Math.round(ms/60000);
  if(m<60)return m+' dk kaldı';
  const h=Math.round(m/60);
  if(h<48)return h+' sa kaldı';
  return Math.round(h/24)+' gün kaldı';
}

function invUrl(t){return location.origin+'/i/'+t}

function invRender(){
  const box=$('#invList');
  if(!box)return;
  if(!invItems.length){box.innerHTML='<p class="empty">Aktif davet linki yok.</p>';return}
  box.innerHTML=invItems.map(function(v){
    const names=v.apps.map(function(id){
      const a=APPS.find(function(x){return x.id===id});
      return esc(a?a.name:id);
    }).join(', ');
    return '<div class="inv-it">'
      +'<div class="inv-tx"><b>'+names+'</b>'
      +'<span class="inv-meta">'+esc(invLeft(v))+(v.once?' · tek kullanımlık':'')+(v.apps.length>1?' · paket':'')+'</span>'
      +(v.note?'<span class="inv-note">'+esc(v.note)+'</span>':'')+'</div>'
      +'<div class="inv-ac">'
      +'<button class="btn btn-sec" type="button" data-inv="copy" data-t="'+esc(v.token)+'">Kopyala</button>'
      +'<button class="btn btn-sec" type="button" data-inv="del" data-t="'+esc(v.token)+'">İptal</button>'
      +'</div></div>';
  }).join('');
}

function invLoad(){
  const box=$('#invList');
  return invApi('GET').then(function(j){invItems=j.items||[];invRender()})
    .catch(function(e){if(box)box.innerHTML='<p class="empty">'+esc(invErr(e))+'</p>'});
}

function invCopy(t){
  const u=invUrl(t);
  const ok=function(){toast('Link kopyalandı');vib(12)};
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(u).then(ok).catch(function(){window.prompt('Linki kopyala:',u)});
  }else window.prompt('Linki kopyala:',u);
}

function initInvites(){
  const sec=$('#invites');
  if(!sec||sec.dataset.ready)return;
  sec.dataset.ready='1';
  const checks=APPS.map(function(a){
    return '<label class="inv-ck"><input type="checkbox" name="app" value="'+esc(a.id)+'"><span>'+esc(a.name)+(a.public===false?' <i class="badge badge-priv">Gizli</i>':'')+'</span></label>';
  }).join('');
  const ttl=INV_TTL.map(function(o,i){return '<option value="'+o.s+'"'+(i===1?' selected':'')+'>'+o.l+'</option>'}).join('');
  sec.innerHTML=''
    +'<div class="sec-hd"><span class="sec-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></span>'
    +'<div class="sec-tx"><h2 class="sec-t">Davet linkleri</h2><p class="sec-s">Süreli, tek kullanımlık ya da paket</p></div></div>'
    +'<form id="invForm" class="inv-form card-in">'
    +'<fieldset class="inv-fs"><legend>Uygulama (birden fazlası = paket link)</legend>'+checks+'</fieldset>'
    +'<div class="inv-row"><label class="inv-lb">Süre<select id="invTtl" class="inv-in">'+ttl+'</select></label>'
    +'<label class="inv-ck"><input id="invOnce" type="checkbox"><span>Tek kullanımlık</span></label></div>'
    +'<label class="inv-lb">Karşılama notu (isteğe bağlı)<input id="invNote" class="inv-in" type="text" maxlength="140" placeholder="Merhaba, denemen için…"></label>'
    +'<button class="btn btn-pri" type="submit">Link oluştur</button>'
    +'</form>'
    +'<h3 class="inv-h">Aktif linkler</h3><div id="invList" class="inv-list"><p class="empty">Yükleniyor…</p></div>';

  const form=$('#invForm');
  const once=$('#invOnce');
  function sync(){
    const n=$$('input[name="app"]:checked',form).length;
    once.disabled=n>1;
    if(n>1)once.checked=false;
  }
  form.addEventListener('change',sync);
  form.addEventListener('submit',function(e){
    e.preventDefault();
    const apps=$$('input[name="app"]:checked',form).map(function(x){return x.value});
    if(!apps.length){toast('En az bir uygulama seç');return}
    const btn=$('button[type=submit]',form);
    btn.disabled=true;
    invApi('POST','',{apps:apps,ttl:Number($('#invTtl').value),once:once.checked,note:$('#invNote').value})
      .then(function(j){
        invCopy(j.token);
        $('#invNote').value='';
        return invLoad();
      })
      .catch(function(err){toast(invErr(err))})
      .then(function(){btn.disabled=false});
  });
  sec.addEventListener('click',function(e){
    const b=e.target.closest('[data-inv]');
    if(!b)return;
    const t=b.dataset.t;
    if(b.dataset.inv==='copy'){invCopy(t);return}
    if(b.dataset.inv==='del'){
      b.disabled=true;
      invApi('DELETE','/'+encodeURIComponent(t)).then(function(){
        vib(12);toast('Link iptal edildi');return invLoad();
      }).catch(function(err){b.disabled=false;toast(invErr(err))});
    }
  });
  sync();
  invLoad();
}
