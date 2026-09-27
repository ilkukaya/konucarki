import {
  ayarlariOku,
  ayarYaz,
  gecmisOku,
  gecmisYaz,
  ilerlemeIzni,
  ilerlemeIzniYaz,
  kazanilanRozetler,
  ozetOku,
  tumunuSil,
  type Ayarlar,
} from '../lib/depo.ts';
import { ROZETLER, seriHesapla, type RozetId } from '../lib/ilerleme.ts';
import { seviye } from '../lib/oyun.ts';
import { yerelGun } from '../lib/tarih.ts';
import { rozetSvg } from './rozet-svg.ts';
import { temaUygula } from './tema.ts';

const MOD: Record<string, string> = { arastirma: 'Araştırma', dogaclama: 'Doğaçlama', atasozu: 'Atasözü' };

export function ayarlariSayfasi(): void {
  const kok = document.querySelector<HTMLElement>('[data-ayarlar-sayfasi]');
  if (!kok) return;
  const q = <T extends Element = HTMLElement>(s: string) => kok.querySelector<T>(s)!;

  const temaRadyolari = [...kok.querySelectorAll<HTMLInputElement>('input[name="tema"]')];
  const sesK = q<HTMLInputElement>('[data-ses]');
  const izinK = q<HTMLInputElement>('[data-izin]');
  const icerik = q('[data-ilerleme-icerik]');
  const durum = q('[data-sil-durum]');

  function yenile(): void {
    const a = ayarlariOku();
    for (const r of temaRadyolari) r.checked = r.value === a.tema;
    sesK.checked = a.ses;
    const izin = ilerlemeIzni() === true;
    izinK.checked = izin;
    icerik.hidden = !izin;
    if (!izin) return;

    const ozet = ozetOku();
    const seri = seriHesapla(ozet.gunler, yerelGun());
    const sv = seviye(ozet.xp);
    q('[data-seri]').textContent =
      ozet.toplamTur === 0
        ? 'Henüz tur yok.'
        : `Seviye ${sv.sira} · ${sv.ad} · ${ozet.xp} puan · ${ozet.toplamTur} tur · güncel seri ${seri.guncel} gün · en uzun seri ${seri.enUzun} gün`;

    const kazanilan = new Set(kazanilanRozetler() as RozetId[]);
    q('[data-rozetler]').replaceChildren(
      ...ROZETLER.map((r) => {
        const li = document.createElement('li');
        const var_ = kazanilan.has(r.id);
        const p = document.createElement('p');
        const b = document.createElement('strong');
        b.textContent = r.ad;
        const s = document.createElement('span');
        s.className = 'soluk';
        s.textContent = ` ${r.aciklama}${var_ ? '' : ' (henüz yok)'}`;
        p.append(b, s);
        li.append(rozetSvg(r.id, var_), p);
        return li;
      }),
    );

    const gecmis = gecmisOku().slice().reverse();
    q('[data-gecmis-bos]').hidden = gecmis.length > 0;
    q('[data-gecmis-sil]').hidden = gecmis.length === 0;
    q('[data-gecmis]').replaceChildren(
      ...gecmis.map((t) => {
        const li = document.createElement('li');
        const baslik = document.createElement('span');
        baslik.className = 'g-baslik';
        baslik.textContent = t.baslik;
        const bilgi = document.createElement('span');
        bilgi.className = 'soluk kucuk';
        bilgi.textContent = `${MOD[t.mod] ?? t.mod} · ${new Date(t.zaman).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}${t.puan ? ` · +${t.puan} puan` : ''}`;
        const sil = document.createElement('button');
        sil.type = 'button';
        sil.className = 'dugme sade';
        sil.textContent = 'Sil';
        sil.setAttribute('aria-label', `${t.baslik} turunu sil`);
        sil.addEventListener('click', () => {
          gecmisYaz(gecmisOku().filter((x) => x.zaman !== t.zaman));
          yenile();
          durum.textContent = 'Tur silindi.';
        });
        const metin = document.createElement('div');
        metin.append(baslik, bilgi);
        li.append(metin, sil);
        return li;
      }),
    );
  }

  for (const r of temaRadyolari)
    r.addEventListener('change', () => {
      const t = r.value as Ayarlar['tema'];
      ayarYaz('tema', t);
      temaUygula(t);
    });
  sesK.addEventListener('change', () => ayarYaz('ses', sesK.checked));
  izinK.addEventListener('change', () => {
    ilerlemeIzniYaz(izinK.checked);
    durum.textContent = izinK.checked ? 'İlerlemen bu cihazda tutulacak.' : 'İlerleme bilgilerin silindi ve artık tutulmayacak.';
    yenile();
  });
  q('[data-gecmis-sil]').addEventListener('click', () => {
    gecmisYaz([]);
    yenile();
    durum.textContent = 'Geçmiş silindi.';
  });
  q('[data-hepsini-sil]').addEventListener('click', () => {
    if (!window.confirm('Bu cihazdaki tüm Konu Çarkı verileri silinsin mi? Bu işlem geri alınamaz.')) return;
    const n = tumunuSil();
    temaUygula('sistem');
    yenile();
    durum.textContent = n ? `${n} kayıt silindi. Bu tarayıcıda Konu Çarkı'na ait veri kalmadı.` : 'Silinecek veri yoktu.';
  });

  yenile();
}
