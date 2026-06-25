import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
 let locale = await requestLocale;
 
 if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
 locale = routing.defaultLocale;
 }

 return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError(error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== 'MISSING_MESSAGE'
      ) {
        console.error(error);
      }
    },
    getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
      return [namespace, key].filter(Boolean).join('.');
    }
 };
});
