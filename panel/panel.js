'use strict';
/* panel/panel.js · yan menü + Uygulamalar (Cloudflare Worker listesi, düzenleme) + Herkese açık (kaydet/geri al) + davet linkleri + durum + bilgi (yalnız panelde, sw önbelleğinde yok) */
(function(){
  const box=document.getElementById('adm');
  if(!box)return;
  function api(m,p,b){
    return fetch('/api/'+p,{method:m,headers:b?{'content-type':'application/json'}:{},body:b?JSON.stringify(b):undefined,cache:'no-store'})
    .then(function(r){if(r.status===401){location.href='/panel/login';throw 0}return r.json().catch(function(){throw new Error('sunucu '+r.status)})});
  }
  /* Süre biçimleri: fmtM tam ("1 gün 3 sa"), fmtS kısa kalan süre (en çok iki birim) */
  function fmtM(m){
    if(!m)return 'Süresiz';
    const d=Math.floor(m/1440),h=Math.floor(m%1440/60),n=m%60,p=[];
    if(d)p.push(d+' gün');
    if(h)p.push(h+' sa');
    if(n)p.push(n+' dk');
    return p.join(' ');
  }
  function fmtS(m){
    if(m>=1440){const d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d+' gün'+(h?' '+h+' sa':'')}
    if(m>=60){const h=Math.floor(m/60),n=m%60;return h+' sa'+(n?' '+n+' dk':'')}
    return Math.max(m,1)+' dk';
  }
  /* Alttan açılan pencere (Yükle ve Ayarlar ile aynı kabuk): html + açılınca çalışacak kurulum */
  function popSheet(html,mount){
    const sb=$('#sheetBody');
    if(!sb)return;
    sb.innerHTML='<div class="pp-root">'+html+'</div>';   /* dinleyiciler bu kökte kalır, #sheetBody'de birikmez */
    sheetShow();
    if(mount)mount(sb.firstElementChild);
  }
  function ppHead(t,sub){
    return '<div class="sh-hd"><div class="sh-tt"><h2 id="shTitle" class="sh-title">'+t+'</h2><p class="sh-sub">'+sub+'</p></div>'
      +'<button class="ib" type="button" data-act="close" aria-label="Kapat">'+svg(IC_CLOSE,22)+'</button></div>';
  }
  function name(id){const a=APPS.find(function(x){return x.id===id});return a?a.name:id}
  function hd(ic,t){
    return '<div class="sec-hd"><span class="sec-ic">'+svg(ic,16)+'</span><h2 class="sec-t">'+t+'</h2></div>';
  }
  /* ---------- Uygulamalar: Cloudflare Worker listesi + düzenleme ---------- */
  let wk=[],wkOrig=[],wkSnap={},wkLoaded=false,wkBar=null,wkSaving=false;
  const SECN=[['life','Yaşam ve Sağlık'],['trade','Trader Araçları'],['arch','Arşiv']];
  const IC_EDIT='<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
  function barFlag(){document.documentElement.classList.toggle('has-bar',$$('.savebar.show').length>0)}
  const pick=function(it){return {w:it.w,show:!!it.show,name:it.name||'',desc:it.desc||'',sec:it.sec||'life',badge:it.badge||''}};
  const clone=function(o){return JSON.parse(JSON.stringify(o))};
  function hue(t){let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))%360;return h}
  /* Worker simgeleri: uygulamanın kendi sitesinden denenir (ana ekrandaki gibi, en az 64x64 ise kullanılır); olmazsa harf kutusu kalır */
  const wkIc={};
  function wkIcons(){
    wk.forEach(function(it){
      if(!it.url||wkIc[it.w]!==undefined)return;
      wkIc[it.w]=null;
      const p=new Image(),src=it.url+(it.icon||'icons/icon-192.png');
      p.onload=function(){
        if(p.naturalWidth<64||p.naturalHeight<64)return;
        wkIc[it.w]=p.src;
        const av=$('.wk-card[data-w="'+it.w+'"] .wk-av',box);
        if(av){av.classList.add('has-img');av.innerHTML='<img src="'+esc(p.src)+'" alt="" width="46" height="46">'}
      };
      p.src=src+(src.indexOf('?')>=0?'&':'?')+'h='+Math.floor(Date.now()/3600000);
    });
  }
  /* i verilirse kart sırayla belirir (ilk çizim); verilmezse sessizce yenilenir */
  function wkRow(it,i){
    const w=esc(it.w),nm=it.name||it.w;
    const sec=(SECN.filter(function(s){return s[0]===it.sec})[0]||SECN[0])[1];
    const chips=(it.isNew?'<i class="badge badge-new">Yeni</i>':'')+(it.self?'<i class="badge">Bu Nexus</i>':'')
      +(it.miss?'<i class="badge badge-priv">Cloudflare\'de yok</i>':'')+(it.badge?'<i class="badge">'+esc(it.badge)+'</i>':'');
    return '<div class="wk-card'+(it.show?'':' dim')+(i!=null?' rise':'')+'" data-w="'+w+'"'+(i!=null?' style="animation-delay:'+Math.min(i,10)*35+'ms"':'')+'>'
    +'<span class="wk-av'+(wkIc[it.w]?' has-img':'')+'" style="--h:'+hue(it.w)+'">'
    +(wkIc[it.w]?'<img src="'+esc(wkIc[it.w])+'" alt="" width="46" height="46">':esc(nm.charAt(0).toUpperCase()))+'</span>'
    +'<div class="wk-bd"><div class="wk-nm">'+esc(nm)+chips+'</div>'
    +'<div class="wk-sub">'+w+' · '+esc(sec)+'</div>'
    +(it.desc?'<div class="wk-ds">'+esc(it.desc)+'</div>':'')+'</div>'
    +'<button class="ib wk-ed" type="button" data-wk-edit="'+w+'" aria-label="'+w+' düzenle">'+svg(IC_EDIT,20)+'</button>'
    +'<input class="sw" type="checkbox" data-f="show"'+(it.show?' checked':'')+' aria-label="'+w+' Nexus\'ta görünsün">'
    +'</div>';
  }
  function wkCollect(){return wk.map(pick)}
  function wkChanged(){return wkCollect().filter(function(x){return JSON.stringify(x)!==wkSnap[x.w]})}
  function wkSum(){
    const e=$('#wkSum');
    if(!e)return;
    const v=wk.filter(function(x){return x.show}).length;
    e.innerHTML='<div class="wk-big">'+v+' <span>/ '+wk.length+'</span></div><div class="wk-small">Worker Nexus\'ta görünüyor</div>';
  }
  function wkSync(){
    if(!wkBar)return;
    const ch=wkChanged();
    $$('.wk-card',box).forEach(function(r){r.classList.toggle('chg',ch.some(function(x){return x.w===r.dataset.w}))});
    const show=cur==='uyg'&&ch.length>0;
    wkBar.classList.toggle('show',show);
    wkBar.inert=!show;
    barFlag();
    if(ch.length)$('#wkTx').innerHTML=ch.length+' değişiklik<small>Henüz kaydedilmedi</small>';
    wkSum();
  }
  function wkRender(){
    const el=$('#wkList');
    if(!el)return;
    el.innerHTML=wk.length?wk.map(wkRow).join(''):'<p class="inf-note">Worker bulunamadı.</p>';
    wkSnap={};
    wkOrig.forEach(function(x){wkSnap[x.w]=JSON.stringify(pick(x))});
    wkSync();
    wkIcons();
  }
  function wkRow1(w){
    const it=wk.find(function(x){return x.w===w}),el=$('.wk-card[data-w="'+w+'"]',box);
    if(it&&el){el.outerHTML=wkRow(it);wkSync()}
  }
  function wkLoad(force){
    const el=$('#wkList');
    if(!el||(wkLoaded&&!force))return;
    wkLoaded=true;
    el.innerHTML='<p class="inf-note">Yükleniyor…</p>';
    api('GET','workers').then(function(j){
      wk=j.items||[];
      wkOrig=clone(wk);
      const n=wk.filter(function(x){return x.isNew}).length;
      $('#wkMsg').innerHTML=(j.err?'<p class="wk-err">Cloudflare\'e ulaşılamadı: '+esc(j.err)+'<br>Son bilinen liste gösteriliyor.</p>':'')
        +(n?'<p class="sec-note">'+n+' yeni Worker var.</p>':'');
      wkRender();
    }).catch(function(e){
      wkLoaded=false;
      el.innerHTML='<p class="wk-err">Liste alınamadı'+(e&&e.message?': '+esc(e.message):'')+'. Bağlantını kontrol et.</p>';
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
  /* Düzenleme penceresi: ad, açıklama, bölüm (seçim kutusu yok, üç düğme), rozet */
  function wkEdit(w){
    const it=wk.find(function(x){return x.w===w});
    if(!it)return;
    let sec=it.sec||'life';
    const segs=SECN.map(function(s){return '<button class="seg-b" type="button" data-sec="'+s[0]+'" aria-pressed="'+(sec===s[0])+'">'+esc(s[1])+'</button>'}).join('');
    popSheet(ppHead(esc(it.name||it.w),esc(it.w))
      +'<div class="pp-form">'
      +'<label class="inv-lb">Ad<input class="inv-in" id="edN" type="text" maxlength="40" placeholder="'+esc(it.w)+'" value="'+esc(it.name)+'"></label>'
      +'<label class="inv-lb">Açıklama<input class="inv-in" id="edD" type="text" maxlength="140" value="'+esc(it.desc)+'"></label>'
      +'<div class="inv-lb">Bölüm<div class="seg seg-w" id="edS" role="group" aria-label="Bölüm">'+segs+'</div></div>'
      +'<label class="inv-lb">Rozet<input class="inv-in" id="edB" type="text" maxlength="16" value="'+esc(it.badge)+'"></label>'
      +'</div>'
      +(it.miss?'<p class="sh-note">Bu Worker Cloudflare\'de bulunamadı (silinmiş olabilir). Nexus\'taki kaydını silebilirsin.</p>'
        +'<button class="btn btn-sec lk-del wk-rm" type="button" id="edDel">Listeden sil</button>':'')
      +'<div class="sh-ac"><button class="btn btn-pri sh-go" type="button" id="edOk">Tamam</button></div>',
    function(b){
      const rm=$('#edDel',b);
      if(rm)rm.addEventListener('click',function(){
        if(!confirm('"'+(it.name||w)+'" Nexus listesinden silinsin mi?'+(wkChanged().length?' Kaydedilmemiş diğer değişiklikler de gider.':'')))return;
        rm.disabled=true;
        api('POST','apps',{items:[],del:[w]}).then(function(j){
          if(!j.ok){toast(j.e||'Silinemedi','err');rm.disabled=false;return}
          if(!j.deleted){toast('Silinmedi','err','Worker Cloudflare\'de hâlâ görünüyor');rm.disabled=false;return}
          try{sessionStorage.setItem('nx.msg','1')}catch(e){}
          location.reload();
        }).catch(function(){toast('Silinemedi','err','Bağlantını kontrol et');rm.disabled=false});
      });
      $('#edS',b).addEventListener('click',function(e){
        const t=e.target.closest('[data-sec]');
        if(!t)return;
        sec=t.dataset.sec;
        $$('#edS .seg-b',b).forEach(function(x){x.setAttribute('aria-pressed',x===t?'true':'false')});
      });
      $('#edOk',b).addEventListener('click',function(){
        it.name=$('#edN',b).value.trim();
        it.desc=$('#edD',b).value.trim();
        it.badge=$('#edB',b).value.trim();
        it.sec=sec;
        closeSheet();
        wkRow1(w);
      });
    });
  }
  function wkInit(){
    wkBar=document.createElement('div');
    wkBar.id='saveBar2';
    wkBar.className='savebar';
    wkBar.setAttribute('role','region');
    wkBar.setAttribute('aria-label','Kaydedilmemiş değişiklikler');
    wkBar.inert=true;
    wkBar.innerHTML='<div class="savebar-tx" id="wkTx"></div>'
      +'<button class="btn btn-sec" type="button" data-wk="undo">Geri al</button>'
      +'<button class="btn btn-pri" type="button" data-wk="save">Kaydet</button>';
    document.body.appendChild(wkBar);
    wkBar.addEventListener('click',function(e){
      const t=e.target.closest('[data-wk]');
      if(!t)return;
      if(t.dataset.wk==='save')wkSave();
      else{wk=clone(wkOrig);wkRender();toast('Değişiklikler geri alındı');vib(12)}
    });
    box.addEventListener('change',function(e){
      const t=e.target,card=t&&t.closest?t.closest('.wk-card'):null;
      if(!card||t.dataset.f!=='show')return;
      const it=wk.find(function(x){return x.w===card.dataset.w});
      if(it){it.show=t.checked;card.classList.toggle('dim',!it.show)}
      wkSync();
    });
    box.addEventListener('click',function(e){
      const t=e.target.closest('[data-wk-edit]');
      if(t){vib(10);wkEdit(t.dataset.wkEdit)}
    });
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
  const IC_CHECK='<path d="M5 12.5l4.5 4.5L19 7.5"/>';
  const IC_CLOCK='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  const IC_REPEAT='<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>';
  const IC_CHEV='<path d="M6 9l6 6 6-6"/>';
  const IC_PUSH='<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>';
  const IC_IMG='<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/>';
  const IC_REFRESH='<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>';
  const IC_SND='<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>';
  const IC_COPY='<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>';
  const IC_SEND='<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>';
  const IC_TRASH='<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>';
  const IC_SHIELD='<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>';
  const IC_ARROW='<path d="M5 12h14M13 6l6 6-6 6"/>';
  const IC_UP='<path d="M6 15l6-6 6 6"/>';
  const IC_BARS='<path d="M6 20V10M12 20V4M18 20v-7"/>';
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
    +'<button id="drSum" class="dr-sum" type="button" data-act="nav" data-v="acik"></button>'
    +'<div class="dr-lb">NEXUS</div>'
    +item('','Önizleme',IC_APPS,'')
    +'<div class="dr-lb">YÖNETİM</div>'
    +item('acik','Herkese açık',IC_GLOBE,'pub')
    +item('davet','Davet linkleri',IC_LINK,'davet')
    +item('durum','Uygulama durumu',IC_PULSE,'')
    +'<div class="dr-sys"><div class="dr-lb">SİSTEM</div>'
    +item('uyg','Uygulamalar',IC_PUSH,'apps')
    +item('bilgi','Bilgi',IC_INFO,'')
    +'<a class="dr-it" href="/">'+svg(IC_HOME,22)+'<span>Ana sayfaya git</span></a>'
    +'<button class="dr-it" type="button" data-act="mout">'+svg(IC_OUT,22)+'<span>Çıkış</span></button></div>';
    counts();
  }
  function counts(){
    const n=APPS.length,p=APPS.filter(function(a){return a.pub}).length;
    /* Menü üstündeki durum kartı: ana sayfanın şu anki hali; dokununca ilgili ekrana gider */
    const sm=$('#drSum');
    if(sm){
      const t=!n?['off','Uygulama yok','Önce Uygulamalar ekranından aç','uyg']
        :!p?['warn','Ana sayfa boş','Herkese açık uygulama yok','acik']
        :['ok',p+' uygulama yayında',n-p?(n-p)+' gizli · ana sayfada herkese görünür':'Hepsi ana sayfada görünür','acik'];
      sm.className='dr-sum '+t[0];
      sm.dataset.v=t[3];
      sm.innerHTML='<span class="dr-dot"></span><span class="dr-st"><b>'+esc(t[1])+'</b><small>'+esc(t[2])+'</small></span><span class="dr-go">'+svg(IC_GO,18)+'</span>';
    }
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
  /* Son girişler (Bilgi): KV 'lg' en yeni üstte, en çok 20 kayıt */
  const AYLAR=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  function lgWhen(t){
    const d=new Date(t),n=new Date(),p=function(x){return (x<10?'0':'')+x};
    const hm=p(d.getHours())+':'+p(d.getMinutes());
    if(d.toDateString()===n.toDateString())return 'Bugün · '+hm;
    if(d.toDateString()===new Date(n.getTime()-864e5).toDateString())return 'Dün · '+hm;
    return d.getDate()+' '+AYLAR[d.getMonth()]+(d.getFullYear()!==n.getFullYear()?' '+d.getFullYear():'')+' · '+hm;
  }
  function lgLoad(){
    const el=$('#lgList');
    if(!el)return;
    api('GET','logins').then(function(j){
      const a=j.items||[];
      el.innerHTML=a.length?a.map(function(x,i){
        return '<div class="ses-it"><span class="ses-dot'+(i?'':' on')+'"></span><div class="ses-bd"><div class="ses-d">'+esc(x.d||'Bilinmeyen cihaz')+'</div><div class="ses-w">'+esc(lgWhen(x.t))+(x.c?' · '+esc(x.c):'')+'</div></div></div>';
      }).join(''):'<p class="inf-note">Kayıt yok. Bundan sonraki girişler burada görünür.</p>';
    }).catch(function(){el.innerHTML='<p class="wk-err">Liste alınamadı.</p>'});
  }
  /* 04-boot.js route() her görünüm değişiminde çağırır: v = '' (Uygulamalar) | acik | davet | durum | bilgi */
  window.panelView=function(v){
    cur=v||'';
    tx('#topTitle',TITLES[cur]||'Nexus');
    $$('[data-v]',box).forEach(function(s){s.classList.toggle('off',s.dataset.v!==cur)});
    $$('#drawerBody .dr-it[data-v]').forEach(function(b){
      if(b.dataset.v===cur)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    ['#pubHero','#ft'].forEach(function(q){const e=$(q);if(e)e.classList.toggle('off',cur!=='')});   /* önizleme başlığı ve alt yazı yalnız ana görünümde */
    counts();
    pubSync();
    wkSync();
    if(cur==='uyg')wkLoad(false);
    if(cur==='bilgi'){pushInto($('#kvPush'),true);lgLoad()}
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
    else if(a==='lgall'){if(confirm('Bu cihaz dahil tüm cihazlardaki oturumlar kapatılsın mı?'))api('POST','logout-all',{}).then(function(){location.href='/'})}
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
  const tiles=APPS.map(function(a){
    return '<label class="ap-tile"><input type="checkbox" name="ap" value="'+esc(a.id)+'">'
    +'<img src="'+esc(localIcon(a))+'" alt="" width="52" height="52"><span>'+esc(a.name)+'</span>'
    +'<i class="ap-ck">'+svg(IC_CHECK,14)+'</i></label>';
  }).join('');
  function fld(k,ic,lb){
    return '<button class="fld" type="button" data-pop="'+k+'"><span class="fld-ic">'+svg(ic,18)+'</span>'
    +'<span class="fld-tx"><span class="fld-k">'+lb+'</span><span class="fld-v" id="fv-'+k+'"></span></span>'
    +'<span class="fld-ch">'+svg(IC_CHEV,16)+'</span></button>';
  }
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
  +'<div class="wk-sum"><div id="wkSum"></div><button class="btn btn-sec" type="button" data-adm="wk">Yenile</button></div>'
  +'<p class="sec-note">Cloudflare hesabındaki Worker\'lar. Anahtarı açtıkların Nexus\'ta görünür; kalem simgesiyle ad, açıklama, bölüm ve rozeti düzenlersin. Değişiklikler Kaydet\'e basınca uygulanır.</p>'
  +'<div id="wkMsg"></div><div class="wk-list" id="wkList"></div></section>'
  +'<section class="sec" data-v="acik">'+hd(IC_GLOBE,'Herkese açık')
  +'<p class="sec-note">Açtıkların ana sayfada herkese görünür. Kapalılar gizli kalır, yalnız davet linkiyle verilir. Değişiklikler Kaydet\'e basınca uygulanır.</p>'
  +'<div class="sw-list" id="pbList">'+pubs+'</div></section>'
  +'<section class="sec dv" data-v="davet">'
  +'<div class="dv-hero"><div class="dv-txt"><span class="dv-pill">'+svg(IC_LINK,14)+'Özel davet</span>'
  +'<h2 class="dv-h">Davet linki <em>oluştur</em></h2>'
  +'<p class="dv-sub">Süreyi, kullanım hakkını ve notu sen belirle.</p></div>'
  +'<div class="dv-art" aria-hidden="true"><svg class="dv-orbit" viewBox="0 0 220 120" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="110" cy="60" rx="104" ry="32" transform="rotate(-16 110 60)"/></svg>'
  +'<img class="dv-logo" src="icons/icon-512.png" alt="" width="104" height="104"></div></div>'
  +'<form id="admF" class="nv dv-card" novalidate>'
  +'<div class="dv-ch"><span class="dv-ch-ic">'+svg(IC_LINK,24)+'</span><h3 class="dv-ch-t">Link oluşturma ayarları</h3></div>'
  +'<div><div class="nv-h"><span>Paylaşılacak uygulamalar</span><b id="nvCnt"></b></div>'
  +(APPS.length?'<div class="ap-grid">'+tiles+'</div>':'<p class="inf-note">Henüz Nexus\'ta görünen uygulama yok. Menüden Uygulamalar ekranına girip istediklerini aç.</p>')
  +'</div>'
  +'<div class="fl-row">'+fld('dur',IC_CLOCK,'SÜRE')+fld('use',IC_REPEAT,'KULLANIM')+'</div>'
  +'<div class="dv-nt"><textarea id="admN" class="inv-in nv-ta" maxlength="120" rows="1" placeholder="Karşılama notu (isteğe bağlı)" aria-label="Karşılama notu"></textarea><b id="nvNc" class="dv-nc">0/120</b></div>'
  +'<div class="nv-sum" id="nvSum"></div>'
  +'<button class="btn btn-pri btn-lg dv-go" type="submit">'+svg(IC_LINK,22)+'<span>Link oluştur</span><i class="dv-go-ar">'+svg(IC_ARROW,18)+'</i></button>'
  +'</form>'
  +'<div id="admR" class="adm-res"></div>'
  +'<div class="inv-hr dv-hr"><span class="dv-hr-ic">'+svg(IC_BARS,22)+'</span><h3 class="inv-h">Aktif linkler</h3>'
  +'<button class="lk-all off" type="button" data-adm="more" id="lkAll"></button>'
  +'<button class="lk-rf" type="button" data-adm="rf" aria-label="Linkleri yenile">'+svg(IC_REFRESH,18)+'<span>Yenile</span></button></div>'
  +'<div id="admL" class="inv-list"></div>'
  +'<div class="dv-note"><span class="dv-note-ic">'+svg(IC_INFO,22)+'</span><p>Linkleri yalnızca sen yönetirsin. İstediğin zaman tek tek ya da hepsini iptal edebilirsin.</p><span class="dv-note-sh">'+svg(IC_SHIELD,40)+'</span></div></section>'
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
  +'</div>'
  +'<h3 class="inv-h">Son girişler</h3><div id="lgList" class="ses-list"></div>'
  +'<div class="adm-row"><button class="btn btn-sec" type="button" data-act="lgall">Tüm cihazlardan çık</button></div></section>';

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
      if(window.renderApps)renderApps();   /* önizleme güncellensin */
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
    const t=e.target;
    if(!t)return;
    if(t.name==='pb')pubSync();
    else if(t.name==='ap'){t.closest('.ap-tile').classList.toggle('on',t.checked);invUp()}
  });
  wkInit();
  window.panelView(cur);

  function pct(v){return Math.max(0,Math.min(100,Math.round(v)))}
  function lkCard(L){
    const now=Date.now(),m=L.exp?Math.round((L.exp-now)/60000):0,mx=L.max||0,hits=L.hits||0;
    const ap=L.apps.map(function(id){return APPS.find(function(x){return x.id===id})}).filter(Boolean);
    const ics=ap.slice(0,4).map(function(a){return '<img src="'+esc(localIcon(a))+'" alt="" width="36" height="36">'}).join('');
    const chip=function(ic,t,c){return '<span class="lk-chip'+(c?' '+c:'')+'">'+svg(ic,13)+esc(t)+'</span>'};
    const chips=(L.exp?(m<=0?chip(IC_CLOCK,'Süresi doldu','warn'):chip(IC_CLOCK,fmtS(m)+' kaldı')):chip(IC_CLOCK,'Süresiz'))
      +chip(IC_REPEAT,mx?hits+' / '+mx+' kullanıldı':hits+' açılış')
      +(L.apps.length>1?'<span class="lk-chip">Paket</span>':'');
    const bars=(L.exp&&L.created?'<div class="lk-bar" title="Kalan süre"><i style="--w:'+pct((L.exp-now)/(L.exp-L.created)*100)+'%"></i></div>':'')
      +(mx?'<div class="lk-bar" title="Kalan hak"><i style="--w:'+pct((mx-hits)/mx*100)+'%"></i></div>':'');
    const u=esc(location.origin+'/g/'+L.code);
    const dead=L.exp&&m<=0;
    return '<div class="lk"><div class="lk-top"><div class="lk-ics">'+ics+'</div>'
      +'<div class="lk-tx"><div class="lk-nm">'+esc(L.apps.map(name).join(', '))+'</div><div class="lk-chips">'+chips+'</div></div>'
      +'<span class="lk-st'+(dead?' warn':'')+'">'+(dead?'Süresi doldu':'Aktif')+'</span></div>'
      +bars+(L.note?'<div class="lk-note">'+esc(L.note)+'</div>':'')
      +'<div class="lk-ac"><button class="btn btn-sec" type="button" data-adm="cp" data-u="'+u+'">'+svg(IC_COPY,18)+'Kopyala</button>'
      +'<button class="btn btn-sec" type="button" data-adm="sh" data-u="'+u+'">'+svg(IC_SEND,18)+'Paylaş</button>'
      +'<button class="btn btn-sec lk-del" type="button" data-adm="del" data-c="'+esc(L.code)+'">'+svg(IC_TRASH,18)+'İptal</button></div></div>';
  }
  let lkOpen=false;   /* Aktif linkler: yalnız ilki görünür, "Tümünü gör" ile hepsi açılır */
  function lkAllTx(n){
    const b=$('#lkAll');
    if(!b)return;
    b.classList.toggle('off',n<2);
    b.innerHTML=(lkOpen?'Daha az':'Tümünü gör ('+n+')')+svg(lkOpen?IC_UP:IC_ARROW,16);
  }
  function list(){
    return api('GET','links').then(function(rows){
      if(rows.length<2)lkOpen=false;
      $('#admL').innerHTML=rows.length?lkCard(rows[0])
        +(rows.length>1?'<div class="lk-more'+(lkOpen?'':' off')+'" id="lkMore">'+rows.slice(1).map(lkCard).join('')+'<div class="adm-row"><button class="btn btn-sec" type="button" data-adm="clr">Hepsini iptal et</button></div></div>':'')
        :'<p class="inf-note">Aktif link yok.</p>';
      lkAllTx(rows.length);
      tx('[data-cnt="davet"]',rows.length||'');
      return true;
    }).catch(function(e){$('#admL').innerHTML='<p class="inf-note">Liste alınamadı: '+esc(e&&e.message||e||'hata')+'</p>';return false});
  }

  /* ---------- Davet formu: süre ve kullanım için açılır pencereler ---------- */
  const inv={mins:1440,max:0};   /* mins: 0 = süresiz · max: 0 = sınırsız */
  const DUR=[[30,'30 dk'],[60,'1 saat'],[360,'6 saat'],[1440,'1 gün'],[10080,'7 gün'],[43200,'30 gün'],[0,'Süresiz']];
  const USE=[[0,'Sınırsız'],[1,'1'],[3,'3'],[5,'5'],[10,'10'],[25,'25']];
  const UN=[['dk',1],['sa',60],['gün',1440]];
  const MAXM=525600;   /* en çok 365 gün */
  function invUp(){
    const n=$$('input[name=ap]:checked',box).length;
    tx('#nvCnt',n?n+' seçildi':'Seçilmedi');
    tx('#fv-dur',fmtM(inv.mins));
    tx('#fv-use',inv.max?inv.max+' kullanım':'Sınırsız');
    $('#nvSum').innerHTML=(n?'<b>'+n+' uygulama</b>'+(n>1?' (paket)':''):'<b>Uygulama seç</b>')
      +' · '+(inv.mins?'<b>'+esc(fmtM(inv.mins))+'</b>':'<b>süresiz</b>')
      +' · '+(inv.max?'<b>'+inv.max+' kullanım</b>':'<b>sınırsız</b> kullanım');
  }
  function chipsHtml(list,cur,attr){
    return list.map(function(x,i){return '<button class="pp-chip" type="button" '+attr+'="'+x[0]+'" aria-pressed="'+(x[0]===cur)+'" style="--i:'+i+'">'+x[1]+'</button>'}).join('');
  }
  function stepper(v,max){
    return '<div class="pp-big"><button class="pp-step" type="button" data-d="-1" aria-label="Azalt">−</button>'
      +'<input class="pp-num" id="ppN" type="number" inputmode="numeric" min="1" max="'+max+'" value="'+v+'" aria-label="Değer">'
      +'<button class="pp-step" type="button" data-d="1" aria-label="Artır">+</button></div>';
  }
  function popDur(){
    let u=!inv.mins?2:inv.mins%1440===0?2:inv.mins%60===0?1:0;
    const v=inv.mins?inv.mins/UN[u][1]:1;
    popSheet(ppHead('Geçerlilik süresi','Link bu süre dolunca kapanır')
      +'<div class="pp-chips">'+chipsHtml(DUR,inv.mins,'data-m')+'</div>'
      +'<div class="pp-h">ÖZEL SÜRE</div>'+stepper(v,MAXM)
      +'<div class="seg" id="ppU" role="group" aria-label="Birim">'+UN.map(function(x,i){return '<button class="seg-b" type="button" data-u="'+i+'" aria-pressed="'+(i===u)+'">'+x[0]+'</button>'}).join('')+'</div>'
      +'<div class="sh-ac"><button class="btn btn-pri sh-go" type="button" id="ppOk"></button></div>',
    function(b){
      const n=$('#ppN',b),ok=$('#ppOk',b);
      const cur=function(){return Math.floor(+n.value||0)*UN[u][1]};
      const lab=function(){
        const m=cur();
        ok.disabled=!(m>0&&m<=MAXM);
        ok.textContent=m>MAXM?'En çok 365 gün':m>0?fmtM(m)+' olarak ayarla':'Geçerli bir süre gir';
      };
      lab();
      b.addEventListener('click',function(e){
        const c=e.target.closest('[data-m]'),d=e.target.closest('[data-d]'),un=e.target.closest('[data-u]');
        if(c){inv.mins=+c.dataset.m;invUp();closeSheet();vib(10)}
        else if(d){n.value=Math.max(1,Math.floor(+n.value||0)+(+d.dataset.d));lab();vib(8)}
        else if(un){u=+un.dataset.u;$$('#ppU .seg-b',b).forEach(function(x){x.setAttribute('aria-pressed',x===un?'true':'false')});lab()}
        else if(e.target.closest('#ppOk')&&!ok.disabled){inv.mins=cur();invUp();closeSheet();vib(12)}
      });
      n.addEventListener('input',lab);
    });
  }
  function popUse(){
    popSheet(ppHead('Kullanım sayısı','Link bu kadar açılınca kapanır')
      +'<div class="pp-chips">'+chipsHtml(USE,inv.max,'data-k')+'</div>'
      +'<div class="pp-h">ÖZEL SAYI</div>'+stepper(inv.max||5,1000)
      +'<p class="sh-note">Link her açıldığında 1 hak düşer; sayfayı yenilemek de hak harcar. Hak bitince link kendiliğinden kapanır.</p>'
      +'<div class="sh-ac"><button class="btn btn-pri sh-go" type="button" id="ppOk"></button></div>',
    function(b){
      const n=$('#ppN',b),ok=$('#ppOk',b);
      const cur=function(){return Math.floor(+n.value||0)};
      const lab=function(){
        const k=cur();
        ok.disabled=!(k>0&&k<=1000);
        ok.textContent=k>1000?'En çok 1000':k>0?k+' kullanım olarak ayarla':'Geçerli bir sayı gir';
      };
      lab();
      b.addEventListener('click',function(e){
        const c=e.target.closest('[data-k]'),d=e.target.closest('[data-d]');
        if(c){inv.max=+c.dataset.k;invUp();closeSheet();vib(10)}
        else if(d){n.value=Math.max(1,cur()+(+d.dataset.d));lab();vib(8)}
        else if(e.target.closest('#ppOk')&&!ok.disabled){inv.max=cur();invUp();closeSheet();vib(12)}
      });
      n.addEventListener('input',lab);
    });
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
    else if(a==='more'){lkOpen=!lkOpen;const m=$('#lkMore');if(m)m.classList.toggle('off',!lkOpen);lkAllTx($$('.lk',box).length)}
    else if(a==='rf'){
      if(t.classList.contains('spin'))return;
      t.classList.add('spin');t.disabled=true;
      list().then(function(ok){if(ok)toast('Linkler güncellendi','ok')}).then(function(){t.classList.remove('spin');t.disabled=false});
    }
    else if(a==='wk'){if(wkChanged().length&&!confirm('Kaydedilmemiş değişiklikler silinsin mi?'))return;wkLoad(true)}
  });
  box.addEventListener('click',function(e){
    const t=e.target.closest('[data-pop]');
    if(!t)return;
    vib(10);
    if(t.dataset.pop==='dur')popDur();else popUse();
  });
  $('#admN').addEventListener('input',function(){tx('#nvNc',this.value.length+'/120');this.style.height='auto';this.style.height=this.scrollHeight+'px'});
  $('#admF').addEventListener('submit',function(e){
    e.preventDefault();
    const ids=$$('input[name=ap]:checked',box).map(function(x){return x.value});
    if(!ids.length){toast('Uygulama seç','err');return}
    const btn=$('button[type=submit]',e.target);
    btn.disabled=true;
    api('POST','links',{apps:ids,minutes:inv.mins,max:inv.max,note:$('#admN').value}).then(function(r){
      if(!r.url){toast(r.e||'Hata','err');return}
      toast('Link hazır','ok','Kopyala ya da paylaş');
      vib([20,40,20]);
      $('#admN').value='';$('#admN').style.height='';tx('#nvNc','0/120');
      $('#admR').innerHTML='<div class="nv-res"><div class="nv-res-h">'+svg(IC_CHECK,18)+'Link hazır</div>'
        +'<input class="adm-in" readonly value="'+esc(r.url)+'" onfocus="this.select()">'
        +'<div class="adm-row"><button class="btn btn-pri" type="button" data-adm="cp" data-u="'+esc(r.url)+'">Kopyala</button>'
        +'<button class="btn btn-sec" type="button" data-adm="sh" data-u="'+esc(r.url)+'">Paylaş</button></div></div>';
      list();
    }).catch(function(){}).then(function(){btn.disabled=false});
  });
  invUp();
  relist=list;
  verInto($('#nxVer'),'');
  pushInto($('#kvPush'),true);
  bindLive();
  updNet();
  list();status();
  }
})();
