const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/apps/api/src/app.module');
const { PdfGeneratorService } = require('./dist/apps/api/src/modules/pdf/pdf-generator.service');
const fs = require('fs');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const pdfService = app.get(PdfGeneratorService);
  const buffer = await pdfService.generateStocktakePdf('aa807fcb-5d59-4d33-91d2-55eacceea563', 'ar');
  fs.writeFileSync('test.pdf', buffer);
  console.log('PDF generated successfully');
  await app.close();
}
bootstrap().catch(console.error);
