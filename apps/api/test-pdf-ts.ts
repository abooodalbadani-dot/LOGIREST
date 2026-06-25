import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PdfGeneratorService } from './src/modules/pdf/pdf-generator.service';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const pdfService = app.get(PdfGeneratorService);
  try {
    const session = await pdfService['prisma'].stocktakeSession.findFirst();
    if (!session) {
      console.log('No stocktake sessions found in DB');
    } else {
      const buffer = await pdfService.generateStocktakePdf(session.id, 'ar');
      fs.writeFileSync('../../test.pdf', buffer);
      console.log('Arabic PDF generated successfully at root!');
    }
  } catch (err) {
    console.error('Error generating test PDF:', err);
  }
  await app.close();
}
bootstrap().catch(console.error);
