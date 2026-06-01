import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import * as express from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Req() req: express.Request, @Res() res: express.Response) {
    const secret = req.headers['x-metrics-secret'];
    const expectedSecret = process.env.METRICS_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid metrics secret');
    }
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const data = await this.metricsService.getMetrics();
    res.end(data);
  }
}
