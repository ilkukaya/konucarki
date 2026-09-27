// Türkçe karakterleri ASCII karşılığına çevirip URL dostu slug üretir.
// Önce Türkçe dönüşüm yapılır; aksi halde "İ".toLowerCase() "i̇" (noktalı) üretir.
const TR: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
};

export function slugify(girdi: string): string {
  return girdi
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (c) => TR[c] ?? c)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Karşılaştırma için Türkçe duyarsız normalleştirme (yasaklı terim taraması).
export function katla(s: string): string {
  return slugify(s).replace(/-/g, ' ');
}
