import { MsgReader, zipSync } from './vendor.js';

// --- MSG → ZIP dönüştürme (app.py'deki mantığın tarayıcı karşılığı) ---

// Windows "Tümünü ayıkla" 260 karakter yol sınırına takılmasın diye isimler kısaltılır:
// ...\Downloads\<zip adı>\<dosya adı> toplamı sınırın altında kalmalı
export const ZIP_NAME_MAX = 50;
const FILE_NAME_MAX = 80;

// Yüklenen sistem Türkçe karakter ve bazı sembolleri dosya adında kabul etmiyor
const TR_MAP = { ı: 'i', İ: 'I', ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C', ş: 's', Ş: 'S' };
const FORBIDDEN = /[!+=*%&';:?{}^$#<>\[\]~@|"/\\\x00-\x1f]/g;

/** Python'daki Path(name).suffix ile aynı: son noktadan sonrası (baştaki nokta sayılmaz). */
function splitExt(name) {
  const i = name.lastIndexOf('.');
  if (i <= 0 || i === name.length - 1) return [name, ''];
  return [name.slice(0, i), name.slice(i)];
}

/** Türkçe karakterleri ASCII'ye çevirir, yasaklı karakterleri temizler,
 *  uzantıyı koruyarak kısaltır. */
export function safeName(name, fallback, maxLen = FILE_NAME_MAX) {
  name = (name || '').replace(/[ıİğĞüÜöÖçÇşŞ]/g, c => TR_MAP[c]);
  name = name.normalize('NFKD').replace(/[^\x00-\x7f]/g, '');
  name = name.replace(FORBIDDEN, '_');
  name = name.replace(/_{2,}/g, '_');
  name = name.replace(/\s+/g, ' ').replace(/^[ ._]+|[ ._]+$/g, '');
  if (!name) return fallback;
  let [stem, suffix] = splitExt(name);
  if (suffix.length > 10) {
    suffix = '';
    stem = name;
  }
  stem = stem.slice(0, maxLen - suffix.length).replace(/[ ._-]+$/, '');
  return stem ? stem + suffix : fallback;
}

/** Aynı isimde ek varsa sonuna (2), (3)... ekler. */
function unique(name, used) {
  const [stem, suffix] = splitExt(name);
  let candidate = name;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) {
    candidate = `${stem} (${n})${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/** MSG dosyasını ve eklerini ZIP'e paketler. { zipBytes, zipName, subject } döndürür. */
export function msgToZip(msgBytes, originalName, customZipName = '') {
  let mailName = safeName(originalName, 'mail.msg');
  if (!mailName.toLowerCase().endsWith('.msg')) mailName += '.msg';

  const reader = new MsgReader(msgBytes);
  const info = reader.getFileData();
  if (info.error) throw new Error(info.error);

  const files = { [mailName]: msgBytes };
  const used = new Set([mailName.toLowerCase()]);

  (info.attachments || []).forEach((att, idx) => {
    let name = safeName(att.fileName || att.fileNameShort, `ek${idx + 1}.bin`);
    // Mail içine gömülü başka bir mail (.msg): kütüphane onu ayrı bir .msg olarak yeniden oluşturur.
    // Adı mailin konusundan gelir; ASCII'ye çevrilince anlamsız kalırsa ekN.msg kullanılır.
    if (att.innerMsgContent) {
      const base = safeName((att.name || '').replace(/\.msg$/i, ''), '', FILE_NAME_MAX - 4);
      name = (/[A-Za-z0-9]/.test(base) ? base : `ek${idx + 1}`) + '.msg';
    }
    const data = reader.getAttachment(att).content;
    if (!data || !data.length) return;
    files[unique(name, used)] = new Uint8Array(data);
  });

  const custom = customZipName.trim().replace(/\.zip$/i, '');
  const defaultName = safeName(splitExt(mailName)[0], 'mail', ZIP_NAME_MAX) + '.zip';
  const customName = custom ? safeName(custom, '', ZIP_NAME_MAX) : '';
  const zipName = customName ? customName + '.zip' : defaultName;

  const zipBytes = zipSync(files, { level: 6 });
  return { zipBytes, zipName, subject: info.subject || '' };
}
