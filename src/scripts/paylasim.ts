// Paylaşım kartı: cihazda Canvas ile 1080×1350 PNG. Kişisel veri yok, sunucu yok.

export type KartBilgisi = { baslik: string; mod: string; ust: string; sure: string; site: string };

const G = 1080;
const Y = 1350;

function renkler() {
  // Kart her temada aynı görünsün: açık tema paleti.
  return { zemin: '#F7F9FC', murekkep: '#16213A', kobalt: '#1D3F8F', firuze: '#1E9E97', sis: '#DCE3EE', soluk: '#505D78' };
}

function yildiz(c: CanvasRenderingContext2D, x: number, y: number, r: number, renk: string, delik: string) {
  c.save();
  c.translate(x, y);
  c.fillStyle = renk;
  for (const a of [0, Math.PI / 4]) {
    c.save();
    c.rotate(a);
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
  }
  c.fillStyle = delik;
  c.beginPath();
  c.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function satirlaraBol(c: CanvasRenderingContext2D, metin: string, genislik: number): string[] {
  const kelimeler = metin.split(/\s+/);
  const satirlar: string[] = [];
  let s = '';
  for (const k of kelimeler) {
    const aday = s ? `${s} ${k}` : k;
    if (c.measureText(aday).width > genislik && s) {
      satirlar.push(s);
      s = k;
    } else s = aday;
  }
  if (s) satirlar.push(s);
  return satirlar;
}

export async function kartCiz(b: KartBilgisi): Promise<Blob> {
  const cv = document.createElement('canvas');
  cv.width = G;
  cv.height = Y;
  const c = cv.getContext('2d')!;
  const r = renkler();
  try {
    await Promise.all([
      document.fonts.load("700 96px 'Bricolage Grotesque'", 'ÇĞİÖŞÜçğıöşü'),
      document.fonts.load("400 40px 'Source Sans 3'", 'ÇĞİÖŞÜçğıöşü'),
      document.fonts.load("600 40px 'Source Sans 3'", 'ÇĞİÖŞÜçğıöşü'),
    ]);
  } catch {
    /* sistem fontuyla devam */
  }

  c.fillStyle = r.zemin;
  c.fillRect(0, 0, G, Y);

  // Üstte çini şeridi: dönüşümlü yıldızlar.
  const serit = 150;
  c.fillStyle = r.kobalt;
  c.fillRect(0, 0, G, serit);
  for (let i = 0; i < 8; i++) {
    const x = 67.5 + i * 135;
    yildiz(c, x, serit / 2, 30, i % 2 ? r.firuze : '#2E56B0', r.kobalt);
  }

  const kenar = 96;
  let y = serit + 130;
  c.fillStyle = r.soluk;
  c.font = "600 40px 'Source Sans 3', sans-serif";
  c.fillText(b.ust, kenar, y);

  // Başlık: sığana kadar küçült.
  let boy = 112;
  let satirlar: string[] = [];
  do {
    c.font = `700 ${boy}px 'Bricolage Grotesque', sans-serif`;
    satirlar = satirlaraBol(c, b.baslik, G - 2 * kenar);
    boy -= 6;
  } while (satirlar.length * boy * 1.1 > 640 && boy > 48);
  boy += 6;
  y += 60;
  c.fillStyle = r.murekkep;
  for (const s of satirlar) {
    y += boy * 1.08;
    c.fillText(s, kenar, y);
  }

  // Alt bilgi
  const altY = Y - 250;
  c.strokeStyle = r.sis;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(kenar, altY);
  c.lineTo(G - kenar, altY);
  c.stroke();

  c.fillStyle = r.murekkep;
  c.font = "700 64px 'Bricolage Grotesque', sans-serif";
  c.fillText(b.sure, kenar, altY + 100);
  c.fillStyle = r.soluk;
  c.font = "400 38px 'Source Sans 3', sans-serif";
  c.fillText(b.mod, kenar, altY + 156);

  c.textAlign = 'right';
  c.fillStyle = r.kobalt;
  c.font = "700 44px 'Bricolage Grotesque', sans-serif";
  c.fillText('Konu Çarkı', G - kenar, altY + 100);
  c.fillStyle = r.soluk;
  c.font = "400 34px 'Source Sans 3', sans-serif";
  c.fillText(b.site, G - kenar, altY + 156);

  return new Promise((coz, reddet) => cv.toBlob((bl) => (bl ? coz(bl) : reddet(new Error('PNG üretilemedi'))), 'image/png'));
}

/** Web Share API dosya paylaşımını destekliyorsa paylaşır, yoksa indirir. */
export async function paylasVeyaIndir(blob: Blob, dosyaAdi: string): Promise<'paylasildi' | 'indirildi' | 'iptal'> {
  const dosya = new File([blob], dosyaAdi, { type: 'image/png' });
  if (navigator.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], title: 'Konu Çarkı' });
      return 'paylasildi';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'iptal';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'indirildi';
}
