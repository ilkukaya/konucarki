// Ana sayfa uygulaması: mod seçici, çark, konu kartı, sayaç durum makinesi, tur sonu, kayıt.
import type { ArastirmaKonusu, AtasozuDeyim, DogaclamaSorusu, MeydanOkuma } from '../data/schema.ts';
import { ZORLUK_ADI } from '../data/schema.ts';
import { aramaLinkleri } from '../lib/arama.ts';
import { aciDilimi, dilimYolu, etiket, hedefAci, type Dilim } from '../lib/cark.ts';
import {
  ayarlariOku,
  ayarYaz,
  gecmisOku,
  gecmisYaz,
  ilerlemeIzni,
  ilerlemeIzniYaz,
  kazanilanRozetler,
  ozetOku,
  ozetYaz,
  rozetleriYaz,
  type Ayarlar,
} from '../lib/depo.ts';
import { ROZETLER, ozeteEkle, ozettenRozetler, seriHesapla, type Mod, type Tur } from '../lib/ilerleme.ts';
import { gorevTamamMi, gununGorevi, seviye, toplamPuan, turPuani, type PuanKalemi, type TurSonucu } from '../lib/oyun.ts';
import { TekrarOnleyici, rastgeleTam } from '../lib/rastgele.ts';
import { GeriSayim, sureBicimle, sureOkunur } from '../lib/sayac.ts';
import { slugify } from '../lib/slugify.ts';
import { gununIndeksi, yerelGun } from '../lib/tarih.ts';
import { Kaydedici, kayitDestekleniyor, type KayitSonucu } from './kayit.ts';
import { yildizSerpintisi } from './kutlama.ts';
import { kartCiz, paylasVeyaIndir } from './paylasim.ts';
import { rozetSvg } from './rozet-svg.ts';
import { ekranAcikKalsin, titret } from './sinyal.ts';
import * as ses from './ses.ts';
import { sesiHazirla } from './ses.ts';
import * as veri from './veri.ts';

type Durum = 'bos' | 'secili' | 'arastirma' | 'notlari-kapat' | 'hazirlik' | 'konusma' | 'bitti' | 'grup-sonuc';
type Secim =
  | { mod: 'arastirma'; konu: ArastirmaKonusu }
  | { mod: 'dogaclama'; soru: DogaclamaSorusu }
  | { mod: 'atasozu'; soz: AtasozuDeyim };

const MOD_ADI: Record<Mod, string> = { arastirma: 'Derin araştırma', dogaclama: 'Doğaçlama', atasozu: 'Atasözü ve deyim' };
const EVRE_ADI: Partial<Record<Durum, string>> = { arastirma: 'Araştırma', hazirlik: 'Hazırlık', konusma: 'Konuşma' };
const SPIN_MS = 2600;
const PAS_HAKKI = 3;

const $ = <T extends Element = HTMLElement>(sec: string, kok: ParentNode = document) => kok.querySelector<T>(sec)!;
const $$ = <T extends Element = HTMLElement>(sec: string, kok: ParentNode = document) => [...kok.querySelectorAll<T>(sec)];

