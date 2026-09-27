// İzinli ilerleme: seri, rozetler, geçmiş. Saf fonksiyonlar; depolama `depo.ts` içinde.
import { gunFarki } from './tarih.ts';

export type Mod = 'arastirma' | 'dogaclama' | 'atasozu';

export type Tur = {
  gun: string; // yerel "YYYY-MM-DD"
  zaman: number; // Date.now()
  mod: Mod;
  konuId: string;
  baslik: string;
  alan?: string; // araştırma alanı veya doğaçlama kategorisi
  zorluk?: 1 | 2 | 3;
  pasKullanildi: boolean;
  konusmaMs: number;
  meydan?: boolean; // meydan okuma kartıyla oynandı
  gorev?: boolean; // günün görevini tamamladı
  puan?: number;
};

export type Seri = { guncel: number; enUzun: number };

/**
 * Günlük seri: bugün (ya da dün) biten ardışık günlerin sayısı.
 * Bugün henüz tur yoksa dünkü seri hâlâ "canlı" sayılır.
 */
export function seriHesapla(gunler: string[], bugun: string): Seri {
  const tekil = [...new Set(gunler)].sort();
  if (!tekil.length) return { guncel: 0, enUzun: 0 };

  let enUzun = 1;
  let kosu = 1;
  for (let i = 1; i < tekil.length; i++) {
    kosu = gunFarki(tekil[i - 1], tekil[i]) === 1 ? kosu + 1 : 1;
    enUzun = Math.max(enUzun, kosu);
  }

  const son = tekil[tekil.length - 1];
  const fark = gunFarki(son, bugun);
  let guncel = 0;
  if (fark === 0 || fark === 1) {
    guncel = 1;
    for (let i = tekil.length - 1; i > 0; i--) {
      if (gunFarki(tekil[i - 1], tekil[i]) === 1) guncel++;
      else break;
    }
  }
  return { guncel, enUzun };
}

export type RozetId =
  | 'ilk-tur'
  | 'bes-alan'
  | 'on-alan'
  | 'seri-3'
  | 'seri-7'
  | 'passiz-5'
  | 'ilk-zor'
  | 'atasozu-10'
  | 'dogaclama-10'
  | 'meydan-5'
  | 'gorev-3';

export const ROZETLER: { id: RozetId; ad: string; aciklama: string }[] = [
  { id: 'ilk-tur', ad: 'İlk tur', aciklama: 'İlk turunu tamamladın.' },
  { id: 'bes-alan', ad: 'Beş alan', aciklama: '5 farklı araştırma alanından konu anlattın.' },
  { id: 'on-alan', ad: 'Kâşif', aciklama: '10 araştırma alanının hepsinden konu anlattın.' },
  { id: 'seri-3', ad: 'Üç gün', aciklama: '3 gün üst üste en az bir tur.' },
  { id: 'seri-7', ad: 'Bir hafta', aciklama: '7 gün üst üste en az bir tur.' },
  { id: 'passiz-5', ad: 'Pas yok', aciklama: 'Pas kullanmadan 5 tur tamamladın.' },
  { id: 'ilk-zor', ad: 'Zoru seçtin', aciklama: 'İlk "Zor" konunu anlattın.' },
  { id: 'atasozu-10', ad: 'Söz ustası', aciklama: '10 atasözü ya da deyim anlattın.' },
  { id: 'dogaclama-10', ad: 'Hazırcevap', aciklama: '10 doğaçlama turu tamamladın.' },
  { id: 'meydan-5', ad: 'Cesur', aciklama: '5 turu meydan okuma kartıyla bitirdin.' },
  { id: 'gorev-3', ad: 'Sözünün eri', aciklama: '3 farklı günde günün görevini tamamladın.' },
];

/** Sayaçlar kalıcı tutulur (geçmiş listesi 30 turla sınırlı olsa da rozetler doğru kalsın diye). */
export type Ozet = {
  toplamTur: number;
  passizTur: number;
  atasozuTur: number;
  dogaclamaTur: number;
  zorTur: number;
  meydanTur: number;
  xp: number;
  alanlar: string[];
  gunler: string[]; // seri için; en fazla son 60 gün tutulur
  gorevGunleri: string[]; // günün görevinin tamamlandığı günler; son 60
};

export const BOS_OZET: Ozet = {
  toplamTur: 0,
  passizTur: 0,
  atasozuTur: 0,
  dogaclamaTur: 0,
  zorTur: 0,
  meydanTur: 0,
  xp: 0,
  alanlar: [],
  gunler: [],
  gorevGunleri: [],
};

export function ozeteEkle(o: Ozet, t: Tur): Ozet {
  const alanlar = t.mod === 'arastirma' && t.alan && !o.alanlar.includes(t.alan) ? [...o.alanlar, t.alan] : o.alanlar;
  const gunler = o.gunler.includes(t.gun) ? o.gunler : [...o.gunler, t.gun].sort().slice(-60);
  const gorevGunleri = t.gorev && !o.gorevGunleri.includes(t.gun) ? [...o.gorevGunleri, t.gun].sort().slice(-60) : o.gorevGunleri;
  return {
    toplamTur: o.toplamTur + 1,
    passizTur: o.passizTur + (t.pasKullanildi ? 0 : 1),
    atasozuTur: o.atasozuTur + (t.mod === 'atasozu' ? 1 : 0),
    dogaclamaTur: o.dogaclamaTur + (t.mod === 'dogaclama' ? 1 : 0),
    zorTur: o.zorTur + (t.mod === 'arastirma' && t.zorluk === 3 ? 1 : 0),
    meydanTur: o.meydanTur + (t.meydan ? 1 : 0),
    xp: o.xp + (t.puan ?? 0),
    alanlar,
    gunler,
    gorevGunleri,
  };
}

export function ozettenRozetler(o: Ozet, bugun: string): Set<RozetId> {
  const { enUzun } = seriHesapla(o.gunler, bugun);
  const r = new Set<RozetId>();
  if (o.toplamTur >= 1) r.add('ilk-tur');
  if (o.alanlar.length >= 5) r.add('bes-alan');
  if (o.alanlar.length >= 10) r.add('on-alan');
  if (enUzun >= 3) r.add('seri-3');
  if (enUzun >= 7) r.add('seri-7');
  if (o.passizTur >= 5) r.add('passiz-5');
  if (o.zorTur >= 1) r.add('ilk-zor');
  if (o.atasozuTur >= 10) r.add('atasozu-10');
  if (o.dogaclamaTur >= 10) r.add('dogaclama-10');
  if (o.meydanTur >= 5) r.add('meydan-5');
  if (o.gorevGunleri.length >= 3) r.add('gorev-3');
  return r;
}
