// Türkçe kaynaklara dış arama bağlantıları. Terimler encodeURIComponent ile kodlanır.

export type AramaLinki = { ad: string; aciklama: string; url: string };

export function aramaLinkleri(terim: string): AramaLinki[] {
  const q = encodeURIComponent(terim.trim());
  return [
    { ad: 'TDK Güncel Türkçe Sözlük', aciklama: 'Kavramların sözlük anlamı', url: `https://sozluk.gov.tr/?kelime=${q}` },
    { ad: 'DergiPark', aciklama: 'Türkçe akademik makaleler', url: `https://dergipark.org.tr/tr/search?q=${q}` },
    { ad: 'Vikipedi', aciklama: 'Genel bakış ve kaynakça', url: `https://tr.wikipedia.org/w/index.php?search=${q}` },
    { ad: 'Google Akademik', aciklama: 'Bilimsel yayınlar', url: `https://scholar.google.com/scholar?hl=tr&q=${q}` },
  ];
}
