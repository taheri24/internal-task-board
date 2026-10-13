import { Controller, Get, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { HealthService } from './health.service';

/**
 * Liveness and readiness in one shot. Public on purpose: an orchestration probe has no
 * session. The full path is /api/v1/ping because of the global prefix in main.ts.
 * Returns 200 while the process and the database are reachable, 503 otherwise.
 */
@Controller('ping')
export class HealthController {
  private readonly logger = new Logger('Health');

  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  async ping(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.report();
    if (report.database.status === 'down') {
      this.logger.warn(`ping: database down (${report.database.error ?? 'unknown'})`);
      res.status(503);
    }
    return report;
  }
}
