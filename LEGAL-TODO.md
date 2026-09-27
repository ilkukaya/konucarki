# Yayından önce netleştirilecekler

Bu liste sitede görünmez. Köşeli parantezli yer tutucular ve avukat onayı gereken noktalar:

## Doldurulacak yer tutucular (`src/config.ts`)
- [ ] `[ILETISIM_EPOSTA]` → `SITE.eposta` (şu an `iletisim@konucarki.invalid`)
- [ ] `[VERI_SORUMLUSU_AD_SOYAD]` → `SITE.veriSorumlusu`
- [ ] `SITE.sonGuncelleme` — metinler değiştiğinde güncelle

## KVKK Aydınlatma Metni (`src/pages/kvkk-aydinlatma-metni.astro`)
- [ ] **Yurt dışına aktarım dayanağı** (md. 9): Netlify, Inc. (ABD) sunucu kayıtları. Standart sözleşme mi, başka bir dayanak mı? `[AVUKATLA NETLEŞTİRİLECEK]` metinde yer tutucu olarak duruyor.
- [ ] **E-posta saklama süresi**: `[X ay]` yer tutucusu.
- [ ] Sunucu kayıtları için Netlify'ın saklama süresini ve veri işleme sözleşmesini (DPA) kontrol et.
- [ ] Hukuki sebeplerin (md. 5/2-f meşru menfaat) yeterliliği.
- [ ] Başvuru usulü: Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e atıf ve 30 günlük süre.
- [ ] VERBİS kayıt yükümlülüğü muafiyeti değerlendirmesi.

## Kullanım Koşulları
- [ ] Fikrî mülkiyet maddesi (konu kütüphanesinin korunması) ifadesi.
- [ ] Sorumluluk reddi maddelerinin kapsamı.

## Künye (5651)
- [ ] İçerik sağlayıcı tanıtıcı bilgilerinin yeterliliği (ad, e-posta; adres gerekip gerekmediği).

## Çerez Politikası
- [ ] localStorage kullanımının "zorunlu işlevsel" ve "isteğe bağlı" ayrımının doğru ifade edildiğini teyit et.

## Teknik
- [ ] Netlify'da Analytics, Forms, Identity kapalı olduğunu kontrol et.
