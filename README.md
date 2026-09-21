# Özdil & Hüseyin — Dijital Düğün Davetiyesi

24 Ekim 2026 tarihinde Barida Hotel, Isparta'da gerçekleşecek düğün için hazırlanmış mobil öncelikli dijital davetiye.

## Özellikler

- düğün tarihine canlı geri sayım
- aileler, mekân, harita ve kaydırmalı etkinlik programı
- Open-Meteo üzerinden Isparta hava durumu
- `.ics` ve Google Takvim bağlantıları
- D1 veritabanına kaydedilen LCV yanıtları
- Google Fotoğraflar / Drive bağlantısı gönderme ve QR kod
- kullanıcı adı ve parola korumalı yönetim paneli
- katılım özeti ve CSV dışa aktarma

## Yerel geliştirme

Node.js `22.13` veya daha yeni bir sürüm gerekir.

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` içinde yönetici bilgilerini ve uzun, rastgele bir oturum anahtarını belirleyin:

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=guclu-bir-parola
ADMIN_AUTH_SECRET=uzun-rastgele-bir-deger
```

Davetiye `http://localhost:3000`, yönetim paneli ise `http://localhost:3000/yonetim` adresinde açılır.

## Doğrulama

```bash
npm run build
npm test
```

Canlı veriye dokunmadan şifreli yedek ve geri yükleme tatbikatı:

```bash
npm run test:recovery
```

Acil durum adımları ve yedek saklama sıklığı için [felaket kurtarma prosedürüne](docs/FELAKET-KURTARMA.md) bakın.

Veritabanı şeması değiştiğinde:

```bash
npm run db:generate
```

## Güvenlik

`.env` dosyası sürüm kontrolüne alınmaz. Örnek yönetici parolası yalnızca yerel geliştirme içindir; internet yayını öncesinde güçlü bir parola ve yeni bir `ADMIN_AUTH_SECRET` kullanılmalıdır.
