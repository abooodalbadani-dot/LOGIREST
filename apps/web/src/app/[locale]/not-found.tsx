import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="relative">
        <h1 className="text-[12rem] font-bold leading-none opacity-10 select-none">404</h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-semibold mb-2">الصفحة غير موجودة</h2>
          <p className="text-gray-400 mb-8 max-w-md text-center">
            عذراً، يبدو أنك سلكت طريقاً خاطئاً. الصفحة التي تبحث عنها غير متوفرة حالياً.
          </p>
          <Link 
            href="/"
            className="px-8 py-3 bg-[#0066cc] hover:bg-[#0052a3] transition-all rounded-full font-medium shadow-lg shadow-blue-900/20"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
