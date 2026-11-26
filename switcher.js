/* ============================================================
   Nexus switcher.js · uygulamalara tek satırla eklenen "Nexus" düğmesi
   Kullanım (uygulamanın index.html'ine, </body> öncesi):
     <script src="https://NEXUS-ADRESI/switcher.js" defer></script>
   İsteğe bağlı: data-pos="left" (sol alt, varsayılan sağ alt)
   Liste Nexus'un apps.json dosyasından gelir; yalnızca public:true olanlar.
   Gizli uygulamalar burada asla görünmez. Kendi stilini Shadow DOM içinde taşır
   (uygulamanın CSS'i ile karışmaz); renkler burada sabit çünkü başka sitede çalışır.
   ============================================================ */
(function(){
  'use strict';
  if(window.__nexusSwitcher||window.top!==window.self)return;
  window.__nexusSwitcher=1;

  var cs=document.currentScript;
  var src=cs&&cs.src;
  if(!src)return;
  var base=new URL('./',src).href;               /* Nexus k\u00f6k adresi */
  var pos=(cs.getAttribute('data-pos')||'right')==='left'?'left':'right';
  var cache=null;

  function esc(t){
    return String(t==null?'':t).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var css=''
  +':host{all:initial}'
  +'*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
  +'.fab{position:fixed;'+pos+':14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483000;'
  +'width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.18);padding:0;cursor:pointer;'
  +'background:#141923;box-shadow:0 4px 16px rgba(0,0,0,.35);display:grid;place-items:center;opacity:.78;'
  +'transition:opacity .2s,transform .2s}'
  +'.fab:hover,.fab:focus-visible{opacity:1}.fab:active{transform:scale(.94)}'
  +'.fab img{width:24px;height:24px;border-radius:6px}'
  +'.bg{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);display:none}'
  +'.pn{position:fixed;'+pos+':12px;bottom:calc(62px + env(safe-area-inset-bottom));z-index:2147483002;'
  +'width:min(300px,calc(100vw - 24px));max-height:70vh;overflow:auto;border-radius:16px;padding:8px;'
  +'background:#141923;color:#eef1f6;border:1px solid #252d3c;box-shadow:0 12px 40px rgba(0,0,0,.5);display:none}'
  +'.open .bg,.open .pn{display:block}'
  +'.it{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:11px;color:inherit;text-decoration:none}'
  +'.it:hover,.it:focus-visible{background:#1b2230;outline:none}'
  +'.it img{width:36px;height:36px;border-radius:9px;background:#1b2230;flex:none}'
  +'.nm{font-size:15px;font-weight:650;line-height:1.2}'
  +'.ds{font-size:12px;color:#98a2b3;margin-top:2px;line-height:1.3}'
  +'.cur{margin-left:auto;font-size:11px;color:#5ad6b0;font-weight:700}'
  +'.hd{padding:6px 10px 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#98a2b3;font-weight:700}'
  +'.er{padding:12px;font-size:13px;color:#98a2b3}';

  var host=document.createElement('div');
  host.setAttribute('data-nexus-switcher','');
  var root=host.attachShadow({mode:'open'});
  root.innerHTML='<style>'+css+'</style><div id="w">'
    +'<button class="fab" type="button" aria-label="Nexus: uygulamalar aras\u0131nda ge\u00e7" aria-expanded="false"><img src="'+esc(base)+'icons/favicon-64.png" alt=""></button>'
    +'<div class="bg"></div><div class="pn" role="menu" aria-label="Uygulamalar"></div></div>';
  var w=root.getElementById('w'),fab=root.querySelector('.fab'),pn=root.querySelector('.pn');

  /* Geri tuşu: panel açıkken geri uygulamadan çıkarmaz, önce paneli kapatır (açılınca bir history girdisi eklenir) */
  var swPushed=false,swSwallow=false,swT=0;
  function setOpen(o){
    w.classList.toggle('open',o);
    fab.setAttribute('aria-expanded',o?'true':'false');
    try{
      if(o&&!swPushed){history.pushState({nxSw:1},'');swPushed=true}
      else if(!o&&swPushed){swPushed=false;swSwallow=true;clearTimeout(swT);swT=setTimeout(function(){swSwallow=false},800);history.back()}
    }catch(e){}
  }
  window.addEventListener('popstate',function(){
    if(swSwallow){swSwallow=false;return}
    if(swPushed){swPushed=false;w.classList.remove('open');fab.setAttribute('aria-expanded','false')}
  });

  function render(list){
    var here=location.origin;
    var h='<div class="hd">Nexus</div>';
    h+='<a class="it" role="menuitem" href="'+esc(base)+'"><img src="'+esc(base)+'icons/icon-192.png" alt=""><div><div class="nm">T\u00fcm uygulamalar</div><div class="ds">Nexus ana sayfas\u0131</div></div></a>';
    list.forEach(function(a){
      var cur=false;
      try{cur=new URL(a.url).origin===here}catch(e){}
      h+='<a class="it" role="menuitem" href="'+esc(a.url)+'"><img src="'+esc(base+'icons/apps/'+a.id+'.png')+'" alt=""><div><div class="nm">'+esc(a.name)+'</div><div class="ds">'+esc(a.desc||'')+'</div></div>'+(cur?'<span class="cur">Burada</span>':'')+'</a>';
    });
    pn.innerHTML=h;
  }

  function fetchList(){
    if(cache)return Promise.resolve(cache);
    return fetch(base+'apps.json').then(function(r){
      if(!r.ok)throw 0;
      return r.json();
    }).then(function(j){
      cache=((j&&j.apps)||[]).filter(function(a){return a&&a.public!==false&&a.id&&a.url});
      return cache;
    });
  }

  fab.addEventListener('click',function(){
    var o=!w.classList.contains('open');
    setOpen(o);
    if(!o)return;
    pn.innerHTML='<div class="er">Y\u00fckleniyor\u2026</div>';
    fetchList().then(render).catch(function(){pn.innerHTML='<div class="er">Liste al\u0131namad\u0131. <a style="color:#5ad6b0" href="'+esc(base)+'">Nexus\'u a\u00e7</a></div>'});
  });
  root.querySelector('.bg').addEventListener('click',function(){setOpen(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false)});

  function mount(){document.body.appendChild(host)}
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
