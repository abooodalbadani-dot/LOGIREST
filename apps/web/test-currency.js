const locale = 'ar';
const formatterLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
const formatted = new Intl.NumberFormat(formatterLocale, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
}).format(0);

console.log('Formatted:', formatted);
console.log('Chars:', [...formatted].map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`));
