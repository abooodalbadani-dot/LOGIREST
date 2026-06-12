const CAIRO_FONT_URL = 'https://fonts.gstatic.com/s/cairo/v28/SLXJ1O5wjUoOfzSSDFc.ttf';
const LOCAL_STORAGE_KEY = 'logirest_cairo_font_base64';

/**
 * Retrieves the base64 encoded Cairo-Regular TTF font.
 * First checks localStorage. If not found, fetches from Google Fonts CDN,
 * converts to base64, stores in localStorage, and returns it.
 */
export async function getCairoFontBase64(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(CAIRO_FONT_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Cairo font: ${response.statusText}`);
    }

    const blob = await response.blob();
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // The result will be in the format: data:application/x-font-ttf;base64,AAAA...
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, base64Content);
    } catch (storageError) {
      // localStorage quota might be exceeded, but we can still return the font
      console.warn('Failed to cache Cairo font in localStorage', storageError);
    }

    return base64Content;
  } catch (error) {
    console.error('Error fetching or loading Cairo font', error);
    return null;
  }
}
