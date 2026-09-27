// Ses efektleri: hepsi Web Audio ile anında sentezlenir. Dosya yok, ağ isteği yok.
// Tasarım ilkesi: kısa, yumuşak, düşük ses; sert bip yok. Notalar pentatonik (C majör),
// böylece üst üste binseler bile uyumsuz tını çıkmaz.

let ctx: AudioContext | null = null;
let ana: GainNode | null = null;
let yanki: GainNode | null = null;
let acik = true;

/** Kullanıcı etkileşimi sırasında çağrılmalı; tarayıcılar sesi ancak böyle açar. */
export function sesiHazirla(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const sikistir = ctx.createDynamicsCompressor();
      sikistir.threshold.value = -18;
      sikistir.ratio.value = 4;
      ana = ctx.createGain();
      ana.gain.value = 0.55;
      ana.connect(sikistir).connect(ctx.destination);

      // Çanlara hafif bir oda hissi veren kısa, yumuşak yankı.
      const gecikme = ctx.createDelay(1);
      gecikme.delayTime.value = 0.19;
      const geriBesleme = ctx.createGain();
      geriBesleme.gain.value = 0.28;
      const sus = ctx.createBiquadFilter();
      sus.type = 'lowpass';
      sus.frequency.value = 2400;
      yanki = ctx.createGain();
      yanki.gain.value = 0.22;
      yanki.connect(gecikme);
      gecikme.connect(sus).connect(geriBesleme).connect(gecikme);
      sus.connect(ana);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function sesAcik(a: boolean): void {
  acik = a;
}

function hazir(): AudioContext | null {
  return acik && ctx && ana && ctx.state === 'running' ? ctx : null;
}

const NOTA: Record<string, number> = {
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0, C7: 2093.0,
};

/** Yumuşak çan: temel + birkaç harmonik, hızlı atak, doğal sönüm. */
function can(frekans: number, zaman: number, ses = 0.18, sure = 1.1, yankili = true): void {
  const c = ctx!;
  const cikis = c.createGain();
  cikis.gain.setValueAtTime(0.0001, zaman);
  cikis.gain.exponentialRampToValueAtTime(ses, zaman + 0.008);
  cikis.gain.exponentialRampToValueAtTime(0.0001, zaman + sure);
  cikis.connect(ana!);
  if (yankili && yanki) cikis.connect(yanki);
  // Çan benzeri, hafif uyumsuz harmonikler; üst harmonikler daha çabuk söner.
  const kismi: [number, number, number][] = [
    [1, 1, 1],
    [2.0, 0.28, 0.55],
    [3.01, 0.12, 0.35],
    [4.2, 0.05, 0.22],
  ];
  for (const [oran, genlik, omur] of kismi) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = frekans * oran;
    g.gain.setValueAtTime(genlik, zaman);
    g.gain.exponentialRampToValueAtTime(0.0001, zaman + sure * omur);
    o.connect(g).connect(cikis);
    o.start(zaman);
    o.stop(zaman + sure + 0.05);
  }
}

/** Tahta tık: çok kısa, filtrelenmiş gürültü + küçük bir ton. */
function tahta(zaman: number, perde = 1, ses = 0.12): void {
  const c = ctx!;
  const n = Math.floor(c.sampleRate * 0.03);
  const tampon = c.createBuffer(1, n, c.sampleRate);
  const v = tampon.getChannelData(0);
  for (let i = 0; i < n; i++) v[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const kaynak = c.createBufferSource();
  kaynak.buffer = tampon;
  const bant = c.createBiquadFilter();
  bant.type = 'bandpass';
  bant.frequency.value = 1900 * perde;
  bant.Q.value = 4;
  const g = c.createGain();
  g.gain.value = ses;
  kaynak.connect(bant).connect(g).connect(ana!);
  kaynak.start(zaman);

  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(900 * perde, zaman);
  o.frequency.exponentialRampToValueAtTime(420 * perde, zaman + 0.04);
  og.gain.setValueAtTime(ses * 0.6, zaman);
  og.gain.exponentialRampToValueAtTime(0.0001, zaman + 0.05);
  o.connect(og).connect(ana!);
  o.start(zaman);
  o.stop(zaman + 0.06);
}

// ---------- Olaylar ----------

let sonTik = 0;
/** Çark bir dilim sınırını geçtiğinde. `hiz` 0–1: hızlıyken daha kısık ve tiz. */
export function carkTik(hiz: number): void {
  const c = hazir();
  if (!c) return;
  const simdi = c.currentTime;
  if (simdi - sonTik < 0.03) return; // çok hızlıyken vızıltıya dönmesin
  sonTik = simdi;
  const perde = 0.92 + Math.random() * 0.12 + hiz * 0.15;
  tahta(simdi, perde, 0.05 + (1 - hiz) * 0.08);
}

/** Çark durdu, konu geldi: iki notalık küçük bir "ta-da". */
export function konuGeldi(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime + 0.02;
  can(NOTA.G5, t, 0.13, 0.9);
  can(NOTA.C6, t + 0.09, 0.16, 1.4);
}

/** Pas: aşağı kayan yumuşak bir "fşşş". */
export function pasSesi(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime;
  const n = Math.floor(c.sampleRate * 0.35);
  const tampon = c.createBuffer(1, n, c.sampleRate);
  const v = tampon.getChannelData(0);
  for (let i = 0; i < n; i++) v[i] = Math.random() * 2 - 1;
  const k = c.createBufferSource();
  k.buffer = tampon;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(2600, t);
  f.frequency.exponentialRampToValueAtTime(500, t + 0.32);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  k.connect(f).connect(g).connect(ana!);
  k.start(t);
}

/** Sayaç başladı: yukarı doğru hafif bir "pop". */
export function basladi(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(ana!);
  o.start(t);
  o.stop(t + 0.18);
}

/** Son saniyeler: saat tıkırtısı kadar hafif. */
export function sonSaniye(): void {
  const c = hazir();
  if (!c) return;
  tahta(c.currentTime, 1.25, 0.07);
}

/** Araştırma/hazırlık süresi doldu: iki yumuşak çan, "sıra sende". */
export function evreBitti(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime + 0.02;
  can(NOTA.E6, t, 0.14, 1.2);
  can(NOTA.C6, t + 0.22, 0.15, 1.6);
}

/** Tur bitti: yukarı çıkan dört notalık sıcak bir arpej. */
export function turBitti(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime + 0.02;
  [NOTA.C6, NOTA.E6, NOTA.G6, NOTA.C7].forEach((f, i) => can(f, t + i * 0.11, 0.11 + i * 0.015, 1.3 + i * 0.3));
}

/** Rozet kazanıldı: parıltılı, hızlı bir üçleme. */
export function rozetSesi(): void {
  const c = hazir();
  if (!c) return;
  const t = c.currentTime + 0.05;
  [NOTA.G6, NOTA.A6, NOTA.C7, NOTA.E6].forEach((f, i) => can(f * (i === 3 ? 2 : 1), t + i * 0.07, 0.07, 0.9));
}

/** Öz değerlendirme kutusu işaretlendi: minik bir damla. */
export function isaret(acik_: boolean): void {
  const c = hazir();
  if (!c) return;
  can(acik_ ? NOTA.A6 : NOTA.E6, c.currentTime, 0.06, 0.35, false);
}
