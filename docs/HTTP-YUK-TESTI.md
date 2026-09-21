# HTTP Yük Testi

Bu test üretim Worker derlemesini ve gerçek HTTP rotalarını geçici, yerel bir D1 veritabanıyla çalıştırır. Canlı siteye istek göndermez ve gerçek davetli kayıtlarını değiştirmez.

Varsayılan senaryo 50 eş zamanlı istemciyle toplam 600 istektir:

- 240 LCV gönderimi
- 80 galeri bağlantısı gönderimi
- 70'er ana sayfa, ayar, takvim ve QR isteği

Test bütün yanıtların başarılı olmasını, 240 LCV ile 80 galeri kaydının eksiksiz yazılmasını ve çalışmanın iki dakika içinde bitmesini zorunlu tutar. Ayrıca medyan, yüzde 95 ve en yüksek yanıt sürelerini raporlar.

```bash
npm run test:http-load
```

Bu yerel kabul testi uygulama ve veritabanı davranışını doğrular. İnternet sağlayıcısı, kullanıcının bağlantısı veya barındırma hizmetindeki bölgesel bir kesinti için mutlak çalışma garantisi vermez.
