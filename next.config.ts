import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 access in development (Next.js 16 blocks cross-origin by default)
  allowedDevOrigins: ['127.0.0.1', 'localhost', '[::1]'],
};

export default withNextIntl(nextConfig);
