# Nexus

Tüm uygulamalarımın merkezi: uygulamaları alanlara ayırıp tek sayfada toplayan, telefona yüklenebilen küçük bir PWA. Her uygulama için **Yükle** (ana ekrana ekleme adımları + siteyi açma) ve **Aç** düğmesi var. Uygulama simgeleri kendi sitelerinden canlı çekilir; çekilemezse paketle gelen kayıtlı simgeler gösterilir. Nexus yalnızca bir kapıdır: uygulamalar çevrimiçi sitelerdir, bu yüzden çevrimdışıyken uygulama açılmaz.

Hesap yok, sunucu yok, framework yok. Nexus kullanıcı verisi tutmaz (yalnızca son simge güncelleme saatini cihazda saklar).

## Yayınlama

Statik dosyalardır; Cloudflare Workers/Pages ya da GitHub Pages'e olduğu gibi yüklenir. Yollar göreli olduğu için alt yolda da çalışır.

## Kullanıcı türleri

- **Normal kullanıcı:** ana adres (`/`); panelde "Herkese açık" işaretlenen uygulamaları görür.
- **Davetli:** yönetici linki (`/g/<kod>`); yalnız linkteki uygulamaları görür.
- **Yönetici:** ana sayfada sol üstteki logoya 3 kez dokunur (ya da doğrudan `/panel/`), anahtarı girer.

## Görünüm ve ses

Sağ üstteki simgeden tema (Otomatik, Açık, Koyu, Gece, Siyah) ve tıklama sesi seçilir; seçim cihazda saklanır. "Son push" göstermek için `fx.js` başındaki `GH_REPO` değerine `kullanici/depo` yaz.

## Uygulama eklemek

1. `apps.js` listesine satır ekle (gizliyse `panel/private.js`) (`sec` = bölüm id'si: `life`, `trade`, `arch`).
2. Uygulamanın `icon-192.png` dosyasını `icons/apps/<id>.png` olarak koy.
3. `sw.js` içindeki `CORE` listesine yeni simgeyi ekle ve `VER` değerini artır.

Yeni bir bölüm için `SECS` listesine satır ekle (id, title, ic).

## Sunucu kurulumu (davet linkleri + panel)
1. Cloudflare > Workers & Pages > KV > **Create namespace** (ad: `nexus-links`), id'yi kopyala.
2. `wrangler.jsonc` içinde `KV-ID-BURAYA` yerine id'yi yaz; `name` değerini Nexus'un mevcut Worker adıyla aynı yap.
3. Worker > Settings > Variables and Secrets > **Secret**: ad `ADMIN_KEY`, değer uzun bir parola.
4. Deploy komutu `npx wrangler deploy` olmalı. Sonra `/panel/` adresine gir.
5. Her uygulamaya `<script src="https://NEXUS-ADRESİ/switcher.js" defer></script>` ekle.
