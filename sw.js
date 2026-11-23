const VER='v1.0.31';
const CACHE='nexus-'+VER;
const CORE=['style.css','apps.js','switcher.js','01-core.js','02-apps.js','03-install.js','04-boot.js','fx.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-64.png','favicon.ico','icons/apps/life.png','icons/apps/health.png','icons/apps/jurnalist.png','icons/apps/edgeflow.png','icons/apps/vitaflow.png'];

/* Sayfa çalışan sürümü sorabilsin (panel alt bilgisinde gösterilir) */
self.addEventListener('message',function(e){
  if(e.data==='ver'&&e.ports&&e.ports[0])e.ports[0].postMessage(VER);
});

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){})}))}).then(function(){return self.skipWaiting()})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return (k.indexOf('nexus-')===0||k.indexOf('merkez-')===0||k.indexOf('basirhub-')===0)&&k!==CACHE}).map(function(k){return caches.delete(k)}));
    }).then(function(){return self.clients.claim()})
  );
});

/* Önce önbellek, yoksa ağ. Başka siteler (uygulamaların canlı simgeleri) buraya
   karışmaz: tarayıcı onları doğrudan ağdan alır, olmazsa sayfa yerel simgeye düşer. */
self.addEventListener('fetch',function(e){
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  if(/^\/(panel|api|g)(\/|$)/.test(u.pathname)||u.pathname==='/'||u.pathname==='/index.html')return;   /* panel, api, davet linki: önbelleğe/SW'ye girmez */
  e.respondWith(
    caches.match(r,{ignoreSearch:true}).then(function(hit){
      if(hit)return hit;
      return fetch(r).then(function(res){
        if(res&&res.ok&&res.type==='basic'){
          const cp=res.clone();
          caches.open(CACHE).then(function(c){c.put(r,cp)});
        }
        return res;
      }).catch(function(){
        return Response.error();
      });
    })
  );
});
