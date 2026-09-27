// Sitenin sabit kimlik bilgileri. Alan adı burada DEĞİL; SITE_URL ortam değişkeninden gelir.
export const SITE = {
  ad: 'Konu Çarkı',
  // [ILETISIM_EPOSTA] — yayından önce gerçek adresle değiştir.
  eposta: 'iletisim@konucarki.invalid',
  // [VERI_SORUMLUSU_AD_SOYAD] — yayından önce gerçek adla değiştir.
  veriSorumlusu: '[VERİ SORUMLUSU AD SOYAD]',
  yerSaglayici: 'Netlify, Inc.',
  sonGuncelleme: '27 Eylül 2026',
  aciklama:
    'Çarkı çevir, bilmediğin bir konu gelsin. Araştır, notlarını kapat, kendi sözlerinle anlat. Türkçe konuşma ve öğrenme pratiği; üyelik yok, veri toplama yok.',
} as const;
