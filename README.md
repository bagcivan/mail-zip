# Mail → ZIP (tarayıcı sürümü)

Python sunucusu gerektirmez; .msg dosyası tarayıcıda okunur ve ZIP tarayıcıda oluşturulur.
Dosyalar hiçbir sunucuya gönderilmez.

## Dosyalar

- `index.html`: arayüz
- `converter.js`: MSG → ZIP mantığı (`app.py`'deki `_safe_name` / `_unique` / `msg_to_zip` karşılığı)
- `vendor.js`: hazır derlenmiş kütüphaneler (`@kenjiuno/msgreader` + `fflate`). Kaynağı `../vendor-src/`

## Yerelde deneme

ES module kullandığı için `file://` ile açılmaz, küçük bir sunucu gerekir:

```
python -m http.server 8000 --directory web
```

## Vercel'e yükleme

Sadece bu `web` klasörü yüklenmeli (proje kökünde `app.py` olduğu için Vercel kökü
Python/FastAPI projesi sanabilir):

- Vercel panelinde: **Root Directory = `web`**, Framework Preset = **Other**, build komutu boş.
- veya CLI ile: `cd web && npx vercel --prod`

## vendor.js'i güncellemek

```
cd vendor-src
npm install
npm run build
```
