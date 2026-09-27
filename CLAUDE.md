# Konu Çarkı — kalıcı kurallar

Türkçe, tamamen statik (Astro, `output: 'static'`) konuşma ve öğrenme pratiği sitesi. Aşağıdaki kurallar her özellikten önce gelir. Bir özellik bunlarla çelişiyorsa yapma, not bırak.

## Gizlilik, KVKK, güvenlik
- **Sıfır kişisel veri.** Üyelik, giriş, form, bülten, yorum, veritabanı, Netlify Functions/Edge/Forms/Identity/Analytics yok. İletişim yalnızca `mailto:`.
- **Sıfır üçüncü taraf kaynak.** Google Fonts, CDN, analitik, reklam, gömülü video, sosyal widget yok. Fontlar dahil her şey aynı origin'den.
- **Çerez yok.** Site hiç çerez yazmaz.
- **localStorage:** tüm anahtarlar `kc:v1:` önekli (`src/lib/depo.ts`). Ayarlar (süre, mod, ses, tema) izinsiz tutulabilir. İlerleme/seri/rozet/geçmiş **varsayılan kapalı**, yalnızca kullanıcı "Tut" derse. "Tüm verileri sil" `kc:` önekli her şeyi siler.
- **Oyunlaştırma:** puan/seviye/rozet/günün görevi `src/lib/oyun.ts` ve `ilerleme.ts` (saf, testli). Kalıcı puan yalnızca ilerleme izniyle; izin yoksa oturum puanı yalnızca bellekte. Grup modunda oyuncu isimleri ve puanları YALNIZCA bellekte, asla depolanmaz. Sesler Web Audio ile sentezlenir (`src/scripts/ses.ts`), dosya yok.
- **Ses kaydı yalnızca cihazda.** Blob asla ağa gitmez; `fetch`/XHR/`sendBeacon` ses verisiyle çağrılmaz. Mikrofon izni yalnızca "Kaydet"e basınca istenir; kayıt bitince track'ler durdurulur; blob URL'ler `revokeObjectURL` ile silinir.
- **Paylaşım kartı** Canvas ile cihazda üretilir.
- **CSP:** script için `unsafe-inline`/`unsafe-eval` yok. Inline `<script>` (ld+json hariç) ve `style=""` özniteliği yok; dinamik değerler `el.style.setProperty` ile. `scripts/check-dist.ts` build sonrası bunu denetler.
- Dış bağlantılar `target="_blank" rel="noopener noreferrer"`.
- **İçerik güvenliği:** parti siyaseti, siyasetçi/kamu figürü, devlet büyükleri ve tarihî lider değerlendirmesi, din/inanç, etnik köken/kimlik, terör, askerî konular, kumar/bahis, alkol/madde, cinsellik, intihar/kendine zarar, bireysel tıbbi/hukuki/finansal tavsiye YOK. Tarih = arkeoloji, bilim, teknoloji, gündelik yaşam. Sağlık yalnızca kavram düzeyi.
- Konu özetlerinde yaşayan kişi adı yok.

## Teknik
- Astro 7 + TypeScript strict, UI framework yok (vanilla TS, `src/scripts/`). Saf mantık `src/lib/` altında ve `tests/` ile vitest'te test edilir.
- Düz CSS, token'lar `src/styles/tokens.css`. Fontlar `@fontsource*` ile yerelden, yalnızca latin + latin-ext.
- Alan adı kodda sabit yazılmaz: `SITE_URL` env (varsayılan `https://konucarki.netlify.app`).
- Site sabitleri (e-posta, veri sorumlusu) yalnızca `src/config.ts` içinde.

## İçerik doğrulama
- `npm run validate` (build'den önce otomatik): id/slug benzersizliği, `ilgili` slug'larının varlığı, hedef sayılar (10 alan × 12 konu, 10 kategori × 20 soru, 60 atasözü), uzunluk sınırları (`baslik` ≤ 70, `ipucu` 120–400, araştırma sorusu ≤ 160, doğaçlama sorusu ≤ 140), slug kuralı (`a-z0-9-`, Türkçe dönüşüm `src/lib/slugify.ts`), yasaklı terimler (`scripts/banned-terms.txt`). Ayrıca `scripts/content-report.md` üretir.
- İpuçlarına tarih, sayı, istatistik gibi yanlış çıkma riski olan kesin bilgi yazılmaz.

## Komutlar
`npm run dev` · `npm run validate` · `npm run build` (validate + build + check-dist) · `npm test`
