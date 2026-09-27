// Kriptografik rastgelelik ve oturum içi tekrar önleme.

export type RastgeleKaynak = (ust: number) => number;

/** [0, ust) aralığında, modülo yanlılığı olmadan tam sayı. */
export function rastgeleTam(ust: number): number {
  if (!Number.isInteger(ust) || ust <= 0) throw new RangeError('ust pozitif tam sayı olmalı');
  const sinir = Math.floor(0x1_0000_0000 / ust) * ust;
  const kutu = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(kutu);
    x = kutu[0];
  } while (x >= sinir);
  return x % ust;
}

/** Son `kapasite` seçimi hatırlar; aday listesinden bunları dışarıda bırakır. */
export class TekrarOnleyici {
  private readonly son: string[] = [];
  constructor(private readonly kapasite = 20) {}

  ekle(id: string): void {
    const i = this.son.indexOf(id);
    if (i >= 0) this.son.splice(i, 1);
    this.son.push(id);
    while (this.son.length > this.kapasite) this.son.shift();
  }

  gorulduMu(id: string): boolean {
    return this.son.includes(id);
  }

  /**
   * Adaylardan birini seçer; son görülenler dışarıda kalır. Tüm adaylar yakın zamanda
   * görüldüyse en eski görüleni tercih eder, böylece seçim hiçbir zaman boş kalmaz.
   */
  sec<T>(adaylar: T[], idOf: (x: T) => string, rnd: RastgeleKaynak = rastgeleTam): T | undefined {
    if (!adaylar.length) return undefined;
    const taze = adaylar.filter((a) => !this.gorulduMu(idOf(a)));
    let secilen: T;
    if (taze.length) {
      secilen = taze[rnd(taze.length)];
    } else {
      const sira = (a: T) => this.son.indexOf(idOf(a));
      secilen = adaylar.reduce((en, a) => (sira(a) < sira(en) ? a : en));
    }
    this.ekle(idOf(secilen));
    return secilen;
  }

  get liste(): readonly string[] {
    return this.son;
  }
}
