'use strict';
/* ============================================================
   04-boot.js · EN SON dosya: uygulamayı başlatır, olayları bağlar
   Sıra: load → migrate → çiz → yükleme dinleyicileri → canlı simge
   Görünüm: varsayılan = Uygulamalar; panelde yan menüden #uyg #acik #davet #durum #bilgi
   Ana sayfada sol üstteki logoya (#topLogo) 3 dokunuş = gizli yönetici girişi (/panel/login)
   ============================================================ */

(function boot(){
  let ready=false;    /* APPS yüklendi mi */
  let taps=[];        /* gizli yönetici girişi: logoya 3 sn içinde 3 dokunuş */

  /* Alt yazı (#ft yalnız ana sayfada): renkli sürüm etiketi + son push (fx.js) */
  function showFt(){
    const el=$('#ft');
    if(!el)return;
    el.innerHTML='<span class="ver off" id="ftVer"></span><span class="ft-sub" id="ftPush"></span>';
    verInto($('#ftVer'),'Nexus ');
    pushInto($('#ftPush'),false);
  }
  function hidden(t){
    if(t){t.classList.remove('pop');void t.offsetWidth;t.classList.add('pop')}
    const n=Date.now();
    taps=taps.filter(function(x){return n-x<3000});
    taps.push(n);
    if(taps.length>=3){taps=[];vib(20);snd('ok');setTimeout(function(){location.href='/panel/login'},180)}
  }

  load();
  migrate();
  updNet();

  /* Panel görünümleri: '' = Uygulamalar; diğerleri yan menüden (hash). Eski #yonet = davet */
  const VIEWS=['uyg','acik','davet','durum','bilgi'];

  function route(){
    let v=PANEL?location.hash.slice(1):'';
    if(v==='yonet')v='davet';
    const adm=PANEL&&VIEWS.indexOf(v)>=0;
    const set=function(sel,off){const el=$(sel);if(el)el.classList.toggle('off',off)};
    set('#v-apps',adm);
    set('#v-yonet',!adm);
    closeSheet();
    if(adm&&ready&&window.initAdmin)initAdmin();
    if(window.panelView)panelView(adm?v:'');   /* panel/panel.js: başlık, bölüm, yan menü */
    window.scrollTo(0,0);
  }

  function start(){
    APPS_FAIL=false;
    loadApps().catch(function(){APPS=[];APPS_FAIL=true}).then(function(){
      ready=true;
      renderApps();
      route();
      updNet();
      loadLive(true);
    });
  }

  route();
  start();
  showFt();

  /* Tek dinleyici + data-act ile tüm düğmeler */
  document.addEventListener('click',function(e){
    const t=e.target.closest('[data-act]');
    if(!t)return;
    const act=t.dataset.act;
    if(act==='install'){vib(12);openSheet(t.dataset.id)}
    else if(act==='open'||act==='go'){vib(12)}   /* bağlantı kendiliğinden açılır */
    else if(act==='close'){closeSheet()}
    else if(act==='pl'){setPlat(t.dataset.pl)}
    else if(act==='retry'){start()}
    else if(act==='tap'){hidden(t)}
  });

  window.addEventListener('hashchange',route);

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')closeSheet();
  });

  window.addEventListener('online',function(){loadLive(true)});
  window.addEventListener('offline',function(){updNet()});
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)loadLive(false);
  });

})();
