import { describe, expect, it } from 'vitest';
import { slugify } from '../src/lib/slugify.ts';
import { GeriSayim, sureBicimle } from '../src/lib/sayac.ts';
import { TekrarOnleyici, rastgeleTam } from '../src/lib/rastgele.ts';
import { gunFarki, gununIndeksi, yerelGun } from '../src/lib/tarih.ts';
import { BOS_OZET, ozeteEkle, ozettenRozetler, seriHesapla, type Tur } from '../src/lib/ilerleme.ts';
import { terimleriAyristir, yasakliBul } from '../src/lib/yasakli.ts';
import { aramaLinkleri } from '../src/lib/arama.ts';

describe('slugify', () => {
  it('Türkçe karakterleri doğru dönüştürür', () => {
    expect(slugify('İstanbul')).toBe('istanbul');
    expect(slugify('IĞDIR')).toBe('igdir');
    expect(slugify('Çağrı Işık')).toBe('cagri-isik');
    expect(slugify('Şüphe ve Ölçü')).toBe('suphe-ve-olcu');
  });
  it('noktalama ve boşlukları tireye indirger', () => {
    expect(slugify('  Mahkûm ikilemi: kısasa kısas!  ')).toBe('mahkum-ikilemi-kisasa-kisas');
    expect(slugify("Anadolu'nun derin geçmişi")).toBe('anadolu-nun-derin-gecmisi');
  });
  it('yalnızca a-z0-9- üretir', () => {
    expect(slugify('Âşık Ömer — 2. bölüm')).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('GeriSayim', () => {
  function sahteSaat() {
    let t = 1000;
    return { saat: () => t, ilerle: (ms: number) => (t += ms) };
  }

  it('zaman damgasıyla kalan süreyi hesaplar', () => {
    const s = sahteSaat();
    const g = new GeriSayim(60_000, s.saat);
    g.baslat();
    s.ilerle(15_000);
    expect(g.kalan()).toBe(45_000);
    expect(g.oran()).toBeCloseTo(0.25);
  });

  it('arka planda tik atmasa da doğru kalır (tek büyük sıçrama)', () => {
    const s = sahteSaat();
    const g = new GeriSayim(120_000, s.saat);
    g.baslat();
    // Sekme 2 dakika boyunca hiç rAF/tick almadı; dönünce tek okuma.
    s.ilerle(119_000);
    expect(g.kalan()).toBe(1_000);
    s.ilerle(5_000);
    expect(g.kalan()).toBe(0);
    expect(g.bitti()).toBe(true);
  });

  it('duraklatınca süre akmaz, devam edince kaldığı yerden sürer', () => {
    const s = sahteSaat();
    const g = new GeriSayim(10_000, s.saat);
    g.baslat();
    s.ilerle(3_000);
    g.duraklat();
    s.ilerle(60_000);
    expect(g.kalan()).toBe(7_000);
    g.baslat();
    s.ilerle(2_000);
    expect(g.kalan()).toBe(5_000);
    g.sifirla();
    expect(g.kalan()).toBe(10_000);
    expect(g.calisiyor).toBe(false);
  });

  it('süreyi yukarı yuvarlayarak biçimler', () => {
    expect(sureBicimle(0)).toBe('0:00');
    expect(sureBicimle(200)).toBe('0:01');
    expect(sureBicimle(59_001)).toBe('1:00');
    expect(sureBicimle(600_000)).toBe('10:00');
  });
});

describe('tekrar önleme', () => {
  const adaylar = Array.from({ length: 30 }, (_, i) => `k${i}`);

  it('son 20 konuyu tekrar vermez', () => {
    const t = new TekrarOnleyici(20);
    const secilen: string[] = [];
    for (let i = 0; i < 20; i++) secilen.push(t.sec(adaylar, (x) => x)!);
    expect(new Set(secilen).size).toBe(20);
    for (let i = 0; i < 200; i++) {
      const son20 = [...t.liste];
      const yeni = t.sec(adaylar, (x) => x)!;
      expect(son20).not.toContain(yeni);
    }
  });

  it('aday havuzu küçükse en eski görüleni verir, boş dönmez', () => {
    const t = new TekrarOnleyici(20);
    const kucuk = ['a', 'b', 'c'];
    const s = [t.sec(kucuk, (x) => x), t.sec(kucuk, (x) => x), t.sec(kucuk, (x) => x)];
    expect(new Set(s).size).toBe(3);
    expect(t.sec(kucuk, (x) => x)).toBe(s[0]);
  });

  it('rastgeleTam aralık dışına çıkmaz', () => {
    for (let i = 0; i < 1000; i++) {
      const x = rastgeleTam(7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
    }
  });
});

describe('günün konusu', () => {
  it('aynı gün için hep aynı indeksi verir', () => {
    expect(gununIndeksi('2026-09-27', 120)).toBe(gununIndeksi('2026-09-27', 120));
  });
  it('günler arasında değişir ve aralıkta kalır', () => {
    const idx = new Set<number>();
    for (let g = 1; g <= 30; g++) {
      const i = gununIndeksi(`2026-10-${String(g).padStart(2, '0')}`, 120);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(120);
      idx.add(i);
    }
    expect(idx.size).toBeGreaterThan(15);
  });
  it('yerel tarihi gece yarısına göre verir', () => {
    expect(yerelGun(new Date(2026, 0, 1, 23, 59, 59))).toBe('2026-01-01');
    expect(yerelGun(new Date(2026, 0, 2, 0, 0, 1))).toBe('2026-01-02');
  });
});

describe('seri', () => {
  it('ardışık günleri sayar', () => {
    expect(seriHesapla(['2026-09-25', '2026-09-26', '2026-09-27'], '2026-09-27')).toEqual({ guncel: 3, enUzun: 3 });
  });
  it('bugün henüz tur yoksa dünkü seri canlı kalır', () => {
    expect(seriHesapla(['2026-09-25', '2026-09-26'], '2026-09-27').guncel).toBe(2);
  });
  it('bir gün atlanırsa seri sıfırlanır ama en uzun seri kalır', () => {
    expect(seriHesapla(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-25'], '2026-09-27')).toEqual({ guncel: 0, enUzun: 3 });
  });
  it('gece yarısı sınırı: 23:59 ve 00:01 iki ayrı gündür', () => {
    const a = yerelGun(new Date(2026, 8, 26, 23, 59));
    const b = yerelGun(new Date(2026, 8, 27, 0, 1));
    expect(gunFarki(a, b)).toBe(1);
    expect(seriHesapla([a, b], b).guncel).toBe(2);
  });
  it('aynı gün birden çok tur seriyi artırmaz', () => {
    expect(seriHesapla(['2026-09-27', '2026-09-27'], '2026-09-27').guncel).toBe(1);
  });
  it('ay ve yıl sınırını geçer', () => {
    expect(seriHesapla(['2026-12-31', '2027-01-01'], '2027-01-01').guncel).toBe(2);
    expect(gunFarki('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('rozetler', () => {
  const tur = (p: Partial<Tur>): Tur => ({
    gun: '2026-09-27', zaman: 0, mod: 'arastirma', konuId: 'ar-001', baslik: 'x', pasKullanildi: false, konusmaMs: 60_000, ...p,
  });
  it('ilk tur, zor konu ve pas kurallarını uygular', () => {
    let o = BOS_OZET;
    o = ozeteEkle(o, tur({ zorluk: 3, alan: 'zihin' }));
    let r = ozettenRozetler(o, '2026-09-27');
    expect(r.has('ilk-tur')).toBe(true);
    expect(r.has('ilk-zor')).toBe(true);
    for (let i = 0; i < 3; i++) o = ozeteEkle(o, tur({ alan: 'zihin' }));
    o = ozeteEkle(o, tur({ alan: 'zihin', pasKullanildi: true }));
    r = ozettenRozetler(o, '2026-09-27');
    expect(r.has('passiz-5')).toBe(false);
    o = ozeteEkle(o, tur({ alan: 'dil' }));
    expect(ozettenRozetler(o, '2026-09-27').has('passiz-5')).toBe(true);
  });
  it('beş farklı alan ve 10 atasözü', () => {
    let o = BOS_OZET;
    for (const a of ['zihin', 'dil', 'fizik', 'iklim']) o = ozeteEkle(o, tur({ alan: a }));
    expect(ozettenRozetler(o, '2026-09-27').has('bes-alan')).toBe(false);
    o = ozeteEkle(o, tur({ alan: 'anadolu' }));
    expect(ozettenRozetler(o, '2026-09-27').has('bes-alan')).toBe(true);
    for (let i = 0; i < 10; i++) o = ozeteEkle(o, tur({ mod: 'atasozu' }));
    expect(ozettenRozetler(o, '2026-09-27').has('atasozu-10')).toBe(true);
  });
});

describe('yasaklı terimler', () => {
  const t = terimleriAyristir('parti\npartiler*\n=kürt*\nseks\nsavaş\n# yorum\nkendine zarar');
  it('tam kelime ve önek eşleşir, Türkçe karakter duyarsız', () => {
    expect(yasakliBul('Bu bir PARTİ meselesi', t)).toContain('parti');
    expect(yasakliBul('Partilerin tarihi', t)).toContain('partiler*');
    expect(yasakliBul('SAVAS', t)).toContain('savaş');
    expect(yasakliBul('Kendine zarar vermek', t)).toContain('kendine zarar');
  });
  it('yanlış pozitif vermez', () => {
    expect(yasakliBul('Partikül fiziği', t)).toEqual([]);
    expect(yasakliBul('Bozkurt ve kurt', t)).toEqual([]);
    expect(yasakliBul('Seksen yıl', t)).toEqual([]);
  });
});

describe('arama bağlantıları', () => {
  it('terimi kodlar', () => {
    const l = aramaLinkleri('çapa etkisi & karar');
    expect(l.find((x) => x.ad === 'DergiPark')!.url).toBe('https://dergipark.org.tr/tr/search?q=%C3%A7apa%20etkisi%20%26%20karar');
    expect(l).toHaveLength(4);
  });
});

import { aciDilimi, hedefAci } from '../src/lib/cark.ts';

describe('çark', () => {
  it('hedef açı istenen dilimde durur ve en az 4 tur döner', () => {
    for (const n of [8, 10]) {
      let aci = 0;
      for (let i = 0; i < n; i++) {
        for (const sapma of [-0.5, 0, 0.49]) {
          const yeni = hedefAci(aci, i, n, 4, sapma);
          expect(yeni - aci).toBeGreaterThanOrEqual(4 * 360);
          expect(aciDilimi(yeni, n)).toBe(i);
          aci = yeni;
        }
      }
    }
  });
});
