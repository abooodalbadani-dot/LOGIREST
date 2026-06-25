declare module 'arabic-reshaper' {
  export function convertArabic(text: string): string;
  export function convertArabicBack(text: string): string;
}

declare module 'bidi-js' {
  export default function bidi(): {
    getEmbeddingLevels(text: string, dir: string): unknown;
    getReorderedString(text: string, levels: unknown): string;
  };
}
