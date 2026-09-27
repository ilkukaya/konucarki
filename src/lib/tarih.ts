// Yerel takvim günü yardımcıları. Günler "YYYY-MM-DD" biçimli yerel tarih dizgisidir.

export function yerelGun(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

/** İki yerel gün arasındaki takvim günü farkı (b - a). Yaz saati değişimlerinden etkilenmez. */
export function gunFarki(a: string, b: string): number {
  const [ay, am, ag] = a.split('-').map(Number);
  const [by, bm, bg] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bg) - Date.UTC(ay, am - 1, ag)) / 86_400_000);
}

/** FNV-1a 32 bit; deterministik ve platformdan bağımsız. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tarihe dayalı deterministik indeks: herkes aynı gün aynı konuyu görür. */
export function gununIndeksi(gun: string, uzunluk: number): number {
  if (uzunluk <= 0) throw new RangeError('uzunluk pozitif olmalı');
  return fnv1a(`konucarki:${gun}`) % uzunluk;
}

export function tarihOkunur(gun: string): string {
  const [y, m, g] = gun.split('-').map(Number);
  return new Date(y, m - 1, g).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
