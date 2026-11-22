'use strict';
(function(){
  var $=function(i){return document.getElementById(i)};
  var f=$('lf'),k=$('key'),e=$('err'),c=$('card'),b=$('go'),eye=$('eye'),busy=false,AC=null;

  /* Kısa ses: bu sayfa fx.js'i yüklemez, bu yüzden küçük bir kopyası burada. Ayar: localStorage nexus.v1 > snd (false = kapalı) */
  function unlock(){
    try{
      var C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;
      AC=AC||new C();
      if(AC.state==='suspended')AC.resume();
    }catch(x){}
  }
  function snd(kind){
    try{
      if(JSON.parse(localStorage.getItem('nexus.v1')||'{}').snd===false)return;
      if(!AC)return;
      var t=AC.currentTime,ok=kind==='ok',seq=ok?[[660,0],[880,.09]]:[[220,0],[165,.11]];
      seq.forEach(function(n){
        var o=AC.createOscillator(),g=AC.createGain();
        o.type=ok?'sine':'triangle';
        o.frequency.value=n[0];
        g.gain.setValueAtTime(.0001,t+n[1]);
        g.gain.exponentialRampToValueAtTime(.12,t+n[1]+.015);
        g.gain.exponentialRampToValueAtTime(.0001,t+n[1]+.17);
        o.connect(g);g.connect(AC.destination);
        o.start(t+n[1]);o.stop(t+n[1]+.2);
      });
    }catch(x){}
  }
  function vib(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(x){}}

  function fail(m){
    e.textContent=m;
    c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');
    snd('err');vib([40,60,40]);
  }
  function idle(){busy=false;b.disabled=false;b.classList.remove('is-load');b.removeAttribute('aria-busy')}

  /* Göz: yazılan anahtarı göster/gizle (odak girişte kalsın) */
  eye.addEventListener('mousedown',function(ev){ev.preventDefault()});
  eye.addEventListener('click',function(){
    var show=k.type==='password';
    k.type=show?'text':'password';
    eye.setAttribute('aria-pressed',show?'true':'false');
    eye.setAttribute('aria-label',show?'Anahtarı gizle':'Anahtarı göster');
  });

  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    if(busy)return;
    if(!k.value){fail('Anahtarı gir');k.focus();return}
    busy=true;e.textContent='';
    b.disabled=true;b.classList.add('is-load');b.setAttribute('aria-busy','true');
    unlock();
    fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k.value,remember:true})})
    .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
    .then(function(x){
      if(x.ok){
        snd('ok');vib(15);
        document.body.classList.add('lg-end');
        c.classList.remove('shake');c.classList.add('out');
        setTimeout(function(){location.replace('/panel/')},450);
      }else{idle();fail(x.j.e||'Hata')}
    })
    .catch(function(){idle();fail('Bağlantı hatası')});
  });
})();
