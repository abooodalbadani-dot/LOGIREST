/**
 * Pure TypeScript Arabic Reshaper & Bidi Layout Engine
 * Shapes isolated Arabic characters into connected cursive glyph presentation forms
 * and reorders bidirectional segments for RTL drawing.
 */

const arabicGlyphs: Record<string, string[]> = {
  // [Isolated, End, Beginning, Medial]
  '\u0621': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'], // Hamza
  '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // Alef Madda
  '\u0623': ['\uFE83', '\uFE84', '\uFE83', '\uFE84'], // Alef Hamza Above
  '\u0624': ['\uFE85', '\uFE86', '\uFE85', '\uFE86'], // Waw Hamza Above
  '\u0625': ['\uFE87', '\uFE88', '\uFE87', '\uFE88'], // Alef Hamza Below
  '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'], // Yeh Hamza Above
  '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // Alef
  '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // Beh
  '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // Teh Marbuta
  '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // Teh
  '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // Theh
  '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // Jeem
  '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // Hah
  '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // Khah
  '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // Dal
  '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'], // Thal
  '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // Reh
  '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'], // Zain
  '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // Seen
  '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // Sheen
  '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // Sad
  '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // Dad
  '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // Tah
  '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // Zah
  '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // Ain
  '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // Ghain
  '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // Feh
  '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // Qaf
  '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // Kaf
  '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // Lam
  '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // Meem
  '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon
  '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // Heh
  '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEEE'], // Waw
  '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'], // Alef Maksura
  '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // Yeh

  // Ligatures Lam-Alef
  '\uFEF5': ['\uFEF5', '\uFEF6', '\uFEF5', '\uFEF6'], // Lam-Alef Madda
  '\uFEF7': ['\uFEF7', '\uFEF8', '\uFEF7', '\uFEF8'], // Lam-Alef Hamza Above
  '\uFEF9': ['\uFEF9', '\uFEFA', '\uFEF9', '\uFEFA'], // Lam-Alef Hamza Below
  '\uFEFB': ['\uFEFB', '\uFEFC', '\uFEFB', '\uFEFC'], // Lam-Alef Plain
};

const nonLeftConnecting = new Set([
  '\u0621', '\u0622', '\u0623', '\u0624', '\u0625', '\u0627', '\u062F', '\u0630', 
  '\u0631', '\u0632', '\u0648', '\u0649', '\u0629', '\uFEF5', '\uFEF7', '\uFEF9', '\uFEFB'
]);

function connectsLeft(char: string): boolean {
  return arabicGlyphs[char] !== undefined && !nonLeftConnecting.has(char);
}

function connectsRight(char: string): boolean {
  return arabicGlyphs[char] !== undefined && char !== '\u0621';
}

function combineLamAlef(text: string): string {
  return text
    .replace(/\u0644\u0622/g, '\uFEF5') // Lam + Alef Madda
    .replace(/\u0644\u0623/g, '\uFEF7') // Lam + Alef Hamza Above
    .replace(/\u0644\u0625/g, '\uFEF9') // Lam + Alef Hamza Below
    .replace(/\u0644\u0627/g, '\uFEFB'); // Lam + Alef Plain
}

export function reshapeArabicText(text: string): string {
  if (!text) return '';

  // Return as-is if the text contains no Arabic characters
  const hasArabic = /[\u0600-\u06FF\uFE70-\uFEFC]/.test(text);
  if (!hasArabic) return text;

  // 1. Combine Lam-Alef ligatures
  const combined = combineLamAlef(text);

  // 2. Contextual shaping
  let shaped = '';
  for (let i = 0; i < combined.length; i++) {
    const char = combined[i];
    if (arabicGlyphs[char]) {
      const connectPrev = i > 0 && connectsLeft(combined[i - 1]) && connectsRight(char);
      const connectNext = i < combined.length - 1 && connectsRight(combined[i + 1]) && connectsLeft(char);

      let formIndex = 0;
      if (connectPrev && connectNext) formIndex = 3;
      else if (connectPrev) formIndex = 1;
      else if (connectNext) formIndex = 2;

      shaped += arabicGlyphs[char][formIndex];
    } else {
      shaped += char;
    }
  }

  // 3. Bidirectional Reordering (Reversing Arabic segments character-by-character, keeping LTR segments intact)
  const regex = /([\u0600-\u06FF\uFE70-\uFEFC\s]+)/g;
  const parts = shaped.split(regex);

  const reorderedParts = parts.map(part => {
    if (/[\u0600-\u06FF\uFE70-\uFEFC]/.test(part)) {
      return part.split('').reverse().join('');
    }
    return part;
  });

  return reorderedParts.reverse().join('');
}
