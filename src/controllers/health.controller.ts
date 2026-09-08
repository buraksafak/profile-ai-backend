import type { Request, Response } from 'express';
import { healthService } from '../services/health.service';

export class HealthController {
  getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: healthService.getStatus(),
    });
  }

  async getReady(_req: Request, res: Response): Promise<void> {
    const readiness = await healthService.getReadiness();
    res.status(readiness.status === 'ready' ? 200 : 503).json({
      success: readiness.status === 'ready',
      data: readiness,
    });
  }
}

export const healthController = new HealthController();
