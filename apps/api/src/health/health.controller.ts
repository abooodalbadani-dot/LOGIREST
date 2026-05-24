import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'OK', db: 'connected', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({
        status: 'ERROR',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
