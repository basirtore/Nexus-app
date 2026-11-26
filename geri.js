/* Geri tuşu / geri kaydırma yönetimi (ana sayfa, davetli sayfası, panel).
   Alttan açılan sayfa (Yükle, Ayarlar), panel menüsü ve onay penceresi açıkken geri hareketi uygulamadan çıkmak yerine
   önce o katmanı kapatır. Her açık katman history'ye bir girdi ekler; katman başka yoldan (Kapat düğmesi, dışa dokunma)
   kapanırsa girdi sessizce geri alınır. Katman yokken geri normal çalışır (sayfa içi # görünümleri dahil). */
(function(){
  'use strict';
  function $(s){return document.querySelector(s)}
  function click(e){if(e&&e.click)e.click()}
  function isOpen(s){var e=$(s);return !!e&&e.classList.contains('open')}
  /* Üstten alta: geri ilk açık olanı kapatır; close() katmanın kendi düğmesine/arka planına basar */
  var LAYERS=[
    {open:function(){return isOpen('#langMenu')},close:function(){if(window.nxLangClose)nxLangClose()}},
    {open:function(){return isOpen('#cf')},close:function(){click($('#cf .cf-bg'))}},
    {open:function(){return isOpen('#sheet')},close:function(){click($('#sheet .sheet-bg'))}},
    {open:function(){return isOpen('#drawer')},close:function(){click($('#drawer .drawer-bg'))}}
  ];
  function count(){var n=0;LAYERS.forEach(function(l){if(l.open())n++});return n}
  function top(){for(var i=0;i<LAYERS.length;i++)if(LAYERS[i].open())return LAYERS[i];return null}
  var pushed=0,swallow=0,swT=0;
  function sync(){
    var n=count();
    try{
      while(pushed<n){history.pushState({nxLay:pushed+1},'');pushed++}
      if(pushed>n){var k=pushed-n;pushed=n;swallow++;clearTimeout(swT);swT=setTimeout(function(){swallow=0},800);history.go(-k)}
    }catch(e){}
  }
  var q=false;
  function schedule(){if(q)return;q=true;Promise.resolve().then(function(){q=false;sync()})}
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  window.addEventListener('popstate',function(){
    if(swallow>0){swallow--;return}
    var l=top();
    if(!l){pushed=0;return}
    if(pushed>0)pushed--;
    l.close();
    schedule();
  });
})();
