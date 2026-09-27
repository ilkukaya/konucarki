// Ses kaydı YALNIZCA cihazda. Blob hiçbir koşulda ağa gönderilmez.
// Mikrofon izni yalnızca kullanıcı "Kaydet"e bastığında istenir; kayıt bitince track'ler durdurulur.

export type KayitSonucu = { url: string; uzanti: string; mime: string };

const TURLER = ['audio/webm;codecs=opus', 'audio/mp4'];

export function kayitDestekleniyor(): boolean {
  return typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function uygunTur(): string | undefined {
  return TURLER.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
}

export class Kaydedici {
  private akis: MediaStream | null = null;
  private kaydedici: MediaRecorder | null = null;
  private parcalar: Blob[] = [];
  private sinirZamanlayici: number | undefined;
  private sonUrl: string | null = null;
  private bitince: ((s: KayitSonucu | null) => void) | null = null;
  private oturum = 0; // temizle() sonrası eski kaydediciden gelen olayları yok saymak için

  get kaydediyor(): boolean {
    return this.kaydedici?.state === 'recording';
  }

  /** Mikrofon izni ister ve kaydı başlatır. İzin reddedilirse hata fırlatır. */
  async baslat(azamiMs: number, bitince: (s: KayitSonucu | null) => void): Promise<void> {
    this.temizle();
    const oturum = this.oturum;
    const akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (oturum !== this.oturum) {
      // İzin beklenirken tur değişti: mikrofonu hemen bırak.
      akis.getTracks().forEach((t) => t.stop());
      return;
    }
    this.akis = akis;
    this.bitince = bitince;
    const mime = uygunTur();
    this.kaydedici = mime ? new MediaRecorder(this.akis, { mimeType: mime }) : new MediaRecorder(this.akis);
    this.parcalar = [];
    this.kaydedici.addEventListener('dataavailable', (e) => {
      if (oturum === this.oturum && e.data.size) this.parcalar.push(e.data);
    });
    this.kaydedici.addEventListener('stop', () => {
      if (oturum === this.oturum) this.sonlandir();
    });
    this.kaydedici.start(1000);
    this.sinirZamanlayici = window.setTimeout(() => this.durdur(), azamiMs);
  }

  durdur(): void {
    window.clearTimeout(this.sinirZamanlayici);
    if (this.kaydedici && this.kaydedici.state !== 'inactive') this.kaydedici.stop();
    else this.mikrofonuKapat();
  }

  private sonlandir(): void {
    this.mikrofonuKapat();
    const mime = this.kaydedici?.mimeType || this.parcalar[0]?.type || 'audio/webm';
    const cb = this.bitince;
    this.bitince = null;
    this.kaydedici = null;
    if (!this.parcalar.length) {
      cb?.(null);
      return;
    }
    const blob = new Blob(this.parcalar, { type: mime });
    this.parcalar = [];
    this.sonUrl = URL.createObjectURL(blob);
    const uzanti = mime.includes('mp4') ? (/(iPhone|iPad|Macintosh)/.test(navigator.userAgent) ? 'm4a' : 'mp4') : 'webm';
    cb?.({ url: this.sonUrl, uzanti, mime });
  }

  private mikrofonuKapat(): void {
    this.akis?.getTracks().forEach((t) => t.stop());
    this.akis = null;
  }

  /** Kaydı durdurur, mikrofonu kapatır ve blob URL'yi bellekten siler. */
  temizle(): void {
    this.oturum++;
    window.clearTimeout(this.sinirZamanlayici);
    this.bitince = null;
    if (this.kaydedici && this.kaydedici.state !== 'inactive') {
      try {
        this.kaydedici.stop();
      } catch {
        /* yok */
      }
    }
    this.kaydedici = null;
    this.parcalar = [];
    this.mikrofonuKapat();
    if (this.sonUrl) {
      URL.revokeObjectURL(this.sonUrl);
      this.sonUrl = null;
    }
  }
}
