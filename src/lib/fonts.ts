import { Inter, IBM_Plex_Sans_Arabic, Tajawal } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const ibmPlexArabic = IBM_Plex_Sans_Arabic({ 
  subsets: ['arabic'], 
  weight: ['400', '500', '600', '700'], 
  variable: '--font-arabic', 
  display: 'swap' 
});

export const tajawal = Tajawal({ 
  subsets: ['arabic'], 
  weight: ['400', '500', '700'], 
  variable: '--font-tajawal', 
  display: 'swap' 
});
