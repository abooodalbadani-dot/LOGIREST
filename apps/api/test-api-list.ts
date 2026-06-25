import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PurchaseRequestsService } from './src/modules/purchase-requests/purchase-requests.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prService = app.get(PurchaseRequestsService);
  
  const res1 = await prService.findAll({}, 'a0725a43-90cc-400c-8cfa-de2c78cc998d');
  console.log("Systemwh PRs count:", res1.meta.total, res1.data.map(p => ({ number: p.requestNumber, status: p.status })));
  
  const res2 = await prService.findAll({}, 'a14fca59-e0ae-4acf-9a75-930a57ac0f89');
  console.log("HQ PRs count:", res2.meta.total, res2.data.map(p => ({ number: p.requestNumber, status: p.status })));
  
  await app.close();
}
main().catch(console.error);
