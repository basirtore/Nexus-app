'use strict';
/* ============================================================
   i18n.js · dil (Türkçe / English) + üst çubuktaki bayrak menüsü
   01-core.js'ten önce yüklenir (ana sayfa, davet, panel, giriş).
   Anahtar = Türkçe metnin kendisi; İngilizcesi EN tablosunda. Karşılığı yoksa Türkçesi görünür.
   Yer tutucu: {n} · İngilizce tekil/çoğul: {n|app|apps}
   Statik HTML: data-i18n (içerik), data-i18n-label (aria-label), data-i18n-ph (placeholder)
   Seçim: localStorage nexus.lang + 'nxl' çerezi (Worker'ın durum sayfaları için). Varsayılan Türkçe.
   Yeni metin eklerken: T('Türkçe metin') yaz ve EN tablosuna satır ekle.
   ============================================================ */
(function(){
  const KEY='nexus.lang';
  const EN={
    /* Genel */
    'Aç':'Open','Kapat':'Close','Tamam':'OK','Yükle':'Install','Hata':'Error','hata':'error','Evet':'Yes','Hayır':'No',
    'Yeni':'New','Özel':'Private','Menü':'Menu','Yönet':'Manage','Tekrar dene':'Try again',
    'Bağlantı sorunu':'Connection problem','Bağlantı hatası':'Connection error',
    'Bağlantını kontrol et':'Check your connection','Bağlantını kontrol et.':'Check your connection.',
    'Görünüm ve ses':'Appearance and sound','Güncelleme hazır':'Update ready','Uygulamayı kapatıp aç':'Close and reopen the app',
    /* Bölümler ve ilk uygulama açıklamaları */
    'Yaşam ve Sağlık':'Life & Health','Trader Araçları':'Trader Tools','Arşiv':'Archive',
    'Günlük plan, rutin ve alışkanlık takibi.':'Daily planning, routine and habit tracking.',
    'Uyku, beslenme ve kilo takibi.':'Sleep, nutrition and weight tracking.',
    'Trading günlüğü: işlem kaydı, istatistik ve analiz.':'Trading journal: trade log, statistics and analysis.',
    'Trader için risk ve disiplin aracı.':'Risk and discipline tool for traders.',
    'Birleşik eski sürüm. Artık güncellenmiyor.':'Old combined version. No longer updated.',
    /* Ana sayfa */
    '{name} nasıl yüklenir':'How to install {name}',
    'Uygulamalar henüz yayında değil;<br>hazır oldukça burada görünecek.':'The apps are not live yet;<br>they will appear here as they are ready.',
    'İşte senin için sunulan uygulamalar.':'Here are the apps available to you.',
    'Nexus\'a <em>hoş geldin.</em>':'Welcome <em>to Nexus.</em>',
    'Uygulama listesi alınamadı. Bağlantını kontrol et.':'Could not load the app list. Check your connection.',
    'Bilgilendirme':'Notice','Birkaç gün sonra tekrar uğrayabilirsin.':'Feel free to check back in a few days.',
    'Public Uygulamalar':'Public Apps','{n} Uygulama':'{n} {n|App|Apps}','{n} uygulama':'{n} {n|app|apps}',
    'Nexus\'a hoş geldin. Uygulamalar henüz yayında değil; hazır oldukça burada görünecek. Birkaç gün sonra tekrar uğrayabilirsin.':'Welcome to Nexus. The apps are not live yet; they will appear here as they are ready. Feel free to check back in a few days.',
    'Şu an yayında tek bir uygulama var. Beğenirsen <b>Yükle</b> ile ana ekranına ekle, <b>Aç</b> ile hemen dene. Yenileri geldikçe burada olacak.':'There is one app live right now. If you like it, add it to your home screen with <b>Install</b>, or try it right away with <b>Open</b>. New ones will appear here.',
    '{n} uygulama burada, tek yerde. Beğendiğini <b>Yükle</b> ile ana ekranına ekleyebilir, <b>Aç</b> ile hemen deneyebilirsin.':'{n} apps, all in one place. Add the ones you like to your home screen with <b>Install</b>, or try them right away with <b>Open</b>.',
    'Henüz uygulama yok.':'No apps yet.',
    'Çevrimdışı · kayıtlı simgeler gösteriliyor':'Offline · showing saved icons',
    'Son yenileme {t}':'Last refresh {t}','Henüz yenilenmedi':'Not refreshed yet','Hepsi güncel · {t}':'All up to date · {t}',
    '{ok}/{n} simge canlı, kalanı kayıtlı':'{ok}/{n} icons live, the rest saved',
    'Canlı simge alınamadı · kayıtlı simgeler gösteriliyor':'Live icons unavailable · showing saved icons',
    /* Yükle sayfası */
    'Bilgisayar':'Computer','Cihaz türü':'Device type','Ana ekrana ekle':'Add to home screen',
    'Siteyi <b>Safari</b>\'de aç.':'Open the site in <b>Safari</b>.',
    'Alttaki <b>Paylaş</b> {share} düğmesine dokun.':'Tap the <b>Share</b> {share} button at the bottom.',
    '<b>Ana Ekrana Ekle</b>\'yi seç, sonra <b>Ekle</b>\'ye dokun.':'Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.',
    'Siteyi <b>Chrome</b>\'da aç.':'Open the site in <b>Chrome</b>.',
    'Sağ üstteki <b>Menü</b> {menu} düğmesine dokun.':'Tap the <b>Menu</b> {menu} button at the top right.',
    '<b>Ana ekrana ekle</b> (ya da <b>Uygulamayı yükle</b>) seçeneğine dokun.':'Tap <b>Add to Home screen</b> (or <b>Install app</b>).',
    'Siteyi <b>Chrome</b> veya <b>Edge</b>\'de aç.':'Open the site in <b>Chrome</b> or <b>Edge</b>.',
    'Adres çubuğunun sağındaki <b>Yükle</b> {inst} simgesine tıkla.':'Click the <b>Install</b> {inst} icon on the right of the address bar.',
    '<b>Yükle</b>\'yi onayla.':'Confirm <b>Install</b>.',
    'Aç ve yükle':'Open and install','Siteyi aç':'Open site','APK indir (Android)':'Download APK (Android)',
    'APK, uygulamanın internetsiz açılan sürümüdür. İndirince Android <b>bilinmeyen kaynaklardan yükleme</b> izni isteyebilir, <b>İzin ver</b> de.':'The APK is the version of the app that opens without internet. After downloading, Android may ask for permission to <b>install from unknown sources</b>; tap <b>Allow</b>.',
    '<b>Aç ve yükle</b> siteyi açar; üstte çıkan <b>Yükle</b> kartına dokunman yeter. Kart çıkmazsa yukarıdaki adımları izle.':'<b>Open and install</b> opens the site; just tap the <b>Install</b> card at the top. If no card appears, follow the steps above.',
    'Ekledikten sonra uygulama ana ekranından tam ekran açılır.':'Once added, the app opens full screen from your home screen.',
    'Ana ekrana ekle, tam ekran çalışır':'Add to home screen, runs full screen',
    'Safari\'de Paylaş ▸ Ana Ekrana Ekle':'In Safari: Share ▸ Add to Home Screen',
    'Tarayıcı menüsünden Ana ekrana ekle\'yi seç':'Choose Add to Home screen in the browser menu',
    'Nexus\'u yükle':'Install Nexus',
    /* Tema, ses, tarih */
    'Otomatik':'Auto','Açık':'Light','Koyu':'Dark','Gece':'Midnight','Siyah':'Black',
    'Tema':'Theme','TEMA':'THEME','SES':'SOUND','Tıklama sesi':'Click sound','Tıklama Sesi':'Click Sound',
    'Bu cihazda saklanır':'Saved on this device','Düğmelerde ve bildirimlerde kısa ses':'A short sound on buttons and notifications',
    'Kapalı':'Off',
    'az önce':'just now','{n} dk önce':'{n} min ago','{n} sa önce':'{n} h ago','{n} gün önce':'{n} {n|day|days} ago',
    'GitHub deposu tanımlı değil':'No GitHub repository set','Alınamadı':'Unavailable','Son push {t}':'Last push {t}',
    /* Davet sayfası */
    'Nexus · Davet':'Nexus · Invite','Özel davet':'Private invite',
    'Senin için <em>hazırlandı.</em>':'Made <em>for you.</em>',
    'Özel olarak seninle paylaşıldı.':'Shared privately with you.',
    'Süresi doldu':'Expired','{n} dk geçerli':'Valid for {n} min','{n} sa geçerli':'Valid for {n} h','{n} gün geçerli':'Valid for {n} {n|day|days}',
    'Sana özel uygulamalar':'Apps for you','SANA ÖZEL MESAJ':'A MESSAGE FOR YOU','Nexus tarafından gönderildi':'Sent by Nexus',
    'Nexus tarafından seninle özel olarak paylaşılan uygulamalar.':'Apps shared privately with you by Nexus.',
    'Nexus tarafından seninle özel olarak paylaşılan uygulama.':'An app shared privately with you by Nexus.',
    'Süresiz erişim':'Unlimited access','Tek kullanımlık · sayfayı yenileme':'Single use · do not refresh',
    '{n} hak kaldı':'{n} {n|use|uses} left','Son hak':'Last use','yenileme hak harcar':'refreshing uses one',
    /* Giriş */
    'Nexus Panel · Giriş':'Nexus Panel · Sign in','Yönetici Paneli':'Admin Panel',
    'Devam etmek için yönetici anahtarını gir.':'Enter the admin key to continue.','Yönetici anahtarı':'Admin key',
    'Anahtarı göster':'Show key','Anahtarı gizle':'Hide key','Anahtarı gir':'Enter the key','Giriş Yap':'Sign In',
    /* Sunucu mesajları */
    'Çok deneme, 10 dk bekle':'Too many attempts, wait 10 min',
    'Sunucuda ADMIN_KEY tanımlı değil':'ADMIN_KEY is not set on the server',
    'Cloudflare\'e ulaşılamadı, silinemedi':'Could not reach Cloudflare, not deleted',
    'Cloudflare\'e ulaşılamadı':'Could not reach Cloudflare',
    'Cloudflare API\'ye bağlanılamadı':'Could not connect to the Cloudflare API',
    'CF_ACCOUNT_ID ve CF_API_TOKEN Worker\'da tanımlı değil':'CF_ACCOUNT_ID and CF_API_TOKEN are not set on the Worker',
    'Liste alınamadı':'Could not load the list','Liste alınamadı.':'Could not load the list.','yetkisiz':'unauthorized',
    'sunucu {n}':'server {n}',
    /* Panel: süre */
    'Süresiz':'No expiry','süresiz':'no expiry','{n} gün':'{n} {n|day|days}','{n} sa':'{n} h','{n} dk':'{n} min',
    '1 saat':'1 hour','6 saat':'6 hours','dk':'min','sa':'hours','gün':'days',
    /* Panel: genel ve menü */
    'Emin misin?':'Are you sure?','Dil değiştirilsin mi?':'Change language?',
    'Sayfa yenilenir; kaydedilmemiş değişiklikler gider.':'The page will reload and unsaved changes will be lost.',
    'Uygulamalar':'Apps','Herkese açık':'Public','Davet linkleri':'Invite links','Uygulama durumu':'App status','Bilgi':'Info',
    'Önizleme':'Preview','YÖNETİM':'MANAGEMENT','SİSTEM':'SYSTEM','Ana sayfaya git':'Go to home page','Çıkış':'Sign out',
    'Uygulama yok':'No apps','Önce Uygulamalar ekranından aç':'Turn some on in the Apps screen first',
    'Ana sayfa boş':'Home page is empty','Herkese açık uygulama yok':'No public apps',
    '{n} uygulama yayında':'{n} {n|app|apps} live','{n} gizli · ana sayfada herkese görünür':'{n} hidden · live ones are visible to everyone',
    'Hepsi ana sayfada görünür':'All visible on the home page',
    /* Panel: uygulamalar */
    'Bu Nexus':'This Nexus','Cloudflare\'de yok':'Not on Cloudflare','{w} düzenle':'Edit {w}','{w} Nexus\'ta görünsün':'Show {w} on Nexus',
    'Worker Nexus\'ta görünüyor':'Workers shown on Nexus','{n} değişiklik':'{n} {n|change|changes}','Henüz kaydedilmedi':'Not saved yet',
    'Worker bulunamadı.':'No Workers found.','Yükleniyor…':'Loading…',
    'Cloudflare\'e ulaşılamadı: {e}':'Could not reach Cloudflare: {e}','Son bilinen liste gösteriliyor.':'Showing the last known list.',
    '{n} yeni Worker var.':'{n} new {n|Worker|Workers}.','Kaydediliyor…':'Saving…','Kaydedilemedi':'Could not save',
    'Kaydet':'Save','Kaydedildi':'Saved','Liste güncellendi':'List updated','Geri al':'Undo',
    'Ad':'Name','Açıklama':'Description','Rozet':'Badge',
    'Bu Worker Cloudflare\'de bulunamadı (silinmiş olabilir). Nexus\'taki kaydını silebilirsin.':'This Worker was not found on Cloudflare (it may have been deleted). You can remove its Nexus entry.',
    'Listeden sil':'Remove from list','Listeden silinsin mi?':'Remove from the list?',
    '"{name}" Nexus listesinden silinir.':'"{name}" will be removed from the Nexus list.',
    'Kaydedilmemiş diğer değişiklikler de gider.':'Other unsaved changes will be lost too.',
    'Silinemedi':'Could not delete','Silinmedi':'Not deleted','Worker Cloudflare\'de hâlâ görünüyor':'The Worker still exists on Cloudflare',
    'Kaydedilmemiş değişiklikler':'Unsaved changes','Değişiklikler geri alındı':'Changes undone','Yenile':'Refresh',
    'Cloudflare hesabındaki Worker\'lar. Anahtarı açtıkların Nexus\'ta görünür; kalem simgesiyle ad, açıklama, kategori ve rozeti düzenlersin. Değişiklikler Kaydet\'e basınca uygulanır.':'Workers in your Cloudflare account. The ones you switch on appear on Nexus; use the pencil icon to edit name, description, category and badge. Changes apply when you press Save.',
    'Değişiklikler silinsin mi?':'Discard changes?','Kaydedilmemiş değişiklikler listeyi yenileyince gider.':'Refreshing the list discards unsaved changes.',
    /* Panel: kategoriler */
    'Kategoriler':'Categories','Kategori':'Category','Yeni kategori':'New category','Kategoriyi düzenle':'Edit category',
    'İngilizce adı (isteğe bağlı)':'English name (optional)','Simge':'Icon','Ad boş olamaz':'Name cannot be empty',
    'Bu ad zaten var':'This name already exists','En çok {n} kategori eklenebilir':'Up to {n} categories can be added',
    'Kategoriyi sil':'Delete category','Kategori silinsin mi?':'Delete category?',
    '"{name}" silinir. İçindeki uygulamalar "{to}" kategorisine taşınır.':'"{name}" will be deleted. Its apps move to "{to}".',
    'Değişiklik Kaydet\'e basınca uygulanır.':'Changes apply when you press Save.',
    /* Panel: herkese açık */
    'Public Mod':'Public Mode','Uygulamalarını <em>Herkese Aç</em>':'Make your apps <em>Public</em>',
    'Seçtiğin uygulamaları herkese açık hale getir, link ile paylaşılabilir yap.':'Make the apps you choose public and shareable by link.',
    'Herkese açık yaptığın uygulamalar, herkes tarafından erişilebilir olacaktır. Kapalılar yalnız davet linkiyle verilir.':'Public apps are accessible to everyone. The rest can only be shared with an invite link.',
    '{name} herkese açık':'{name} public','Değişiklikleri geri al':'Undo changes','Değişiklikleri Kaydet':'Save Changes',
    'Seçimi Kaldır':'Clear Selection','Tümünü Seç':'Select All','{n} uygulama herkese açık':'{n} {n|app is|apps are} public',
    /* Panel: davet linkleri */
    'Davet linki <em>oluştur</em>':'Create an <em>invite link</em>',
    'Süreyi, kullanım hakkını ve notu sen belirle.':'You set the duration, number of uses and note.',
    'Link oluşturma ayarları':'Link settings','Paylaşılacak uygulamalar':'Apps to share',
    'Henüz Nexus\'ta görünen uygulama yok. Menüden Uygulamalar ekranına girip istediklerini aç.':'No apps are shown on Nexus yet. Open the Apps screen from the menu and switch some on.',
    'SÜRE':'DURATION','KULLANIM':'USES','Karşılama notu (isteğe bağlı)':'Welcome note (optional)','Karşılama notu':'Welcome note',
    'Link oluştur':'Create link','Aktif linkler':'Active links',
    'Linkleri yalnızca sen yönetirsin. İstediğin zaman tek tek ya da hepsini iptal edebilirsin.':'Only you manage the links. You can revoke them one by one or all at once at any time.',
    '{t} kaldı':'{t} left','{a} / {b} kullanıldı':'{a} / {b} used','{n} açılış':'{n} {n|open|opens}','Paket':'Bundle',
    'Kalan süre':'Time left','Kalan hak':'Uses left','Aktif':'Active','Kopyala':'Copy','Paylaş':'Share','İptal':'Revoke',
    'Hepsini iptal et':'Revoke all','Aktif link yok.':'No active links.','Sınırsız':'Unlimited','Temizle':'Clear','Tümü':'All',
    '{n} kullanım':'{n} {n|use|uses}','(paket)':'(bundle)','Uygulama seç':'Select an app','<b>sınırsız</b> kullanım':'<b>unlimited</b> uses',
    'Azalt':'Decrease','Artır':'Increase','Değer':'Value','Birim':'Unit',
    'Geçerlilik süresi':'Validity period','Link bu süre dolunca kapanır':'The link closes when this time is up','ÖZEL SÜRE':'CUSTOM DURATION',
    'En çok 365 gün':'365 days at most','{t} olarak ayarla':'Set to {t}','Geçerli bir süre gir':'Enter a valid duration',
    'Kullanım sayısı':'Number of uses','Link bu kadar açılınca kapanır':'The link closes after this many opens','ÖZEL SAYI':'CUSTOM NUMBER',
    'Link her açıldığında 1 hak düşer; sayfayı yenilemek de hak harcar. Hak bitince link kendiliğinden kapanır.':'Each open uses 1; refreshing the page uses one too. The link closes automatically when none are left.',
    'En çok 1000':'1000 at most','Geçerli bir sayı gir':'Enter a valid number',
    'Link kopyalandı':'Link copied','Kopyalanamadı':'Could not copy','Paylaşım yok, kopyala':'Sharing unavailable, copy instead',
    'Tüm linkler iptal edilsin mi?':'Revoke all links?','Aktif olan bütün davet linkleri hemen çalışmaz hale gelir.':'All active invite links will stop working immediately.',
    'Linkler güncellendi':'Links updated','Link hazır':'Link ready','Kopyala ya da paylaş':'Copy or share it','Kartı kapat':'Close card',
    /* Panel: durum */
    'Uygulama <em>durumu</em>':'App <em>status</em>',
    'Uygulamalarının güncel durumunu buradan görüntüleyebilirsin.':'See the current status of your apps here.',
    'Uygulama listesi boş.':'The app list is empty.','Uygulama Durumları':'App Statuses','Durumu yenile':'Refresh status',
    'Bekleniyor…':'Waiting…','Kontrol':'Checking','Durum Bilgisi':'Status Info','Kontrol ediliyor…':'Checking…',
    'Hepsi çalışıyor':'All working','{a} / {b} çalışıyor':'{a} / {b} working',
    'Tüm uygulamalar sorunsuz çalışıyor.':'All apps are working fine.','{n} uygulama yanıt vermiyor.':'{n} {n|app is|apps are} not responding.',
    'Biraz sürebilir.':'This may take a moment.','Tüm uygulamalar şu anda aktif ve sorunsuz çalışıyor.':'All apps are currently up and working fine.',
    '{n} uygulama şu anda yanıt vermiyor.':'{n} {n|app is|apps are} not responding right now.','Uygulamalar kontrol ediliyor…':'Checking apps…',
    'Yanıt süresi: {n} ms':'Response time: {n} ms','Yanıt gelmedi':'No response','Çalışıyor':'Working','Açılmıyor':'Down',
    /* Panel: bilgi */
    'Uygulama Bilgileri':'App Information','Daha fazlası için, her zaman seninle.':'Always with you, for more.',
    'Son Sürüm':'Latest Version','Yeni sürüm':'New version','Son Push':'Last Push','Simgeler':'Icons','Son Girişler':'Recent Sign-ins',
    'Tüm cihazlardan çık':'Sign out of all devices','Tüm cihazlardan çıkılsın mı?':'Sign out of all devices?',
    'Bu cihaz dahil, tüm cihazlardaki oturumlar kapatılır. Tekrar girmek için yönetici anahtarı gerekir.':'Sessions on all devices, including this one, will be closed. You will need the admin key to sign in again.',
    'Nexus, güvenli ve kararlı bir şekilde kullanılmak üzere tasarlanmıştır.':'Nexus is designed to be used safely and reliably.',
    'Bugün':'Today','Dün':'Yesterday','Bilinmeyen cihaz':'Unknown device','Daha Az':'Show Less','Tümünü Gör':'See All',
    'Kayıt yok. Bundan sonraki girişler burada görünür.':'No records. Future sign-ins will appear here.'
  };
  const MON={tr:['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
    en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
  /* Bayraklar: renkler style.css değişkenlerinden */
  const LANGS=[
    {id:'tr',name:'Türkçe',flag:'<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice"><path class="fl-red" d="M0 0h30v20H0z"/><circle class="fl-white" cx="10.6" cy="10" r="5"/><circle class="fl-red" cx="11.9" cy="10" r="4"/><path class="fl-white" d="M14 10l4.5-1.46-2.78 3.83V7.63l2.78 3.83z"/></svg>'},
    {id:'en',name:'English',flag:'<svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice"><path class="fl-blue" d="M0 0h60v40H0z"/><path class="fl-sw" stroke-width="8" d="M0 0l60 40M60 0L0 40"/><path class="fl-sr" stroke-width="3" d="M0 0l60 40M60 0L0 40"/><path class="fl-sw" stroke-width="13" d="M30 0v40M0 20h60"/><path class="fl-sr" stroke-width="8" d="M30 0v40M0 20h60"/></svg>'}
  ];
  const CK='<svg class="lang-ck" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  let lang='tr';
  try{if(localStorage.getItem(KEY)==='en')lang='en'}catch(e){}

  function T(key,vars){
    let s=lang==='en'&&Object.prototype.hasOwnProperty.call(EN,key)?EN[key]:String(key==null?'':key);
    if(!vars)return s;
    return s.replace(/\{(\w+)(?:\|([^|{}]*)\|([^|{}]*))?\}/g,function(m,k,one,many){
      if(!(k in vars))return m;
      return one===undefined?String(vars[k]):(Number(vars[k])===1?one:many);
    });
  }
  /* Sunucudan gelen mesajlar (değişken kısımlı olanlar dahil) */
  function Ts(msg){
    if(lang!=='en')return msg;
    const s=String(msg);
    let m=s.match(/^Hatalı anahtar \((\d+) hak kaldı\)$/);
    if(m)return T('Wrong key ({n} {n|attempt|attempts} left)',{n:m[1]});
    m=s.match(/^Token reddedildi \((\d+)\)$/);
    if(m)return 'Token rejected ('+m[1]+')';
    return T(s);
  }

  function writeCookie(){try{document.cookie='nxl='+lang+'; Path=/; Max-Age=31536000; SameSite=Lax'}catch(e){}}

  /* Statik HTML metinleri */
  function apply(){
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el){el.innerHTML=T(el.getAttribute('data-i18n'))});
    document.querySelectorAll('[data-i18n-label]').forEach(function(el){el.setAttribute('aria-label',T(el.getAttribute('data-i18n-label')))});
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.setAttribute('placeholder',T(el.getAttribute('data-i18n-ph')))});
  }

  /* ---------- Bayrak düğmesi + açılır menü ---------- */
  const box=document.getElementById('langBox');
  function el(s){return box.querySelector(s)}
  function flagOf(l){return '<span class="lang-flag" aria-hidden="true">'+l.flag+'</span>'}
  function draw(){
    if(!box)return;
    const cur=LANGS.filter(function(l){return l.id===lang})[0];
    const label=lang==='en'?'Language: English':'Dil: Türkçe';
    box.innerHTML='<button id="topLang" class="ib" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="langMenu" aria-label="'+label+'">'+flagOf(cur)+'</button>'
      +'<div id="langMenu" class="lang-menu" role="menu">'
      +LANGS.map(function(l){
        return '<button class="lang-it" type="button" role="menuitemradio" aria-checked="'+(l.id===lang)+'" data-lang="'+l.id+'" lang="'+l.id+'">'+flagOf(l)+'<span>'+l.name+'</span>'+CK+'</button>';
      }).join('')+'</div>';
  }
  function toggle(open){
    if(!box)return;
    el('#langMenu').classList.toggle('open',open);
    el('#topLang').setAttribute('aria-expanded',open?'true':'false');
  }
  function isOpen(){return !!box&&el('#langMenu').classList.contains('open')}
  function set(id){
    if(id===lang)return;
    const go=window.nxLangGuard?window.nxLangGuard():Promise.resolve(true);
    go.then(function(ok){
      if(!ok)return;
      lang=id;
      try{localStorage.setItem(KEY,id)}catch(e){
        if(window.NEXUS_PANEL)return;   /* panel yeniden yüklenir; seçim saklanamıyorsa değişmez */
      }
      writeCookie();
      apply();
      draw();
      window.dispatchEvent(new CustomEvent('nx:lang'));
    });
  }
  document.addEventListener('click',function(e){
    if(!box)return;
    const it=e.target.closest('[data-lang]'),btn=e.target.closest('#topLang');
    if(btn){toggle(!isOpen())}
    else if(it&&box.contains(it)){toggle(false);el('#topLang').focus({preventScroll:true});set(it.dataset.lang)}
    else if(isOpen()&&!box.contains(e.target)){toggle(false)}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&isOpen()){toggle(false);el('#topLang').focus({preventScroll:true})}
  });

  window.T=T;
  window.Ts=Ts;
  window.nxLang=function(){return lang};
  window.monName=function(i){return MON[lang][i]};
  window.nxLangClose=function(){toggle(false)};

  writeCookie();
  apply();
  draw();
})();
