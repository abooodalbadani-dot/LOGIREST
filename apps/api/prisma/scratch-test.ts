import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      include: { currency: true }
    });
    if (!po) throw new Error('No PO');

    const baseCurrency = await tx.currency.findFirst({
      where: { isBase: true },
    });
    if (!baseCurrency) throw new Error('No Base Currency');

    const fxRateCapturedAt = new Date();
    const fx = await tx.fXRate.findFirst({
      where: {
        fromCurrencyId: po.currencyId,
        toCurrencyId: baseCurrency.id,
        effectiveFrom: { lte: fxRateCapturedAt },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return { po, baseCurrency, fx, fxRateCapturedAt };
  });
  console.log('--- TRANSACTION IN CONTAINER ---');
  console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
