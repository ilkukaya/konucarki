// Zaman damgasıyla çalışan geri sayım. setInterval ile saymaz: kalan süre her okumada
// `bitis - simdi()` olarak hesaplanır, böylece sekme arka plandayken de doğru kalır.

export type Saat = () => number;

export class GeriSayim {
  readonly sureMs: number;
  private readonly saat: Saat;
  private bitis: number | null = null; // çalışırken hedef bitiş anı
  private kalanDurakli: number; // duraklatılmışken kalan süre

  constructor(sureMs: number, saat: Saat = () => performance.now()) {
    this.sureMs = Math.max(0, sureMs);
    this.saat = saat;
    this.kalanDurakli = this.sureMs;
  }

  get calisiyor(): boolean {
    return this.bitis !== null;
  }

  baslat(): void {
    if (this.bitis !== null) return;
    this.bitis = this.saat() + this.kalanDurakli;
  }

  duraklat(): void {
    if (this.bitis === null) return;
    this.kalanDurakli = Math.max(0, this.bitis - this.saat());
    this.bitis = null;
  }

  sifirla(): void {
    this.bitis = null;
    this.kalanDurakli = this.sureMs;
  }

  /** Kalan süre (ms), en az 0. */
  kalan(): number {
    if (this.bitis === null) return this.kalanDurakli;
    return Math.max(0, this.bitis - this.saat());
  }

  /** Geçen süre (ms). */
  gecen(): number {
    return this.sureMs - this.kalan();
  }

  bitti(): boolean {
    return this.kalan() <= 0;
  }

  /** 0–1 arası ilerleme. */
  oran(): number {
    return this.sureMs === 0 ? 1 : 1 - this.kalan() / this.sureMs;
  }
}

/** Kalan milisaniyeyi "d:ss" biçimine çevirir; yukarı yuvarlar (0,2 sn kala "0:01" görünür). */
export function sureBicimle(ms: number): string {
  const toplam = Math.ceil(Math.max(0, ms) / 1000);
  const dk = Math.floor(toplam / 60);
  const sn = toplam % 60;
  return `${dk}:${sn.toString().padStart(2, '0')}`;
}

/** Ekran okuyucu için "2 dakika 5 saniye" gibi okunur süre. */
export function sureOkunur(ms: number): string {
  const toplam = Math.ceil(Math.max(0, ms) / 1000);
  const dk = Math.floor(toplam / 60);
  const sn = toplam % 60;
  const p: string[] = [];
  if (dk) p.push(`${dk} dakika`);
  if (sn || !dk) p.push(`${sn} saniye`);
  return p.join(' ');
}
