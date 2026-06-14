declare module 'arabic-persian-reshaper' {
  export interface Shaper {
    convertArabic(text: string): string;
    convertArabicBack(text: string): string;
  }
  const arabicReshaper: {
    PersianShaper: Shaper;
    ArabicShaper: Shaper;
  };
  export default arabicReshaper;
}
