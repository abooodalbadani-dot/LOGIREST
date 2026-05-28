import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';

describe('Document Sequence Concurrency (e2e)', () => {
  jest.setTimeout(180000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let procOfficerToken: string;
  let procOfficerId: string;
  let branchId: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const suffix = `seq-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `UOM ${suffix}`, code: `UOM-${suffix}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });
    itemId = item.id;

    const passwordHash = await bcrypt.hash('Password123!');
    const procEmail = `proc-${suffix}@logirest.com`;
    const procUser = await prisma.user.create({
      data: {
        email: procEmail,
        passwordHash,
        name: `Proc Officer ${suffix}`,
        role: 'PROC_OFFICER',
        isActive: true,
      },
    });
    procOfficerId = procUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: procOfficerId, warehouseId },
    });

    const jwtService = app.get(JwtService);
    procOfficerToken = jwtService.sign({
      sub: procOfficerId,
      email: procEmail,
      role: 'PROC_OFFICER',
    });
  }, 180000);

  afterAll(async () => {
    if (prisma) {
      await prisma.userWarehouseScope.deleteMany({
        where: { userId: procOfficerId },
      });
      await prisma.pRLine.deleteMany({ where: { itemId } });
      await prisma.purchaseRequest.deleteMany({ where: { warehouseId } });
      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      await prisma.category.delete({ where: { id: categoryId } });
      await prisma.warehouse.delete({ where: { id: warehouseId } });
      await prisma.documentSequence.deleteMany({ where: { branchId } });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.user.delete({ where: { id: procOfficerId } });
      await prisma.$disconnect();
    }
    await app.close();
  }, 180000);

  it('should generate unique, strictly sequential request numbers without duplicates when 20 PRs are created concurrently', async () => {
    // Fire 20 requests concurrently, each with a unique idempotency key
    const reqPromises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          branchId,
          warehouseId,
          lines: [{ itemId, quantity: 10 }],
        }),
    );

    const responses = await Promise.all(reqPromises);

    // Verify all succeeded
    const prNumbers: string[] = [];
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.requestNumber).toBeDefined();
      prNumbers.push(res.body.requestNumber);
    }

    // Verify all 20 are unique
    const uniquePrNumbers = new Set(prNumbers);
    expect(uniquePrNumbers.size).toBe(20);

    // Sort the sequence numbers and verify they are consecutive 1 to 20
    const sequenceSuffixes = prNumbers.map((num) => {
      // Format is PR-YYYY-BRANCH_CODE-SEQUENCE_5_DIGITS
      const parts = num.split('-');
      const seqStr = parts[parts.length - 1];
      return parseInt(seqStr, 10);
    });

    sequenceSuffixes.sort((a, b) => a - b);

    const start = sequenceSuffixes[0];
    for (let i = 0; i < 20; i++) {
      expect(sequenceSuffixes[i]).toBe(start + i);
    }
  });
});
