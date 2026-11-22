'use strict';
/* panel/panel.js · yan menü + Uygulamalar (Cloudflare Worker listesi, düzenleme) + Herkese açık (kaydet/geri al) + davet linkleri + durum + bilgi (yalnız panelde, sw önbelleğinde yok) */
(function(){
  const box=document.getElementById('adm');
  if(!box)return;
  function api(m,p,b){
    return fetch('/api/'+p,{method:m,headers:b?{'content-type':'application/json'}:{},body:b?JSON.stringify(b):undefined,cache:'no-store'})
    .then(function(r){if(r.status===401){location.href='/panel/login';throw 0}return r.json().catch(function(){throw new Error('sunucu '+r.status)})});
  }
  function left(L){
    if(!L.exp)return 'süresiz';
    const m=Math.round((L.exp-Date.now())/60000);
    if(m<=0)return 'doldu';
    return m<60?m+' dk':m<1440?Math.round(m/60)+' sa':Math.round(m/1440)+' gün';
  }
  function name(id){const a=APPS.find(function(x){return x.id===id});return a?a.name:id}
  function hd(ic,t){
    return '<div class="sec-hd"><span class="sec-ic">'+svg(ic,16)+'</span><h2 class="sec-t">'+t+'</h2></div>';
  }
  /* ---------- Uygulamalar: Cloudflare Worker listesi + düzenleme ---------- */
  let wk=[],wkSnap={},wkLoaded=false,wkBar=null,wkSaving=false;
  const SECN=[['life','Yaşam ve Sağlık'],['trade','Trader Araçları'],['arch','Arşiv']];
  function barFlag(){document.documentElement.classList.toggle('has-bar',$$('.savebar.show').length>0)}
  function wkRow(it){
    const w=esc(it.w);
    const chips=(it.isNew?'<i class=\"badge badge-new\">Yeni</i>':'')+(it.self?'<i class=\"badge\">Bu Nexus</i>':'')+(it.miss?'<i class=\"badge badge-priv\">Cloudflare\'de yok</i>':'');
    const opts=SECN.map(function(s){return '<option value=\"'+s[0]+'\"'+(it.sec===s[0]?' selected':'')+'>'+esc(s[1])+'</option>'}).join('');
    return '<div class=\"wk\" data-w=\"'+w+'\">'
    +'<label class=\"sw-row\"><span class=\"sw-tx\">'+esc(it.name||it.w)+chips+'<small>'+w+'</small></span>'
    +'<input class=\"sw\" type=\"checkbox\" data-f=\"show\"'+(it.show?' checked':'')+' aria-label=\"'+w+' Nexus\'ta görünsün\"></label>'
    +'<details class=\"wk-more\"><summary>Düzenle</summary><div class=\"wk-f\">'
    +'<label class=\"inv-lb\">Ad<input class=\"inv-in\" data-f=\"name\" type=\"text\" maxlength=\"40\" placeholder=\"'+w+'\" value=\"'+esc(it.name)+'\"></label>'
    +'<label class=\"inv-lb\">Açıklama<input class=\"inv-in\" data-f=\"desc\" type=\"text\" maxlength=\"140\" value=\"'+esc(it.desc)+'\"></label>'
    +'<div class=\"inv-row\"><label class=\"inv-lb\">Bölüm<select class=\"inv-in\" data-f=\"sec\">'+opts+'</select></label>'
    +'<label class=\"inv-lb\">Rozet<input class=\"inv-in\" data-f=\"badge\" type=\"text\" maxlength=\"16\" value=\"'+esc(it.badge)+'\"></label></div>'
    +'</div></details></div>';
  }
  function wkCollect(){
    return $$('.wk',box).map(function(r){
      const g=function(f){const e=$('[data-f=\"'+f+'\"]',r);return e?(e.type==='checkbox'?e.checked:e.value):''};
      return {w:r.dataset.w,show:g('show'),name:g('name'),desc:g('desc'),sec:g('sec'),badge:g('badge')};
    });
  }
  function wkChanged(){return wkCollect().filter(function(x){return JSON.stringify(x)!==wkSnap[x.w]})}
  function wkSync(){
    if(!wkBar)return;
    const ch=wkChanged();
    $$('.wk',box).forEach(function(r){r.classList.toggle('chg',ch.some(function(x){return x.w===r.dataset.w}))});
    const show=cur==='uyg'&&ch.length>0;
    wkBar.classList.toggle('show',show);
    wkBar.inert=!show;
    barFlag();
    if(ch.length)$('#wkTx').innerHTML=ch.length+' değişiklik<small>Henüz kaydedilmedi</small>';
  }
  function wkRender(){
    const el=$('#wkList');
    if(!el)return;
    el.innerHTML=wk.length?wk.map(wkRow).join(''):'<p class=\"inf-note\">Worker bulunamadı.</p>';
    wkSnap={};
    wkCollect().forEach(function(x){wkSnap[x.w]=JSON.stringify(x)});
    wkSync();
  }
  function wkLoad(force){
    const el=$('#wkList');
    if(!el||(wkLoaded&&!force))return;
    wkLoaded=true;
    el.innerHTML='<p class=\"inf-note\">Yükleniyor…</p>';
    api('GET','workers').then(function(j){
      wk=j.items||[];
      const n=wk.filter(function(x){return x.isNew}).length;
      $('#wkMsg').innerHTML=(j.err?'<p class=\"wk-err\">Cloudflare\'e ulaşılamadı: '+esc(j.err)+'<br>Son bilinen liste gösteriliyor.</p>':'')
        +(n?'<p class=\"sec-note\">'+n+' yeni Worker var.</p>':'');
      wkRender();
    }).catch(function(e){
      wkLoaded=false;
      el.innerHTML='<p class=\"wk-err\">Liste alınamadı'+(e&&e.message?': '+esc(e.message):'')+'. Bağlantını kontrol et.</p>';
    });
  }
  function wkSave(){
    if(wkSaving)return;
    const btn=$('[data-wk=save]',wkBar);
    wkSaving=true;
    btn.disabled=true;
    btn.textContent='Kaydediliyor…';
    api('POST','apps',{items:wkCollect(),seen:wk.map(function(x){return x.w})}).then(function(j){
      if(!j.ok){toast(j.e||'Kaydedilemedi','err');return}
      try{sessionStorage.setItem('nx.msg','1')}catch(e){}
      location.reload();   /* APPS ve diğer görünümler yeni listeyle yeniden kurulur */
    }).catch(function(){toast('Kaydedilemedi','err','Bağlantını kontrol et')})
      .then(function(){wkSaving=false;btn.disabled=false;btn.textContent='Kaydet'});
  }
  function wkInit(){
    wkBar=document.createElement('div');
    wkBar.id='saveBar2';
    wkBar.className='savebar';
    wkBar.setAttribute('role','region');
    wkBar.setAttribute('aria-label','Kaydedilmemiş değişiklikler');
    wkBar.inert=true;
    wkBar.innerHTML='<div class=\"savebar-tx\" id=\"wkTx\"></div>'
      +'<button class=\"btn btn-sec\" type=\"button\" data-wk=\"undo\">Geri al</button>'
      +'<button class=\"btn btn-pri\" type=\"button\" data-wk=\"save\">Kaydet</button>';
    document.body.appendChild(wkBar);
    wkBar.addEventListener('click',function(e){
      const t=e.target.closest('[data-wk]');
      if(!t)return;
      if(t.dataset.wk==='save')wkSave();
      else{wkRender();toast('Değişiklikler geri alındı');vib(12)}
    });
    box.addEventListener('input',function(e){if(e.target.closest&&e.target.closest('.wk'))wkSync()});
    box.addEventListener('change',function(e){if(e.target.closest&&e.target.closest('.wk'))wkSync()});
    try{if(sessionStorage.getItem('nx.msg')){sessionStorage.removeItem('nx.msg');setTimeout(function(){toast('Kaydedildi','ok','Liste güncellendi')},400)}}catch(e){}
  }

  /* ---------- Yan menü (hamburger): kategoriler + sayaçlar ---------- */
  const IC_APPS='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
  const IC_GLOBE='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>';
  const IC_LINK='<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>';
  const IC_PULSE='<path d="M3 12h4l3-8 4 16 3-8h4"/>';
  const IC_INFO='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>';
  const IC_HOME='<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>';
  const IC_OUT='<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>';
  const IC_CLOSE='<path d="M6 6l12 12M18 6L6 18"/>';
  const IC_PUSH='<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>';
  const IC_IMG='<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/>';
  const IC_SND='<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>';
  const TITLES={'':'Nexus',uyg:'Uygulamalar',acik:'Herkese açık',davet:'Davet linkleri',durum:'Uygulama durumu',bilgi:'Bilgi'};
  let cur='',drFrom=null;
  let pubSync=function(){};   /* build() içinde tanımlanır: kaydet çubuğunu gösterir/gizler */
  function tx(sel,t){const e=$(sel);if(e)e.textContent=t}
  function item(v,t,ic,cnt){
    return '<button class="dr-it" type="button" data-act="nav" data-v="'+v+'">'+svg(ic,22)+'<span>'+t+'</span>'+(cnt?'<span class="dr-n" data-cnt="'+cnt+'"></span>':'')+'</button>';
  }
  function buildDrawer(){
    const d=$('#drawerBody');
    if(!d)return;
    d.innerHTML=''
    +'<div class="dr-hd"><img class="dr-logo" src="icons/icon-192.png" alt="" width="36" height="36">'
    +'<div class="dr-tt"><div class="dr-nm">Nexus</div><div class="dr-sub">PANEL</div></div>'
    +'<button class="ib dr-x" type="button" data-act="mclose" aria-label="Kapat">'+svg(IC_CLOSE,22)+'</button></div>'
    +'<div class="dr-sum"><div class="dr-big" id="drBig"></div><div class="dr-small" id="drSm"></div></div>'
    +'<div class="dr-lb">NEXUS</div>'
    +item('','Önizleme',IC_APPS,'')
    +'<div class="dr-lb">YÖNETİM</div>'
    +item('uyg','Uygulamalar',IC_PUSH,'apps')
    +item('acik','Herkese açık',IC_GLOBE,'pub')
    +item('davet','Davet linkleri',IC_LINK,'davet')
    +item('durum','Uygulama durumu',IC_PULSE,'')
    +'<div class="dr-sys"><div class="dr-lb">SİSTEM</div>'
    +item('bilgi','Bilgi',IC_INFO,'')
    +'<a class="dr-it" href="/">'+svg(IC_HOME,22)+'<span>Ana sayfayı gör</span></a>'
    +'<button class="dr-it" type="button" data-act="mout">'+svg(IC_OUT,22)+'<span>Çıkış</span></button></div>';
  }
  function counts(){
    const n=APPS.length,p=APPS.filter(function(a){return a.pub}).length;
    tx('#drBig',n+' uygulama');
    tx('#drSm',p+' herkese açık · '+(n-p)+' gizli');
    tx('[data-cnt="apps"]',n);
    tx('[data-cnt="pub"]',p);
  }
  function openDr(){
    const d=$('#drawer');
    if(!d)return;
    drFrom=document.activeElement;
    d.classList.add('open');
    d.setAttribute('aria-hidden','false');
    const app=$('#app');
    if(app)app.inert=true;
    document.documentElement.classList.add('lock');
    const f=$('#drawerBody .dr-it[aria-current]')||$('#drawerBody .dr-it');
    if(f)f.focus({preventScroll:true});
  }
  function closeDr(){
    const d=$('#drawer');
    if(!d||!d.classList.contains('open'))return;
    d.classList.remove('open');
    d.setAttribute('aria-hidden','true');
    const app=$('#app');
    if(app)app.inert=false;
    document.documentElement.classList.remove('lock');
    if(drFrom&&drFrom.focus){try{drFrom.focus({preventScroll:true})}catch(e){}}
    drFrom=null;
  }
  /* 04-boot.js route() her görünüm değişiminde çağırır: v = '' (Uygulamalar) | acik | davet | durum | bilgi */
  window.panelView=function(v){
    cur=v||'';
    tx('#topTitle',TITLES[cur]||'Nexus');
    $$('[data-v]',box).forEach(function(s){s.classList.toggle('off',s.dataset.v!==cur)});
    $$('#drawerBody .dr-it[data-v]').forEach(function(b){
      if(b.dataset.v===cur)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    counts();
    pubSync();
    wkSync();
    if(cur==='uyg')wkLoad(false);
    if(cur==='bilgi')pushInto($('#kvPush'),true);
    closeDr();
  };
  document.addEventListener('click',function(e){
    const t=e.target.closest('[data-act]');
    if(!t)return;
    const a=t.dataset.act;
    if(a==='menu'){vib(12);openDr()}
    else if(a==='mclose'){closeDr()}
    else if(a==='nav'){closeDr();location.hash=t.dataset.v}
    else if(a==='mout'){api('POST','logout',{}).then(function(){location.href='/'})}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDr()});
  buildDrawer();

  let done=false,relist=null;
  /* Yönet ilk açılınca bir kez çizilir (APPS hazır); sonraki açılışta yalnız link listesi yenilenir */
  window.initAdmin=function(){
    if(done){if(relist)relist();return}
    done=true;
    build();
  };
  function build(){
  const checks=APPS.map(function(a){
    return '<label class="inv-ck"><input type="checkbox" name="ap" value="'+esc(a.id)+'"><span>'+esc(a.name)+' <i class="badge badge-priv'+(a.pub?' off':'')+'" data-bd="'+esc(a.id)+'">Gizli</i></span></label>';
  }).join('');
  const pubs=APPS.map(function(a){
    return '<label class="sw-row" data-id="'+esc(a.id)+'"><img class="sw-ic" src="'+esc(localIcon(a))+'" alt="" width="40" height="40">'
    +'<span class="sw-tx">'+esc(a.name)+'<small>'+esc(a.desc||'')+'</small></span>'
    +'<input class="sw" type="checkbox" name="pb" value="'+esc(a.id)+'"'+(a.pub?' checked':'')+' aria-label="'+esc(a.name)+' herkese açık"></label>';
  }).join('');
  function kv(ic,k,v,btn){
    const bd='<span class="kv-ic">'+svg(ic,20)+'</span><span class="kv-bd"><span class="kv-k">'+k+'</span><div class="kv-v">'+v+'</div></span>';
    return btn?'<button class="kv-r" type="button" data-act="set">'+bd+'<span class="kv-go">'+svg(IC_GO,16)+'</span></button>':'<div class="kv-r">'+bd+'</div>';
  }
  box.innerHTML=''
  +'<section class="sec" data-v="uyg">'+hd(IC_APPS,'Uygulamalar')
  +'<p class="sec-note">Cloudflare hesabındaki Worker\'lar. Nexus\'ta görünsün istediklerini aç; ad boş bırakılırsa Worker adı görünür. Değişiklikler Kaydet\'e basınca uygulanır.</p>'
  +'<div id="wkMsg"></div><div class="sw-list" id="wkList"></div>'
  +'<div class="adm-row"><button class="btn btn-sec" type="button" data-adm="wk">Listeyi yenile</button></div></section>'
  +'<section class="sec" data-v="acik">'+hd(IC_GLOBE,'Herkese açık')
  +'<p class="sec-note">Açtıkların ana sayfada herkese görünür. Kapalılar gizli kalır, yalnız davet linkiyle verilir. Değişiklikler Kaydet\'e basınca uygulanır.</p>'
  +'<div class="sw-list" id="pbList">'+pubs+'</div></section>'
  +'<section class="sec" data-v="davet">'+hd(IC_LINK,'Davet linkleri')
  +'<form id="admF" class="inv-form">'
  +'<fieldset class="inv-fs"><legend>Uygulama (birden fazlası = paket link)</legend>'+checks+'</fieldset>'
  +'<div class="inv-row"><label class="inv-lb">Süre<select id="admH" class="inv-in"><option value="1">1 saat</option><option value="24" selected>1 gün</option><option value="168">7 gün</option><option value="0">Süresiz</option></select></label>'
  +'<label class="inv-ck"><input type="checkbox" id="admO"><span>Tek kullanımlık</span></label></div>'
  +'<label class="inv-lb">Karşılama notu (isteğe bağlı)<input id="admN" class="inv-in" type="text" maxlength="120" placeholder="Merhaba, denemen için…"></label>'
  +'<button class="btn btn-pri" type="submit">Link oluştur</button>'
  +'</form>'
  +'<div id="admR" class="adm-res"></div>'
  +'<h3 class="inv-h">Aktif linkler</h3><div id="admL" class="inv-list"></div></section>'
  +'<section class="sec" data-v="durum">'+hd(IC_PULSE,'Uygulama durumu')
  +'<div id="admS"></div>'
  +'<div class="adm-row"><button class="btn btn-sec" type="button" data-adm="st">Durumu yenile</button></div></section>'
  +'<section class="sec" data-v="bilgi">'+hd(IC_INFO,'Bilgi')
  +'<div class="info-hero"><img class="info-logo" src="icons/icon-192.png" alt="" width="56" height="56"><div><div class="info-nm">Nexus</div><span id="nxVer" class="ver lg off"></span></div></div>'
  +'<div class="kv">'
  +kv(IC_PUSH,'SON PUSH','<span id="kvPush"></span>')
  +kv(IC_IMG,'SİMGELER','<p id="netState" class="inf-st" role="status"></p>')
  +kv(IC_SUN,'TEMA','<span data-bind="theme"></span>',true)
  +kv(IC_SND,'TIKLAMA SESİ','<span data-bind="snd"></span>',true)
  +'</div></section>';

  /* Kaydet / geri al çubuğu (Herkese açık): değişiklik olunca altta çıkar */
  let savedPub=APPS.filter(function(a){return a.pub}).map(function(a){return a.id});
  let saving=false;
  const bar=document.createElement('div');
  bar.id='saveBar';
  bar.className='savebar';
  bar.setAttribute('role','region');
  bar.setAttribute('aria-label','Kaydedilmemiş değişiklikler');
  bar.inert=true;
  bar.innerHTML='<div class="savebar-tx" id="sbTx"></div>'
    +'<button class="btn btn-sec" type="button" data-sb="undo">Geri al</button>'
    +'<button class="btn btn-pri" type="button" data-sb="save">Kaydet</button>';
  document.body.appendChild(bar);
  function pubChanged(){
    const now=$$('input[name=pb]:checked',box).map(function(x){return x.value});
    return APPS.filter(function(a){return (now.indexOf(a.id)>=0)!==(savedPub.indexOf(a.id)>=0)});
  }
  pubSync=function(){
    const ch=pubChanged();
    $$('.sw-row[data-id]',box).forEach(function(r){
      r.classList.toggle('chg',ch.some(function(a){return a.id===r.dataset.id}));
    });
    const show=cur==='acik'&&ch.length>0;
    bar.classList.toggle('show',show);
    bar.inert=!show;
    barFlag();
    if(ch.length)$('#sbTx').innerHTML=ch.length+' değişiklik<small>Henüz kaydedilmedi</small>';
  };
  function pubUndo(){
    $$('input[name=pb]',box).forEach(function(x){x.checked=savedPub.indexOf(x.value)>=0});
    pubSync();
    toast('Değişiklikler geri alındı');
    vib(12);
  }
  function pubSave(){
    if(saving)return;
    const ids=$$('input[name=pb]:checked',box).map(function(x){return x.value});
    const btn=$('[data-sb=save]',bar);
    saving=true;
    btn.disabled=true;
    btn.textContent='Kaydediliyor…';
    api('POST','public',{ids:ids}).then(function(j){
      if(!j.ok){toast(j.e||'Kaydedilemedi','err');return}
      savedPub=j.ids||ids;
      APPS.forEach(function(a){
        a.pub=savedPub.indexOf(a.id)>=0;
        const bd=$('[data-bd="'+a.id+'"]',box);
        if(bd)bd.classList.toggle('off',a.pub);
      });
      counts();
      pubSync();
      vib([20,40,20]);
      toast('Kaydedildi','ok',savedPub.length+' uygulama herkese açık');
    }).catch(function(){toast('Kaydedilemedi','err','Bağlantını kontrol et')})
      .then(function(){saving=false;btn.disabled=false;btn.textContent='Kaydet'});
  }
  bar.addEventListener('click',function(e){
    const t=e.target.closest('[data-sb]');
    if(!t)return;
    if(t.dataset.sb==='save')pubSave();else pubUndo();
  });
  box.addEventListener('change',function(e){
    if(e.target&&e.target.name==='pb')pubSync();
  });
  wkInit();
  window.panelView(cur);

  function list(){
    api('GET','links').then(function(rows){
      $('#admL').innerHTML=rows.length?rows.map(function(L){
        return '<div class="inv-it"><div class="inv-tx"><b>'+esc(L.apps.map(name).join(', '))+'</b>'
        +'<span class="inv-meta">'+esc(left(L))+(L.once?' · tek kullanımlık':'')+(L.apps.length>1?' · paket':'')+' · '+L.hits+' açılış</span>'
        +(L.note?'<span class="inv-note">'+esc(L.note)+'</span>':'')+'</div>'
        +'<div class="inv-ac"><button class="btn btn-sec" type="button" data-adm="cp" data-u="'+esc(location.origin+'/g/'+L.code)+'">Kopyala</button>'
        +'<button class="btn btn-sec" type="button" data-adm="del" data-c="'+esc(L.code)+'">İptal</button></div></div>';
      }).join('')+'<div class="adm-row"><button class="btn btn-sec" type="button" data-adm="clr">Hepsini iptal et</button></div>':'<p class="inf-note">Aktif link yok.</p>';
      tx('[data-cnt="davet"]',rows.length||'');
    }).catch(function(e){$('#admL').innerHTML='<p class="inf-note">Liste alınamadı: '+esc(e&&e.message||e||'hata')+'</p>'});
  }
  /* Durum tarayıcıdan ölçülür: Worker'dan başka workers.dev adresine istek atmak Cloudflare'de engelli.
     Kartlar hemen çizilir, her uygulama yanıtlayınca kendi satırı ve özet güncellenir. */
  function status(){
    const el=$('#admS');
    const n=APPS.length;
    if(!n){el.innerHTML='<p class="inf-note">Uygulama listesi boş.</p>';return}
    el.innerHTML='<div class="stx-sum" id="stSum"><div class="stx-ring" id="stRing"><span id="stPct"></span></div>'
      +'<div><div class="stx-big" id="stBig"></div><div class="stx-small" id="stSm"></div></div></div>'
      +'<div class="stx-list">'+APPS.map(function(a){
        return '<div class="stx" data-st="'+esc(a.id)+'"><img class="stx-ic" src="'+esc(localIcon(a))+'" alt="" width="44" height="44">'
        +'<div class="stx-bd"><div class="stx-nm">'+esc(a.name)+'</div><div class="stx-ms">Bekleniyor…</div></div>'
        +'<span class="stx-pill wait">Kontrol</span></div>';
      }).join('')+'</div>';
    let done=0,up=0;
    function upd(){
      const fin=done>=n;
      $('#stRing').style.setProperty('--p',Math.round(up/n*100));
      $('#stPct').textContent=fin?Math.round(up/n*100)+'%':done+'/'+n;
      $('#stBig').textContent=!fin?'Kontrol ediliyor…':up===n?'Hepsi çalışıyor':up+' / '+n+' çalışıyor';
      $('#stSm').textContent=fin?(up===n?'Tüm uygulamalar yanıt veriyor.':(n-up)+' uygulama yanıt vermiyor.'):'Biraz sürebilir.';
      $('#stSum').classList.toggle('bad',fin&&up<n);
    }
    upd();
    APPS.forEach(function(a){
      const t=Date.now(),c=new AbortController(),to=setTimeout(function(){c.abort()},6000);
      fetch(a.url,{mode:'no-cors',cache:'no-store',signal:c.signal})
        .then(function(){return {ok:true,ms:Date.now()-t}})
        .catch(function(){return {ok:false,ms:0}})
        .then(function(r){
          clearTimeout(to);
          done++;if(r.ok)up++;
          const row=$('.stx[data-st="'+a.id+'"]',el);
          if(row){
            $('.stx-ms',row).textContent=r.ok?'Yanıt süresi '+r.ms+' ms':'Yanıt gelmedi';
            const pl=$('.stx-pill',row);
            pl.className='stx-pill'+(r.ok?'':' bad');
            pl.textContent=r.ok?'Çalışıyor':'Açılmıyor';
          }
          upd();
        });
    });
  }
  box.addEventListener('click',function(e){
    const t=e.target.closest('[data-adm]');
    if(!t)return;
    const a=t.dataset.adm;
    if(a==='cp'){try{navigator.clipboard.writeText(t.dataset.u).then(function(){toast('Link kopyalandı','ok')},function(){toast('Kopyalanamadı','err')})}catch(x){toast('Kopyalanamadı','err')}}
    else if(a==='sh'){if(navigator.share)navigator.share({url:t.dataset.u}).catch(function(){});else toast('Paylaşım yok, kopyala')}
    else if(a==='del'){api('DELETE','links/'+t.dataset.c).then(list)}
    else if(a==='clr'){if(confirm('Tüm linkler iptal edilsin mi?'))api('POST','links/clear',{}).then(list)}
    else if(a==='st'){status();list()}
    else if(a==='wk'){if(wkChanged().length&&!confirm('Kaydedilmemiş değişiklikler silinsin mi?'))return;wkLoad(true)}
  });
  $('#admF').addEventListener('submit',function(e){
    e.preventDefault();
    const ids=$$('input[name=ap]:checked',box).map(function(x){return x.value});
    if(!ids.length){toast('Uygulama seç','err');return}
    const btn=$('button[type=submit]',e.target);
    btn.disabled=true;
    api('POST','links',{apps:ids,hours:+$('#admH').value,once:$('#admO').checked,note:$('#admN').value}).then(function(r){
      if(!r.url){toast(r.e||'Hata','err');return}
      toast('Link hazır','ok','Kopyala ya da paylaş');
      $('#admN').value='';
      $('#admR').innerHTML='<input class="adm-in" readonly value="'+esc(r.url)+'"><div class="adm-row"><button class="btn btn-pri" type="button" data-adm="cp" data-u="'+esc(r.url)+'">Kopyala</button><button class="btn btn-sec" type="button" data-adm="sh" data-u="'+esc(r.url)+'">Paylaş</button></div>';
      list();
    }).catch(function(){}).then(function(){btn.disabled=false});
  });
  relist=list;
  verInto($('#nxVer'),'');
  pushInto($('#kvPush'),true);
  bindLive();
  updNet();
  list();status();
  }
})();
