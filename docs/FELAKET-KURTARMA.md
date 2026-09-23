# Yedekleme ve Felaket Kurtarma Prosedürü

Bu prosedür LCV kayıtlarını, galeri bağlantılarını, albüm ayarını, operasyon kontrol listesini ve çöp kutusundaki kayıtları korur. Yönetici parolası, oturum bilgileri ve güvenlik günlükleri yedeğe dâhil edilmez.

## Hedefler

- Düğüne yedi günden fazla varken en fazla 7 günlük veri kaybı riski
- Düğünden önceki son yedi gün içinde en fazla 1 günlük veri kaybı riski
- Bir sorun sonrasında 30 dakika içinde yönetim ekranını yeniden kullanılabilir hâle getirme hedefi

## Düzenli yedek alma

1. Yönetim panelindeki **Tam Yedek** bölümünü açın.
2. En az 12 karakterli, yalnızca yedek için kullanılan bir parola yazın.
3. **Şifreli Yedek Hazırla** düğmesine, ardından **Hazır Yedeği İndir** bağlantısına basın.
4. İndirilen `.davetiye-backup` dosyasını iki ayrı yerde saklayın: biri kişisel bulut depolama alanı, diğeri yerel bilgisayar veya USB bellek olabilir.
5. Yedek parolasını dosyayla aynı klasörde tutmayın; bir parola yöneticisinde saklayın.
6. Yönetim panelinde “Yedek güncel” durumunun göründüğünü kontrol edin.

Normal dönemde haftalık, düğünden önceki son yedi gün içinde günlük ve önemli toplu değişikliklerden hemen sonra yeni yedek alın.

## Geri yükleme

1. Sorunlu sitede işlem yapmadan önce mümkünse mevcut durumun yeni bir yedeğini alın.
2. Doğru siteyi ve doğru tarihli yedek dosyasını kullandığınızı doğrulayın.
3. Yönetim panelinde yedek parolasını yazın, **Yedek Dosyasını Seç** seçeneğinden dosyayı seçin ve **Seçilen Yedeği Geri Yükle** düğmesine basın.
4. Ekrandaki LCV, galeri ve çöp kutusu sayılarını kontrol edip işlemi onaylayın.
5. Geri yükleme tamamlandıktan sonra sistem durumunu yenileyin; toplam LCV, katılımcı, galeri ve çöp kutusu sayılarını yedek özetiyle karşılaştırın.
6. En az bir LCV kaydını, albüm bağlantısını ve çöp kutusundan geri alma işlemini kontrol edin.

Geri yükleme birleştirmeli ve tekrar çalıştırılabilir yapıdadır: yedekte bulunan kayıtlar yedeğin alındığı duruma döner, yedekten sonra oluşturulmuş kayıtlar korunur. Bu nedenle yedek alındıktan sonra çöp kutusuna taşınmış bir kayıt geri yüklemeyle yeniden etkinleşir. Yanlış parola, değiştirilmiş dosya veya başka siteye ait yedek kabul edilmez.

Çöp kutusundaki **Kalıcı sil** işlemi canlı veritabanındaki kaydı geri alınamaz biçimde kaldırır. Daha önce indirilmiş bir yedek bu kaydı hâlâ içeriyorsa o yedek geri yüklendiğinde kayıt yeniden oluşabilir; kişisel verinin tüm kopyalardan kaldırılması gerekiyorsa eski yedek dosyalarını da saklandıkları yerlerden silin.

## Sorun durumunda

- Dosya açılamıyorsa farklı parola denemeleriyle dosyayı değiştirmeyin; parola yöneticisindeki kaydı doğrulayın.
- Dosya bozuk uyarısı veriyorsa ikinci yedek kopyasını kullanın.
- Geri yükleme başarısız olursa aynı dosyayla yeniden denenebilir; yarım kalan kayıtlar işlem bütünlüğü sayesinde yazılmaz.
- Yönetici erişimi kaybedildiyse önce barındırma ortamındaki yönetici parolasını yenileyin; yedek parolası yönetici parolasından bağımsızdır.

## Otomatik tatbikat

Canlı veriye dokunmadan üretim şemasında kurtarma tatbikatı çalıştırmak için:

```bash
npm run test:recovery
```

Başarılı sonuç `"result": "passed"` olarak raporlanır. Bu tatbikat şifreleme/açma, yanlış parola, bozuk dosya, izole geri yükleme, tekrarlı geri yükleme ve hassas oturum ayarlarının yedek dışında tutulmasını doğrular.
