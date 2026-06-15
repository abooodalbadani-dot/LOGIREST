import { PrismaService } from './src/database/prisma.service';
import { SettingsService } from './src/modules/settings/settings.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const settingsService = new SettingsService(prisma);
  const currencyInfo = await settingsService.getBaseCurrency();
  console.log('Backend settingsService.getBaseCurrency() output:', currencyInfo);
  await prisma.onModuleDestroy();
}

main();
