'use strict';
(function(){
  var k=document.getElementById('key'),e=document.getElementById('err');
  function go(){
    e.textContent='';
    fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k.value})})
    .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})
    .then(function(x){if(x.ok)location.href='/panel/';else {e.textContent=x.j.e||'Hata';var c=document.getElementById('card');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}})
    .catch(function(){e.textContent='Bağlantı hatası'});
  }
  document.getElementById('go').onclick=go;
  k.onkeydown=function(ev){if(ev.key==='Enter')go()};
})();
