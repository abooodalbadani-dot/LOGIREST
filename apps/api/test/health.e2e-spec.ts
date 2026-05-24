/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Health Check (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    jest.setTimeout(90000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK when database is connected', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.db).toBe('connected');
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return 503 Service Unavailable when database query fails', async () => {
      // Mock prisma.$queryRaw to throw an error
      const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Database offline') as never);

      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('ERROR');
      expect(res.body.db).toBe('disconnected');

      // Restore mock
      spy.mockRestore();
    });
  });
});
