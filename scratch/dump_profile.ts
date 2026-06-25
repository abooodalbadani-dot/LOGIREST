import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.systemSetting.findUnique({
    where: { key: 'restaurant_profile' },
  });
  if (profile?.value) {
    const logoUrl = JSON.parse(profile.value).logoUrl || JSON.parse(profile.value).logo;
    console.log('LOGO URL TYPE:', logoUrl.substring(0, 50));
    if (logoUrl.startsWith('data:image/svg+xml')) {
      const base64Data = logoUrl.split('base64,')[1];
      const rawSvg = Buffer.from(base64Data, 'base64').toString('utf-8');
      console.log('RAW SVG START:', JSON.stringify(rawSvg.substring(0, 100)));
      console.log('STARTS WITH <svg:', rawSvg.trim().startsWith('<svg'));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
