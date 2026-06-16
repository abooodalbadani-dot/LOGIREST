/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // تفعيل الوضع المظلم عبر الكلاسات
  theme: {
    extend: {
      colors: {
        // ألوان هويتك الثابتة (للاستخدام المباشر إن لزم الأمر)
        brand: {
          gold: '#c4a276',
          'gold-hover': '#b09068',
          black: '#000000',
        },
        // الألوان الدلالية الذكية (تتغير تلقائياً حسب الوضع)
        background: 'var(--background)',
        card: 'var(--card-bg)',
        foreground: 'var(--text-main)',
        muted: 'var(--muted-bg)',
        border: 'var(--border-color)',

        // Backward compatibility mappings
        'brand-gold': '#c4a276',
        'brand-gold-hover': '#b09068',
        'brand-black': '#000000',
        'sidebar-dark': 'var(--background)',
        'card-dark': 'var(--card-bg)',
        'bg-light': 'var(--background)',
        'text-main': 'var(--text-main)',
      },
    },
  },
  plugins: [],
};

export default config;
