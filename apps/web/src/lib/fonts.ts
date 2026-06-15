import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';

export const ibmPlexSans = IBM_Plex_Sans({ 
 subsets: ['latin'], 
 weight: ['300', '400', '500', '600', '700'],
 variable: '--font-ibm-plex', 
 display: 'swap' 
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({ 
 subsets: ['arabic'], 
 weight: ['300', '400', '500', '600', '700'], 
 variable: '--font-ibm-plex-arabic', 
 display: 'swap' 
});

export const ibmPlexMono = IBM_Plex_Mono({
 subsets: ['latin'],
 weight: ['400', '500', '600', '700'],
 variable: '--font-ibm-plex-mono',
 display: 'swap'
});

export const beVietnamPro = Be_Vietnam_Pro({
 subsets: ['latin'],
 weight: ['300', '400', '500', '600', '700', '800', '900'],
 variable: '--font-be-vietnam-pro',
 display: 'swap'
});

