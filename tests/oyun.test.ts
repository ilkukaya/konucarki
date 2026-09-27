import { describe, expect, it } from 'vitest';
import { gorevTamamMi, gununGorevi, seviye, tamSureMi, toplamPuan, turPuani, SEVIYELER, type TurSonucu } from '../src/lib/oyun.ts';
import { BOS_OZET, ozeteEkle, ozettenRozetler, type Tur } from '../src/lib/ilerleme.ts';

const temel: TurSonucu = { mod: 'arastirma', zorluk: 1, pasKullanildi: true, konusmaMs: 30_000, hedefMs: 120_000, meydan: false, gorevTamam: false };

describe('tur puanı', () => {
  it('yalnızca tamamlamak 10 puan', () => {
    expect(toplamPuan(turPuani(temel))).toBe(10);
  });
  it('bonusları toplar', () => {
    const k = turPuani({ ...temel, zorluk: 3, pasKullanildi: false, konusmaMs: 120_000, meydan: true, gorevTamam: true });
    expect(toplamPuan(k)).toBe(10 + 10 + 5 + 5 + 10 + 20);
    expect(k.map((x) => x.ad)).toContain('Zor konu');
  });
  it('zorluk bonusu yalnızca araştırma modunda', () => {
    expect(toplamPuan(turPuani({ ...temel, mod: 'dogaclama', zorluk: 3 }))).toBe(10);
  });
  it('alkış grup puanı ekler', () => {
    expect(toplamPuan(turPuani({ ...temel, alkis: 3 }))).toBe(25);
    expect(toplamPuan(turPuani({ ...temel, alkis: 0 }))).toBe(10);
  });
  it('sonuna kadar konuşma eşiği', () => {
    expect(tamSureMi({ konusmaMs: 114_000, hedefMs: 120_000 })).toBe(true);
    expect(tamSureMi({ konusmaMs: 100_000, hedefMs: 120_000 })).toBe(false);
    expect(tamSureMi({ konusmaMs: 0, hedefMs: 0 })).toBe(false);
  });
});

describe('seviye', () => {
  it('eşiklerde doğru seviyeyi verir', () => {
    expect(seviye(0)).toMatchObject({ sira: 1, ad: 'Çırak', oran: 0, sonraki: 'Meraklı' });
    expect(seviye(59).ad).toBe('Çırak');
    expect(seviye(60).ad).toBe('Meraklı');
    expect(seviye(110).oran).toBeCloseTo(0.5);
  });
  it('son seviyeden sonra sonsuz ilerler', () => {
    const son = SEVIYELER[SEVIYELER.length - 1];
    expect(seviye(son.xp)).toMatchObject({ ad: 'Bilge', sira: SEVIYELER.length });
    expect(seviye(son.xp + 500)).toMatchObject({ ad: 'Bilge II', sira: SEVIYELER.length + 1 });
    expect(seviye(son.xp + 750).oran).toBeCloseTo(0.5);
  });
  it('negatif xp güvenli', () => {
    expect(seviye(-10).ad).toBe('Çırak');
  });
});

describe('günün görevi', () => {
  const alanlar = [{ id: 'zihin', ad: 'Zihin' }, { id: 'dil', ad: 'Dil' }];
  it('aynı gün aynı görev', () => {
    expect(gununGorevi('2026-09-27', alanlar)).toEqual(gununGorevi('2026-09-27', alanlar));
  });
  it('bir ayda birden çok görev tipi döner', () => {
    const tipler = new Set(Array.from({ length: 30 }, (_, i) => gununGorevi(`2026-10-${String(i + 1).padStart(2, '0')}`, alanlar).tip));
    expect(tipler.size).toBeGreaterThan(3);
  });
  it('görev koşullarını denetler', () => {
    expect(gorevTamamMi({ tip: 'zor', metin: '' }, { ...temel, zorluk: 3 })).toBe(true);
    expect(gorevTamamMi({ tip: 'zor', metin: '' }, temel)).toBe(false);
    expect(gorevTamamMi({ tip: 'alan', metin: '', alan: 'dil' }, { ...temel, alan: 'dil' })).toBe(true);
    expect(gorevTamamMi({ tip: 'alan', metin: '', alan: 'dil' }, { ...temel, alan: 'zihin' })).toBe(false);
    expect(gorevTamamMi({ tip: 'meydan', metin: '' }, { ...temel, meydan: true })).toBe(true);
    expect(gorevTamamMi({ tip: 'dogaclama', metin: '' }, { ...temel, mod: 'dogaclama' })).toBe(true);
  });
});

describe('yeni rozetler ve xp', () => {
  const tur = (p: Partial<Tur>): Tur => ({ gun: '2026-09-27', zaman: 0, mod: 'arastirma', konuId: 'x', baslik: 'x', pasKullanildi: true, konusmaMs: 0, ...p });
  it('xp birikir, meydan ve görev rozetleri', () => {
    let o = BOS_OZET;
    for (let i = 0; i < 5; i++) o = ozeteEkle(o, tur({ meydan: true, puan: 20 }));
    expect(o.xp).toBe(100);
    expect(ozettenRozetler(o, '2026-09-27').has('meydan-5')).toBe(true);
    o = ozeteEkle(o, tur({ gun: '2026-09-25', gorev: true }));
    o = ozeteEkle(o, tur({ gun: '2026-09-25', gorev: true }));
    o = ozeteEkle(o, tur({ gun: '2026-09-26', gorev: true }));
    expect(ozettenRozetler(o, '2026-09-27').has('gorev-3')).toBe(false);
    o = ozeteEkle(o, tur({ gun: '2026-09-27', gorev: true }));
    expect(ozettenRozetler(o, '2026-09-27').has('gorev-3')).toBe(true);
  });
  it('eski kayıtlı özet yeni alanlar olmadan da çalışır', () => {
    const eski = { toplamTur: 3, passizTur: 1, atasozuTur: 0, zorTur: 0, alanlar: ['zihin'], gunler: ['2026-09-27'] };
    const o = ozeteEkle({ ...BOS_OZET, ...eski }, tur({ mod: 'dogaclama', puan: 10 }));
    expect(o).toMatchObject({ toplamTur: 4, dogaclamaTur: 1, xp: 10 });
  });
});
