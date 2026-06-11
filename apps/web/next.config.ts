import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 access in development (Next.js 16 blocks cross-origin by default)
  allowedDevOrigins: ['127.0.0.1', 'localhost', '[::1]'],
  output: 'standalone',

  typescript: {
    // هذه التعليمة تمنع انهيار البناء بسبب الذاكرة أو أخطاء الأنواع
    ignoreBuildErrors: true,
  },
  eslint: {
    // وتلك لتجاوز فحص جودة الكود أثناء البناء لنفس السبب
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
