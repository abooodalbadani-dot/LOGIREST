import arabicReshaper from 'arabic-persian-reshaper';

/**
 * Pure TypeScript Arabic Reshaper & Bidi Layout Engine
 * Shapes isolated Arabic characters into connected cursive glyph presentation forms
 * and reorders bidirectional segments for RTL drawing.
 */
export function reshapeArabicText(text: string): string {
  if (!text) return '';

  // Return as-is if the text contains no Arabic characters
  const hasArabic = /[\u0600-\u06FF\uFE70-\uFEFC]/.test(text);
  if (!hasArabic) return text;

  // 1. Contextual shaping using professional library
  const shaped = arabicReshaper.ArabicShaper.convertArabic(text);

  // 2. Bidirectional Reordering (Reversing Arabic segments character-by-character, keeping LTR segments intact)
  const regex = /([\u0600-\u06FF\uFE70-\uFEFC\s]+)/g;
  const parts = shaped.split(regex);

  const reorderedParts = parts.map(part => {
    if (/[\u0600-\u06FF\uFE70-\uFEFC]/.test(part)) {
      return part.split('').reverse().join('');
    }
    return part;
  });

  const reordered = reorderedParts.reverse().join('');

  // 3. ZWNJ Fix to prevent incorrect Lam-Alef ligatures from reversal
  const lamPattern = /([\uFEDD-\uFEE0])([\uFE8D\uFE8E\uFE81\uFE82\uFE83\uFE84\uFE87\uFE88])/g;
  return reordered.replace(lamPattern, '$1\u200C$2');
}
