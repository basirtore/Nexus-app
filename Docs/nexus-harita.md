# Nexus Harita Dosyası · Proje Haritası ve Çalışma Düzeni

Bu dosya, Nexus'u (eski adları Basir Hub, Merkez) yeni oturumda tanıtmak içindir: Claude bunu okuyunca hangi dosyada ne olduğunu bilir, gerekli dosyaları söyler, değişikliği yapar, çıktıyı tek zip olarak hazırlar ve bu haritayı günceller. Kullanıcının yapacağı: yalnızca bu haritayı yükleyip isteğini yazmak.
Kullanıcı Türkçe yazar, telefondan okur, dosyaları telefondan GitHub'a yükler. Kısa ve net cevap ister.

---

## 0. Açık işler
- **Bekleyen iş:** v1.8.0 için Worker yeniden dağıtılmalı (`npx wrangler deploy` ya da Git ile) ve Cloudflare'de `CF_ACCOUNT_ID` + `CF_API_TOKEN` Secret olarak eklenmeli (Bölüm 1b). Repodan `panel/private.json` ve `panel/private.js` silinmeli (zip silemez). `fx.js` en üstündeki `GH_REPO` boş: GitHub deposu (`kullanici/depo`) yazılınca "Son push" görünür. `switcher.js` satırı uygulamalara eklenecek (`/api/public`, CORS `*`). Kartlara ekran görüntüsü (görsel gerekir). Panelde repo/Cloudflare linkleri yok.
- **Doğrulanmamış (gerçek Cloudflare'de ve telefonda denenmedi):** Cloudflare API yanıtları (`/workers/scripts`, `/workers/subdomain`) sahte yanıtla denendi; gerçek token ile ilk açılış, "yeni" etiketi ve alt alan adı okuma · `/api/public` + KV `pub` + gizli giriş (logoya 3 dokunuş) · tıklama sesi ve titreşim · 5 temanın telefondaki görünümü · GitHub'dan gelen "Son push" · `color-mix` desteklemeyen eski tarayıcıda renkli kutu zemini düz kalır (bilinçli) · canlı simgeler gerçek adreslerden.
- **Bilinen sınır / borç:** Başka bir sitenin PWA'sı bu sayfadan doğrudan yüklenemez (tarayıcı kuralı). Tek kullanımlık davet sayfası yenilenirse geçersiz olur (bilinçli; davet sayfasında uyarı çipi var). Panelde `invites.js` / `status.js` eski taslak dosyalardır, yüklenmiyor (depodan silinebilir).
- **Depoda eski dosya kaldıysa:** eski `Docs/basir-hub-harita.md` ve `Docs/merkez-harita.md` elle silinebilir.

---

## 1. Claude için çalışma kuralları (HER OTURUMDA UYGULA)
1. Önce bölüm 0'a bak, kullanıcıya nerede kalındığını tek cümleyle söyle. İstek gelince bölüm 3 tablosuna bak; ortak parça değişiyorsa 3b'ye bak. Emin değilsen bir dosya fazla iste.
2. Token tasarrufu: `style.css` ve `index.html` yalnızca görünüm/iskelet değişince istenir. Dosyaları tek seferde, nedenleriyle iste.
3. Sabit istek sırası: ① index.html ② sw.js ③ js dosyaları numara sırasıyla ④ style.css ⑤ icons.
4. İstek biçimi (cevabın en sonu): `Bende var olanlar: …` satırı, ardından `Vermen gerekenler:` numaralı liste (yalnızca yeni getirilecekler, kısa nedenle).
5. Tahmin etme: değişiklikten önce fonksiyonu `grep` ile bul, etrafını oku.
6. Yapı düz: js dosyaları kökte, `js/` klasörü yok. Yollar göreli. Yeni js eklenince `index.html` script sırası + `sw.js` `CORE` listesi birlikte güncellenir.
7. Yükleme sırası önemli: dosyalar tek global kapsamı paylaşır; `04-boot.js` en sonda kalır.
8. **Sürüm yalnızca `sw.js` `VER`'de durur;** her teslimde artır. Günlüğe sürüm değil tarih yazılır.
9. **Teslim: değişen dosyalar + güncel harita TEK ZIP**, iç yapı depoyla birebir (kök dosyalar kökte; `icons/`, `Docs/` kendi yolunda). Zip adı `nexus-<VER>.zip`. Zip'i telefonda Dosyalar uygulamasında "birleştir / üzerine yaz" ile aç; yüklerken klasör yolları korunur. `Docs/`, `Yedek/`, `icons/` içindeki değişmeyen dosyalar zip'e konmaz.
10. Her değişiklikten sonra haritayı güncelle ve zip'e `Docs/nexus-harita.md` olarak koy.
11. Sınama: mümkünse başsız tarayıcıda aç (konsol hatası, bölümler, kartlar, sheet, çevrimdışı, açık/koyu tema); çalıştıramadıysan "yalnızca sözdizimi kontrolü yaptım" de.
12. Dosya değiştiren her cevabın sonuna: `Harita: güncellendi/değişmedi (…)` ve `Söz dizimi: node --check geçti (…)`.
13. Satır içi stil yok (sınıf kullan); renkler yalnızca `var(--…)` (hex yalnızca `style.css` bölüm 1 tema değişkenlerinde); kullanıcı/dış metin `innerHTML`'e giderken `esc`.
14. Boyut doğrulaması: yüklenen dosya boyutu haritadakinden %15'ten fazla farklıysa işe başlamadan tek satır uyarı yaz.
15. Kısa cevap: ne yaptığını, hangi dosyaları yükleyeceğini, neyi deneyeceğini yaz.

---

## 1b. Sunucu katmanı ve panel (v1.4.0)
- **`worker.js`:** yalnız `/panel/*`, `/api/*`, `/g/*` Worker'dan geçer (`wrangler.jsonc` `run_worker_first`); gerisi statik. Bağlantılar: `ASSETS`, KV `LINKS`, gizli `ADMIN_KEY`. Cloudflare Access gerekmez.
- **Giriş:** `/panel/login` → `POST /api/login` → HttpOnly çerez `nx` (anahtardan HMAC). Yanlış denemede IP başına 10 hak; hak bitince son hatadan 10 dk bekler, sonra yine 10 hak. Anahtarı değiştirmek tüm oturumları düşürür. `/panel/*` çereze bağlı, `private.js` gerçekten gizli.
- **Liste kaynağı (v1.8.0):** `apps.js` ve `panel/private.*` artık okunmaz. Worker, Cloudflare API ile hesaptaki Worker listesini çeker (`GET /accounts/<id>/workers/scripts`, alt alan adı `/workers/subdomain`); adres `https://<worker>.<alt alan adı>.workers.dev/`. Gerekenler (Secret, repoda yok): `CF_ACCOUNT_ID`, `CF_API_TOKEN` (salt okunur, Workers Scripts Read); isteğe bağlı `CF_SUBDOMAIN` (API'den alınamazsa yedek). KV `apps` = `{v,a:[{id,w,show,name,desc,sec,badge,icon,loc}],seen}`: `w` Worker adı, `id` davet/`pub` için sabit kimlik (yeni Worker'da = Worker adı), `show` Nexus'ta görünsün, `loc` paketle gelen yerel simge var, `seen` bilinen Worker'lar (yoksa "yeni"). KV `cfl` = `{at,sub,names}` son bilinen Cloudflare listesi (yalnız değişince yazılır). İlk açılışta KV `apps` yoksa `worker.js` `SEED` (eski 5 uygulama, hepsi işaretli) yazılır; ilk başarılı Cloudflare listesi `seen`'e taban olur (mevcutlar "yeni" sayılmaz). Boş ad → Worker adı; bölüm boşsa `life`.
- **Panel uçları (v1.8.0, yalnız yönetici):** `GET /api/apps` (Nexus'ta görünenler + `pub`), `GET /api/workers` (tüm Worker'lar + ayarlar; Cloudflare'e ulaşılamazsa `err` + son bilinen liste), `POST /api/apps` (ekranın tamamını kaydeder, `seen` günceller, değişmediyse KV'ye yazmaz). Herkese açık `GET /api/public` ve davet `GET /api/g/<kod>` yalnız `show` işaretli uygulamaları verir; `/api/public` ayrıca KV `pub` ile süzer. Alt alan adı alınamazsa bu uçlar 502 döner ("alınamadı + Tekrar dene").
- **Panel yan menüsü (v1.6.1):** panelde üst çubukta solda hamburger (`#topMenu`, `data-act="menu"`); soldan açılan `#drawer` (`panel/panel.js` kurar, `#drawerBody`). Kategoriler (v1.8.0): NEXUS (Önizleme = ana ekranın görünümü) · YÖNETİM (Uygulamalar + sayı, Herkese açık + sayı, Davet linkleri + sayı, Uygulama durumu) · SİSTEM altta (Bilgi, Ana sayfayı gör = `/`, Çıkış). Üstte özet kutusu ("N uygulama · X herkese açık · Y gizli"). Her öğe ayrı görünüm: hash `#uyg` (Uygulamalar: Worker listesi, "Nexus'ta göster" anahtarı, Düzenle: ad/açıklama/bölüm/rozet, "Yeni"/"Bu Nexus"/"Cloudflare'de yok" etiketleri, Kaydet/Geri al çubuğu `#saveBar2`; kayıttan sonra sayfa yenilenir), `#acik`, `#davet`, `#durum`, `#bilgi` (boş = Uygulamalar; eski `#yonet` = davet). `04-boot.js` `route()` görünümü seçer ve `panelView(v)`'yi çağırır (başlık, görünen bölüm `section[data-v]`, menüde `aria-current`, sayaçlar). Eski sağ üst "Yönet" düğmesi ve Geri düğmesi kaldırıldı; Çıkış Bilgi'den menüye taşındı. Menü açıkken `#app` `inert` + `html.lock` (Yükle sayfasındaki gibi), Escape kapatır. Ana sayfada (normal kullanıcı) menü yok.
- **Üç kullanıcı türü (v1.6.0):** (1) **Normal kullanıcı:** `/` herkese açık; liste `GET /api/public` (giriş yok) ile gelir, yalnız panelde "Herkese açık" işaretlenenler. İşaret KV `pub` = `[id,...]` (yalnız Worker yazar, `POST /api/public` yönetici çerezi ister; id'ler `apps.js`+`panel/private.js` listesine karşı doğrulanır). Gizli uygulamalar ana sayfada hiç görünmez; liste boşsa "Henüz uygulama yok", ağ hatasında "alınamadı + Tekrar dene" (`APPS_FAIL`). (2) **Davetli:** `/g/<kod>`, yalnız linkteki uygulamalar (aşağıda). Davetli uygulama cihazda kaydedilmez (bilinçli karar). (3) **Yönetici:** gizli giriş = ana sayfada sol üstteki logoya (`#topLogo`, `data-act="tap"`) 3 sn içinde 3 dokunuş → `/panel/login`; çerez varsa `/panel/login` doğrudan `/panel/`'e yönlenir; doğrudan `/panel/` de çalışır; Çıkış `/`'e döner.
- **Veri kaynağı:** ad, açıklama, bölüm, rozet KV `apps`'te, panelde Uygulamalar ekranından düzenlenir; simge uygulamanın kendi sitesinden (`url + icon`, varsayılan `icons/icon-192.png`). Herkese açık olup olmadığı KV `pub`'da. Panelde `loadApps` tek kaynaktan (`/api/apps`) okur.
- **Davet sayfası:** `/g/<kod>` Worker'dan `guest.html` döner (Nexus ekranının aynısı, `guest.js`); `01-core.js` listeyi `GET /api/g/<kod>` ile alır, yalnız linkte seçilen uygulamalar gösterilir. Tek kullanımlık link bu API çağrısında tüketilir. Eski doğrudan yönlendirme / ara sayfa kaldırıldı.
- **Davet linki:** KV `l:<kod>` = `{apps,exp,once,note,created,hits,last}`, süreli kayıtlar KV TTL ile temizlenir. `/g/<kod>`: tek uygulama + not yok + tek kullanımlık değil → doğrudan yönlendirir; aksi halde ara sayfa (`?go=<id>` ile açılır; mesaj önizleme botları tek kullanımlığı tüketmesin diye). API: `GET/POST /api/links`, `DELETE /api/links/<kod>`, `POST /api/links/clear`, `GET /api/status`, `/api/logout`.
- **`panel/panel.js`:** link formu, aktif liste (kalan süre, açılış sayısı, iptal), durum noktaları. `panel/index.html` = `index.html` kopyası (`<base href="../">`, `#adm` bölümü); iskelet değişince panel kopyası da güncellenir. `sw.js` `/panel`, `/api`, `/g` yollarına karışmaz.
- **`switcher.js`:** uygulamaya `<script src="https://NEXUS/switcher.js" defer></script>`; yalnız herkese açıklar listelenir.
- KV ücretsiz sınırı: günde 1000 yazma; her link açılışı 1 yazma sayılır.

## 2. Proje özeti ve yükleme düzeni
- **Ne yapar:** Tüm uygulamaların merkezi. 5 uygulamayı 3 bölümde (alan) gösterir: **Yaşam ve Sağlık** (VitaFlow Life, VitaFlow Health) · **Trader Araçları** (Journalist, EdgeFlow) · **Arşiv** (VitaFlow, birleşik eski sürüm). Her kartta **Yükle** (alttan açılan, cihaza göre ana ekrana ekleme adımları + "Siteyi aç ve yükle") ve **Aç** (siteyi yeni sekmede açar). Üstte "Bu sayfayı yükle" (Nexus'un kendisi).
- **Görünüm:** Hero (logo, gradient "Nexus" başlığı, "5 uygulama · 3 alan" etiketi), her bölümde renkli simge kutusu + başlık + alt başlık + sayı, bölüm renginde tonlanmış kartlar ve düğmeler, sabit arka plan parıltısı, açık/koyu tema (`prefers-color-scheme`). Bölüm renkleri: Yaşam yeşil-nane, Trader mavi, Arşiv gri.
- **Simgeler:** kart önce paketle gelen kayıtlı simgeyle (`icons/apps/<id>.png`) çizilir; arka planda her uygulamanın kendi sitesinden canlı simge (`url + icon`) çekilir. Yüklenirse (en az 64×64) kartta değişir; yüklenemezse (çevrimdışı, hata) kayıtlı simge kalır. Başka sitenin simgesi servis çalışanından geçmez. Canlı deneme: açılışta, çevrimiçi olunca, sekmeye dönünce (30 sn sınırı); önbellek kırıcı `h=<saat>`.
- **Veri:** `localStorage` anahtarı `nexus.v1`, `S={v:1,last}`; `last` = son başarılı canlı simge zamanı. Yedek/aktarım yok (kullanıcı verisi tutulmaz).
- **Teknoloji:** saf JS, framework yok; kısa tıklama sesi Web Audio ile üretilir (dosya yok, `snd`, ayardan kapanır); hafif titreşim (`vib`); CSS animasyon (`transform`/`opacity`); 5 tema (Otomatik, Açık, Koyu, Gece, Siyah).
- **Yayın:** statik; Cloudflare Workers/Pages ya da GitHub Pages. Yollar göreli.
- **Dosya düzeni (düz):** `index.html`, `style.css`, `sw.js`, `manifest.json`, `01-core.js` … `04-boot.js`, `icons/` (+ `icons/apps/`), `Docs/`, `Yedek/` (içi `.gitkeep`), `README.md`.
- **Yükleme sırası:** 01 → 02 → 03 → 04 (global kapsam paylaşılır; bir fonksiyonun adı/parametresi değişirse çağıran dosyaları da kontrol et).
- **Tema:** `<html data-theme>`: yok = cihaza uy; `light`, `dark`, `midnight` (Gece), `amoled` (Siyah). Seçim `localStorage` `nexus.theme` (kendi anahtarı: her sayfanın `<head>`'indeki küçük betik ilk boyamadan önce uygular, `fx.js` değiştirir ve `theme-color` meta'sını günceller). Seçim sağ üstteki simgeden (ana sayfa, panel, davet sayfası) ya da panel > Bilgi'den açılan "Görünüm ve ses" sayfasından. Tema değişkenleri `[data-theme=…]` biçiminde (html'siz) olduğu için önizleme düğmeleri de aynı değişkenleri kullanır.
- **Ses ve bildirim:** `S.snd` (varsayılan açık). `snd(k)` = tap | open | ok | err | on | off | theme. Her düğme/bağlantı dokunuşunda `fx.js` genel dinleyicisi tık çalar; `toast(msg,type,sub)` türü `ok`/`err` ise ses çalar (tik çizilir, alt satır, ilerleme çizgisi).
- **Sürüm ve son push:** `verInto` sürümü çalışan servis çalışanından sorar (renkli `.ver` etiketi); `ghPush` `GH_REPO`'nun son commit tarihini GitHub API'den çeker (10 dk önbellek, `S.push`). Ana sayfada alt yazıda, panelde Bilgi'de görünür. Bilgi'deki "Simgeler" satırı eski "Son canlı güncelleme"dir.
- **Ekran:** tek sayfa `#v-apps` (içinde `.sec` bölümleri); alttan açılan `#sheet`; `#toast`.

---

## 3. İstek → gereken dosyalar

| Kullanıcı şunu istiyor | Ana dosya(lar) | Sık eşlik eden |
|---|---|---|
| Yeni uygulama ekle / ad, açıklama, bölüm, rozet değiştir | Panelde Uygulamalar ekranı (kod gerekmez); ilk değerler `worker.js` `SEED` | icons/apps/<id>.png yalnız eski 5 için |
| Bölüm adı, simgesi, sırası; yeni bölüm | 01-core.js (`SECS`: id, title, ic) | — (renk sınıfı yok) |
| Bölüm/kart yerleşimi, düğmeler | 02-apps.js (`renderApps`, `appCard`) | style.css (`.sec*`, `.app*`, `.btn*`) |
| Simge canlı çekme / kayıtlı simge davranışı | 02-apps.js (`loadLive`, `liveIconUrl`, `updNet`) | 01-core.js (`S`, `save`) |
| Simge yolu değişti (ör. `?v=3`) | 01-core.js (`APPS[].icon`) | — |
| "Yükle" sayfası, adım metinleri | 03-install.js (`STEPS`, `renderSheet`, `openSheet`) | style.css (`.sheet*`, `.steps`, `.seg*`, `.sh-*`) |
| Üst çubuk | index.html, guest.html, panel/index.html | style.css (`.top*`, `.ib`) |
| Panel yan menüsü (hamburger), Yönet görünümleri (`#acik #davet #durum #bilgi`) | panel/panel.js (`buildDrawer`, `panelView`, `initAdmin`), 04-boot.js (`route`, `VIEWS`) | panel/index.html (`#topMenu`, `#drawer`), style.css (`.drawer*`, `.dr-*`, `.top-menu`) |
| Renk/tema | style.css (bölüm 1: `--bg --surface --surface-2 --line --text --mute --accent`) | manifest.json, index.html (`theme-color`) |
| Nexus simgesi / adı | icons/*, manifest.json | index.html, 03-install.js (`hubEntry`), sw.js `CORE` |
| Çevrimdışı / önbellek / sürüm | sw.js | — |
| Açılış, olay bağlama, gizli giriş (logoya 3 dokunuş) | 04-boot.js (`hidden`, `showFt`) | index.html (`#topLogo`, `#ft`) |
| Tema (Gece/Siyah dahil), tıklama sesi, ayarlar sayfası, sürüm etiketi, "Son push" | fx.js (`THEMES`, `snd`, `settingsHTML`, `ghPush`, `GH_REPO`) | style.css (bölüm 1 `[data-theme]`, `.ver`, `.tm*`, `.sw*`), her sayfanın `<head>` tema betiği |
| Bildirim (toast) görünümü / türleri | 01-core.js (`toast`) | style.css (`.toast*`) |
| Davet sayfası (karşılama, çipler, kartlar) | guest.html, guest.js | style.css (bölüm 6c `.g-*`, `.chip`), worker.js (`guestApi`) |
| Durum sayfaları (geçersiz link), panel girişi | worker.js (`page`, `bad`), panel/login.html | style.css (bölüm 6d `.st-*`) |
| Herkese açık anahtarlar + Kaydet/Geri al çubuğu, durum ve bilgi görünümleri | panel/panel.js (`build`, `pubSync`, `pubSave`, `status`) | style.css (`.sw*`, `.savebar`, `.stx*`, `.kv*`) |
| Uygulama listesi kaynağı, Cloudflare API, "yeni" mantığı | worker.js (`cfgGet`, `cfRefresh`, `appList`, `/api/workers`, `POST /api/apps`) | panel/panel.js (`wk*`), 01-core.js (`loadApps`), style.css (`.wk*`) |
| Herkese açık işareti / ana sayfa listesi | worker.js (`pubIds`, `publicApi`, `POST /api/public`) | 01-core.js (`loadApps`), panel/panel.js (`pb` kutuları) |

**3b. Çok dosyaya yayılan parçalar** (`grep` ile doğrulandı)

| Parça | Tanımlandığı dosya | Kullanıldığı dosyalar |
|---|---|---|
| `APPS` | 01-core.js | 02-apps.js, 03-install.js |
| `SECS` | 01-core.js | 02-apps.js |
| `S`, `save`, `load`, `migrate` | 01-core.js | 02-apps.js (`S.last`), 04-boot.js |
| `esc` | 01-core.js | 02-apps.js, 03-install.js |
| `toast`, `vib` | 01-core.js | 03-install.js, 04-boot.js, index.html (SW güncelleme bildirimi) |
| `localIcon` | 02-apps.js | 03-install.js (`sheetIcon`) |
| `platform`, `isStandalone` | 01-core.js | 03-install.js |
| `hhmm` | 01-core.js | 02-apps.js |
| `openSheet/closeSheet/setPlat` | 03-install.js | 04-boot.js |
| `renderApps/loadLive/updNet` | 02-apps.js | 04-boot.js |

Kural: bir ortak fonksiyonun adı, parametresi, dönüşü ya da davranışı değişirse çağıran dosyalar da istenir. Örnek: `localIcon` yolu değişirse hem kart hem "Yükle" sayfası etkilenir; bölüm id'si değişirse `APPS.sec` ve `SECS.id` birlikte değişir.

---

## 4. Dosya dosya içerik haritası
Ön ek sözlüğü: `top-*` üst çubuk, `sec-*` bölüm, `app-*` satır kart, `sh-*` alttan açılan sayfa, `inf-*` Yönet bilgi satırı, `st-*` durum noktası, `seg-b` sekme düğmesi, `ib` simge düğmesi.

### index.html (3203 bayt / 80 satır) · İSKELET
Hata bandı betiği (`window.onerror` → `.errband`), üst çubuk (`.top`), `#v-apps` (panelde ayrıca `#v-yonet`), `#welcome` (yalnız guest.html), `#sheet`/`#sheetBody`, `#toast`, script sırası 01→04, servis çalışanı kaydı ve "Güncelleme hazır" bildirimi. `theme-color` açık/koyu iki etiket.

### style.css · GÖRÜNÜM
Bölüm 1 token'lar (açık + koyu, tek teal vurgu; `--r-s/m/l` = 8/12/16, `--dur` 150ms); 2 temel; 3 bileşenler (`.btn`, `.ib`, `.badge`, `.seg`, `.toast`, `.errband`, `.sheet`); 4 üst çubuk (`.top*`), bölüm (`.sec*`, Arşiv `details.sec`), satır kart (`.app*`; ad bağlantısı `.app-open::after` ile satırı kaplar, `.app-add` üstte); 5 yükle sayfası; 6 panel/Yönet (`.adm*`, `.inv*`); 7 hareket azaltma. Gradyan, parıltı, bölüm renkleri ve giriş animasyonları yok. `.off` = gizleme.

### sw.js (2117 bayt / 46 satır) · ÇEVRİMDIŞI + SÜRÜM
`VER`, `CACHE='nexus-'+VER`, `CORE` (20 dosya); sürüm v1.0.0 (yeni repoda sürüm bilerek 1.0.0'dan başlar; günlükteki v1.x numaraları önceki repoya aittir). Önce önbellek, yoksa ağ; yalnızca aynı site GET istekleri. Başka sitelerin (canlı simge) istekleri karışmaz. Çevrimdışı gezinmede hata döner (çevrimdışı açılış yok; `/`, `/index.html`, `/panel`, `/api`, `/g` SW'ye girmez). Eski `merkez-*` ve `basirhub-*` önbellekleri silinir. Yeni dosya eklenince `CORE`'a ekle.

### manifest.json (622 bayt / 18 satır) · PWA BİLDİRİMİ
`name`/`short_name` "Nexus", `display:standalone`, koyu tema rengi, 192/512/maskable ikonlar.

### 01-core.js (5080 bayt / 129 satır) · SABİTLER, BÖLÜMLER, DURUM, YARDIMCILAR
`KEY`, `SECS` (id, title, sub, ic = SVG içeriği), `APPS` (id, sec, name, url, icon, desc, badge; panelde pub; `/api/public` / `/api/apps`'ten gelir), `S`, `$`, `$$`, `esc`, `save`, `load`, `migrate`, `vib`, `toast`, `hhmm`, `platform` (ios/android/desktop), `isStandalone`.

### 02-apps.js (5214 bayt / 129 satır) · BÖLÜMLER + KARTLAR + CANLI SİMGE
`localIcon`, `liveIconUrl`, `appCard` (satır kart), `renderApps` (bölümleri `SECS` sırasıyla çizer, boş bölümü atlar, Arşiv katlanır; liste boşsa "Tekrar dene"), `updNet` (Yönet > Bilgi durumu), `loadLive` (en az 64×64 şartı, 30 sn sınırı).

### 03-install.js (4672 bayt / 109 satır) · YÜKLE SAYFASI + NEXUS YÜKLEME
`PLATS`, `STEPS` (adım metinleri; simgeler `IC_*` + `sic()` ile satır içi SVG; yeni cihaz/tarayıcı eklemek buraya), `hubEntry` (ad "Nexus"), `sheetIcon`, `renderSheet` (`.sh-wrap`), `sheetShow` (Yükle ve Ayarlar ortak: `#app` `inert` + `html.lock` kaydırma kilidi), `openSheet`, `closeSheet` (ikisini geri alır), `setPlat`. Tek birincil düğme "Siteyi aç", kapatma sağ üstte simge. ≥640 px'te ortalı 420 px kutu.

### fx.js (8158 bayt / 202 satır) · TEMA, SES, SÜRÜM/SON PUSH, AYARLAR
`GH_REPO`, `THEMES`, `themeGet/themeApply/themeSet`, `actx/beep/snd`, genel tık dinleyicisi, `fmtDT/fmtShort/ago`, `ghPush`, `pushInto`, `verInto`, `settingsHTML`, `openSettings` (`sheetShow` kullanır), `bindLive`. 03-install.js'ten sonra, 04-boot.js'ten önce yüklenir; `sw.js` `CORE`'da.

### 04-boot.js (3073 bayt / 89 satır) · BAŞLATICI (EN SON)
`load → migrate → start (loadApps → renderApps → route → loadLive)`, `showFt`, `hidden` (5 dokunuş → `/panel/login`), `route()` (hash → görünüm, `panelView` çağrısı), `hashchange`, tek `click` dinleyicisi (`data-act`: install/open/go/close/pl/retry/tap; menü işlemleri `panel/panel.js`'te), `Escape`, `online/offline/visibilitychange`, `loadLive(true)`.

### icons/
Nexus: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (opak), `favicon-32.png` (ortada parlak çekirdek, çevresinde halka ve 4 renkli uydu nokta). `icons/apps/`: `life`, `health`, `jurnalist`, `edgeflow`, `vitaflow` (.png) = repolardaki `icons/icon-192.png` kopyaları (21 Kasım 2026 tarihli). **`vitaflow.png` şimdilik nötr yer tutucudur**; gerçek `icon-192.png` gelince üzerine yaz. Bir uygulamanın simgesi değişince yeni 192 dosyası bu klasöre konur.

---

### Sunucu ve panel dosyaları (bkz. 1b): worker.js (17524 bayt / 303 satır) · panel/panel.js (23036 bayt / 413 satır; `wk*` = Uygulamalar ekranı) · apps.js (boş, yalnız eski referanslar için) · panel/index.html · panel/login.html · panel/login.js · panel/panel.js · panel/private.js · switcher.js · worker.js · wrangler.jsonc · .assetsignore

## 5. Bilinen durum ve tuzaklar
- Cloudflare API kapalı/yetkisiz olursa Uygulamalar ekranında uyarı kutusu çıkar ve KV `cfl`'deki son liste kullanılır; ana sayfa etkilenmez (yalnız KV `apps`'e bakar; alt alan adı `cfl`'de kayıtlıdır). Token Secret olarak Worker'a eklenir; Secret'lar deploy'da silinmez, düz "değişken" ise `wrangler.jsonc`'ta yoksa silinebilir, bu yüzden hepsi Secret.
- `worker.js` `SEED` Worker adlarını içerir (alt alan adını değil). Adres için alt alan adı da gerekir, o repoda yok. Yeni uygulama için kod değişmez.
- KV yazma (ücretsiz sınır günde 1000): `apps` yalnız ilk açılış, ilk liste tabanı ve Kaydet'te; `cfl` yalnız liste/alt alan adı değişince. Okuma Cloudflare API'ye yalnız Uygulamalar ekranı açılınca/yenilenince gider.
- Bir Worker panelde işaretlenip sonra Cloudflare'de silinirse "Cloudflare'de yok" etiketi çıkar; ana sayfada kalır (kartı açılmaz), işareti kaldırınca kalkar.
- Test (başsız tarayıcı, 390 px): 3 bölüm (2+2+1 kart), canlı simge değişimi, 64 pikselden küçük simgenin reddi, "Yükle" sayfası ve sekmeleri, Escape, servis çalışanı, açık/koyu tema, konsol hatası yok. Ağ istekleri sahte yanıtla denendi.
- Jurnalist'in simge yolu `?v=2` ekli (kendi manifest'inde öyle); değişirse `APPS` güncellenir.
- Canlı simge çapraz-site `<img>` ile alınır; hedef sitelerde CORS gerekmez.
- Güncellemeden sonra uygulamayı kapatıp 2 kez aç (önbellek yenilenir). Boş ekran olursa dosya yollarına, sonra `sw.js` `VER`'e bak.
- VitaFlow (birleşik) deposu arşivlendi; kartı Arşiv bölümünde "Arşiv" rozetiyle durur. Kaldırmak için `APPS`'tan satırı + `icons/apps/vitaflow.png` + `sw.js` `CORE` satırını sil (bölüm boşalınca ekrandan kendiliğinden kalkar).
- Kullanıcı Nexus'u daha önce yüklediyse yeni görünüm için uygulamayı kapatıp 2 kez açması gerekir.
- Telefonun gerçek davranışı (yükleme penceresi, titreşim, ana ekrana ekleme) görülmedi; telefonda denenmeli.

---

## 6. Bu dosyanın güncellenmesi
Yeni dosya/sayfa → bölüm 2, 3, 4 · yeni fonksiyon → ilgili dosya satırı · fonksiyon taşındı → eski/yeni dosya satırı + bölüm 3 · yeni tuzak → bölüm 5. Her güncellemede bölüm 7'ye tek satır. Değişen dosyaların boyutunu yeniden ölç, bölüm 4 başlıklarını güncelle. Bölüm 0'da biten maddeyi sil, yenisini ekle.

## 7. Değişiklik günlüğü (en yeni üstte)
- 2026-11-22 · yeni repo: depo geçmişsiz yeni repoya taşındı (`panel/private.*` yok, herkese açık yapılabilir); sürüm numarası bilerek v1.0.0'dan başlar (`sw.js` `VER` değişmedi, bu yüzden önbellek adı `nexus-v1.0.0`). Önceki repodaki v1.8.0 kodu aynen taşındı. README'deki uygulama ekleme ve sunucu kurulumu adımları Cloudflare API/Secret düzenine göre güncellendi. Cloudflare'in yeni repoya bağlanması ve ilk dağıtım henüz doğrulanmadı.
- 2026-11-22 · v1.8.0: depo herkese açık olabilsin diye uygulama listesi repodan çıktı: Worker Cloudflare API'den Worker listesini çeker (Secret `CF_ACCOUNT_ID`, `CF_API_TOKEN`), ayarlar KV `apps`'te; panelde Uygulamalar ekranı (göster anahtarı, ad/açıklama/bölüm/rozet düzenleme, "Yeni" etiketi, Cloudflare hatasında son bilinen liste); `panel/private.json` + `panel/private.js` kaldırıldı (eski 5 uygulama `SEED` ile ilk açılışta gelir); `/api/apps`, `/api/workers`, `POST /api/apps` eklendi; `/api/public` ve davet uçları KV'deki listeden besleniyor. Başsız tarayıcıda (390 px) ve sahte KV/Cloudflare ile Worker + panel denendi (liste, yeni etiketi, düzenleme, Kaydet/Geri al, hata durumu); gerçek Cloudflare'de ve telefonda denenmedi.
- 2026-11-22 · v1.7.0: gizli giriş logoya 3 dokunuş (alt yazı dokunuşu kaldırıldı); renkli sürüm etiketi + son push (`fx.js`, `GH_REPO`); 5 tema (yeni: Gece, Siyah) + "Görünüm ve ses" sayfası (ana sayfa, panel, davet); Web Audio tıklama sesi (ayardan kapanır); animasyonlar (giriş, basma, sayfa, bildirim); yeni bildirim (tik, alt satır, süre çizgisi); Herkese açık anahtarlarına Kaydet/Geri al çubuğu; davet sayfası (hero, mesaj kartı, süre/tek kullanımlık çipleri, "Aç" düğmeli kartlar), geçersiz link ve panel girişi sayfaları, panel Uygulama durumu ve Bilgi yeniden tasarlandı; `guestApi` `exp`/`once` döner. Başsız tarayıcıda (390 px) ana sayfa, temalar, ayarlar, 3 dokunuş, davet, geçersiz link, giriş, Kaydet/Geri al, durum, bilgi denendi; telefonda ve gerçek Cloudflare'de denenmedi.
- 2026-11-21 · v1.4.0: `worker.js` (panel girişi, davet linkleri, durum), `panel/` arayüzü, `wrangler.jsonc`, "Bu sayfayı yükle" düğmesi kaldırıldı. Worker mantığı sahte KV ile node'da denendi; gerçek Cloudflare'de denenmedi
- 2026-11-21 · v1.3.0: liste `apps.js`'e taşındı, gizli liste + `panel/` eklendi, `switcher.js` eklendi, VitaFlow (arşiv) panele alındı, `sw.js` paneli önbelleğe almaz. Yalnızca sözdizimi kontrolü yapıldı
- 2026-11-21 · Ad Nexus oldu (Türkçe olmayan ad istendi); `sw.js` önbellek öneki `nexus-`, `localStorage` anahtarı `nexus.v1`, harita `nexus-harita.md`
- 2026-11-21 · Yeniden adlandırma (Basir Hub → Merkez → Nexus), uygulamalar 3 bölüme ayrıldı, modern görünüm (hero, bölüm renkleri, parıltı), yeni Nexus simgesi, harita `merkez-harita.md` oldu
- 2026-11-21 · Uygulama oluşturuldu (index.html, style.css, sw.js, manifest.json, 01–04 js, simgeler) · Harita oluşturuldu

- 2026-11-22 · Faz 1: sessiz başlatıcı görünümü (üst çubuk, satır kart, tek teal vurgu, katlanır Arşiv), Yönet ayrı görünüm (`#yonet`, tembel yükleme), `sw.js` v1.5.0.
- 2026-11-22 · Faz 2: kurulum sayfası cilası (SVG adım simgeleri, inert + kaydırma kilidi, tek birincil düğme, ortalı kutu), `sw.js` v1.5.1.
- 2026-11-22 · `worker.js` `page()` (geçersiz link sayfası) renkleri yeni palete hizalandı; yalnızca CSS metni, mantık aynı. Worker'ı yeniden dağıtmak gerekir.
- 2026-11-22 · v1.6.0: ana sayfa herkese açık (`/api/public`, KV `pub`), panelde Yönet > "Herkese açık" işaretleri (anında kayıt), gizli yönetici girişi (alt yazıya 5 dokunuş), `/panel/login` çerezliyken panele yönlenir, Çıkış `/`'e döner, boş liste mesajı ayrıldı. Başsız tarayıcıda (390 px) ve sahte KV/ASSETS ile Worker rotaları denendi; gerçek Cloudflare'de denenmedi.
- 2026-11-22 · v1.6.1: panelde hamburger yan menü (kategoriler, sayaçlar, özet kutusu), Yönet tek uzun sayfa yerine 4 ayrı görünüm (`#acik #davet #durum #bilgi`), sağ üst düğme ve Geri kaldırıldı, Çıkış menüye taşındı. Başsız tarayıcıda (390 px, koyu tema) menü açma/kapama, görünümler, doğrudan hash, sayaçlar, Escape ve çıkış denendi; telefonda denenmedi.
