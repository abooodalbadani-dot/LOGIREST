import { AMIRI_REGULAR_BASE64, AMIRI_BOLD_BASE64 } from './arabicFontsBase64';

/**
 * Retrieves the base64 encoded Amiri-Regular TTF font.
 * Returns the bundled font directly for reliability.
 */
export async function getArabicFontBase64(): Promise<string | null> {
  return AMIRI_REGULAR_BASE64;
}

/**
 * Retrieves the base64 encoded Amiri-Bold TTF font.
 * Returns the bundled font directly for reliability.
 */
export async function getArabicBoldFontBase64(): Promise<string | null> {
  return AMIRI_BOLD_BASE64;
}