export function baslat(): void {
  const kok = $('[data-uygulama]');
  if (!kok) return;

  // ---------- Öğeler ----------
  const dilimSetleri = JSON.parse(kok.dataset.dilimler!) as Record<Mod, Dilim[]>;
  const adlar = JSON.parse(kok.dataset.adlar!) as Record<string, string>;
  const siteHost = kok.dataset.site || location.host;
  const sekmeler = $$<HTMLButtonElement>('[role="tab"]', kok);
  const panel = $('[data-panel]', kok);
  const cark = $<SVGSVGElement>('[data-cark]', kok);
  const carkDon = $<SVGGElement>('[data-cark-don]', kok);
  const carkBaslik = $('[data-cark-baslik]', kok);
  const cevirD = $<HTMLButtonElement>('[data-cevir]', kok);
  const filtre = $<HTMLSelectElement>('[data-filtre]', kok);
  const filtreEtiket = $<HTMLLabelElement>('[data-filtre-kap] label', kok);
  const gununD = $<HTMLButtonElement>('[data-gunun]', kok);
  const sahne = $('[data-sahne]', kok);
  const bolumler = {
    bos: $('[data-bolum="bos"]', kok),
    tur: $('[data-bolum="tur"]', kok),
    bitti: $('[data-bolum="bitti"]', kok),
    grupSonuc: $('[data-bolum="grup-sonuc"]', kok),
  };
  const meydanlar = JSON.parse(kok.dataset.meydan ?? '[]') as MeydanOkuma[];
  const oyunEl = {
    karne: $('[data-karne]', kok),
    karneSeviye: $('[data-karne-seviye]', kok),
    karneXp: $('[data-karne-xp]', kok),
    karneCubukKap: $('[data-karne-cubuk-kap]', kok),
    karneCubuk: $('[data-karne-cubuk]', kok),
    karneAlt: $('[data-karne-alt]', kok),
    gorev: $('[data-gorev]', kok),
    gorevMetin: $('[data-gorev-metin]', kok),
    gorevOdul: $('[data-gorev-odul]', kok),
    jetonlar: $('[data-jetonlar]', kok),
    meydan: $('[data-meydan]', kok),
    meydanMetin: $('[data-meydan-metin]', kok),
    meydanCek: $<HTMLButtonElement>('[data-meydan-cek]', kok),
    meydanBirak: $<HTMLButtonElement>('[data-meydan-birak]', kok),
    alkis: $('[data-alkis]', kok),
    alkisAd: $('[data-alkis-ad]', kok),
    alkisDugmeler: $$<HTMLButtonElement>('[data-alkis-n]', kok),
    puanKalemleri: $('[data-puan-kalemleri]', kok),
    puanToplam: $('[data-puan-toplam]', kok),
    seviyeKap: $('[data-seviye-kap]', kok),
    seviyeAd: $('[data-seviye-ad]', kok),
    seviyeXp: $('[data-seviye-xp]', kok),
    seviyeCubuk: $('[data-seviye-cubuk]', kok),
    seviyeNot: $('[data-seviye-not]', kok),
    grupSeridi: $('[data-grup-seridi]', kok),
    siraAd: $('[data-sira-ad]', kok),
    skor: $('[data-skor]', kok),
    grupBitir: $<HTMLButtonElement>('[data-grup-bitir]', kok),
    grupGiris: $('[data-grup-giris]', kok),
    grupKur: $('[data-grup-kur]', kok),
    oyuncuAdi: $<HTMLInputElement>('[data-oyuncu-adi]', kok),
    oyuncular: $('[data-oyuncular]', kok),
    grupBasla: $<HTMLButtonElement>('[data-grup-basla]', kok),
    kazanan: $('[data-kazanan]', kok),
    siralama: $('[data-siralama]', kok),
    bosBaslik: $('[data-bos-baslik]', kok),
    yeniD: $<HTMLButtonElement>('[data-yeni]', kok),
  };
  const hataP = $('[data-hata]', kok);
  const duyuru = $('[data-duyuru]', kok);

  const sayacEl = $('[data-sayac]', kok);
  const evreEl = $('[data-evre]', sayacEl);
  const rakamEl = $('[data-rakam]', kok);
  const cubukEl = $('[data-cubuk]', kok);
  const duraklatD = $<HTMLButtonElement>('[data-duraklat]', kok);
  const notlariKapat = $('[data-notlari-kapat]', kok);

  const kart = {
    grup: $('[data-kart-grup]', kok),
    zorluk: $('[data-kart-zorluk]', kok),
    baslik: $('[data-kart-baslik]', kok),
    ayrinti: $('[data-kart-ayrinti]', kok),
    ipucu: $('[data-kart-ipucu]', kok),
    arastirma: $('[data-kart-arastirma]', kok),
    sorular: $('[data-kart-sorular]', kok),
    kaynaklar: $('[data-kart-kaynaklar]', kok),
    sayfa: $<HTMLAnchorElement>('[data-kart-sayfa]', kok),
    cerceve: $('[data-kart-cerceve]', kok),
    atasozu: $('[data-kart-atasozu]', kok),
  };
  const seciliDugmeler = $('[data-secili-dugmeler]', kok);
  const pasD = $<HTMLButtonElement>('[data-pas]', kok);
  const pasBitti = $('[data-pas-bitti]', kok);

  const kayitKap = $('[data-kayit]', kok);
  const kaydetD = $<HTMLButtonElement>('[data-kaydet]', kok);
  const kaydetYazi = $('[data-kaydet-yazi]', kok);
  const kayitHata = $('[data-kayit-hata]', kok);

  const bitti = {
    baslik: $('[data-bitti-baslik]', kok),
    ozet: $('[data-bitti-ozet]', kok),
    rozet: $('[data-rozet-kutusu]', kok),
    izin: $('[data-izin]', kok),
    kontrol: $('[data-bitti-kontrol]', kok),
    kaynaklar: $('[data-bitti-kaynaklar]', kok),
    anlamKap: $('[data-bitti-anlam]', kok),
    anlamD: $<HTMLButtonElement>('[data-anlam-goster]', kok),
    anlam: $('[data-anlam]', kok),
    kayit: $('[data-kayit-sonuc]', kok),
    ses: $<HTMLAudioElement>('[data-ses]', kok),
    sesIndir: $<HTMLAnchorElement>('[data-ses-indir]', kok),
    paylasNot: $('[data-paylas-not]', kok),
    deg1: $('[data-deg-1]', kok),
    deg3: $('[data-deg-3]', kok),
  };

  // ---------- Durum ----------
  let ayarlar: Ayarlar = ayarlariOku();
  let mod: Mod = ayarlar.mod;
  let durum: Durum = 'bos';
  let secim: Secim | null = null;
  let sayac: GeriSayim | null = null;
  let raf = 0;
  let son10 = false;
  let sonTikSaniye = 0;
  let donuyor = false;
  let aci = 0;
  let pasHakki = PAS_HAKKI;
  let pasKullanildi = false;
  let konusmaMs = 0;
  let kayitSonucu: KayitSonucu | null = null;
  let sonTur: Tur | null = null;
  const tekrar: Record<Mod, TekrarOnleyici> = {
    arastirma: new TekrarOnleyici(20),
    dogaclama: new TekrarOnleyici(20),
    atasozu: new TekrarOnleyici(20),
  };
  // Oyun durumu
  type Oyuncu = { ad: string; puan: number; pas: number; tur: number };
  let grup: { oyuncular: Oyuncu[]; sira: number } | null = null;
  let taslakOyuncular: string[] = [];
  let meydan: MeydanOkuma | null = null;
  const meydanTekrar = new TekrarOnleyici(12);
  let oturumPuani = 0;
  let turKalemleri: PuanKalemi[] = [];
  let alkisSecim = 0;
  let grupPuaniIslendi = true;
  let puanAnimasyonu = 0;
  const alanListesi = dilimSetleri.arastirma.map((d) => ({ id: d.id, ad: adlar[d.id] ?? d.etiket }));
  const gorev = gununGorevi(yerelGun(), alanListesi);
  let gorevBugunTamam = ilerlemeIzni() ? ozetOku().gorevGunleri.includes(yerelGun()) : false;

  const kaydedici = new Kaydedici();
  const hareketAz = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Yardımcılar ----------
  function duyur(metin: string): void {
    duyuru.textContent = '';
    window.setTimeout(() => (duyuru.textContent = metin), 60);
  }

  function hataGoster(metin: string | null): void {
    hataP.hidden = !metin;
    hataP.textContent = metin ?? '';
  }

  function el<K extends keyof HTMLElementTagNameMap>(etiketAdi: K, ozellik: Record<string, string> = {}, metin?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(etiketAdi);
    for (const [k, v] of Object.entries(ozellik)) e.setAttribute(k, v);
    if (metin != null) e.textContent = metin;
    return e;
  }

  function kaynaklariDoldur(ul: HTMLElement, terim: string): void {
    ul.replaceChildren(
      ...aramaLinkleri(terim).map((l) => {
        const li = el('li');
        const a = el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.ad);
        li.append(a, el('span', { class: 'soluk' }, ` · ${l.aciklama}`));
        return li;
      }),
    );
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(ad: string, ozellik: Record<string, string | number>): SVGElement {
    const e = document.createElementNS(SVG_NS, ad);
    for (const [k, v] of Object.entries(ozellik)) e.setAttribute(k, String(v));
    return e;
  }

  // ---------- Çark ----------
  function carkiKur(): void {
    const dilimler = dilimSetleri[mod];
    const n = dilimler.length;
    carkDon.replaceChildren(
      ...dilimler.map((d, i) => {
        const g = svgEl('g', { class: `dilim ${i % 2 ? 'd-b' : 'd-a'}`, 'data-dilim': d.id });
        const e = etiket(i, n);
        const t = svgEl('text', { transform: e.donus, x: e.x, y: 2.6, 'text-anchor': e.capa });
        t.textContent = d.etiket;
        g.append(svgEl('path', { class: 'dilim-zemin', d: dilimYolu(i, n) }), svgEl('path', { class: 'dilim-desen', d: dilimYolu(i, n), fill: 'url(#cini)' }), t);
        return g;
      }),
    );
    carkBaslik.textContent = `Konu çarkı: ${[...new Set(dilimler.map((d) => d.etiket))].join(', ')}`;
    cark.removeAttribute('data-secim');
  }

  function aciAyarla(yeni: number, sure: number): void {
    aci = yeni;
    carkDon.style.setProperty('--sure', `${sure}ms`);
    carkDon.style.setProperty('--aci', `${yeni}deg`);
  }

  function dilimiVurgula(i: number | null): void {
    const g = $$('.dilim', carkDon);
    g.forEach((d, j) => d.classList.toggle('secili', j === i));
    cark.toggleAttribute('data-secim', i !== null);
  }

  /** Çarkı i. dilime döndürür; animasyon bitince çözülür. */
  function dondur(i: number, animasyonlu = true): Promise<void> {
    const n = dilimSetleri[mod].length;
    const sapma = (rastgeleTam(1000) / 1000 - 0.5) * 0.9;
    const sure = animasyonlu && !hareketAz.matches ? SPIN_MS + rastgeleTam(500) : 0;
    dilimiVurgula(null);
    const baslangic = aci;
    aciAyarla(hedefAci(aci, i, n, sure ? 4 + rastgeleTam(2) : 0, sapma), sure);
    if (sure) tikTakip(baslangic, 360 / n, sure);
    return new Promise((coz) =>
      window.setTimeout(() => {
        dilimiVurgula(aciDilimi(aci, n));
        coz();
      }, sure + 30),
    );
  }

  /**
   * Dönüş sırasında çarkın gerçek açısını okuyup her dilim sınırında bir tık çalar;
   * böylece ses animasyonla birebir eşleşir ve yavaşladıkça seyrekleşir.
   */
  function tikTakip(baslangic: number, dilimAci: number, sure: number): void {
    let onceki = baslangic;
    let toplam = baslangic;
    let sonDilim = Math.floor(toplam / dilimAci);
    let sonZaman = performance.now();
    const bitis = sonZaman + sure;
    const adim = () => {
      const m = getComputedStyle(carkDon).transform;
      const eslesme = m.match(/matrix\(([^,]+),\s*([^,]+)/);
      if (eslesme) {
        const a = (Math.atan2(Number(eslesme[2]), Number(eslesme[1])) * 180) / Math.PI;
        let fark = a - (((onceki % 360) + 360) % 360);
        if (fark > 180) fark -= 360;
        if (fark < -180) fark += 360;
        toplam += fark;
        onceki = toplam;
        const simdi = performance.now();
        const hiz = Math.min(1, Math.abs(fark) / Math.max(1, simdi - sonZaman) / 1.2); // derece/ms, ~1.2 en hızlı
        sonZaman = simdi;
        const dilim = Math.floor(toplam / dilimAci);
        if (dilim !== sonDilim) {
          sonDilim = dilim;
          ses.carkTik(hiz);
        }
      }
      if (performance.now() < bitis) requestAnimationFrame(adim);
    };
    requestAnimationFrame(adim);
  }

  // ---------- Filtre ----------
  function filtreyiKur(): void {
    const secenekler: [string, string][] =
      mod === 'atasozu'
        ? [['', 'Hepsi'], ['atasözü', 'Yalnızca atasözleri'], ['deyim', 'Yalnızca deyimler']]
        : [['', mod === 'arastirma' ? 'Tüm alanlar' : 'Tüm kategoriler'], ...dilimSetleri[mod].map((d): [string, string] => [d.id, adlar[d.id] ?? d.etiket])];
    filtre.replaceChildren(...secenekler.map(([v, ad]) => el('option', { value: v }, ad)));
    filtreEtiket.textContent = mod === 'arastirma' ? 'Alan' : mod === 'dogaclama' ? 'Kategori' : 'Tür';
  }

  function dilimSec(): number {
    const d = dilimSetleri[mod];
    const f = filtre.value;
    if (mod === 'atasozu') {
      const adaylar = d.map((x, i) => ({ x, i })).filter(({ x }) => !f || (f === 'deyim' ? x.etiket === 'Deyim' : x.etiket === 'Atasözü'));
      return adaylar[rastgeleTam(adaylar.length)].i;
    }
    if (f) {
      const i = d.findIndex((x) => x.id === f);
      if (i >= 0) return i;
    }
    return rastgeleTam(d.length);
  }

  async function secimYap(dilimIndeksi: number): Promise<Secim | null> {
    const dilim = dilimSetleri[mod][dilimIndeksi];
    if (mod === 'arastirma') {
      const satirlar = (await veri.dizin()).filter((s) => s[3] === dilim.id);
      const satir = tekrar.arastirma.sec(satirlar, (s) => s[0]);
      if (!satir) return null;
      const konu = (await veri.alanKonulari(dilim.id)).find((k) => k.id === satir[0]);
      return konu ? { mod, konu } : null;
    }
    if (mod === 'dogaclama') {
      const sorular = (await veri.dogaclamaSorulari()).filter((s) => s.kategori === dilim.id);
      const soru = tekrar.dogaclama.sec(sorular, (s) => s.id);
      return soru ? { mod, soru } : null;
    }
    const tur = dilim.etiket === 'Deyim' ? 'deyim' : 'atasözü';
    const liste = (await veri.atasozleri()).filter((a) => a.tur === tur);
    const soz = tekrar.atasozu.sec(liste, (a) => a.id);
    return soz ? { mod: 'atasozu', soz } : null;
  }

  async function cevir(): Promise<void> {
    if (donuyor) return;
    if (durum !== 'bos' && durum !== 'secili' && durum !== 'bitti') return;
    if (durum === 'secili') {
      // Konu gelmişken yeniden çevirmek: hak varsa pas sayılır; hak bitince ceza yok.
      if (kalanPas() > 0) pasHarca();
      pasKullanildi = true;
      meydanBirak(true);
    }
    sesiHazirla();
    if (durum === 'secili') ses.pasSesi();
    if (durum === 'bitti') {
      grupSirayiIlerlet();
      turuTemizle();
    }
    hataGoster(null);
    donuyor = true;
    cevirD.disabled = true;
    kok.classList.add('donuyor');
    duyur('Çark dönüyor');
    const i = dilimSec();
    try {
      const [s] = await Promise.all([secimYap(i), dondur(i)]);
      if (!s) throw new Error('boş seçim');
      secim = s;
      durumaGec('secili');
      ses.konuGeldi();
      kartBelirsin();
      duyur(`Seçilen konu: ${secimBasligi(s)}`);
      if (window.matchMedia('(max-width: 60rem)').matches) sahne.scrollIntoView({ behavior: hareketAz.matches ? 'auto' : 'smooth', block: 'start' });
    } catch {
      durumaGec('bos');
      hataGoster('Konu yüklenemedi. Bağlantını kontrol edip yeniden çevirebilirsin.');
    } finally {
      donuyor = false;
      cevirD.disabled = false;
      kok.classList.remove('donuyor');
    }
  }

  function pas(): void {
    if (durum !== 'secili' || kalanPas() <= 0) return;
    void cevir();
  }

  function kalanPas(): number {
    return grup ? grup.oyuncular[grup.sira].pas : pasHakki;
  }
  function pasHarca(): void {
    if (grup) grup.oyuncular[grup.sira].pas--;
    else pasHakki--;
  }

  // ---------- Kart ----------
  function secimBasligi(s: Secim): string {
    return s.mod === 'arastirma' ? s.konu.baslik : s.mod === 'dogaclama' ? s.soru.soru : s.soz.metin;
  }

  function kartiDoldur(s: Secim): void {
    kart.zorluk.hidden = s.mod !== 'arastirma';
    kart.ipucu.hidden = s.mod !== 'arastirma';
    kart.arastirma.hidden = s.mod !== 'arastirma';
    kart.cerceve.hidden = s.mod !== 'dogaclama';
    kart.atasozu.hidden = s.mod !== 'atasozu';
    kart.baslik.classList.toggle('soru', s.mod === 'dogaclama');
    kart.baslik.textContent = secimBasligi(s);
    if (s.mod === 'arastirma') {
      const k = s.konu;
      kart.grup.textContent = adlar[k.alan] ?? k.alan;
      kart.zorluk.textContent = ZORLUK_ADI[k.zorluk];
      kart.zorluk.dataset.z = String(k.zorluk);
      kart.ipucu.textContent = k.ipucu;
      kart.sorular.replaceChildren(...k.sorular.map((q) => el('li', {}, q)));
      kaynaklariDoldur(kart.kaynaklar, k.arama);
      kart.sayfa.href = `/konu/${k.slug}/`;
    } else if (s.mod === 'dogaclama') {
      kart.grup.textContent = adlar[s.soru.kategori] ?? s.soru.kategori;
    } else {
      kart.grup.textContent = s.soz.tur === 'deyim' ? 'Deyim' : 'Atasözü';
    }
  }

  function pasGuncelle(): void {
    const kalan = kalanPas();
    pasD.hidden = kalan <= 0;
    pasBitti.hidden = kalan > 0;
    pasD.setAttribute('aria-label', `Pas geç, ${kalan} hak kaldı`);
    oyunEl.jetonlar.replaceChildren(
      ...Array.from({ length: PAS_HAKKI }, (_, i) => {
        const j = el('span', { class: i < kalan ? 'jeton dolu' : 'jeton' });
        return j;
      }),
    );
    cevirD.textContent = durum === 'secili' ? (kalan > 0 ? 'Yeniden çevir (pas)' : 'Yeniden çevir') : 'Çarkı çevir';
  }

  // ---------- Durum makinesi ----------
  function durumaGec(yeni: Durum): void {
    durum = yeni;
    kok.dataset.durum = yeni;
    const turda = yeni !== 'bos' && yeni !== 'bitti' && yeni !== 'grup-sonuc';
    bolumler.bos.hidden = yeni !== 'bos';
    bolumler.tur.hidden = !turda;
    bolumler.bitti.hidden = yeni !== 'bitti';
    bolumler.grupSonuc.hidden = yeni !== 'grup-sonuc';

    const sayacta = yeni === 'arastirma' || yeni === 'hazirlik' || yeni === 'konusma';
    sayacEl.hidden = !sayacta;
    notlariKapat.hidden = yeni !== 'notlari-kapat';
    seciliDugmeler.hidden = yeni !== 'secili';
    kayitKap.hidden = yeni !== 'konusma';
    // Konuşurken notlar kapalı: yalnızca başlık görünür.
    kart.ayrinti.hidden = yeni === 'konusma' || yeni === 'notlari-kapat';
    sahne.classList.toggle('konusuyor', yeni === 'konusma');

    // Tur sırasında mod ve filtre değiştirilemez.
    const kilitli = sayacta || yeni === 'notlari-kapat';
    cevirD.hidden = kilitli || yeni === 'grup-sonuc';
    oyunEl.grupBitir.disabled = kilitli;
    oyunEl.meydan.hidden = !meydan || !(turda || yeni === 'bitti');
    oyunEl.meydanBirak.hidden = yeni !== 'secili';
    oyunEl.meydanCek.textContent = '';
    oyunEl.meydanCek.append(meydan ? 'Başka kart çek' : 'Meydan okuma kartı çek', ' ', el('span', { class: 'odul' }, '+10'));
    filtre.disabled = kilitli;
    for (const s of sekmeler) s.setAttribute('aria-disabled', String(kilitli));

    if (secim && turda) kartiDoldur(secim);
    pasGuncelle();
    if (evreEl && EVRE_ADI[yeni]) evreEl.textContent = EVRE_ADI[yeni]!;
    void ekranAcikKalsin(sayacta);
  }

  function fazBaslat(yeni: 'arastirma' | 'hazirlik' | 'konusma', ms: number, otomatik = false): void {
    sesiHazirla();
    if (!otomatik) ses.basladi();
    sayac = new GeriSayim(ms);
    son10 = false;
    sonTikSaniye = 0;
    sayacEl.classList.remove('son-on');
    durumaGec(yeni);
    sayac.baslat();
    duraklatD.textContent = 'Duraklat';
    duyur(`${EVRE_ADI[yeni]} başladı: ${sureOkunur(ms)}.`);
    dongu();
    if (yeni === 'konusma') {
      kayitHata.hidden = true;
      kaydetYazi.textContent = 'Kaydet';
      kaydetD.classList.remove('kaydediyor');
    }
  }

  function ciz(): void {
    if (!sayac) return;
    const kalan = sayac.kalan();
    rakamEl.textContent = sureBicimle(kalan);
    cubukEl.style.setProperty('--oran', String(sayac.oran()));
    const sonOn = kalan <= 10_000 && kalan > 0;
    sayacEl.classList.toggle('son-on', sonOn);
    if (sonOn && !son10 && sayac.calisiyor) {
      son10 = true;
      duyur('Son 10 saniye.');
    }
    // Son üç saniyede saat tıkırtısı kadar hafif bir tık.
    const saniye = Math.ceil(kalan / 1000);
    if (sayac.calisiyor && kalan > 0 && saniye <= 3 && saniye !== sonTikSaniye) {
      sonTikSaniye = saniye;
      if (!kaydedici.kaydediyor) ses.sonSaniye(); // kayda karışmasın
    }
  }

  function dongu(): void {
    cancelAnimationFrame(raf);
    const adim = () => {
      if (!sayac) return;
      ciz();
      if (sayac.bitti()) {
        fazBitti(true);
        return;
      }
      if (sayac.calisiyor) raf = requestAnimationFrame(adim);
    };
    raf = requestAnimationFrame(adim);
  }

  // Arka planda rAF durur; sekmeye dönünce süre zaman damgasından yeniden hesaplanır.
  // Arka plandayken bitişi yakalamak için seyrek bir denetim de çalışır (sayma değil, yalnızca kontrol).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sayac?.calisiyor) dongu();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'hidden' && sayac?.calisiyor && sayac.bitti()) fazBitti(true);
  }, 1000);

  function fazBitti(sureDoldu: boolean): void {
    if (!sayac) return;
    cancelAnimationFrame(raf);
    const biten = durum;
    if (biten === 'konusma') konusmaMs = sayac.gecen();
    sayac.duraklat();
    ciz();
    sayac = null;
    if (sureDoldu) {
      if (biten !== 'konusma') ses.evreBitti(); // konuşma sonu için turBitti() çalar
      titret();
    }
    if (biten === 'arastirma') {
      durumaGec('notlari-kapat');
      duyur('Süre doldu. Notlarını kapat, hazır olduğunda anlatmaya başla.');
      $<HTMLButtonElement>('[data-anlat]', kok).focus();
    } else if (biten === 'hazirlik') {
      fazBaslat('konusma', konusmaSuresi(), true);
    } else if (biten === 'konusma') {
      turuBitir();
    }
  }

  function hazirlikSuresi(): number {
    return (mod === 'dogaclama' ? ayarlar.dogaclamaHazirlikSn : ayarlar.atasozuHazirlikSn) * 1000;
  }
  function konusmaSuresi(): number {
    const dk = mod === 'arastirma' ? ayarlar.arastirmaKonusmaDk : mod === 'dogaclama' ? ayarlar.dogaclamaKonusmaDk : ayarlar.atasozuKonusmaDk;
    return dk * 60_000;
  }

  function turaBasla(): void {
    if (durum !== 'secili' || !secim) return;
    if (mod === 'arastirma') fazBaslat('arastirma', ayarlar.arastirmaDk * 60_000);
    else if (hazirlikSuresi() > 0) fazBaslat('hazirlik', hazirlikSuresi());
    else fazBaslat('konusma', konusmaSuresi());
  }

  function duraklatDevam(): void {
    if (!sayac) return;
    if (sayac.calisiyor) {
      sayac.duraklat();
      duraklatD.textContent = 'Devam et';
      duyur('Duraklatıldı.');
      void ekranAcikKalsin(false);
    } else {
      sayac.baslat();
      duraklatD.textContent = 'Duraklat';
      duyur('Devam ediyor.');
      void ekranAcikKalsin(true);
      dongu();
    }
    ciz();
  }

  function sifirla(): void {
    if (!sayac) return;
    sayac.sifirla();
    son10 = false;
    duraklatD.textContent = 'Başlat';
    duyur(`Sayaç sıfırlandı: ${sureOkunur(sayac.sureMs)}.`);
    ciz();
  }

  // ---------- Kayıt ----------
  async function kayitDegistir(): Promise<void> {
    if (kaydedici.kaydediyor) {
      kaydedici.durdur();
      return;
    }
    kayitHata.hidden = true;
    kaydetD.disabled = true;
    try {
      await kaydedici.baslat(konusmaSuresi() + 15_000, (sonuc) => {
        kaydetD.classList.remove('kaydediyor');
        kaydetYazi.textContent = 'Yeniden kaydet';
        kayitSonucu = sonuc;
        kayitGoster();
      });
      if (durum !== 'konusma') {
        kaydedici.durdur();
        return;
      }
      kaydetD.classList.add('kaydediyor');
      kaydetYazi.textContent = 'Kaydı durdur';
      duyur('Kayıt başladı.');
    } catch (e) {
      const ad = (e as DOMException)?.name;
      kayitHata.textContent =
        ad === 'NotAllowedError' || ad === 'SecurityError'
          ? 'Mikrofon izni verilmedi. Kayıtsız devam edebilir ya da tarayıcı ayarlarından izin verebilirsin.'
          : 'Mikrofon açılamadı. Kayıtsız devam edebilirsin.';
      kayitHata.hidden = false;
    } finally {
      kaydetD.disabled = false;
    }
  }

  function kayitGoster(): void {
    bitti.kayit.hidden = !kayitSonucu;
    if (!kayitSonucu || !secim) {
      bitti.ses.removeAttribute('src');
      return;
    }
    bitti.ses.src = kayitSonucu.url;
    bitti.sesIndir.href = kayitSonucu.url;
    bitti.sesIndir.download = `konucarki-${dosyaSlug(secim)}-${yerelGun()}.${kayitSonucu.uzanti}`;
  }

  function dosyaSlug(s: Secim): string {
    return s.mod === 'arastirma' ? s.konu.slug : s.mod === 'dogaclama' ? `dogaclama-${s.soru.id}` : slugify(s.soz.metin).slice(0, 40);
  }

  // ---------- Tur sonu ----------
  function turuBitir(): void {
    if (!secim) return;
    const kayitVardi = kaydedici.kaydediyor;
    if (kayitVardi) kaydedici.durdur();
    // Kayıt kapanırken çalarsa sese karışmasın diye kısa bir gecikme.
    window.setTimeout(ses.turBitti, kayitVardi ? 250 : 0);
    durumaGec('bitti');
    const s = secim;
    bitti.baslik.textContent = secimBasligi(s);
    bitti.ozet.textContent = `${MOD_ADI[s.mod]} · ${sureOkunur(konusmaMs)} konuştun.`;
    bitti.kontrol.hidden = s.mod !== 'arastirma';
    if (s.mod === 'arastirma') kaynaklariDoldur(bitti.kaynaklar, s.konu.arama);
    bitti.anlamKap.hidden = s.mod !== 'atasozu';
    bitti.anlam.hidden = true;
    bitti.anlamD.setAttribute('aria-expanded', 'false');
    bitti.anlamD.textContent = 'Anlamı göster';
    if (s.mod === 'atasozu') bitti.anlam.textContent = s.soz.anlam;
    bitti.deg1.textContent = s.mod === 'atasozu' ? 'Anlamını bir cümleyle söyleyebildim' : s.mod === 'dogaclama' ? 'Ana fikrimi bir cümleyle söyledim' : 'Konuyu bir cümleyle tanımlayabildim';
    bitti.deg3.textContent = s.mod === 'arastirma' ? 'Emin olmadığım noktayı fark ettim' : 'Konuşmamı genel bir sonuca bağladım';
    for (const c of $$<HTMLInputElement>('.degerlendir input', kok)) c.checked = false;
    bitti.paylasNot.hidden = true;
    bitti.rozet.hidden = true;
    kayitGoster();

    // Puan
    const temel: Omit<TurSonucu, 'gorevTamam'> = {
      mod: s.mod,
      zorluk: s.mod === 'arastirma' ? s.konu.zorluk : undefined,
      alan: s.mod === 'arastirma' ? s.konu.alan : undefined,
      pasKullanildi,
      konusmaMs,
      hedefMs: konusmaSuresi(),
      meydan: !!meydan,
    };
    // Günün görevi kişiseldir: grup oyununda sayılmaz, günde bir kez ödül verir.
    const gorevTamam = !grup && !gorevBugunTamam && gorevTamamMi(gorev, temel);
    turKalemleri = turPuani({ ...temel, gorevTamam });
    const puan = toplamPuan(turKalemleri);

    sonTur = {
      gun: yerelGun(),
      zaman: Date.now(),
      mod: s.mod,
      konuId: s.mod === 'arastirma' ? s.konu.id : s.mod === 'dogaclama' ? s.soru.id : s.soz.id,
      baslik: secimBasligi(s),
      alan: s.mod === 'arastirma' ? s.konu.alan : s.mod === 'dogaclama' ? s.soru.kategori : undefined,
      zorluk: s.mod === 'arastirma' ? s.konu.zorluk : undefined,
      pasKullanildi,
      konusmaMs,
      meydan: !!meydan,
      gorev: gorevTamam,
      puan,
    };

    oyunEl.alkis.hidden = !grup;
    oyunEl.seviyeKap.hidden = true;
    oyunEl.seviyeNot.hidden = true;
    if (grup) {
      // Grup: kişisel ilerleme kaydedilmez; alkışla birlikte oyuncunun hanesine yazılır.
      bitti.izin.hidden = true;
      alkisSecim = 0;
      grupPuaniIslendi = false;
      oyunEl.alkisAd.textContent = grup.oyuncular[grup.sira].ad;
      const sonraki = grup.oyuncular[(grup.sira + 1) % grup.oyuncular.length];
      oyunEl.yeniD.textContent = `Sıradaki: ${sonraki.ad}`;
      alkisGuncelle();
    } else {
      oyunEl.yeniD.textContent = 'Yeni konu çevir';
      oturumPuani += puan;
      if (gorevTamam) {
        gorevBugunTamam = true;
        gorevGuncelle();
      }
      const izin = ilerlemeIzni();
      bitti.izin.hidden = izin !== null;
      const xpOnce = ozetOku().xp;
      if (izin) ilerlemeyiKaydet(sonTur);
      puanlariGoster(turKalemleri, izin ? { once: xpOnce, sonra: ozetOku().xp } : null);
      karneGuncelle();
    }
    duyur(`Tur bitti. ${bitti.ozet.textContent} ${puan} puan kazandın.`);
    window.setTimeout(() => yildizSerpintisi(sahne, 12), kayitVardi ? 250 : 60);
    bitti.baslik.focus();
  }

  /** Puan kalemlerini tek tek, küçük notalarla sayar; ardından seviye çubuğunu doldurur. */
  function puanlariGoster(kalemler: PuanKalemi[], xp: { once: number; sonra: number } | null): void {
    const jeton = ++puanAnimasyonu;
    const hizli = hareketAz.matches;
    oyunEl.puanKalemleri.replaceChildren();
    oyunEl.puanToplam.textContent = '0';
    let toplam = 0;
    const kalemEkle = (k: PuanKalemi, i: number) => {
      const li = el('li');
      li.append(el('span', {}, k.ad), el('span', { class: 'puan-deger' }, `+${k.puan}`));
      oyunEl.puanKalemleri.append(li);
      toplam += k.puan;
      oyunEl.puanToplam.textContent = String(toplam);
      if (!hizli) ses.puanNotu(i);
    };
    const bitir = () => {
      if (xp) seviyeGoster(xp.once, xp.sonra, !hizli);
      else if (!grup) {
        oyunEl.seviyeNot.hidden = false;
        oyunEl.seviyeNot.textContent =
          ilerlemeIzni() === false
            ? `Bu oturumda ${oturumPuani} puan topladın.`
            : `Bu oturumda ${oturumPuani} puan topladın. İlerlemeni tutarsan puanların birikir ve seviye atlarsın.`;
      }
    };
    if (hizli) {
      kalemler.forEach(kalemEkle);
      bitir();
      return;
    }
    kalemler.forEach((k, i) =>
      window.setTimeout(() => {
        if (jeton !== puanAnimasyonu) return;
        kalemEkle(k, i);
        if (i === kalemler.length - 1) window.setTimeout(() => jeton === puanAnimasyonu && bitir(), 250);
      }, 700 + i * 260),
    );
  }

  function seviyeGoster(once: number, sonra: number, animasyonlu: boolean): void {
    const s0 = seviye(once);
    const s1 = seviye(sonra);
    oyunEl.seviyeKap.hidden = false;
    oyunEl.seviyeAd.textContent = `Seviye ${s1.sira} · ${s1.ad}`;
    oyunEl.seviyeXp.textContent = `${sonra} / ${s1.ust}`;
    const baslangic = s1.sira === s0.sira ? s0.oran : 0;
    oyunEl.seviyeCubuk.style.setProperty('--oran', String(animasyonlu ? baslangic : s1.oran));
    if (animasyonlu) requestAnimationFrame(() => requestAnimationFrame(() => oyunEl.seviyeCubuk.style.setProperty('--oran', String(s1.oran))));
    oyunEl.seviyeNot.hidden = false;
    if (s1.sira > s0.sira) {
      oyunEl.seviyeNot.textContent = `Seviye atladın! Yeni unvanın: ${s1.ad}.`;
      oyunEl.seviyeNot.classList.add('atladi');
      ses.seviyeAtladi();
      yildizSerpintisi(sahne, 34, true);
      duyur(`Seviye atladın: ${s1.ad}.`);
    } else {
      oyunEl.seviyeNot.classList.remove('atladi');
      oyunEl.seviyeNot.textContent = `${s1.sonraki} seviyesine ${s1.ust - sonra} puan kaldı.`;
    }
  }

  function ilerlemeyiKaydet(t: Tur): void {
    gecmisYaz([...gecmisOku(), t]);
    const ozet = ozeteEkle(ozetOku(), t);
    ozetYaz(ozet);
    const onceki = new Set(kazanilanRozetler());
    const simdi = ozettenRozetler(ozet, yerelGun());
    const yeni = ROZETLER.filter((r) => simdi.has(r.id) && !onceki.has(r.id));
    rozetleriYaz([...simdi]);
    const seri = seriHesapla(ozet.gunler, yerelGun()).guncel;

    const parcalar: HTMLElement[] = [];
    for (const r of yeni) {
      const d = el('div', { class: 'rozet-yeni' });
      const p = el('p');
      p.append(el('strong', {}, `Yeni rozet: ${r.ad}`), el('span', { class: 'soluk' }, ` ${r.aciklama}`));
      d.append(rozetSvg(r.id), p);
      parcalar.push(d);
    }
    if (seri > 1) parcalar.push(el('p', { class: 'seri' }, `${seri} gündür üst üste konuşuyorsun.`));
    bitti.rozet.replaceChildren(...parcalar);
    bitti.rozet.hidden = !parcalar.length;
    if (yeni.length) {
      duyur(`Yeni rozet: ${yeni.map((r) => r.ad).join(', ')}`);
      window.setTimeout(ses.rozetSesi, 2200);
    }
  }

  function turuTemizle(): void {
    kaydedici.temizle();
    kayitSonucu = null;
    kayitGoster();
    secim = null;
    sayac = null;
    pasKullanildi = false;
    konusmaMs = 0;
    sonTur = null;
    meydanBirak(true);
    puanAnimasyonu++;
    cancelAnimationFrame(raf);
  }

  // ---------- Oyun: karne, görev, meydan okuma ----------
  function karneGuncelle(): void {
    oyunEl.karne.hidden = !!grup;
    if (grup) return;
    if (ilerlemeIzni()) {
      const o = ozetOku();
      const sv = seviye(o.xp);
      const seri = seriHesapla(o.gunler, yerelGun()).guncel;
      oyunEl.karneSeviye.textContent = `Seviye ${sv.sira} · ${sv.ad}`;
      oyunEl.karneXp.textContent = `${o.xp} puan`;
      oyunEl.karneCubukKap.hidden = false;
      oyunEl.karneCubuk.style.setProperty('--oran', String(sv.oran));
      oyunEl.karneAlt.textContent = `${sv.sonraki} seviyesine ${sv.ust - o.xp} puan${seri > 0 ? ` · Seri: ${seri} gün` : ''}`;
    } else {
      oyunEl.karneSeviye.textContent = 'Oturum puanı';
      oyunEl.karneXp.textContent = `${oturumPuani} puan`;
      oyunEl.karneCubukKap.hidden = true;
      oyunEl.karneAlt.textContent =
        oturumPuani === 0
          ? 'Her tur puan kazandırır. Zor konu, pas kullanmamak ve meydan okuma kartları ekstra puan getirir.'
          : 'İlerlemeni bu cihazda tutarsan puanların birikir, seviye atlarsın.';
    }
  }

  function gorevGuncelle(): void {
    oyunEl.gorev.hidden = !!grup;
    oyunEl.gorevMetin.textContent = gorev.metin;
    oyunEl.gorev.classList.toggle('tamam', gorevBugunTamam);
    oyunEl.gorevOdul.textContent = gorevBugunTamam ? 'Tamamlandı' : '+20 puan';
  }

  function meydanCek(): void {
    if (durum !== 'secili' || !meydanlar.length) return;
    sesiHazirla();
    meydan = meydanTekrar.sec(meydanlar, (m) => m.id) ?? null;
    if (!meydan) return;
    oyunEl.meydanMetin.textContent = meydan.metin;
    oyunEl.meydan.classList.remove('belirdi');
    void oyunEl.meydan.offsetWidth;
    oyunEl.meydan.classList.add('belirdi');
    ses.kartCek();
    durumaGec('secili');
    duyur(`Meydan okuma: ${meydan.metin}`);
  }

  function meydanBirak(sessiz = false): void {
    meydan = null;
    oyunEl.meydan.hidden = true;
    if (!sessiz && durum === 'secili') durumaGec('secili');
  }

  function kartBelirsin(): void {
    const k = $('[data-kart]', kok);
    k.classList.remove('belirdi');
    void k.offsetWidth;
    k.classList.add('belirdi');
  }

  // ---------- Grup oyunu ----------
  function grupKurGoster(ac: boolean): void {
    oyunEl.grupKur.hidden = !ac;
    oyunEl.grupGiris.hidden = ac;
    if (ac) {
      oyuncuListesiCiz();
      oyunEl.oyuncuAdi.focus();
    }
  }

  function oyuncuEkle(): void {
    const ad = oyunEl.oyuncuAdi.value.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!ad || taslakOyuncular.length >= 8) return;
    if (taslakOyuncular.some((x) => x.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) {
      duyur(`${ad} zaten listede.`);
      return;
    }
    taslakOyuncular.push(ad);
    oyunEl.oyuncuAdi.value = '';
    oyuncuListesiCiz();
    oyunEl.oyuncuAdi.focus();
  }

  function oyuncuListesiCiz(): void {
    oyunEl.oyuncular.replaceChildren(
      ...taslakOyuncular.map((ad, i) => {
        const li = el('li');
        const sil = el('button', { type: 'button', class: 'oyuncu-sil', 'aria-label': `${ad} adlı oyuncuyu çıkar` }, '×');
        sil.addEventListener('click', () => {
          taslakOyuncular.splice(i, 1);
          oyuncuListesiCiz();
          oyunEl.oyuncuAdi.focus();
        });
        li.append(el('span', {}, ad), sil);
        return li;
      }),
    );
    oyunEl.grupBasla.disabled = taslakOyuncular.length < 2;
    oyunEl.oyuncuAdi.disabled = taslakOyuncular.length >= 8;
  }

  function grupBaslat(): void {
    if (taslakOyuncular.length < 2) return;
    sesiHazirla();
    grup = { oyuncular: taslakOyuncular.map((ad) => ({ ad, puan: 0, pas: PAS_HAKKI, tur: 0 })), sira: 0 };
    grupKurGoster(false);
    turuTemizle();
    durumaGec('bos');
    grupCiz();
    ses.basladi();
    duyur(`Grup oyunu başladı. Sıra ${grup.oyuncular[0].ad} adlı oyuncuda.`);
  }

  function grupCiz(): void {
    oyunEl.grupSeridi.hidden = !grup;
    oyunEl.grupGiris.hidden = !!grup || !oyunEl.grupKur.hidden;
    karneGuncelle();
    gorevGuncelle();
    if (!grup) {
      oyunEl.bosBaslik.textContent = 'Hazırsan çevir.';
      return;
    }
    const g = grup;
    const siradaki = g.oyuncular[g.sira];
    oyunEl.siraAd.textContent = siradaki.ad;
    oyunEl.bosBaslik.textContent = `Sıra: ${siradaki.ad}`;
    oyunEl.skor.replaceChildren(
      ...g.oyuncular.map((o, i) => {
        const li = el('li', i === g.sira ? { class: 'siradaki', 'aria-current': 'true' } : {});
        li.append(el('span', { class: 'skor-ad' }, o.ad), el('span', { class: 'skor-puan' }, String(o.puan)));
        return li;
      }),
    );
    pasGuncelle();
  }

  /** Grup turunda puan listesini alkışla birlikte anında yeniden çizer. */
  function alkisGuncelle(): void {
    for (const d of oyunEl.alkisDugmeler) d.setAttribute('aria-pressed', String(Number(d.dataset.alkisN) === alkisSecim));
    const t = sonTurSonucu();
    if (!grup || !t) return;
    puanAnimasyonu++;
    const kalemler = turPuani({ ...t, alkis: alkisSecim });
    oyunEl.puanKalemleri.replaceChildren(
      ...kalemler.map((k) => {
        const li = el('li');
        li.append(el('span', {}, k.ad), el('span', { class: 'puan-deger' }, `+${k.puan}`));
        return li;
      }),
    );
    oyunEl.puanToplam.textContent = String(toplamPuan(kalemler));
  }

  function sonTurSonucu(): TurSonucu | null {
    if (!sonTur) return null;
    return {
      mod: sonTur.mod,
      zorluk: sonTur.zorluk,
      alan: sonTur.alan,
      pasKullanildi: sonTur.pasKullanildi,
      konusmaMs: sonTur.konusmaMs,
      hedefMs: konusmaSuresi(),
      meydan: !!sonTur.meydan,
      gorevTamam: false,
    };
  }

  /** Bitmiş turun puanını (alkış dahil) sıradaki oyuncunun hanesine bir kez yazar. */
  function grupPuaniIsle(): void {
    if (!grup || grupPuaniIslendi) return;
    const t = sonTurSonucu();
    if (!t) return;
    const o = grup.oyuncular[grup.sira];
    o.puan += toplamPuan(turPuani({ ...t, alkis: alkisSecim }));
    o.tur++;
    grupPuaniIslendi = true;
  }

  /** Bitmiş bir grup turunun puanını işler ve sırayı bir sonraki oyuncuya geçirir. */
  function grupSirayiIlerlet(): void {
    if (!grup || grupPuaniIslendi) return;
    grupPuaniIsle();
    grup.sira = (grup.sira + 1) % grup.oyuncular.length;
    grupCiz();
    duyur(`Sıra ${grup.oyuncular[grup.sira].ad} adlı oyuncuda.`);
  }

  function grupBitir(): void {
    if (!grup) return;
    if (durum !== 'bos' && durum !== 'secili' && durum !== 'bitti') return;
    grupPuaniIsle();
    const g = grup;
    turuTemizle();
    const sirali = [...g.oyuncular].sort((a, b) => b.puan - a.puan || a.ad.localeCompare(b.ad, 'tr'));
    const enIyi = sirali[0].puan;
    const kazananlar = sirali.filter((o) => o.puan === enIyi);
    oyunEl.kazanan.textContent =
      enIyi === 0 ? 'Oyun bitti.' : kazananlar.length > 1 ? `Berabere: ${kazananlar.map((o) => o.ad).join(' ve ')}` : `Kazanan: ${kazananlar[0].ad}`;
    oyunEl.siralama.replaceChildren(
      ...sirali.map((o) => {
        const li = el('li', o.puan === enIyi && enIyi > 0 ? { class: 'birinci' } : {});
        li.append(el('span', { class: 'skor-ad' }, o.ad), el('span', { class: 'soluk kucuk' }, `${o.tur} tur`), el('span', { class: 'skor-puan' }, `${o.puan} puan`));
        return li;
      }),
    );
    oyunEl.grupSeridi.hidden = true;
    dilimiVurgula(null);
    durumaGec('grup-sonuc');
    ses.seviyeAtladi();
    yildizSerpintisi(sahne, 40, true);
    duyur(`${oyunEl.kazanan.textContent}. Sıralama: ${sirali.map((o) => `${o.ad} ${o.puan} puan`).join(', ')}.`);
    oyunEl.kazanan.focus();
  }

  function grupKapat(ayniEkip: boolean): void {
    const adlarListesi = grup?.oyuncular.map((o) => o.ad) ?? [];
    grup = null;
    if (ayniEkip && adlarListesi.length >= 2) {
      taslakOyuncular = adlarListesi;
      grupBaslat();
      return;
    }
    durumaGec('bos');
    grupCiz();
  }

  // ---------- Mod ----------
  function modDegistir(yeni: Mod, odakla = false): void {
    if (donuyor) return;
    if (durum === 'bitti') grupSirayiIlerlet();
    turuTemizle();
    mod = yeni;
    ayarlar = ayarYaz('mod', yeni);
    for (const s of sekmeler) {
      const secili = s.dataset.mod === yeni;
      s.setAttribute('aria-selected', String(secili));
      s.tabIndex = secili ? 0 : -1;
      if (secili) {
        panel.setAttribute('aria-labelledby', s.id);
        if (odakla) s.focus();
      }
    }
    for (const f of $$<HTMLFieldSetElement>('[data-ayar-mod]', kok)) f.hidden = f.dataset.ayarMod !== yeni;
    const metin = $('[data-bos-metin]', kok);
    metin.textContent =
      yeni === 'arastirma'
        ? 'Çark bir alan seçer, o alandan bilmediğin bir konu gelir. Süre boyunca araştır, sonra notlarını kapatıp konuyu kendi sözlerinle anlat.'
        : yeni === 'dogaclama'
          ? 'Tanıdık bir soru gelir, hazırlanmadan konuşursun. Tanımla, kendi hayatından örnekle, genel bir sonuca bağla.'
          : 'Bir atasözü ya da deyim gelir. Anlamını kendin çıkar, günlük hayattan bir örnek ver, bugün hâlâ geçerli mi tartış.';
    filtreyiKur();
    carkiKur();
    aciAyarla(0, 0);
    durumaGec('bos');
    hataGoster(null);
  }

  // ---------- Ayarlar ----------
  for (const s of $$<HTMLSelectElement>('[data-ayar]', kok)) {
    const k = s.dataset.ayar as keyof Ayarlar;
    s.value = String(ayarlar[k]);
    if (s.selectedIndex < 0) s.selectedIndex = 0;
    s.addEventListener('change', () => {
      ayarlar = ayarYaz(k, Number(s.value) as never);
    });
  }

  // ---------- Tam ekran ----------
  function tamEkranMi(): boolean {
    return document.fullscreenElement === sahne || sahne.classList.contains('odak-modu');
  }
  function tamEkran(ac = !tamEkranMi()): void {
    if (ac) {
      if (sahne.requestFullscreen && document.fullscreenEnabled) void sahne.requestFullscreen().catch(() => sahne.classList.add('odak-modu'));
      else sahne.classList.add('odak-modu');
    } else {
      if (document.fullscreenElement) void document.exitFullscreen();
      sahne.classList.remove('odak-modu');
    }
  }
  document.addEventListener('fullscreenchange', () => {
    $('[data-tamekran]', kok).textContent = document.fullscreenElement ? 'Tam ekrandan çık' : 'Tam ekran';
  });

  // ---------- Günün konusu ----------
  async function gununKonusu(): Promise<ArastirmaKonusu | undefined> {
    const d = [...(await veri.dizin())].sort((a, b) => a[0].localeCompare(b[0]));
    const satir = d[gununIndeksi(yerelGun(), d.length)];
    return veri.konuGetir(satir[1]);
  }

  async function konuyuAc(konu: ArastirmaKonusu): Promise<void> {
    if (mod !== 'arastirma') modDegistir('arastirma');
    else turuTemizle();
    const i = dilimSetleri.arastirma.findIndex((d) => d.id === konu.alan);
    tekrar.arastirma.ekle(konu.id);
    await dondur(i, false);
    secim = { mod: 'arastirma', konu };
    durumaGec('secili');
    duyur(`Seçilen konu: ${konu.baslik}`);
  }

  let onYukleme = false;
  function onYukle(): void {
    if (onYukleme) return;
    onYukleme = true;
    void gununKonusu()
      .then((k) => {
        if (k) gununD.textContent = k.baslik;
      })
      .catch(() => {
        onYukleme = false;
      });
  }
  for (const olay of ['pointerdown', 'keydown', 'focusin', 'touchstart'] as const) {
    kok.addEventListener(olay, onYukle, { once: true, passive: true });
  }

  // ---------- Olaylar ----------
  cevirD.addEventListener('click', () => void cevir());
  pasD.addEventListener('click', pas);
  $('[data-basla]', kok).addEventListener('click', turaBasla);
  duraklatD.addEventListener('click', duraklatDevam);
  $('[data-sifirla]', kok).addEventListener('click', sifirla);
  $('[data-erken]', kok).addEventListener('click', () => fazBitti(false));
  $('[data-tamekran]', kok).addEventListener('click', () => tamEkran());
  $('[data-anlat]', kok).addEventListener('click', () => fazBaslat('konusma', konusmaSuresi()));
  $('[data-yeni]', kok).addEventListener('click', () => void cevir());
  oyunEl.meydanCek.addEventListener('click', meydanCek);
  oyunEl.meydanBirak.addEventListener('click', () => meydanBirak());
  $('[data-grup-ac]', kok).addEventListener('click', () => grupKurGoster(true));
  $('[data-grup-vazgec]', kok).addEventListener('click', () => grupKurGoster(false));
  $('[data-oyuncu-ekle]', kok).addEventListener('click', oyuncuEkle);
  oyunEl.oyuncuAdi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      oyuncuEkle();
    }
  });
  oyunEl.grupBasla.addEventListener('click', grupBaslat);
  oyunEl.grupBitir.addEventListener('click', grupBitir);
  $('[data-grup-tekrar]', kok).addEventListener('click', () => grupKapat(true));
  $('[data-grup-kapat]', kok).addEventListener('click', () => grupKapat(false));
  for (const d of oyunEl.alkisDugmeler) {
    d.addEventListener('click', () => {
      const n = Number(d.dataset.alkisN);
      alkisSecim = alkisSecim === n ? 0 : n;
      alkisGuncelle();
      sesiHazirla();
      if (alkisSecim) ses.alkis(alkisSecim);
    });
  }
  kaydetD.addEventListener('click', () => void kayitDegistir());
  gununD.addEventListener('click', async () => {
    if (donuyor || (durum !== 'bos' && durum !== 'secili' && durum !== 'bitti')) return;
    try {
      const k = await gununKonusu();
      if (k) await konuyuAc(k);
    } catch {
      hataGoster('Günün konusu yüklenemedi. Bağlantını kontrol et.');
    }
  });
  bitti.anlamD.addEventListener('click', () => {
    const ac = bitti.anlam.hidden;
    bitti.anlam.hidden = !ac;
    bitti.anlamD.setAttribute('aria-expanded', String(ac));
    bitti.anlamD.textContent = ac ? 'Anlamı gizle' : 'Anlamı göster';
  });
  $('[data-izin-evet]', kok).addEventListener('click', () => {
    ilerlemeIzniYaz(true);
    bitti.izin.hidden = true;
    if (sonTur) {
      const once = ozetOku().xp;
      ilerlemeyiKaydet(sonTur);
      oyunEl.seviyeNot.hidden = true;
      seviyeGoster(once, ozetOku().xp, !hareketAz.matches);
    }
    gorevBugunTamam = gorevBugunTamam || ozetOku().gorevGunleri.includes(yerelGun());
    karneGuncelle();
    duyur('İlerlemen bu cihazda tutulacak.');
  });
  $('[data-izin-hayir]', kok).addEventListener('click', () => {
    ilerlemeIzniYaz(false);
    bitti.izin.hidden = true;
    karneGuncelle();
    duyur('İlerlemen tutulmayacak. Ayarlardan değiştirebilirsin.');
  });
  $('[data-paylas]', kok).addEventListener('click', async () => {
    if (!secim) return;
    const s = secim;
    const ust = s.mod === 'arastirma' ? adlar[s.konu.alan] : s.mod === 'dogaclama' ? adlar[s.soru.kategori] : s.soz.tur === 'deyim' ? 'Deyim' : 'Atasözü';
    try {
      const blob = await kartCiz({ baslik: secimBasligi(s), ust: ust ?? '', mod: `${MOD_ADI[s.mod]} · konuşma süresi`, sure: sureOkunur(konusmaMs), site: siteHost });
      const sonuc = await paylasVeyaIndir(blob, `konucarki-${dosyaSlug(s)}.png`);
      if (sonuc !== 'iptal') {
        bitti.paylasNot.textContent = sonuc === 'paylasildi' ? 'Kart paylaşıldı.' : 'Kart indirildi. Kart bu cihazda üretildi, hiçbir yere yüklenmedi.';
        bitti.paylasNot.hidden = false;
      }
    } catch {
      bitti.paylasNot.textContent = 'Kart üretilemedi. Tarayıcın Canvas desteklemiyor olabilir.';
      bitti.paylasNot.hidden = false;
    }
  });

  // Sekmeler: ok tuşlarıyla gezinme
  sekmeler.forEach((s, i) => {
    s.addEventListener('click', () => {
      if (s.getAttribute('aria-disabled') === 'true') return;
      if (s.dataset.mod !== mod) modDegistir(s.dataset.mod as Mod);
    });
    s.addEventListener('keydown', (e) => {
      const n = sekmeler.length;
      const hedef = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (hedef < 0) return;
      e.preventDefault();
      if (s.getAttribute('aria-disabled') === 'true') {
        sekmeler[hedef].focus();
        return;
      }
      modDegistir(sekmeler[hedef].dataset.mod as Mod, true);
    });
  });

  // Klavye kısayolları
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const h = e.target as HTMLElement;
    if (h.closest('input, select, textarea, [contenteditable="true"]')) return;
    const etkilesimli = !!h.closest('button, a, audio, [role="tab"], summary');
    if (e.key === ' ' || e.code === 'Space') {
      if (etkilesimli) return; // odaktaki düğme kendi işini yapsın
      e.preventDefault();
      if (durum === 'grup-sonuc') return;
      if (durum === 'bos' || durum === 'bitti') void cevir();
      else if (durum === 'secili') turaBasla();
      else if (durum === 'notlari-kapat') fazBaslat('konusma', konusmaSuresi());
      else duraklatDevam();
    } else if (e.key === 'p' || e.key === 'P') {
      pas();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      tamEkran();
    } else if (e.key === 'Escape' && sahne.classList.contains('odak-modu')) {
      tamEkran(false);
    }
  });

  // Sayfadan çıkınca mikrofon ve blob URL'ler bırakılır.
  window.addEventListener('pagehide', () => {
    kaydedici.temizle();
    void ekranAcikKalsin(false);
  });

  for (const c of $$<HTMLInputElement>('.degerlendir input', kok)) {
    c.addEventListener('change', () => {
      sesiHazirla();
      ses.isaret(c.checked);
    });
  }

  // Ses aç/kapat (ayar kalıcı: zorunlu işlevsel tercih)
  const sesD = $<HTMLButtonElement>('[data-ses-dugme]', kok);
  function sesDurumu(): void {
    ses.sesAcik(ayarlar.ses);
    sesD.setAttribute('aria-pressed', String(!ayarlar.ses));
    sesD.setAttribute('aria-label', ayarlar.ses ? 'Sesleri kapat' : 'Sesleri aç');
    sesD.title = ayarlar.ses ? 'Sesleri kapat' : 'Sesleri aç';
  }
  sesD.addEventListener('click', () => {
    ayarlar = ayarYaz('ses', !ayarlar.ses);
    sesDurumu();
    if (ayarlar.ses) {
      sesiHazirla();
      ses.isaret(true);
    }
  });
  sesDurumu();

  // ---------- İlk kurulum ----------
  karneGuncelle();
  gorevGuncelle();
  if (!kayitDestekleniyor()) {
    kaydetD.hidden = true;
    $('[data-kayit-not]', kok).hidden = true;
    $('[data-kayit-yok]', kok).hidden = false;
  }

  const q = new URLSearchParams(location.search);
  const istenenMod = q.get('mod');
  const baslangicModu: Mod = q.get('konu') ? 'arastirma' : istenenMod === 'dogaclama' || istenenMod === 'atasozu' ? istenenMod : mod === 'arastirma' || mod === 'dogaclama' || mod === 'atasozu' ? mod : 'arastirma';
  modDegistir(baslangicModu);

  const slug = q.get('konu');
  if (slug) {
    onYukle();
    veri
      .konuGetir(slug)
      .then((k) => {
        if (k) return konuyuAc(k);
        hataGoster('Bu bağlantıdaki konu bulunamadı. Çarkı çevirip yeni bir konu seçebilirsin.');
      })
      .catch(() => hataGoster('Konu yüklenemedi. Bağlantını kontrol edip yeniden dene.'));
  }
  kok.classList.add('hazir');
}
