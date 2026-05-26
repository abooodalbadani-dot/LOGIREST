import { Controller, Get, Res } from '@nestjs/common';
import * as express from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res() res: express.Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const data = await this.metricsService.getMetrics();
    res.end(data);
  }
}
