import { Inter, Cairo } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const cairo = Cairo({ 
  subsets: ['arabic'], 
  weight: ['400', '500', '600', '700'], 
  variable: '--font-cairo', 
  display: 'swap' 
});
